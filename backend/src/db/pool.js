/* ==========================================================================
   src/db/pool.js — Koneksi ke PostgreSQL eksternal (production/serverless)

   Dipakai bila environment menyediakan DATABASE_URL (Neon, Supabase,
   Vercel Postgres, Railway, dsb). PostgreSQL embedded hanya untuk lokal.
   ========================================================================== */

const { Pool } = require("pg");

/** Apakah URL menunjuk ke mesin lokal (tidak perlu SSL)? */
function isLocalHost(url) {
  return /(^|@)(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(url);
}

/**
 * Buat pg.Pool dari DATABASE_URL.
 * Pool dibuat kecil karena tiap instance serverless punya koneksinya sendiri.
 */
function createExternalPool() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL kosong — tidak bisa membuat koneksi database eksternal.");
  }

  const pool = new Pool({
    connectionString: url,
    ssl: isLocalHost(url) ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 15000
  });

  pool.on("error", (err) => {
    /* 57P01 = koneksi ditutup server saat shutdown, bukan masalah nyata */
    if (err && err.code === "57P01") return;
    console.error("[db] idle client error:", err.message);
  });

  return pool;
}

module.exports = { createExternalPool, isLocalHost };
