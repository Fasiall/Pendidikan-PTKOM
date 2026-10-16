/* ==========================================================================
   007_google_auth.sql — Dukungan autentikasi Google Sign-In (OAuth2 / GIS)
   ========================================================================== */

-- Password boleh kosong untuk akun guru yang mendaftar/login lewat Google
ALTER TABLE teachers ALTER COLUMN password_hash DROP NOT NULL;

-- Tambah google_id dan avatar_url
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Indeks unik untuk google_id agar tidak ada duplikasi akun
CREATE UNIQUE INDEX IF NOT EXISTS teachers_google_id_unique
  ON teachers(google_id)
  WHERE google_id IS NOT NULL;
