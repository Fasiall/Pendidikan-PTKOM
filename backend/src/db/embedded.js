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
const net = require("net");
const path = require("path");
const { execSync } = require("child_process");
const { Pool } = require("pg");

const config = require("../config");
const { createExternalPool } = require("./pool");

let embedded = null;
let pool = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Bersihkan proses postgres yatim (orphan) atau file postmaster.pid basi
 * yang tertinggal saat proses sebelumnya dihentikan paksa di Windows.
 */
async function cleanupStalePostmaster(dataDir) {
  const pidFile = path.join(dataDir, "postmaster.pid");
  if (!fs.existsSync(pidFile)) return;

  try {
    const content = fs.readFileSync(pidFile, "utf8");
    const firstLine = (content.split(/\r?\n/)[0] || "").trim();
    const oldPid = parseInt(firstLine, 10);

    if (Number.isInteger(oldPid) && oldPid > 0) {
      if (process.platform === "win32") {
        try {
          const out = execSync(`tasklist /FI "PID eq ${oldPid}" /FO CSV /NH`, {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"]
          });
          if (/postgres/i.test(out)) {
            console.log(`[db] Menghentikan proses PostgreSQL lama (PID ${oldPid})...`);
            execSync(`taskkill /PID ${oldPid} /F /T`, { stdio: "ignore" });
            await sleep(600);
          }
        } catch (_) {
          /* abaikan bila proses sudah tidak ada */
        }
      } else {
        try {
          process.kill(oldPid, "SIGTERM");
          await sleep(400);
        } catch (_) {
          /* abaikan bila proses sudah mati */
        }
      }
    }

    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
      console.log("[db] File lock postmaster.pid lama dibersihkan.");
    }
  } catch (err) {
    console.warn("[db] Gagal membersihkan postmaster.pid:", err.message);
  }
}

/** Cek apakah suatu port TCP dapat di-bind di localhost. */
function isPortAvailable(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, host);
  });
}

/** Cari port yang bebas mulai dari preferredPort. */
async function findAvailablePort(preferredPort) {
  for (let offset = 0; offset <= 25; offset++) {
    const candidate = preferredPort + offset;
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }
  return preferredPort;
}

/**
 * Siapkan cluster PostgreSQL:
 *  - `initialise()` hanya dijalankan bila folder data belum berisi cluster
 *  - `start()` menyalakan server
 *  - database aplikasi dibuat bila belum ada
 */
async function startDatabase() {
  if (pool) return pool;

  /* Production / Vercel: pakai PostgreSQL eksternal bila DATABASE_URL diisi. */
  if (config.db.useExternal) {
    pool = createExternalPool();
    await pool.query("SELECT 1");
    console.log("[db] Memakai PostgreSQL eksternal dari DATABASE_URL.");
    return pool;
  }


  await cleanupStalePostmaster(config.db.dataDir);

  let activePort = await findAvailablePort(config.db.port);
  if (activePort !== config.db.port) {
    console.log(
      `[db] Port ${config.db.port} sedang terpakai/diblokir sistem → beralih ke port ${activePort}.`
    );
    config.db.port = activePort;
  }

  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const recentLogs = [];

  const createInstance = (port) =>
    new EmbeddedPostgres({
      databaseDir: config.db.dataDir,
      user: config.db.user,
      password: config.db.password,
      port,
      persistent: true, // data tetap tersimpan antar kali jalan
      // Paksa UTF8 agar emoji pada seed/migrasi aman di Windows (locale bawaan WIN1252)
      initdbFlags: ["--encoding=UTF8", "--locale=C"],
      onLog: (msg) => {
        const text = String(msg || "").trim();
        if (text) {
          recentLogs.push(text);
          if (recentLogs.length > 20) recentLogs.shift();
        }
        if (config.db.verbose) process.stdout.write(msg);
      },
      onError: (err) => console.error("[db] postgres error:", err)
    });

  embedded = createInstance(activePort);

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
    /* Coba sekali lagi setelah membersihkan postmaster.pid dan memilih port baru */
    await cleanupStalePostmaster(config.db.dataDir);
    const fallbackPort = await findAvailablePort(activePort + 1);
    activePort = fallbackPort;
    config.db.port = activePort;
    embedded = createInstance(activePort);
    try {
      await embedded.start();
    } catch (retryErr) {
      const detail =
        (retryErr && retryErr.message) ||
        (err && err.message) ||
        recentLogs.slice(-6).join(" | ") ||
        "Tidak ada detail log.";
      throw new Error(
        `Gagal menjalankan PostgreSQL di port ${activePort}. ` +
          "Kemungkinan port masih dipakai instance lain (mis. server aplikasi yang sedang berjalan) " +
          "atau folder data tidak bisa diakses. Detail: " +
          detail
      );
    }
  }
  console.log(`[db] PostgreSQL ${await versionOf()} siap di port ${activePort}.`);

  try {
    await embedded.createDatabase(config.db.database);
    console.log(`[db] Database "${config.db.database}" dibuat.`);
  } catch (err) {
    /* Database sudah ada — itu normal saat server dijalankan ulang. */
    if (!/already exists/i.test(String(err.message))) throw err;
  }

  pool = new Pool({
    host: config.db.host,
    port: activePort,
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
    await cleanupStalePostmaster(config.db.dataDir);
    console.log("[db] PostgreSQL dihentikan.");
  }
}

module.exports = { startDatabase, getPool, stopDatabase };
