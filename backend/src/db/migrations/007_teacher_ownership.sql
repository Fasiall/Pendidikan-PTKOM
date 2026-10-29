/* ==========================================================================
   007_teacher_ownership.sql -- Isolasi data antar akun guru

   Menambahkan kolom pemilik + visibilitas:
     materials.visibility            'private' (hanya pemilik) / 'public' (semua guru)
     quiz_sets.teacher_id            pemilik set soal
     quiz_sets.visibility            'private' / 'public'
     questions.teacher_id            pemilik soal
     results.teacher_id              guru pemilik kuis (bukan input siswa)
     results.started_at/finished_at  waktu mulai & selesai pengerjaan

   Data lama yang belum punya pemilik diberikan ke akun guru pertama
   (biasanya "guru"). Gunakan scripts/assign-owner.js untuk memindahkannya.
   ========================================================================== */

/* ------------------------------ MATERIALS ------------------------------- */
ALTER TABLE materials ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) NOT NULL DEFAULT 'private';
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_visibility_check;
ALTER TABLE materials ADD CONSTRAINT materials_visibility_check
  CHECK (visibility IN ('private', 'public'));

/* ------------------------------ QUIZ SETS ------------------------------- */
ALTER TABLE quiz_sets ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES teachers (id) ON DELETE CASCADE;
ALTER TABLE quiz_sets ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) NOT NULL DEFAULT 'private';
ALTER TABLE quiz_sets DROP CONSTRAINT IF EXISTS quiz_sets_visibility_check;
ALTER TABLE quiz_sets ADD CONSTRAINT quiz_sets_visibility_check
  CHECK (visibility IN ('private', 'public'));

/* ------------------------------- QUESTIONS ------------------------------ */
ALTER TABLE questions ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES teachers (id) ON DELETE CASCADE;

/* -------------------------------- RESULTS ------------------------------- */
ALTER TABLE results ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES teachers (id) ON DELETE CASCADE;
ALTER TABLE results ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE results ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

/* ------------------------- BACKFILL DATA LAMA --------------------------- */
UPDATE materials
   SET author_id = (SELECT id FROM teachers ORDER BY id ASC LIMIT 1)
 WHERE author_id IS NULL;

UPDATE quiz_sets
   SET teacher_id = COALESCE(
         (SELECT m.author_id FROM materials m WHERE m.id = quiz_sets.material_id),
         (SELECT id FROM teachers ORDER BY id ASC LIMIT 1)
       )
 WHERE teacher_id IS NULL;

UPDATE questions
   SET teacher_id = COALESCE(
         (SELECT qs.teacher_id FROM quiz_sets qs WHERE qs.id = questions.quiz_set_id),
         (SELECT m.author_id FROM materials m WHERE m.id = questions.material_id),
         (SELECT id FROM teachers ORDER BY id ASC LIMIT 1)
       )
 WHERE teacher_id IS NULL;

UPDATE results
   SET teacher_id = COALESCE(
         (SELECT qs.teacher_id FROM quiz_sets qs WHERE qs.id = results.quiz_set_id),
         (SELECT m.author_id FROM materials m WHERE m.id = results.material_id),
         (SELECT id FROM teachers ORDER BY id ASC LIMIT 1)
       )
 WHERE teacher_id IS NULL;

UPDATE results
   SET started_at = created_at
 WHERE started_at IS NULL;

UPDATE results
   SET finished_at = created_at
 WHERE finished_at IS NULL;

/* -------------------------------- INDEX --------------------------------- */
CREATE INDEX IF NOT EXISTS idx_materials_owner     ON materials (author_id, position, id);
CREATE INDEX IF NOT EXISTS idx_materials_visibility ON materials (visibility, is_published);
CREATE INDEX IF NOT EXISTS idx_quiz_sets_teacher   ON quiz_sets (teacher_id, position, id);
CREATE INDEX IF NOT EXISTS idx_questions_teacher   ON questions (teacher_id, position, id);
CREATE INDEX IF NOT EXISTS idx_results_teacher     ON results (teacher_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_results_set         ON results (quiz_set_id, id DESC);
