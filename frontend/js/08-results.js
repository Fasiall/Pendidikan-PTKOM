

/* =============== (8) HALAMAN HASIL ==================================== */

/**
 * Mengirim skor akhir ke server (tersimpan di tabel results),
 * lalu menampilkan bintang, skor berjalan, dan pesan motivasi.
 */
async function showResult(options = {}) {
  if (quizSubmitting) return;
  quizSubmitting = true;
  clearInterval(timerInterval);
  timerInterval = null;
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
    /* Sesi selesai: refresh tidak lagi memulihkan kuis ini. */
    sessionStorage.removeItem("kuis.quizActive");
    sessionStorage.removeItem("kuis.studentName");
  } catch (err) {
    quizSubmitting = false;
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