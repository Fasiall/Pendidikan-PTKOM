/* ==========================================================================
   002_results_student_name.sql - Tambah nama siswa pada riwayat skor

   Kolom student_name dipakai untuk papan peringkat (leaderboard) dan
   identitas pada ekspor CSV hasil kuis.
   ========================================================================== */

ALTER TABLE results ADD COLUMN IF NOT EXISTS student_name VARCHAR(60) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_results_leaderboard
  ON results (score DESC, created_at DESC);
