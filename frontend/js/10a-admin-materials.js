

/* =============== (9b) KELOLA MATERI & SOAL (ADMIN) ==================== */

/** Beralih antar tab dashboard (Materi / Soal / Riwayat). */
function switchTab(tabId) {
  document.querySelectorAll(".dash-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

/** Pesan error kecil di dalam form admin. */
function showFormError(box, message) {
  if (!box) return;
  if (message) {
    box.innerHTML = '<i data-lucide="alert-circle"></i><span>' + escapeHtml(message) + '</span>';
    box.classList.add("show");
    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons({ root: box });
    }
  } else {
    box.innerHTML = "";
    box.classList.remove("show");
  }
}

/** Ambil semua materi + soal (endpoint khusus pengajar, butuh token). */
async function loadAdminData() {
  try {
    const [materiData, setData, soalData] = await Promise.all([
      api("/api/materials/manage"),
      api("/api/sets/manage"),
      api("/api/questions/manage")
    ]);

    materiList = materiData.materials || [];
    setList = setData.sets || [];
    if (materiAdminList && materiCount) renderMateriAdmin();
    renderSetAdmin();
    renderSoalAdmin(soalData.questions || []);
    fillMaterialSelect();
    fillSetSelect();
    fillSetMaterialSelect();
    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
  } catch (err) {
    if (err.status === 401) return; // biarkan renderDashboard yang menangani
    showToast("Gagal memuat data dashboard pengajar.", "error", "Gagal Memuat Data");
  }
}

/* ------------------------- DAFTAR MATERI ------------------------------- */

function renderMateriAdmin() {
  if (!materiCount || !materiAdminList) return;
  materiCount.textContent = materiList.length;
  materiAdminList.innerHTML = "";

  if (!materiList.length) {
    materiAdminList.innerHTML =
      '<li class="admin-empty">Belum ada materi. Buat materi pertama lewat form di samping 👉</li>';
    return;
  }

  materiList.forEach((material, index) => {
    const li = document.createElement("li");
    li.style.animationDelay = index * 0.05 + "s";
    li.innerHTML =
      '<span class="admin-thumb">' +
        (material.image_url
          ? '<img src="' + resolveImageUrl(material.image_url) + '" alt="">'
          : material.emoji || "📘") +
      "</span>" +
      '<div class="admin-info">' +
        "<strong>" + material.title + "</strong>" +
        "<small>" +
          '<span class="tag' + (material.is_published ? "" : " warn") + '">' +
            (material.is_published ? "Publish" : "Draf") +
          "</span>" +
          (material.subject || "Umum") + " · " + material.question_count + " soal" +
        "</small>" +
      "</div>" +
      '<div class="admin-actions">' +
        '<button class="icon-mini edit" type="button" title="Ubah materi" data-action="edit" data-id="' + material.id + '">✏️</button>' +
        '<button class="icon-mini" type="button" title="Publish / draf" data-action="toggle" data-id="' + material.id + '">' +
          (material.is_published ? "🙈" : "✅") + "</button>" +
        '<button class="icon-mini danger" type="button" title="Hapus materi" data-action="delete" data-id="' + material.id + '">🗑️</button>' +
      "</div>";

    materiAdminList.appendChild(li);
  });
}

/** Isi form materi dari data yang dipilih (mode ubah). */
function editMateri(material) {
  if (!materiForm || !materiFormTitle) return;
  editingMateriId = material.id;
  materiFormTitle.textContent = "✏️ Ubah Materi: " + material.title;
  mTitle.value = material.title;
  mSummary.value = material.summary || "";
  mSubject.value = material.subject || "";
  mEmoji.value = material.emoji || "📘";
  mImage.value = material.image_url || "";
  mContent.value = material.content || "";
  mPublish.checked = material.is_published;
  if (btnCancelMateri) btnCancelMateri.hidden = false;
  showFormError(materiError, "");
  switchTab("tabMateri");
  materiForm.scrollIntoView({ behavior: "smooth", block: "center" });
  mTitle.focus();
}

/** Kembali ke mode tambah materi. */
function resetMateriForm() {
  if (!materiForm || !materiFormTitle) return;
  editingMateriId = null;
  materiFormTitle.textContent = "➕ Tambah Materi Baru";
  materiForm.reset();
  mEmoji.value = "📘";
  mPublish.checked = true;
  if (btnCancelMateri) btnCancelMateri.hidden = true;
  showFormError(materiError, "");
}

/* --------------------------- DAFTAR SOAL -------------------------------- */

function renderSoalAdmin(questions) {
  soalCount.textContent = questions.length;
  soalAdminList.innerHTML = "";

  if (!questions.length) {
    soalAdminList.innerHTML =
      '<li class="admin-empty">Belum ada butir soal. Mulai tulis soal pertama Anda menggunakan formulir di sebelah kiri.</li>';
    return;
  }

  questions.forEach((question, index) => {
    const li = document.createElement("li");
    li.className = "claude-soal-item";
    li.style.animationDelay = index * 0.04 + "s";
    li.innerHTML =
      '<span class="admin-thumb">' + (question.image || "❓") + "</span>" +
      '<div class="admin-info">' +
        '<div class="admin-q-head">' +
          "<strong>" + escapeHtml(question.question) + "</strong>" +
        "</div>" +
        "<small>" +
          '<span class="claude-pill-tag">' + escapeHtml(question.subject || "Umum") + "</span>" +
          (question.material_title
            ? ' <span class="claude-meta-chunk">📚 ' + escapeHtml(question.material_title) + "</span>"
            : "") +
          (question.quiz_set_title
            ? ' <span class="claude-meta-chunk">📋 ' + escapeHtml(question.quiz_set_title) + "</span>"
            : "") +
        "</small>" +
      "</div>" +
      '<div class="admin-actions">' +
        '<button class="icon-mini edit" type="button" title="Ubah soal" data-action="edit-q" data-id="' + question.id + '"><i data-lucide="edit-3"></i></button>' +
        '<button class="icon-mini danger" type="button" title="Hapus soal" data-action="delete-q" data-id="' + question.id + '"><i data-lucide="trash-2"></i></button>' +
      "</div>";

    soalAdminList.appendChild(li);
  });

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

/** Isi form soal dari data yang dipilih (mode ubah). */
function editSoal(question) {
  editingSoalId = question.id;
  soalFormTitle.textContent = "Ubah Soal";
  qQuestion.value = question.question || "";

  const opts = Array.isArray(question.options) ? question.options : [];
  const inputs = [$("#optInput0"), $("#optInput1"), $("#optInput2"), $("#optInput3")];
  inputs.forEach((inp, idx) => {
    if (inp) inp.value = opts[idx] || "";
  });

  setSelectedCorrectRadio(question.answer ?? 0);

  adEmoji.value = question.image || "❓";
  adSubject.value = question.subject || "";
  qMaterial.value = question.material_id || "";
  if (qSet) qSet.value = question.quiz_set_id || "";
  qFact.value = question.fact || "";
  btnCancelSoal.hidden = false;
  showFormError(soalError, "");
  switchTab("tabSoal");
  soalForm.scrollIntoView({ behavior: "smooth", block: "center" });
  qQuestion.focus();
}

/** Kembali ke mode tambah soal. */
function resetSoalForm() {
  editingSoalId = null;
  soalFormTitle.textContent = "Tambah Soal Baru";
  soalForm.reset();
  const inputs = [$("#optInput0"), $("#optInput1"), $("#optInput2"), $("#optInput3")];
  inputs.forEach((inp) => {
    if (inp) inp.value = "";
  });
  setSelectedCorrectRadio(0);
  adEmoji.value = "❓";
  btnCancelSoal.hidden = true;
  showFormError(soalError, "");
}

/* ------------------------- DAFTAR SET SOAL ------------------------------ */

function renderSetAdmin() {
  if (!setAdminList || !setCount) return;
  setCount.textContent = setList.length;
  setAdminList.innerHTML = "";

  if (!setList.length) {
    setAdminList.innerHTML =
      '<li class="set-empty-card">' +
        '<div class="set-empty-icon"><i data-lucide="layers"></i></div>' +
        '<h5 class="set-empty-title">Belum Ada Paket Kuis</h5>' +
        '<p class="set-empty-desc">Mulai buat paket kuis pertama Anda melalui formulir di samping untuk membagikan kode akses kepada siswa.</p>' +
      '</li>';
    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
    return;
  }

  setList.forEach(function (set, index) {
    var li = document.createElement("li");
    li.className = "set-card-item";
    li.style.animationDelay = index * 0.04 + "s";

    var codeHtml = set.access_code
      ? '<div class="set-code-badge">' +
          '<i data-lucide="key-round" class="set-code-icon"></i>' +
          '<span class="set-code-lbl">Kode:</span>' +
          '<strong class="set-code-val">' + escapeHtml(set.access_code) + '</strong>' +
          '<button class="btn-copy-code" type="button" data-action="copy-code" data-id="' + set.id + '" data-code="' + escapeHtml(set.access_code) + '" title="Salin kode kuis ke papan klip">' +
            '<i data-lucide="copy"></i><span>Salin</span>' +
          '</button>' +
        '</div>'
      : '';

    var statusHtml = set.is_published
      ? '<span class="set-status-pill published"><i data-lucide="globe"></i><span>Publik</span></span>'
      : '<span class="set-status-pill draft"><i data-lucide="lock"></i><span>Draf</span></span>';

    var timeHtml = set.time_limit > 0
      ? '<span class="set-meta-pill"><i data-lucide="clock-3"></i><span>' + set.time_limit + ' Menit</span></span>'
      : '';

    var questionsHtml = '<span class="set-meta-pill"><i data-lucide="help-circle"></i><span>' + set.question_count + ' Soal</span></span>';

    var descHtml = set.description
      ? '<p class="set-card-desc" title="' + escapeHtml(set.description) + '">' + escapeHtml(set.description) + '</p>'
      : '';

    var toggleTitle = set.is_published ? "Sembunyikan (Ubah ke Draf)" : "Publikasikan untuk Siswa";
    var toggleIcon = set.is_published ? "eye-off" : "eye";

    li.innerHTML =
      '<div class="set-card-main">' +
        '<div class="set-card-thumb" aria-hidden="true">' +
          '<i data-lucide="layers"></i>' +
        '</div>' +
        '<div class="set-card-body">' +
          '<div class="set-card-headline">' +
            '<h5 class="set-card-title">' + escapeHtml(set.title) + '</h5>' +
            statusHtml +
          '</div>' +
          descHtml +
          '<div class="set-card-meta">' +
            questionsHtml +
            timeHtml +
            codeHtml +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="set-card-actions">' +
        '<button class="btn-manage-q" type="button" title="Kelola butir soal dan kunci jawaban kuis ini" data-action="manage-questions" data-id="' + set.id + '">' +
          '<i data-lucide="sliders-horizontal"></i>' +
          '<span>Atur Soal</span>' +
          '<span class="set-q-count-badge">' + set.question_count + '</span>' +
        '</button>' +
        '<div class="set-action-buttons">' +
          '<button class="action-btn-ui edit" type="button" title="Ubah nama & pengaturan set kuis" data-action="edit-set" data-id="' + set.id + '">' +
            '<i data-lucide="pen-line"></i>' +
          '</button>' +
          '<button class="action-btn-ui" type="button" title="' + toggleTitle + '" data-action="toggle-set" data-id="' + set.id + '">' +
            '<i data-lucide="' + toggleIcon + '"></i>' +
          '</button>' +
          '<button class="action-btn-ui danger" type="button" title="Hapus set kuis" data-action="delete-set" data-id="' + set.id + '">' +
            '<i data-lucide="trash-2"></i>' +
          '</button>' +
        '</div>' +
      '</div>';

    setAdminList.appendChild(li);
  });
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

/** Buka panel atur soal & jawaban kuis */
async function openQuizQuestionsManager(setId) {
  const set = setList.find((s) => s.id === setId);
  if (!set) return;

  activeManagerSetId = setId;
  if (quizQuestionsManager) {
    quizQuestionsManager.classList.remove("hidden");
    quizQuestionsManager.hidden = false;
  }

  if (mgrSetTitle) {
    mgrSetTitle.textContent = set.title;
  }
  if (mgrSetMeta) {
    mgrSetMeta.textContent =
      (set.time_limit > 0 ? "Batas Waktu: " + set.time_limit + " Menit" : "Tanpa Batas Waktu") +
      " · Kode Akses: " + (set.access_code || "-");
  }

  await loadQuizQuestions(setId);
  if (quizQuestionsManager) {
    quizQuestionsManager.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/** Muat soal-soal dalam satu set kuis beserta pilihan jawaban & tombol atur kunci */
async function loadQuizQuestions(setId) {
  if (!mgrQuestionsList) return;
  mgrQuestionsList.innerHTML = '<div class="mgr-empty-state"><p>Memuat soal...</p></div>';

  try {
    const data = await api("/api/sets/" + setId + "/questions");
    const questions = data.questions || [];

    if (!questions.length) {
      mgrQuestionsList.innerHTML =
        '<div class="mgr-empty-state">' +
          '<strong>Belum ada soal pada kuis ini</strong>' +
          '<p>Tambahkan butir soal pertama untuk kuis ini agar siswa dapat mulai mengerjakan.</p>' +
          '<button type="button" class="btn btn-small btn-primary" data-action="mgr-add-q" data-setid="' + setId + '">' +
            '<i data-lucide="plus-circle"></i><span>Tambah Soal Pertama</span>' +
          '</button>' +
        '</div>';
      if (window.lucide && typeof lucide.createIcons === "function") {
        lucide.createIcons();
      }
      return;
    }

    const letters = ["A", "B", "C", "D", "E"];
    mgrQuestionsList.innerHTML = questions.map((q, qIndex) => {
      const optionsHtml = (q.options || []).map((opt, optIndex) => {
        const isCorrect = Number(q.answer) === optIndex;
        return (
          '<div class="mgr-option ' + (isCorrect ? 'is-correct' : '') + '">' +
            '<div class="mgr-option-left">' +
              '<span class="mgr-option-letter">' + (letters[optIndex] || (optIndex + 1)) + '</span>' +
              '<span class="mgr-option-text" title="' + escapeHtml(opt) + '">' + escapeHtml(opt) + '</span>' +
            '</div>' +
            (isCorrect
              ? '<span class="mgr-correct-tag"><i data-lucide="check"></i> Kunci Jawaban</span>'
              : '<button type="button" class="btn-set-correct" data-action="set-answer" data-qid="' + q.id + '" data-idx="' + optIndex + '" title="Tandai sebagai kunci jawaban yang benar">Jadikan Kunci</button>') +
          '</div>'
        );
      }).join("");

      return (
        '<div class="mgr-question-card" id="mgrCard-' + q.id + '">' +
          '<div class="mgr-q-header">' +
            '<span class="mgr-q-badge"><i data-lucide="help-circle"></i> Soal #' + (qIndex + 1) + (q.subject ? " · " + escapeHtml(q.subject) : "") + '</span>' +
            '<div class="mgr-q-actions">' +
              '<button type="button" class="btn-xs" data-action="edit-mgr-q" data-qid="' + q.id + '" title="Ubah soal ini"><i data-lucide="pen-line"></i><span>Edit</span></button>' +
              '<button type="button" class="btn-xs btn-danger" data-action="delete-mgr-q" data-qid="' + q.id + '" title="Hapus soal ini"><i data-lucide="trash-2"></i><span>Hapus</span></button>' +
            '</div>' +
          '</div>' +
          '<p class="mgr-q-text">' + escapeHtml(q.question) + '</p>' +
          '<div class="mgr-options-grid">' +
            optionsHtml +
          '</div>' +
          (q.fact ? '<span class="mgr-q-fact"><i data-lucide="info"></i> <strong>Penjelasan:</strong> ' + escapeHtml(q.fact) + '</span>' : '') +
        '</div>'
      );
    }).join("");

    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
  } catch (err) {
    mgrQuestionsList.innerHTML =
      '<div class="mgr-empty-state"><p style="color:var(--danger)">Gagal memuat soal: ' + escapeHtml(err.message) + '</p></div>';
  }
}

/** Navigasi cepat untuk menambah soal ke set tertentu */
function handleAddQuestionToSet(setId) {
  resetSoalForm();
  fillSetSelect();
  if (qSet) qSet.value = setId;
  const set = setList.find((s) => s.id === setId);
  if (set && set.material_id && qMaterial) {
    qMaterial.value = set.material_id;
  }
  switchTab("tabSoal");
  if (soalForm) {
    soalForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (qQuestion) qQuestion.focus();
}

function editSet(set) {
  editingSetId = set.id;
  setFormTitle.textContent = "✏️ Ubah Set Soal: " + set.title;
  if (sSetMaterial) sSetMaterial.value = set.material_id || "";
  sSetTitle.value = set.title;
  sSetDesc.value = set.description || "";
  sSetTime.value = set.time_limit || "";
  sSetPublish.checked = set.is_published;
  btnCancelSet.hidden = false;
  showFormError(setError, "");
  switchTab("tabSetSoal");
  setForm.scrollIntoView({ behavior: "smooth", block: "center" });
  sSetTitle.focus();
}

function resetSetForm() {
  editingSetId = null;
  setFormTitle.textContent = "➕ Tambah Set Soal Baru";
  setForm.reset();
  sSetTime.value = "";
  sSetPublish.checked = true;
  btnCancelSet.hidden = true;
  showFormError(setError, "");
}

/** Isi dropdown pemilihan materi pada form soal. */
function fillMaterialSelect() {
  const current = qMaterial.value;
  qMaterial.innerHTML =
    '<option value="">— Belum terhubung materi —</option>' +
    materiList.map((m) =>
      '<option value="' + m.id + '">' + m.title + "</option>"
    ).join("");
  if (current) qMaterial.value = current;
}

/** Isi dropdown pemilihan set soal pada form soal. */
function fillSetSelect() {
  if (!qSet) return;
  const current = qSet.value;
  qSet.innerHTML =
    '<option value="">— Belum terhubung set soal —</option>' +
    setList.map((s) =>
      '<option value="' + s.id + '">' + s.title + " (" + (s.material_title || "?") + ")</option>"
    ).join("");
  if (current) qSet.value = current;
}

/** Isi dropdown pemilihan materi pada form set soal. */
function fillSetMaterialSelect() {
  if (!sSetMaterial) return;
  const current = sSetMaterial.value;
  sSetMaterial.innerHTML =
    '<option value="">— Pilih Materi —</option>' +
    materiList.map((m) =>
      '<option value="' + m.id + '">' + m.title + "</option>"
    ).join("");
  if (current) sSetMaterial.value = current;
}