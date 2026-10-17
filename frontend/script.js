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
const adEmoji       = $("#adEmoji");
const adSubject     = $("#adSubject");
const qMaterial     = $("#qMaterial");
const qFact         = $("#qFact");
const qSet          = $("#qSet");
const btnCancelSoal = $("#btnCancelSoal");
const soalAdminList = $("#soalAdminList");
const soalCount     = $("#soalCount");

/* Input Pilihan Jawaban Visual (A-D) */
const optInput0          = $("#optInput0");
const optInput1          = $("#optInput1");
const optInput2          = $("#optInput2");
const optInput3          = $("#optInput3");
const optionsCreatorList = $("#optionsCreatorList");

/* Panel Atur Soal & Kunci Jawaban Kuis */
const quizQuestionsManager = $("#quizQuestionsManager");
const mgrSetTitle          = $("#mgrSetTitle");
const mgrSetMeta           = $("#mgrSetMeta");
const btnMgrAddQuestion    = $("#btnMgrAddQuestion");
const btnMgrClose          = $("#btnMgrClose");
const mgrQuestionsList     = $("#mgrQuestionsList");

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

/* Status form admin: daftar materi + id yang sedang diedit (null = mode tambah) */
let materiList      = [];
let setList         = [];
let editingMateriId = null;
let editingSetId    = null;
let editingSoalId   = null;
let activeManagerSetId = null;

/* =============== (3) HELPER API + TOAST ================================ */

/* Token JWT pengajar disimpan di localStorage setelah login berhasil. */
const TOKEN_KEY = "kuis.token";

/* Bila dibuka lewat Live Server (port 5500) / file://, arahkan API ke backend.
   Pakai 127.0.0.1 agar masih dianggap same-site, jadi cookie sesi kuis terkirim. */
const API_BASE =
  location.port === "5500" || location.protocol === "file:"
    ? "http://127.0.0.1:3000"
    : "";

/** Menyesuaikan path gambar agar valid baik saat dibuka via HTTP server maupun file:// */
function resolveImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const cleanUrl = url.replace(/ /g, "%20");
  if (location.protocol === "file:") {
    return cleanUrl.replace(/^\/+/, "");
  }
  return cleanUrl.startsWith("/") ? cleanUrl : "/" + cleanUrl;
}

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

/** Sanitasi string HTML untuk keamanan tampilan XSS. */
function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sistem Notifikasi Toast Modern & Profesional (UI/UX Best Practice).
 * Menampilkan kartu notifikasi mengambang di pojok kanan atas layar (desktop)
 * atau tengah atas layar (mobile) dengan ikon vektor Lucide, auto-dismiss,
 * dan animasi transisi halus tanpa emotikon kasar.
 *
 * @param {string} message - Pesan notifikasi
 * @param {"success"|"error"|"warning"|"info"|"copy"} [type] - Jenis status
 * @param {string} [title] - Judul singkat notifikasi
 * @param {number} [duration=3800] - Durasi tampil (ms)
 */
function showToast(message, type, title, duration) {
  if (!message) return;

  let detectedType = type;
  let detectedTitle = title;
  const rawText = String(message);

  // Bersihkan karakter emoji
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  let cleanMsg = rawText.replace(emojiRegex, "").trim();

  // Deteksi otomatis jika dipanggil dengan string sederhana
  if (!detectedType) {
    const lower = rawText.toLowerCase();
    if (rawText.includes("📋") || lower.includes("disalin") || lower.includes("kode kuis")) {
      detectedType = "copy";
      detectedTitle = detectedTitle || "Kode Kuis Disalin";
    } else if (rawText.includes("✅") || lower.includes("berhasil") || lower.includes("sukses")) {
      detectedType = "success";
      detectedTitle = detectedTitle || "Berhasil";
    } else if (rawText.includes("🗑️") || lower.includes("dihapus")) {
      detectedType = "info";
      detectedTitle = detectedTitle || "Dihapus";
    } else if (rawText.includes("⏳") || lower.includes("sedang") || lower.includes("memverifikasi")) {
      detectedType = "info";
      detectedTitle = detectedTitle || "Memproses";
    } else if (rawText.includes("⚠️") || lower.includes("gagal") || lower.includes("error") || lower.includes("tidak valid") || lower.includes("waktu habis")) {
      detectedType = lower.includes("waktu habis") ? "warning" : "error";
      detectedTitle = detectedTitle || (detectedType === "warning" ? "Waktu Habis" : "Perhatian");
    } else if (rawText.includes("ℹ️") || lower.includes("informasi")) {
      detectedType = "info";
      detectedTitle = detectedTitle || "Informasi";
    } else {
      detectedType = "info";
      detectedTitle = detectedTitle || "Pemberitahuan";
    }
  }

  if (!detectedTitle) {
    const defaultTitles = {
      copy: "Kode Kuis Disalin",
      success: "Berhasil",
      error: "Terjadi Kesalahan",
      warning: "Perhatian",
      info: "Informasi"
    };
    detectedTitle = defaultTitles[detectedType] || "Pemberitahuan";
  }

  const iconMap = {
    copy: "clipboard-check",
    success: "check-circle-2",
    error: "alert-circle",
    warning: "alert-triangle",
    info: "info"
  };
  const iconName = iconMap[detectedType] || "info";

  let container = document.getElementById("toastContainer") || document.getElementById("toast");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    document.body.appendChild(container);
  }
  container.className = "toast-container";
  container.setAttribute("role", "region");
  container.setAttribute("aria-label", "Pemberitahuan");
  container.setAttribute("aria-live", "polite");

  let htmlMsg = cleanMsg;
  if (!htmlMsg.includes("toast-code-hl") && detectedType === "copy") {
    htmlMsg = htmlMsg.replace(/([A-Z0-9]{6})/g, '<strong class="toast-code-hl">$1</strong>');
  }

  const toastCard = document.createElement("div");
  toastCard.className = `toast-card toast-${detectedType}`;
  toastCard.setAttribute("role", "alert");
  toastCard.innerHTML = `
    <div class="toast-icon-wrap" aria-hidden="true">
      <i data-lucide="${iconName}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-header">
        <h4 class="toast-title">${escapeHtml(detectedTitle)}</h4>
        <button type="button" class="toast-close" aria-label="Tutup notifikasi">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="toast-desc">${htmlMsg}</div>
    </div>
    <div class="toast-progress">
      <div class="toast-progress-bar" style="animation-duration: ${duration || 3800}ms;"></div>
    </div>
  `;

  while (container.children.length >= 3) {
    container.removeChild(container.firstChild);
  }

  container.appendChild(toastCard);

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons({ root: toastCard });
  }

  let dismissTimeout = null;
  const animDuration = duration || 3800;

  function dismissToast() {
    if (toastCard.classList.contains("toast-leaving")) return;
    toastCard.classList.add("toast-leaving");
    setTimeout(() => {
      if (toastCard.parentNode) {
        toastCard.parentNode.removeChild(toastCard);
      }
    }, 240);
  }

  dismissTimeout = setTimeout(dismissToast, animDuration);

  const closeBtn = toastCard.querySelector(".toast-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearTimeout(dismissTimeout);
      dismissToast();
    });
  }

  toastCard.addEventListener("mouseenter", () => {
    clearTimeout(dismissTimeout);
    const pb = toastCard.querySelector(".toast-progress-bar");
    if (pb) pb.style.animationPlayState = "paused";
  });

  toastCard.addEventListener("mouseleave", () => {
    const pb = toastCard.querySelector(".toast-progress-bar");
    if (pb) pb.style.animationPlayState = "running";
    dismissTimeout = setTimeout(dismissToast, 1600);
  });
}

/** Mengatur radio pilihan jawaban benar pada form pembuat soal. */
function setSelectedCorrectRadio(targetIdx) {
  const num = Number(targetIdx);
  const radios = document.querySelectorAll('input[name="optCorrectRadio"]');
  radios.forEach((r) => {
    const isChecked = Number(r.value) === num;
    r.checked = isChecked;
    const parent = r.closest(".option-create-item");
    if (parent) {
      parent.classList.toggle("is-correct", isChecked);
    }
  });
}

