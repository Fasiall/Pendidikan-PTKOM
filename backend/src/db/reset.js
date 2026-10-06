/* ==========================================================================
   src/db/reset.js — Hapus seluruh data lalu buat ulang dari nol

   Cara pakai:  npm run reset-db
   ========================================================================== */

const { startDatabase, getPool, stopDatabase } = require("./embedded");
const { migrate } = require("./migrate");
const { seed } = require("./seed");

async function main() {
  const pool = await startDatabase();

  console.log("[reset] Menghapus seluruh tabel...");
  await pool.query("DROP SCHEMA public CASCADE");
  await pool.query("CREATE SCHEMA public");

  await migrate(pool);
  await seed();

  console.log("[reset] Database siap digunakan.");
  await stopDatabase();
}

main().catch(async (err) => {
  console.error(
    "[reset] Gagal:",
    (err && err.message) || err,
    "\n       Pastikan server aplikasi (npm start) TIDAK sedang berjalan, " +
      "karena reset-db membutuhkan port PostgreSQL."
  );
  await stopDatabase().catch(() => {});
  process.exit(1);
});
