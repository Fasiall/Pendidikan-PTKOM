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
const regFullNameInput = $("#regFullName");
const regEmailInput = $("#regEmail");
const regPasswordInput = $("#regPassword");
const regConfirmPasswordInput = $("#regConfirmPassword");
const regTogglePass   = $("#toggleRegPass");
const registerError   = $("#registerError");

const questionList  = $("#questionList");
const resultsList   = $("#resultsList");
const statMaterials = $("#statMaterials");
const statTotal     = $("#statTotal");
const statTopics    = $("#statTopics");
const statLastScore = $("#statLastScore");

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
const btnCancelSoal = $("#btnCancelSoal");
const soalAdminList = $("#soalAdminList");
const soalCount     = $("#soalCount");

/* =============== (2) STATUS / VARIABEL GLOBAL =========================== */
let questions   = [];   // daftar soal dari server (tanpa kunci jawaban)
let currentIndex = 0;   // nomor soal yang sedang tampil (mulai dari 0)
let score       = 0;    // jumlah jawaban benar (dikembalikan server)
let isAnswered  = false;// soal ini sudah dijawab atau belum
let lastScore   = null; // skor terakhir (untuk dashboard guru)
let fxTimer     = null; // timer menyembunyikan flash layar
let toastTimer  = null; // timer menyembunyikan notifikasi

/* Status form admin: daftar materi + id yang sedang diedit (null = mode tambah) */
let materiList      = [];
let editingMateriId = null;
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
    span.textContent = char === " " ? " " : char;
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
 * Bila URL punya parameter ?materi=ID, hanya soal dari materi itu yang muncul
 * (dipakai tombol "Kerjakan Kuis" di halaman detail materi).
 * Bila server tidak terhubung, tampilkan pesan tanpa crash.
 */
async function startQuiz() {
  const btnStart = $("#btnStart");
  const labelBefore = btnStart.textContent;
  btnStart.disabled = true;
  btnStart.textContent = "⏳ Memuat soal...";

  const materialId = Number(new URLSearchParams(location.search).get("materi")) || null;
  const questionUrl = materialId ? "/api/questions?materialId=" + materialId : "/api/questions";

  try {
    const [startData, listData] = await Promise.all([
      api("/api/quiz/start", {
        method: "POST",
        body: JSON.stringify(materialId ? { materialId } : {})
      }),
      api(questionUrl)
    ]);

    const list = Array.isArray(listData) ? listData : listData.questions;
    if (!list || !list.length) throw new Error("Soal masih kosong.");

    questions = list;
    currentIndex = 0;
    score = 0;
    showPage("page-quiz");
    renderQuestion();
  } catch (err) {
    showToast(
      err.message && err.message !== "Soal masih kosong."
        ? "⚠️ " + err.message
        : "⚠️ Server belum terhubung. Jalankan \"npm start\" lalu muat ulang halaman."
    );
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
  const fullName = regFullNameInput.value.trim();
  const email = regEmailInput.value.trim();
  const password = regPasswordInput.value;
  const confirmPassword = regConfirmPasswordInput.value;

  if (!username || !fullName || !email || !password || !confirmPassword) {
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
        fullName,
        email
      })
    });
    // Jika registrasi berhasil, langsung login otomatis?
    // Atau kita bisa alihkan ke halaman login dengan pesan sukses.
    // Untuk saat ini, kita akan alihkan ke halaman login dan beri tahu pengguna bahwa registrasi berhasil.
    showToast("Registrasi berhasil! Selamat datang.");
    registerForm.reset();
    showPage("page-home"); // Alihkan ke halaman landing
  } catch (err) {
    showRegisterError(err.message || "Registrasi gagal, coba lagi.");
    shakeForm(registerForm);
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
    const data = await api("/api/teacher/stats");

    statMaterials.textContent = data.totalMaterials ?? 0;
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
    const [materiData, soalData] = await Promise.all([
      api("/api/materials/manage"),
      api("/api/questions/manage")
    ]);

    materiList = materiData.materials || [];
    renderMateriAdmin();
    renderSoalAdmin(soalData.questions || []);
    fillMaterialSelect();
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
      '<li class="admin-empty">Belum ada materi. Buat materi pertama lewat form di samping 👉</li>';
    return;
  }

  materiList.forEach((material, index) => {
    const li = document.createElement("li");
    li.style.animationDelay = index * 0.05 + "s";
    li.innerHTML =
      '<span class="admin-thumb">' +
        (material.image_url
          ? '<img src="' + material.image_url + '" alt="">'
          : material.emoji || "📘") +
      "</span>" +
      '<div class="admin-info">' +
        "<strong>" + material.title + "</strong>" +
        "<small>" +
          '<span class="tag' + (material.is_published ? "" : " warn") + '">' +
            (material.is_published ? "Publish" : "Draf") +
          "</span>" +
          (material.subject || "Umum") + " · " + material.question_count + " soal" +
        "</small>" +
      "</div>" +
      '<div class="admin-actions">' +
        '<button class="icon-mini edit" type="button" title="Ubah materi" data-action="edit" data-id="' + material.id + '">✏️</button>' +
        '<button class="icon-mini" type="button" title="Publish / draf" data-action="toggle" data-id="' + material.id + '">' +
          (material.is_published ? "🙈" : "✅") + "</button>" +
        '<button class="icon-mini danger" type="button" title="Hapus materi" data-action="delete" data-id="' + material.id + '">🗑️</button>' +
      "</div>";

    materiAdminList.appendChild(li);
  });
}

