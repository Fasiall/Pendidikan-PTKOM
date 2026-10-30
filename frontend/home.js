/* ==========================================================================
   home.js — Angka ringkasan di beranda (Soal tersedia / Mata pelajaran / Siswa aktif)
   + tautan "Fitur" yang menggulir halus ke kartu fitur.
   Memakai endpoint publik yang sudah ada; bila gagal, angka tetap "–".
   ========================================================================== */
(function () {
  "use strict";

  var API_BASE =
    location.port === "5500" || location.protocol === "file:"
      ? "http://127.0.0.1:3000"
      : "";

  function getJson(path) {
    return fetch(API_BASE + path, { credentials: "include" }).then(function (r) {
      if (!r.ok) throw new Error(path + " -> " + r.status);
      return r.json();
    });
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function loadHomeStats() {
    getJson("/api/questions")
      .then(function (d) {
        var list = Array.isArray(d) ? d : d.questions || [];
        setText("homeStatSoal", typeof d.total === "number" ? d.total : list.length);
      })
      .catch(function () {});

    getJson("/api/materials")
      .then(function (d) {
        var list = Array.isArray(d) ? d : d.materials || [];
        var subjects = {};
        list.forEach(function (m) {
          var s = (m.subject || m.mapel || "").toString().trim().toLowerCase();
          if (s) subjects[s] = true;
        });
        setText("homeStatMapel", Object.keys(subjects).length);
      })
      .catch(function () {});

    getJson("/api/quiz/leaderboard?limit=50")
      .then(function (d) {
        var list = Array.isArray(d) ? d : d.leaderboard || [];
        var names = {};
        list.forEach(function (r) {
          var n = (r.student_name || "").toString().trim().toLowerCase();
          if (n) names[n] = true;
        });
        setText("homeStatSiswa", Object.keys(names).length);
      })
      .catch(function () {});
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-scroll]");
    if (!a) return;
    var target = document.getElementById(a.getAttribute("data-scroll"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  if (document.getElementById("homeStatSoal")) loadHomeStats();
})();
