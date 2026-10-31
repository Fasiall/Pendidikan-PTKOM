/* ==========================================================================
   api/index.js — Titik masuk Serverless Function di Vercel

   Seluruh request /api/* diarahkan ke file ini oleh vercel.json.
   Aplikasi Express dibuat sekali lalu dipakai ulang (warm start).

   Catatan: di Vercel tidak ada PostgreSQL embedded, jadi DATABASE_URL
   wajib diisi lewat Environment Variables.
   ========================================================================== */

const { createApp } = require("../backend/src/app");
const { startDatabase } = require("../backend/src/db/embedded");
const { migrate } = require("../backend/src/db/migrate");
const { seed } = require("../backend/src/db/seed");

let appPromise = null;

/** Siapkan koneksi database + migrasi + data awal + Express (sekali saja per instance). */
function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      if (!process.env.DATABASE_URL) {
        throw new Error(
          "DATABASE_URL belum diisi. Tambahkan connection string PostgreSQL di Environment Variables Vercel."
        );
      }
      const pool = await startDatabase();
      await migrate(pool);
      await seed(pool);
      return createApp({ pool });
    })().catch((err) => {
      appPromise = null; // biar percobaan berikutnya bisa mencoba lagi
      throw err;
    });
  }
  return appPromise;
}

module.exports = async (req, res) => {
  try {
    const app = await getApp();
    app(req, res);
  } catch (err) {
    console.error("[api] gagal menyiapkan aplikasi:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        error: "Server gagal menyala. Periksa DATABASE_URL di Environment Variables.",
        detail: (err && err.message) || String(err)
      })
    );
  }
};