/** Mengambil indeks (0..3) opsi jawaban benar yang sedang dicentang. */
function getSelectedCorrectRadio() {
  const checked = document.querySelector('input[name="optCorrectRadio"]:checked');
  return checked ? Number(checked.value) : 0;
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
  if (pageId === "page-login") {
    if (getToken()) {
      renderDashboard().then(() => {
        showPage("page-dashboard");
      }).catch(() => {
        clearToken();
        openLoginModal();
      });
    } else {
      openLoginModal();
    }
    return;
  }
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  // Update status link aktif di header navigasi
  document.querySelectorAll(".home-nav .nav-link").forEach((link) => {
    const linkPage = link.dataset.page;
    if (pageId === "page-dashboard") {
      link.classList.toggle("active", linkPage === "page-dashboard" || linkPage === "page-login");
    } else if (pageId === "page-home" || pageId === "page-quiz" || pageId === "page-result") {
      link.classList.toggle("active", linkPage === "page-home");
    }
  });
}

/* Navigasi universal: elemen dengan data-page="id-halaman" berpindah halaman. */
document.addEventListener("click", async (event) => {
  const trigger = event.target.closest("[data-page]");
  if (trigger) {
    const pageId = trigger.dataset.page;
    if (pageId === "page-login") {
      if (!document.getElementById("modalLogin")) {
        // Jika tidak ada modal di halaman ini (seperti di register.html), biarkan tautan bernavigasi ke index.html#page-login
        return;
      }
      event.preventDefault();
      if (getToken()) {
        try {
          await renderDashboard();
          showPage("page-dashboard");
        } catch (err) {
          clearToken();
          openLoginModal();
        }
      } else {
        openLoginModal();
      }
    } else if (pageId === "page-home") {
      if (document.getElementById("page-home")) {
        event.preventDefault();
        closeLoginModal();
        showPage("page-home");
      }
    } else {
      closeLoginModal();
      showPage(pageId);
    }
  }
});

/* =============== (5) HIASAN: JUDUL & LATAR ============================= */

/** Memecah judul menjadi per kata / huruf dengan transisi elegan */
function splitTitle() {
  const titleEl = $("#mainTitle");
  if (!titleEl) return;
  // Tetapkan teks asli tanpa warna pelangi acak
  const text = titleEl.textContent.trim();
  titleEl.innerHTML = "";
  [...text].forEach((char, index) => {
    const span = document.createElement("span");
    span.className = "t-letter";
    span.textContent = char === " " ? "\u00A0" : char;
    titleEl.appendChild(span);
  });
}

/** Membuat ornamen edukasi melayang di latar belakang (buku, topi toga, pensil, rumus) */
function createDecorations() {
  const decorItems = [
    { type: "icon", name: "book-open" },
    { type: "icon", name: "graduation-cap" },
    { type: "icon", name: "pencil" },
    { type: "icon", name: "compass" },
    { type: "icon", name: "shapes" },
    { type: "icon", name: "award" },
    { type: "symbol", text: "π" },
    { type: "symbol", text: "∑" },
    { type: "symbol", text: "√" },
    { type: "symbol", text: "A+" }
  ];
  if (!decorLayer) return;
  decorLayer.innerHTML = "";
  const positions = [
    { l: 4, t: 12 }, { l: 92, t: 18 }, { l: 8, t: 48 }, { l: 90, t: 55 },
    { l: 15, t: 82 }, { l: 85, t: 80 }, { l: 50, t: 8 }, { l: 30, t: 30 }
  ];
  positions.forEach((pos, i) => {
    const item = decorItems[i % decorItems.length];
    const el = document.createElement("div");
    el.className = "decor decor-edu";
    el.style.left = pos.l + "%";
    el.style.top = pos.t + "%";
    el.style.animationDelay = (i * 0.7) + "s";
    if (item.type === "icon") {
      el.innerHTML = `<i data-lucide="${item.name}"></i>`;
    } else {
      el.textContent = item.text;
    }
    decorLayer.appendChild(el);
  });
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

/* =============== (6) LOGIKA KUIS ======================================= */

let currentQuizSetId = null;

/**
 * Validasi nama siswa lalu buka modal permintaan kode kuis
 */
function onStartQuizClick() {
  const nameInput = $("#studentName");
  const errEl = $("#studentNameError");
  const studentName = nameInput ? nameInput.value.trim() : "";
  if (!studentName) {
    if (errEl) {
      errEl.classList.remove("hidden");
    }
    if (nameInput) {
      nameInput.classList.add("is-invalid");
      const group = nameInput.closest(".student-input-group");
      if (group) {
        group.classList.remove("shake");
        void group.offsetWidth;
        group.classList.add("shake");
      }
      nameInput.focus();
      nameInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }
  if (errEl) errEl.classList.add("hidden");
  if (nameInput) nameInput.classList.remove("is-invalid");
  showSetModal();
}

/**
 * Menampilkan modal masukkan kode kuis
 */
function showSetModal() {
  const modal = $("#modalJoinQuiz");
  const input = $("#joinCodeInput");
  const error = $("#joinError");
  if (!modal) return;
  
  modal.classList.add("show");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 100);
  }
  if (error) {
    error.innerHTML = "";
    error.classList.remove("show");
  }
}

/**
 * Menutup modal kode kuis
 */
function hideSetModal() {
  const modal = $("#modalJoinQuiz");
  if (modal) modal.classList.remove("show");
}

/**
 * Menampilkan popup modal verifikasi login Kreator Soal dengan efek pop & latar belakang ngeblur
 */
function openLoginModal() {
  const modal = $("#modalLogin");
  if (!modal) return;

  // Pastikan halaman aktif (misal home) terlihat di latar belakang agar tampak efek blur
  let activePage = document.querySelector(".page.active");
  if (!activePage || activePage.id === "page-login") {
    const homePage = document.getElementById("page-home");
    if (homePage) {
      if (activePage) activePage.classList.remove("active");
      homePage.classList.add("active");
    }
  }

  modal.classList.add("show");
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("login-modal-open");

  if (loginError) {
    loginError.classList.remove("show");
    loginError.innerHTML = "";
  }

  if (typeof initGoogleSignIn === "function") {
    initGoogleSignIn();
  }

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  // Fokuskan input bila form manual sudah terbuka
  const uInput = $("#username");
  const mForm = $("#loginForm");
  if (uInput && mForm && mForm.style.display !== "none") {
    setTimeout(() => uInput.focus(), 150);
  }
}

/**
 * Menutup popup modal verifikasi login Kreator Soal dan menghilangkan blur latar
 */
function closeLoginModal() {
  const modal = $("#modalLogin");
  if (!modal) return;

  modal.classList.remove("show");
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("login-modal-open");

  if (loginError) {
    loginError.classList.remove("show");
    loginError.innerHTML = "";
  }

  if (window.location.hash === "#page-login" || window.location.hash === "#creator") {
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }
}

/**
 * Memproses dan memvalidasi kode kuis 6-karakter dari guru/kreator soal
 */
async function handleJoinCodeSubmit() {
  const input = $("#joinCodeInput");
  const error = $("#joinError");
  const btn = $("#btnSubmitJoin");
  if (!input) return;

  const code = input.value.trim().toUpperCase();

  if (code.length !== 6) {
    if (error) {
      error.innerHTML = '<i data-lucide="alert-circle"></i><span>Kode kuis harus terdiri dari 6 karakter.</span>';
      error.classList.add("show");
      if (window.lucide && typeof lucide.createIcons === "function") {
        lucide.createIcons({ root: error });
      }
    }
    input.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Mencari kuis...</span>';
  }
  if (error) {
    error.innerHTML = "";
    error.classList.remove("show");
  }

  try {
    const data = await api("/api/sets/code/" + encodeURIComponent(code));
    if (!data || !data.set || !data.set.id) {
      throw new Error("Set kuis tidak ditemukan.");
    }

    hideSetModal();
    startQuiz(data.set.id);
  } catch (err) {
    if (error) {
      error.innerHTML = '<i data-lucide="alert-circle"></i><span>' + escapeHtml(err.message || "Kode kuis tidak valid atau belum dipublikasikan oleh guru.") + '</span>';
      error.classList.add("show");
      if (window.lucide && typeof lucide.createIcons === "function") {
        lucide.createIcons({ root: error });
      }
    }
    input.focus();
    input.select();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Mulai Kuis</span> <i data-lucide="arrow-right"></i>';
      if (window.lucide && typeof lucide.createIcons === "function") {
        lucide.createIcons();
      }
    }
  }
}

