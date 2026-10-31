

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