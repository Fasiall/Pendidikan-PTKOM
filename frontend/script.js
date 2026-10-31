/* ==========================================================================
   script.js — Kuis Petualangan Ceria (sisi klien / frontend)

   Frontend ini memanggil backend REST API (Express + PostgreSQL):
     GET  /api/questions             -> daftar soal (tanpa kunci jawaban)
     POST /api/quiz/start            -> mulai sesi kuis
     POST /api/quiz/answer           -> kirim jawaban (divalidasi server)
     POST /api/quiz/submit           -> simpan skor akhir
     POST /api/auth/login            -> login guru, menerima token JWT
     POST /api/auth/register         -> daftar akun baru
     GET  /api/teacher/stats         -> dashboard admin (header Bearer)
     GET  /api/materials             -> daftar materi belajar (halaman materi.html)

   Susunan file:
   (1)  Referensi elemen DOM
   (2)  Status / variabel global
   (3)  Helper API + notifikasi (toast)
   (4)  Navigasi antar halaman
   (5)  Hiasan: judul meloncat + dekorasi latar
   (6)  Logika kuis (render soal, jawaban, lanjut)
   (7)  Animasi: konfeti, flash layar, skor berjalan
   (8)  Halaman hasil (bintang + pesan motivasi)
   (9)  Login & dashboard guru
   (10) Registrasi & login guru
   (11) Inisialisasi program
   ========================================================================== */

/* =============== (1) REFERENSI ELEMEN DOM ============================== */
const $ = (sel) => document.querySelector(sel);

const decorLayer    = $("#decorLayer");
const confettiLayer = $("#confettiLayer");
const fxFlash       = $("#fxFlash");
const fxEmoji       = $("#fxEmoji");
const toastBox      = $("#toast");

const questionCard  = $("#questionCard");
const progressFill  = $("#progressFill");
const progressText  = $("#progressText");
const scoreChip     = $("#scoreChip");
const qSubject      = $("#qSubject");
const qImage        = $("#qImage");
const qText         = $("#qText");
const answersBox    = $("#answers");
const feedbackBox   = $("#feedback");
const btnNext       = $("#btnNext");

const starRow       = $("#starRow");
const scoreNumber   = $("#scoreNumber");
const scoreTotal    = $("#scoreTotal");
const resultEmoji   = $("#resultEmoji");
const resultTitle   = $("#resultTitle");
const motivationBox = $("#motivation");

const loginForm     = $("#loginForm");
const usernameInput = $("#username");
const passwordInput = $("#password");
const togglePass    = $("#togglePass");
const loginError    = $("#loginError");

const registerForm  = $("#registerForm");
const regUsernameInput = $("#regUsername");
const regEmailInput = $("#regEmail");
const regPasswordInput = $("#regPassword");
const regConfirmPasswordInput = $("#regConfirmPassword");
const regTogglePass   = $("#toggleRegPass");
const registerError   = $("#registerError");

const questionList  = $("#questionList");
const resultsList   = $("#resultsList");
const statMaterials = $("#statMaterials");
const statTotal     = $("#statTotal");
const statAvgScore  = $("#statAvgScore");
const quizCodeInput = $("#quizCode");
const mVisibility   = $("#mVisibility");
const sSetVisibility = $("#sSetVisibility");

/* Elemen form admin (kelola materi & soal) */
const materiForm      = $("#materiForm");
const materiFormTitle = $("#materiFormTitle");
const materiError     = $("#materiError");
const mTitle          = $("#mTitle");
const mSummary        = $("#mSummary");
const mSubject        = $("#mSubject");
const mEmoji          = $("#mEmoji");
const mImage          = $("#mImage");
const mContent        = $("#mContent");
const mPublish        = $("#mPublish");
const btnCancelMateri = $("#btnCancelMateri");
const materiAdminList = $("#materiAdminList");
const materiCount     = $("#materiCount");

const soalForm      = $("#soalForm");
const soalFormTitle = $("#soalFormTitle");
const soalError     = $("#soalError");
const qQuestion     = $("#qQuestion");
const qOptions      = $("#qOptions");
const qAnswer       = $("#qAnswer");
const adEmoji       = $("#adEmoji");
const adSubject     = $("#adSubject");
const qMaterial     = $("#qMaterial");
const qFact         = $("#qFact");
const qSet          = $("#qSet");
const btnCancelSoal = $("#btnCancelSoal");
const soalAdminList = $("#soalAdminList");
const soalCount     = $("#soalCount");

/* Elemen form admin set soal */
const setForm       = $("#setForm");
const setFormTitle  = $("#setFormTitle");
const setError      = $("#setError");
const sSetMaterial  = $("#sSetMaterial");
const sSetTitle     = $("#sSetTitle");
const sSetDesc      = $("#sSetDesc");
const sSetTime      = $("#sSetTime");
const sSetPublish   = $("#sSetPublish");
const btnCancelSet  = $("#btnCancelSet");
const setAdminList  = $("#setAdminList");
const setCount      = $("#setCount");

/* =============== (2) STATUS / VARIABEL GLOBAL =========================== */
let questions   = [];   // daftar soal dari server (tanpa kunci jawaban)
let currentIndex = 0;   // nomor soal yang sedang tampil (mulai dari 0)
let score       = 0;    // jumlah jawaban benar (dikembalikan server)
let isAnswered  = false;// soal ini sudah dijawab atau belum
let lastScore   = null; // skor terakhir (untuk dashboard guru)
let fxTimer     = null; // timer menyembunyikan flash layar
let toastTimer  = null; // timer menyembunyikan notifikasi
let timerInterval = null; // interval timer kuis
let timeRemaining = 0;    // sisa waktu dalam detik
let answered      = {};   // jawaban yang sudah dikirim: { [questionId]: hasil }
let isSubmitting  = false;// cegah submit ganda
let quizSetInfo   = null; // info set soal yang sedang dikerjakan

/* Status form admin: daftar materi + id yang sedang diedit (null = mode tambah) */
let materiList      = [];
let setList         = [];
let editingMateriId = null;
let editingSetId    = null;
let editingSoalId   = null;

/* =============== (3) HELPER API + TOAST ================================ */

/* Token JWT pengajar disimpan di localStorage setelah login berhasil. */
const TOKEN_KEY = "kuis.token";

/* Bila dibuka lewat Live Server (port 5500) / file://, arahkan API ke backend.
   Pakai 127.0.0.1 agar masih dianggap same-site, jadi cookie sesi kuis terkirim. */
const API_BASE =
  location.port === "5500" || location.protocol === "file:"
    ? "http://127.0.0.1:3000"
    : "";

const getToken = () => localStorage.getItem(TOKEN_KEY);
const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/**
 * Pembungkus fetch: otomatis parsing JSON, menyertakan token JWT
 * (Authorization: Bearer) bila sudah login, dan melempar error
 * bila status respons bukan 2xx (err.status berisi kode HTTP).
 */
async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;

  const res = await fetch(API_BASE + path, {
    credentials: "include",
    ...options,
    headers
  });

  let data = null;
  try { data = await res.json(); } catch (_) { /* respons bukan JSON */ }
  if (!res.ok) {
    const error = new Error((data && data.error) || "Permintaan gagal.");
    error.status = res.status;
    throw error;
  }
  return data;
}