/**
 * Memulai kuis berdasarkan set soal (wajib diverifikasi lewat kode kuis)
 */
async function startQuiz(forceSetId = null) {
  /* Jika dipanggil dari event listener biasa tanpa setId, minta kode kuis */
  if (typeof forceSetId !== "number" && typeof forceSetId !== "string") {
    forceSetId = null;
  }

  if (!forceSetId) {
    onStartQuizClick();
    return;
  }

  const setId = Number(forceSetId);
  currentQuizSetId = setId;

  const btnStart = $("#btnStart");
  const labelBefore = btnStart ? btnStart.innerHTML : "";

  if (btnStart) {
    btnStart.disabled = true;
    btnStart.innerHTML = '<span>⏳ Memuat soal...</span>';
  }

  const questionUrl = "/api/questions?setId=" + setId;
  const startBody = { setId: setId };

  try {
    const [startData, listData] = await Promise.all([
      api("/api/quiz/start", {
        method: "POST",
        body: JSON.stringify(startBody)
      }),
      api(questionUrl)
    ]);

    const list = Array.isArray(listData) ? listData : listData.questions;
    if (!list || !list.length) throw new Error("Belum ada soal pada set kuis ini.");

    questions = list;
    currentIndex = 0;
    score = 0;
    showPage("page-quiz");
    renderQuestion();

    /* Mulai timer jika ada batas waktu */
    const quizTimer = $("#quizTimer");
    if (startData.timeLimit > 0) {
      timeRemaining = startData.timeLimit * 60;
      if (quizTimer) quizTimer.classList.remove("hidden");
      updateTimerDisplay();
      
      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        if (timeRemaining <= 0) {
          clearInterval(timerInterval);
          showToast("Waktu pengerjaan kuis telah habis.", "warning", "Waktu Habis");
          showResult();
        }
      }, 1000);
    } else {
      if (quizTimer) quizTimer.classList.add("hidden");
      clearInterval(timerInterval);
    }
  } catch (err) {
    showToast(
      err.message && err.message !== "Belum ada soal pada set kuis ini."
        ? err.message
        : "Gagal memuat kuis. Pastikan server aktif dan soal sudah dibuat oleh guru.",
      "error",
      "Gagal Memuat Kuis"
    );
  } finally {
    if (btnStart) {
      btnStart.disabled = false;
      btnStart.innerHTML = labelBefore;
      if (window.lucide && typeof lucide.createIcons === "function") {
        lucide.createIcons();
      }
    }
  }
}

/** Memperbarui tampilan timer kuis */
function updateTimerDisplay() {
  const quizTimer = $("#quizTimer");
  if (!quizTimer) return;
  const m = Math.floor(timeRemaining / 60).toString().padStart(2, "0");
  const s = (timeRemaining % 60).toString().padStart(2, "0");
  quizTimer.innerHTML = '<i data-lucide="clock" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i><span>' + m + ":" + s + '</span>';
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons({ root: quizTimer });
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
  questionCard.classList.remove("card-in", "card-shake");
  scoreChip.classList.remove("score-bump");
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
 * Benar  -> efek suara ceria, animasi popup selebrasi, partikel kilau tombol, getar chip skor, konfeti.
 * Salah  -> efek suara lembut, animasi kartu bergetar (shake), partikel tombol, kunci jawaban ditampilkan.
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
    showToast(err.status === 400 ? err.message : "Gagal mengirim jawaban, silakan coba lagi.", "error", "Koneksi Bermasalah");
    return;
  }

  score = result.score;

  // Efek audio & visual animasi interaktif
  playQuizSound(result.correct ? "correct" : "wrong");
  showAnswerAnimation(result.correct);
  if (buttons[selectedIndex]) {
    spawnButtonParticles(buttons[selectedIndex], result.correct);
  }

  if (result.correct) {
    buttons[selectedIndex].classList.add("correct");
    feedbackBox.className = "feedback ok";
    feedbackBox.innerHTML = "<b>🎉 Hebat! Jawabanmu benar!</b>" + (result.fact ? "<br>" + result.fact : "");
    burstConfetti(45);
    scoreChip.classList.remove("score-bump");
    void scoreChip.offsetWidth;
    scoreChip.classList.add("score-bump");
  } else {
    buttons[selectedIndex].classList.add("wrong");
    if (buttons[result.correctIndex]) {
      buttons[result.correctIndex].classList.add("correct"); // tampilkan jawaban benar
    }
    feedbackBox.className = "feedback no";
    feedbackBox.innerHTML =
      "<b>😅 Belum tepat, ayo coba lagi!</b>Jawaban yang benar: <b>" +
      q.options[result.correctIndex] + "</b>. " + (result.fact ? "<br>" + result.fact : "");
    if (questionCard) {
      questionCard.classList.remove("card-shake");
      void questionCard.offsetWidth;
      questionCard.classList.add("card-shake");
    }
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

/* =============== (7) ANIMASI & AUDIO INTERAKTIF ========================= */

let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Memainkan efek audio sintetis Web Audio API saat menjawab benar/salah */
function playQuizSound(type) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === "correct") {
      // Arpeggio nada riang ceria: C5 -> E5 -> G5 -> C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.07);

        gain.gain.setValueAtTime(0, now + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.33);
      });
    } else {
      // Nada lembut tanda belum tepat
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.28);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.31);
    }
  } catch (_) {
    /* Abaikan jika browser membatasi autoplay audio */
  }
}

/** Memunculkan ledakan partikel berkilau pada tombol jawaban */
function spawnButtonParticles(buttonElement, isCorrect) {
  if (!buttonElement) return;
  const count = 12;
  const colors = isCorrect
    ? ["#22c55e", "#10b981", "#3b82f6", "#eab308", "#f59e0b"]
    : ["#ef4444", "#f43f5e", "#fb7185", "#cbd5e1"];

  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "btn-sparkle-particle";
    const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.4 - 0.2);
    const dist = 32 + Math.random() * 40;
    const dx = Math.cos(angle) * dist + "px";
    const dy = Math.sin(angle) * dist + "px";
    const size = 6 + Math.random() * 6;

    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = "50%";
    p.style.top = "50%";
    p.style.setProperty("--dx", dx);
    p.style.setProperty("--dy", dy);

    buttonElement.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}

/** Menampilkan overlay animasi pop-up tengah layar dengan sunburst */
let animOverlayTimer = null;
function showAnswerAnimation(isCorrect) {
  const overlay = document.getElementById("quizAnimOverlay");
  if (!overlay) return;

  if (animOverlayTimer) {
    clearTimeout(animOverlayTimer);
    animOverlayTimer = null;
  }

  const badgeClass = isCorrect ? "correct" : "wrong";
  const iconEmoji = isCorrect ? "🎉" : "💪";
  const titleText = isCorrect ? "Luar Biasa!" : "Hampir Benar!";
  const subText = isCorrect ? "+1 Bintang Ditambahkan!" : "Ayo pelajari kembali materi ini!";

  const animFloatingHtml = isCorrect
    ? `<span class="anim-sparkle" style="top:10%;left:15%;animation-delay:0.1s">🎉</span>
       <span class="anim-sparkle" style="top:15%;right:15%;animation-delay:0.2s">⭐</span>
       <span class="anim-sparkle" style="bottom:15%;left:20%;animation-delay:0.15s">🎯</span>
       <span class="anim-sparkle" style="bottom:12%;right:20%;animation-delay:0.25s">👏</span>`
    : `<span class="anim-sparkle" style="top:12%;left:18%;animation-delay:0.1s">💭</span>
       <span class="anim-sparkle" style="top:15%;right:18%;animation-delay:0.2s">💡</span>`;

  overlay.innerHTML = `
    <div class="answer-anim-popup ${badgeClass}">
      <div class="anim-sunburst"></div>
      <div class="anim-icon-ring">${iconEmoji}</div>
      <div class="anim-text-title">${titleText}</div>
      <div class="anim-text-sub">${subText}</div>
      ${animFloatingHtml}
    </div>
  `;

  overlay.classList.add("active");

  animOverlayTimer = setTimeout(() => {
    overlay.classList.remove("active");
    overlay.innerHTML = "";
  }, 1100);
}

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
  clearInterval(timerInterval);
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
    showToast("Skor akhir tetap tampil, namun belum tersimpan di server.", "info", "Koneksi Tersendat");
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

