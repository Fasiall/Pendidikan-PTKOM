/**
 * Memulai kuis berdasarkan set soal (wajib diverifikasi lewat kode kuis).
 * Soal & pilihan jawaban datang dari server dalam urutan acak yang tersimpan
 * pada sesi, sehingga refresh tidak mengubah urutan.
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
    btnStart.innerHTML = '<span>Memuat soal...</span>';
  }

  try {
    const startData = await api("/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({ setId: setId })
    });

    if (!startData || !Array.isArray(startData.questions) || !startData.questions.length) {
      throw new Error("Belum ada soal pada set kuis ini.");
    }

    /* Simpan penanda agar refresh dapat memulihkan sesi yang sama. */
    const nameInput = $("#studentName");
    if (nameInput && nameInput.value.trim()) {
      sessionStorage.setItem("kuis.studentName", nameInput.value.trim());
    }
    sessionStorage.setItem("kuis.quizActive", "1");

    applyQuizSession(startData, { fresh: true });
  } catch (err) {
    if (err.code === "QUIZ_NOT_OPEN" || err.code === "QUIZ_ENDED") {
      showToast(err.message, "warning", "Jadwal Kuis");
    } else {
      showToast(
        err.message && err.message !== "Belum ada soal pada set kuis ini."
          ? err.message
          : "Gagal memuat kuis. Pastikan server aktif dan soal sudah dibuat oleh guru.",
        "error",
        "Gagal Memuat Kuis"
      );
    }
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

/**
 * Terapkan data sesi kuis (baru maupun hasil pemulihan) ke antarmuka.
 */
function applyQuizSession(data, options = {}) {
  questions = Array.isArray(data.questions) ? data.questions : [];
  if (!questions.length) throw new Error("Belum ada soal pada set kuis ini.");

  quizAnswers = {};
  (data.answers || []).forEach((answer) => {
    if (answer && answer.questionId !== undefined) {
      quizAnswers[answer.questionId] = answer;
    }
  });

  score = Number(data.score) || 0;
  quizSubmitting = false;
  currentQuizSetId = data.setId || currentQuizSetId;

  if (options.fresh) {
    currentIndex = 0;
  } else {
    const firstUnanswered = questions.findIndex((q) => !quizAnswers[q.id]);
    currentIndex = firstUnanswered === -1 ? questions.length - 1 : firstUnanswered;
  }

  showPage("page-quiz");
  renderQuestion();
  startQuizCountdown(data.deadlineAt, data.serverNow);
}

/**
 * Hitung mundur memakai selisih waktu server, lalu dihitung dengan
 * performance.now() (monotonic). Mengubah jam perangkat tidak memengaruhi
 * hitungan, dan server tetap memeriksa waktu sebenarnya.
 */
function startQuizCountdown(deadlineAt, serverNow) {
  clearInterval(timerInterval);
  timerInterval = null;

  const quizTimer = $("#quizTimer");
  quizDeadlineAt = deadlineAt ? new Date(deadlineAt).getTime() : null;

  if (!quizDeadlineAt || Number.isNaN(quizDeadlineAt)) {
    if (quizTimer) quizTimer.classList.add("hidden");
    return;
  }

  const serverNowMs = serverNow ? new Date(serverNow).getTime() : Date.now();
  quizTickStartRemainingMs = Math.max(0, quizDeadlineAt - serverNowMs);
  quizTickAnchor = (typeof performance !== "undefined" && performance.now)
    ? performance.now()
    : Date.now();

  if (quizTimer) quizTimer.classList.remove("hidden");

  let lastShownSecond = -1;
  const tick = () => {
    const nowAnchor = (typeof performance !== "undefined" && performance.now)
      ? performance.now()
      : Date.now();
    const leftMs = quizTickStartRemainingMs - (nowAnchor - quizTickAnchor);
    timeRemaining = Math.max(0, Math.ceil(leftMs / 1000));

    if (timeRemaining !== lastShownSecond) {
      lastShownSecond = timeRemaining;
      updateTimerDisplay();
    }

    if (leftMs <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      autoSubmitQuiz();
    }
  };

  tick();
  timerInterval = setInterval(tick, 250);
}

/** Mengumpulkan jawaban otomatis saat waktu efektif habis. */
function autoSubmitQuiz() {
  if (quizSubmitting) return;
  showToast("Waktu kuis sudah berakhir. Jawabanmu otomatis dikumpulkan.", "warning", "Waktu Habis");
  showResult({ auto: true });
}

/** Memperbarui tampilan timer kuis */
function updateTimerDisplay() {
  const quizTimer = $("#quizTimer");
  if (!quizTimer) return;
  const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, "0");
  const seconds = (timeRemaining % 60).toString().padStart(2, "0");
  quizTimer.innerHTML = '<i data-lucide="clock" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i><span>' + minutes + ":" + seconds + '</span>';
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons({ root: quizTimer });
  }
}