/** Notifikasi melayang di bawah layar (untuk pesan error/Info). */
function showToast(message) {
  toastBox.textContent = message;
  toastBox.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastBox.classList.remove("show"), 4000);
}

/* =============== (4) NAVIGASI ANTAR HALAMAN ============================= */

/**
 * Menampilkan satu halaman, menyembunyikan halaman lain.
 * Semua halaman memakai class .page; halaman aktif memakai .active.
 */
function showPage(pageId) {
  if (pageId !== "page-quiz") {
    clearInterval(timerInterval);
  }
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (pageId === "page-home") {
    loadHomeStats();
  }
}

/* Navigasi universal: elemen dengan data-page="id-halaman" berpindah halaman. */
document.addEventListener("click", async (event) => {
  const trigger = event.target.closest("[data-page]");
  if (trigger) {
    const pageId = trigger.dataset.page;
    if (pageId === "page-login" && getToken()) {
      try {
        await renderDashboard();
        showPage("page-dashboard");
      } catch (err) {
        clearToken();
        showPage("page-login");
      }
    } else {
      showPage(pageId);
    }
  }
});

/* =============== (5) HIASAN: JUDUL & LATAR ============================= */

/** Memecah judul menjadi per huruf agar bisa dianimasi satu per satu. */
function splitTitle() {
  const titleEl = $("#mainTitle");
  if (!titleEl) return;

  const text = titleEl.textContent.trim();
  /* Warna per kata agar judul terasa ceria tanpa terlalu ramai. */
  const wordColors = ["#5636e0", "#2b2a4a", "#ff5d8f"];
  titleEl.textContent = "";

  /* Setiap kata dibungkus agar judul tidak pernah terpotong di tengah kata. */
  const words = text.split(" ");
  let charIndex = 0;
  words.forEach((word, wordIndex) => {
    const wordEl = document.createElement("span");
    wordEl.className = "t-word";
    wordEl.style.color = wordColors[Math.min(wordIndex, wordColors.length - 1)];

    [...word].forEach((char) => {
      const span = document.createElement("span");
      span.className = "t-letter";
      span.textContent = char;
      span.style.animationDelay = (charIndex * 0.03) + "s";
      charIndex++;
      wordEl.appendChild(span);
    });

    titleEl.appendChild(wordEl);
    if (wordIndex < words.length - 1) {
      titleEl.appendChild(document.createTextNode(" "));
    }
  });
}

/** Membuat emoji melayang di latar belakang (posisi acak tapi seragam). */
function createDecorations() {
  /* Dekorasi emoji lama tidak dipakai lagi. */
  if (!decorLayer) return;
}

/** Memuat statistik beranda (Soal Tersedia, Mata Pelajaran/Materi, Siswa Aktif). */
async function loadHomeStats() {
  const elQuestions = $("#homeStatQuestions");
  const elMaterials = $("#homeStatMaterials");
  const elStudents  = $("#homeStatStudents");
  if (!elQuestions && !elMaterials && !elStudents) return;

  try {
    const data = await api("/api/stats");
    const totalQuestions = Number(data.totalQuestions) || 0;
    const totalMaterials = Number(data.totalMaterials) || 0;
    const totalStudents  = Number(data.totalStudents) || 0;

    if (elQuestions) {
      elQuestions.dataset.count = totalQuestions;
      elQuestions.textContent = totalQuestions;
    }
    if (elMaterials) {
      elMaterials.dataset.count = totalMaterials;
      elMaterials.textContent = totalMaterials;
    }
    if (elStudents) {
      elStudents.dataset.count = totalStudents;
      elStudents.textContent = totalStudents;
    }
  } catch (_) {
    /* abaikan jika server belum menyala */
  }
}

function createDecorations_unused() {
  /* Dekorasi emoji lama tidak dipakai lagi. */
  if (!decorLayer) return;
}

/* =============== (6) LOGIKA KUIS ======================================= */

/**
 * Memulai kuis: minta sesi baru ke server dan ambil daftar soal.
 * Prioritas parameter URL:
 *   ?set=ID   → hanya soal dari set soal tertentu
 *   ?materi=ID → hanya soal dari materi itu (backward compatible)
 * Bila tidak ada parameter, semua soal dimuat.
 */
async function startQuiz(event) {
  if (event && typeof event.preventDefault === "function") event.preventDefault();

  const btnStart = $("#btnStart");
  const labelBefore = btnStart ? btnStart.textContent : "";
  const params = new URLSearchParams(location.search);

  const rawCode = quizCodeInput
    ? quizCodeInput.value
    : params.get("code") || sessionStorage.getItem("kuis.code") || "";
  const code = String(rawCode).trim().toUpperCase();

  /* Kode wajib: siswa hanya bisa masuk kuis lewat kode dari guru. */
  if (!code) {
    showToast("Masukkan kode kuis dari gurumu dulu, ya.");
    if (quizCodeInput) quizCodeInput.focus();
    return;
  }
  if (code.length !== 6) {
    showToast("Kode kuis terdiri dari 6 karakter.");
    if (quizCodeInput) quizCodeInput.focus();
    return;
  }

  if (btnStart) {
    btnStart.disabled = true;
    btnStart.textContent = "Menyiapkan kuis...";
  }

  try {
    const nameInput = document.getElementById("studentName");
    const data = await api("/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({
        code,
        studentName: nameInput ? nameInput.value.trim() : ""
      })
    });

    sessionStorage.setItem("kuis.code", code);
    if (quizCodeInput) quizCodeInput.value = code;
    applyQuizData(data);
  } catch (err) {
    showToast(err.message || "Kode tidak ditemukan atau kuis belum dibuka.");
  } finally {
    if (btnStart) {
      btnStart.disabled = false;
      btnStart.textContent = labelBefore;
    }
  }
}

/** Tampilkan kuis dari data server (mulai baru atau lanjut setelah refresh). */
function applyQuizData(data) {
  questions = Array.isArray(data.questions) ? data.questions : [];
  if (!questions.length) {
    showToast("Kuis ini belum punya soal.");
    return;
  }

  quizSetInfo = {
    setId: data.setId || null,
    title: data.title || "Kuis",
    timeLimit: Number(data.timeLimit) || 0,
    total: Number(data.total) || questions.length
  };

  answered = {};
  (data.answers || []).forEach(function (item) {
    if (item && item.questionId !== undefined) {
      answered[String(item.questionId)] = item;
    }
  });

  score = Number(data.score) || 0;
  currentIndex = Math.min(Math.max(Number(data.currentIndex) || 0, 0), questions.length - 1);
  isSubmitting = false;
  isAnswered = false;

  showPage("page-quiz");
  renderQuestion();

  if (quizSetInfo.timeLimit > 0) {
    var remaining =
      data.remainingSeconds === null || data.remainingSeconds === undefined
        ? quizSetInfo.timeLimit * 60
        : Number(data.remainingSeconds);
    startQuizTimer(remaining);
  } else {
    stopQuizTimer();
  }
}

