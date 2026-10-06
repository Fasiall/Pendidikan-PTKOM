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
const { toInt, sanitizeStudentName } = require("../utils/validate");
const { toCsv } = require("../utils/csv");

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

  const studentName = sanitizeStudentName((req.body || {}).studentName);

  const { rows } = await pool.query(
    "INSERT INTO results (material_id, student_name, score, total) VALUES ($1, $2, $3, $4) RETURNING id, created_at",
    [quiz.materialId, studentName, quiz.score, total]
  );

  req.session.quiz = null;

  res.json({
    score: quiz.score,
    total,
    studentName,
    savedAt: rows[0].created_at
  });
});

/** Riwayat skor terbaru (dipakai dashboard guru). Mendukung ?format=csv. */
const results = asyncHandler(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT r.id, r.student_name, r.score, r.total, r.created_at, m.title AS material_title
       FROM results r
       LEFT JOIN materials m ON m.id = r.material_id
      ORDER BY r.id DESC
      LIMIT 100`
  );

  if (req.query.format === "csv") {
    const csv = toCsv(rows, [
      { header: "ID", value: (r) => r.id },
      { header: "Nama Siswa", value: (r) => r.student_name },
      { header: "Materi", value: (r) => r.material_title },
      { header: "Skor", value: (r) => r.score },
      { header: "Total", value: (r) => r.total },
      { header: "Waktu", value: (r) => r.created_at }
    ]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="hasil-kuis.csv"');
    return res.send(csv);
  }

  res.json({ results: rows.slice(0, 10) });
});

/** Papan peringkat: skor tertinggi (publik, opsional filter materialId). */
const leaderboard = asyncHandler(async (req, res) => {
  const pool = getPool();

  const materialId =
    req.query.materialId === undefined || req.query.materialId === ""
      ? null
      : toInt(req.query.materialId, "materialId", { min: 1 });

  const limitRaw = req.query.limit === undefined ? 10 : toInt(req.query.limit, "limit", { min: 1, max: 50 });

  const params = [];
  let where = "";
  if (materialId !== null) {
    params.push(materialId);
    where = "WHERE r.material_id = $1";
  }
  params.push(limitRaw);

  const { rows } = await pool.query(
    `SELECT r.student_name, r.score, r.total, r.created_at, m.title AS material_title
       FROM results r
       LEFT JOIN materials m ON m.id = r.material_id
       ${where}
      ORDER BY r.score DESC, r.total DESC, r.created_at ASC
      LIMIT $${params.length}`,
    params
  );

  res.json({ leaderboard: rows });
});

module.exports = { start, answer, submit, results, leaderboard };