/** Tombol jawaban yang mewakili ID opsi tertentu (setelah diacak). */
function answerButtonForOption(optionId) {
  const q = questions[currentIndex];
  if (!q) return null;
  const index = q.options.findIndex((option) => Number(option.id) === Number(optionId));
  if (index === -1) return null;
  return answersBox.querySelectorAll(".answer-btn")[index] || null;
}

/** Teks opsi berdasarkan ID asli. */
function optionTextById(optionId) {
  const q = questions[currentIndex];
  if (!q) return "";
  const option = q.options.find((item) => Number(item.id) === Number(optionId));
  return option ? option.text : "";
}

/** Menampilkan soal sesuai currentIndex ke dalam kartu pertanyaan. */
function renderQuestion() {
  const q = questions[currentIndex];
  isAnswered = false;

  /* Perbarui progress bar & chip skor */
  progressFill.style.width = ((currentIndex + 1) / questions.length * 100) + "%";
  progressText.textContent = (currentIndex + 1) + "/" + questions.length;
  scoreChip.textContent = "Skor " + score;

  /* Isi konten kartu */
  qSubject.textContent = q.subject || "";
  qImage.textContent = q.image || "";
  qText.textContent = q.question;
  feedbackBox.textContent = "";
  feedbackBox.className = "feedback";
  btnNext.classList.add("hidden");

  /* Hancurkan & bangun ulang animasi masuknya kartu */
  questionCard.classList.remove("card-in", "card-shake");
  scoreChip.classList.remove("score-bump");
  void questionCard.offsetWidth; // paksa reflow agar animasi berjalan lagi
  questionCard.classList.add("card-in");

  /* Buat tombol opsi jawaban (urutan sudah acak dari server) */
  answersBox.innerHTML = "";
  const keys = ["A", "B", "C", "D", "E"];
  q.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answer-btn";
    btn.dataset.optionId = String(option.id);
    btn.innerHTML =
      '<span class="answer-key">' + keys[index] + "</span>" +
      "<span>" + escapeHtml(option.text) + "</span>";
    btn.addEventListener("click", () => chooseAnswer(option.id));
    answersBox.appendChild(btn);
  });

  /* Pulihkan jawaban yang sudah tersimpan (mis. setelah refresh). */
  const saved = quizAnswers[q.id];
  if (saved) {
    isAnswered = true;
    const buttons = answersBox.querySelectorAll(".answer-btn");
    buttons.forEach((btn) => (btn.disabled = true));

    const correctBtn = answerButtonForOption(saved.correctIndex);
    if (correctBtn) correctBtn.classList.add("correct");
    if (!saved.correct) {
      const chosenBtn = answerButtonForOption(saved.chosen);
      if (chosenBtn) chosenBtn.classList.add("wrong");
    }

    if (saved.correct) {
      feedbackBox.className = "feedback ok";
      feedbackBox.innerHTML = "<b>Hebat! Jawabanmu benar!</b>" + (saved.fact ? "<br>" + escapeHtml(saved.fact) : "");
    } else {
      feedbackBox.className = "feedback no";
      feedbackBox.innerHTML =
        "<b>Belum tepat.</b>Jawaban yang benar: <b>" +
        escapeHtml(optionTextById(saved.correctIndex)) + "</b>." +
        (saved.fact ? "<br>" + escapeHtml(saved.fact) : "");
    }

    btnNext.textContent = currentIndex === questions.length - 1 ? "Lihat Hasil" : "Lanjut";
    btnNext.classList.remove("hidden");
  }
}