/** Timer besar; saat habis jawaban otomatis dikumpulkan. */
function startQuizTimer(seconds) {
  var timerEl = $("#quizTimer");
  timeRemaining = Math.max(0, Math.floor(seconds));

  if (timerEl) {
    timerEl.classList.remove("hidden", "warning");
    updateTimerDisplay();
  }

  clearInterval(timerInterval);
  if (timeRemaining <= 0) {
    submitQuiz(true);
    return;
  }

  timerInterval = setInterval(function () {
    timeRemaining -= 1;
    updateTimerDisplay();
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      showToast("Waktu habis. Jawabanmu dikumpulkan otomatis.");
      submitQuiz(true);
    }
  }, 1000);
}

function stopQuizTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  var timerEl = $("#quizTimer");
  if (timerEl) {
    timerEl.classList.add("hidden");
    timerEl.classList.remove("warning");
  }
}

/** Memperbarui tampilan timer kuis (MM:SS, merah saat < 1 menit). */
function updateTimerDisplay() {
  const quizTimer = $("#quizTimer");
  if (!quizTimer) return;
  const safe = Math.max(0, timeRemaining);
  const m = Math.floor(safe / 60).toString().padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  quizTimer.textContent = m + ":" + s;
  quizTimer.classList.toggle("warning", safe <= 60);
}

/** Menampilkan soal sesuai currentIndex ke dalam kartu pertanyaan. */
function renderQuestion() {
  const q = questions[currentIndex];
  const saved = answered[String(q.id)];
  isAnswered = Boolean(saved);

  /* Perbarui progress bar & chip skor */
  progressFill.style.width = ((currentIndex + 1) / questions.length * 100) + "%";
  progressText.textContent = (currentIndex + 1) + "/" + questions.length;
  scoreChip.textContent = score + " poin";

  /* Isi konten kartu */
  qSubject.textContent = q.subject || (quizSetInfo ? quizSetInfo.title : "Kuis");
  qImage.textContent = q.image;
  qText.textContent = q.question;
  feedbackBox.textContent = "";
  feedbackBox.className = "feedback";
  btnNext.classList.add("hidden");

  /* Hancurkan & bangun ulang animasi masuknya kartu */
  questionCard.classList.remove("card-in");
  void questionCard.offsetWidth;
  questionCard.classList.add("card-in");

  /* Buat tombol opsi jawaban */
  answersBox.innerHTML = "";
  const keys = ["A", "B", "C", "D"];
  q.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answer-btn";
    btn.innerHTML =
      '<span class="answer-key">' + keys[index] + "</span>" +
      "<span>" + option + "</span>";
    btn.addEventListener("click", () => chooseAnswer(index));
    answersBox.appendChild(btn);
  });

  /* Soal yang sudah dijawab sebelum refresh: tampilkan hasil tersimpan */
  if (saved) {
    const buttons = answersBox.querySelectorAll(".answer-btn");
    buttons.forEach((btn) => (btn.disabled = true));
    buttons.forEach((btn, index) => {
      if (index === saved.chosen && !saved.correct) btn.classList.add("wrong");
      if (index === saved.correctIndex) btn.classList.add("correct");
    });
    feedbackBox.className = "feedback " + (saved.correct ? "ok" : "no");
    feedbackBox.innerHTML = saved.correct
      ? "<b>Tepat.</b> " + (saved.fact || "")
      : "<b>Belum tepat.</b> Jawaban yang benar: <b>" +
        q.options[saved.correctIndex] + "</b>. " + (saved.fact || "");
    showNextButton();
  }
}

/** Tombol lanjut / selesai setelah soal dijawab. */
function showNextButton() {
  btnNext.textContent = currentIndex === questions.length - 1 ? "Selesai" : "Lanjut";
  btnNext.classList.remove("hidden");
}

/**
 * Mengirim jawaban ke server untuk divalidasi.
 * Benar  -> hijau + konfeti + kilatan layar.
 * Salah  -> getar (shake) merah muda + kunci jawaban ditampilkan.
 */
async function chooseAnswer(selectedIndex) {
  if (isAnswered) return;
  isAnswered = true;

  const q = questions[currentIndex];
  const buttons = answersBox.querySelectorAll(".answer-btn");
  buttons.forEach((btn) => (btn.disabled = true));

  let result;
  try {
    result = await api("/api/quiz/answer", {
      method: "POST",
      body: JSON.stringify({ questionId: q.id, choice: selectedIndex })
    });
  } catch (err) {
    isAnswered = false;
    buttons.forEach((btn) => (btn.disabled = false));
    showToast(err.status === 400 ? err.message : "Gagal mengirim jawaban, coba lagi.");
    return;
  }

  /* Waktu habis di server: hasil langsung disimpan & ditampilkan. */
  if (result.expired) {
    isSubmitting = false;
    sessionStorage.removeItem("kuis.code");
    stopQuizTimer();
    renderResult(result.score, result.total);
    return;
  }

  score = result.score;
  answered[String(q.id)] = result;

  if (result.correct) {
    buttons[selectedIndex].classList.add("correct");
    feedbackBox.className = "feedback ok";
    feedbackBox.innerHTML = "<b>Tepat.</b> " + result.fact;
    flashFx("ok");
    burstConfetti(45);
  } else {
    buttons[selectedIndex].classList.add("wrong");
    buttons[result.correctIndex].classList.add("correct");
    feedbackBox.className = "feedback no";
    feedbackBox.innerHTML =
      "<b>Belum tepat.</b> Jawaban yang benar: <b>" +
      q.options[result.correctIndex] + "</b>. " + result.fact;
    flashFx("no");
  }

  scoreChip.textContent = score + " poin";
  showNextButton();

  const rect = feedbackBox.getBoundingClientRect();
  if (rect.bottom > window.innerHeight) {
    feedbackBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/** Beralih ke soal berikutnya, atau langsung menyimpan skor di soal terakhir. */
function nextQuestion() {
  if (!isAnswered) return;
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    showResult();
  }
}

/* =============== (7) ANIMASI: KONFETI, FLASH, ANGKA ==================== */

/** Menaburkan konfeti berwarna-warni dari atas layar. */
function burstConfetti(amount = 45) {
  const colors = ["#ff6b6b", "#ffc93c", "#35c97a", "#57a8ff", "#7b5cff", "#ff7ab6", "#2ec8b0"];
  for (let i = 0; i < amount; i++) {
    const piece = document.createElement("i");
    piece.className = "confetti";
    const size = 8 + Math.random() * 10;
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.width = size + "px";
    piece.style.height = size * (Math.random() > 0.5 ? 1 : 1.9) + "px";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "3px";
    piece.style.animationDuration = (1.6 + Math.random() * 1.4) + "s";
    piece.style.animationDelay = (Math.random() * 0.5) + "s";
    confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), 3600);
  }
}

/** Kilatan layar: hijau (benar) / merah muda (salah) dengan emoji besar. */
function flashFx(type) {
  fxEmoji.textContent = type === "ok" ? "✓" : "!";
  fxFlash.className = "fx-flash show " + (type === "ok" ? "ok" : "no");
  clearTimeout(fxTimer);
  fxTimer = setTimeout(() => {
    fxFlash.className = "fx-flash";
  }, 900);
}

