/* ==========================================================================
   scripts/assign-owner.js -- Tetapkan pemilik data lama ke satu akun guru

   Pemakaian:
     node scripts/assign-owner.js guru
         -> semua materi/set/soal/riwayat yang BELUM punya pemilik
            diberikan ke akun "guru".

     node scripts/assign-owner.js guru --all
         -> pindahkan SEMUA data (termasuk milik akun lain) ke akun "guru".
            Berguna saat migrasi dari versi lama yang belum punya pemilik.

     node scripts/assign-owner.js guru --public
         -> tandai materi & set soal milik akun itu sebagai publik
            (bisa dilihat semua guru, tetapi hanya pemilik yang bisa mengubah).

   Skrip ini memakai DATABASE_URL bila diisi, PostgreSQL yang sedang
   berjalan bila ada, atau menyalakan PostgreSQL embedded sendiri.
   Aman dijalankan saat server aplikasi hidup maupun mati.
   ========================================================================== */

const { Pool } = require("pg");

const config = require("../src/config");
const { startDatabase, stopDatabase } = require("../src/db/embedded");

/* Dibersihkan di akhir skrip (menutup pool atau mematikan PostgreSQL embedded). */
let cleanup = async () => {};

/**
 * Pakai PostgreSQL yang sudah berjalan bila ada (mis. server sedang hidup),
 * supaya skrip tidak bentrok memperebutkan port. Jika tidak ada, nyalakan
 * PostgreSQL embedded seperti biasa.
 */
async function resolvePool() {
  if (!config.db.useExternal) {
    const probe = new Pool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      max: 2
    });

    try {
      await probe.query("SELECT 1");
      cleanup = () => probe.end();
      console.log("[assign-owner] Memakai PostgreSQL yang sedang berjalan.");
      return probe;
    } catch (_) {
      await probe.end().catch(() => {});
    }
  }

  const pool = await startDatabase();
  cleanup = () => stopDatabase();
  return pool;
}

async function main() {
  const args = process.argv.slice(2);
  const username = (args[0] || "").trim();
  const all = args.includes("--all");
  const makePublic = args.includes("--public");

  if (!username) {
    console.error(
      'Pemakaian: node scripts/assign-owner.js <username> [--all] [--public]\n' +
        'Contoh   : node scripts/assign-owner.js guru --public'
    );
    process.exit(1);
  }

  const pool = await resolvePool();

  const { rows: teachers } = await pool.query(
    "SELECT id, username FROM teachers WHERE username = $1",
    [username]
  );
  if (!teachers.length) {
    const { rows: list } = await pool.query("SELECT username FROM teachers ORDER BY id");
    console.error(`Akun "${username}" tidak ditemukan.`);
    console.error("Akun yang tersedia: " + list.map((t) => t.username).join(", "));
    await cleanup();
    process.exit(1);
  }

  const teacherId = teachers[0].id;
  const filter = all ? "" : "WHERE teacher_id IS NULL";

  const { rowCount: setCount } = await pool.query(
    `UPDATE quiz_sets SET teacher_id = $1 ${all ? "" : "WHERE teacher_id IS NULL"}`,
    [teacherId]
  );

  const { rowCount: questionCount } = await pool.query(
    `UPDATE questions SET teacher_id = $1 ${filter}`,
    [teacherId]
  );

  const { rowCount: resultCount } = await pool.query(
    `UPDATE results SET teacher_id = $1 ${filter}`,
    [teacherId]
  );

  let materialCount;
  if (all) {
    ({ rowCount: materialCount } = await pool.query(
      "UPDATE materials SET author_id = $1",
      [teacherId]
    ));
  } else {
    ({ rowCount: materialCount } = await pool.query(
      "UPDATE materials SET author_id = $1 WHERE author_id IS NULL",
      [teacherId]
    ));
  }

  if (makePublic) {
    await pool.query("UPDATE materials SET visibility = 'public' WHERE author_id = $1", [teacherId]);
    await pool.query("UPDATE quiz_sets SET visibility = 'public' WHERE teacher_id = $1", [teacherId]);
  }

  console.log(`[assign-owner] Pemilik data diset ke "${username}" (id ${teacherId}).`);
  console.log(`  materi   : ${materialCount}`);
  console.log(`  set soal : ${setCount}`);
  console.log(`  soal     : ${questionCount}`);
  console.log(`  riwayat  : ${resultCount}`);
  if (makePublic) console.log("  visibilitas: materi & set soal -> publik");

  await cleanup();
}

main().catch(async (err) => {
  console.error("[assign-owner] Gagal:", (err && err.message) || err);
  await cleanup().catch(() => {});
  process.exit(1);
});