let googleClientId = "";
let googleClientInitialized = false;

/** Inisialisasi Google Identity Services (GIS) untuk Login Pengajar */
function initGoogleSignIn() {
  const container = document.getElementById("googleBtnContainer");
  if (!container) return;

  // Tunggu pustaka GIS siap bila dimuat secara asynchronous
  if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (typeof google !== "undefined" && google.accounts && google.accounts.id) {
        clearInterval(interval);
        setupGoogleButton();
      } else if (attempts >= 30) {
        clearInterval(interval);
        if (container && (!googleClientId || !container.querySelector("iframe"))) {
          container.innerHTML = `
            <div class="google-offline-note">
              <i data-lucide="wifi-off"></i>
              <span>Layanan Google Identity belum dapat dimuat. Silakan gunakan login manual.</span>
            </div>
          `;
          if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
          }
        }
      }
    }, 150);
    return;
  }

  setupGoogleButton();
}

async function setupGoogleButton() {
  const container = document.getElementById("googleBtnContainer");
  if (!container) return;

  try {
    if (!googleClientId) {
      try {
        const res = await api("/api/auth/google/client-id");
        if (res && (res.clientId || (res.data && res.data.clientId))) {
          googleClientId = res.clientId || (res.data && res.data.clientId);
        }
      } catch (fetchErr) {
        console.warn("[Google Auth] Gagal mengambil Client ID:", fetchErr);
      }
    }

    if (!googleClientId) {
      container.innerHTML = `
        <div class="google-offline-note">
          <i data-lucide="info"></i>
          <span>Google Client ID belum dikonfigurasi di server. Silakan masuk manual.</span>
        </div>
      `;
      const manualForm = $("#loginForm");
      const btnToggle = $("#btnToggleManualLogin");
      if (manualForm) manualForm.style.display = "block";
      if (btnToggle) btnToggle.classList.add("active");
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
      return;
    }

    if (!googleClientInitialized && typeof google !== "undefined" && google.accounts?.id) {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });
      googleClientInitialized = true;
    }

    if (typeof google !== "undefined" && google.accounts?.id) {
      container.innerHTML = "";
      google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width: 320
      });
    }
  } catch (err) {
    console.error("[Google Auth Error]", err);
  }
}

/** Callback respons kredensial dari Google Identity Services */
async function handleGoogleCredentialResponse(response) {
  if (!response || !response.credential) {
    showLoginError("Gagal menerima kredensial dari akun Google.");
    return;
  }

  const loadingEl = $("#googleAuthLoading");
  if (loadingEl) loadingEl.classList.remove("hidden");
  if (loginError) loginError.classList.remove("show");

  try {
    showToast("Sedang memverifikasi kredensial Google...", "info", "Menghubungkan Akun");

    const data = await api("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential: response.credential })
    });

    saveToken(data.token);

    closeLoginModal();
    const teacherName = data.teacher?.fullName || data.teacher?.username || "Pengajar";
    showToast("Selamat datang di Kreator Soal, " + escapeHtml(teacherName) + "!", "success", "Berhasil Masuk");

    await renderDashboard();
    showPage("page-dashboard");
  } catch (err) {
    showLoginError(err.message || "Login Google gagal, silakan coba lagi.");
    showToast(err.message || "Gagal masuk dengan Google", "error", "Login Gagal");
  } finally {
    if (loadingEl) loadingEl.classList.add("hidden");
  }
}

window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;

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

    closeLoginModal();
    loginError.classList.remove("show");
    loginError.innerHTML = "";
    loginForm.reset();

    const teacherName = data.teacher?.fullName || data.teacher?.username || "Pengajar";
    showToast("Selamat datang di Kreator Soal, " + escapeHtml(teacherName) + "!", "success", "Berhasil Masuk");

    await renderDashboard();
    showPage("page-dashboard");
  } catch (err) {
    showLoginError(err.message || "Login gagal, coba lagi.");
    shakeForm(loginForm);
  }
}

/** Menampilkan pesan error validasi login. */
function showLoginError(message) {
  if (!loginError) return;
  loginError.innerHTML = '<i data-lucide="alert-circle"></i><span>' + escapeHtml(message) + '</span>';
  loginError.classList.add("show");
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons({ root: loginError });
  }
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
    showToast("Selamat datang, " + escapeHtml(namaGuru) + "! Akun Anda berhasil dibuat.", "success", "Registrasi Berhasil");
    registerForm.reset();
    registerError.classList.remove("show");
    registerError.innerHTML = "";

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
    if (avatar) {
      avatar.innerHTML = '<i data-lucide="user-plus"></i>';
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    }
  } else {
    tabRegister.classList.remove("active");
    tabRegister.setAttribute("aria-selected", "false");
    tabLogin.classList.add("active");
    tabLogin.setAttribute("aria-selected", "true");
    formRegister.style.display = "none";
    formLogin.style.display = "block";
    if (avatar) {
      avatar.innerHTML = '<i data-lucide="shield-check"></i>';
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    }
  }
}

/** Menampilkan pesan error validasi registrasi. */
function showRegisterError(message) {
  if (!registerError) return;
  registerError.innerHTML = '<i data-lucide="alert-circle"></i><span>' + escapeHtml(message) + '</span>';
  registerError.classList.add("show");
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons({ root: registerError });
  }
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
      const teacherEmailEl = $("#dashTeacherEmail");
      const teacherAvatarEl = $("#dashTeacherAvatar");
      const teacherAvatarFallbackEl = $("#dashTeacherAvatarFallback");
      const teacherInitialsEl = $("#dashTeacherInitials");

      if (meData && meData.teacher) {
        const fullName = meData.teacher.fullName || meData.teacher.username || "Guru";
        if (teacherNameEl) {
          teacherNameEl.textContent = fullName;
        }
        if (teacherEmailEl && meData.teacher.email) {
          teacherEmailEl.textContent = meData.teacher.email + " • Pengajar";
        }
        if (teacherInitialsEl) {
          const parts = fullName.trim().split(/\s+/).filter(Boolean);
          const initials = parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : fullName.slice(0, 2).toUpperCase();
          teacherInitialsEl.textContent = initials || "G";
        }
        if (teacherAvatarEl) {
          if (meData.teacher.avatarUrl) {
            teacherAvatarEl.referrerPolicy = "no-referrer";
            teacherAvatarEl.onload = () => {
              teacherAvatarEl.classList.remove("hidden");
              if (teacherAvatarFallbackEl) teacherAvatarFallbackEl.classList.add("hidden");
            };
            teacherAvatarEl.onerror = () => {
              teacherAvatarEl.classList.add("hidden");
              if (teacherAvatarFallbackEl) teacherAvatarFallbackEl.classList.remove("hidden");
            };
            teacherAvatarEl.src = meData.teacher.avatarUrl;
          } else {
            teacherAvatarEl.classList.add("hidden");
            if (teacherAvatarFallbackEl) teacherAvatarFallbackEl.classList.remove("hidden");
          }
        }
      }
    } catch (_) { /* abaikan jika gagal memuat profil */ }

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
        const waktu = new Date(r.created_at).toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          weekday: "long", day: "numeric", month: "long", year: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit"
        }) + " WIB";
        li.innerHTML =
          '<span class="ql-num">🏅</span>' +
          "<div><strong>" + (r.student_name || "Siswa") + " — " + r.score + "/" + r.total + " benar</strong>" +
          '<p class="ql-text">' + (r.material_title || "Semua materi") + " • " + waktu + "</p></div>";
        resultsList.appendChild(li);
      });
    }

    /* Muat data form admin (materi & soal) */
    await loadAdminData();
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  } catch (err) {
    if (err.status === 401) {
      clearToken();
      showPage("page-home");
      openLoginModal();
      showLoginError("Sesi berakhir, silakan login lagi.");
    } else {
      showToast("Gagal memuat profil pengajar. Silakan muat ulang halaman.", "error", "Gagal Memuat Data");
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
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

/** Pesan error kecil di dalam form admin. */
function showFormError(box, message) {
  if (!box) return;
  if (message) {
    box.innerHTML = '<i data-lucide="alert-circle"></i><span>' + escapeHtml(message) + '</span>';
    box.classList.add("show");
    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons({ root: box });
    }
  } else {
    box.innerHTML = "";
    box.classList.remove("show");
  }
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
    if (materiAdminList && materiCount) renderMateriAdmin();
    renderSetAdmin();
    renderSoalAdmin(soalData.questions || []);
    fillMaterialSelect();
    fillSetSelect();
    fillSetMaterialSelect();
    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
  } catch (err) {
    if (err.status === 401) return; // biarkan renderDashboard yang menangani
    showToast("Gagal memuat data dashboard pengajar.", "error", "Gagal Memuat Data");
  }
}

