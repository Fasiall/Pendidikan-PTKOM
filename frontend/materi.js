/* ==========================================================================
   materi.js — Halaman Daftar Materi (materi.html)
                     & Halaman Detail Materi (materi-detail.html)

   Menyediakan katalog materi interaktif lengkap dengan kumpulan materi dummy
   berkualitas tinggi agar halaman langsung dapat digunakan secara mandiri
   (offline / standalone) maupun terhubung dengan backend REST API.
   ========================================================================== */

const $ = (sel) => document.querySelector(sel);

/* Bila dibuka lewat Live Server (port 5500) / file://, arahkan API ke backend. */
const API_BASE =
  location.port === "5500" || location.protocol === "file:"
    ? "http://127.0.0.1:3000"
    : "";

/** Membuat thumbnail SVG responsif & ceria secara lokal (tanpa dependensi eksternal). */
function svgThumb(emoji, color) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">' +
    '<defs>' +
    '<linearGradient id="bgGrad_' + encodeURIComponent(color).replace(/%/g, "") + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
    '<stop offset="0%" stop-color="' + color + '"/>' +
    '<stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.4"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<rect width="600" height="360" rx="28" fill="url(#bgGrad_' + encodeURIComponent(color).replace(/%/g, "") + ')"/>' +
    '<circle cx="300" cy="180" r="105" fill="rgba(255,255,255,0.72)"/>' +
    '<text x="300" y="222" font-size="108" text-anchor="middle">' + emoji + '</text>' +
    '</svg>';
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

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

/* ============================ DATA MATERI DUMMY =========================== */




// Pastikan image_url SVG terisi untuk setiap materi dummy
DUMMY_MATERIALS.forEach((m) => {
  if (!m.image_url) {
    m.image_url = svgThumb(m.emoji, m.color);
  }
});