/**
 * Mengirim jawaban ke server untuk divalidasi.
 * Nilai yang dikirim adalah ID opsi asli, bukan posisi huruf setelah diacak.
 */
async function chooseAnswer(selectedOptionId) {
  if (isAnswered) return; // cegah jawaban ganda
  isAnswered = true;

  const q = questions[currentIndex];
  const buttons = answersBox.querySelectorAll(".answer-btn");
  buttons.forEach((btn) => (btn.disabled = true)); // kunci selama request

  let result;
  try {
    result = await api("/api/quiz/answer", {
      method: "POST",
      body: JSON.stringify({ questionId: q.id, choice: Number(selectedOptionId) })
    });
  } catch (err) {
    /* Waktu efektif habis di server: kumpulkan otomatis. */
    if (err.code === "TIME_UP") {
      autoSubmitQuiz();
      return;
    }
    /* Gagal terhubung: buka kembali tombol agar bisa dicoba lagi */
    isAnswered = false;
    buttons.forEach((btn) => (btn.disabled = false));
    showToast(err.status === 400 ? err.message : "Gagal mengirim jawaban, silakan coba lagi.", "error", "Koneksi Bermasalah");
    return;
  }

  score = result.score;
  quizAnswers[q.id] = result;

  // Efek audio & visual animasi interaktif
  playQuizSound(result.correct ? "correct" : "wrong");
  showAnswerAnimation(result.correct);

  const selectedBtn = answerButtonForOption(selectedOptionId);
  if (selectedBtn) spawnButtonParticles(selectedBtn, result.correct);

  if (result.correct) {
    if (selectedBtn) selectedBtn.classList.add("correct");
    feedbackBox.className = "feedback ok";
    feedbackBox.innerHTML = "<b>Hebat! Jawabanmu benar!</b>" + (result.fact ? "<br>" + escapeHtml(result.fact) : "");
    burstConfetti(45);
    scoreChip.classList.remove("score-bump");
    void scoreChip.offsetWidth;
    scoreChip.classList.add("score-bump");
  } else {
    if (selectedBtn) selectedBtn.classList.add("wrong");
    const correctBtn = answerButtonForOption(result.correctIndex);
    if (correctBtn) correctBtn.classList.add("correct"); // tampilkan jawaban benar
    feedbackBox.className = "feedback no";
    feedbackBox.innerHTML =
      "<b>Belum tepat, ayo coba lagi!</b>Jawaban yang benar: <b>" +
      escapeHtml(optionTextById(result.correctIndex)) + "</b>. " +
      (result.fact ? "<br>" + escapeHtml(result.fact) : "");
    if (questionCard) {
      questionCard.classList.remove("card-shake");
      void questionCard.offsetWidth;
      questionCard.classList.add("card-shake");
    }
  }

  scoreChip.textContent = "Skor " + score;

  /* Tampilkan tombol lanjut */
  btnNext.textContent =
    currentIndex === questions.length - 1 ? "Lihat Hasil" : "Lanjut";
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

/**
 * Pulihkan sesi kuis setelah halaman di-refresh: urutan soal, jawaban,
 * skor, dan sisa waktu diambil kembali dari server.
 */
async function restoreQuizSession() {
  if (sessionStorage.getItem("kuis.quizActive") !== "1") return false;

  try {
    const data = await api("/api/quiz/session");
    if (!data || !data.active) {
      sessionStorage.removeItem("kuis.quizActive");
      return false;
    }

    const savedName = sessionStorage.getItem("kuis.studentName");
    const nameInput = $("#studentName");
    if (savedName && nameInput) nameInput.value = savedName;

    /* Jika waktu sudah habis, hitung mundur akan mengumpulkan otomatis. */
    applyQuizSession(data, { fresh: false });
    return true;
  } catch (_) {
    return false;
  }
}