/* ------------------------- DAFTAR MATERI ------------------------------- */

function renderMateriAdmin() {
  if (!materiCount || !materiAdminList) return;
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
          ? '<img src="' + resolveImageUrl(material.image_url) + '" alt="">'
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
  if (!materiForm || !materiFormTitle) return;
  editingMateriId = material.id;
  materiFormTitle.textContent = "✏️ Ubah Materi: " + material.title;
  mTitle.value = material.title;
  mSummary.value = material.summary || "";
  mSubject.value = material.subject || "";
  mEmoji.value = material.emoji || "📘";
  mImage.value = material.image_url || "";
  mContent.value = material.content || "";
  mPublish.checked = material.is_published;
  if (btnCancelMateri) btnCancelMateri.hidden = false;
  showFormError(materiError, "");
  switchTab("tabMateri");
  materiForm.scrollIntoView({ behavior: "smooth", block: "center" });
  mTitle.focus();
}

/** Kembali ke mode tambah materi. */
function resetMateriForm() {
  if (!materiForm || !materiFormTitle) return;
  editingMateriId = null;
  materiFormTitle.textContent = "➕ Tambah Materi Baru";
  materiForm.reset();
  mEmoji.value = "📘";
  mPublish.checked = true;
  if (btnCancelMateri) btnCancelMateri.hidden = true;
  showFormError(materiError, "");
}

/* --------------------------- DAFTAR SOAL -------------------------------- */

