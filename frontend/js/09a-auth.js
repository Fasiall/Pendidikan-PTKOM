

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

  // Anti-brute force: cek lockout
  const lockout = checkLoginLockout(usernameOrEmail);
  if (lockout.locked) {
    const mins = Math.ceil(lockout.remaining / 60);
    showLoginError(`Terlalu banyak percobaan gagal. Coba lagi dalam ${mins} menit ${lockout.remaining % 60} detik.`);
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

    // Reset failed attempts on successful login
    resetLoginAttempts(usernameOrEmail);

    closeLoginModal();
    loginError.classList.remove("show");
    loginError.innerHTML = "";
    loginForm.reset();

    const teacherName = data.teacher?.fullName || data.teacher?.username || "Pengajar";
    showToast("Selamat datang di Kreator Soal, " + escapeHtml(teacherName) + "!", "success", "Berhasil Masuk");

    if (document.getElementById("page-dashboard")) {
      await renderDashboard();
      showPage("page-dashboard");
    } else {
      setTimeout(() => { window.location.href = "index.html#dashboard"; }, 900);
    }
  } catch (err) {
    // Record failed attempt
    recordFailedLogin(usernameOrEmail);
    const attempts = getFailedLoginAttempts(usernameOrEmail);
    let msg = err.message || "Login gagal, coba lagi.";
    if (attempts >= 3) {
      const lockout = checkLoginLockout(usernameOrEmail);
      if (lockout.locked) {
        const mins = Math.ceil(lockout.remaining / 60);
        msg += ` Akun terkunci ${mins} menit ${lockout.remaining % 60} detik.`;
      } else {
        msg += ` Sisa percobaan: ${5 - attempts}.`;
      }
    }
    showLoginError(msg);
    shakeForm(loginForm);
  }
}

/** Anti-brute force: simpan percobaan gagal di localStorage */
function recordFailedLogin(usernameOrEmail) {
  const key = "kuis.loginAttempts";
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  const now = Date.now();
  const userData = data[usernameOrEmail] || { attempts: 0, lastAttempt: 0, lockoutUntil: 0 };
  userData.attempts += 1;
  userData.lastAttempt = now;
  // Escalating lockout: 5->60s, 10->120s, 15->300s
  if (userData.attempts >= 5) {
    const level = Math.floor((userData.attempts - 1) / 5);
    const durations = [60, 120, 300]; // 1min, 2min, 5min
    userData.lockoutUntil = now + (durations[Math.min(level, durations.length - 1)] * 1000);
  }
  data[usernameOrEmail] = userData;
  localStorage.setItem(key, JSON.stringify(data));
}

/** Cek apakah user terkunci */
function checkLoginLockout(usernameOrEmail) {
  const key = "kuis.loginAttempts";
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  const userData = data[usernameOrEmail];
  if (!userData || !userData.lockoutUntil) return { locked: false, remaining: 0 };
  const now = Date.now();
  if (now < userData.lockoutUntil) {
    return { locked: true, remaining: Math.ceil((userData.lockoutUntil - now) / 1000) };
  }
  // Lockout expired, reset attempts
  if (userData.lockoutUntil > 0) {
    userData.attempts = 0;
    userData.lockoutUntil = 0;
    data[usernameOrEmail] = userData;
    localStorage.setItem(key, JSON.stringify(data));
  }
  return { locked: false, remaining: 0 };
}

/** Dapatkan jumlah percobaan gagal */
function getFailedLoginAttempts(usernameOrEmail) {
  const key = "kuis.loginAttempts";
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  return data[usernameOrEmail]?.attempts || 0;
}

/** Reset percobaan gagal setelah login berhasil */
function resetLoginAttempts(usernameOrEmail) {
  const key = "kuis.loginAttempts";
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  if (data[usernameOrEmail]) {
    delete data[usernameOrEmail];
    localStorage.setItem(key, JSON.stringify(data));
  }
}

/** Validasi kekuatan password: minimal 8 char, 1 uppercase, 1 number, 1 special char */
function checkPasswordStrength(password) {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password)
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return { checks, passed, total: 4, valid: passed === 4 };
}