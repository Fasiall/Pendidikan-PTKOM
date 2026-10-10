/* ==========================================================================
   004_quiz_sets.sql — Tabel set soal (1 materi → banyak set soal)

   Struktur baru:
     materials (1) ──→ (N) quiz_sets (1) ──→ (N) questions

   Migrasi ini:
     1. Membuat tabel quiz_sets
     2. Menambahkan kolom quiz_set_id ke tabel questions
     3. Membuat set soal default untuk setiap materi yang sudah punya soal
     4. Memindahkan soal lama ke set default masing-masing
     5. Menambahkan kolom quiz_set_id ke tabel results
   ========================================================================== */

/* ---------------------- 1. Tabel quiz_sets ------------------------------ */
CREATE TABLE IF NOT EXISTS quiz_sets (
  id           SERIAL PRIMARY KEY,
  material_id  INTEGER      NOT NULL REFERENCES materials (id) ON DELETE CASCADE,
  title        VARCHAR(160) NOT NULL,
  description  VARCHAR(300) NOT NULL DEFAULT '',
  is_published BOOLEAN      NOT NULL DEFAULT TRUE,
  position     INTEGER      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_sets_material
  ON quiz_sets (material_id, position, id);

/* --------- 2. Tambah kolom quiz_set_id ke questions & results ----------- */
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS quiz_set_id INTEGER REFERENCES quiz_sets (id) ON DELETE SET NULL;

ALTER TABLE results
  ADD COLUMN IF NOT EXISTS quiz_set_id INTEGER REFERENCES quiz_sets (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questions_quiz_set
  ON questions (quiz_set_id, position, id);

/* --------- 3. Buat set default & pindahkan soal lama -------------------- */
/* Untuk setiap materi yang sudah punya soal, buat satu set default,
   lalu hubungkan semua soal lama ke set tersebut. */
INSERT INTO quiz_sets (material_id, title, description, is_published, position)
  SELECT DISTINCT m.id, 'Kuis Utama', 'Set soal bawaan', TRUE, 0
    FROM materials m
    JOIN questions q ON q.material_id = m.id
   WHERE NOT EXISTS (
     SELECT 1 FROM quiz_sets qs WHERE qs.material_id = m.id
   );

UPDATE questions
   SET quiz_set_id = qs.id
  FROM quiz_sets qs
 WHERE questions.material_id = qs.material_id
   AND questions.quiz_set_id IS NULL;
