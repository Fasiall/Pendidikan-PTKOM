/* Menambahkan kolom time_limit (dalam menit) ke tabel quiz_sets */
ALTER TABLE quiz_sets ADD COLUMN time_limit INT DEFAULT 0;
