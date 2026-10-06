/* ==========================================================================
   script.js — Kuis Petualangan Ceria

   Susunan file:
   (1)  Konfigurasi: data soal & akun guru
   (2)  Referensi elemen DOM
   (3)  Status / variabel global kuis
   (4)  Navigasi antar halaman
   (5)  Hiasan: judul meloncat + dekorasi latar
   (6)  Logika kuis (render soal, jawaban, lanjut)
   (7)  Animasi: konfeti, flash layar, skor berjalan
   (8)  Halaman hasil (bintang + pesan motivasi)
   (9)  Login & dashboard guru
   (10) Inisialisasi program
   ========================================================================== */

/* =============== (1) KONFIGURASI: DATA SOAL & AKUN GURU ================ */

/**
 * DAFTAR SOAL KUIS.
 * Untuk menambah soal baru, salin satu blok objek lalu ubah isinya:
 *   subject  : nama topik (tampil di badge)
 *   image    : emoji sebagai ilustrasi/gambar soal
 *   question : teks pertanyaan
 *   options  : array pilihan jawaban (maksimal 4)
 *   answer   : nomor index jawaban BENAR (mulai dari 0)
 *   fact     : info tambahan yang tampil setelah menjawab
 */
const QUESTIONS = [
  {
    subject: "Matematika",
    image: "\u{1F9EE}",
    question: "Berapa hasil dari 7 + 8 ?",
    options: ["14", "15", "16", "17"],
    answer: 1,
    fact: "Ingat ya, 7 + 8 = 15. Bisa juga dihitung 10 + 5!"
  },
  {
    subject: "Matematika",
    image: "\u{1F522}",
    question: "Berapa hasil dari 9 \u00D7 6 ?",
    options: ["48", "54", "56", "63"],
    answer: 1,
    fact: "9 \u00D7 6 = 54. Triknya: 10 \u00D7 6 = 60, lalu kurangi 6."
  },
  {
    subject: "IPA",
    image: "\u{1F955}",
    question: "Hewan apa yang suka makan wortel?",
    options: ["Kucing", "Kelinci", "Kuda", "Ayam"],
    answer: 1,
    fact: "Kelinci terkenal suka wortel karena kaya vitamin A!"
  },
  {
    subject: "IPA",
    image: "\u{1F577}️",
    question: "Berapa jumlah kaki yang dimiliki laba-laba?",
    options: ["6 kaki", "8 kaki", "10 kaki", "4 kaki"],
    answer: 1,
    fact: "Laba-laba berkelas Arachnida dan memiliki 8 kaki."
  },
  {
    subject: "Bahasa Indonesia",
    image: "\u{1F321}️",
    question: "Apa lawan kata dari kata \"panas\"?",
    options: ["Terang", "Besar", "Dingin", "Tinggi"],
    answer: 2,
    fact: "Lawan kata panas adalah dingin. Contoh: siang panas, malam dingin."
  },
  {
    subject: "Bahasa Indonesia",
    image: "\u{1F60A}",
    question: "Apa sinonim (kata persamaan) dari kata \"senang\"?",
    options: ["Sedih", "Bahagia", "Marah", "Capek"],
    answer: 1,
    fact: "Senang = bahagia = gembira. Semuanya punya arti sama!"
  },
  {
    subject: "Pengetahuan Umum",
    image: "\u{1FA90}",
    question: "Planet apa yang paling dekat dengan Matahari?",
    options: ["Venus", "Bumi", "Merkurius", "Mars"],
    answer: 2,
    fact: "Merkurius adalah planet terdekat dengan Matahari."
  },
  {
    subject: "Pengetahuan Umum",
    image: "\u{1F333}",
    question: "Bagaimana cara yang benar menjaga kebersihan lingkungan?",
    options: [
      "Membuang sampah di sungai",
      "Memotong pohon sembarangan",
      "Membiarkan genangan air",
      "Menanam pohon dan memilah sampah"
    ],
    answer: 3,
    fact: "Menanam pohon dan memilah sampah membuat bumi tetap sehat!"
  }
];

/* Akun login halaman Area Guru (ubah sesuai kebutuhan) */
const TEACHER_ACCOUNT = {
  username: "guru",
  password: "guru123"
};

/* =============== (2) REFERENSI ELEMEN DOM ============================== */
const $ = (sel) => document.querySelector(sel);

const decorLayer    = $("#decorLayer");
const confettiLayer = $("#confettiLayer");
const fxFlash       = $("#fxFlash");
const fxEmoji       = $("#fxEmoji");

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
const statTotal     = $("#statTotal");
const statTopics    = $("#statTopics");
const statLastScore = $("#statLastScore");

/* =============== (3) STATUS / VARIABEL GLOBAL =========================== */
let currentIndex = 0;     // nomor soal yang sedang tampil (mulai dari 0)
let score        = 0;     // jumlah jawaban benar
let isAnswered   = false; // soal ini sudah dijawab atau belum
let lastScore    = null;  // skor terakhir (untuk dashboard guru)
let fxTimer      = null;  // timer menyembunyikan flash layar

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

/* Navigasi universal: setiap elemen dengan atribut data-page="id-halaman"
   akan berpindah halaman saat diklik. */
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

