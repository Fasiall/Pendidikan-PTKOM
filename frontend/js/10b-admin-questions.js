

/* ---------------------- EVENT: SUBMIT & KLIK --------------------------- */

function bindAdminEvents() {
  /* Tab dashboard */
  document.querySelectorAll(".dash-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  /* Simpan materi (tambah / ubah) */
  if (materiForm) {
    materiForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const payload = {
        title: mTitle.value.trim(),
        summary: mSummary.value.trim(),
        subject: mSubject.value.trim(),
        emoji: mEmoji.value.trim() || "📘",
        image_url: mImage.value.trim(),
        content: mContent.value,
        is_published: mPublish.checked
      };

      if (!payload.title || !payload.content) {
        showFormError(materiError, "Judul dan isi materi wajib diisi.");
        return;
      }

      try {
        if (editingMateriId) {
          await api("/api/materials/" + editingMateriId, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          showToast("Materi pembelajaran berhasil diperbarui.", "success", "Perubahan Tersimpan");
        } else {
          await api("/api/materials", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          showToast("Materi baru berhasil ditambahkan ke dashboard Anda.", "success", "Materi Ditambahkan");
        }

        resetMateriForm();
        await renderDashboard();
      } catch (err) {
        showFormError(materiError, err.message);
      }
    });
  }

  if (btnCancelMateri) {
    btnCancelMateri.addEventListener("click", resetMateriForm);
  }

  /* Simpan set soal (tambah / ubah) */
  if (setForm) {
    setForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const payload = {
        title: sSetTitle.value.trim(),
        description: sSetDesc.value.trim(),
        timeLimit: sSetTime.value ? Number(sSetTime.value) : 0,
        is_published: sSetPublish.checked
      };

      if (sSetMaterial && sSetMaterial.value) {
        payload.materialId = Number(sSetMaterial.value);
      } else if (materiList && materiList.length) {
        payload.materialId = materiList[0].id;
      }

      if (!payload.title) {
        showFormError(setError, "Judul set soal wajib diisi.");
        return;
      }

      try {
        if (editingSetId) {
          await api("/api/sets/" + editingSetId, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          showToast("Set soal berhasil diperbarui.", "success", "Perubahan Tersimpan");
        } else {
          await api("/api/sets", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          showToast("Set kuis baru berhasil dibuat dan siap digunakan.", "success", "Set Kuis Dibuat");
        }

        resetSetForm();
        await loadAdminData();
      } catch (err) {
        showFormError(setError, err.message);
      }
    });
  }

  if (btnCancelSet) {
    btnCancelSet.addEventListener("click", resetSetForm);
  }

  /* Aksi pada daftar set soal (ubah / publish / hapus / atur soal / salin kode) */
  if (setAdminList) {
    setAdminList.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = Number(button.dataset.id);
      const set = setList.find((item) => item.id === id);

      /* Fitur Salin Kode Kuis */
      if (button.dataset.action === "copy-code") {
        event.stopPropagation();
        const code = button.dataset.code || (set ? set.access_code : "");
        if (!code) return;

        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(code);
          } else {
            const temp = document.createElement("input");
            temp.value = code;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand("copy");
            document.body.removeChild(temp);
          }

          const origContent = button.innerHTML;
          button.innerHTML = '<i data-lucide="check"></i><span>Tersalin!</span>';
          button.classList.add("copied");
          if (window.lucide && typeof lucide.createIcons === "function") {
            lucide.createIcons();
          }
          showToast('Kode kuis <strong class="toast-code-hl">' + escapeHtml(code) + '</strong> berhasil disalin ke papan klip!', "copy", "Kode Kuis Disalin");
          setTimeout(() => {
            button.innerHTML = origContent;
            button.classList.remove("copied");
            if (window.lucide && typeof lucide.createIcons === "function") {
              lucide.createIcons();
            }
          }, 2000);
        } catch (_) {
          showToast('Kode kuis: <strong class="toast-code-hl">' + escapeHtml(code) + '</strong>', "info", "Kode Kuis");
        }
        return;
      }

      if (!set) return;

      try {
        if (button.dataset.action === "manage-questions") {
          await openQuizQuestionsManager(id);
        } else if (button.dataset.action === "edit-set") {
          editSet(set);
        } else if (button.dataset.action === "toggle-set") {
          await api("/api/sets/" + id + "/publish", {
            method: "PATCH",
            body: JSON.stringify({ is_published: !set.is_published })
          });
          showToast(set.is_published
            ? "Set soal dipindahkan ke draf."
            : "Set soal berhasil dipublikasikan untuk siswa.",
            "success",
            set.is_published ? "Set Masuk Draf" : "Set Dipublikasikan");
          await loadAdminData();
        } else if (button.dataset.action === "delete-set") {
          if (!confirm('Hapus set soal "' + set.title + '"? Soal di dalamnya tidak akan terhapus, hanya kehilangan referensi set.')) return;
          await api("/api/sets/" + id, { method: "DELETE" });
          showToast("Set soal berhasil dihapus.", "success", "Set Dihapus");
          if (editingSetId === id) resetSetForm();
          if (activeManagerSetId === id) {
            if (quizQuestionsManager) {
              quizQuestionsManager.classList.add("hidden");
              quizQuestionsManager.hidden = true;
            }
            activeManagerSetId = null;
          }
          await loadAdminData();
        }
      } catch (err) {
        showToast(err.message, "error", "Gagal Memproses");
      }
    });
  }

  /* Event pada Panel Atur Soal & Kunci Jawaban Kuis */
  if (btnMgrClose) {
    btnMgrClose.addEventListener("click", () => {
      if (quizQuestionsManager) {
        quizQuestionsManager.classList.add("hidden");
        quizQuestionsManager.hidden = true;
      }
      activeManagerSetId = null;
    });
  }

  if (btnMgrAddQuestion) {
    btnMgrAddQuestion.addEventListener("click", () => {
      if (activeManagerSetId) {
        handleAddQuestionToSet(activeManagerSetId);
      }
    });
  }

  if (mgrQuestionsList) {
    mgrQuestionsList.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const action = button.dataset.action;

      if (action === "set-answer") {
        const qid = Number(button.dataset.qid);
        const idx = Number(button.dataset.idx);
        const letters = ["A", "B", "C", "D", "E"];
        try {
          await api("/api/questions/" + qid + "/answer", {
            method: "PATCH",
            body: JSON.stringify({ answer: idx })
          });
          showToast("Kunci jawaban berhasil diubah ke Opsi " + (letters[idx] || (idx + 1)) + ".", "success", "Kunci Jawaban Diperbarui");
          if (activeManagerSetId) {
            await loadQuizQuestions(activeManagerSetId);
          }
        } catch (err) {
          showToast(err.message, "error", "Gagal Memperbarui");
        }
      } else if (action === "edit-mgr-q") {
        const qid = Number(button.dataset.qid);
        try {
          const data = await api("/api/questions/manage");
          const question = (data.questions || []).find((item) => item.id === qid);
          if (question) editSoal(question);
        } catch (err) {
          showToast(err.message, "error", "Gagal Memuat Soal");
        }
      } else if (action === "delete-mgr-q") {
        const qid = Number(button.dataset.qid);
        if (!confirm("Hapus soal ini dari kuis?")) return;
        try {
          await api("/api/questions/" + qid, { method: "DELETE" });
          showToast("Soal berhasil dihapus dari kuis.", "success", "Soal Dihapus");
          if (editingSoalId === qid) resetSoalForm();
          if (activeManagerSetId) {
            await loadQuizQuestions(activeManagerSetId);
          }
          await loadAdminData();
          await renderDashboard();
        } catch (err) {
          showToast(err.message, "error", "Gagal Menghapus");
        }
      } else if (action === "mgr-add-q") {
        const setId = Number(button.dataset.setid);
        if (setId) handleAddQuestionToSet(setId);
      }
    });
  }

  /* Saat set kuis dipilih di form soal, otomatis cocokan materi induknya */
  if (qSet) {
    qSet.addEventListener("change", () => {
      const setId = Number(qSet.value);
      const set = setList.find((s) => s.id === setId);
      if (set && set.material_id && qMaterial) {
        qMaterial.value = set.material_id;
      }
    });
  }

  /* Interaksi radio button & kartu pembuat pilihan jawaban */
  if (optionsCreatorList) {
    optionsCreatorList.addEventListener("change", (event) => {
      if (event.target.name === "optCorrectRadio") {
        setSelectedCorrectRadio(event.target.value);
      }
    });
  }

  /* Aksi pada daftar materi (ubah / publish / hapus) */
  if (materiAdminList) {
    materiAdminList.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = Number(button.dataset.id);
      const material = materiList.find((item) => item.id === id);
      if (!material) return;

      try {
        if (button.dataset.action === "edit") {
          editMateri(material);
        } else if (button.dataset.action === "toggle") {
          await api("/api/materials/" + id + "/publish", {
            method: "PATCH",
            body: JSON.stringify({ is_published: !material.is_published })
          });
          showToast(material.is_published
            ? "Materi pembelajaran dipindahkan ke draf."
            : "Materi pembelajaran berhasil dipublikasikan untuk siswa.",
            "success",
            material.is_published ? "Materi Masuk Draf" : "Materi Dipublikasikan");
          await loadAdminData();
        } else if (button.dataset.action === "delete") {
          if (!confirm('Hapus materi "' + material.title + '" beserta datanya?')) return;
          await api("/api/materials/" + id, { method: "DELETE" });
          showToast("Materi pembelajaran berhasil dihapus.", "success", "Materi Dihapus");
          if (editingMateriId === id) resetMateriForm();
          await loadAdminData();
          await renderDashboard();
        }
      } catch (err) {
        showToast(err.message, "error", "Gagal Memproses");
      }
    });
  }

  /* Simpan soal (tambah / ubah) */
  if (soalForm) {
    soalForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const rawA = $("#optInput0") ? $("#optInput0").value.trim() : "";
      const rawB = $("#optInput1") ? $("#optInput1").value.trim() : "";
      const rawC = $("#optInput2") ? $("#optInput2").value.trim() : "";
      const rawD = $("#optInput3") ? $("#optInput3").value.trim() : "";

      const rawOptions = [rawA, rawB, rawC, rawD];
      const selectedRadio = getSelectedCorrectRadio();

      if (!qQuestion.value.trim()) {
        showFormError(soalError, "Pertanyaan kuis wajib diisi.");
        return;
      }
      if (!rawA || !rawB) {
        showFormError(soalError, "Pilihan jawaban A dan B wajib diisi.");
        return;
      }
      if (!rawC && rawD) {
        showFormError(soalError, "Harap isi Pilihan C sebelum mengisi Pilihan D.");
        return;
      }

      const options = rawOptions.filter(Boolean);
      if (selectedRadio >= options.length) {
        const letters = ["A", "B", "C", "D"];
        showFormError(soalError, "Opsi " + letters[selectedRadio] + " ditandai sebagai kunci jawaban tetapi teksnya masih kosong.");
        return;
      }

      const payload = {
        question: qQuestion.value.trim(),
        options,
        answer: selectedRadio,
        image: adEmoji.value.trim() || "❓",
        subject: adSubject.value.trim(),
        fact: qFact.value.trim(),
        materialId: qMaterial.value ? Number(qMaterial.value) : null,
        quizSetId: qSet && qSet.value ? Number(qSet.value) : null
      };

      try {
        if (editingSoalId) {
          await api("/api/questions/" + editingSoalId, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          showToast("Soal berhasil diperbarui.", "success", "Perubahan Tersimpan");
        } else {
          await api("/api/questions", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          showToast("Soal baru berhasil disimpan ke akun Anda.", "success", "Soal Ditambahkan");
        }

        resetSoalForm();
        if (activeManagerSetId) {
          await loadQuizQuestions(activeManagerSetId);
        }
        await loadAdminData();
        await renderDashboard();
      } catch (err) {
        showFormError(soalError, err.message);
      }
    });
  }

  if (btnCancelSoal) {
    btnCancelSoal.addEventListener("click", resetSoalForm);
  }

  /* Aksi pada daftar soal (ubah / hapus) */
  if (soalAdminList) {
    soalAdminList.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = Number(button.dataset.id);
      const action = button.dataset.action;

      try {
        if (action === "edit-q") {
          const data = await api("/api/questions/manage");
          const question = (data.questions || []).find((item) => item.id === id);
          if (question) editSoal(question);
        } else if (action === "delete-q") {
          if (!confirm("Hapus soal ini?")) return;
          await api("/api/questions/" + id, { method: "DELETE" });
          showToast("Soal berhasil dihapus.", "success", "Soal Dihapus");
          if (editingSoalId === id) resetSoalForm();
          await loadAdminData();
          await renderDashboard();
        }
      } catch (err) {
        showToast(err.message, "error", "Gagal Memproses");
      }
    });
  }
  if (togglePass && passwordInput) {
    togglePass.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      if (togglePass.dataset.label) {
        togglePass.textContent = isPassword ? "Sembunyi" : "Lihat";
      } else {
        togglePass.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
      }
      togglePass.setAttribute("aria-label", isPassword ? "Sembunyikan password" : "Tampilkan password");
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    });
  }
}

/* Tampilkan/sembunyikan password untuk registrasi */
if (regTogglePass) {
  regTogglePass.addEventListener("click", () => {
    const isPassword = regPasswordInput.type === "password";
    regPasswordInput.type = isPassword ? "text" : "password";
    if (regConfirmPasswordInput) regConfirmPasswordInput.type = isPassword ? "text" : "password";
    if (regTogglePass.dataset.label) {
      regTogglePass.textContent = isPassword ? "Sembunyi" : "Lihat";
    } else {
      regTogglePass.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
    }
    regTogglePass.setAttribute("aria-label", isPassword ? "Sembunyikan password" : "Tampilkan password");
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  });
}