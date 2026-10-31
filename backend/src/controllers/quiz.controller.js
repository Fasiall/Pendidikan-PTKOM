/* ==========================================================================
   src/controllers/quiz.controller.js — Alur kuis siswa

   Skor sementara dan urutan acak per sesi disimpan di SESSION
   (express-session) milik browser, sementara kunci jawaban tidak pernah
   dikirim ke klien.

   Endpoint:
     POST /api/quiz/start    { setId? }   -> mulai sesi (soal & opsi diacak)
     GET  /api/quiz/session               -> pulihkan sesi setelah refresh
     POST /api/quiz/answer   { questionId, choice }
     POST /api/quiz/submit   { studentName }
     GET  /api/quiz/results               -> 10 skor terakhir (dashboard guru)
     GET  /api/quiz/leaderboard
   ========================================================================== */

const { getPool } = require("../db/embedded");
const { ApiError, asyncHandler } = require("../utils/errors");
const { toInt, sanitizeStudentName } = require("../utils/validate");
const { toCsv } = require("../utils/csv");
const {
  getScheduleStatus,
  buildScheduleMessage,
  resolveDeadline
} = require("../utils/quizSchedule");

/** Fisher-Yates: mengacak array secara adil (bukan sort acak). */
function shuffleArray(items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/** Ambil soal lengkap (opsi masih berupa teks) untuk sesi kuis. */
async function fetchQuestionRows(pool, { setId, materialId }) {
  const params = [];
  let where = "";
  if (setId !== null && setId !== undefined) {
    params.push(setId);
    where = "WHERE quiz_set_id = $1";
  } else if (materialId !== null && materialId !== undefined) {
    params.push(materialId);
    where = "WHERE material_id = $1";
  }

  const { rows } = await pool.query(
    `SELECT id, subject, image, question, options
       FROM questions
       ${where}
      ORDER BY position, id`,
    params
  );
  return rows;
}

/**
 * Bentuk soal untuk siswa. Setiap opsi menjadi { id, text } dengan id =
 * indeks asli, sehingga penilaian tetap memakai kunci `questions.answer`
 * meskipun urutan huruf A/B/C/D berubah.
 */
function buildPlayerQuestions(rows, shuffle) {
  /* Fisher-Yates untuk urutan soal, lalu urutan opsi tiap soal. */
  const orderedRows = shuffle ? shuffleArray(rows) : rows;
  return orderedRows.map((row) => {
    const texts = Array.isArray(row.options) ? row.options : [];
    let options = texts.map((text, index) => ({ id: index, text: String(text) }));
    if (shuffle) options = shuffleArray(options);
    return {
      id: row.id,
      subject: row.subject || "",
      image: row.image || "",
      question: row.question,
      options
    };
  });
}

/** Mulai kuis baru (selalu membuat urutan acak baru). */
const start = asyncHandler(async (req, res) => {
  const pool = getPool();
  const body = req.body || {};

  const setId =
    body.setId === undefined || body.setId === null || body.setId === ""
      ? null
      : toInt(body.setId, "setId", { min: 1 });

  const materialId =
    body.materialId === undefined || body.materialId === null || body.materialId === ""
      ? null
      : toInt(body.materialId, "materialId", { min: 1 });

  let timeLimit = 0;
  let shuffle = true;
  let scheduleEnd = null;
  let setRow = null;

  if (setId !== null) {
    const { rows } = await pool.query(
      `SELECT id, material_id, time_limit, shuffle_questions, schedule_start, schedule_end
         FROM quiz_sets
        WHERE id = $1 AND is_published = TRUE`,
      [setId]
    );
    if (!rows.length) throw ApiError.notFound("Set soal tidak ditemukan.");

    setRow = rows[0];
    timeLimit = Number(setRow.time_limit) || 0;
    shuffle = setRow.shuffle_questions !== false;
    scheduleEnd = setRow.schedule_end || null;

    /* Jadwal diperiksa memakai jam server, bukan jam perangkat siswa. */
    const scheduleStatus = getScheduleStatus(setRow);
    if (scheduleStatus === "not_open" || scheduleStatus === "ended") {
      const error = new ApiError(403, buildScheduleMessage(setRow));
      error.code = scheduleStatus === "not_open" ? "QUIZ_NOT_OPEN" : "QUIZ_ENDED";
      throw error;
    }
  } else if (materialId !== null) {
    const { rows } = await pool.query(
      "SELECT id FROM materials WHERE id = $1 AND is_published = TRUE",
      [materialId]
    );
    if (!rows.length) throw ApiError.notFound("Materi tidak ditemukan.");
  }

  const rows = await fetchQuestionRows(pool, { setId, materialId });
  if (!rows.length) throw ApiError.badRequest("Belum ada soal untuk kuis ini.");

  const playerQuestions = buildPlayerQuestions(rows, shuffle);
  const startedAt = Date.now();
  const deadlineAt = resolveDeadline({ startedAt, timeLimit, scheduleEnd });

  req.session.quiz = {
    score: 0,
    results: {},
    setId,
    materialId,
    startedAt,
    deadlineAt,
    timeLimit,
    total: playerQuestions.length,
    questions: playerQuestions
  };

  res.json({
    ok: true,
    total: playerQuestions.length,
    setId,
    materialId,
    timeLimit,
    shuffle,
    serverNow: new Date().toISOString(),
    deadlineAt: deadlineAt === null ? null : new Date(deadlineAt).toISOString(),
    questions: playerQuestions
  });
});

/** Pulihkan sesi kuis yang sedang berjalan (dipakai setelah refresh). */
const session = asyncHandler(async (req, res) => {
  const quiz = req.session.quiz;
  const now = Date.now();

  if (!quiz) {
    return res.json({ active: false, serverNow: new Date(now).toISOString() });
  }

  const expired = quiz.deadlineAt !== null && quiz.deadlineAt !== undefined && now >= quiz.deadlineAt;

  res.json({
    active: true,
    expired,
    total: quiz.total,
    score: quiz.score,
    questions: quiz.questions,
    answers: Object.values(quiz.results || {}),
    timeLimit: quiz.timeLimit,
    setId: quiz.setId,
    materialId: quiz.materialId,
    deadlineAt: quiz.deadlineAt === null || quiz.deadlineAt === undefined
      ? null
      : new Date(quiz.deadlineAt).toISOString(),
    serverNow: new Date(now).toISOString()
  });
});

/** Validasi satu jawaban siswa di server. */
const answer = asyncHandler(async (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz) throw ApiError.badRequest("Sesi kuis belum dimulai. Silakan mulai ulang.");

  /* Waktu efektif habis (timer durasi atau jadwal) -> tolak jawaban baru. */
  if (quiz.deadlineAt !== null && quiz.deadlineAt !== undefined && Date.now() >= quiz.deadlineAt) {
    const error = new ApiError(403, "Waktu kuis sudah berakhir.");
    error.code = "TIME_UP";
    throw error;
  }

  const pool = getPool();
  const { questionId, choice } = req.body || {};
  const qid = toInt(questionId, "questionId", { min: 1 });

  /* Soal harus benar-benar bagian dari urutan sesi ini. */
  const inSession = (quiz.questions || []).some((item) => item.id === qid);
  if (!inSession) {
    throw ApiError.badRequest("Soal ini bukan bagian dari kuis yang sedang dikerjakan.");
  }

  const { rows } = await pool.query(
    "SELECT id, material_id, quiz_set_id, answer, fact, options FROM questions WHERE id = $1",
    [qid]
  );
  const question = rows[0];
  if (!question) throw ApiError.notFound("Soal tidak ditemukan.");

  /* Validasi tambahan: soal harus milik set/materi yang sedang dikerjakan. */
  if (quiz.setId !== null && question.quiz_set_id !== quiz.setId) {
    throw ApiError.badRequest("Soal ini bukan bagian dari set soal yang sedang dikerjakan.");
  } else if (quiz.setId === null && quiz.materialId !== null && question.material_id !== quiz.materialId) {
    throw ApiError.badRequest("Soal ini bukan bagian dari materi yang sedang dikerjakan.");
  }

  const chosen = Number(choice);
  const optionCount = Array.isArray(question.options) ? question.options.length : 0;
  if (!Number.isInteger(chosen) || chosen < 0 || chosen >= optionCount) {
    throw ApiError.badRequest("Field choice harus berupa ID pilihan jawaban yang valid.");
  }

  const key = String(question.id);

  /* Menjawab soal yang sama dua kali mengembalikan hasil tersimpan (idempoten). */
  if (quiz.results[key]) {
    return res.json({ ...quiz.results[key], score: quiz.score });
  }

  /* choice = ID opsi (indeks asli), bukan posisi huruf setelah diacak. */
  const correct = chosen === Number(question.answer);
  quiz.results[key] = {
    questionId: question.id,
    correct,
    correctIndex: Number(question.answer),
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
  const total = quiz.total !== undefined
    ? quiz.total
    : (quiz.questions || []).length;

  const studentName = sanitizeStudentName((req.body || {}).studentName);
  const startedAt = quiz.startedAt ? new Date(quiz.startedAt) : null;
  const finishedAt = new Date();

  const { rows } = await pool.query(
    `INSERT INTO results
       (material_id, quiz_set_id, student_name, score, total, started_at, finished_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, created_at`,
    [quiz.materialId, quiz.setId, studentName, quiz.score, total, startedAt, finishedAt]
  );

  req.session.quiz = null;

  res.json({
    score: quiz.score,
    total,
    studentName,
    savedAt: rows[0].created_at,
    startedAt: startedAt ? startedAt.toISOString() : null,
    finishedAt: finishedAt.toISOString()
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

module.exports = { start, session, answer, submit, results, leaderboard };
