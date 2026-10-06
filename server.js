/* ==========================================================================
   server.js — Backend Express untuk Kuis Petualangan Ceria

   Cara menjalankan:
     1. npm install
     2. npm start
     3. buka http://localhost:3000

   Daftar API:
     GET  /api/health          -> cek status server
     GET  /api/questions       -> daftar soal TANPA kunci jawaban
     POST /api/quiz/start      -> mulai/reset sesi kuis (skor disimpan di sesi)
     POST /api/quiz/answer     -> kirim jawaban, divalidasi oleh server
     POST /api/quiz/submit     -> simpan skor akhir ke database
     POST /api/login           -> login guru (bcrypt + sesi)
     POST /api/logout          -> keluar
     GET  /api/teacher/stats   -> statistik + daftar soal + riwayat skor (login wajib)
   ========================================================================== */

const express = require("express");
const session = require("express-session");
const path = require("path");

const { db, seed, getQuestions } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

/* Isi database bila masih kosong */
seed();

/* ========================== MIDDLEWARE DASAR ============================= */
app.use(express.json());
app.use(
  session({
    name: "kuis.sid",
    secret: process.env.SESSION_SECRET || "rahasia-kuis-sd",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,   // cookie tidak bisa dibaca dari JavaScript
      sameSite: "lax",  // proteksi CSRF ringan
      maxAge: 1000 * 60 * 60 * 2 // 2 jam
    }
  })
);

/* Cegah akses langsung ke file internal (server, db, data, node_modules) */
app.use((req, res, next) => {
  const file = req.path.replace(/^\/+/, "");
  const blocked = ["server.js", "db.js", "package.json", "package-lock.json",
                   "quiz.db", ".env", "data", "node_modules"];
  if (blocked.some((b) => file === b || file.startsWith(b + "/"))) {
    return res.status(404).end();
  }
  next();
});

/* Sajikan file frontend (index.html, style.css, script.js) */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.use(express.static(__dirname, { index: false, dotfiles: "ignore" }));

/* ========================= MIDDLEWARE AUTH =============================== */
/** Hanya izinkan request dari guru yang sudah login. */
function requireAuth(req, res, next) {
  if (req.session.teacher) return next();
  res.status(401).json({ error: "Silakan login terlebih dahulu." });
}

/* ============================ API PUBLIK ================================ */

/* Cek status server (dipakai frontend untuk mengecek koneksi) */
app.get("/api/health", (req, res) => {
  res.json({ ok: true, name: "kuis-petualangan-ceria" });
});

/* Daftar soal untuk siswa — kunci jawaban TIDAK dikirim */
app.get("/api/questions", (req, res) => {
  res.json(getQuestions(false));
});

/* Mulai kuis baru: reset skor & jawaban di sesi server */
app.post("/api/quiz/start", (req, res) => {
  req.session.quiz = { score: 0, results: {} };
  res.json({ ok: true, total: getQuestions(false).length });
});

/* Terima jawaban siswa, DIVALIDASI oleh server (bukan oleh browser) */
app.post("/api/quiz/answer", (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz) {
    return res.status(400).json({ error: "Sesi kuis belum dimulai. Silakan mulai ulang." });
  }

  const { questionId, choice } = req.body || {};
  const question = db
    .prepare("SELECT * FROM questions WHERE id = ?")
    .get(Number(questionId));

  if (!question) return res.status(404).json({ error: "Soal tidak ditemukan." });
  if (typeof choice !== "number") {
    return res.status(400).json({ error: "Pilihan jawaban tidak valid." });
  }

  const key = String(question.id);

  /* Bila sudah pernah dijawab, kembalikan hasil tersimpan (idempoten) */
  if (quiz.results[key]) {
    return res.json({ ...quiz.results[key], score: quiz.score });
  }

  const correct = choice === question.answer;
  quiz.results[key] = {
    questionId: question.id,
    correct,
    correctIndex: question.answer,
    chosen: choice,
    fact: question.fact
  };
  if (correct) quiz.score++;

  res.json({ ...quiz.results[key], score: quiz.score });
});

/* Simpan skor akhir ke tabel results lalu tutup sesi kuis */
app.post("/api/quiz/submit", (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz) {
    return res.status(400).json({ error: "Belum ada kuis yang berjalan." });
  }

  const total = getQuestions(false).length;
  db.prepare("INSERT INTO results (score, total) VALUES (?, ?)").run(quiz.score, total);
  const saved = db.prepare("SELECT * FROM results ORDER BY id DESC LIMIT 1").get();

  req.session.quiz = null;
  res.json({ score: quiz.score, total, savedAt: saved.created_at });
});

/* ============================= API LOGIN ================================ */

app.post("/api/login", (req, res) => {
  const username = String((req.body || {}).username || "").trim();
  const password = String((req.body || {}).password || "");

  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password wajib diisi!" });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  const bcrypt = require("bcryptjs");
  const valid = user && bcrypt.compareSync(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({ error: "Ups! Username atau password salah 😅" });
  }

  req.session.teacher = {
    id: user.id,
    username: user.username,
    fullName: user.full_name
  };
  res.json({ ok: true, fullName: user.full_name });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

/* ========================== API GURU (LOGIN) ============================ */

app.get("/api/teacher/stats", requireAuth, (req, res) => {
  const questions = getQuestions(false);
  const topics = new Set(questions.map((q) => q.subject)).size;

  const lastResult = db
    .prepare("SELECT * FROM results ORDER BY id DESC LIMIT 1")
    .get();
  const results = db
    .prepare("SELECT * FROM results ORDER BY id DESC LIMIT 10")
    .all();

  res.json({
    teacher: req.session.teacher,
    totalQuestions: questions.length,
    topics,
    lastScore: lastResult ? lastResult.score + "/" + lastResult.total : null,
    questions,
    results
  });
});

/* ============================ JALANKAN ================================== */
app.listen(PORT, () => {
  console.log("🚀 Server kuis berjalan di http://localhost:" + PORT);
});
