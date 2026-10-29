/* ==========================================================================
   src/utils/quizCode.js -- Pembuat kode kuis 6 karakter

   Alfabet sengaja membuang huruf/angka yang mudah tertukar:
     0 (nol), O (huruf o), 1 (satu), I (huruf i), L (huruf l)

   Kode harus unik di seluruh tabel quiz_sets. Kolom access_code memang
   memiliki UNIQUE constraint, jadi pengecekan di sini hanya untuk
   menghindari percobaan insert yang gagal.
   ========================================================================== */

const CODE_LENGTH = 6;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Buat satu kode acak (belum tentu unik). */
function randomCode(length = CODE_LENGTH) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return code;
}

/** Bersihkan input kode dari spasi / tanda baca, jadikan huruf besar. */
function normalizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);
}

/**
 * Buat kode yang belum dipakai set soal lain.
 * @param {{ query: Function }} pool pg.Pool atau client transaksi
 */
async function generateUniqueCode(pool) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = randomCode();
    const { rows } = await pool.query(
      "SELECT 1 FROM quiz_sets WHERE access_code = $1 LIMIT 1",
      [code]
    );
    if (!rows.length) return code;
  }

  throw new Error("Gagal membuat kode kuis unik. Coba lagi.");
}

module.exports = { ALPHABET, CODE_LENGTH, randomCode, normalizeCode, generateUniqueCode };
