

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

    if (document.getElementById("page-dashboard")) showPage("page-dashboard"); if (typeof closeLoginModal === "function") closeLoginModal();
    loginError.classList.remove("show");
    loginError.innerHTML = "";
    loginForm.reset();

    const teacherName = data.teacher?.fullName || data.teacher?.username || "Pengajar";
    showToast("Selamat datang di Kreator Soal, " + escapeHtml(teacherName) + "!", "success", "Berhasil Masuk");

    if (document.getElementById("page-dashboard")) {
      showPage("page-dashboard"); await renderDashboard();
      /* sudah ditampilkan di atas */
    } else {
      setTimeout(() => { window.location.href = "index.html#dashboard"; }, 900);
    }
  } catch (err) {
    if (err.data && err.data.needsVerification) {
      showToast(err.message || "Email akun belum diverifikasi. Kode baru telah dikirim.", "warning", "Verifikasi Diperlukan");
      showOtpVerification(err.data.email || usernameOrEmail);
      return;
    }
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

/* ==========================================================================
   ALUR VERIFIKASI EMAIL (OTP)
   ========================================================================== */

let currentOtpEmail = "";
let otpCountdownInterval = null;

/** Tampilkan antarmuka pengisian kode OTP verifikasi email */
function showOtpVerification(email, resendSeconds = 60) {
  currentOtpEmail = email;

  const loginFormEl = document.getElementById("loginForm");
  const registerFormEl = document.getElementById("registerForm");
  const authTabsEl = document.getElementById("authTabs") || document.querySelector(".auth-tabs");
  const otpFormEl = document.getElementById("otpForm");
  const emailTargetEl = document.getElementById("otpEmailTarget");
  const otpInputEl = document.getElementById("otpInput");
  const otpErrorEl = document.getElementById("otpError");

  if (loginFormEl) loginFormEl.style.display = "none";
  if (registerFormEl) registerFormEl.style.display = "none";
  if (authTabsEl) authTabsEl.style.display = "none";

  if (emailTargetEl) emailTargetEl.textContent = email;
  if (otpInputEl) {
    otpInputEl.value = "";
    setTimeout(() => otpInputEl.focus(), 150);
  }
  if (otpErrorEl) {
    otpErrorEl.classList.remove("show");
    otpErrorEl.innerHTML = "";
  }

  if (otpFormEl) {
    otpFormEl.style.display = "block";
  }

  startOtpCountdown(resendSeconds);

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

/** Hitung mundur tombol kirim ulang kode */
function startOtpCountdown(seconds = 60) {
  if (otpCountdownInterval) clearInterval(otpCountdownInterval);

  let remaining = seconds;
  const countdownEl = document.getElementById("resendCountdown");
  const countdownTextEl = document.getElementById("resendCountdownText");
  const btnResend = document.getElementById("btnResendOtp");

  if (countdownTextEl) countdownTextEl.style.display = "inline";
  if (btnResend) btnResend.style.display = "none";
  if (countdownEl) countdownEl.textContent = remaining;

  otpCountdownInterval = setInterval(() => {
    remaining--;
    if (countdownEl) countdownEl.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(otpCountdownInterval);
      if (countdownTextEl) countdownTextEl.style.display = "none";
      if (btnResend) {
        btnResend.style.display = "inline-block";
        btnResend.disabled = false;
        btnResend.textContent = "Kirim Ulang Kode Verifikasi";
      }
    }
  }, 1000);
}

/** Tampilkan pesan error pada form verifikasi OTP */
function showOtpError(msg) {
  const otpErrorEl = document.getElementById("otpError");
  if (!otpErrorEl) return;
  otpErrorEl.innerHTML = '<i data-lucide="alert-circle"></i><span>' + escapeHtml(msg) + '</span>';
  otpErrorEl.classList.add("show");
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    lucide.createIcons({ root: otpErrorEl });
  }
}

/** Kirim kode verifikasi ke server */
async function handleVerifyOtp(event) {
  if (event) event.preventDefault();

  const otpInputEl = document.getElementById("otpInput");
  const otp = otpInputEl ? otpInputEl.value.trim() : "";
  const otpFormEl = document.getElementById("otpForm");

  if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    showOtpError("Masukkan 6 digit angka kode verifikasi.");
    if (otpFormEl) shakeForm(otpFormEl);
    return;
  }

  const btnSubmit = document.getElementById("btnSubmitOtp");
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Memverifikasi...";
  }

  try {
    const data = await api("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        email: currentOtpEmail,
        otp
      })
    });

    saveToken(data.token);
    if (otpCountdownInterval) clearInterval(otpCountdownInterval);

    showToast("Email berhasil diverifikasi! Selamat datang, " + escapeHtml(data.teacher?.fullName || data.teacher?.username || "Pengajar") + "!", "success", "Verifikasi Berhasil");

    const pageDashboard = document.getElementById("page-dashboard");
    if (pageDashboard) {
      showPage("page-dashboard"); await renderDashboard();
      /* sudah ditampilkan di atas */
    } else {
      setTimeout(() => {
        window.location.href = "index.html#dashboard";
      }, 900);
    }
  } catch (err) {
    showOtpError(err.message || "Kode verifikasi salah atau telah kadaluarsa.");
    if (otpFormEl) shakeForm(otpFormEl);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Verifikasi Akun";
    }
  }
}

/** Kirim ulang kode verifikasi ke email */
async function handleResendOtp() {
  const btnResend = document.getElementById("btnResendOtp");
  if (btnResend) {
    btnResend.disabled = true;
    btnResend.textContent = "Mengirim...";
  }

  try {
    const data = await api("/api/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email: currentOtpEmail })
    });

    showToast("Kode verifikasi baru telah dikirimkan ke email Anda.", "info", "Kode Terkirim");
    startOtpCountdown(data.resendAvailableIn || 60);
  } catch (err) {
    showOtpError(err.message || "Gagal mengirim ulang kode verifikasi.");
  }
}

/** Batalkan verifikasi dan kembali ke form masuk */
function cancelOtpVerification() {
  if (otpCountdownInterval) clearInterval(otpCountdownInterval);
  const otpFormEl = document.getElementById("otpForm");
  const authTabsEl = document.getElementById("authTabs") || document.querySelector(".auth-tabs");

  if (otpFormEl) otpFormEl.style.display = "none";
  if (authTabsEl) authTabsEl.style.display = "flex";

  if (typeof switchAuthTab === "function") {
    switchAuthTab("login");
  } else {
    const loginFormEl = document.getElementById("loginForm");
    if (loginFormEl) loginFormEl.style.display = "block";
  }
}