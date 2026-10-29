/* ==========================================================================
   src/controllers/quiz.controller.js -- Alur kuis siswa lewat kode

   Skor disimpan di SESSION (express-session) milik browser, dan kunci
   jawaban tidak pernah dikirim ke klien sehingga siswa tidak bisa melihat
   jawaban lewat tab developer.

   Endpoint:
     POST /api/quiz/start    { code, studentName? } -> mulai kuis
     GET  /api/quiz/session               -> lanjutkan kuis setelah refresh
     POST /api/quiz/answer   { questionId, choice }
     POST /api/quiz/submit                -> simpan skor akhir
     GET  /api/quiz/results  (guru)       -> riwayat milik guru yang login
     GET  /api/quiz/leaderboard (guru)    -> papan peringkat milik guru

   Catatan timer:
     startedAt disimpan di server (session), bukan di browser. Refresh halaman
     tidak mengulang waktu; sisa waktu dihitung dari startedAt + time_limit.
     Bila waktu habis, kuis otomatis diselesaikan saat request berikutnya.
   ========================================================================== */

const { getPool } = require("../db/embedded");
const { ApiError, asyncHandler } = require("../utils/errors");
const { toInt, sanitizeStudentName } = require("../utils/validate");
const { normalizeCode } = require("../utils/quizCode");
const { toCsv } = require("../utils/csv");

const CODE_NOT_FOUND = "Kode tidak ditemukan atau kuis belum dibuka.";

/** Cari set soal berdasarkan kode aktif yang sudah dipublish. */
async function findSetByCode(pool, code) {
  const { rows } = await pool.query(
    `SELECT qs.id, qs.title, qs.material_id, qs.time_limit, qs.teacher_id
       FROM quiz_sets qs
       JOIN materials m ON m.id = qs.material_id
      WHERE qs.access_code = $1
        AND qs.access_code_active = TRUE
        AND qs.is_published = TRUE
        AND m.is_published = TRUE`,
    [code]
  );
  return rows[0] || null;
}

/** Soal satu set (tanpa kunci jawaban). */
async function fetchSetQuestions(pool, setId) {
  const { rows } = await pool.query(
    `SELECT id, material_id, subject, image, question, options, position
       FROM questions
      WHERE quiz_set_id = $1
      ORDER BY position, id`,
    [setId]
  );
  return rows;
}

/** Sisa waktu dalam detik, atau null bila tanpa batas waktu. */
function secondsLeft(quiz) {
  if (!quiz || !quiz.timeLimit) return null;
  const elapsed = Math.floor((Date.now() - quiz.startedAt) / 1000);
  return Math.max(0, quiz.timeLimit * 60 - elapsed);
}

function isExpired(quiz) {
  const left = secondsLeft(quiz);
  return left !== null && left <= 0;
}

/** Simpan hasil akhir lalu kosongkan sesi kuis. */
async function finishQuiz(pool, req) {
  const quiz = req.session.quiz;
  if (!quiz) throw ApiError.badRequest("Belum ada kuis yang berjalan.");

  const { rows } = await pool.query(
    `INSERT INTO results
       (material_id, quiz_set_id, teacher_id, student_name, score, total, started_at, finished_at)
     VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7::double precision / 1000), now())
     RETURNING id, score, total, created_at, finished_at`,
    [
      quiz.materialId,
      quiz.setId,
      quiz.teacherId,
      quiz.studentName || "",
      quiz.score,
      quiz.total,
      quiz.startedAt
    ]
  );

  req.session.quiz = null;

  return {
    score: rows[0].score,
    total: rows[0].total,
    studentName: quiz.studentName || "",
    resultId: rows[0].id,
    savedAt: rows[0].created_at,
    finishedAt: rows[0].finished_at
  };
}

/** Mulai kuis dengan kode dari guru. */
const start = asyncHandler(async (req, res) => {
  const pool = getPool();
  const body = req.body || {};
  const code = normalizeCode(body.code);

  if (code.length !== 6) throw ApiError.notFound(CODE_NOT_FOUND);

  const set = await findSetByCode(pool, code);
  if (!set) throw ApiError.notFound(CODE_NOT_FOUND);

  const questions = await fetchSetQuestions(pool, set.id);
  if (!questions.length) throw ApiError.badRequest("Kuis ini belum punya soal.");

  const quiz = {
    setId: set.id,
    teacherId: set.teacher_id,
    materialId: set.material_id,
    timeLimit: Number(set.time_limit) || 0,
    startedAt: Date.now(),
    score: 0,
    total: questions.length,
    results: {},
    studentName: sanitizeStudentName(body.studentName)
  };

  req.session.quiz = quiz;

  res.json({
    ok: true,
    active: true,
    setId: quiz.setId,
    title: set.title,
    total: quiz.total,
    timeLimit: quiz.timeLimit,
    remainingSeconds: secondsLeft(quiz),
    score: 0,
    currentIndex: 0,
    answers: [],
    studentName: quiz.studentName,
    questions
  });
});

