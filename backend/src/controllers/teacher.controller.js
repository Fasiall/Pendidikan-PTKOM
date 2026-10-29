/* ==========================================================================
   src/controllers/teacher.controller.js -- Ringkasan dashboard pengajar

   GET /api/teacher/stats (JWT wajib)

   Semua angka dihitung HANYA dari data milik guru yang login:
     - totalMaterials : materi dengan author_id = guru
     - totalQuestions : soal dengan teacher_id = guru
     - averageScore   : rata-rata poin (mis. 5,8/8) dari results.teacher_id = guru
     - results        : 10 riwayat terakhir milik guru
   ========================================================================== */

const { getPool } = require("../db/embedded");
const { asyncHandler } = require("../utils/errors");

/** Bulatkan 1 angka desimal dengan koma Indonesia (5.75 -> "5,8"). */
function formatDecimal(value) {
  return Number(value).toFixed(1).replace(".", ",");
}

/** Jumlah soal selalu bilangan bulat, jadi penyebut dibulatkan. */
function formatTotal(value) {
  return Math.round(Number(value));
}

const stats = asyncHandler(async (req, res) => {
  const pool = getPool();
  const teacherId = req.teacher.id;

  const [materials, questions, average, results] = await Promise.all([
    pool.query(
      `SELECT m.id, m.title, m.subject, m.emoji, m.is_published, m.visibility,
              m.updated_at, COUNT(q.id)::int AS question_count
         FROM materials m
         LEFT JOIN questions q ON q.material_id = m.id
        WHERE m.author_id = $1
        GROUP BY m.id
        ORDER BY m.position, m.id`,
      [teacherId]
    ),
    pool.query(
      `SELECT q.id, q.subject, q.image, q.question, q.options, q.answer, q.fact,
              m.title AS material_title
         FROM questions q
         LEFT JOIN materials m ON m.id = q.material_id
        WHERE q.teacher_id = $1
        ORDER BY q.position, q.id`,
      [teacherId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total,
              AVG(score)::numeric AS avg_score,
              AVG(total)::numeric AS avg_total
         FROM results
        WHERE teacher_id = $1`,
      [teacherId]
    ),
    pool.query(
      `SELECT r.id, r.student_name, r.score, r.total, r.created_at,
              r.started_at, r.finished_at,
              m.title AS material_title, qs.title AS set_title
         FROM results r
         LEFT JOIN materials m ON m.id = r.material_id
         LEFT JOIN quiz_sets qs ON qs.id = r.quiz_set_id
        WHERE r.teacher_id = $1
        ORDER BY r.id DESC
        LIMIT 10`,
      [teacherId]
    )
  ]);

  const aggregate = average.rows[0] || { total: 0, avg_score: null, avg_total: null };
  let averageScore = null;

  if (aggregate.total > 0 && aggregate.avg_score !== null && aggregate.avg_total !== null) {
    averageScore = {
      score: Number(Number(aggregate.avg_score).toFixed(2)),
      total: formatTotal(aggregate.avg_total),
      label: formatDecimal(aggregate.avg_score) + "/" + formatTotal(aggregate.avg_total),
      count: aggregate.total
    };
  }

  res.json({
    teacher: req.teacher,
    totalMaterials: materials.rows.length,
    totalQuestions: questions.rows.length,
    averageScore,
    lastScore: results.rows.length
      ? `${results.rows[0].score}/${results.rows[0].total}`
      : null,
    materials: materials.rows,
    questions: questions.rows,
    results: results.rows
  });
});

module.exports = { stats };
