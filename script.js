/* ==========================================================================
   script.js — Kuis Petualangan Ceria (sisi klien / frontend)

   Frontend ini memanggil backend Express (server.js) lewat API:
     GET  /api/questions        -> daftar soal (tanpa kunci jawaban)
     POST /api/quiz/start       -> mulai sesi kuis
     POST /api/quiz/answer      -> kirim jawaban (divalidasi server)
     POST /api/quiz/submit      -> simpan skor akhir
     POST /api/login|/api/logout, GET /api/teacher/stats

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
   (10) Inisialisasi program
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

const questionList  = $("#questionList");
const resultsList   = $("#resultsList");
const statTotal     = $("#statTotal");
const statTopics    = $("#statTopics");
const statLastScore = $("#statLastScore");

/* =============== (2) STATUS / VARIABEL GLOBAL =========================== */
let questions   = [];   // daftar soal dari server (tanpa kunci jawaban)
let currentIndex = 0;   // nomor soal yang sedang tampil (mulai dari 0)
let score       = 0;    // jumlah jawaban benar (dikembalikan server)
let isAnswered  = false;// soal ini sudah dijawab atau belum
let lastScore   = null; // skor terakhir (untuk dashboard guru)
let fxTimer     = null; // timer menyembunyikan flash layar
let toastTimer  = null; // timer menyembunyikan notifikasi

/* =============== (3) HELPER API + TOAST ================================ */

/**
 * Pembungkus fetch: otomatis parsing JSON dan lempar error
 * bila status respons bukan 2xx (err.status berisi kode HTTP).
 */
async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options
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
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/* Navigasi universal: elemen dengan data-page="id-halaman" berpindah halaman. */
document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-page]");
  if (trigger) showPage(trigger.dataset.page);
});

/* =============== (5) HIASAN: JUDUL & LATAR ============================= */

/** Memecah judul menjadi per huruf agar bisa dianimasi satu per satu. */
function splitTitle() {
  const titleEl = $("#mainTitle");
  if (!titleEl) return;

  const text = titleEl.textContent.trim();
  const colors = ["#FF6B6B", "#FFD93D", "#4ECDC4", "#A78BFA", "#5B8DEF", "#FF6B9D"];
  titleEl.textContent = "";

  [...text].forEach((char, index) => {
    const span = document.createElement("span");
    span.className = "t-letter";
    span.textContent = char === " " ? "\u00A0" : char;
    span.style.color = colors[index % colors.length];
    span.style.animationDelay = (index * 0.08) + "s";
    titleEl.appendChild(span);
  });
}

/** Membuat emoji melayang di latar belakang (posisi acak tapi seragam). */
function createDecorations() {
  const emojis = ["🎈", "⭐", "🌈", "🌸", "☁️", "🦋", "🍭", "🐟", "🍋", "🐝", "🌺", "🐚"];
  for (let i = 0; i < 12; i++) {
    const el = document.createElement("span");
    el.className = "decor";
    el.textContent = emojis[i % emojis.length];
    el.style.left = (Math.random() * 94) + "%";
    el.style.top = (Math.random() * 88) + "%";
    el.style.fontSize = (24 + Math.random() * 30) + "px";
    el.style.animationDuration = (4 + Math.random() * 5) + "s";
    el.style.animationDelay = (Math.random() * 4) + "s";
    decorLayer.appendChild(el);
  }
}

/* =============== (6) LOGIKA KUIS ======================================= */

/**
 * Memulai kuis: minta sesi baru ke server dan ambil daftar soal.
 * Bila server tidak terhubung, tampilkan pesan tanpa crash.
 */
async function startQuiz() {
  const btnStart = $("#btnStart");
  const labelBefore = btnStart.textContent;
  btnStart.disabled = true;
  btnStart.textContent = "⏳ Memuat soal...";

  try {
    const [startData, list] = await Promise.all([
      api("/api/quiz/start", { method: "POST" }),
      api("/api/questions")
    ]);
    if (!list.length) throw new Error("Soal masih kosong.");

    questions = list;
    currentIndex = 0;
    score = 0;
    showPage("page-quiz");
    renderQuestion();
  } catch (err) {
    showToast("⚠️ Server belum terhubung. Jalankan \"npm start\" lalu muat ulang halaman.");
  } finally {
    btnStart.disabled = false;
    btnStart.textContent = labelBefore;
  }
}

