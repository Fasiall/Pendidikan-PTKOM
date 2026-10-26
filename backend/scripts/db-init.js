/* ==========================================================================
   scripts/db-init.js — Siapkan database (migrasi + data awal)

   Dipakai sekali setelah database cloud dibuat:
     DATABASE_URL="postgresql://..." npm run db:init

   Tanpa DATABASE_URL, skrip ini memakai PostgreSQL embedded seperti biasa,
   jadi tetap aman dijalankan di komputer sendiri.
   ========================================================================== */

const { startDatabase, stopDatabase } = require("../src/db/embedded");
const { migrate } = require("../src/db/migrate");
const { seed } = require("../src/db/seed");

async function main() {
  console.log("[db:init] Menyambung ke database...");
  const pool = await startDatabase();

  await migrate(pool);
  console.log("[db:init] Migrasi selesai.");

  await seed(pool);
  console.log("[db:init] Data awal siap.");

  await stopDatabase();
  console.log("[db:init] Selesai. Database siap dipakai.");
}

main().catch(async (err) => {
  console.error("[db:init] Gagal:", err.message);
  await stopDatabase().catch(() => {});
  process.exit(1);
});
