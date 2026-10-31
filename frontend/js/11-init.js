

/* =============== (11) INISIALISASI PROGRAM ============================ */

/** Mempersiapkan halaman saat dokumen selesai dimuat. */
async function init() {
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

  /* Event halaman riwayat per kuis */
  if (typeof bindQuizHistoryEvents === "function") {
    bindQuizHistoryEvents();
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

  /* Real-time password strength check pada form daftar */
  if (regPasswordInput) {
    regPasswordInput.addEventListener("input", () => {
      updatePasswordStrengthUI(regPasswordInput.value);
    });
    // Initial check (disable submit button)
    updatePasswordStrengthUI("");
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

  /* Routing URL khusus (/guru/riwayat...) lalu pemulihan sesi kuis. */
  const routeHandled = typeof handleAppRoute === "function" ? await handleAppRoute() : false;
  if (!routeHandled) {
    const restored = typeof restoreQuizSession === "function"
      ? await restoreQuizSession()
      : false;
    if (!restored) handleHashRoute();
  }

  window.addEventListener("popstate", async () => {
    const handled = typeof handleAppRoute === "function" ? await handleAppRoute() : false;
    if (handled) return;
    const active = document.querySelector(".page.active");
    if (active && active.id === "page-quiz-history") {
      if (getToken()) {
        showPage("page-dashboard");
        switchTab("tabRiwayat");
      } else {
        showPage("page-home");
      }
    }
  });

  window.addEventListener("hashchange", handleHashRoute);

  /* Tombol logout (ada di halaman dashboard) */
  const btnLogout = $("#btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => showLogoutConfirmModal());
  }

  // Logout confirmation modal
  function showLogoutConfirmModal() {
    const modal = $("#modalLogoutConfirm");
    if (!modal) return;
    modal.classList.add("show", "active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("login-modal-open");
  }
  function hideLogoutConfirmModal() {
    const modal = $("#modalLogoutConfirm");
    if (!modal) return;
    modal.classList.remove("show", "active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("login-modal-open");
  }
  function performLogout() {
    hideLogoutConfirmModal();
    try { api("/api/auth/logout", { method: "POST" }); } catch (_) {}
    clearToken();
    if (loginForm) loginForm.reset();
    if (loginError) loginError.classList.remove("show");
    if (registerError) registerError.classList.remove("show");
    showPage("page-home");
  }
  const btnCloseModalLogout = $("#btnCloseModalLogout");
  const btnCancelLogout = $("#btnCancelLogout");
  const btnConfirmLogout = $("#btnConfirmLogout");
  const modalLogout = $("#modalLogoutConfirm");
  if (btnCloseModalLogout) btnCloseModalLogout.addEventListener("click", hideLogoutConfirmModal);
  if (btnCancelLogout) btnCancelLogout.addEventListener("click", hideLogoutConfirmModal);
  if (btnConfirmLogout) btnConfirmLogout.addEventListener("click", performLogout);
  if (modalLogout) modalLogout.addEventListener("click", (e) => { if (e.target === modalLogout) hideLogoutConfirmModal(); });

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
      const modalLogout = $("#modalLogoutConfirm");
      if (modalLogout && (modalLogout.classList.contains("show") || modalLogout.classList.contains("active"))) {
        hideLogoutConfirmModal();
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