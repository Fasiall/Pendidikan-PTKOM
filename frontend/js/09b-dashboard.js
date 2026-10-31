

/** Update UI checklist kekuatan password */
function updatePasswordStrengthUI(password) {
  const strengthFill = $("#pwStrengthFill");
  const checklist = $("#pwChecklist");
  if (!strengthFill || !checklist) return;

  const { checks, passed, total, valid } = checkPasswordStrength(password);

  const percent = (passed / total) * 100;
  strengthFill.style.width = percent + "%";
  strengthFill.className = "pw-strength-fill";
  if (passed === 0) strengthFill.classList.add("empty");
  else if (passed < total) strengthFill.classList.add("partial");
  else strengthFill.classList.add("full");

  checklist.querySelectorAll("li").forEach(li => {
    const rule = li.dataset.rule;
    const icon = li.querySelector("i");
    if (checks[rule]) {
      li.classList.add("passed");
      if (icon) {
        icon.setAttribute("data-lucide", "check");
        icon.classList.add("passed");
      }
    } else {
      li.classList.remove("passed");
      if (icon) {
        icon.setAttribute("data-lucide", "x");
        icon.classList.remove("passed");
      }
    }
  });

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons({ root: checklist });
  }

  const submitBtn = registerForm?.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = !valid;
    submitBtn.style.opacity = valid ? "1" : "0.6";
    submitBtn.style.cursor = valid ? "pointer" : "not-allowed";
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

  // Validasi kekuatan password (min 8 char, uppercase, number, special char)
  const pwStrength = checkPasswordStrength(password);
  if (!pwStrength.valid) {
    const missing = [];
    if (!pwStrength.checks.length) missing.push("minimal 8 karakter");
    if (!pwStrength.checks.upper) missing.push("huruf besar (A-Z)");
    if (!pwStrength.checks.number) missing.push("angka (0-9)");
    if (!pwStrength.checks.special) missing.push("simbol (!@#$%^&*)");
    showRegisterError("Password harus mengandung: " + missing.join(", "));
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

    // Ambil riwayat kuis siswa untuk menghitung rata-rata nilai (persentase per record)
    try {
      const historyData = await api("/api/teacher/student-history");
      // Handle both possible response structures: {history: [...]} or [...]
      const history = historyData.history || historyData;
      if (history && history.length > 0) {
        // Hitung rata-rata persentase: (score/total)*100 per record, lalu rata-ratakan
        const percentages = history
          .filter(h => h.total && h.total > 0)
          .map(h => (h.score / h.total) * 100);
        if (percentages.length > 0) {
          const avgPercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
          statAvgScore.textContent = avgPercentage.toFixed(1);
        } else {
          statAvgScore.textContent = "-";
        }
      } else {
        statAvgScore.textContent = "-";
      }
    } catch (err) {
      console.warn("Gagal memuat riwayat siswa:", err);
      statAvgScore.textContent = "-";
    }

    /* Daftar soal (elemen ini sudah tidak ada di markup; lewati jika kosong) */
    if (questionList) {
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
    }

    /* Tab Riwayat: daftar kuis milik guru (detail dibuka di halaman terpisah). */
    if (typeof loadQuizHistoryList === "function") {
      await loadQuizHistoryList();
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