/** Pembungkus fetch + parsing JSON dengan batas waktu agar tidak menggantung. */
async function api(path, options = {}) {
  let timeoutMs = 3500;
  let fetchOptions = {};
  if (typeof options === "number") {
    timeoutMs = options;
  } else if (options && typeof options === "object") {
    fetchOptions = options;
    if (fetchOptions.timeout) timeoutMs = fetchOptions.timeout;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      Accept: "application/json",
      ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
      ...(fetchOptions.headers || {})
    };
    const token = localStorage.getItem("kuis.token");
    if (token) headers.Authorization = "Bearer " + token;

    const res = await fetch(API_BASE + path, {
      credentials: "include",
      ...fetchOptions,
      headers,
      signal: controller.signal
    });
    clearTimeout(timer);

    let data = null;
    try { data = await res.json(); } catch (_) { /* bukan JSON */ }

    if (!res.ok) {
      const error = new Error((data && data.error) || "Permintaan gagal.");
      error.status = res.status;
      throw error;
    }
    return data;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/** Notifikasi melayang modern (UI/UX Best Practice). */
function showToast(message, type, title, duration) {
  if (!message) return;

  let detectedType = type;
  let detectedTitle = title;
  const rawText = String(message);
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  let cleanMsg = rawText.replace(emojiRegex, "").trim();

  if (!detectedType) {
    const lower = rawText.toLowerCase();
    if (rawText.includes("✅") || lower.includes("berhasil") || lower.includes("sukses")) {
      detectedType = "success";
      detectedTitle = detectedTitle || "Berhasil";
    } else if (rawText.includes("⚠️") || rawText.includes("gagal") || rawText.includes("error")) {
      detectedType = "error";
      detectedTitle = detectedTitle || "Terjadi Kesalahan";
    } else {
      detectedType = "info";
      detectedTitle = detectedTitle || "Informasi";
    }
  }

  const defaultTitles = {
    copy: "Kode Kuis Disalin",
    success: "Berhasil",
    error: "Terjadi Kesalahan",
    warning: "Perhatian",
    info: "Informasi"
  };
  detectedTitle = detectedTitle || defaultTitles[detectedType] || "Informasi";

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

  const toastCard = document.createElement("div");
  toastCard.className = "toast-card toast-" + detectedType;
  toastCard.setAttribute("role", "alert");
  toastCard.innerHTML = `
    <div class="toast-icon-wrap" aria-hidden="true">
      <i data-lucide="${iconName}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-header">
        <h4 class="toast-title">${detectedTitle}</h4>
        <button type="button" class="toast-close" aria-label="Tutup notifikasi">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="toast-desc">${cleanMsg}</div>
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
  function dismiss() {
    if (toastCard.classList.contains("toast-leaving")) return;
    toastCard.classList.add("toast-leaving");
    setTimeout(() => {
      if (toastCard.parentNode) toastCard.parentNode.removeChild(toastCard);
    }, 240);
  }

  dismissTimeout = setTimeout(dismiss, duration || 3800);

  const closeBtn = toastCard.querySelector(".toast-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearTimeout(dismissTimeout);
      dismiss();
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
    dismissTimeout = setTimeout(dismiss, 1600);
  });
}

/** Sembunyikan semua status (loading / kosong) lalu tampilkan yang dipilih. */
function showState(visible) {
  ["#materiLoading", "#materiEmpty", "#dLoading", "#dEmpty", "#materiDetail"]
    .forEach((selector) => {
      const el = $(selector);
      if (el) el.classList.add("hidden");
    });

  const target = $(visible);
  if (target) target.classList.remove("hidden");
}

/* ======================== HALAMAN DAFTAR MATERI ========================== */

let allMaterials = [...DUMMY_MATERIALS];
let activeSubjectFilter = "all";
let activeSearchQuery = "";
let searchDebounceTimer = null;

/** Warna & emoji bawaan per mata pelajaran untuk thumbnail kartu. */
const SUBJECT_STYLE = {
  "matematika":        { emoji: "🧮", color: "#FFE9A8" },
  "ipa":               { emoji: "🐰", color: "#CFF5E0" },
  "bahasa indonesia":  { emoji: "🌈", color: "#FFD9E8" },
  "pengetahuan umum":  { emoji: "🌍", color: "#D6E8FF" },
  "informatika":       { emoji: "💻", color: "#DCDDFF" },
  "seni budaya":       { emoji: "🎨", color: "#FFE0C2" }
};
const FALLBACK_COLORS = ["#E9F4FF", "#E9FBF3", "#F3EDFF", "#FFF1D6"];

/** Render kartu materi ke dalam DOM grid berdasarkan filter aktif. */
function renderMaterialCards() {
  const grid = $("#materiGrid");
  const empty = $("#materiEmpty");
  const countEl = $("#materiCount");
  const clearBtn = $("#materiSearchClear");
  if (!grid) return;

  // Dual filter: subject + search query
  let filtered = activeSubjectFilter === "all"
    ? allMaterials
    : allMaterials.filter((m) => (m.subject || "").toLowerCase() === activeSubjectFilter.toLowerCase());

  if (activeSearchQuery) {
    const terms = activeSearchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    filtered = filtered.filter((m) => {
      const haystack = ((m.title || "") + " " + (m.summary || "") + " " + (m.subject || "")).toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

  if (countEl) countEl.textContent = filtered.length + " materi";

  // Show/hide clear button
  if (clearBtn) {
    if (activeSearchQuery) {
      clearBtn.classList.remove("hidden");
    } else {
      clearBtn.classList.add("hidden");
    }
  }

  if (!filtered.length) {
    grid.innerHTML = "";
    if (empty) {
      // Update empty state message based on search
      const emptyText = empty.querySelector("p");
      if (emptyText) {
        if (activeSearchQuery) {
          emptyText.textContent = 'Tidak ada materi yang cocok dengan "' + escapeHtml(activeSearchQuery) + '".';
        } else if (activeSubjectFilter !== "all") {
          emptyText.textContent = "Belum ada materi untuk kategori ini.";
        } else {
          emptyText.textContent = "Belum ada materi yang dipublikasikan saat ini.";
        }
      }
      empty.classList.remove("hidden");
    }
    return;
  }

  if (empty) empty.classList.add("hidden");
  grid.innerHTML = "";

  filtered.forEach((material, index) => {
    const card = document.createElement("a");
    card.className = "mlist-card";
    card.href = "materi-detail.html?id=" + material.id;

    const style = SUBJECT_STYLE[(material.subject || "").toLowerCase()] || {};
    const emoji = material.emoji || style.emoji || "📘";
    const color = material.color || style.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];

    // Highlight search terms in title and summary
    const highlightedTitle = highlightMatches(material.title || "Tanpa Judul", activeSearchQuery);
    const highlightedSummary = highlightMatches(material.summary || "", activeSearchQuery);

    card.innerHTML =
      '<div class="mlist-thumb" style="background:' + color + ';">' +
        '<span class="mlist-emoji" aria-hidden="true">' + escapeHtml(emoji) + "</span>" +
        '<span class="mlist-subject">' + escapeHtml(material.subject || "Umum") + "</span>" +
      "</div>" +
      '<div class="mlist-body">' +
        "<h2>" + highlightedTitle + "</h2>" +
        "<p>" + highlightedSummary + "</p>" +
        '<div class="mlist-meta">' +
          "<span>" + (material.question_count || 0) + " soal</span>" +
          '<span class="mlist-go">Baca</span>' +
        "</div>" +
      "</div>";

    grid.appendChild(card);
  });

  showState("#materiGrid");
}

/** Pasang interaktivitas filter kategori materi via tombol dropdown "Semua". */
function setupCategoryFilters() {
  const dropdown = $("#materiFilterDropdown");
  const trigger = $("#materiFilterTrigger");
  const menu = $("#materiFilterMenu");
  const triggerText = $("#materiFilterTriggerText");

  if (!trigger || !menu) return;

  function closeMenu() {
    menu.classList.add("hidden");
    trigger.setAttribute("aria-expanded", "false");
    if (dropdown) dropdown.classList.remove("open");
  }

  function openMenu() {
    menu.classList.remove("hidden");
    trigger.setAttribute("aria-expanded", "true");
    if (dropdown) dropdown.classList.add("open");
    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons({ root: menu });
    }
  }

  function toggleMenu() {
    if (menu.classList.contains("hidden")) {
      openMenu();
    } else {
      closeMenu();
    }
  }

  if (!trigger.dataset.bound) {
    trigger.dataset.bound = "true";
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    document.addEventListener("click", (e) => {
      if (dropdown && !dropdown.contains(e.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    });

    menu.addEventListener("click", (e) => {
      const item = e.target.closest(".materi-filter-item, .materi-filter-btn");
      if (!item || !menu.contains(item)) return;
      e.stopPropagation();

      const allItems = menu.querySelectorAll(".materi-filter-item, .materi-filter-btn");
      allItems.forEach((it) => {
        it.classList.remove("active");
        it.setAttribute("aria-selected", "false");
      });
      item.classList.add("active");
      item.setAttribute("aria-selected", "true");

      const labelSpan = item.querySelector("span");
      const labelText = labelSpan ? labelSpan.textContent.trim() : item.textContent.trim();
      if (triggerText) {
        triggerText.textContent = labelText;
      }

      activeSubjectFilter = item.dataset.subject || "all";
      closeMenu();
      renderMaterialCards();
    });
  }
}

/** Pasang interaktivitas pencarian materi (debounced, Escape clear, Enter no-submit). */
function setupSearchInput() {
  const searchInput = $("#materiSearchInput");
  const clearBtn = $("#materiSearchClear");
  if (!searchInput) return;

  if (searchInput.dataset.bound) return;
  searchInput.dataset.bound = "true";

  function doSearch(value) {
    const trimmed = value.trim();
    if (trimmed === activeSearchQuery) return;
    activeSearchQuery = trimmed;
    renderMaterialCards();
  }

  searchInput.addEventListener("input", (e) => {
    const value = e.target.value;
    // Show/hide clear button immediately
    if (clearBtn) {
      if (value) clearBtn.classList.remove("hidden");
      else clearBtn.classList.add("hidden");
    }
    // Debounce 200ms
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => doSearch(value), 200);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      searchInput.value = "";
      if (clearBtn) clearBtn.classList.add("hidden");
      doSearch("");
      searchInput.blur();
    }
    // Prevent form submission on Enter (no form, but safety)
    if (e.key === "Enter") {
      e.preventDefault();
      searchInput.blur();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      searchInput.value = "";
      clearBtn.classList.add("hidden");
      doSearch("");
      searchInput.focus();
    });
  }
}
async function loadMaterials() {
  const grid = $("#materiGrid");
  if (!grid) return;

  setupCategoryFilters();
  setupSearchInput();

  // Tampilkan materi dummy langsung agar halaman tidak pernah kosong / menunggu
  renderMaterialCards();

  // Coba periksa apakah backend memiliki materi tambahan
  try {
    const data = await api("/api/materials", 1500);
    if (data && Array.isArray(data.materials) && data.materials.length > 0) {
      const existingSubjects = new Set(data.materials.map((m) => (m.subject || "").toLowerCase().trim()));
      const extraDummies = DUMMY_MATERIALS.filter(
        (d) => !existingSubjects.has((d.subject || "").toLowerCase().trim())
      );

      allMaterials = [
        ...data.materials.map((m) => {
          if (!m.image_url) m.image_url = svgThumb(m.emoji || "📘", "#EEF2FF");
          return m;
        }),
        ...extraDummies
      ];
      renderMaterialCards();
    }
  } catch (_) {
    // Backend offline / belum jalan — materi dummy tetap tampil prima tanpa gangguan
  }
}

/* ======================== HALAMAN DETAIL MATERI ========================== */

function renderDetailContent(material) {
  $("#dTitle").textContent = material.title || "Detail Materi";
  $("#dSubject").textContent = material.subject || "📖 Materi";
  $("#dSummary").textContent = material.summary || "";
  $("#dCount").textContent = (material.question_count || 0) + " soal";
  $("#dBadge").textContent = material.emoji || "📘";

  const image = $("#dImage");
  if (image) {
    image.src = resolveImageUrl(material.image_url) || svgThumb(material.emoji || "📘", material.color || "#EEF2FF");
    image.alt = "Ilustrasi " + material.title;
  }

  const contentBox = $("#dContent");
  if (contentBox) {
    contentBox.innerHTML = material.content || "<p>Belum ada isi materi.</p>";
  }

  document.title = "📖 " + material.title + " | Kuis Petualangan Ceria";
  showState("#materiDetail");

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

async function loadMaterialDetail() {
  const article = $("#materiDetail");
  if (!article) return;

  const rawId = new URLSearchParams(location.search).get("id") || "1";
  const numId = parseInt(rawId, 10);

  // Cari di kumpulan materi dummy terlebih dahulu
  const dummyFound = DUMMY_MATERIALS.find((m) => m.id === numId) || DUMMY_MATERIALS[0];

  // Tampilkan materi dummy seketika
  if (dummyFound) {
    renderDetailContent(dummyFound);
    renderQuizSets(dummyFound.quizSets || []);
  } else {
    showState("#dLoading");
  }

  // Jika ID valid, cek apakah backend punya versi data terbaru
  if (!isNaN(numId)) {
    try {
      const data = await api("/api/materials/" + numId, 1500);
      if (data && data.material) {
        renderDetailContent(data.material);
        await loadQuizSets(data.material.id);
      }
    } catch (_) {
      // Jika backend gagal, tampilan dummy yang sudah dirender tetap aktif
    }
  }
}

/* ======================== DAFTAR SET SOAL (DETAIL) ====================== */

function renderQuizSets(sets) {
  const list = $("#quizSetsList");
  const empty = $("#quizSetsEmpty");
  if (!list) return;

  if (!sets || !sets.length) {
    list.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }

  if (empty) empty.classList.add("hidden");
  list.innerHTML = "";

  sets.forEach((set, index) => {
    const card = document.createElement("a");
    card.className = "quiz-set-card";
    card.href = "index.html";
    card.style.animationDelay = index * 0.08 + "s";

    card.innerHTML =
      '<div class="quiz-set-icon"><i data-lucide="file-question"></i></div>' +
      '<div class="quiz-set-info">' +
        "<strong>" + (set.title || "Set Soal Kuis") + "</strong>" +
        (set.description ? "<p>" + set.description + "</p>" : "") +
        '<span class="quiz-set-count">' + (set.question_count || 0) + " soal</span>" +
      "</div>" +
      '<span class="quiz-set-go">Ikuti Kuis <i data-lucide="arrow-right"></i></span>';

    list.appendChild(card);
  });

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

async function loadQuizSets(materialId) {
  const list = $("#quizSetsList");
  const empty = $("#quizSetsEmpty");
  if (!list) return;

  try {
    const data = await api("/api/sets?materialId=" + materialId, 1500);
    const sets = data.sets || [];
    renderQuizSets(sets);
  } catch (_) {
    // Jika API gagal, biarkan quizSets yang sudah dirender dari dummy
  }
}

/* ==================== MODAL LOGIN KREATOR SOAL ==================== */

let googleClientId = null;
let googleClientInitialized = false;

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/** Highlight search terms in text with <mark> tags (escape-then-wrap, safe). */
function highlightMatches(text, query) {
  if (!query || !text) return escapeHtml(text);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return escapeHtml(text);

  const escaped = escapeHtml(text);
  let result = escaped;
  // Sort terms by length descending to avoid nested marks
  terms.sort((a, b) => b.length - a.length);
  for (const term of terms) {
    const regex = new RegExp("(" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
    result = result.replace(regex, "<mark>$1</mark>");
  }
  return result;
}

function showLoginError(message) {
  const loginError = document.getElementById("loginError");
  if (!loginError) return;
  loginError.innerHTML = '<i data-lucide="alert-circle"></i><span>' + escapeHtml(message) + '</span>';
  loginError.classList.add("show");
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons({ root: loginError });
  }
}

function clearLoginError() {
  const loginError = document.getElementById("loginError");
  if (!loginError) return;
  loginError.classList.remove("show");
  loginError.innerHTML = "";
}

function initGoogleSignIn() {
  const container = document.getElementById("googleBtnContainer");
  if (!container) return;

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

function openLoginModal() {
  const modal = document.getElementById("modalLogin");
  if (!modal) return;

  modal.classList.add("show");
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("login-modal-open");

  clearLoginError();

  if (typeof initGoogleSignIn === "function") {
    initGoogleSignIn();
  }

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  const uInput = document.getElementById("username");
  const mForm = document.getElementById("loginForm");
  if (uInput && mForm && mForm.style.display !== "none") {
    setTimeout(() => uInput.focus(), 150);
  }
}

function closeLoginModal() {
  const modal = document.getElementById("modalLogin");
  if (!modal) return;

  modal.classList.remove("show");
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("login-modal-open");

  clearLoginError();
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
      const manualForm = document.getElementById("loginForm");
      const btnToggle = document.getElementById("btnToggleManualLogin");
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

async function handleGoogleCredentialResponse(response) {
  if (!response || !response.credential) {
    showLoginError("Gagal menerima kredensial dari akun Google.");
    return;
  }

  const loadingEl = document.getElementById("googleAuthLoading");
  if (loadingEl) loadingEl.classList.remove("hidden");
  clearLoginError();

  try {
    showToast("Sedang memverifikasi kredensial Google...", "info", "Menghubungkan Akun");

    const data = await api("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential: response.credential })
    });

    localStorage.setItem("kuis.token", data.token);
    closeLoginModal();

    const teacherName = data.teacher?.fullName || data.teacher?.username || "Pengajar";
    showToast("Selamat datang di Kreator Soal, " + escapeHtml(teacherName) + "!", "success", "Berhasil Masuk");

    setTimeout(() => {
      window.location.href = "index.html#page-dashboard";
    }, 400);
  } catch (err) {
    showLoginError(err.message || "Login Google gagal, silakan coba lagi.");
    showToast(err.message || "Gagal masuk dengan Google", "error", "Login Gagal");
  } finally {
    if (loadingEl) loadingEl.classList.add("hidden");
  }
}

window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;

async function handleLogin(event) {
  event.preventDefault();

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginForm = document.getElementById("loginForm");
  const submitBtn = document.getElementById("btnLoginSubmit") || document.querySelector(".btn-login-submit");

  const usernameOrEmail = usernameInput ? usernameInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  function shake() {
    if (loginForm) {
      loginForm.classList.remove("shake");
      void loginForm.offsetWidth;
      loginForm.classList.add("shake");
      setTimeout(() => loginForm.classList.remove("shake"), 500);
    }
  }

  if (!usernameOrEmail || !password) {
    showLoginError("Username/email dan password wajib diisi!");
    shake();
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> <span>Memverifikasi...</span>';
    if (window.lucide && typeof window.lucide.createIcons === "function") lucide.createIcons({ root: submitBtn });
  }

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ usernameOrEmail, password })
    });

    localStorage.setItem("kuis.token", data.token);
    closeLoginModal();
    clearLoginError();

    if (loginForm) loginForm.reset();

    const teacherName = data.teacher?.fullName || data.teacher?.username || "Pengajar";
    showToast("Selamat datang di Kreator Soal, " + escapeHtml(teacherName) + "!", "success", "Berhasil Masuk");

    setTimeout(() => {
      window.location.href = "index.html#page-dashboard";
    }, 400);
  } catch (err) {
    showLoginError(err.message || "Login gagal, coba lagi.");
    shake();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i data-lucide="log-in"></i> <span>Masuk Sekarang</span>';
      if (window.lucide && typeof window.lucide.createIcons === "function") lucide.createIcons({ root: submitBtn });
    }
  }
}

function initLoginModal() {
  // Tangani klik tautan Kreator Soal di navigasi agar modal pop up di halaman saat ini
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest('[data-page="page-login"], a[href*="page-login"]');
    if (trigger) {
      event.preventDefault();
      const token = localStorage.getItem("kuis.token");
      if (token) {
        window.location.href = "index.html#page-dashboard";
      } else {
        openLoginModal();
      }
    }
  });

  const btnClose = document.getElementById("btnCloseModalLogin");
  if (btnClose) {
    btnClose.addEventListener("click", closeLoginModal);
  }

  const modalOverlay = document.getElementById("modalLogin");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeLoginModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("modalLogin");
      if (modal && (modal.classList.contains("show") || modal.classList.contains("active"))) {
        closeLoginModal();
      }
    }
  });

  const btnToggleManual = document.getElementById("btnToggleManualLogin");
  const manualForm = document.getElementById("loginForm");
  if (btnToggleManual && manualForm) {
    btnToggleManual.addEventListener("click", () => {
      const isHidden = manualForm.style.display === "none";
      manualForm.style.display = isHidden ? "block" : "none";
      btnToggleManual.classList.toggle("active", isHidden);
      if (isHidden) {
        const uInput = document.getElementById("username");
        if (uInput) setTimeout(() => uInput.focus(), 150);
        if (window.lucide && typeof window.lucide.createIcons === "function") {
          window.lucide.createIcons();
        }
      }
    });
  }

  const togglePassBtn = document.getElementById("togglePass");
  const passInput = document.getElementById("password");
  if (togglePassBtn && passInput) {
    togglePassBtn.addEventListener("click", () => {
      const isPassword = passInput.type === "password";
      passInput.type = isPassword ? "text" : "password";
      togglePassBtn.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
      togglePassBtn.setAttribute("aria-label", isPassword ? "Sembunyikan password" : "Tampilkan password");
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    });
  }

  if (manualForm) {
    manualForm.addEventListener("submit", handleLogin);
  }
}

/* ============================== INISIALISASI ============================= */

document.addEventListener("DOMContentLoaded", () => {
  loadMaterials();
  loadMaterialDetail();
  initLoginModal();
  initGoogleSignIn();
});