function renderSoalAdmin(questions) {
  soalCount.textContent = questions.length;
  soalAdminList.innerHTML = "";

  if (!questions.length) {
    soalAdminList.innerHTML =
      '<li class="admin-empty">Belum ada butir soal. Mulai tulis soal pertama Anda menggunakan formulir di sebelah kiri.</li>';
    return;
  }

  questions.forEach((question, index) => {
    const li = document.createElement("li");
    li.className = "claude-soal-item";
    li.style.animationDelay = index * 0.04 + "s";
    li.innerHTML =
      '<span class="admin-thumb">' + (question.image || "❓") + "</span>" +
      '<div class="admin-info">' +
        '<div class="admin-q-head">' +
          "<strong>" + escapeHtml(question.question) + "</strong>" +
        "</div>" +
        "<small>" +
          '<span class="claude-pill-tag">' + escapeHtml(question.subject || "Umum") + "</span>" +
          (question.material_title
            ? ' <span class="claude-meta-chunk">📚 ' + escapeHtml(question.material_title) + "</span>"
            : "") +
          (question.quiz_set_title
            ? ' <span class="claude-meta-chunk">📋 ' + escapeHtml(question.quiz_set_title) + "</span>"
            : "") +
        "</small>" +
      "</div>" +
      '<div class="admin-actions">' +
        '<button class="icon-mini edit" type="button" title="Ubah soal" data-action="edit-q" data-id="' + question.id + '"><i data-lucide="edit-3"></i></button>' +
        '<button class="icon-mini danger" type="button" title="Hapus soal" data-action="delete-q" data-id="' + question.id + '"><i data-lucide="trash-2"></i></button>' +
      "</div>";

    soalAdminList.appendChild(li);
  });

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

/** Isi form soal dari data yang dipilih (mode ubah). */
function editSoal(question) {
  editingSoalId = question.id;
  soalFormTitle.textContent = "Ubah Soal";
  qQuestion.value = question.question || "";

  const opts = Array.isArray(question.options) ? question.options : [];
  const inputs = [$("#optInput0"), $("#optInput1"), $("#optInput2"), $("#optInput3")];
  inputs.forEach((inp, idx) => {
    if (inp) inp.value = opts[idx] || "";
  });

  setSelectedCorrectRadio(question.answer ?? 0);

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
  soalFormTitle.textContent = "Tambah Soal Baru";
  soalForm.reset();
  const inputs = [$("#optInput0"), $("#optInput1"), $("#optInput2"), $("#optInput3")];
  inputs.forEach((inp) => {
    if (inp) inp.value = "";
  });
  setSelectedCorrectRadio(0);
  adEmoji.value = "❓";
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
      '<li class="set-empty-card">' +
        '<div class="set-empty-icon"><i data-lucide="layers"></i></div>' +
        '<h5 class="set-empty-title">Belum Ada Paket Kuis</h5>' +
        '<p class="set-empty-desc">Mulai buat paket kuis pertama Anda melalui formulir di samping untuk membagikan kode akses kepada siswa.</p>' +
      '</li>';
    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
    return;
  }

  setList.forEach(function (set, index) {
    var li = document.createElement("li");
    li.className = "set-card-item";
    li.style.animationDelay = index * 0.04 + "s";

    var codeHtml = set.access_code
      ? '<div class="set-code-badge">' +
          '<i data-lucide="key-round" class="set-code-icon"></i>' +
          '<span class="set-code-lbl">Kode:</span>' +
          '<strong class="set-code-val">' + escapeHtml(set.access_code) + '</strong>' +
          '<button class="btn-copy-code" type="button" data-action="copy-code" data-id="' + set.id + '" data-code="' + escapeHtml(set.access_code) + '" title="Salin kode kuis ke papan klip">' +
            '<i data-lucide="copy"></i><span>Salin</span>' +
          '</button>' +
        '</div>'
      : '';

    var statusHtml = set.is_published
      ? '<span class="set-status-pill published"><i data-lucide="globe"></i><span>Publik</span></span>'
      : '<span class="set-status-pill draft"><i data-lucide="lock"></i><span>Draf</span></span>';

    var timeHtml = set.time_limit > 0
      ? '<span class="set-meta-pill"><i data-lucide="clock-3"></i><span>' + set.time_limit + ' Menit</span></span>'
      : '';

    var questionsHtml = '<span class="set-meta-pill"><i data-lucide="help-circle"></i><span>' + set.question_count + ' Soal</span></span>';

    var descHtml = set.description
      ? '<p class="set-card-desc" title="' + escapeHtml(set.description) + '">' + escapeHtml(set.description) + '</p>'
      : '';

    var toggleTitle = set.is_published ? "Sembunyikan (Ubah ke Draf)" : "Publikasikan untuk Siswa";
    var toggleIcon = set.is_published ? "eye-off" : "eye";

    li.innerHTML =
      '<div class="set-card-main">' +
        '<div class="set-card-thumb" aria-hidden="true">' +
          '<i data-lucide="layers"></i>' +
        '</div>' +
        '<div class="set-card-body">' +
          '<div class="set-card-headline">' +
            '<h5 class="set-card-title">' + escapeHtml(set.title) + '</h5>' +
            statusHtml +
          '</div>' +
          descHtml +
          '<div class="set-card-meta">' +
            questionsHtml +
            timeHtml +
            codeHtml +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="set-card-actions">' +
        '<button class="btn-manage-q" type="button" title="Kelola butir soal dan kunci jawaban kuis ini" data-action="manage-questions" data-id="' + set.id + '">' +
          '<i data-lucide="sliders-horizontal"></i>' +
          '<span>Atur Soal</span>' +
          '<span class="set-q-count-badge">' + set.question_count + '</span>' +
        '</button>' +
        '<div class="set-action-buttons">' +
          '<button class="action-btn-ui edit" type="button" title="Ubah nama & pengaturan set kuis" data-action="edit-set" data-id="' + set.id + '">' +
            '<i data-lucide="pen-line"></i>' +
          '</button>' +
          '<button class="action-btn-ui" type="button" title="' + toggleTitle + '" data-action="toggle-set" data-id="' + set.id + '">' +
            '<i data-lucide="' + toggleIcon + '"></i>' +
          '</button>' +
          '<button class="action-btn-ui danger" type="button" title="Hapus set kuis" data-action="delete-set" data-id="' + set.id + '">' +
            '<i data-lucide="trash-2"></i>' +
          '</button>' +
        '</div>' +
      '</div>';

    setAdminList.appendChild(li);
  });
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

/** Buka panel atur soal & jawaban kuis */
async function openQuizQuestionsManager(setId) {
  const set = setList.find((s) => s.id === setId);
  if (!set) return;

  activeManagerSetId = setId;
  if (quizQuestionsManager) {
    quizQuestionsManager.classList.remove("hidden");
    quizQuestionsManager.hidden = false;
  }

  if (mgrSetTitle) {
    mgrSetTitle.textContent = set.title;
  }
  if (mgrSetMeta) {
    mgrSetMeta.textContent =
      (set.time_limit > 0 ? "Batas Waktu: " + set.time_limit + " Menit" : "Tanpa Batas Waktu") +
      " · Kode Akses: " + (set.access_code || "-");
  }

  await loadQuizQuestions(setId);
  if (quizQuestionsManager) {
    quizQuestionsManager.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/** Muat soal-soal dalam satu set kuis beserta pilihan jawaban & tombol atur kunci */
async function loadQuizQuestions(setId) {
  if (!mgrQuestionsList) return;
  mgrQuestionsList.innerHTML = '<div class="mgr-empty-state"><p>Memuat soal...</p></div>';

  try {
    const data = await api("/api/sets/" + setId + "/questions");
    const questions = data.questions || [];

    if (!questions.length) {
      mgrQuestionsList.innerHTML =
        '<div class="mgr-empty-state">' +
          '<strong>Belum ada soal pada kuis ini</strong>' +
          '<p>Tambahkan butir soal pertama untuk kuis ini agar siswa dapat mulai mengerjakan.</p>' +
          '<button type="button" class="btn btn-small btn-primary" data-action="mgr-add-q" data-setid="' + setId + '">' +
            '<i data-lucide="plus-circle"></i><span>Tambah Soal Pertama</span>' +
          '</button>' +
        '</div>';
      if (window.lucide && typeof lucide.createIcons === "function") {
        lucide.createIcons();
      }
      return;
    }

    const letters = ["A", "B", "C", "D", "E"];
    mgrQuestionsList.innerHTML = questions.map((q, qIndex) => {
      const optionsHtml = (q.options || []).map((opt, optIndex) => {
        const isCorrect = Number(q.answer) === optIndex;
        return (
          '<div class="mgr-option ' + (isCorrect ? 'is-correct' : '') + '">' +
            '<div class="mgr-option-left">' +
              '<span class="mgr-option-letter">' + (letters[optIndex] || (optIndex + 1)) + '</span>' +
              '<span class="mgr-option-text" title="' + escapeHtml(opt) + '">' + escapeHtml(opt) + '</span>' +
            '</div>' +
            (isCorrect
              ? '<span class="mgr-correct-tag"><i data-lucide="check"></i> Kunci Jawaban</span>'
              : '<button type="button" class="btn-set-correct" data-action="set-answer" data-qid="' + q.id + '" data-idx="' + optIndex + '" title="Tandai sebagai kunci jawaban yang benar">Jadikan Kunci</button>') +
          '</div>'
        );
      }).join("");

      return (
        '<div class="mgr-question-card" id="mgrCard-' + q.id + '">' +
          '<div class="mgr-q-header">' +
            '<span class="mgr-q-badge"><i data-lucide="help-circle"></i> Soal #' + (qIndex + 1) + (q.subject ? " · " + escapeHtml(q.subject) : "") + '</span>' +
            '<div class="mgr-q-actions">' +
              '<button type="button" class="btn-xs" data-action="edit-mgr-q" data-qid="' + q.id + '" title="Ubah soal ini"><i data-lucide="pen-line"></i><span>Edit</span></button>' +
              '<button type="button" class="btn-xs btn-danger" data-action="delete-mgr-q" data-qid="' + q.id + '" title="Hapus soal ini"><i data-lucide="trash-2"></i><span>Hapus</span></button>' +
            '</div>' +
          '</div>' +
          '<p class="mgr-q-text">' + escapeHtml(q.question) + '</p>' +
          '<div class="mgr-options-grid">' +
            optionsHtml +
          '</div>' +
          (q.fact ? '<span class="mgr-q-fact"><i data-lucide="info"></i> <strong>Penjelasan:</strong> ' + escapeHtml(q.fact) + '</span>' : '') +
        '</div>'
      );
    }).join("");

    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
  } catch (err) {
    mgrQuestionsList.innerHTML =
      '<div class="mgr-empty-state"><p style="color:var(--danger)">Gagal memuat soal: ' + escapeHtml(err.message) + '</p></div>';
  }
}

/** Navigasi cepat untuk menambah soal ke set tertentu */
function handleAddQuestionToSet(setId) {
  resetSoalForm();
  fillSetSelect();
  if (qSet) qSet.value = setId;
  const set = setList.find((s) => s.id === setId);
  if (set && set.material_id && qMaterial) {
    qMaterial.value = set.material_id;
  }
  switchTab("tabSoal");
  if (soalForm) {
    soalForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (qQuestion) qQuestion.focus();
}

function editSet(set) {
  editingSetId = set.id;
  setFormTitle.textContent = "✏️ Ubah Set Soal: " + set.title;
  if (sSetMaterial) sSetMaterial.value = set.material_id || "";
  sSetTitle.value = set.title;
  sSetDesc.value = set.description || "";
  sSetTime.value = set.time_limit || "";
  sSetPublish.checked = set.is_published;
  btnCancelSet.hidden = false;
  showFormError(setError, "");
  switchTab("tabSetSoal");
  setForm.scrollIntoView({ behavior: "smooth", block: "center" });
  sSetTitle.focus();
}

function resetSetForm() {
  editingSetId = null;
  setFormTitle.textContent = "➕ Tambah Set Soal Baru";
  setForm.reset();
  sSetTime.value = "";
  sSetPublish.checked = true;
  btnCancelSet.hidden = true;
  showFormError(setError, "");
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

/** Isi dropdown pemilihan set soal pada form soal. */
function fillSetSelect() {
  if (!qSet) return;
  const current = qSet.value;
  qSet.innerHTML =
    '<option value="">— Belum terhubung set soal —</option>' +
    setList.map((s) =>
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
    materiList.map((m) =>
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
  if (materiForm) {
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
          showToast("Materi pembelajaran berhasil diperbarui.", "success", "Perubahan Tersimpan");
        } else {
          await api("/api/materials", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          showToast("Materi baru berhasil ditambahkan ke dashboard Anda.", "success", "Materi Ditambahkan");
        }

        resetMateriForm();
        await renderDashboard();
      } catch (err) {
        showFormError(materiError, err.message);
      }
    });
  }

  if (btnCancelMateri) {
    btnCancelMateri.addEventListener("click", resetMateriForm);
  }

  /* Simpan set soal (tambah / ubah) */
  if (setForm) {
    setForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const payload = {
        title: sSetTitle.value.trim(),
        description: sSetDesc.value.trim(),
        timeLimit: sSetTime.value ? Number(sSetTime.value) : 0,
        is_published: sSetPublish.checked
      };

      if (sSetMaterial && sSetMaterial.value) {
        payload.materialId = Number(sSetMaterial.value);
      } else if (materiList && materiList.length) {
        payload.materialId = materiList[0].id;
      }

      if (!payload.title) {
        showFormError(setError, "Judul set soal wajib diisi.");
        return;
      }

      try {
        if (editingSetId) {
          await api("/api/sets/" + editingSetId, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          showToast("Set soal berhasil diperbarui.", "success", "Perubahan Tersimpan");
        } else {
          await api("/api/sets", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          showToast("Set kuis baru berhasil dibuat dan siap digunakan.", "success", "Set Kuis Dibuat");
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

  /* Aksi pada daftar set soal (ubah / publish / hapus / atur soal / salin kode) */
  if (setAdminList) {
    setAdminList.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = Number(button.dataset.id);
      const set = setList.find((item) => item.id === id);

      /* Fitur Salin Kode Kuis */
      if (button.dataset.action === "copy-code") {
        event.stopPropagation();
        const code = button.dataset.code || (set ? set.access_code : "");
        if (!code) return;

        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(code);
          } else {
            const temp = document.createElement("input");
            temp.value = code;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand("copy");
            document.body.removeChild(temp);
          }

          const origContent = button.innerHTML;
          button.innerHTML = '<i data-lucide="check"></i><span>Tersalin!</span>';
          button.classList.add("copied");
          if (window.lucide && typeof lucide.createIcons === "function") {
            lucide.createIcons();
          }
          showToast('Kode kuis <strong class="toast-code-hl">' + escapeHtml(code) + '</strong> berhasil disalin ke papan klip!', "copy", "Kode Kuis Disalin");
          setTimeout(() => {
            button.innerHTML = origContent;
            button.classList.remove("copied");
            if (window.lucide && typeof lucide.createIcons === "function") {
              lucide.createIcons();
            }
          }, 2000);
        } catch (_) {
          showToast('Kode kuis: <strong class="toast-code-hl">' + escapeHtml(code) + '</strong>', "info", "Kode Kuis");
        }
        return;
      }

      if (!set) return;

      try {
        if (button.dataset.action === "manage-questions") {
          await openQuizQuestionsManager(id);
        } else if (button.dataset.action === "edit-set") {
          editSet(set);
        } else if (button.dataset.action === "toggle-set") {
          await api("/api/sets/" + id + "/publish", {
            method: "PATCH",
            body: JSON.stringify({ is_published: !set.is_published })
          });
          showToast(set.is_published
            ? "Set soal dipindahkan ke draf."
            : "Set soal berhasil dipublikasikan untuk siswa.",
            "success",
            set.is_published ? "Set Masuk Draf" : "Set Dipublikasikan");
          await loadAdminData();
        } else if (button.dataset.action === "delete-set") {
          if (!confirm('Hapus set soal "' + set.title + '"? Soal di dalamnya tidak akan terhapus, hanya kehilangan referensi set.')) return;
          await api("/api/sets/" + id, { method: "DELETE" });
          showToast("Set soal berhasil dihapus.", "success", "Set Dihapus");
          if (editingSetId === id) resetSetForm();
          if (activeManagerSetId === id) {
            if (quizQuestionsManager) {
              quizQuestionsManager.classList.add("hidden");
              quizQuestionsManager.hidden = true;
            }
            activeManagerSetId = null;
          }
          await loadAdminData();
        }
      } catch (err) {
        showToast(err.message, "error", "Gagal Memproses");
      }
    });
  }

  /* Event pada Panel Atur Soal & Kunci Jawaban Kuis */
  if (btnMgrClose) {
    btnMgrClose.addEventListener("click", () => {
      if (quizQuestionsManager) {
        quizQuestionsManager.classList.add("hidden");
        quizQuestionsManager.hidden = true;
      }
      activeManagerSetId = null;
    });
  }

  if (btnMgrAddQuestion) {
    btnMgrAddQuestion.addEventListener("click", () => {
      if (activeManagerSetId) {
        handleAddQuestionToSet(activeManagerSetId);
      }
    });
  }

  if (mgrQuestionsList) {
    mgrQuestionsList.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const action = button.dataset.action;

      if (action === "set-answer") {
        const qid = Number(button.dataset.qid);
        const idx = Number(button.dataset.idx);
        const letters = ["A", "B", "C", "D", "E"];
        try {
          await api("/api/questions/" + qid + "/answer", {
            method: "PATCH",
            body: JSON.stringify({ answer: idx })
          });
          showToast("Kunci jawaban berhasil diubah ke Opsi " + (letters[idx] || (idx + 1)) + ".", "success", "Kunci Jawaban Diperbarui");
          if (activeManagerSetId) {
            await loadQuizQuestions(activeManagerSetId);
          }
        } catch (err) {
          showToast(err.message, "error", "Gagal Memperbarui");
        }
      } else if (action === "edit-mgr-q") {
        const qid = Number(button.dataset.qid);
        try {
          const data = await api("/api/questions/manage");
          const question = (data.questions || []).find((item) => item.id === qid);
          if (question) editSoal(question);
        } catch (err) {
          showToast(err.message, "error", "Gagal Memuat Soal");
        }
      } else if (action === "delete-mgr-q") {
        const qid = Number(button.dataset.qid);
        if (!confirm("Hapus soal ini dari kuis?")) return;
        try {
          await api("/api/questions/" + qid, { method: "DELETE" });
          showToast("Soal berhasil dihapus dari kuis.", "success", "Soal Dihapus");
          if (editingSoalId === qid) resetSoalForm();
          if (activeManagerSetId) {
            await loadQuizQuestions(activeManagerSetId);
          }
          await loadAdminData();
          await renderDashboard();
        } catch (err) {
          showToast(err.message, "error", "Gagal Menghapus");
        }
      } else if (action === "mgr-add-q") {
        const setId = Number(button.dataset.setid);
        if (setId) handleAddQuestionToSet(setId);
      }
    });
  }

  /* Saat set kuis dipilih di form soal, otomatis cocokan materi induknya */
  if (qSet) {
    qSet.addEventListener("change", () => {
      const setId = Number(qSet.value);
      const set = setList.find((s) => s.id === setId);
      if (set && set.material_id && qMaterial) {
        qMaterial.value = set.material_id;
      }
    });
  }

  /* Interaksi radio button & kartu pembuat pilihan jawaban */
  if (optionsCreatorList) {
    optionsCreatorList.addEventListener("change", (event) => {
      if (event.target.name === "optCorrectRadio") {
        setSelectedCorrectRadio(event.target.value);
      }
    });
  }

  /* Aksi pada daftar materi (ubah / publish / hapus) */
  if (materiAdminList) {
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
            ? "Materi pembelajaran dipindahkan ke draf."
            : "Materi pembelajaran berhasil dipublikasikan untuk siswa.",
            "success",
            material.is_published ? "Materi Masuk Draf" : "Materi Dipublikasikan");
          await loadAdminData();
        } else if (button.dataset.action === "delete") {
          if (!confirm('Hapus materi "' + material.title + '" beserta datanya?')) return;
          await api("/api/materials/" + id, { method: "DELETE" });
          showToast("Materi pembelajaran berhasil dihapus.", "success", "Materi Dihapus");
          if (editingMateriId === id) resetMateriForm();
          await loadAdminData();
          await renderDashboard();
        }
      } catch (err) {
        showToast(err.message, "error", "Gagal Memproses");
      }
    });
  }

  /* Simpan soal (tambah / ubah) */
  if (soalForm) {
    soalForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const rawA = $("#optInput0") ? $("#optInput0").value.trim() : "";
      const rawB = $("#optInput1") ? $("#optInput1").value.trim() : "";
      const rawC = $("#optInput2") ? $("#optInput2").value.trim() : "";
      const rawD = $("#optInput3") ? $("#optInput3").value.trim() : "";

      const rawOptions = [rawA, rawB, rawC, rawD];
      const selectedRadio = getSelectedCorrectRadio();

      if (!qQuestion.value.trim()) {
        showFormError(soalError, "Pertanyaan kuis wajib diisi.");
        return;
      }
      if (!rawA || !rawB) {
        showFormError(soalError, "Pilihan jawaban A dan B wajib diisi.");
        return;
      }
      if (!rawC && rawD) {
        showFormError(soalError, "Harap isi Pilihan C sebelum mengisi Pilihan D.");
        return;
      }

      const options = rawOptions.filter(Boolean);
      if (selectedRadio >= options.length) {
        const letters = ["A", "B", "C", "D"];
        showFormError(soalError, "Opsi " + letters[selectedRadio] + " ditandai sebagai kunci jawaban tetapi teksnya masih kosong.");
        return;
      }

      const payload = {
        question: qQuestion.value.trim(),
        options,
        answer: selectedRadio,
        image: adEmoji.value.trim() || "❓",
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
          showToast("Soal berhasil diperbarui.", "success", "Perubahan Tersimpan");
        } else {
          await api("/api/questions", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          showToast("Soal baru berhasil disimpan ke akun Anda.", "success", "Soal Ditambahkan");
        }

        resetSoalForm();
        if (activeManagerSetId) {
          await loadQuizQuestions(activeManagerSetId);
        }
        await loadAdminData();
        await renderDashboard();
      } catch (err) {
        showFormError(soalError, err.message);
      }
    });
  }

  if (btnCancelSoal) {
    btnCancelSoal.addEventListener("click", resetSoalForm);
  }

  /* Aksi pada daftar soal (ubah / hapus) */
  if (soalAdminList) {
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
          showToast("Soal berhasil dihapus.", "success", "Soal Dihapus");
          if (editingSoalId === id) resetSoalForm();
          await loadAdminData();
          await renderDashboard();
        }
      } catch (err) {
        showToast(err.message, "error", "Gagal Memproses");
      }
    });
  }
  if (togglePass && passwordInput) {
    togglePass.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      togglePass.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
      togglePass.setAttribute("aria-label", isPassword ? "Sembunyikan password" : "Tampilkan password");
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    });
  }
}

