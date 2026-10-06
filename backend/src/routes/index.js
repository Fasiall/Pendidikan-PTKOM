/* ==========================================================================
   src/routes/index.js — Pusat pendaftaran seluruh route API

   Ringkasan endpoint:
     GET    /api/health                     cek status server
     POST   /api/auth/login                 login pengajar -> JWT
     GET    /api/auth/me                    profil dari token
     POST   /api/auth/logout                (stateless)

     GET    /api/materials                  daftar materi (siswa)
     GET    /api/materials/:id              detail materi (siswa)
     GET    /api/materials/manage           semua materi (guru)
     POST   /api/materials                  buat materi (guru)
     PUT    /api/materials/:id              ubah materi (guru)
     DELETE /api/materials/:id              hapus materi (guru)
     PATCH  /api/materials/:id/publish      publish/draf (guru)

     GET    /api/questions                  soal tanpa kunci (siswa)
     GET    /api/questions/manage           soal + kunci (guru)
     POST   /api/questions                  tambah soal (guru)
     PUT    /api/questions/:id              ubah soal (guru)
     DELETE /api/questions/:id              hapus soal (guru)

     POST   /api/quiz/start                 mulai sesi kuis (siswa)
     POST   /api/quiz/answer                kirim jawaban (siswa)
     POST   /api/quiz/submit                simpan skor (siswa, {studentName?})
     GET    /api/quiz/results               riwayat skor (guru, ?format=csv)
     GET    /api/quiz/leaderboard           papan peringkat publik

     GET    /api/teacher/stats              statistik dashboard (guru)
   ========================================================================== */

const express = require("express");

const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../utils/errors");

const authController = require("../controllers/auth.controller");
const materiController = require("../controllers/materi.controller");
const questionController = require("../controllers/question.controller");
const quizController = require("../controllers/quiz.controller");
const teacherController = require("../controllers/teacher.controller");

const router = express.Router();

/* ------------------------------ HEALTH ---------------------------------- */
router.get(
  "/health",
  asyncHandler(async (req, res) => {
    res.json({ ok: true, name: "kuis-petualangan-ceria-api", version: "2.0.0" });
  })
);

/* ------------------------------- AUTH ----------------------------------- */
router.post("/auth/login", authController.login);
router.get("/auth/me", authenticate(), authController.me);
router.post("/auth/logout", authController.logout);

/* Kompatibilitas dengan frontend lama (halaman Login Pengajar). */
router.post("/login", authController.login);
router.post("/logout", authController.logout);

/* ----------------------------- MATERI ----------------------------------- */
router.get("/materials", materiController.list);
router.get("/materials/manage", authenticate(), materiController.manage);
router.get("/materials/:id", materiController.detail);
router.post("/materials", authenticate(), materiController.create);
router.put("/materials/:id", authenticate(), materiController.update);
router.delete("/materials/:id", authenticate(), materiController.remove);
router.patch("/materials/:id/publish", authenticate(), materiController.publish);

/* ------------------------------ SOAL ------------------------------------ */
router.get("/questions", questionController.listPublic);
router.get("/questions/manage", authenticate(), questionController.manage);
router.post("/questions", authenticate(), questionController.create);
router.put("/questions/:id", authenticate(), questionController.update);
router.delete("/questions/:id", authenticate(), questionController.remove);

/* ------------------------------ KUIS ------------------------------------ */
router.post("/quiz/start", quizController.start);
router.post("/quiz/answer", quizController.answer);
router.post("/quiz/submit", quizController.submit);
router.get("/quiz/results", authenticate(), quizController.results);
router.get("/quiz/leaderboard", quizController.leaderboard);

/* --------------------------- DASHBOARD GURU ----------------------------- */
router.get("/teacher/stats", authenticate(), teacherController.stats);

module.exports = router;
