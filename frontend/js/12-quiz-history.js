/* ==========================================================================
   12-quiz-history.js — Riwayat per kuis (dashboard guru)

   Menampilkan daftar set soal di tab Riwayat, lalu halaman detail dengan URL
   /guru/riwayat/:id (pencarian, pengurutan, pagination). Semua data diambil
   dari endpoint yang memeriksa kepemilikan guru di backend.
   ========================================================================== */

/** Label status jadwal dalam bahasa Indonesia. */
function scheduleStatusLabel(status) {
  if (status === "not_open") return "Belum dibuka";
  if (status === "open") return "Sedang berlangsung";
  if (status === "ended") return "Sudah berakhir";
  return "";
}

/** Tanggal & jam dalam WIB, mis. "12 Nov 2026, 13.00 WIB". */
function formatWibDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const formatted = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
  return formatted + " WIB";
}

/** Rentang jadwal satu set soal dalam WIB. */
function formatScheduleRange(set) {
  if (!set || !set.schedule_start) return "";
  const start = new Date(set.schedule_start);
  const end = new Date(set.schedule_end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  const day = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(start);

  const time = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  return day + ", " + time.format(start) + "-" + time.format(end) + " WIB";
}

/** Nilai untuk <input type="date"> berdasarkan waktu WIB. */
function toWibDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

/** Nilai untuk <input type="time"> berdasarkan waktu WIB. */
function toWibTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

/**
 * Baca jadwal dari form set soal. Tanggal + jam ditafsirkan sebagai WIB
 * (offset +07:00) agar tidak bergantung pada zona waktu perangkat guru.
 */
function readScheduleForm() {
  const date = sSetScheduleDate ? sSetScheduleDate.value : "";
  const start = sSetScheduleStart ? sSetScheduleStart.value : "";
  const end = sSetScheduleEnd ? sSetScheduleEnd.value : "";
  const filled = [date, start, end].filter(Boolean).length;

  if (filled === 0) {
    return { start: null, end: null, isPast: false };
  }
  if (filled < 3) {
    throw new Error("Lengkapi tanggal, jam mulai, dan jam selesai jadwal akses.");
  }

  const startDate = new Date(date + "T" + start + ":00+07:00");
  const endDate = new Date(date + "T" + end + ":00+07:00");
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Format jadwal akses tidak valid.");
  }
  if (endDate.getTime() <= startDate.getTime()) {
    throw new Error("Jam selesai harus lebih besar dari jam mulai.");
  }

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    isPast: endDate.getTime() < Date.now()
  };
}

/** Durasi ramah dari jumlah detik. */
function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || seconds === "") return "-";
  const total = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes <= 0) return rest + " detik";
  return minutes + " menit " + rest + " detik";
}

/* ------------------------- DAFTAR KUIS DI TAB RIWAYAT ------------------- */

/** Muat daftar set soal milik guru beserta ringkasan pengerjaan. */
async function loadQuizHistoryList() {
  if (!resultsList) return;

  resultsList.innerHTML = '<li class="history-list-loading">Memuat daftar kuis...</li>';

  try {
    const data = await api("/api/teacher/quiz-history");
    const sets = data.sets || [];

    if (!sets.length) {
      resultsList.innerHTML = '<li class="empty-note">Belum ada set kuis. Buat set soal terlebih dahulu agar riwayatnya muncul di sini.</li>';
      return;
    }

    resultsList.innerHTML = sets.map(function (set) {
      const statusLabel = scheduleStatusLabel(set.schedule_status);
      const statusPill = statusLabel
        ? '<span class="history-set-status status-' + escapeHtml(set.schedule_status) + '">' + escapeHtml(statusLabel) + '</span>'
        : '<span class="history-set-status status-none">Tanpa jadwal</span>';

      const scheduleLine = set.schedule_start
        ? '<span class="history-set-meta"><i data-lucide="calendar-clock"></i> ' + escapeHtml(formatScheduleRange(set)) + '</span>'
        : '';

      return (
        '<li class="history-set-item">' +
          '<button type="button" class="history-set-card" data-history-set="' + set.id + '">' +
            '<span class="history-set-icon" aria-hidden="true"><i data-lucide="list-checks"></i></span>' +
            '<span class="history-set-body">' +
              '<span class="history-set-headline">' +
                '<strong class="history-set-title">' + escapeHtml(set.title) + '</strong>' +
                statusPill +
              '</span>' +
              '<span class="history-set-stats">' +
                '<span class="history-set-meta"><i data-lucide="users"></i> ' + Number(set.student_count || 0) + ' siswa mengerjakan</span>' +
                '<span class="history-set-meta"><i data-lucide="bar-chart-3"></i> Rata-rata ' + Number(set.average_percent || 0).toFixed(1) + '%</span>' +
                '<span class="history-set-meta"><i data-lucide="repeat"></i> ' + Number(set.attempt_count || 0) + ' pengerjaan</span>' +
                scheduleLine +
              '</span>' +
            '</span>' +
            '<span class="history-set-arrow" aria-hidden="true"><i data-lucide="chevron-right"></i></span>' +
          '</button>' +
        '</li>'
      );
    }).join("");

    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
  } catch (err) {
    resultsList.innerHTML = '<li class="empty-note">Gagal memuat daftar kuis: ' + escapeHtml(err.message) + '</li>';
  }
}

