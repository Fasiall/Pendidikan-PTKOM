/* ==========================================================================
   src/controllers/quiz_set.controller.js -- CRUD Set Soal + Kode Kuis

   Publik (siswa):
     GET /api/sets/code/:code     validasi kode kuis + info singkat

   Pengajar (JWT wajib):
     GET    /api/sets/manage           set soal milik guru + set publik
     POST   /api/sets                  buat set soal baru (pemilik = guru login)
     PUT    /api/sets/:id              ubah set soal (hanya pemilik)
     DELETE /api/sets/:id              hapus set soal (hanya pemilik)
     PATCH  /api/sets/:id/publish      publish / draf (hanya pemilik)
     POST   /api/sets/:id/code         buat / acak ulang kode kuis
     DELETE /api/sets/:id/code         nonaktifkan kode kuis
   ========================================================================== */

const { getPool } = require("../db/embedded");
const { ApiError, asyncHandler } = require("../utils/errors");
const { requireFields, toInt, toBool, toVisibility } = require("../utils/validate");
const { normalizeCode, generateUniqueCode } = require("../utils/quizCode");

/* ============================== PUBLIK =================================== */

/** Validasi kode kuis untuk siswa. Kode harus aktif & set sudah dipublish. */
const getByCode = asyncHandler(async (req, res) => {
  const pool = getPool();
  const code = normalizeCode(req.params.code);

  if (code.length !== 6) {
    throw ApiError.notFound("Kode tidak ditemukan atau kuis belum dibuka.");
  }

  const { rows } = await pool.query(
    `SELECT qs.id, qs.title, qs.material_id, qs.time_limit,
            m.title AS material_title,
            COUNT(q.id)::int AS question_count
       FROM quiz_sets qs
       JOIN materials m ON m.id = qs.material_id
       LEFT JOIN questions q ON q.quiz_set_id = qs.id
      WHERE qs.access_code = $1
        AND qs.access_code_active = TRUE
        AND qs.is_published = TRUE
        AND m.is_published = TRUE
      GROUP BY qs.id, m.title`,
    [code]
  );

  if (!rows.length) {
    throw ApiError.notFound("Kode tidak ditemukan atau kuis belum dibuka.");
  }

  res.json({ set: rows[0] });
});

/* ============================= PENGAJAR ================================== */

/** Set soal milik guru login + set publik milik guru lain. */
const manage = asyncHandler(async (req, res) => {
  const pool = getPool();
  const teacherId = req.teacher.id;

  const values = [teacherId];
  let where = "(qs.teacher_id = $1 OR qs.visibility = 'public')";

  if (req.query.materialId !== undefined && req.query.materialId !== "") {
    values.push(toInt(req.query.materialId, "materialId", { min: 1 }));
    where += ` AND qs.material_id = $${values.length}`;
  }

  const { rows } = await pool.query(
    `SELECT qs.*, m.title AS material_title, t.username AS owner_name,
            COUNT(q.id)::int AS question_count
       FROM quiz_sets qs
       LEFT JOIN materials m ON m.id = qs.material_id
       LEFT JOIN teachers t ON t.id = qs.teacher_id
       LEFT JOIN questions q ON q.quiz_set_id = qs.id
      WHERE ${where}
      GROUP BY qs.id, m.title, t.username
      ORDER BY qs.material_id, qs.position, qs.id`,
    values
  );

  res.json({
    total: rows.length,
    sets: rows.map((row) => ({ ...row, is_owner: row.teacher_id === teacherId }))
  });
});

/** Buat set soal baru tanpa kode; kode dibuat lewat tombol "Buat Kode". */
const create = asyncHandler(async (req, res) => {
  requireFields(req.body, ["title", "materialId"]);

  const body = req.body;
  const title = String(body.title).trim();
  if (title.length < 2) throw ApiError.badRequest("Judul set soal minimal 2 karakter.");

  const materialId = toInt(body.materialId, "materialId", { min: 1 });

  const pool = getPool();
  const teacherId = req.teacher.id;

  /* Materi harus milik guru yang login (materi publik hanya untuk dibaca). */
  const { rows: matRows } = await pool.query(
    "SELECT id FROM materials WHERE id = $1 AND author_id = $2",
    [materialId, teacherId]
  );
  if (!matRows.length) {
    throw ApiError.badRequest("Materi tidak ditemukan atau bukan milik Anda.");
  }

  const { rows } = await pool.query(
    `INSERT INTO quiz_sets
       (material_id, title, description, is_published, position,
        access_code, access_code_active, time_limit, teacher_id, visibility)
     VALUES ($1, $2, $3, $4, $5, NULL, FALSE, $6, $7, $8)
     RETURNING *`,
    [
      materialId,
      title,
      String(body.description || "").trim().slice(0, 300),
      toBool(body.is_published, true),
      body.position === undefined ? 0 : toInt(body.position, "position"),
      body.timeLimit === undefined || body.timeLimit === null || body.timeLimit === ""
        ? 0
        : toInt(body.timeLimit, "timeLimit", { min: 0 }),
      teacherId,
      toVisibility(body.visibility, "private")
    ]
  );

  res.status(201).json({ ok: true, set: rows[0] });
});

