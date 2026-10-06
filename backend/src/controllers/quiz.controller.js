/* ==========================================================================
   src/controllers/quiz.controller.js — Alur kuis siswa

   Skor sementara disimpan di SESSION (express-session) milik browser,
   sementara kunci jawaban tidak pernah dikirim ke klien sehingga siswa
   tidak bisa membuka tab developer untuk melihat jawaban.

   Endpoint (publik):
     POST /api/quiz/start   { materialId? } -> mulai/reset sesi kuis
     POST /api/quiz/answer  { questionId, choice }
     POST /api/quiz/submit               -> simpan skor akhir ke database
     GET  /api/quiz/results              -> 10 skor terakhir (dashboard guru)
   ========================================================================== */

const { getPool } = require("../db/embedded");
const { ApiError, asyncHandler } = require("../utils/errors");
const { toInt } = require("../utils/validate");

/** Ambil soal milik sesi kuis (difilter materi bila dipilih). */
async function fetchSessionQuestions(pool, materialId) {
  if (materialId) {
    const { rows } = await pool.query(
      "SELECT id FROM questions WHERE material_id = $1 ORDER BY position, id",
      [materialId]
    );
    return rows;
  }
  const { rows } = await pool.query("SELECT id FROM questions ORDER BY position, id");
  return rows;
}

/** Mulai kuis baru. */
const start = asyncHandler(async (req, res) => {
  const pool = getPool();
  const body = req.body || {};

  const materialId =
    body.materialId === undefined || body.materialId === null
      ? null
      : toInt(body.materialId, "materialId", { min: 1 });

  if (materialId !== null) {
    const { rows } = await pool.query(
      "SELECT id FROM materials WHERE id = $1 AND is_published = TRUE",
      [materialId]
    );
    if (!rows.length) throw ApiError.notFound("Materi tidak ditemukan.");
  }

  const questions = await fetchSessionQuestions(pool, materialId);
  if (!questions.length) throw ApiError.badRequest("Belum ada soal untuk kuis ini.");

  req.session.quiz = { score: 0, results: {}, materialId, startedAt: Date.now() };

  res.json({ ok: true, total: questions.length, materialId });
});

/** Validasi satu jawaban siswa di server. */
const answer = asyncHandler(async (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz) throw ApiError.badRequest("Sesi kuis belum dimulai. Silakan mulai ulang.");

  const pool = getPool();
  const { questionId, choice } = req.body || {};

  const { rows } = await pool.query(
    "SELECT id, material_id, answer, fact FROM questions WHERE id = $1",
    [toInt(questionId, "questionId", { min: 1 })]
  );
  const question = rows[0];

  if (!question) throw ApiError.notFound("Soal tidak ditemukan.");
  if (quiz.materialId !== null && question.material_id !== quiz.materialId) {
    throw ApiError.badRequest("Soal ini bukan bagian dari materi yang sedang dikerjakan.");
  }

  const chosen = Number(choice);
  if (!Number.isInteger(chosen)) {
    throw ApiError.badRequest("Field choice harus berupa nomor pilihan (angka).");
  }

  const key = String(question.id);

  /* Menjawab soal yang sama dua kali mengembalikan hasil tersimpan (idempoten). */
  if (quiz.results[key]) {
    return res.json({ ...quiz.results[key], score: quiz.score });
  }

  const correct = chosen === question.answer;
  quiz.results[key] = {
    questionId: question.id,
    correct,
    correctIndex: question.answer,
    chosen,
    fact: question.fact
  };
  if (correct) quiz.score++;

  res.json({ ...quiz.results[key], score: quiz.score });
});

/** Simpan skor akhir lalu tutup sesi kuis. */
const submit = asyncHandler(async (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz) throw ApiError.badRequest("Belum ada kuis yang berjalan.");

  const pool = getPool();
  const questions = await fetchSessionQuestions(pool, quiz.materialId);
  const total = questions.length;

  const { rows } = await pool.query(
    "INSERT INTO results (material_id, score, total) VALUES ($1, $2, $3) RETURNING id, created_at",
    [quiz.materialId, quiz.score, total]
  );

  req.session.quiz = null;

  res.json({
    score: quiz.score,
    total,
    savedAt: rows[0].created_at
  });
});

/** Riwayat skor terbaru (dipakai dashboard guru). */
const results = asyncHandler(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT r.id, r.score, r.total, r.created_at, m.title AS material_title
       FROM results r
       LEFT JOIN materials m ON m.id = r.material_id
      ORDER BY r.id DESC
      LIMIT 10`
  );

  res.json({ results: rows });
});

module.exports = { start, answer, submit, results };