/* --------------------------- HALAMAN DETAIL ------------------------------ */

/** Buka halaman Riwayat Kuis untuk satu set soal. */
async function openQuizHistory(setId, pushUrl) {
  quizHistoryState.setId = Number(setId);
  quizHistoryState.page = 1;
  quizHistoryState.search = "";
  quizHistoryState.sort = "date_desc";
  quizHistoryState.requestId++;

  if (historySearch) historySearch.value = "";
  if (historySort) historySort.value = "date_desc";

  if (pushUrl !== false && window.history && window.history.pushState) {
    window.history.pushState({ quizHistory: quizHistoryState.setId }, "", "/guru/riwayat/" + quizHistoryState.setId);
  }

  showPage("page-quiz-history");
  await loadQuizHistoryDetail();
}

/** Ambil & render detail riwayat sesuai pencarian/sort/pagination aktif. */
async function loadQuizHistoryDetail() {
  if (!quizHistoryState.setId) return;

  const state = quizHistoryState;
  const requestId = ++state.requestId;

  if (historyTableBody) {
    historyTableBody.innerHTML = '<tr><td colspan="6" class="history-loading">Memuat riwayat...</td></tr>';
  }
  if (historyEmpty) historyEmpty.classList.add("hidden");
  if (historyPagination) historyPagination.innerHTML = "";

  try {
    const params = new URLSearchParams({
      search: state.search,
      sort: state.sort,
      page: String(state.page),
      pageSize: String(state.pageSize)
    });
    const data = await api("/api/teacher/quiz-history/" + state.setId + "?" + params.toString());
    if (requestId !== state.requestId) return;
    renderHistoryDetail(data);
  } catch (err) {
    if (requestId !== state.requestId) return;
    if (historyTitle) historyTitle.textContent = "Riwayat Kuis";
    if (historySubtitle) historySubtitle.textContent = err.message || "Gagal memuat riwayat kuis.";
    if (historySummary) historySummary.innerHTML = "";
    if (historyTableBody) historyTableBody.innerHTML = "";
    if (historyEmpty) {
      historyEmpty.textContent = err.status === 404
        ? (err.message || "Riwayat kuis tidak ditemukan atau bukan milik Anda.")
        : "Gagal memuat riwayat kuis.";
      historyEmpty.classList.remove("hidden");
    }
  }
}

