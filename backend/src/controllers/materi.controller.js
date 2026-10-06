/* ==========================================================================
   src/controllers/materi.controller.js — Manajemen Materi Belajar

   Publik (siswa, tanpa login):
     GET    /api/materials        daftar materi (judul + thumbnail)
     GET    /api/materials/:id    detail materi (isi lengkap)

   Pengajar (JWT wajib):
     GET    /api/materials/manage daftar semua materi (termasuk draf)
     POST   /api/materials        buat materi baru
     PUT    /api/materials/:id    ubah materi
     DELETE /api/materials/:id    hapus materi
     PATCH  /api/materials/:id/publish  publish / unpublished
   ========================================================================== */

const { getPool } = require("../db/embedded");
const { ApiError, asyncHandler } = require("../utils/errors");
const { requireFields, toInt, toBool } = require("../utils/validate");

/** Kolom yang diterima saat create/update. */
const ALLOWED_FIELDS = [
  "title",
  "summary",
  "content",
  "image_url",
  "emoji",
  "subject",
  "position",
  "is_published"
];

/** Bangun klausa WHERE dinamis dari query string. */
function buildFilters(query, { includeUnpublished = false } = {}) {
  const values = [];
  const where = [];

  const search = String(query.search || "").trim();
  if (search) {
    values.push(`%${search}%`);
    where.push(`(m.title ILIKE $${values.length} OR m.summary ILIKE $${values.length})`);
  }

  const subject = String(query.subject || "").trim();
  if (subject) {
    values.push(subject);
    where.push(`m.subject = $${values.length}`);
  }

  if (!includeUnpublished) where.push("m.is_published = TRUE");

  return { where, values };
}

/* ============================== PUBLIK =================================== */

/** Daftar materi untuk siswa (baru judul, ringkasan, thumbnail, jumlah soal). */
const list = asyncHandler(async (req, res) => {
  const pool = getPool();
  const { where, values } = buildFilters(req.query, { includeUnpublished: false });

  const { rows } = await pool.query(
    `SELECT m.id, m.title, m.summary, m.image_url, m.emoji, m.subject,
            m.position, m.updated_at,
            COUNT(q.id)::int AS question_count
       FROM materials m
       LEFT JOIN questions q ON q.material_id = m.id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      GROUP BY m.id
      ORDER BY m.position, m.id`,
    values
  );

  res.json({ total: rows.length, materials: rows });
});

/** Detail materi berdasarkan ID — dipakai halaman baca siswa. */
const detail = asyncHandler(async (req, res) => {
  const pool = getPool();
  const id = toInt(req.params.id, "id", { min: 1 });

  const { rows } = await pool.query(
    `SELECT m.*, (SELECT COUNT(*)::int FROM questions q WHERE q.material_id = m.id) AS question_count
       FROM materials m
      WHERE m.id = $1 AND m.is_published = TRUE`,
    [id]
  );

  if (!rows.length) throw ApiError.notFound("Materi tidak ditemukan atau belum dipublikasikan.");

  res.json({ material: rows[0] });
});

/* ============================= PENGAJAR ================================== */

/** Semua materi (termasuk draf) untuk dashboard pengajar. */
const manage = asyncHandler(async (req, res) => {
  const pool = getPool();
  const { where, values } = buildFilters(req.query, { includeUnpublished: true });

  const { rows } = await pool.query(
    `SELECT m.*, COUNT(q.id)::int AS question_count
       FROM materials m
       LEFT JOIN questions q ON q.material_id = m.id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      GROUP BY m.id
      ORDER BY m.position, m.id`,
    values
  );

  res.json({ total: rows.length, materials: rows });
});

/** Buat materi baru. */
const create = asyncHandler(async (req, res) => {
  requireFields(req.body, ["title", "content"]);

  const body = req.body;
  const title = String(body.title).trim();
  const summary = String(body.summary || "").trim().slice(0, 300);
  const content = String(body.content);

  if (title.length < 3) throw ApiError.badRequest("Judul materi minimal 3 karakter.");

  const values = [
    title,
    summary,
    content,
    String(body.image_url || "").trim(),
    String(body.emoji || "📘").trim(),
    String(body.subject || "").trim(),
    body.position === undefined ? 0 : toInt(body.position, "position"),
    toBool(body.is_published, true),
    req.teacher.id
  ];

  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO materials
       (title, summary, content, image_url, emoji, subject, position, is_published, author_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    values
  );

  res.status(201).json({ ok: true, material: rows[0] });
});

/** Ubah materi (hanya field yang dikirim yang diubah). */
const update = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const body = req.body || {};

  const sets = [];
  const values = [];

  for (const field of ALLOWED_FIELDS) {
    if (body[field] === undefined) continue;

    let value = body[field];
    if (field === "title") {
      value = String(value).trim();
      if (value.length < 3) throw ApiError.badRequest("Judul materi minimal 3 karakter.");
    } else if (field === "summary") {
      value = String(value).trim().slice(0, 300);
    } else if (field === "content" || field === "image_url" || field === "emoji" || field === "subject") {
      value = String(value);
    } else if (field === "position") {
      value = toInt(value, "position");
    } else if (field === "is_published") {
      value = toBool(value);
    }

    values.push(value);
    sets.push(`${field} = $${values.length}`);
  }

  if (!sets.length) throw ApiError.badRequest("Tidak ada field yang dikirim untuk diubah.");

  values.push(id);
  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE materials SET ${sets.join(", ")}, updated_at = now()
      WHERE id = $${values.length}
      RETURNING *`,
    values
  );

  if (!rows.length) throw ApiError.notFound("Materi tidak ditemukan.");
  res.json({ ok: true, material: rows[0] });
});

/** Hapus materi (soal terkait otomatis dilepas relasinya). */
const remove = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const pool = getPool();

  const { rows } = await pool.query(
    "DELETE FROM materials WHERE id = $1 RETURNING id",
    [id]
  );
  if (!rows.length) throw ApiError.notFound("Materi tidak ditemukan.");

  res.json({ ok: true, deletedId: id });
});

/** Publish / unpublished materi. */
const publish = asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const isPublished = toBool((req.body || {}).is_published, true);

  const pool = getPool();
  const { rows } = await pool.query(
    "UPDATE materials SET is_published = $1, updated_at = now() WHERE id = $2 RETURNING *",
    [isPublished, id]
  );
  if (!rows.length) throw ApiError.notFound("Materi tidak ditemukan.");

  res.json({ ok: true, material: rows[0] });
});

module.exports = { list, detail, manage, create, update, remove, publish };