/** Isi form materi dari data yang dipilih (mode ubah). */
function editMateri(material) {
  editingMateriId = material.id;
  materiFormTitle.textContent = "✏️ Ubah Materi: " + material.title;
  mTitle.value = material.title;
  mSummary.value = material.summary || "";
  mSubject.value = material.subject || "";
  mEmoji.value = material.emoji || "📘";
  mImage.value = material.image_url || "";
  mContent.value = material.content || "";
  mPublish.checked = material.is_published;
  btnCancelMateri.hidden = false;
  showFormError(materiError, "");
  switchTab("tabMateri");
  materiForm.scrollIntoView({ behavior: "smooth", block: "center" });
  mTitle.focus();
}

/** Kembali ke mode tambah materi. */
function resetMateriForm() {
  editingMateriId = null;
  materiFormTitle.textContent = "➕ Tambah Materi Baru";
  materiForm.reset();
  mEmoji.value = "📘";
  mPublish.checked = true;
  btnCancelMateri.hidden = true;
  showFormError(materiError, "");
}

/* --------------------------- DAFTAR SOAL -------------------------------- */

function renderSoalAdmin(questions) {
  soalCount.textContent = questions.length;
  soalAdminList.innerHTML = "";

  if (!questions.length) {
    soalAdminList.innerHTML =
      '<li class="admin-empty">Belum ada soal. Buat soal pertama lewat form di samping 👉</li>';
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
            ? "📚 " + question.material_title
            : "Tanpa materi") +
        "</small>" +
      "</div>" +
      '<div class="admin-actions">' +
        '<button class="icon-mini edit" type="button" title="Ubah soal" data-action="edit-q" data-id="' + question.id + '">✏️</button>' +
        '<button class="icon-mini danger" type="button" title="Hapus soal" data-action="delete-q" data-id="' + question.id + '">🗑️</button>' +
      "</div>";

    soalAdminList.appendChild(li);
  });
}

/** Isi form soal dari data yang dipilih (mode ubah). */
function editSoal(question) {
  editingSoalId = question.id;
  soalFormTitle.textContent = "✏️ Ubah Soal";
  qQuestion.value = question.question;
  qOptions.value = (question.options || []).join("\n");
  qAnswer.value = (question.answer ?? 0) + 1; // UI memakai nomor mulai dari 1
  adEmoji.value = question.image || "❓";
  adSubject.value = question.subject || "";
  qMaterial.value = question.material_id || "";
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
  soalFormTitle.textContent = "➕ Tambah Soal Baru";
  soalForm.reset();
  adEmoji.value = "❓";
  qAnswer.value = "1";
  btnCancelSoal.hidden = true;
  showFormError(soalError, "");
}

/** Isi dropdown pemilihan materi pada form soal. */
function fillMaterialSelect() {
  const current = qMaterial.value;
  qMaterial.innerHTML =
    '<option value="">— Belum terhubung materi —</option>' +
    materiList.map((m) =>
      '<option value="' + m.id + '">' + m.title + "</option>"
    ).join("");
  if (current) qMaterial.value = current;
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
      is_published: mPublish.checked
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
        showToast("✅ Materi berhasil diperbarui.");
      } else {
        await api("/api/materials", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast("✅ Materi baru berhasil ditambahkan.");
      }

      resetMateriForm();
      await renderDashboard();
    } catch (err) {
      showFormError(materiError, err.message);
    }
  });

  btnCancelMateri.addEventListener("click", resetMateriForm);

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
      } else if (button.dataset.action === "toggle") {
        await api("/api/materials/" + id + "/publish", {
          method: "PATCH",
          body: JSON.stringify({ is_published: !material.is_published })
        });
        showToast(material.is_published
          ? "📄 Materi dipindahkan ke draf."
          : "✅ Materi dipublikasikan untuk siswa.");
        await loadAdminData();
      } else if (button.dataset.action === "delete") {
        if (!confirm('Hapus materi "' + material.title + '" beserta datanya?')) return;
        await api("/api/materials/" + id, { method: "DELETE" });
        showToast("🗑️ Materi dihapus.");
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
      materialId: qMaterial.value ? Number(qMaterial.value) : null
    };

    try {
      if (editingSoalId) {
        await api("/api/questions/" + editingSoalId, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        showToast("✅ Soal berhasil diperbarui.");
      } else {
        await api("/api/questions", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast("✅ Soal baru berhasil ditambahkan.");
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
        showToast("🗑️ Soal dihapus.");
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
    togglePass.textContent = isPassword ? "🙈" : "👁️";
  });
}

/* Tampilkan/sembunyikan password untuk registrasi */
if (regTogglePass) {
  regTogglePass.addEventListener("click", () => {
    const isPassword = regPasswordInput.type === "password";
    regPasswordInput.type = isPassword ? "text" : "password";
    regConfirmPasswordInput.type = isPassword ? "text" : "password";
    regTogglePass.textContent = isPassword ? "🙈" : "👁️";
  });
}

/* =============== (11) INISIALISASI PROGRAM ============================ */

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

  /* Form admin: tab, materi, dan soal */
  bindAdminEvents();

  /* Form login guru */
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  /* Form registrasi guru */
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  /* Tombol logout (ada di halaman dashboard) */
  const btnLogout = $("#btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try { await api("/api/auth/logout", { method: "POST" }); } catch (_) { /* abaikan */ }
      clearToken();
      if (loginForm) loginForm.reset();
      loginError.classList.remove("show");
      if (registerError) registerError.classList.remove("show");
      showPage("page-home");
    });
  }

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