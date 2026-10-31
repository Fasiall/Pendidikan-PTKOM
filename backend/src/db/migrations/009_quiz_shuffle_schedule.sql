/* ==========================================================================
   009_quiz_shuffle_schedule.sql — Acak soal & jadwal akses kuis

   1. quiz_sets.shuffle_questions : guru dapat mengacak urutan soal & pilihan
      jawaban untuk setiap percobaan siswa (default aktif).
   2. quiz_sets.schedule_start / schedule_end : jendela waktu kapan kuis boleh
      diakses. Disimpan sebagai timestamptz (UTC); antarmuka memakai WIB.
   3. results.started_at / finished_at : waktu mulai & selesai pengerjaan untuk
      halaman riwayat per kuis (durasi dihitung dari kedua kolom ini).
   ========================================================================== */

ALTER TABLE quiz_sets
  ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE quiz_sets
  ADD COLUMN IF NOT EXISTS schedule_start TIMESTAMPTZ;

ALTER TABLE quiz_sets
  ADD COLUMN IF NOT EXISTS schedule_end TIMESTAMPTZ;

ALTER TABLE results
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE results
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

/* Mempercepat halaman riwayat per set soal. */
CREATE INDEX IF NOT EXISTS results_quiz_set_created_idx
  ON results (quiz_set_id, created_at DESC);
