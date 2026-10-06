/* ==========================================================================
   src/db/migrate.js — Penjalankan migrasi SQL

   File *.sql di folder migrations/ dieksekusi berurutan sesuai nama file.
   Nama file yang sudah pernah dijalankan dicatat di tabel schema_migrations,
   sehingga aman dipanggil setiap kali server dinyalakan.
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function migrate(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const { rows } = await pool.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((row) => row.name));

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`[migrate] ${file} diterapkan.`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Migrasi ${file} gagal: ${err.message}`);
    } finally {
      client.release();
    }
  }
}

module.exports = { migrate };
