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

const DUMMY_MATERIALS = [
  {
    id: 1,
    title: "Penjumlahan & Perkalian Seru",
    summary: "Belajar trik berhitung cepat, penjumlahan berulang, dan cara asyik menguasai perkalian dasar.",
    image_url: "public/matematika.jpg",
    emoji: "🧮",
    color: "#FDE68A",
    subject: "Matematika",
    position: 1,
    question_count: 5,
    quizSets: [
      { id: 101, title: "Kuis Dasar Berhitung", description: "Latihan pemanasan penjumlahan cepat", question_count: 5 },
      { id: 102, title: "Tantangan Perkalian Cepat", description: "Trik berhitung kilat 10 detik", question_count: 5 }
    ],
    content: `
      <h2>🧮 Bermain & Berpetualang dengan Angka</h2>
      <p>Halo sobat pintar! Matematika itu seru sekali kalau kita tahu rahasia dan triknya. Di materi ini, kita akan mempelajari trik penjumlahan dan perkalian yang membuat berhitung jadi secepat kilat!</p>

      <h3>1. Rahasia Pasangan Angka 10</h3>
      <p>Kunci berhitung cepat adalah menemukan pasangan angka yang jika dijumlahkan menjadi <strong>10</strong>:</p>
      <table>
        <thead><tr><th>Pasangan Angka</th><th>Contoh Soal</th><th>Cara Hitung Cepat</th></tr></thead>
        <tbody>
          <tr><td><strong>7 dan 3</strong></td><td>7 + 8</td><td>7 + 3 + 5 = <strong>15</strong></td></tr>
          <tr><td><strong>8 dan 2</strong></td><td>8 + 6</td><td>8 + 2 + 4 = <strong>14</strong></td></tr>
          <tr><td><strong>9 dan 1</strong></td><td>9 + 7</td><td>9 + 1 + 6 = <strong>16</strong></td></tr>
          <tr><td><strong>6 dan 4</strong></td><td>6 + 9</td><td>6 + 4 + 5 = <strong>15</strong></td></tr>
        </tbody>
      </table>

      <h3>2. Perkalian adalah Penjumlahan Berulang</h3>
      <p>Jangan takut dengan tanda kali (×)! Perkalian sebenarnya hanya menambahkan angka yang sama berulang-ulang.</p>
      <ul>
        <li><strong>3 × 4</strong> artinya angka 4 dijumlahkan sebanyak 3 kali: <code>4 + 4 + 4 = 12</code></li>
        <li><strong>5 × 6</strong> artinya angka 6 dijumlahkan sebanyak 5 kali: <code>6 + 6 + 6 + 6 + 6 = 30</code></li>
        <li><strong>Trik Perkalian 9:</strong> 9 × 7 = (10 × 7) - 7 = 70 - 7 = <strong>63</strong>!</li>
      </ul>

      <h3>3. Tabel Perkalian Penting</h3>
      <table>
        <thead><tr><th>Perkalian</th><th>Hasil</th><th>Fakta Keren</th></tr></thead>
        <tbody>
          <tr><td>2 × 5</td><td>10</td><td>Angka puluhan pertama yang mudah diingat</td></tr>
          <tr><td>5 × 5</td><td>25</td><td>Semua perkalian 5 berakhiran angka 0 atau 5</td></tr>
          <tr><td>9 × 9</td><td>81</td><td>Jumlah digit 8 + 1 selalu menghasilkan angka 9</td></tr>
        </tbody>
      </table>

      <div class="callout">💡 <strong>Tips Juara:</strong> Berlatihlah 10 menit setiap hari sebelum kuis. Jangan takut salah, karena dari kesalahan kita jadi lebih pintar!</div>
    `
  },

  {
    id: 2,
    title: "Mengenal Hewan & Habitat Alam",
    summary: "Kenali jenis makanan hewan, adaptasi unik di alam, dan cara kita merawat lingkungan hidup mereka.",
    image_url: "public/ipa.jpg",
    emoji: "🐰",
    color: "#A7F3D0",
    subject: "IPA",
    position: 2,
    question_count: 4,
    quizSets: [
      { id: 201, title: "Kuis Dunia Satwa", description: "Tebak ciri dan makanan hewan", question_count: 4 },
      { id: 202, title: "Pahlawan Ekosistem", description: "Merawat lingkungan dan habitat satwa", question_count: 4 }
    ],
    content: `
      <h2>🐾 Petualangan di Alam Satwa</h2>
      <p>Bumi kita ditinggali jutaan jenis hewan unik dan menggemaskan. Setiap hewan diciptakan dengan kemampuan luar biasa untuk bertahan hidup di habitat aslinya.</p>

      <h3>1. Pengelompokan Hewan Berdasarkan Makanannya</h3>
      <ul>
        <li><strong>Herbivora (Pemakan Tumbuhan):</strong> Memiliki gigi seri dan geraham kuat untuk mengunyah dedaunan dan rumput segar. Contoh: Kelinci, Sapi, Gajah, Kuda.</li>
        <li><strong>Karnivora (Pemakan Daging):</strong> Memiliki gigi taring tajam dan cakar kuat untuk berburu mangsa. Contoh: Harimau, Singa, Elang, Serigala.</li>
        <li><strong>Omnivora (Pemakan Segala):</strong> Mengonsumsi tumbuhan maupun hewan kecil. Contoh: Ayam, Bebek, Beruang, Monyet.</li>
      </ul>

      <h3>2. Ciri Khusus Hewan yang Unik</h3>
      <table>
        <thead><tr><th>Hewan</th><th>Ciri Khusus</th><th>Fungsi Utama</th></tr></thead>
        <tbody>
          <tr><td>Kelelawar</td><td>Ekolokasi (pantulan suara ultrasonik)</td><td>Terbang dan mendeteksi mangsa di malam gelap</td></tr>
          <tr><td>Bunglon</td><td>Mengubah warna kulit (mimikri)</td><td>Menyamar dari musuh dan pemangsa</td></tr>
          <tr><td>Unta</td><td>Punya punuk berisi lemak</td><td>Cadangan tenaga saat melintasi padang pasir tandus</td></tr>
          <tr><td>Bebek</td><td>Kaki berselaput renang</td><td>Mudah berenang di air dan tidak terperosok di lumpur</td></tr>
        </tbody>
      </table>

      <h3>3. Menjaga Rumah Satwa (Habitat)</h3>
      <ol>
        <li>Jangan pernah membuang sampah plastik ke sungai atau pantai.</li>
        <li>Tanam pohon agar hutan tetap rindang dan hewan memiliki tempat berteduh.</li>
        <li>Hindari memelihara satwa langka liar yang dilindungi oleh negara.</li>
      </ol>

      <div class="callout">🌿 <strong>Fakta Alam:</strong> Lebah madu membantu penyerbukan sepertiga dari seluruh tanaman pangan yang kita makan setiap hari!</div>
    `
  },

  {
    id: 3,
    title: "Ragam Kata & Pantun Jenaka",
    summary: "Perkaya kosakata dengan sinonim, antonim, ungkapan seru, dan cara mudah merangkai pantun berima.",
    image_url: "public/indo.jpg",
    emoji: "📚",
    color: "#FBCFE8",
    subject: "Bahasa Indonesia",
    position: 3,
    question_count: 4,
    quizSets: [
      { id: 301, title: "Teka-Teki Sinonim & Antonim", description: "Asah kosakata padanan dan lawan kata", question_count: 4 },
      { id: 302, title: "Kuis Pantun Ceria", description: "Rima dan struktur bait pantun", question_count: 4 }
    ],
    content: `
      <h2>📖 Menjelajahi Keindahan Bahasa Indonesia</h2>
      <p>Bahasa Indonesia sangat kaya akan kosakata indah dan karya sastra menarik seperti pantun, puisi, dan dongeng. Yuk, kita perluas kosakata kita!</p>

      <h3>1. Sinonim (Persamaan Kata) & Antonim (Lawan Kata)</h3>
      <p>Memahami sinonim dan antonim membuat tulisan dan ceritamu menjadi lebih hidup dan tidak membosankan.</p>
      <table>
        <thead><tr><th>Kata Dasar</th><th>Sinonim (Sama)</th><th>Antonim (Lawan)</th></tr></thead>
        <tbody>
          <tr><td><strong>Gembira</strong></td><td>Senang, Bahagia, Sukacita</td><td>Sedih, Duka, Murung</td></tr>
          <tr><td><strong>Pandai</strong></td><td>Pintar, Cerdas, Cakap</td><td>Bodoh, Dungu</td></tr>
          <tr><td><strong>Luas</strong></td><td>Lebar, Lapang, Raksasa</td><td>Sempit, Sesak</td></tr>
          <tr><td><strong>Terang</strong></td><td>Benderang, Silau, Jelas</td><td>Gelap, Gulita, Remang</td></tr>
        </tbody>
      </table>

      <h3>2. Mengenal Pantun Jenaka</h3>
      <p>Pantun adalah puisi lama asli Indonesia yang memiliki aturan khas:</p>
      <ul>
        <li>Terdiri dari <strong>4 baris</strong> dalam satu bait.</li>
        <li>Baris 1 dan 2 disebut <strong>sampiran</strong> (pengantar).</li>
        <li>Baris 3 dan 4 disebut <strong>isi</strong> (pesan yang ingin disampaikan).</li>
        <li>Memiliki rima akhir bersilang, yaitu berpola <strong>a - b - a - b</strong>.</li>
      </ul>

      <div class="callout">
        <strong>Contoh Pantun Belajar:</strong><br>
        <em>Pergi ke pasar membeli mangga,<br>
        Mangga manis dimakan bersama.<br>
        Belajar rajin jangan ditunda,<br>
        Kelak tercapai cita-cita mulia.</em>
      </div>
    `
  },

  {
    id: 4,
    title: "Tata Surya & Sayang Bumi",
    summary: "Menjelajah luar angkasa, urutan planet dari Matahari, dan tips nyata menjaga kelestarian Bumi.",
    image_url: "public/pe%20um.jpg",
    emoji: "🌍",
    color: "#BAE6FD",
    subject: "Pengetahuan Umum",
    position: 4,
    question_count: 5,
    quizSets: [
      { id: 401, title: "Penjelajah Antariksa", description: "Mengenal planet dan bintang", question_count: 5 },
      { id: 402, title: "Pahlawan Peduli Bumi", description: "Gerakan 3R dan kebersihan lingkungan", question_count: 4 }
    ],
    content: `
      <h2>🚀 Ekspedisi Menembus Angkasa Luar</h2>
      <p>Selamat datang di luar angkasa! Di tata surya kita, Matahari menjadi pusat gravitasi yang dikelilingi oleh delapan planet spektakuler.</p>

      <h3>1. Urutan 8 Planet dari yang Terdekat dengan Matahari</h3>
      <p>Cara mudah mengingat urutannya: <em>"Me-Ve-Bu-Ma-Ju-Sat-U-Nep"</em></p>
      <table>
        <thead><tr><th>No</th><th>Nama Planet</th><th>Ciri Menarik</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>🪨 <strong>Merkurius</strong></td><td>Planet terkecil dan paling dekat dengan Matahari</td></tr>
          <tr><td>2</td><td>🟡 <strong>Venus</strong></td><td>Planet terpanas dan tampak paling terang di langit fajar/senja</td></tr>
          <tr><td>3</td><td>🌍 <strong>Bumi</strong></td><td>Satu-satunya planet yang memiliki oksigen dan kehidupan</td></tr>
          <tr><td>4</td><td>🔴 <strong>Mars</strong></td><td>Planet merah karena tanahnya kaya kandungan oksida besi</td></tr>
          <tr><td>5</td><td>🌀 <strong>Jupiter</strong></td><td>Planet terbesar di tata surya (planet gas raksasa)</td></tr>
          <tr><td>6</td><td>🪐 <strong>Saturnus</strong></td><td>Memiliki cincin es dan batu yang paling megah</td></tr>
          <tr><td>7</td><td>❄️ <strong>Uranus</strong></td><td>Planet es raksasa yang berotasi menyamping miring</td></tr>
          <tr><td>8</td><td>🌊 <strong>Neptunus</strong></td><td>Planet terjauh dari Matahari dengan angin terkuat</td></tr>
        </tbody>
      </table>

      <h3>2. Gerakan Sayang Bumi: Konsep 3R</h3>
      <ol>
        <li><strong>Reduce (Mengurangi):</strong> Kurangi pemakaian kantong plastik sekali pakai saat berbelanja.</li>
        <li><strong>Reuse (Memakai Kembali):</strong> Gunakan botol minum tumbler yang bisa dicuci dan dipakai berulang kali.</li>
        <li><strong>Recycle (Mendaur Ulang):</strong> Mengolah kardus bekas atau botol plastik menjadi kerajinan berguna.</li>
      </ol>

      <div class="callout">🌏 <strong>Fakta Mengagumkan:</strong> Cahaya dari Matahari membutuhkan waktu sekitar 8 menit 20 detik untuk sampai ke permukaan Bumi!</div>
    `
  },

  {
    id: 5,
    title: "Dunia Komputer & Internet Pintar",
    summary: "Mengenal bagian perangkat keras komputer, cara kerja internet, dan etika berselancar aman di dunia digital.",
    image_url: "public/if.jpg",
    emoji: "💻",
    color: "#C7D2FE",
    subject: "Informatika",
    position: 5,
    question_count: 4,
    quizSets: [
      { id: 501, title: "Dasar Perangkat Komputer", description: "Hardware vs Software", question_count: 4 },
      { id: 502, title: "Cerdas Berinternet", description: "Privasi dan keamanan digital anak", question_count: 4 }
    ],
    content: `
      <h2>💻 Menjadi Generasi Digital Cerdas</h2>
      <p>Komputer dan smartphone adalah alat canggih yang membantu kita belajar, berkomunikasi, dan berkarya. Mari kita pelajari cara kerjanya!</p>

      <h3>1. Hardware (Perangkat Keras)</h3>
      <p>Hardware adalah bagian fisik komputer yang bisa dilihat dan disentuh secara nyata:</p>
      <ul>
        <li><strong>Input (Masukan):</strong> Keyboard untuk mengetik, mouse untuk mengarahkan kursor, mikrofon untuk suara.</li>
        <li><strong>Process (Pemroses):</strong> CPU (Processor) adalah otak komputer yang memproses semua instruksi.</li>
        <li><strong>Storage (Penyimpan):</strong> Harddisk atau SSD untuk menyimpan file tugas, dokumen, foto, dan lagu.</li>
        <li><strong>Output (Keluaran):</strong> Monitor menampilkan gambar, speaker mengeluarkan suara, printer mencetak dokumen.</li>
      </ul>

      <h3>2. Software (Perangkat Lunak)</h3>
      <p>Program atau aplikasi tanpa wujud fisik yang memberi instruksi pada komputer, seperti Sistem Operasi (Windows, macOS, Linux, Android) dan browser web.</p>

      <h3>3. Aturan Emas Internet Sehat & Aman</h3>
      <table>
        <thead><tr><th>Boleh Dilakukan (Do's)</th><th>Dilarang Dilakukan (Don'ts)</th></tr></thead>
        <tbody>
          <tr><td>Gunakan kata sandi (password) yang rumit dan jaga kerahasiaannya</td><td>Memberikan password kepada orang lain atau teman</td></tr>
          <tr><td>Tanyakan pada orang tua/guru jika melihat hal mencurigakan</td><td>Mengklik tautan asing atau mengunduh file sembarangan</td></tr>
          <tr><td>Gunakan internet untuk belajar hal positif dan wawasan baru</td><td>Berbicara kasar atau menyebarkan pesan bohong (hoax)</td></tr>
        </tbody>
      </table>

      <div class="callout">🛡️ <strong>Aturan 20-20-20:</strong> Setiap menatap layar selama 20 menit, istirahatkan mata dengan melihat benda berjarak 20 kaki (6 meter) selama 20 detik!</div>
    `
  },

  {
    id: 6,
    title: "Harmoni Warna & Musik Nusantara",
    summary: "Mengenal percampuran warna primer, ragam alat musik tradisional daerah, dan keindahan budaya bangsa.",
    image_url: "public/sb.jpg",
    emoji: "🎨",
    color: "#FED7AA",
    subject: "Seni Budaya",
    position: 6,
    question_count: 4,
    quizSets: [
      { id: 601, title: "Kreativitas Warna & Gambar", description: "Roda warna dan seni rupa", question_count: 4 },
      { id: 602, title: "Irama Musik Tradisional", description: "Alat musik daerah Nusantara", question_count: 4 }
    ],
    content: `
      <h2>🎨 Berkreasi dengan Warna & Irama Tradisional</h2>
      <p>Seni dan budaya membuat hidup kita penuh warna dan kegembiraan. Dari lukisan cerah hingga alunan musik tradisional Indonesia yang mendunia!</p>

      <h3>1. Pencampuran Warna (Teori Roda Warna)</h3>
      <p>Warna dasar yang tidak bisa dihasilkan dari campuran warna lain disebut <strong>Warna Primer</strong>:</p>
      <ul>
        <li><strong>Warna Primer:</strong> Merah, Kuning, dan Biru.</li>
        <li><strong>Warna Sekunder:</strong> Campuran dua warna primer dengan takaran seimbang:
          <ul>
            <li>Merah + Kuning = <strong>Jingga (Orange)</strong></li>
            <li>Kuning + Biru = <strong>Hijau</strong></li>
            <li>Biru + Merah = <strong>Ungu</strong></li>
          </ul>
        </li>
      </ul>

      <h3>2. Ragam Alat Musik Tradisional Indonesia</h3>
      <table>
        <thead><tr><th>Alat Musik</th><th>Asal Daerah</th><th>Cara Memainkan</th></tr></thead>
        <tbody>
          <tr><td><strong>Angklung</strong></td><td>Jawa Barat</td><td>Digoyang sampai menghasilkan bunyi bambu merdu</td></tr>
          <tr><td><strong>Sasando</strong></td><td>Rote, Nusa Tenggara Timur</td><td>Dipetik seperti harpa bersarang daun lontar</td></tr>
          <tr><td><strong>Gamelan</strong></td><td>Jawa dan Bali</td><td>Dipukul menggunakan alat pemukul khusus</td></tr>
          <tr><td><strong>Tifa</strong></td><td>Papua dan Maluku</td><td>Dipukul seperti gendang menggunakan telapak tangan</td></tr>
          <tr><td><strong>Kolintang</strong></td><td>Sulawesi Utara</td><td>Dipukul bilah-bilah kayunya secara berirama</td></tr>
        </tbody>
      </table>

      <div class="callout">🎶 <strong>Bangga Budaya:</strong> Angklung Indonesia telah diakui oleh UNESCO sebagai Warisan Budaya Takbenda Dunia sejak tahun 2010!</div>
    `
  }
];

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
