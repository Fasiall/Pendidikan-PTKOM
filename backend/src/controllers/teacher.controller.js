/* ==========================================================================
   src/controllers/teacher.controller.js — Ringkasan dashboard pengajar

   GET /api/teacher/stats (JWT wajib)
   ========================================================================== */

const { getPool } = require("../db/embedded");
const { asyncHandler } = require("../utils/errors");

const stats = asyncHandler(async (req, res) => {
  const pool = getPool();
  const teacherId = req.teacher.id;

  const [materials, questions, sets, lastResult, results] = await Promise.all([
    pool.query(
      `SELECT m.id, m.title, m.subject, m.emoji, m.is_published, m.updated_at,
              COUNT(q.id)::int AS question_count
         FROM materials m
         LEFT JOIN questions q ON q.material_id = m.id AND q.teacher_id = $1
        WHERE m.author_id = $1
        GROUP BY m.id
        ORDER BY m.position, m.id`,
      [teacherId]
    ),
    pool.query(
      `SELECT q.id, q.subject, q.image, q.question, q.options, q.answer, q.fact,
              q.quiz_set_id, m.title AS material_title, qs.title AS quiz_set_title
         FROM questions q
         LEFT JOIN materials m ON m.id = q.material_id
         LEFT JOIN quiz_sets qs ON qs.id = q.quiz_set_id
        WHERE q.teacher_id = $1
        ORDER BY q.quiz_set_id NULLS LAST, q.position, q.id`,
      [teacherId]
    ),
    pool.query(
      `SELECT qs.id, qs.title, qs.access_code, qs.is_published, qs.time_limit,
              COUNT(q.id)::int AS question_count
         FROM quiz_sets qs
         LEFT JOIN questions q ON q.quiz_set_id = qs.id AND q.teacher_id = $1
        WHERE qs.teacher_id = $1
        GROUP BY qs.id
        ORDER BY qs.id`,
      [teacherId]
    ),
    pool.query(
      `SELECT r.score, r.total, r.student_name, r.created_at,
              qs.id AS quiz_set_id, qs.title AS quiz_set_title
         FROM results r
         LEFT JOIN quiz_sets qs ON qs.id = r.quiz_set_id
        WHERE qs.teacher_id = $1
        ORDER BY r.id DESC LIMIT 1`,
      [teacherId]
    ),
    pool.query(
      `SELECT r.id, r.student_name, r.score, r.total, r.created_at,
              m.title AS material_title, qs.title AS quiz_set_title, qs.id AS quiz_set_id, qs.access_code
         FROM results r
         LEFT JOIN materials m ON m.id = r.material_id
         LEFT JOIN quiz_sets qs ON qs.id = r.quiz_set_id
        WHERE qs.teacher_id = $1
           OR (qs.id IS NULL AND m.author_id = $1)
        ORDER BY r.id DESC
        LIMIT 10`,
      [teacherId]
    )
  ]);

  const topics = new Set(questions.rows.map((q) => q.subject).filter(Boolean)).size;
  const last = lastResult.rows[0];

  res.json({
    teacher: req.teacher,
    totalMaterials: materials.rows.length,
    totalQuestions: questions.rows.length,
    totalSets: sets.rows.length,
    topics,
    lastScore: last ? `${last.score}/${last.total}` : null,
    materials: materials.rows,
    questions: questions.rows,
    sets: sets.rows,
    results: results.rows
  });
});

module.exports = { stats };
