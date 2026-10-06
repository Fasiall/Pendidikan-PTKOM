/* ==========================================================================
   materi.js — Halaman Daftar Materi (materi.html)
                     & Halaman Detail Materi (materi-detail.html)

   Endpoint yang dipakai (lihat backend/src/routes/index.js):
     GET /api/materials      -> daftar materi (judul + thumbnail)
     GET /api/materials/:id  -> isi lengkap materi berdasarkan ID

   Kedua halaman berbagi satu file ini; skrip memilih perilaku berdasarkan
   elemen yang ada di DOM.
   ========================================================================== */

const $ = (sel) => document.querySelector(sel);

/* Bila dibuka lewat Live Server (port 5500) / file://, arahkan API ke backend. */
const API_BASE =
  location.port === "5500" || location.protocol === "file:"
    ? "http://127.0.0.1:3000"
    : "";

/** Pembungkus fetch + parsing JSON dengan pesan error yang ramah. */
async function api(path) {
  const res = await fetch(API_BASE + path, {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* bukan JSON */ }

  if (!res.ok) {
    const error = new Error((data && data.error) || "Permintaan gagal.");
    error.status = res.status;
    throw error;
  }
  return data;
}

/** Notifikasi melayang (sama gayanya dengan halaman kuis). */
function showToast(message) {
  const box = $("#toast");
  if (!box) return;
  box.textContent = message;
  box.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => box.classList.remove("show"), 4000);
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

async function loadMaterials() {
  const grid = $("#materiGrid");
  if (!grid) return;

  showState("#materiLoading");

  try {
    const data = await api("/api/materials");
    const materials = data.materials || [];

    $("#materiCount").textContent = materials.length + " materi";

    if (!materials.length) {
      showState("#materiEmpty");
      return;
    }

    grid.innerHTML = "";
    materials.forEach((material, index) => {
      const card = document.createElement("a");
      card.className = "materi-card";
      card.href = "materi-detail.html?id=" + material.id;
      card.style.animationDelay = index * 0.08 + "s";

      card.innerHTML =
        '<div class="materi-thumb">' +
          '<img src="' + material.image_url + '" alt="Ilustrasi ' + material.title + '" loading="lazy">' +
          '<span class="materi-subject">' + (material.subject || "Umum") + "</span>" +
        "</div>" +
        '<div class="materi-body">' +
          "<h2>" + material.title + "</h2>" +
          "<p>" + (material.summary || "") + "</p>" +
          '<div class="materi-meta">' +
            "<span>📚 " + material.question_count + " soal</span>" +
            "<span class=\"materi-go\">Baca ➜</span>" +
          "</div>" +
        "</div>";

      grid.appendChild(card);
    });

    showState("#materiGrid");
  } catch (err) {
    $("#materiCount").textContent = "-";
    showState("#materiEmpty");
    showToast(
      err.status === 404
        ? "Endpoint materi tidak ditemukan."
        : "⚠️ Server belum terhubung. Jalankan backend dulu, ya."
    );
  }
}

/* ======================== HALAMAN DETAIL MATERI ========================== */

async function loadMaterialDetail() {
  const article = $("#materiDetail");
  if (!article) return;

  const id = new URLSearchParams(location.search).get("id");

  if (!id || !/^\d+$/.test(id)) {
    showState("#dEmpty");
    $("#dEmptyText").textContent = "ID materi tidak valid.";
    return;
  }

  showState("#dLoading");

  try {
    const data = await api("/api/materials/" + id);
    const material = data.material;

    $("#dTitle").textContent = material.title;
    $("#dSubject").textContent = material.subject || "📖 Materi";
    $("#dSummary").textContent = material.summary || "";
    $("#dCount").textContent = material.question_count + " soal";
    $("#dBadge").textContent = material.emoji || "📘";

    const image = $("#dImage");
    image.src = material.image_url;
    image.alt = "Ilustrasi " + material.title;

    /* Isi materi dikirim sebagai HTML oleh pengajar */
    $("#dContent").innerHTML = material.content;

    /* Tombol kuis membawa parameter materi supaya hanya soal terkait yang muncul */
    $("#dQuizBtn").href = "index.html?materi=" + material.id;

    document.title = "📖 " + material.title + " | Kuis Petualangan Ceria";
    showState("#materiDetail");
  } catch (err) {
    showState("#dEmpty");
    $("#dEmptyText").textContent =
      err.status === 404
        ? "Materi tidak ditemukan atau belum dipublikasikan."
        : "⚠️ Server belum terhubung. Jalankan backend dulu, ya.";
    showToast($("#dEmptyText").textContent);
  }
}

/* ============================== INISIALISASI ============================= */

document.addEventListener("DOMContentLoaded", () => {
  loadMaterials();
  loadMaterialDetail();
});