/** Render judul, ringkasan, tabel, dan pagination. */
function renderHistoryDetail(data) {
  const set = data.set || {};
  const summary = data.summary || {};
  const pagination = data.pagination || {};
  const totalQuestions = Number(summary.total_questions) || Number(summary.highest_score) || 0;

  if (historyTitle) historyTitle.textContent = set.title || "Riwayat Kuis";

  if (historySubtitle) {
    const parts = [];
    if (set.access_code) parts.push("Kode akses: " + set.access_code);
    const statusLabel = scheduleStatusLabel(set.schedule_status);
    if (statusLabel) parts.push(statusLabel);
    if (set.schedule_start) parts.push(formatScheduleRange(set));
    historySubtitle.textContent = parts.join(" \u00b7 ");
  }

  if (historySummary) {
    historySummary.innerHTML =
      '<div class="history-summary-card">' +
        '<span class="history-summary-label">Jumlah Pengerjaan</span>' +
        '<strong class="history-summary-value">' + Number(summary.attempts || 0) + '</strong>' +
        '<small class="history-summary-note">' + Number(summary.students || 0) + ' siswa berbeda</small>' +
      '</div>' +
      '<div class="history-summary-card">' +
        '<span class="history-summary-label">Rata-rata</span>' +
        '<strong class="history-summary-value">' + Number(summary.average_percent || 0).toFixed(1) + '%</strong>' +
        '<small class="history-summary-note">skor rata-rata ' + Number(summary.average_score || 0).toFixed(1) + '</small>' +
      '</div>' +
      '<div class="history-summary-card">' +
        '<span class="history-summary-label">Skor Tertinggi</span>' +
        '<strong class="history-summary-value">' + Number(summary.highest_score || 0) + '</strong>' +
        '<small class="history-summary-note">dari ' + totalQuestions + ' soal</small>' +
      '</div>' +
      '<div class="history-summary-card">' +
        '<span class="history-summary-label">Skor Terendah</span>' +
        '<strong class="history-summary-value">' + Number(summary.lowest_score || 0) + '</strong>' +
        '<small class="history-summary-note">dari ' + totalQuestions + ' soal</small>' +
      '</div>';
  }

  if (historyTableBody) {
    const attempts = data.attempts || [];
    historyTableBody.innerHTML = attempts.map(function (row) {
      const started = formatWibDateTime(row.started_at);
      const finished = formatWibDateTime(row.finished_at || row.created_at);
      return (
        '<tr>' +
          '<td data-label="Nama Siswa"><strong>' + escapeHtml(row.student_name || "Siswa") + '</strong></td>' +
          '<td data-label="Skor"><strong>' + Number(row.score) + '</strong>/' + Number(row.total) + '</td>' +
          '<td data-label="Benar / Salah"><span class="history-pill-correct">' + Number(row.score) + ' benar</span> ' +
            '<span class="history-pill-wrong">' + Number(row.wrong_count || 0) + ' salah</span></td>' +
          '<td data-label="Mulai">' + escapeHtml(started) + '</td>' +
          '<td data-label="Selesai">' + escapeHtml(finished) + '</td>' +
          '<td data-label="Durasi">' + escapeHtml(formatDuration(row.duration_seconds)) + '</td>' +
        '</tr>'
      );
    }).join("");
  }

  if (historyEmpty) {
    if (Number(summary.attempts || 0) === 0) {
      historyEmpty.textContent = "Belum ada siswa yang mengerjakan kuis ini.";
      historyEmpty.classList.remove("hidden");
    } else if (data.search && Number(pagination.total || 0) === 0) {
      historyEmpty.textContent = "Siswa tidak ditemukan";
      historyEmpty.classList.remove("hidden");
    } else {
      historyEmpty.classList.add("hidden");
    }
  }

  renderHistoryPagination(pagination);

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

/** Tombol pagination sederhana (maksimal 5 nomor halaman). */
function renderHistoryPagination(pagination) {
  if (!historyPagination) return;
  const page = Number(pagination.page) || 1;
  const totalPages = Number(pagination.totalPages) || 1;

  if (totalPages <= 1) {
    historyPagination.innerHTML = "";
    return;
  }

  let html = '<button type="button" class="history-page-btn" data-history-page="' + (page - 1) + '"' + (page <= 1 ? " disabled" : "") + '>Sebelumnya</button>';
  const first = Math.max(1, page - 2);
  const last = Math.min(totalPages, page + 2);

  for (let i = first; i <= last; i++) {
    html += '<button type="button" class="history-page-btn' + (i === page ? " active" : "") + '" data-history-page="' + i + '"' + (i === page ? ' aria-current="page"' : "") + '>' + i + '</button>';
  }

  html += '<button type="button" class="history-page-btn" data-history-page="' + (page + 1) + '"' + (page >= totalPages ? " disabled" : "") + '>Berikutnya</button>';
  historyPagination.innerHTML = html;
}

/** Kembali ke tab Riwayat di dashboard. */
function backToHistoryTab() {
  if (window.history && window.history.pushState) {
    window.history.pushState({}, "", "/guru/riwayat");
  }
  showPage("page-dashboard");
  if (typeof switchTab === "function") switchTab("tabRiwayat");
  loadQuizHistoryList();
}

/** Pasang event halaman riwayat (dipanggil sekali saat init). */
function bindQuizHistoryEvents() {
  if (btnHistoryBack) {
    btnHistoryBack.addEventListener("click", backToHistoryTab);
  }

  if (historySearch) {
    historySearch.addEventListener("input", function () {
      clearTimeout(historySearchTimer);
      historySearchTimer = setTimeout(function () {
        quizHistoryState.search = historySearch.value.trim();
        quizHistoryState.page = 1;
        loadQuizHistoryDetail();
      }, 300);
    });
  }

  if (historySort) {
    historySort.addEventListener("change", function () {
      quizHistoryState.sort = historySort.value;
      quizHistoryState.page = 1;
      loadQuizHistoryDetail();
    });
  }

  if (resultsList) {
    resultsList.addEventListener("click", function (event) {
      const card = event.target.closest("[data-history-set]");
      if (!card) return;
      openQuizHistory(Number(card.dataset.historySet));
    });
  }

  if (historyPagination) {
    historyPagination.addEventListener("click", function (event) {
      const button = event.target.closest("[data-history-page]");
      if (!button || button.disabled) return;
      const nextPage = Number(button.dataset.historyPage);
      if (!Number.isInteger(nextPage) || nextPage < 1) return;
      quizHistoryState.page = nextPage;
      loadQuizHistoryDetail();
    });
  }
}

/**
 * Routing URL /guru/riwayat dan /guru/riwayat/:id.
 * @returns {Promise<boolean>} true bila URL ditangani.
 */
async function handleAppRoute() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const match = path.match(/^\/guru\/riwayat\/(\d+)$/);
  const isList = path === "/guru/riwayat";

  if (!match && !isList) return false;

  if (!getToken()) {
    showPage("page-home");
    openLoginModal();
    return true;
  }

  try {
    await renderDashboard();
    showPage("page-dashboard");

    if (match) {
      await openQuizHistory(Number(match[1]), false);
    } else {
      switchTab("tabRiwayat");
      await loadQuizHistoryList();
    }
  } catch (err) {
    showPage("page-home");
    showToast(err.message || "Gagal memuat halaman riwayat.", "error", "Gagal Memuat");
  }

  return true;
}