/** Menganimasikan angka berjalan dari 0 menuju nilai akhir. */
function animateNumber(element, targetValue, duration = 1200) {
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    element.textContent = Math.round(progress * targetValue);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* =============== (8) HALAMAN HASIL ==================================== */

/**
 * Mengirim skor akhir ke server lalu LANGSUNG menampilkan halaman skor.
 * Tidak ada tombol "Lihat Skor" perantara.
 */
async function showResult(options) {
  if (isSubmitting) return;
  isSubmitting = true;

  const timedOut = options === true || Boolean(options && options.timedOut);
  stopQuizTimer();

  let finalScore = score;
  let total = questions.length;

  try {
    const nameInput = document.getElementById("studentName");
    const studentName = nameInput ? nameInput.value.trim() : "";
    const data = await api("/api/quiz/submit", {
      method: "POST",
      body: JSON.stringify({ studentName })
    });
    finalScore = data.score;
    total = data.total;
    lastScore = finalScore;
  } catch (err) {
    lastScore = finalScore;
    showToast(
      timedOut
        ? "Waktu habis. Skor ditampilkan, tetapi gagal tersimpan di server."
        : "Skor tampil, tetapi gagal tersimpan di server."
    );
  }

  score = finalScore;
  sessionStorage.removeItem("kuis.code");
  renderResult(finalScore, total);
  loadHomeStats();
  isSubmitting = false;
}

/** Dipakai timer: kumpulkan jawaban otomatis saat waktu habis. */
function submitQuiz(timedOut) {
  return showResult({ timedOut: Boolean(timedOut) });
}

/** Lanjutkan kuis setelah halaman di-refresh (timer dihitung dari server). */
async function restoreQuizSession() {
  try {
    const data = await api("/api/quiz/session");
    if (data && data.active) {
      applyQuizData(data);
      showToast("Melanjutkan kuis. Waktumu tetap berjalan.");
    } else if (data && data.expired && data.result) {
      renderResult(data.result.score, data.result.total);
    }
  } catch (_) {
    /* tidak ada sesi aktif */
  }
}

/** Merender tampilan halaman hasil. */
function renderResult(finalScore, total) {
  showPage("page-result");

  const ratio = total ? finalScore / total : 0;

  /* Emoji, judul, dan pesan motivasi berdasarkan rasio keberhasilan */
  let emoji, title, message;
  if (ratio === 1) {
    emoji = ""; title = "Sempurna!";
    message = "Semua jawaban benar. Kamu juara!";
  } else if (ratio >= 0.75) {
    emoji = ""; title = "Hebat sekali!";
    message = "Hebat! Terus belajar ya.";
  } else if (ratio >= 0.5) {
    emoji = ""; title = "Kerja bagus!";
    message = "Bagus! Sedikit lagi sempurna. Semangat!";
  } else {
    emoji = ""; title = "Jangan menyerah!";
    message = "Terus belajar ya, pasti bisa! Ayo coba lagi!";
  }
  resultEmoji.textContent = emoji;
  resultTitle.textContent = title;
  motivationBox.textContent = message;

  /* Rating bintang (maksimal 3) — muncul satu per satu */
  const earned = ratio === 1 ? 3 : Math.max(1, Math.round(ratio * 3));
  starRow.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const star = document.createElement("span");
    star.className = "star" + (i < earned ? " earned" : "");
    star.textContent = "★";
    if (i < earned) star.style.animationDelay = (0.25 + i * 0.35) + "s";
    starRow.appendChild(star);
  }

  /* Skor berjalan + lingkaran skor berwarna sesuai hasil */
  scoreTotal.textContent = "benar dari " + total;
  scoreNumber.textContent = "0";
  animateNumber(scoreNumber, finalScore, 1400);

  const circle = document.querySelector(".score-circle");
  if (circle) circle.style.background = "";

  /* Rayakan dengan konfeti */
  setTimeout(() => burstConfetti(ratio >= 0.75 ? 70 : 35), 350);
}

/* =============== (9) LOGIN & DASHBOARD GURU =========================== */

/** Validasi login ke server: benar -> dashboard, salah -> efek getar. */
async function handleLogin(event) {
  event.preventDefault();

  const usernameOrEmail = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!usernameOrEmail || !password) {
    showLoginError("Username/email dan password wajib diisi!");
    shakeForm(loginForm);
    return;
  }

  try {
    /* Login ke API: server memverifikasi bcrypt lalu mengirim token JWT */
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ usernameOrEmail, password })
    });
    saveToken(data.token);

    loginError.classList.remove("show");
    loginError.textContent = "";
    loginForm.reset();
    await renderDashboard();
    showPage("page-dashboard");
  } catch (err) {
    showLoginError(err.message || "Login gagal, coba lagi.");
    shakeForm(loginForm);
  }
}

/** Menampilkan pesan error validasi login. */
function showLoginError(message) {
  loginError.textContent = message;
  loginError.classList.add("show");
}

/** Validasi registrasi ke server: benar -> login, salah -> efek getar. */
async function handleRegister(event) {
  event.preventDefault();

  const username = regUsernameInput.value.trim();
  const email = regEmailInput.value.trim();
  const password = regPasswordInput.value;
  const confirmPassword = regConfirmPasswordInput.value;

  if (!username || !email || !password || !confirmPassword) {
    showRegisterError("Semua field wajib diisi!");
    shakeForm(registerForm);
    return;
  }

  if (password !== confirmPassword) {
    showRegisterError("Password dan konfirmasi password tidak cocok");
    shakeForm(registerForm);
    return;
  }

  // Validasi format email sederhana
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    showRegisterError("Format email tidak valid");
    shakeForm(registerForm);
    return;
  }

  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        confirmPassword,
        email
      })
    });
    
    // Simpan token agar langsung login
    saveToken(data.token);
    
    const namaGuru = data.teacher?.fullName || data.teacher?.username || username;
    showToast("Registrasi berhasil. Selamat datang, " + namaGuru + "!");
    registerForm.reset();
    registerError.classList.remove("show");

    const pageDashboard = document.getElementById("page-dashboard");
    if (pageDashboard) {
      await renderDashboard();
      showPage("page-dashboard");
    } else {
      setTimeout(() => {
        window.location.href = "index.html#dashboard";
      }, 1200);
    }
  } catch (err) {
    showRegisterError(err.message || "Registrasi gagal, coba lagi.");
    shakeForm(registerForm);
  }
}

/** Berpindah tab antara login dan daftar akun baru pada halaman auth guru */
function switchAuthTab(mode) {
  const tabLogin = $("#tabBtnLogin");
  const tabRegister = $("#tabBtnRegister");
  const formLogin = $("#loginForm");
  const formRegister = $("#registerForm");
  const avatar = $("#authAvatar");

  if (!tabLogin || !tabRegister || !formLogin || !formRegister) return;

  if (loginError) loginError.classList.remove("show");
  if (registerError) registerError.classList.remove("show");

  if (mode === "register") {
    tabLogin.classList.remove("active");
    tabLogin.setAttribute("aria-selected", "false");
    tabRegister.classList.add("active");
    tabRegister.setAttribute("aria-selected", "true");
    formLogin.style.display = "none";
    formRegister.style.display = "block";
    if (avatar) avatar.textContent = "";
  } else {
    tabRegister.classList.remove("active");
    tabRegister.setAttribute("aria-selected", "false");
    tabLogin.classList.add("active");
    tabLogin.setAttribute("aria-selected", "true");
    formRegister.style.display = "none";
    formLogin.style.display = "block";
    if (avatar) avatar.textContent = "";
  }
}

/** Menampilkan pesan error validasi registrasi. */
function showRegisterError(message) {
  registerError.textContent = message;
  registerError.classList.add("show");
}

