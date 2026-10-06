/* ==========================================================================
   src/server.js — Titik masuk aplikasi backend

   Urutan startup:
     1. Nyalakan PostgreSQL embedded
     2. Jalankan migrasi SQL (skema database)
     3. Isi data awal bila database masih kosong (guru, materi, soal)
     4. Jalankan Express

   Cara menjalankan:
     npm install
     npm start            # atau: npm run dev (auto-reload)

   Data PostgreSQL tersimpan di folder .pgdata (lihat .env).
   Untuk membuat ulang dari nol:  npm run reset-db
   ========================================================================== */

const config = require("./config");
const { createApp } = require("./app");
const { startDatabase, stopDatabase } = require("./db/embedded");
const { migrate } = require("./db/migrate");
const { seed } = require("./db/seed");

async function main() {
  const pool = await startDatabase();
  await migrate(pool);
  await seed();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log("🚀 API Kuis Petualangan Ceria berjalan di http://localhost:" + config.port);
    console.log("   Contoh: GET  http://localhost:" + config.port + "/api/health");
    console.log("           GET  http://localhost:" + config.port + "/api/materials");
  });

  const shutdown = async (signal) => {
    console.log(`\n[server] Menerima ${signal}, mematikan server...`);
    server.close(async () => {
      await stopDatabase().catch(() => {});
      process.exit(0);
    });

    /* Paksa keluar bila tidak selesai dalam 10 detik */
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch(async (err) => {
  console.error("[server] Gagal start:", err);
  await stopDatabase().catch(() => {});
  process.exit(1);
});
