

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