/** Mengguncang form saat validasi gagal (efek shake). */
function shakeForm(element) {
  element.style.animation = "none";
  void element.offsetWidth; // reflow
  element.style.animation = "shakeX .55s ease both";
}

/** Mengisi dashboard guru: statistik, daftar soal, dan riwayat skor. */
async function renderDashboard() {
  try {
    /* Ambil profil guru yang login untuk menyapa di header dashboard */
    try {
      const meData = await api("/api/auth/me");
      const teacherNameEl = $("#dashTeacherName");
      if (teacherNameEl && meData && meData.teacher) {
        teacherNameEl.textContent = meData.teacher.fullName || meData.teacher.username || "Guru";
      }
    } catch (_) { /* abaikan jika gagal memuat profil */ }

    const data = await api("/api/teacher/stats");

    statMaterials.textContent = data.totalMaterials ?? 0;
    statTotal.textContent = data.totalQuestions;
    statAvgScore.textContent = data.averageScore ? data.averageScore.label : "-";

    /* Daftar soal */
    questionList.innerHTML = "";
    data.questions.forEach((q, index) => {
      const li = document.createElement("li");
      li.style.animationDelay = (index * 0.06) + "s";
      li.innerHTML =
        '<span class="ql-num">' + (index + 1) + "</span>" +
        "<div><span class=\"ql-subj\">" + q.subject + "</span>" +
        '<p class="ql-text">' + q.question + "</p></div>";
      questionList.appendChild(li);
    });

    /* Riwayat skor siswa (10 terakhir) */
    resultsList.innerHTML = "";
    if (!data.results.length) {
      resultsList.innerHTML =
        '<li class="empty-note">Belum ada skor yang tersimpan. Ajak siswa bermain.</li>';
    } else {
      data.results.forEach((r, index) => {
        const li = document.createElement("li");
        li.style.animationDelay = (index * 0.06) + "s";
        const waktu = new Date(r.created_at).toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          weekday: "long", day: "numeric", month: "long", year: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit"
        }) + " WIB";
        li.innerHTML =
          '<span class="ql-num">' + (index + 1) + '</span>' +
          "<div><strong>" + (r.student_name || "Siswa") + " — " + r.score + "/" + r.total + " benar</strong>" +
          '<p class="ql-text">' +
            (r.set_title || r.material_title || "Kuis") + " • " +
            (r.score || 0) + "/" + (r.total || 0) + " • " + waktu +
          "</p></div>";
        resultsList.appendChild(li);
      });
    }

    /* Muat data form admin (materi & soal) */
    await loadAdminData();
  } catch (err) {
    if (err.status === 401) {
      clearToken();
      showPage("page-login");
      showLoginError("Sesi berakhir, silakan login lagi.");
    } else {
      showToast("Gagal memuat data guru. Coba muat ulang halaman.");
    }
  }
}

/* =============== (9b) KELOLA MATERI & SOAL (ADMIN) ==================== */