/** Menampilkan soal sesuai currentIndex ke dalam kartu pertanyaan. */
function renderQuestion() {
  const q = questions[currentIndex];
  isAnswered = false;

  /* Perbarui progress bar & chip skor */
  progressFill.style.width = ((currentIndex + 1) / questions.length * 100) + "%";
  progressText.textContent = (currentIndex + 1) + "/" + questions.length;
  scoreChip.textContent = "⭐ " + score;

  /* Isi konten kartu */
  qSubject.textContent = q.subject;
  qImage.textContent = q.image;
  qText.textContent = q.question;
  feedbackBox.textContent = "";
  feedbackBox.className = "feedback";
  btnNext.classList.add("hidden");

  /* Hancurkan & bangun ulang animasi masuknya kartu */
  questionCard.classList.remove("card-in");
  void questionCard.offsetWidth; // paksa reflow agar animasi berjalan lagi
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
}

/**
 * Mengirim jawaban ke server untuk divalidasi.
 * Benar  -> hijau + konfeti + kilatan layar.
 * Salah  -> getar (shake) merah muda + kunci jawaban ditampilkan.
 */
async function chooseAnswer(selectedIndex) {
  if (isAnswered) return; // cegah jawaban ganda
  isAnswered = true;

  const q = questions[currentIndex];
  const buttons = answersBox.querySelectorAll(".answer-btn");
  buttons.forEach((btn) => (btn.disabled = true)); // kunci selama request

  let result;
  try {
    result = await api("/api/quiz/answer", {
      method: "POST",
      body: JSON.stringify({ questionId: q.id, choice: selectedIndex })
    });
  } catch (err) {
    /* Gagal terhubung: buka kembali tombol agar bisa dicoba lagi */
    isAnswered = false;
    buttons.forEach((btn) => (btn.disabled = false));
    showToast(err.status === 400 ? err.message : "Gagal mengirim jawaban, coba lagi.");
    return;
  }

  score = result.score;

  if (result.correct) {
    buttons[selectedIndex].classList.add("correct");
    feedbackBox.className = "feedback ok";
    feedbackBox.innerHTML = "<b>🎉 Hebat! Jawabanmu benar!</b>" + result.fact;
    flashFx("ok");
    burstConfetti(45);
  } else {
    buttons[selectedIndex].classList.add("wrong");
    buttons[result.correctIndex].classList.add("correct"); // tampilkan jawaban benar
    feedbackBox.className = "feedback no";
    feedbackBox.innerHTML =
      "<b>😅 Belum tepat, ayo coba lagi!</b>Jawaban yang benar: <b>" +
      q.options[result.correctIndex] + "</b>. " + result.fact;
    flashFx("no");
  }

  scoreChip.textContent = "⭐ " + score;

  /* Tampilkan tombol lanjut */
  btnNext.textContent =
    currentIndex === questions.length - 1 ? "Lihat Hasil 🎉" : "Lanjut ➡️";
  btnNext.classList.remove("hidden");

  /* Di HP, bila umpan balik terpotong layar, gulirkan ke situ */
  const rect = feedbackBox.getBoundingClientRect();
  if (rect.bottom > window.innerHeight) {
    feedbackBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/** Beralih ke soal berikutnya, atau menyimpan skor di soal terakhir. */
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
  const colors = ["#FF6B6B", "#FFD93D", "#4ECDC4", "#A78BFA", "#5B8DEF", "#FF6B9D", "#3BCE7B"];
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
  fxEmoji.textContent = type === "ok" ? "🎉" : "🙈";
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
 * Mengirim skor akhir ke server (tersimpan di tabel results),
 * lalu menampilkan bintang, skor berjalan, dan pesan motivasi.
 */
async function showResult() {
  let finalScore = score;
  let total = questions.length;

  try {
    const data = await api("/api/quiz/submit", { method: "POST" });
    finalScore = data.score;
    total = data.total;
    lastScore = finalScore;
  } catch (err) {
    /* Server bermasalah: hasil tetap tampil, hanya tidak tersimpan */
    lastScore = finalScore;
    showToast("ℹ️ Skor tampil, tetapi gagal tersimpan di server.");
  }

  score = finalScore;
  renderResult(finalScore, total);
}

/** Merender tampilan halaman hasil. */
function renderResult(finalScore, total) {
  showPage("page-result");

  const ratio = total ? finalScore / total : 0;

  /* Emoji, judul, dan pesan motivasi berdasarkan rasio keberhasilan */
  let emoji, title, message;
  if (ratio === 1) {
    emoji = "🏆"; title = "Sempurna!";
    message = "WOW! Semua jawaban benar. Kamu juara! 🎉";
  } else if (ratio >= 0.75) {
    emoji = "🌟"; title = "Hebat Sekali!";
    message = "Hebat! Terus Belajar ya! ⭐";
  } else if (ratio >= 0.5) {
    emoji = "😃"; title = "Kerja Bagus!";
    message = "Bagus! Sedikit lagi sempurna. Semangat! 💪";
  } else {
    emoji = "💪"; title = "Jangan Menyerah!";
    message = "Terus Belajar ya, pasti bisa! Ayo coba lagi! 🌈";
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
    star.textContent = "⭐";
    if (i < earned) star.style.animationDelay = (0.25 + i * 0.35) + "s";
    starRow.appendChild(star);
  }

  /* Skor berjalan + lingkaran skor berwarna sesuai hasil */
  scoreTotal.textContent = "benar dari " + total;
  scoreNumber.textContent = "0";
  animateNumber(scoreNumber, finalScore, 1400);

  const degrees = Math.round(ratio * 360);
  const circle = document.querySelector(".score-circle");
  if (circle) {
    circle.style.background =
      "conic-gradient(#FFD93D " + degrees + "deg, #FFF3C4 " + degrees + "deg)";
  }

  /* Rayakan dengan konfeti */
  setTimeout(() => burstConfetti(ratio >= 0.75 ? 70 : 35), 350);
}

/* =============== (9) LOGIN & DASHBOARD GURU =========================== */

/** Validasi login ke server: benar -> dashboard, salah -> efek getar. */
async function handleLogin(event) {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showLoginError("Username dan password wajib diisi!");
    shakeForm(loginForm);
    return;
  }

  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
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

/** Menampilkan pesan error validasi. */
function showLoginError(message) {
  loginError.textContent = message;
  loginError.classList.add("show");
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
    const data = await api("/api/teacher/stats");

    statTotal.textContent = data.totalQuestions;
    statTopics.textContent = data.topics;
    statLastScore.textContent = data.lastScore || "-";

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
        '<li class="empty-note">Belum ada skor yang tersimpan. Ajak siswa bermain! 🎈</li>';
    } else {
      data.results.forEach((r, index) => {
        const li = document.createElement("li");
        li.style.animationDelay = (index * 0.06) + "s";
        li.innerHTML =
          '<span class="ql-num">🏅</span>' +
          "<div><strong>" + r.score + "/" + r.total + " benar</strong>" +
          '<p class="ql-text">' + r.created_at + "</p></div>";
        resultsList.appendChild(li);
      });
    }
  } catch (err) {
    if (err.status === 401) {
      showPage("page-login");
      showLoginError("Sesi berakhir, silakan login lagi.");
    } else {
      showToast("Gagal memuat data guru. Coba muat ulang halaman.");
    }
  }
}

