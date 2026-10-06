/* ==========================================================================
   003_teachers_email.sql — Tambah kolom email ke tabel teachers
   ========================================================================== */

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS teachers_email_unique
  ON teachers(email)
  WHERE email IS NOT NULL;