/** Beralih antar tab dashboard (Materi / Soal / Riwayat). */
function switchTab(tabId) {
  document.querySelectorAll(".dash-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

/** Pesan error kecil di dalam form admin. */
function showFormError(box, message) {
  box.textContent = message || "";
  box.classList.toggle("show", Boolean(message));
}

/** Ambil semua materi + soal (endpoint khusus pengajar, butuh token). */
async function loadAdminData() {
  try {
    const [materiData, setData, soalData] = await Promise.all([
      api("/api/materials/manage"),
      api("/api/sets/manage"),
      api("/api/questions/manage")
    ]);

    materiList = materiData.materials || [];
    setList = setData.sets || [];
    renderMateriAdmin();
    renderSetAdmin();
    renderSoalAdmin(soalData.questions || []);
    fillMaterialSelect();
    fillSetSelect();
    fillSetMaterialSelect();
  } catch (err) {
    if (err.status === 401) return; // biarkan renderDashboard yang menangani
    showToast("Gagal memuat data admin.");
  }
}

/* ------------------------- DAFTAR MATERI ------------------------------- */

function renderMateriAdmin() {
  materiCount.textContent = materiList.length;
  materiAdminList.innerHTML = "";

  if (!materiList.length) {
    materiAdminList.innerHTML =
      '<li class="admin-empty">Belum ada materi. Buat materi pertama lewat form di samping.</li>';
    return;
  }

  materiList.forEach((material, index) => {
    const li = document.createElement("li");
    li.style.animationDelay = index * 0.05 + "s";
    const isOwner = material.is_owner !== false;

    const actions = isOwner
      ? '<div class="admin-actions">' +
          '<button class="icon-mini edit" type="button" title="Ubah materi" data-action="edit" data-id="' + material.id + '">Ubah</button>' +
          '<button class="icon-mini" type="button" title="Publish / draf" data-action="toggle" data-id="' + material.id + '">' +
            (material.is_published ? "Draf" : "Publish") + "</button>" +
          '<button class="icon-mini" type="button" title="Publik / privat" data-action="toggle-visibility" data-id="' + material.id + '">' +
            (material.visibility === "public" ? "Privat" : "Publik") + "</button>" +
          '<button class="icon-mini danger" type="button" title="Hapus materi" data-action="delete" data-id="' + material.id + '">Hapus</button>' +
        "</div>"
      : '<div class="admin-actions"><span class="tag">Hanya lihat</span></div>';

    li.innerHTML =
      '<span class="admin-thumb">' +
        (material.image_url
          ? '<img src="' + material.image_url + '" alt="">'
          : '<span class="thumb-letter">' +
            String(material.title || "M").trim().charAt(0).toUpperCase() +
            "</span>") +
      "</span>" +
      '<div class="admin-info">' +
        "<strong>" + material.title + "</strong>" +
        "<small>" +
          '<span class="tag' + (material.is_published ? "" : " warn") + '">' +
            (material.is_published ? "Publish" : "Draf") +
          "</span>" +
          '<span class="tag ' + (material.visibility === "public" ? "pub" : "priv") + '">' +
            (material.visibility === "public" ? "Publik" : "Privat") +
          "</span>" +
          (!isOwner && material.owner_name ? "Milik " + material.owner_name + " · " : "") +
          (material.subject || "Umum") + " · " + material.question_count + " soal" +
        "</small>" +
      "</div>" +
      actions;

    materiAdminList.appendChild(li);
  });
}

/** Isi form materi dari data yang dipilih (mode ubah). */
function editMateri(material) {
  editingMateriId = material.id;
  materiFormTitle.textContent = "Ubah materi: " + material.title;
  mTitle.value = material.title;
  mSummary.value = material.summary || "";
  mSubject.value = material.subject || "";
  mEmoji.value = material.emoji || "📘";
  mImage.value = material.image_url || "";
  mContent.value = material.content || "";
  mPublish.checked = material.is_published;
  if (mVisibility) mVisibility.checked = material.visibility === "public";
  btnCancelMateri.hidden = false;
  showFormError(materiError, "");
  switchTab("tabMateri");
  materiForm.scrollIntoView({ behavior: "smooth", block: "center" });
  mTitle.focus();
}

/** Kembali ke mode tambah materi. */
function resetMateriForm() {
  editingMateriId = null;
  materiFormTitle.textContent = "Tambah materi baru";
  materiForm.reset();
  mEmoji.value = "📘";
  mPublish.checked = true;
  if (mVisibility) mVisibility.checked = false;
  btnCancelMateri.hidden = true;
  showFormError(materiError, "");
}

/* --------------------------- DAFTAR SOAL -------------------------------- */

function renderSoalAdmin(questions) {
  soalCount.textContent = questions.length;
  soalAdminList.innerHTML = "";

  if (!questions.length) {
    soalAdminList.innerHTML =
      '<li class="admin-empty">Belum ada soal. Buat soal pertama lewat form di samping.</li>';
    return;
  }

  questions.forEach((question, index) => {
    const li = document.createElement("li");
    li.style.animationDelay = index * 0.05 + "s";
    li.innerHTML =
      '<span class="admin-thumb">' + (question.image || "❓") + "</span>" +
      '<div class="admin-info">' +
        "<strong>" + question.question + "</strong>" +
        "<small>" +
          '<span class="tag">' + (question.subject || "Umum") + "</span>" +
          (question.material_title
            ? "Materi: " + question.material_title
            : "Tanpa materi") +
        "</small>" +
      "</div>" +
      '<div class="admin-actions">' +
        '<button class="icon-mini edit" type="button" title="Ubah soal" data-action="edit-q" data-id="' + question.id + '">Ubah</button>' +
        '<button class="icon-mini danger" type="button" title="Hapus soal" data-action="delete-q" data-id="' + question.id + '">Hapus</button>' +
      "</div>";

    soalAdminList.appendChild(li);
  });
}

/** Isi form soal dari data yang dipilih (mode ubah). */
function editSoal(question) {
  editingSoalId = question.id;
  soalFormTitle.textContent = "Ubah soal";
  qQuestion.value = question.question;
  qOptions.value = (question.options || []).join("\n");
  qAnswer.value = (question.answer ?? 0) + 1; // UI memakai nomor mulai dari 1
  adEmoji.value = question.image || "❓";
  adSubject.value = question.subject || "";
  qMaterial.value = question.material_id || "";
  if (qSet) qSet.value = question.quiz_set_id || "";
  qFact.value = question.fact || "";
  btnCancelSoal.hidden = false;
  showFormError(soalError, "");
  switchTab("tabSoal");
  soalForm.scrollIntoView({ behavior: "smooth", block: "center" });
  qQuestion.focus();
}

/** Kembali ke mode tambah soal. */
function resetSoalForm() {
  editingSoalId = null;
  soalFormTitle.textContent = "Tambah soal baru";
  soalForm.reset();
  adEmoji.value = "❓";
  qAnswer.value = "1";
  btnCancelSoal.hidden = true;
  showFormError(soalError, "");
}

/* ------------------------- DAFTAR SET SOAL ------------------------------ */

function renderSetAdmin() {
  if (!setAdminList || !setCount) return;
  setCount.textContent = setList.length;
  setAdminList.innerHTML = "";

  if (!setList.length) {
    setAdminList.innerHTML =
      '<li class="admin-empty">Belum ada set soal. Buat set soal pertama lewat form di samping.</li>';
    return;
  }

  setList.forEach(function (set, index) {
    var li = document.createElement("li");
    li.style.animationDelay = index * 0.05 + "s";

    var isOwner = set.is_owner !== false;
    var codeText = set.access_code || "Belum ada";
    var codeClass = !set.access_code ? "empty" : set.access_code_active ? "active" : "off";

    var badges =
      '<span class="tag' + (set.is_published ? "" : " warn") + '">' +
        (set.is_published ? "Publish" : "Draf") +
      "</span>" +
      '<span class="tag ' + (set.visibility === "public" ? "pub" : "priv") + '">' +
        (set.visibility === "public" ? "Publik" : "Privat") +
      "</span>" +
      (!isOwner && set.owner_name ? '<span class="tag">Milik ' + set.owner_name + "</span>" : "");

    /* Tombol kode diletakkan sebaris dengan kode kuis. */
    var codeActions = isOwner
      ? '<div class="set-code-actions">' +
          '<button class="icon-mini code" type="button" data-action="gen-code" data-id="' + set.id + '">' +
            (set.access_code ? "Acak Kode" : "Buat Kode") + "</button>" +
          '<button class="icon-mini" type="button" title="Salin kode ke clipboard" data-action="copy-code" data-id="' + set.id + '"' +
            (set.access_code && set.access_code_active ? "" : " disabled") + ">Salin</button>" +
          '<button class="icon-mini danger" type="button" data-action="disable-code" data-id="' + set.id + '"' +
            (set.access_code_active === false ? " disabled" : "") + ">Nonaktifkan</button>" +
        "</div>"
      : "";

    var actions = isOwner
      ? '<div class="admin-actions">' +
          '<button class="icon-mini edit" type="button" data-action="edit-set" data-id="' + set.id + '">Ubah</button>' +
          '<button class="icon-mini" type="button" data-action="toggle-set" data-id="' + set.id + '">' +
            (set.is_published ? "Draf" : "Publish") + "</button>" +
          '<button class="icon-mini" type="button" data-action="toggle-visibility" data-id="' + set.id + '">' +
            (set.visibility === "public" ? "Privat" : "Publik") + "</button>" +
          '<button class="icon-mini danger" type="button" data-action="delete-set" data-id="' + set.id + '">Hapus</button>' +
        "</div>"
      : "";

    li.innerHTML =
      '<span class="admin-thumb">≡</span>' +
      '<div class="admin-info">' +
        "<strong>" + set.title + "</strong>" +
        "<small>" + badges +
          "Materi: " + (set.material_title || "?") + " · " + set.question_count + " soal" +
          (set.time_limit > 0 ? " · " + set.time_limit + " menit" : "") +
        "</small>" +
        (isOwner
          ? '<div class="set-code-row">' +
              '<span class="code-label">Kode kuis</span>' +
              '<span class="code-chip ' + codeClass + '">' + codeText + "</span>" +
              (set.access_code
                ? '<span class="code-status">' + (set.access_code_active ? "Aktif" : "Nonaktif") + "</span>"
                : '<span class="code-status">Tekan "Buat Kode"</span>') +
              codeActions +
            "</div>"
          : "") +
      "</div>" +
      actions;

    setAdminList.appendChild(li);
  });
}

function editSet(set) {
  editingSetId = set.id;
  setFormTitle.textContent = "Ubah set soal: " + set.title;
  sSetMaterial.value = set.material_id || "";
  sSetTitle.value = set.title;
  sSetDesc.value = set.description || "";
  sSetTime.value = set.time_limit || "";
  sSetPublish.checked = set.is_published;
  if (sSetVisibility) sSetVisibility.checked = set.visibility === "public";
  btnCancelSet.hidden = false;
  showFormError(setError, "");
  switchTab("tabSetSoal");
  setForm.scrollIntoView({ behavior: "smooth", block: "center" });
  sSetTitle.focus();
}

function resetSetForm() {
  editingSetId = null;
  setFormTitle.textContent = "Tambah set soal baru";
  setForm.reset();
  sSetTime.value = "";
  sSetPublish.checked = true;
  if (sSetVisibility) sSetVisibility.checked = false;
  btnCancelSet.hidden = true;
  showFormError(setError, "");
}

/** Isi dropdown pemilihan materi pada form soal. */
function fillMaterialSelect() {
  const current = qMaterial.value;
  qMaterial.innerHTML =
    '<option value="">— Belum terhubung materi —</option>' +
    materiList.filter((m) => m.is_owner !== false).map((m) =>
      '<option value="' + m.id + '">' + m.title + "</option>"
    ).join("");
  if (current) qMaterial.value = current;
}

/** Isi dropdown pemilihan set soal pada form soal. */
function fillSetSelect() {
  if (!qSet) return;
  const current = qSet.value;
  qSet.innerHTML =
    '<option value="">— Belum terhubung set soal —</option>' +
    setList.filter((s) => s.is_owner !== false).map((s) =>
      '<option value="' + s.id + '">' + s.title + " (" + (s.material_title || "?") + ")</option>"
    ).join("");
  if (current) qSet.value = current;
}

/** Isi dropdown pemilihan materi pada form set soal. */
function fillSetMaterialSelect() {
  if (!sSetMaterial) return;
  const current = sSetMaterial.value;
  sSetMaterial.innerHTML =
    '<option value="">— Pilih Materi —</option>' +
    materiList.filter((m) => m.is_owner !== false).map((m) =>
      '<option value="' + m.id + '">' + m.title + "</option>"
    ).join("");
  if (current) sSetMaterial.value = current;
}

/* ---------------------- EVENT: SUBMIT & KLIK --------------------------- */

function bindAdminEvents() {
  /* Tab dashboard */
  document.querySelectorAll(".dash-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  /* Simpan materi (tambah / ubah) */
  materiForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      title: mTitle.value.trim(),
      summary: mSummary.value.trim(),
      subject: mSubject.value.trim(),
      emoji: mEmoji.value.trim() || "📘",
      image_url: mImage.value.trim(),
      content: mContent.value,
      is_published: mPublish.checked,
      visibility: mVisibility && mVisibility.checked ? "public" : "private"
    };

    if (!payload.title || !payload.content) {
      showFormError(materiError, "Judul dan isi materi wajib diisi.");
      return;
    }

    try {
      if (editingMateriId) {
        await api("/api/materials/" + editingMateriId, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        showToast("Materi berhasil diperbarui.");
      } else {
        await api("/api/materials", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast("Materi baru berhasil ditambahkan.");
      }

      resetMateriForm();
      await renderDashboard();
    } catch (err) {
      showFormError(materiError, err.message);
    }
  });

  btnCancelMateri.addEventListener("click", resetMateriForm);

  /* Simpan set soal (tambah / ubah) */
  if (setForm) {
    setForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const payload = {
        title: sSetTitle.value.trim(),
        description: sSetDesc.value.trim(),
        timeLimit: sSetTime.value ? Number(sSetTime.value) : 0,
        materialId: sSetMaterial.value ? Number(sSetMaterial.value) : null,
        is_published: sSetPublish.checked,
        visibility: sSetVisibility && sSetVisibility.checked ? "public" : "private"
      };

      if (!payload.title || !payload.materialId) {
        showFormError(setError, "Judul dan Materi Induk wajib diisi.");
        return;
      }

      try {
        if (editingSetId) {
          await api("/api/sets/" + editingSetId, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          showToast("Set soal berhasil diperbarui.");
        } else {
          await api("/api/sets", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          showToast("Set soal baru berhasil ditambahkan.");
        }

        resetSetForm();
        await loadAdminData();
      } catch (err) {
        showFormError(setError, err.message);
      }
    });
  }

  if (btnCancelSet) {
    btnCancelSet.addEventListener("click", resetSetForm);
  }

  /* Aksi pada daftar set soal (ubah / publish / kode / hapus) */
  if (setAdminList) {
    setAdminList.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = Number(button.dataset.id);
      const set = setList.find((item) => item.id === id);
      if (!set) return;

      const action = button.dataset.action;

      try {
        if (action === "edit-set") {
          editSet(set);
        } else if (action === "toggle-set") {
          await api("/api/sets/" + id + "/publish", {
            method: "PATCH",
            body: JSON.stringify({ is_published: !set.is_published })
          });
          showToast(set.is_published
            ? "Set soal dipindahkan ke draf."
            : "Set soal dipublikasikan untuk siswa.");
          await loadAdminData();
        } else if (action === "toggle-visibility") {
          await api("/api/sets/" + id, {
            method: "PUT",
            body: JSON.stringify({ visibility: set.visibility === "public" ? "private" : "public" })
          });
          showToast(set.visibility === "public"
            ? "Set soal kembali privat."
            : "Set soal dibagikan ke semua guru (publik).");
          await loadAdminData();
        } else if (action === "gen-code") {
          const data = await api("/api/sets/" + id + "/code", { method: "POST" });
          showToast("Kode kuis baru: " + data.code);
          try {
            await navigator.clipboard.writeText(data.code);
            showToast("Kode kuis " + data.code + " sudah disalin.");
          } catch (_) { /* clipboard tidak tersedia */ }
          await loadAdminData();
        } else if (action === "copy-code") {
          if (!set.access_code) {
            showToast("Buat kode dulu, ya.");
            return;
          }
          try {
            await navigator.clipboard.writeText(set.access_code);
            showToast("Kode " + set.access_code + " disalin.");
          } catch (_) {
            showToast("Kode kuis: " + set.access_code);
          }
        } else if (action === "disable-code") {
          if (!set.access_code_active) return;
          if (!confirm('Nonaktifkan kode "' + set.access_code + '"? Siswa tidak bisa memakai kode ini lagi.')) return;
          await api("/api/sets/" + id + "/code", { method: "DELETE" });
          showToast("Kode kuis dinonaktifkan.");
          await loadAdminData();
        } else if (action === "delete-set") {
          if (!confirm('Hapus set soal "' + set.title + '"? Soal di dalamnya tidak akan terhapus, hanya kehilangan referensi set.')) return;
          await api("/api/sets/" + id, { method: "DELETE" });
          showToast("Set soal dihapus.");
          if (editingSetId === id) resetSetForm();
          await loadAdminData();
        }
      } catch (err) {
        showToast(err.message);
      }
    });
  }

  /* Aksi pada daftar materi (ubah / publish / hapus) */
  materiAdminList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const material = materiList.find((item) => item.id === id);
    if (!material) return;

    try {
      if (button.dataset.action === "edit") {
        editMateri(material);
      } else if (button.dataset.action === "toggle-visibility") {
        await api("/api/materials/" + id, {
          method: "PUT",
          body: JSON.stringify({ visibility: material.visibility === "public" ? "private" : "public" })
        });
        showToast(material.visibility === "public"
          ? "Materi kembali privat."
          : "Materi dibagikan ke semua guru (publik).");
        await loadAdminData();
      } else if (button.dataset.action === "toggle") {
        await api("/api/materials/" + id + "/publish", {
          method: "PATCH",
          body: JSON.stringify({ is_published: !material.is_published })
        });
        showToast(material.is_published
          ? "Materi dipindahkan ke draf."
          : "Materi dipublikasikan untuk siswa.");
        await loadAdminData();
      } else if (button.dataset.action === "delete") {
        if (!confirm('Hapus materi "' + material.title + '" beserta datanya?')) return;
        await api("/api/materials/" + id, { method: "DELETE" });
        showToast("Materi dihapus.");
        if (editingMateriId === id) resetMateriForm();
        await loadAdminData();
        await renderDashboard();
      }
    } catch (err) {
      showToast(err.message);
    }
  });

  /* Simpan soal (tambah / ubah) */
  soalForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const options = qOptions.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const answerIndex = Number(qAnswer.value) - 1; // UI 1-based -> API 0-based

    if (!qQuestion.value.trim()) {
      showFormError(soalError, "Pertanyaan wajib diisi.");
      return;
    }
    if (options.length < 2) {
      showFormError(soalError, "Pilihan jawaban minimal 2 baris (satu per baris).");
      return;
    }
    if (answerIndex < 0 || answerIndex >= options.length) {
      showFormError(soalError, "Nomor jawaban benar harus antara 1 dan " + options.length + ".");
      return;
    }

    const payload = {
      question: qQuestion.value.trim(),
      options,
      answer: answerIndex,
      image: adEmoji.value.trim(),
      subject: adSubject.value.trim(),
      fact: qFact.value.trim(),
      materialId: qMaterial.value ? Number(qMaterial.value) : null,
      quizSetId: qSet && qSet.value ? Number(qSet.value) : null
    };

    try {
      if (editingSoalId) {
        await api("/api/questions/" + editingSoalId, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        showToast("Soal berhasil diperbarui.");
      } else {
        await api("/api/questions", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast("Soal baru berhasil ditambahkan.");
      }

      resetSoalForm();
      await renderDashboard();
    } catch (err) {
      showFormError(soalError, err.message);
    }
  });

  btnCancelSoal.addEventListener("click", resetSoalForm);

  /* Aksi pada daftar soal (ubah / hapus) */
  soalAdminList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    try {
      if (action === "edit-q") {
        const data = await api("/api/questions/manage");
        const question = (data.questions || []).find((item) => item.id === id);
        if (question) editSoal(question);
      } else if (action === "delete-q") {
        if (!confirm("Hapus soal ini?")) return;
        await api("/api/questions/" + id, { method: "DELETE" });
        showToast("Soal dihapus.");
        if (editingSoalId === id) resetSoalForm();
        await loadAdminData();
        await renderDashboard();
      }
    } catch (err) {
      showToast(err.message);
    }
  });
}

