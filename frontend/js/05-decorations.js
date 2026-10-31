

/* =============== (5) HIASAN: JUDUL & LATAR ============================= */

/** Memecah judul menjadi huruf untuk animasi, TANPA memotong kata:
 *  tiap kata dibungkus .t-word (inline-block, nowrap) sehingga baris hanya
 *  boleh patah di antara kata. Warna per kata diatur lewat CSS (.tw-*). */
function splitTitle() {
  const titleEl = $("#mainTitle");
  if (!titleEl) return;
  let words = [...titleEl.querySelectorAll(".t-word")];
  if (!words.length) {
    // Judul tanpa penanda kata: bangun .t-word dari teksnya
    const parts = titleEl.textContent.trim().split(/\s+/);
    titleEl.innerHTML = "";
    words = parts.map((w, i) => {
      if (i > 0) titleEl.appendChild(document.createTextNode(" "));
      const el = document.createElement("span");
      el.className = "t-word";
      el.textContent = w;
      titleEl.appendChild(el);
      return el;
    });
  }
  let n = 0;
  words.forEach((word) => {
    const text = word.textContent.trim();
    word.textContent = "";
    [...text].forEach((char) => {
      const span = document.createElement("span");
      span.className = "t-letter";
      span.textContent = char;
      span.style.animationDelay = (n++ * 30) + "ms";
      word.appendChild(span);
    });
  });
}

/** Membuat ornamen edukasi melayang di latar belakang (buku, topi toga, pensil, rumus) */
function createDecorations() {
  const decorItems = [
    { type: "icon", name: "book-open" },
    { type: "icon", name: "graduation-cap" },
    { type: "icon", name: "pencil" },
    { type: "icon", name: "compass" },
    { type: "icon", name: "shapes" },
    { type: "icon", name: "award" },
    { type: "symbol", text: "π" },
    { type: "symbol", text: "∑" },
    { type: "symbol", text: "√" },
    { type: "symbol", text: "A+" }
  ];
  if (!decorLayer) return;
  decorLayer.innerHTML = "";
  const positions = [
    { l: 4, t: 12 }, { l: 92, t: 18 }, { l: 8, t: 48 }, { l: 90, t: 55 },
    { l: 15, t: 82 }, { l: 85, t: 80 }, { l: 50, t: 8 }, { l: 30, t: 30 }
  ];
  positions.forEach((pos, i) => {
    const item = decorItems[i % decorItems.length];
    const el = document.createElement("div");
    el.className = "decor decor-edu";
    el.style.left = pos.l + "%";
    el.style.top = pos.t + "%";
    el.style.animationDelay = (i * 0.7) + "s";
    if (item.type === "icon") {
      el.innerHTML = `<i data-lucide="${item.name}"></i>`;
    } else {
      el.textContent = item.text;
    }
    decorLayer.appendChild(el);
  });
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}