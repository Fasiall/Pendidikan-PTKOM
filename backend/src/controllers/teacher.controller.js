/* ==========================================================================
   src/controllers/teacher.controller.js — Ringkasan dashboard pengajar

   GET /api/teacher/stats (JWT wajib)
   ========================================================================== */

const { getPool } = require("../db/embedded");
const { asyncHandler } = require("../utils/errors");

const stats = asyncHandler(async (req, res) => {
  const pool = getPool();

  const [materials, questions, lastResult, results] = await Promise.all([
    pool.query(
      `SELECT m.id, m.title, m.subject, m.emoji, m.is_published, m.updated_at,
              COUNT(q.id)::int AS question_count
         FROM materials m
         LEFT JOIN questions q ON q.material_id = m.id
        GROUP BY m.id
        ORDER BY m.position, m.id`
    ),
    pool.query(
      `SELECT q.id, q.subject, q.image, q.question, q.options, q.answer, q.fact,
              m.title AS material_title
         FROM questions q
         LEFT JOIN materials m ON m.id = q.material_id
        ORDER BY q.position, q.id`
    ),
    pool.query("SELECT score, total, student_name, created_at FROM results ORDER BY id DESC LIMIT 1"),
    pool.query(
      `SELECT r.id, r.student_name, r.score, r.total, r.created_at, m.title AS material_title
         FROM results r
         LEFT JOIN materials m ON m.id = r.material_id
        ORDER BY r.id DESC
        LIMIT 10`
    )
  ]);

  const topics = new Set(questions.rows.map((q) => q.subject).filter(Boolean)).size;
  const last = lastResult.rows[0];

  res.json({
    teacher: req.teacher,
    totalMaterials: materials.rows.length,
    totalQuestions: questions.rows.length,
    topics,
    lastScore: last ? `${last.score}/${last.total}` : null,
    materials: materials.rows,
    questions: questions.rows,
    results: results.rows
  });
});

module.exports = { stats };