/* =============== (10) REGISTRASI & LOGIN GURU ========================= */

/* Tampilkan/sembunyikan password untuk login */
if (togglePass) {
  togglePass.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    togglePass.textContent = isPassword ? "Sembunyi" : "Lihat";
  });
}

/* Tampilkan/sembunyikan password untuk registrasi */
if (regTogglePass) {
  regTogglePass.addEventListener("click", () => {
    const isPassword = regPasswordInput.type === "password";
    regPasswordInput.type = isPassword ? "text" : "password";
    regConfirmPasswordInput.type = isPassword ? "text" : "password";
    regTogglePass.textContent = isPassword ? "Sembunyi" : "Lihat";
  });
}

/* =============== (11) INISIALISASI PROGRAM ============================ */

/** Mempersiapkan halaman saat dokumen selesai dimuat. */
function init() {
  splitTitle();
  createDecorations();
  loadHomeStats();

  /* Tombol memulai kuis (dipakai di home, hasil, dan dashboard guru) */
  const btnStart = $("#btnStart");
  if (btnStart) btnStart.addEventListener("click", startQuiz);

  
  const btnReplay = $("#btnReplay");
  if (btnReplay) btnReplay.addEventListener("click", startQuiz);
  
  const btnGuruMulai = $("#btnGuruMulai");
  if (btnGuruMulai) {
    btnGuruMulai.addEventListener("click", () => {
      showPage("page-home");
      if (quizCodeInput) quizCodeInput.focus();
      showToast("Masukkan kode kuis, lalu bagikan kode itu ke siswa.");
    });
  }

  /* Kode kuis: huruf besar, hanya huruf/angka, maksimal 6 karakter */
  if (quizCodeInput) {
    quizCodeInput.addEventListener("input", () => {
      quizCodeInput.value = quizCodeInput.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
    });
  }

  /* Isi otomatis dari tautan materi-detail.html?code=XXXXXX */
  const urlCode = new URLSearchParams(location.search).get("code");
  if (urlCode && quizCodeInput) {
    quizCodeInput.value = urlCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  }

  /* Tombol lanjut */
  if (typeof btnNext !== "undefined" && btnNext) {
    btnNext.addEventListener("click", nextQuestion);
  }

  /* Form admin: tab, materi, dan soal */
  if ($("#materiForm") && typeof bindAdminEvents === "function") {
    bindAdminEvents();
  }

  /* Form login guru */
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  /* Form registrasi guru */
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  /* Tab switcher auth guru (Login / Daftar) */
  const tabBtnLogin = $("#tabBtnLogin");
  const tabBtnRegister = $("#tabBtnRegister");
  const linkToRegister = $("#linkToRegister");
  const linkToLogin = $("#linkToLogin");

  if (tabBtnLogin) tabBtnLogin.addEventListener("click", () => switchAuthTab("login"));
  if (tabBtnRegister) tabBtnRegister.addEventListener("click", () => switchAuthTab("register"));
  if (linkToRegister) linkToRegister.addEventListener("click", () => switchAuthTab("register"));
  if (linkToLogin) linkToLogin.addEventListener("click", () => switchAuthTab("login"));

  /* Auto-login jika ada hash #dashboard */
  if (window.location.hash === "#dashboard" && getToken() && document.getElementById("page-dashboard")) {
    renderDashboard().then(() => {
      showPage("page-dashboard");
      // Hapus hash dari URL agar tidak terus-terusan auto-login saat refresh
      history.replaceState(null, null, ' ');
    }).catch(() => {
      clearToken();
    });
  }

  /* Tombol logout guru: dua konfirmasi berurutan */
  const btnLogout = $("#btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      const yakin = window.confirm("Apakah Anda yakin ingin keluar?");
      if (!yakin) return;

      const konfirmasi = window.confirm("Konfirmasi sekali lagi, keluar dari akun?");
      if (!konfirmasi) return;

      try { await api("/api/auth/logout", { method: "POST" }); } catch (_) { /* abaikan */ }
      clearToken();
      if (loginForm) loginForm.reset();
      if (loginError) loginError.classList.remove("show");
      if (registerError) registerError.classList.remove("show");
      showPage("page-home");
    });
  }

  /* Lanjutkan kuis yang masih berjalan setelah halaman di-refresh */
  if (document.getElementById("page-quiz")) {
    restoreQuizSession();
  }

  /* Dukungan keyboard: tekan 1-4 untuk memilih opsi, Enter untuk lanjut */
  document.addEventListener("keydown", (event) => {
    const pageQuiz = document.getElementById("page-quiz");
    if (!pageQuiz) return;
    const quizActive = pageQuiz.classList.contains("active");
    if (!quizActive) return;

    const number = parseInt(event.key, 10);
    if (number >= 1 && number <= 4) {
      const buttons = answersBox.querySelectorAll(".answer-btn");
      if (buttons[number - 1]) buttons[number - 1].click();
    }
    if (event.key === "Enter" && typeof btnNext !== "undefined" && btnNext && !btnNext.classList.contains("hidden")) {
      btnNext.click();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);