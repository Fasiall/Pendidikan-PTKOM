/* ==========================================================================
   src/controllers/quiz_history.controller.js — Riwayat per kuis (guru)

   GET /api/teacher/quiz-history
     Daftar set soal milik guru + jumlah siswa, jumlah pengerjaan, rata-rata.

   GET /api/teacher/quiz-history/:id?search=&sort=&page=&pageSize=
     Ringkasan + tabel pengerjaan dengan pencarian, pengurutan, pagination.
     Hanya data milik guru yang login (cek kepemilikan di query).
   ========================================================================== */

const { getPool } = require("../db/embedded");
const { ApiError, asyncHandler } = require("../utils/errors");
const { toInt } = require("../utils/validate");

const SORT_OPTIONS = {
  date_desc: "r.created_at DESC, r.id DESC",
  date_asc: "r.created_at ASC, r.id ASC",
  score_desc: "(r.score::numeric / NULLIF(r.total, 0)) DESC NULLS LAST, r.created_at DESC",
  score_asc: "(r.score::numeric / NULLIF(r.total, 0)) ASC NULLS LAST, r.created_at DESC"
};

/** Daftar set soal milik guru beserta ringkasan pengerjaan. */
const listSets = asyncHandler(async (req, res) => {
  const pool = getPool();
  const teacherId = req.teacher.id;

  const { rows } = await pool.query(
    `SELECT qs.id, qs.title, qs.description, qs.access_code, qs.is_published,
            qs.time_limit, qs.shuffle_questions, qs.schedule_start, qs.schedule_end,
            COUNT(r.id)::int AS attempt_count,
            COUNT(DISTINCT LOWER(TRIM(r.student_name)))::int AS student_count,
            COALESCE(ROUND(AVG(r.score)::numeric, 1), 0)::float AS average_score,
            COALESCE(
              ROUND(AVG(CASE WHEN r.total > 0 THEN (r.score::numeric / r.total) * 100 END)::numeric, 1),
              0
            )::float AS average_percent,
            MAX(r.created_at) AS last_attempt_at,
            CASE
              WHEN qs.schedule_start IS NULL AND qs.schedule_end IS NULL THEN NULL
              WHEN NOW() < qs.schedule_start THEN 'not_open'
              WHEN NOW() > qs.schedule_end THEN 'ended'
              ELSE 'open'
            END AS schedule_status
       FROM quiz_sets qs
       LEFT JOIN results r ON r.quiz_set_id = qs.id
      WHERE qs.teacher_id = $1
      GROUP BY qs.id
      ORDER BY qs.created_at DESC, qs.id DESC`,
    [teacherId]
  );

  res.json({ total: rows.length, sets: rows });
});

/** Detail riwayat satu set soal milik guru yang login. */
const detail = asyncHandler(async (req, res) => {
  const pool = getPool();
  const teacherId = req.teacher.id;
  const setId = toInt(req.params.id, "id", { min: 1 });

  /* Kepemilikan diperiksa di backend: guru lain mendapat 404. */
  const { rows: setRows } = await pool.query(
    `SELECT qs.id, qs.title, qs.description, qs.access_code, qs.is_published,
            qs.time_limit, qs.shuffle_questions, qs.schedule_start, qs.schedule_end,
            CASE
              WHEN qs.schedule_start IS NULL AND qs.schedule_end IS NULL THEN NULL
              WHEN NOW() < qs.schedule_start THEN 'not_open'
              WHEN NOW() > qs.schedule_end THEN 'ended'
              ELSE 'open'
            END AS schedule_status
       FROM quiz_sets qs
      WHERE qs.id = $1 AND qs.teacher_id = $2`,
    [setId, teacherId]
  );
  if (!setRows.length) {
    throw ApiError.notFound("Riwayat kuis tidak ditemukan atau Anda tidak memiliki akses.");
  }

  const search = String(req.query.search || "").trim().slice(0, 80);
  const sortKey = Object.prototype.hasOwnProperty.call(SORT_OPTIONS, req.query.sort)
    ? req.query.sort
    : "date_desc";
  const page = req.query.page === undefined || req.query.page === ""
    ? 1
    : toInt(req.query.page, "page", { min: 1 });
  const pageSize = req.query.pageSize === undefined || req.query.pageSize === ""
    ? 10
    : toInt(req.query.pageSize, "pageSize", { min: 5, max: 50 });

  const filterParams = [setId];
  let where = "WHERE r.quiz_set_id = $1";
  if (search) {
    filterParams.push("%" + search.toLowerCase() + "%");
    where += " AND LOWER(r.student_name) LIKE $" + filterParams.length;
  }

  const [summaryResult, countResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS attempts,
              COUNT(DISTINCT LOWER(TRIM(r.student_name)))::int AS students,
              COALESCE(ROUND(AVG(r.score)::numeric, 1), 0)::float AS average_score,
              COALESCE(
                ROUND(AVG(CASE WHEN r.total > 0 THEN (r.score::numeric / r.total) * 100 END)::numeric, 1),
                0
              )::float AS average_percent,
              COALESCE(MAX(r.total), 0)::int AS total_questions,
              COALESCE(MAX(r.score), 0)::int AS highest_score,
              COALESCE(MIN(r.score), 0)::int AS lowest_score
         FROM results r
        WHERE r.quiz_set_id = $1`,
      [setId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
         FROM results r
         ${where}`,
      filterParams
    )
  ]);

  const total = countResult.rows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const listParams = filterParams.slice();
  listParams.push(pageSize, offset);

  const { rows: attempts } = await pool.query(
    `SELECT r.id, r.student_name, r.score, r.total,
            GREATEST(r.total - r.score, 0)::int AS wrong_count,
            r.started_at, r.finished_at, r.created_at,
            CASE
              WHEN r.started_at IS NOT NULL AND r.finished_at IS NOT NULL
              THEN GREATEST(EXTRACT(EPOCH FROM (r.finished_at - r.started_at))::int, 0)
            END AS duration_seconds
       FROM results r
       ${where}
      ORDER BY ${SORT_OPTIONS[sortKey]}
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  res.json({
    set: setRows[0],
    summary: summaryResult.rows[0],
    attempts,
    search,
    sort: sortKey,
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages
    }
  });
});

module.exports = { listSets, detail };
