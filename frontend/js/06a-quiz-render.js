

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

  modal.classList.add("show", "active");
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
  if (modal) modal.classList.remove("show", "active");
}

/**
 * Menampilkan popup modal verifikasi login Kreator Soal dengan efek pop & latar belakang ngeblur
 */
function openLoginModal() {
  const modal = $("#modalLogin");
  if (!modal) {
    /* Tidak ada modal: login memakai halaman tersendiri (login.html) */
    if (!/login\.html$/.test(window.location.pathname)) {
      window.location.href = "login.html";
    }
    return;
  }

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

    /* Jadwal akses diperiksa server (WIB), bukan jam perangkat siswa. */
    const schedule = data.schedule || {};
    if (schedule.status && schedule.status !== "open") {
      if (error) {
        error.innerHTML = '<i data-lucide="clock-alert"></i><span>' + escapeHtml(schedule.message || "Kuis belum dapat diakses.") + '</span>';
        error.classList.add("show");
        if (window.lucide && typeof lucide.createIcons === "function") {
          lucide.createIcons({ root: error });
        }
      }
      return;
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