/* Tampilkan/sembunyikan password untuk registrasi */
if (regTogglePass) {
  regTogglePass.addEventListener("click", () => {
    const isPassword = regPasswordInput.type === "password";
    regPasswordInput.type = isPassword ? "text" : "password";
    if (regConfirmPasswordInput) regConfirmPasswordInput.type = isPassword ? "text" : "password";
    regTogglePass.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
    regTogglePass.setAttribute("aria-label", isPassword ? "Sembunyikan password" : "Tampilkan password");
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  });
}

/* =============== (11) INISIALISASI PROGRAM ============================ */

/** Mempersiapkan halaman saat dokumen selesai dimuat. */
function init() {
  splitTitle();
  createDecorations();

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  /* Tombol memulai kuis (wajib meminta nama & kode kuis) */
  const btnStart = $("#btnStart");
  if (btnStart) btnStart.addEventListener("click", onStartQuizClick);

  const studentNameInput = $("#studentName");
  if (studentNameInput) {
    studentNameInput.addEventListener("input", () => {
      if (studentNameInput.value.trim().length > 0) {
        studentNameInput.classList.remove("is-invalid");
        const errEl = $("#studentNameError");
        if (errEl) errEl.classList.add("hidden");
      }
    });

    studentNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onStartQuizClick();
      }
    });
  }

  const navBtnJoin = $("#navBtnJoin");
  if (navBtnJoin) navBtnJoin.addEventListener("click", onStartQuizClick);
  
  const btnReplay = $("#btnReplay");
  if (btnReplay) {
    btnReplay.addEventListener("click", () => {
      if (currentQuizSetId) {
        startQuiz(currentQuizSetId);
      } else {
        onStartQuizClick();
      }
    });
  }
  
  const btnGuruMulai = $("#btnGuruMulai");
  if (btnGuruMulai) btnGuruMulai.addEventListener("click", () => showPage("page-home"));

  /* Event listener modal kode kuis */
  const btnCloseModalJoin = $("#btnCloseModalJoin");
  if (btnCloseModalJoin) {
    btnCloseModalJoin.addEventListener("click", hideSetModal);
  }

  const modalJoin = $("#modalJoinQuiz");
  if (modalJoin) {
    modalJoin.addEventListener("click", (e) => {
      if (e.target === modalJoin) hideSetModal();
    });
  }

  const joinInput = $("#joinCodeInput");
  if (joinInput) {
    joinInput.addEventListener("input", () => {
      joinInput.value = joinInput.value.toUpperCase();
    });
    joinInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleJoinCodeSubmit();
      }
    });
  }

  const btnSubmitJoin = $("#btnSubmitJoin");
  if (btnSubmitJoin) {
    btnSubmitJoin.addEventListener("click", handleJoinCodeSubmit);
  }

  /* Cek apakah ada parameter kode kuis di URL (?code=A1B2C3) */
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get("code");
  if (codeParam && joinInput) {
    joinInput.value = codeParam.trim().toUpperCase();
  }

  /* Tombol lanjut */
  if (typeof btnNext !== "undefined" && btnNext) {
    btnNext.addEventListener("click", nextQuestion);
  }

  /* Form admin: tab, set soal, dan soal */
  if (typeof bindAdminEvents === "function") {
    bindAdminEvents();
  }

  /* Form login guru */
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  /* Tombol buka/tutup form login manual alternatif */
  const btnToggleManual = $("#btnToggleManualLogin");
  if (btnToggleManual && loginForm) {
    btnToggleManual.addEventListener("click", () => {
      const isHidden = loginForm.style.display === "none";
      loginForm.style.display = isHidden ? "block" : "none";
      btnToggleManual.classList.toggle("active", isHidden);
      if (isHidden && window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    });
  }

  /* Form registrasi guru */
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  /* Inisialisasi awal Google Sign-In */
  initGoogleSignIn();

  /* Tab switcher auth guru (Login / Daftar) */
  const tabBtnLogin = $("#tabBtnLogin");
  const tabBtnRegister = $("#tabBtnRegister");
  const linkToRegister = $("#linkToRegister");
  const linkToLogin = $("#linkToLogin");

  if (tabBtnLogin) tabBtnLogin.addEventListener("click", () => switchAuthTab("login"));
  if (tabBtnRegister) tabBtnRegister.addEventListener("click", () => switchAuthTab("register"));
  if (linkToRegister) linkToRegister.addEventListener("click", () => switchAuthTab("register"));
  if (linkToLogin) linkToLogin.addEventListener("click", () => switchAuthTab("login"));

  /* Event listener modal login pop-up Kreator Soal */
  const btnCloseModalLogin = $("#btnCloseModalLogin");
  if (btnCloseModalLogin) {
    btnCloseModalLogin.addEventListener("click", closeLoginModal);
  }

  const modalLogin = $("#modalLogin");
  if (modalLogin) {
    modalLogin.addEventListener("click", (e) => {
      if (e.target === modalLogin) {
        closeLoginModal();
      }
    });
  }

  /* Auto-login & routing jika ada hash #dashboard atau #page-login */
  function handleHashRoute() {
    const hash = window.location.hash;
    if (hash === "#dashboard" || hash === "#page-login" || hash === "#creator" || hash === "#page-dashboard") {
      if (getToken() && document.getElementById("page-dashboard")) {
        renderDashboard().then(() => {
          showPage("page-dashboard");
        }).catch(() => {
          clearToken();
          openLoginModal();
        });
      } else {
        openLoginModal();
      }
    }
  }

  handleHashRoute();
  window.addEventListener("hashchange", handleHashRoute);

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

  /* Dukungan keyboard: Escape untuk menutup modal, 1-4 untuk kuis, Enter untuk lanjut */
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const modalL = $("#modalLogin");
      if (modalL && (modalL.classList.contains("show") || modalL.classList.contains("active"))) {
        closeLoginModal();
        return;
      }
      const modalJ = $("#modalJoinQuiz");
      if (modalJ && (modalJ.classList.contains("show") || modalJ.classList.contains("active"))) {
        hideSetModal();
        return;
      }
    }

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