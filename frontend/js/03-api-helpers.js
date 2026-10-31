

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
    error.code = data && data.code;
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