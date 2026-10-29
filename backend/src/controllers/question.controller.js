/* ==========================================================================
   src/controllers/question.controller.js -- Manajemen Soal Kuis

   Publik (siswa, hanya saat sesi kuis lewat kode aktif):
     GET /api/questions               soal TANPA kunci jawaban

   Pengajar (JWT wajib):
     GET    /api/questions/manage     soal milik guru + soal publik
     POST   /api/questions            tambah soal (pemilik = guru login)
     PUT    /api/questions/:id        ubah soal (hanya pemilik)
     DELETE /api/questions/:id        hapus soal (hanya pemilik)
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

/** Pastikan materi milik guru yang login. */
async function assertOwnedMaterial(pool, materialId, teacherId) {
  const { rows } = await pool.query(
    "SELECT id FROM materials WHERE id = $1 AND author_id = $2",
    [materialId, teacherId]
  );
  if (!rows.length) throw ApiError.badRequest("Materi tidak ditemukan atau bukan milik Anda.");
}

/** Pastikan set soal milik guru yang login. */
async function assertOwnedSet(pool, quizSetId, teacherId) {
  const { rows } = await pool.query(
    "SELECT id FROM quiz_sets WHERE id = $1 AND teacher_id = $2",
    [quizSetId, teacherId]
  );
  if (!rows.length) throw ApiError.badRequest("Set soal tidak ditemukan atau bukan milik Anda.");
}

/* ============================== PUBLIK =================================== */

/**
 * Soal untuk siswa. Hanya boleh diakses setelah siswa masuk lewat kode,
 * sehingga tidak ada endpoint publik yang membuka seluruh bank soal.
 */
const listPublic = asyncHandler(async (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz || !quiz.setId) {
    throw ApiError.forbidden("Masuk ke kuis lewat kode terlebih dahulu.");
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT q.id, q.material_id, q.subject, q.image, q.question, q.options, q.position
       FROM questions q
      WHERE q.quiz_set_id = $1
      ORDER BY q.position, q.id`,
    [quiz.setId]
  );

  res.json({ total: rows.length, questions: rows });
});

/* ============================= PENGAJAR ================================== */

/** Soal milik guru + soal dari set/materi publik (read-only). */
const manage = asyncHandler(async (req, res) => {
  const pool = getPool();
  const teacherId = req.teacher.id;

  const { rows } = await pool.query(
    `SELECT q.*, m.title AS material_title, qs.title AS set_title,
            t.username AS owner_name
       FROM questions q
       LEFT JOIN materials m ON m.id = q.material_id
       LEFT JOIN quiz_sets qs ON qs.id = q.quiz_set_id
       LEFT JOIN teachers t ON t.id = q.teacher_id
      WHERE q.teacher_id = $1
         OR qs.visibility = 'public'
         OR (q.quiz_set_id IS NULL AND m.visibility = 'public')
      ORDER BY q.material_id NULLS FIRST, q.position, q.id`,
    [teacherId]
  );

  res.json({
    total: rows.length,
    questions: rows.map((row) => ({ ...row, is_owner: row.teacher_id === teacherId }))
  });
});

/** Tambah soal baru; pemilik otomatis guru yang login. */
const create = asyncHandler(async (req, res) => {
  requireFields(req.body, ["question", "options", "answer"]);

  const body = req.body;
  const { options, answer } = validateOptions(body.options, body.answer);

  const materialId = body.materialId === undefined || body.materialId === null
    ? null
    : toInt(body.materialId, "materialId", { min: 1 });

  const quizSetId = body.quizSetId === undefined || body.quizSetId === null
    ? null
    : toInt(body.quizSetId, "quizSetId", { min: 1 });

  const pool = getPool();
  const teacherId = req.teacher.id;

  if (materialId !== null) await assertOwnedMaterial(pool, materialId, teacherId);
  if (quizSetId !== null) await assertOwnedSet(pool, quizSetId, teacherId);

  const values = [
    materialId,
    String(body.subject || "").trim(),
    String(body.image || "").trim(),
    String(body.question).trim(),
    JSON.stringify(options),
    answer,
    String(body.fact || "").trim(),
    body.position === undefined ? 0 : toInt(body.position, "position"),
    quizSetId,
    teacherId
  ];

  const { rows } = await pool.query(
    `INSERT INTO questions
       (material_id, subject, image, question, options, answer, fact, position, quiz_set_id, teacher_id)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10)
     RETURNING *`,
    values
  );

  res.status(201).json({ ok: true, question: rows[0] });
});

/** Ubah soal -- hanya pemiliknya. */
const update = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const body = req.body || {};
  const pool = getPool();
  const teacherId = req.teacher.id;

  const { rows: existing } = await pool.query(
    "SELECT * FROM questions WHERE id = $1 AND teacher_id = $2",
    [id, teacherId]
  );
  if (!existing.length) throw ApiError.notFound("Soal tidak ditemukan.");

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

  if (materialId !== null) await assertOwnedMaterial(pool, materialId, teacherId);

  const quizSetId =
    body.quizSetId === undefined
      ? current.quiz_set_id
      : body.quizSetId === null
        ? null
        : toInt(body.quizSetId, "quizSetId", { min: 1 });

  if (quizSetId !== null) await assertOwnedSet(pool, quizSetId, teacherId);

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

  if (!rows.length) throw ApiError.notFound("Soal tidak ditemukan.");
  res.json({ ok: true, question: rows[0] });
});

/** Hapus soal -- hanya pemiliknya. */
const remove = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const pool = getPool();

  const { rows } = await pool.query(
    "DELETE FROM questions WHERE id = $1 AND teacher_id = $2 RETURNING id",
    [id, req.teacher.id]
  );
  if (!rows.length) throw ApiError.notFound("Soal tidak ditemukan.");

  res.json({ ok: true, deletedId: id });
});

module.exports = { listPublic, manage, create, update, remove };
