/* ==========================================================================
   010_email_verification.sql — Dukungan verifikasi email dengan kode OTP
   ========================================================================== */

-- Tambahkan kolom status/waktu verifikasi email di tabel teachers
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Akun pengajar yang sudah ada sebelumnya otomatis ditandai terverifikasi
UPDATE teachers
  SET email_verified_at = now()
  WHERE email_verified_at IS NULL;

-- Tabel untuk menyimpan OTP verifikasi email pengajar
CREATE TABLE IF NOT EXISTS email_verifications (
  id                  SERIAL PRIMARY KEY,
  teacher_id          INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
  email               VARCHAR(255) NOT NULL,
  otp_hash            VARCHAR(255) NOT NULL,
  attempts            INTEGER NOT NULL DEFAULT 0,
  expires_at          TIMESTAMPTZ NOT NULL,
  resend_available_at TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeks untuk pencarian cepat berdasarkan email dan teacher_id
CREATE INDEX IF NOT EXISTS idx_email_verifications_email
  ON email_verifications(email);

CREATE INDEX IF NOT EXISTS idx_email_verifications_teacher
  ON email_verifications(teacher_id);
