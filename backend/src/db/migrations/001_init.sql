/* ==========================================================================
   001_init.sql — Skema database PostgreSQL (Kuis Petualangan Ceria)

   Tabel:
     teachers  : akun pengajar (password disimpan sebagai hash bcrypt)
     materials : daftar Materi Belajar (judul, ringkasan, isi HTML, gambar)
     questions : soal kuis, dapat dihubungkan ke satu materi
     results   : riwayat skor kuis siswa
   ========================================================================== */

/* ---------------------------- PENGAJAR ---------------------------------- */
CREATE TABLE IF NOT EXISTS teachers (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(60)  UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  full_name     VARCHAR(120) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

/* ---------------------------- MATERI BELAJAR ---------------------------- */
CREATE TABLE IF NOT EXISTS materials (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(160) NOT NULL,
  summary      VARCHAR(300) NOT NULL DEFAULT '',
  content      TEXT         NOT NULL,                 -- teks panjang / string HTML
  image_url    TEXT         NOT NULL DEFAULT '',      -- URL gambar pendukung
  emoji        VARCHAR(16)  NOT NULL DEFAULT '📘',    -- fallback bila gambar kosong
  subject      VARCHAR(60)  NOT NULL DEFAULT '',      -- mapel / topik
  position     INTEGER      NOT NULL DEFAULT 0,       -- urutan tampil
  is_published BOOLEAN      NOT NULL DEFAULT TRUE,    -- publish untuk siswa
  author_id    INTEGER      REFERENCES teachers (id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

/* ------------------------------ SOAL KUIS -------------------------------- */
CREATE TABLE IF NOT EXISTS questions (
  id          SERIAL PRIMARY KEY,
  material_id INTEGER     REFERENCES materials (id) ON DELETE SET NULL,
  subject     VARCHAR(60) NOT NULL DEFAULT '',
  image       VARCHAR(32) NOT NULL DEFAULT '',        -- emoji ilustrasi soal
  question    TEXT        NOT NULL,
  options     JSONB       NOT NULL,                   -- ["pilihan A","pilihan B", ...]
  answer      INTEGER     NOT NULL CHECK (answer >= 0), -- index jawaban benar
  fact        TEXT        NOT NULL DEFAULT '',        -- penjelasan singkat
  position    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

/* --------------------------- RIWAYAT SKOR -------------------------------- */
CREATE TABLE IF NOT EXISTS results (
  id          SERIAL PRIMARY KEY,
  material_id INTEGER     REFERENCES materials (id) ON DELETE SET NULL,
  score       INTEGER     NOT NULL,
  total       INTEGER     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

/* -------------------------------- INDEX ---------------------------------- */
CREATE INDEX IF NOT EXISTS idx_materials_position ON materials (position, id);
CREATE INDEX IF NOT EXISTS idx_materials_subject  ON materials (subject);
CREATE INDEX IF NOT EXISTS idx_questions_material ON questions (material_id, position, id);
CREATE INDEX IF NOT EXISTS idx_results_created    ON results (created_at DESC);
