

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
      renderDashboard().then(() => {
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
  }

  // Update status link aktif di header navigasi
  document.querySelectorAll(".home-nav .nav-link").forEach((link) => {
    const linkPage = link.dataset.page;
    if (pageId === "page-dashboard") {
      link.classList.toggle("active", linkPage === "page-dashboard" || linkPage === "page-login");
    } else if (pageId === "page-home" || pageId === "page-quiz" || pageId === "page-result") {
      link.classList.toggle("active", linkPage === "page-home");
    }
  });
}

/* Navigasi universal: elemen dengan data-page="id-halaman" berpindah halaman. */
document.addEventListener("click", async (event) => {
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
          await renderDashboard();
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