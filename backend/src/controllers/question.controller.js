/* ==========================================================================
   src/controllers/question.controller.js — Manajemen Soal Kuis

   Publik (siswa):
     GET /api/questions               daftar soal TANPA kunci jawaban
                                      ?materialId=3 memfilter soal satu materi

   Pengajar (JWT wajib):
     GET    /api/questions/manage     daftar soal lengkap (ada kunci + fact)
     POST   /api/questions            tambah soal baru (terhubung ke materi)
     PUT    /api/questions/:id        ubah soal
     DELETE /api/questions/:id        hapus soal
   ========================================================================== */

const { getPool } = require("../db/embedded");
const { ApiError, asyncHandler } = require("../utils/errors");
const { requireFields, toInt } = require("../utils/validate");

/** Validasi pilihan jawaban & indeks kunci. */
function validateOptions(options, answer) {
  if (!Array.isArray(options) || options.length < 2 || options.length > 5) {
    throw ApiError.badRequest("Field options harus berupa array berisi 2-5 pilihan.");
  }

  const cleaned = options.map((option) => String(option).trim());
  if (cleaned.some((option) => !option)) {
    throw ApiError.badRequest("Setiap pilihan jawaban tidak boleh kosong.");
  }

  const answerIndex = Number(answer);
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= cleaned.length) {
    throw ApiError.badRequest(`Field answer harus indeks 0..${cleaned.length - 1}.`);
  }

  return { options: cleaned, answer: answerIndex };
}

/** Pastikan materi rujukan benar-benar ada. */
async function assertMaterialExists(pool, materialId) {
  const { rows } = await pool.query("SELECT id FROM materials WHERE id = $1", [materialId]);
  if (!rows.length) throw ApiError.badRequest("materialId tidak ditemukan.");
}

/* ============================== PUBLIK =================================== */

/** Soal untuk siswa — kunci jawaban & fakta TIDAK ikut dikirim. */
const listPublic = asyncHandler(async (req, res) => {
  const pool = getPool();
  const values = [];
  let where = "WHERE TRUE";

  if (req.query.setId !== undefined) {
    values.push(toInt(req.query.setId, "setId", { min: 1 }));
    where += ` AND q.quiz_set_id = $${values.length}`;
  } else if (req.query.materialId !== undefined) {
    values.push(toInt(req.query.materialId, "materialId", { min: 1 }));
    where += ` AND q.material_id = $${values.length}`;
  }

  const { rows } = await pool.query(
    `SELECT q.id, q.material_id, q.subject, q.image, q.question, q.options, q.position
       FROM questions q
       ${where}
      ORDER BY q.position, q.id`,
    values
  );

  res.json({
    total: rows.length,
    questions: rows.map((row) => ({ ...row, options: row.options }))
  });
});

/* ============================= PENGAJAR ================================== */

/** Semua soal milik akun pengajar yang login beserta kunci jawaban (butuh login). */
const manage = asyncHandler(async (req, res) => {
  const pool = getPool();
  const teacherId = req.teacher.id;
  const values = [teacherId];
  let where = "WHERE q.teacher_id = $1";

  if (req.query.setId !== undefined && req.query.setId !== "") {
    values.push(toInt(req.query.setId, "setId", { min: 1 }));
    where += ` AND q.quiz_set_id = $${values.length}`;
  } else if (req.query.materialId !== undefined && req.query.materialId !== "") {
    values.push(toInt(req.query.materialId, "materialId", { min: 1 }));
    where += ` AND q.material_id = $${values.length}`;
  }

  const { rows } = await pool.query(
    `SELECT q.*, m.title AS material_title, qs.title AS quiz_set_title
       FROM questions q
       LEFT JOIN materials m ON m.id = q.material_id
       LEFT JOIN quiz_sets qs ON qs.id = q.quiz_set_id
       ${where}
      ORDER BY q.quiz_set_id NULLS LAST, q.position, q.id`,
    values
  );

  res.json({ total: rows.length, questions: rows });
});

