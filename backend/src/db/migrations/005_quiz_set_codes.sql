/* Menambahkan kolom access_code ke tabel quiz_sets */
ALTER TABLE quiz_sets ADD COLUMN access_code VARCHAR(6) UNIQUE;

/* Generate kode acak untuk data yang sudah ada */
UPDATE quiz_sets 
SET access_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)) 
WHERE access_code IS NULL;

/* Buat kolom menjadi wajib diisi */
ALTER TABLE quiz_sets ALTER COLUMN access_code SET NOT NULL;
