/* ==========================================================================
   src/controllers/quiz_set.controller.js — CRUD Set Soal

   Publik (siswa):
     GET /api/sets?materialId=X       daftar set soal (published) per materi

   Pengajar (JWT wajib):
     GET    /api/sets/manage           semua set soal (termasuk draf)
     POST   /api/sets                  buat set soal baru
     PUT    /api/sets/:id              ubah set soal
     DELETE /api/sets/:id              hapus set soal
     PATCH  /api/sets/:id/publish      publish / draf
   ========================================================================== */

const { getPool } = require("../db/embedded");
const { ApiError, asyncHandler } = require("../utils/errors");
const { requireFields, toInt, toBool } = require("../utils/validate");

/* ============================== PUBLIK =================================== */

/** Daftar set soal yang sudah dipublish (siswa). Jika ada materialId, difilter. */
const list = asyncHandler(async (req, res) => {
  const pool = getPool();
  const values = [];
  let where = "WHERE qs.is_published = TRUE";

  if (req.query.materialId !== undefined && req.query.materialId !== "") {
    values.push(toInt(req.query.materialId, "materialId", { min: 1 }));
    where += ` AND qs.material_id = $${values.length}`;
  }

  const { rows } = await pool.query(
    `SELECT qs.id, qs.material_id, qs.title, qs.description,
            qs.position, qs.created_at,
            m.title AS material_title,
            COUNT(q.id)::int AS question_count
       FROM quiz_sets qs
       LEFT JOIN materials m ON qs.material_id = m.id
       LEFT JOIN questions q ON q.quiz_set_id = qs.id
      ${where}
      GROUP BY qs.id, m.title
      ORDER BY qs.position, qs.id`,
    values
  );

  res.json({ total: rows.length, sets: rows });
});

/* ============================= PENGAJAR ================================== */

/** Semua set soal (termasuk draf) untuk dashboard pengajar. */
const manage = asyncHandler(async (req, res) => {
  const pool = getPool();

  const values = [];
  let where = "";

  if (req.query.materialId !== undefined && req.query.materialId !== "") {
    values.push(toInt(req.query.materialId, "materialId", { min: 1 }));
    where = `WHERE qs.material_id = $${values.length}`;
  }

  const { rows } = await pool.query(
    `SELECT qs.*, m.title AS material_title,
            COUNT(q.id)::int AS question_count
       FROM quiz_sets qs
       LEFT JOIN materials m ON m.id = qs.material_id
       LEFT JOIN questions q ON q.quiz_set_id = qs.id
      ${where}
      GROUP BY qs.id, m.title
      ORDER BY qs.material_id, qs.position, qs.id`,
    values
  );

  res.json({ total: rows.length, sets: rows });
});

/** Buat set soal baru. */
const create = asyncHandler(async (req, res) => {
  requireFields(req.body, ["title", "materialId"]);

  const body = req.body;
  const title = String(body.title).trim();
  if (title.length < 2) throw ApiError.badRequest("Judul set soal minimal 2 karakter.");

  const materialId = toInt(body.materialId, "materialId", { min: 1 });

  const pool = getPool();

  /* Pastikan materi ada */
  const { rows: matRows } = await pool.query(
    "SELECT id FROM materials WHERE id = $1",
    [materialId]
  );
  if (!matRows.length) throw ApiError.badRequest("materialId tidak ditemukan.");

  const { rows } = await pool.query(
    `INSERT INTO quiz_sets (material_id, title, description, is_published, position)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      materialId,
      title,
      String(body.description || "").trim().slice(0, 300),
      toBool(body.is_published, true),
      body.position === undefined ? 0 : toInt(body.position, "position")
    ]
  );

  res.status(201).json({ ok: true, set: rows[0] });
});

/** Ubah set soal. */
const update = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const body = req.body || {};
  const pool = getPool();

  const { rows: existing } = await pool.query(
    "SELECT * FROM quiz_sets WHERE id = $1",
    [id]
  );
  if (!existing.length) throw ApiError.notFound("Set soal tidak ditemukan.");

  const current = existing[0];

  const title = body.title === undefined
    ? current.title
    : String(body.title).trim();
  if (title.length < 2) throw ApiError.badRequest("Judul set soal minimal 2 karakter.");

  const { rows } = await pool.query(
    `UPDATE quiz_sets
        SET title = $1, description = $2, is_published = $3, position = $4
      WHERE id = $5
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
      id
    ]
  );

  res.json({ ok: true, set: rows[0] });
});

/** Hapus set soal (soal terkait otomatis dilepas relasinya via ON DELETE SET NULL). */
const remove = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const pool = getPool();

  const { rows } = await pool.query(
    "DELETE FROM quiz_sets WHERE id = $1 RETURNING id",
    [id]
  );
  if (!rows.length) throw ApiError.notFound("Set soal tidak ditemukan.");

  res.json({ ok: true, deletedId: id });
});

/** Publish / unpublish set soal. */
const publish = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const isPublished = toBool((req.body || {}).is_published, true);

  const pool = getPool();
  const { rows } = await pool.query(
    "UPDATE quiz_sets SET is_published = $1 WHERE id = $2 RETURNING *",
    [isPublished, id]
  );
  if (!rows.length) throw ApiError.notFound("Set soal tidak ditemukan.");

  res.json({ ok: true, set: rows[0] });
});

module.exports = { list, manage, create, update, remove, publish };
