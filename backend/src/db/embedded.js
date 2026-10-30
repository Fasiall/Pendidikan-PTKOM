/* ==========================================================================
   src/db/embedded.js — Lifecycle PostgreSQL embedded

   Menjalankan server PostgreSQL asli (binary dibundel oleh paket
   `embedded-postgres`) di dalam proses Node, tanpa perlu instalasi sistem
   maupun hak administrator.

   Alur pemakaian (lihat src/server.js):
     await startDatabase();   // init cluster + start + buat database
     const pool = getPool();  // pg.Pool yang siap dipakai controller
     await stopDatabase();    // matikan server saat aplikasi berhenti
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const config = require("../config");

let embedded = null;
let pool = null;

/**
 * Siapkan cluster PostgreSQL:
 *  - `initialise()` hanya dijalankan bila folder data belum berisi cluster
 *  - `start()` menyalakan server
 *  - database aplikasi dibuat bila belum ada
 */
async function startDatabase() {
  if (pool) return pool;

  const { default: EmbeddedPostgres } = await import("embedded-postgres");

  embedded = new EmbeddedPostgres({
    databaseDir: config.db.dataDir,
    user: config.db.user,
    password: config.db.password,
    port: config.db.port,
    persistent: true, // data tetap tersimpan antar kali jalan
    // Paksa UTF8 agar emoji pada seed/migrasi aman di Windows (locale bawaan WIN1252)
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: config.db.verbose ? (msg) => process.stdout.write(msg) : () => {},
    onError: (err) => console.error("[db] postgres error:", err)
  });

  const clusterReady = fs.existsSync(path.join(config.db.dataDir, "PG_VERSION"));
  if (clusterReady) {
    console.log("[db] Cluster PostgreSQL ditemukan → langsung start.");
  } else {
    console.log("[db] Membuat cluster PostgreSQL baru di", config.db.dataDir);
    await embedded.initialise();
  }

  try {
    await embedded.start();
  } catch (err) {
    throw new Error(
      `Gagal menjalankan PostgreSQL di port ${config.db.port}. ` +
        "Kemungkinan port masih dipakai instance lain (mis. server aplikasi yang sedang berjalan) " +
        "atau folder data tidak bisa diakses. Detail: " +
        ((err && err.message) || err)
    );
  }
  console.log(`[db] PostgreSQL ${await versionOf()} siap di port ${config.db.port}.`);

  try {
    await embedded.createDatabase(config.db.database);
    console.log(`[db] Database "${config.db.database}" dibuat.`);
  } catch (err) {
    /* Database sudah ada — itu normal saat server dijalankan ulang. */
    if (!/already exists/i.test(String(err.message))) throw err;
  }

  pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    max: 10
  });

  pool.on("error", (err) => {
    /* 57P01 = koneksi ditutup oleh server saat proses shutdown — bukan masalah */
    if (err && err.code === "57P01") return;
    console.error("[db] idle client error:", err.message);
  });

  await pool.query("SELECT 1");
  return pool;
}

/** Ambil pg.Pool (harus setelah startDatabase). */
function getPool() {
  if (!pool) {
    throw new Error("Database belum dijalankan. Panggil startDatabase() terlebih dahulu.");
  }
  return pool;
}

/** Versi server PostgreSQL (untuk log). */
async function versionOf() {
  try {
    const client = embedded.getPgClient();
    await client.connect();
    const res = await client.query("SHOW server_version");
    await client.end();
    return res.rows[0].server_version;
  } catch (_) {
    return "?";
  }
}

/** Matikan server PostgreSQL dengan rapi. */
async function stopDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (embedded) {
    await embedded.stop();
    embedded = null;
    console.log("[db] PostgreSQL dihentikan.");
  }
}

module.exports = { startDatabase, getPool, stopDatabase };