/** Memulai kuis dari awal (dipakai tombol "Mulai Bermain" & "Main Lagi"). */
function startQuiz() {
  currentIndex = 0;
  score = 0;
  showPage("page-quiz");
  renderQuestion();
}

/** Menampilkan soal sesuai currentIndex ke dalam kartu pertanyaan. */
function renderQuestion() {
  const q = QUESTIONS[currentIndex];
  isAnswered = false;

  /* Perbarui progress bar & chip skor */
  const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;
  progressFill.style.width = progress + "%";
  progressText.textContent = (currentIndex + 1) + "/" + QUESTIONS.length;
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
 * Menangani pemilihan jawaban: memberi warna hijau + konfeti bila benar,
 * atau getar (shake) warna merah muda + kunci jawaban bila salah.
 */
function chooseAnswer(selectedIndex) {
  if (isAnswered) return; // cegah jawaban ganda
  isAnswered = true;

  const q = QUESTIONS[currentIndex];
  const buttons = answersBox.querySelectorAll(".answer-btn");
  buttons.forEach((btn) => (btn.disabled = true));

  const isCorrect = selectedIndex === q.answer;

  if (isCorrect) {
    score++;
    buttons[selectedIndex].classList.add("correct");
    feedbackBox.className = "feedback ok";
    feedbackBox.innerHTML = "<b>🎉 Hebat! Jawabanmu benar!</b>" + q.fact;
    flashFx("ok");
    burstConfetti(45);
  } else {
    buttons[selectedIndex].classList.add("wrong");
    buttons[q.answer].classList.add("correct"); // tampilkan jawaban benar
    feedbackBox.className = "feedback no";
    feedbackBox.innerHTML =
      "<b>😅 Belum tepat, ayo coba lagi!</b>Jawaban yang benar: <b>" +
      q.options[q.answer] + "</b>. " + q.fact;
    flashFx("no");
  }

  scoreChip.textContent = "⭐ " + score;

  /* Tampilkan tombol lanjut */
  btnNext.textContent =
    currentIndex === QUESTIONS.length - 1 ? "Lihat Hasil 🎉" : "Lanjut ➡️";
  btnNext.classList.remove("hidden");

  /* Di HP, bila umpan balik terpotong layar, gulirkan ke situ */
  const rect = feedbackBox.getBoundingClientRect();
  if (rect.bottom > window.innerHeight) {
    feedbackBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/** Beralih ke soal berikutnya, atau membuka halaman hasil di soal terakhir. */
function nextQuestion() {
  if (!isAnswered) return;
  if (currentIndex < QUESTIONS.length - 1) {
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

/** Menampilkan skor akhir, bintang satu per satu, dan pesan motivasi. */
function showResult() {
  lastScore = score;
  showPage("page-result");

  const total = QUESTIONS.length;
  const ratio = score / total;

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
  animateNumber(scoreNumber, score, 1400);

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

/** Validasi form login guru: benar -> dashboard, salah -> efek getar. */
function handleLogin(event) {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const card = loginForm;

  if (!username || !password) {
    showLoginError("Username dan password wajib diisi!");
    shakeForm(card);
    return;
  }

  if (username === TEACHER_ACCOUNT.username && password === TEACHER_ACCOUNT.password) {
    loginError.classList.remove("show");
    loginError.textContent = "";
    loginForm.reset();
    renderDashboard();
    showPage("page-dashboard");
  } else {
    showLoginError("Ups! Username atau password salah 😅");
    shakeForm(card);
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

/** Mengisi data dashboard guru (statistik + daftar soal). */
function renderDashboard() {
  statTotal.textContent = QUESTIONS.length;
  statTopics.textContent = new Set(QUESTIONS.map((q) => q.subject)).size;
  statLastScore.textContent = lastScore === null ? "-" : lastScore + "/" + QUESTIONS.length;

  questionList.innerHTML = "";
  QUESTIONS.forEach((q, index) => {
    const li = document.createElement("li");
    li.style.animationDelay = (index * 0.06) + "s";
    li.innerHTML =
      '<span class="ql-num">' + (index + 1) + "</span>" +
      "<div><span class=\"ql-subj\">" + q.subject + "</span>" +
      '<p class="ql-text">' + q.question + "</p></div>";
    questionList.appendChild(li);
  });
}

/* =============== (10) INISIALISASI PROGRAM ============================ */

/** Mempersiapkan halaman saat dokumen selesai dimuat. */
function init() {
  splitTitle();
  createDecorations();
  scoreTotal.textContent = "benar dari " + QUESTIONS.length;

  /* Tombol memulai kuis */
  $("#btnStart").addEventListener("click", startQuiz);
  $("#btnReplay").addEventListener("click", startQuiz);
  $("#btnGuruMulai").addEventListener("click", startQuiz);

  /* Tombol lanjut */
  btnNext.addEventListener("click", nextQuestion);

  /* Form login guru */
  loginForm.addEventListener("submit", handleLogin);
  $("#btnLogout").addEventListener("click", () => {
    showPage("page-home");
    usernameInput.value = "";
    passwordInput.value = "";
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
