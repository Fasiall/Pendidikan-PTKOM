/* ==========================================================================
   db.js — Koneksi & seed database SQLite

   Menggunakan modul `node:sqlite` bawaan Node.js (>= 22),
   sehingga tidak perlu install paket database tambahan.

   Tabel:
     questions : daftar soal kuis
     users     : akun pengajar (password di-hash dengan bcrypt)
     results   : riwayat skor siswa
   ========================================================================== */

const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");
const path = require("path");
const { QUESTIONS, TEACHER } = require("./data/questions");

const DB_PATH = path.join(__dirname, "quiz.db");

/* Buka (atau buat baru) file database */
const db = new DatabaseSync(DB_PATH);

/* Buat tabel bila belum ada */
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    subject  TEXT NOT NULL,
    image    TEXT NOT NULL,
    question TEXT NOT NULL,
    options  TEXT NOT NULL,           -- JSON array pilihan jawaban
    answer   INTEGER NOT NULL,        -- index jawaban benar
    fact     TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS results (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    score      INTEGER NOT NULL,
    total      INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

/**
 * Mengisi data awal (seed) bila tabel masih kosong.
 * Aman dipanggil berulang kali setiap server start.
 */
function seed() {
  const questionCount = db.prepare("SELECT COUNT(*) AS n FROM questions").get().n;
  if (questionCount === 0) {
    const insert = db.prepare(
      "INSERT INTO questions (subject, image, question, options, answer, fact, position) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    QUESTIONS.forEach((q, index) => {
      insert.run(
        q.subject,
        q.image,
        q.question,
        JSON.stringify(q.options),
        q.answer,
        q.fact,
        index
      );
    });
    console.log("[db] " + QUESTIONS.length + " soal berhasil dimasukkan.");
  }

  const userCount = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (userCount === 0) {
    db.prepare("INSERT INTO users (username, password_hash, full_name) VALUES (?, ?, ?)").run(
      TEACHER.username,
      bcrypt.hashSync(TEACHER.password, 10),
      TEACHER.fullName
    );
    console.log('[db] Akun guru "' + TEACHER.username + '" berhasil dibuat.');
  }
}

/** Ambil semua soal. includeAnswer=false menyembunyikan kunci jawaban (untuk siswa). */
function getQuestions(includeAnswer = false) {
  const rows = db
    .prepare("SELECT * FROM questions ORDER BY position, id")
    .all();

  return rows.map((row) => {
    const item = {
      id: row.id,
      subject: row.subject,
      image: row.image,
      question: row.question,
      options: JSON.parse(row.options)
    };
    if (includeAnswer) {
      item.answer = row.answer;
      item.fact = row.fact;
    }
    return item;
  });
}

module.exports = { db, seed, getQuestions };
