/* ==========================================================================
   src/app.js — Konfigurasi aplikasi Express (tanpa proses listen)

   Dipisah dari server.js agar bisa dipakai untuk testing:
     const app = createApp();
     request(app).get("/api/health")...
   ========================================================================== */

const express = require("express");
const session = require("express-session");
const path = require("path");
const cors = require("cors");

const config = require("./config");
const apiRoutes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

function createApp({ pool = null } = {}) {
  const app = express();
  if (config.isProduction) app.set("trust proxy", 1);
  app.disable("x-powered-by");

  /* --------------------------- MIDDLEWARE DASAR -------------------------- */
  app.use(express.json({ limit: "1mb" }));
  /* Izinkan frontend dibuka dari Live Server (5500) / file:// untuk development.
     credentials: true dibutuhkan agar cookie sesi kuis ikut terkirim. */
  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );
  /* Penyimpanan sesi kuis:
     - Lokal (PostgreSQL embedded) -> MemoryStore, cukup untuk satu proses.
     - Production / serverless    -> tabel Postgres, agar sesi kuis tetap ada
       walau request ditangani instance yang berbeda. */
  const sessionOptions = {
    name: "kuis.sid",
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // tidak bisa dibaca dari JavaScript
      sameSite: "lax", // proteksi CSRF ringan
      secure: config.isProduction, // HTTPS-only di production
      maxAge: 1000 * 60 * 60 * 2 // 2 jam
    }
  };

  if (pool && config.db.useExternal) {
    const PgStore = require("connect-pg-simple")(session);
    sessionOptions.store = new PgStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true
    });
  }

  app.use(session(sessionOptions));

  /* Header keamanan dasar */
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });

  /* ------------------------------ API ------------------------------------ */
  app.use("/api", apiRoutes);

  /* --------------------------- FRONTEND ---------------------------------- */
  /* Hanya folder frontend yang boleh diakses browser; seluruh kode backend
     (src/, package.json, .env, data/) tidak pernah disajikan. */
  app.get("/", (req, res) => {
    res.sendFile(path.join(config.frontendDir, "index.html"));
  });
  /* Halaman riwayat per kuis memakai SPA: URL tetap unik dan bisa dibagikan. */
  app.get(/^\/guru\/riwayat(?:\/\d+)?\/?$/, (req, res) => {
    res.sendFile(path.join(config.frontendDir, "index.html"));
  });
  app.use(express.static(config.frontendDir, { index: false, dotfiles: "ignore" }));

  /* ---------------------------- ERROR ------------------------------------ */
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