/** Lanjutkan kuis yang masih berjalan (dipakai setelah halaman di-refresh). */
const session = asyncHandler(async (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz) return res.json({ active: false });

  const pool = getPool();

  if (isExpired(quiz)) {
    const result = await finishQuiz(pool, req);
    return res.json({ active: false, expired: true, finished: true, result });
  }

  const questions = await fetchSetQuestions(pool, quiz.setId);
  if (!questions.length) {
    req.session.quiz = null;
    return res.json({ active: false });
  }

  const { rows: setRows } = await pool.query(
    "SELECT title FROM quiz_sets WHERE id = $1",
    [quiz.setId]
  );

  const answers = Object.values(quiz.results);
  let firstUnanswered = questions.findIndex(
    (question) => !quiz.results[String(question.id)]
  );
  if (firstUnanswered < 0) firstUnanswered = questions.length - 1;

  res.json({
    active: true,
    setId: quiz.setId,
    title: setRows.length ? setRows[0].title : "Kuis",
    total: quiz.total,
    timeLimit: quiz.timeLimit,
    remainingSeconds: secondsLeft(quiz),
    score: quiz.score,
    currentIndex: firstUnanswered,
    answers,
    studentName: quiz.studentName,
    questions
  });
});

/** Validasi satu jawaban siswa di server. */
const answer = asyncHandler(async (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz) throw ApiError.badRequest("Sesi kuis belum dimulai. Masukkan kode kuis kembali.");

  const pool = getPool();

  /* Waktu habis: kumpulkan otomatis lalu kirim hasil akhir. */
  if (isExpired(quiz)) {
    const result = await finishQuiz(pool, req);
    return res.json({ expired: true, ...result });
  }

  const { questionId, choice } = req.body || {};

  const { rows } = await pool.query(
    "SELECT id, material_id, quiz_set_id, answer, fact FROM questions WHERE id = $1",
    [toInt(questionId, "questionId", { min: 1 })]
  );
  const question = rows[0];

  if (!question) throw ApiError.notFound("Soal tidak ditemukan.");

  if (question.quiz_set_id !== quiz.setId) {
    throw ApiError.badRequest("Soal ini bukan bagian dari kuis yang sedang dikerjakan.");
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

  /* Nama boleh dikirim ulang saat submit (mis. siswa baru mengisi namanya). */
  const name = sanitizeStudentName((req.body || {}).studentName);
  if (name) quiz.studentName = name;

  const pool = getPool();
  const result = await finishQuiz(pool, req);

  res.json({ ok: true, ...result });
});

/** Riwayat skor milik guru yang login. Mendukung ?format=csv. */
const results = asyncHandler(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT r.id, r.student_name, r.score, r.total, r.created_at,
            r.started_at, r.finished_at,
            m.title AS material_title, qs.title AS set_title
       FROM results r
       LEFT JOIN materials m ON m.id = r.material_id
       LEFT JOIN quiz_sets qs ON qs.id = r.quiz_set_id
      WHERE r.teacher_id = $1
      ORDER BY r.id DESC
      LIMIT 100`,
    [req.teacher.id]
  );

  if (req.query.format === "csv") {
    const csv = toCsv(rows, [
      { header: "ID", value: (r) => r.id },
      { header: "Nama Siswa", value: (r) => r.student_name },
      { header: "Materi", value: (r) => r.material_title },
      { header: "Set Soal", value: (r) => r.set_title },
      { header: "Skor", value: (r) => r.score },
      { header: "Total", value: (r) => r.total },
      { header: "Mulai", value: (r) => r.started_at },
      { header: "Selesai", value: (r) => r.finished_at || r.created_at }
    ]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="hasil-kuis.csv"');
    return res.send(csv);
  }

  res.json({ results: rows.slice(0, 10) });
});

/** Papan peringkat milik guru yang login (tidak mencampur data guru lain). */
const leaderboard = asyncHandler(async (req, res) => {
  const pool = getPool();

  const materialId =
    req.query.materialId === undefined || req.query.materialId === ""
      ? null
      : toInt(req.query.materialId, "materialId", { min: 1 });

  const limitRaw = req.query.limit === undefined
    ? 10
    : toInt(req.query.limit, "limit", { min: 1, max: 50 });

  const params = [req.teacher.id];
  let where = "WHERE r.teacher_id = $1";
  if (materialId !== null) {
    params.push(materialId);
    where += ` AND r.material_id = $${params.length}`;
  }
  params.push(limitRaw);

  const { rows } = await pool.query(
    `SELECT r.student_name, r.score, r.total, r.created_at,
            m.title AS material_title, qs.title AS set_title
       FROM results r
       LEFT JOIN materials m ON m.id = r.material_id
       LEFT JOIN quiz_sets qs ON qs.id = r.quiz_set_id
       ${where}
      ORDER BY r.score DESC, r.total DESC, r.created_at ASC
      LIMIT $${params.length}`,
    params
  );

  res.json({ leaderboard: rows });
});

/** Statistik publik untuk halaman beranda (jumlah soal, materi, dan siswa yang telah mengerjakan kuis). */
const publicStats = asyncHandler(async (req, res) => {
  const pool = getPool();
  const [questionsRes, materialsRes, studentsRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(q.id)::int AS count
         FROM questions q
         LEFT JOIN materials m ON m.id = q.material_id
        WHERE q.material_id IS NULL OR m.is_published = TRUE`
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
         FROM materials
        WHERE is_published = TRUE`
    ),
    pool.query(
      `SELECT COUNT(DISTINCT LOWER(TRIM(student_name)))::int AS count
         FROM results
        WHERE TRIM(student_name) <> ''`
    )
  ]);

  /* Angka beranda harus selalu segar setelah ada soal/materi/hasil baru. */
  res.set("Cache-Control", "no-store");
  res.json({
    totalQuestions: questionsRes.rows[0]?.count ?? 0,
    totalMaterials: materialsRes.rows[0]?.count ?? 0,
    totalStudents: studentsRes.rows[0]?.count ?? 0
  });
});

module.exports = { start, session, answer, submit, results, leaderboard, publicStats };