/* =============== (10) INISIALISASI PROGRAM ============================ */

/** Mempersiapkan halaman saat dokumen selesai dimuat. */
function init() {
  splitTitle();
  createDecorations();

  /* Tombol memulai kuis (dipakai di home, hasil, dan dashboard guru) */
  $("#btnStart").addEventListener("click", startQuiz);
  $("#btnReplay").addEventListener("click", startQuiz);
  $("#btnGuruMulai").addEventListener("click", startQuiz);

  /* Tombol lanjut */
  btnNext.addEventListener("click", nextQuestion);

  /* Form login guru */
  loginForm.addEventListener("submit", handleLogin);
  $("#btnLogout").addEventListener("click", async () => {
    try { await api("/api/logout", { method: "POST" }); } catch (_) { /* abaikan */ }
    loginForm.reset();
    loginError.classList.remove("show");
    showPage("page-home");
  });

  /* Tampilkan/sembunyikan password */
  togglePass.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    togglePass.textContent = isPassword ? "🙈" : "👁️";
  });

  /* Dukungan keyboard: tekan 1-4 untuk memilih opsi, Enter untuk lanjut */
  document.addEventListener("keydown", (event) => {
    const quizActive = document.getElementById("page-quiz").classList.contains("active");
    if (!quizActive) return;

    const number = parseInt(event.key, 10);
    if (number >= 1 && number <= 4) {
      const buttons = answersBox.querySelectorAll(".answer-btn");
      if (buttons[number - 1]) buttons[number - 1].click();
    }
    if (event.key === "Enter" && !btnNext.classList.contains("hidden")) {
      btnNext.click();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
