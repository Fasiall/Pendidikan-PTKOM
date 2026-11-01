/* =============== (4) NAVIGASI ANTAR HALAMAN ============================= */

/**
 * Menampilkan satu halaman, menyembunyikan halaman lain.
 * Semua halaman memakai class .page; halaman aktif memakai .active.
 */
function showPage(pageId) {
  if (pageId !== "page-quiz") {
    clearInterval(timerInterval);
  }
  if (pageId === "page-login") {
    if (getToken()) {
      showPage("page-dashboard"); renderDashboard().then(() => {
        showPage("page-dashboard");
      }).catch(() => {
        clearToken();
        openLoginModal();
      });
    } else {
      openLoginModal();
    }
    return;
  }
  document.documentElement.classList.remove("early-dashboard");
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
    if (pageId === "page-home" && typeof window.loadHomeStats === "function") {
      window.loadHomeStats();
    }
  }

  const homeNav = document.querySelector(".home-nav");
  const isTeacherPage = pageId === "page-dashboard" || pageId === "page-quiz-history";
  if (homeNav) {
    homeNav.classList.toggle("is-teacher-nav", isTeacherPage);
  }

  // Update status link aktif di header navigasi
  const activeTabPanel = document.querySelector(".tab-panel.active");
  const currentDashTab = pageId === "page-quiz-history"
    ? "tabRiwayat"
    : (activeTabPanel ? activeTabPanel.id : "tabSetSoal");

  document.querySelectorAll(".home-nav .nav-link").forEach((link) => {
    const linkPage = link.dataset.page;
    const linkDashTab = link.dataset.dashTab;
    if (isTeacherPage) {
      link.classList.toggle("active", Boolean(linkDashTab && linkDashTab === currentDashTab));
    } else if (pageId === "page-home" || pageId === "page-quiz" || pageId === "page-result") {
      link.classList.toggle("active", linkPage === "page-home");
    }
  });
}

/* Navigasi universal: elemen dengan data-page="id-halaman" berpindah halaman. */
document.addEventListener("click", async (event) => {
  const dashTabTrigger = event.target.closest("[data-dash-tab]");
  if (dashTabTrigger) {
    event.preventDefault();
    const tabId = dashTabTrigger.dataset.dashTab;
    const dashPage = document.getElementById("page-dashboard");
    if (dashPage && !dashPage.classList.contains("active")) {
      showPage("page-dashboard");
    }
    if (typeof switchTab === "function") {
      switchTab(tabId);
    }
    const targetPanel = document.getElementById(tabId);
    if (targetPanel) {
      targetPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return;
  }

  const trigger = event.target.closest("[data-page]");
  if (trigger) {
    const pageId = trigger.dataset.page;
    if (pageId === "page-login") {
      if (!document.getElementById("modalLogin")) {
        // Jika tidak ada modal di halaman ini (seperti di register.html), biarkan tautan bernavigasi ke index.html#page-login
        return;
      }
      event.preventDefault();
      if (getToken()) {
        try {
          showPage("page-dashboard"); await renderDashboard();
          showPage("page-dashboard");
        } catch (err) {
          clearToken();
          openLoginModal();
        }
      } else {
        openLoginModal();
      }
    } else if (pageId === "page-home") {
      if (document.getElementById("page-home")) {
        event.preventDefault();
        closeLoginModal();
        showPage("page-home");
      }
    } else {
      closeLoginModal();
      showPage(pageId);
    }
  }
});