/** Ubah set soal -- hanya pemiliknya. */
const update = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const body = req.body || {};
  const pool = getPool();

  const { rows: existing } = await pool.query(
    "SELECT * FROM quiz_sets WHERE id = $1 AND teacher_id = $2",
    [id, req.teacher.id]
  );
  if (!existing.length) throw ApiError.notFound("Set soal tidak ditemukan.");

  const current = existing[0];

  const title = body.title === undefined
    ? current.title
    : String(body.title).trim();
  if (title.length < 2) throw ApiError.badRequest("Judul set soal minimal 2 karakter.");

  const { rows } = await pool.query(
    `UPDATE quiz_sets
        SET title = $1, description = $2, is_published = $3, position = $4,
            time_limit = $5, visibility = $6
      WHERE id = $7 AND teacher_id = $8
      RETURNING *`,
    [
      title,
      body.description === undefined
        ? current.description
        : String(body.description).trim().slice(0, 300),
      body.is_published === undefined
        ? current.is_published
        : toBool(body.is_published),
      body.position === undefined
        ? current.position
        : toInt(body.position, "position"),
      body.timeLimit === undefined || body.timeLimit === null || body.timeLimit === ""
        ? current.time_limit
        : toInt(body.timeLimit, "timeLimit", { min: 0 }),
      body.visibility === undefined
        ? current.visibility
        : toVisibility(body.visibility),
      id,
      req.teacher.id
    ]
  );

  res.json({ ok: true, set: rows[0] });
});

/** Hapus set soal -- hanya pemiliknya. */
const remove = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const pool = getPool();

  const { rows } = await pool.query(
    "DELETE FROM quiz_sets WHERE id = $1 AND teacher_id = $2 RETURNING id",
    [id, req.teacher.id]
  );
  if (!rows.length) throw ApiError.notFound("Set soal tidak ditemukan.");

  res.json({ ok: true, deletedId: id });
});

/** Publish / unpublish set soal -- hanya pemiliknya. */
const publish = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const isPublished = toBool((req.body || {}).is_published, true);

  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE quiz_sets SET is_published = $1
      WHERE id = $2 AND teacher_id = $3
      RETURNING *`,
    [isPublished, id, req.teacher.id]
  );
  if (!rows.length) throw ApiError.notFound("Set soal tidak ditemukan.");

  res.json({ ok: true, set: rows[0] });
});

/** Buat kode baru (sekaligus membatalkan kode lama) -- hanya pemilik. */
const generateCode = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const pool = getPool();

  const { rows: existing } = await pool.query(
    "SELECT id FROM quiz_sets WHERE id = $1 AND teacher_id = $2",
    [id, req.teacher.id]
  );
  if (!existing.length) throw ApiError.notFound("Set soal tidak ditemukan.");

  const code = await generateUniqueCode(pool);
  const { rows } = await pool.query(
    `UPDATE quiz_sets
        SET access_code = $1, access_code_active = TRUE
      WHERE id = $2 AND teacher_id = $3
      RETURNING id, access_code, access_code_active`,
    [code, id, req.teacher.id]
  );

  res.json({ ok: true, code: rows[0].access_code, set: rows[0] });
});

/** Nonaktifkan kode kuis (kode lama tidak bisa dipakai lagi) -- hanya pemilik. */
const disableCode = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const pool = getPool();

  const { rows } = await pool.query(
    `UPDATE quiz_sets SET access_code_active = FALSE
      WHERE id = $1 AND teacher_id = $2
      RETURNING id, access_code, access_code_active`,
    [id, req.teacher.id]
  );
  if (!rows.length) throw ApiError.notFound("Set soal tidak ditemukan.");

  res.json({ ok: true, set: rows[0] });
});

module.exports = {
  getByCode,
  manage,
  create,
  update,
  remove,
  publish,
  generateCode,
  disableCode
};
