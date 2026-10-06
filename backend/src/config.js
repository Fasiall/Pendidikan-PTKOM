/* ==========================================================================
   src/config.js — Konfigurasi aplikasi dari environment (.env)

   Semua nilai bisa di-override lewat file .env (lihat .env.example).
   ========================================================================== */

require("dotenv").config();

const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname.replace(/[\\/]+src$/, "");

/** Ambil nilai env dengan default. */
function env(name, fallback = undefined) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

const isProduction = env("NODE_ENV", "development") === "production";

/* JWT_SECRET wajib diisi di production; di development dibuat acak tiap start. */
let jwtSecret = env("JWT_SECRET");
if (!jwtSecret || jwtSecret === "ganti-dengan-string-acak-yang-panjang") {
  if (isProduction) {
    throw new Error("JWT_SECRET belum diisi di file .env — wajib untuk production.");
  }
  jwtSecret = crypto.randomBytes(32).toString("hex");
  console.warn("[config] JWT_SECRET tidak ditemukan → memakai secret acak (hanya untuk development).");
}

module.exports = {
  rootDir: ROOT,
  port: Number(env("PORT", 3000)),
  isProduction,
  frontendDir: path.join(ROOT, "..", "frontend"),

  db: {
    host: env("PG_HOST", "localhost"),
    port: Number(env("PG_PORT", 5432)),
    user: env("PG_USER", "postgres"),
    password: env("PG_PASSWORD", "rahasia-kuis-sd"),
    database: env("PG_DATABASE", "pendidikan_ptkom"),
    dataDir: path.isAbsolute(env("PG_DATA_DIR", ".pgdata"))
      ? env("PG_DATA_DIR")
      : path.join(ROOT, env("PG_DATA_DIR", ".pgdata")),
    verbose: env("PG_VERBOSE", "false") === "true"
  },

  jwt: {
    secret: jwtSecret,
    expiresIn: env("JWT_EXPIRES_IN", "1d")
  },

  session: {
    secret: env("SESSION_SECRET", "rahasia-sesi-kuis-sd")
  }
};
