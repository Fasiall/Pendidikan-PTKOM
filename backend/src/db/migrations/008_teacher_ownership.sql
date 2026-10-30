/* ==========================================================================
   008_teacher_ownership.sql — Asosiasi Soal & Kuis ke Akun Pengajar (Ownership)
   
   Memungkinkan setiap guru membuat, menyimpan, dan mengelola bank soal
   serta set kuis miliknya sendiri secara terisolasi.
   ========================================================================== */

-- 1. Tambah kolom teacher_id pada quiz_sets
ALTER TABLE quiz_sets
  ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES teachers (id) ON DELETE CASCADE;

-- 2. Tambah kolom teacher_id pada questions
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES teachers (id) ON DELETE CASCADE;

-- 3. Tautkan data set kuis dan soal lama ke akun pengajar pertama yang ada
UPDATE quiz_sets
   SET teacher_id = (SELECT id FROM teachers ORDER BY id ASC LIMIT 1)
 WHERE teacher_id IS NULL;

UPDATE questions
   SET teacher_id = COALESCE(
     (SELECT teacher_id FROM quiz_sets qs WHERE qs.id = questions.quiz_set_id),
     (SELECT id FROM teachers ORDER BY id ASC LIMIT 1)
   )
 WHERE teacher_id IS NULL;

-- 4. Buat indeks untuk query berbasis pengajar
CREATE INDEX IF NOT EXISTS idx_quiz_sets_teacher ON quiz_sets (teacher_id, position, id);
CREATE INDEX IF NOT EXISTS idx_questions_teacher ON questions (teacher_id, position, id);
