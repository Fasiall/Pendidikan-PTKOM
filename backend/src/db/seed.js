/* ==========================================================================
   src/db/seed.js — Mengisi data awal database (guru, materi, soal)

   Aman dipanggil berulang kali: data hanya disisipkan bila tabelnya masih
   kosong, sehingga tidak pernah menimpa data buatan pengajar.
   ========================================================================== */

const bcrypt = require("bcryptjs");

const { getPool } = require("./embedded");
const { TEACHER, MATERIALS } = require("../../data/seed");

/** Membuat thumbnail SVG sederhana (emoji + warna) sebagai data URI. */
function svgThumb(emoji, color) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">' +
    `<rect width="600" height="360" rx="28" fill="${color}"/>` +
    '<circle cx="300" cy="170" r="96" fill="rgba(255,255,255,0.65)"/>' +
    `<text x="300" y="212" font-size="104" text-anchor="middle">${emoji}</text>` +
    "</svg>";
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

async function seed() {
  const pool = getPool();

  /* --------------------------- 1. Akun guru ---------------------------- */
  const { rows: teacherRows } = await pool.query(
    "SELECT COUNT(*)::int AS n FROM teachers"
  );
  if (teacherRows[0].n === 0) {
    await pool.query(
      "INSERT INTO teachers (username, password_hash, full_name) VALUES ($1, $2, $3)",
      [TEACHER.username, bcrypt.hashSync(TEACHER.password, 10), TEACHER.fullName]
    );
    console.log(`[seed] Akun guru "${TEACHER.username}" dibuat.`);
  }

  /* -------------------------- 2. Materi + soal ------------------------- */
  const { rows: materialRows } = await pool.query(
    "SELECT COUNT(*)::int AS n FROM materials"
  );
  const { rows: questionRows } = await pool.query(
    "SELECT COUNT(*)::int AS n FROM questions"
  );

  if (materialRows[0].n === 0) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: teacher } = await client.query(
        "SELECT id FROM teachers WHERE username = $1",
        [TEACHER.username]
      );
      const authorId = teacher.length ? teacher[0].id : null;

      for (const material of MATERIALS) {
        const { rows } = await client.query(
          `INSERT INTO materials
             (title, summary, content, image_url, emoji, subject, position, author_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            material.title,
            material.summary,
            material.content.trim(),
            svgThumb(material.emoji, material.color),
            material.emoji,
            material.subject,
            material.position,
            authorId
          ]
        );
        const materialId = rows[0].id;

        /* Buat set soal untuk materi ini */
        const quizSets = material.quizSets || [{ title: "Kuis Utama", description: "Set soal bawaan" }];
        const setIds = [];
        for (let s = 0; s < quizSets.length; s++) {
          const { rows: setRows } = await client.query(
            `INSERT INTO quiz_sets (material_id, title, description, is_published, position)
             VALUES ($1, $2, $3, TRUE, $4)
             RETURNING id`,
            [materialId, quizSets[s].title, quizSets[s].description || "", s]
          );
          setIds.push(setRows[0].id);
        }

        /* Soal dihubungkan ke set pertama secara default */
        const defaultSetId = setIds[0] || null;

        let position = 0;
        for (const question of material.questions || []) {
          await client.query(
            `INSERT INTO questions
               (material_id, quiz_set_id, subject, image, question, options, answer, fact, position)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              materialId,
              defaultSetId,
              question.subject,
              question.image || "",
              question.question,
              JSON.stringify(question.options),
              question.answer,
              question.fact || "",
              position++
            ]
          );
        }
      }

      await client.query("COMMIT");
      console.log(`[seed] ${MATERIALS.length} materi beserta soalnya dimasukkan.`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } else if (questionRows[0].n === 0) {
    console.log("[seed] Materi sudah ada, soal belum — dilewati.");
  }
}

module.exports = { seed, svgThumb };