/** Tambah soal baru (tersimpan ke akun pengajar yang login). */
const create = asyncHandler(async (req, res) => {
  requireFields(req.body, ["question", "options", "answer"]);

  const body = req.body;
  const { options, answer } = validateOptions(body.options, body.answer);
  const teacherId = req.teacher.id;

  const values = [
    body.materialId === undefined || body.materialId === null
      ? null
      : toInt(body.materialId, "materialId", { min: 1 }),
    String(body.subject || "").trim(),
    String(body.image || "").trim(),
    String(body.question).trim(),
    JSON.stringify(options),
    answer,
    String(body.fact || "").trim(),
    body.position === undefined ? 0 : toInt(body.position, "position"),
    body.quizSetId === undefined || body.quizSetId === null
      ? null
      : toInt(body.quizSetId, "quizSetId", { min: 1 }),
    teacherId
  ];

  const pool = getPool();
  if (values[0] !== null) await assertMaterialExists(pool, values[0]);
  if (values[8] !== null) {
    const { rows: setRows } = await pool.query(
      "SELECT id FROM quiz_sets WHERE id = $1 AND teacher_id = $2",
      [values[8], teacherId]
    );
    if (!setRows.length) throw ApiError.badRequest("quizSetId tidak ditemukan atau bukan milik akun Anda.");
  }

  const { rows } = await pool.query(
    `INSERT INTO questions
       (material_id, subject, image, question, options, answer, fact, position, quiz_set_id, teacher_id)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10)
     RETURNING *`,
    values
  );

  res.status(201).json({ ok: true, question: rows[0] });
});

/** Ubah soal (hanya milik pengajar yang bersangkutan). */
const update = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const body = req.body || {};
  const teacherId = req.teacher.id;

  const pool = getPool();
  const { rows: existing } = await pool.query(
    "SELECT * FROM questions WHERE id = $1 AND teacher_id = $2",
    [id, teacherId]
  );
  if (!existing.length) throw ApiError.notFound("Soal tidak ditemukan atau Anda tidak memiliki akses.");

  const current = existing[0];
  const options =
    body.options === undefined ? current.options : validateOptions(body.options, 0).options;
  const answer =
    body.answer === undefined ? current.answer : validateOptions(options, body.answer).answer;

  const materialId =
    body.materialId === undefined
      ? current.material_id
      : body.materialId === null
        ? null
        : toInt(body.materialId, "materialId", { min: 1 });

  if (materialId !== null) await assertMaterialExists(pool, materialId);

  const quizSetId =
    body.quizSetId === undefined
      ? current.quiz_set_id
      : body.quizSetId === null
        ? null
        : toInt(body.quizSetId, "quizSetId", { min: 1 });

  if (quizSetId !== null) {
    const { rows: setRows } = await pool.query(
      "SELECT id FROM quiz_sets WHERE id = $1 AND teacher_id = $2",
      [quizSetId, teacherId]
    );
    if (!setRows.length) throw ApiError.badRequest("quizSetId tidak ditemukan atau bukan milik akun Anda.");
  }

  const values = [
    materialId,
    body.subject === undefined ? current.subject : String(body.subject).trim(),
    body.image === undefined ? current.image : String(body.image).trim(),
    body.question === undefined ? current.question : String(body.question).trim(),
    JSON.stringify(options),
    answer,
    body.fact === undefined ? current.fact : String(body.fact).trim(),
    body.position === undefined ? current.position : toInt(body.position, "position"),
    quizSetId,
    id,
    teacherId
  ];

  const { rows } = await pool.query(
    `UPDATE questions
        SET material_id = $1, subject = $2, image = $3, question = $4,
            options = $5::jsonb, answer = $6, fact = $7, position = $8,
            quiz_set_id = $9
      WHERE id = $10 AND teacher_id = $11
      RETURNING *`,
    values
  );

  res.json({ ok: true, question: rows[0] });
});

/** Ubah kunci jawaban benar secara cepat (misal dari daftar kuis / panel kelola). */
const setAnswer = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const answerIndex = toInt(req.body.answer, "answer", { min: 0 });
  const teacherId = req.teacher.id;
  const pool = getPool();

  const { rows: existing } = await pool.query(
    "SELECT id, options, answer FROM questions WHERE id = $1 AND teacher_id = $2",
    [id, teacherId]
  );
  if (!existing.length) throw ApiError.notFound("Soal tidak ditemukan atau Anda tidak memiliki akses.");

  const question = existing[0];
  const options = question.options;
  if (answerIndex >= options.length) {
    throw ApiError.badRequest(`Indeks jawaban tidak valid (harus 0..${options.length - 1}).`);
  }

  const { rows } = await pool.query(
    "UPDATE questions SET answer = $1 WHERE id = $2 AND teacher_id = $3 RETURNING *",
    [answerIndex, id, teacherId]
  );

  res.json({ ok: true, question: rows[0] });
});

/** Hapus soal. */
const remove = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const teacherId = req.teacher.id;
  const pool = getPool();

  const { rows } = await pool.query(
    "DELETE FROM questions WHERE id = $1 AND teacher_id = $2 RETURNING id",
    [id, teacherId]
  );
  if (!rows.length) throw ApiError.notFound("Soal tidak ditemukan atau Anda tidak memiliki akses.");

  res.json({ ok: true, deletedId: id });
});

module.exports = { listPublic, manage, create, update, setAnswer, remove };
