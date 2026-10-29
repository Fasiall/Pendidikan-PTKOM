/* ==========================================================================
   008_quiz_code_active.sql -- Kode kuis buatan guru

   - access_code boleh kosong (kode baru dibuat lewat tombol "Buat Kode")
   - access_code_active untuk menonaktifkan kode tanpa menghapusnya
   - Semua kode lama dibuat ulang memakai alfabet aman:
     tanpa 0/O dan 1/I/L agar tidak tertukar saat dibacakan guru
   ========================================================================== */

ALTER TABLE quiz_sets ALTER COLUMN access_code DROP NOT NULL;
ALTER TABLE quiz_sets ADD COLUMN IF NOT EXISTS access_code_active BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
DECLARE
  row_data   RECORD;
  alphabet   CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  new_code   TEXT;
  i          INTEGER;
BEGIN
  FOR row_data IN SELECT id FROM quiz_sets LOOP
    LOOP
      new_code := '';
      FOR i IN 1..6 LOOP
        new_code := new_code ||
          SUBSTRING(alphabet, 1 + FLOOR(RANDOM() * LENGTH(alphabet))::INT, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM quiz_sets
         WHERE access_code = new_code AND id <> row_data.id
      );
    END LOOP;

    UPDATE quiz_sets
       SET access_code = new_code,
           access_code_active = TRUE
     WHERE id = row_data.id;
  END LOOP;
END $$;
