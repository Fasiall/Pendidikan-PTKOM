/* ==========================================================================
   data/seed.js — Data awal yang dimasukkan ke database saat pertama jalan

   Struktur MATERIALS:
     title    : judul materi
     summary  : deskripsi singkat (tampil di kartu daftar materi)
     content  : isi materi (boleh berupa string HTML)
     emoji    : ilustrasi cadangan bila image_url kosong
     color    : warna latar thumbnail
     subject  : nama mapel
     position : urutan tampil
     questions: daftar soal kuis yang TERHUBUNGI dengan materi ini
   ========================================================================== */

const TEACHER = {
  username: "guru",
  password: "guru123",
  fullName: "Guru Kelas Ceria"
};

const MATERIALS = [
  {
    title: "Penjumlahan & Perkalian Seru",
    summary: "Belajar tambah dan kali dengan trik mudah ala anak ceria.",
    emoji: "🧮",
    color: "#FFE8A3",
    subject: "Matematika",
    position: 1,
    content: `
      <h2>🧮 Bermain Angka</h2>
      <p>Halo! Di materi ini kita belajar <strong>menjumlahkan</strong> dan
      <strong>mengalikan</strong> angka dengan cara yang mudah diingat.</p>

      <h3>1. Trik Penjumlahan ke 10</h3>
      <p>Untuk menjumlahkan dua angka yang hasilnya 10, cari pasangannya:</p>
      <table>
        <thead><tr><th>Soal</th><th>Pasangan</th></tr></thead>
        <tbody>
          <tr><td>7 + 8</td><td>7 + 3 + 5 = <strong>15</strong></td></tr>
          <tr><td>9 + 6</td><td>9 + 1 + 5 = <strong>15</strong></td></tr>
          <tr><td>4 + 7</td><td>4 + 6 + 1 = <strong>11</strong></td></tr>
        </tbody>
      </table>

      <h3>2. Perkalian = Penjumlahan Berulang</h3>
      <ul>
        <li>9 × 6 berarti 6 ditambah 9 kali → 54</li>
        <li>Trik cepat: 10 × 6 = 60, lalu kurangi 6 → <strong>54</strong></li>
        <li>Setiap baris tabel perkalian berpola lho, coba perhatikan!</li>
      </ul>

      <div class="callout">💡 Ingat: salah itu wajar. Yang penting terus mencoba!</div>
    `,
    questions: [
      {
        subject: "Matematika",
        image: "\u{1F9EE}",
        question: "Berapa hasil dari 7 + 8 ?",
        options: ["14", "15", "16", "17"],
        answer: 1,
        fact: "Ingat ya, 7 + 8 = 15. Bisa juga dihitung 10 + 5!"
      },
      {
        subject: "Matematika",
        image: "\u{1F522}",
        question: "Berapa hasil dari 9 × 6 ?",
        options: ["48", "54", "56", "63"],
        answer: 1,
        fact: "9 × 6 = 54. Triknya: 10 × 6 = 60, lalu kurangi 6."
      }
    ]
  },

  {
    title: "Mengenal Hewan & Lingkungan",
    summary: "Kenali teman-teman hewan dan cara menjaga rumah mereka.",
    emoji: "🐰",
    color: "#CFF3E1",
    subject: "IPA",
    position: 2,
    content: `
      <h2>🐾 Hewan di Sekitar Kita</h2>
      <p>Setiap hewan punya ciri khas. Ayo kenali mereka!</p>

      <h3>1. Hewan Pemakan Tumbuhan</h3>
      <ul>
        <li><strong>Kelinci</strong> — suka wortel karena kaya vitamin A.</li>
        <li><strong>Sapi & kuda</strong> — gemar makan rumput segar.</li>
      </ul>

      <h3>2. Hewan Berkaki Banyak</h3>
      <table>
        <thead><tr><th>Hewan</th><th>Jumlah Kaki</th></tr></thead>
        <tbody>
          <tr><td>Ulat</td><td>Banyak (seperti cacing kaki)</td></tr>
          <tr><td>Semut</td><td>6 kaki</td></tr>
          <tr><td>Laba-laba</td><td><strong>8 kaki</strong> (berkelas Arachnida)</td></tr>
        </tbody>
      </table>

      <h3>3. Menjaga Lingkungan Hewan</h3>
      <ol>
        <li>Jangan membuang sampah ke sungai.</li>
        <li>Rawat pohon agar hewan punya rumah.</li>
        <li>Jangan mengganggu sarang atau telur mereka.</li>
      </ol>

      <div class="callout">🌿 Alam yang sehat membuat hewan dan manusia senang.</div>
    `,
    questions: [
      {
        subject: "IPA",
        image: "\u{1F955}",
        question: "Hewan apa yang suka makan wortel?",
        options: ["Kucing", "Kelinci", "Kuda", "Ayam"],
        answer: 1,
        fact: "Kelinci terkenal suka wortel karena kaya vitamin A!"
      },
      {
        subject: "IPA",
        image: "\u{1F577}\uFE0F",
        question: "Berapa jumlah kaki yang dimiliki laba-laba?",
        options: ["6 kaki", "8 kaki", "10 kaki", "4 kaki"],
        answer: 1,
        fact: "Laba-laba berkelas Arachnida dan memiliki 8 kaki."
      }
    ]
  },

  {
    title: "Kata Bersahabat: Sinonim & Antonim",
    summary: "Perkaya kosakata dengan kata persamaan dan lawan kata.",
    emoji: "🌈",
    color: "#FFD9E8",
    subject: "Bahasa Indonesia",
    position: 3,
    content: `
      <h2>📚 Dunia Kata</h2>
      <p>Bahasa Indonesia punya banyak kata yang <em>mirip</em> dan
      <em>berlawanan</em>. Seru sekali untuk dipelajari!</p>

      <h3>1. Sinonim (Kata Persamaan)</h3>
      <ul>
        <li>senang = <strong>bahagia</strong> = gembira</li>
        <li>besar = raksasa = luas</li>
        <li>indah = cantik = elok</li>
      </ul>

      <h3>2. Antonim (Kata Lawan)</h3>
      <table>
        <thead><tr><th>Kata</th><th>Lawan Kata</th></tr></thead>
        <tbody>
          <tr><td>panas</td><td>dingin</td></tr>
          <tr><td>terang</td><td>gelap</td></tr>
          <tr><td>tinggi</td><td>pendek</td></tr>
        </tbody>
      </table>

      <h3>3. Cara Mengingat</h3>
      <p>Buat kalimat pendek: <em>"Siang panas, malam dingin."</em>
      Kalimat yang berima lebih mudah diingat!</p>

      <div class="callout">✍️ Coba tulis 3 sinonim dari kata "bahagia".</div>
    `,
    questions: [
      {
        subject: "Bahasa Indonesia",
        image: "\u{1F321}\uFE0F",
        question: 'Apa lawan kata dari kata "panas"?',
        options: ["Terang", "Besar", "Dingin", "Tinggi"],
        answer: 2,
        fact: "Lawan kata panas adalah dingin. Contoh: siang panas, malam dingin."
      },
      {
        subject: "Bahasa Indonesia",
        image: "\u{1F60A}",
        question: 'Apa sinonim (kata persamaan) dari kata "senang"?',
        options: ["Sedih", "Bahagia", "Marah", "Capek"],
        answer: 1,
        fact: "Senang = bahagia = gembira. Semuanya punya arti sama!"
      }
    ]
  },

  {
    title: "Jelajah Alam: Planet & Kebersihan",
    summary: "Singgah ke planet terdekat dan pelajari cara menjaga bumi.",
    emoji: "🌍",
    color: "#D6E8FF",
    subject: "Pengetahuan Umum",
    position: 4,
    content: `
      <h2>🚀 Petualangan Antariksa & Bumi</h2>

      <h3>1. Para Planet</h3>
      <p>Matahari adalah pusat tata surya kita. Planet yang paling dekat
      dengan Matahari adalah <strong>Merkurius</strong>, lalu Venus, Bumi,
      dan Mars.</p>
      <table>
        <thead><tr><th>Planet</th><th>Fakta Seru</th></tr></thead>
        <tbody>
          <tr><td>🪨 Merkurius</td><td>Paling dekat dengan Matahari</td></tr>
          <tr><td>🌍 Bumi</td><td>Planet dengan air dan kehidupan</td></tr>
          <tr><td>🔴 Mars</td><td>Disebut planet merah</td></tr>
        </tbody>
      </table>

      <h3>2. Menjaga Kebersihan Bumi</h3>
      <ol>
        <li><strong>Membuang sampah pada tempatnya.</strong></li>
        <li><strong>Memilah sampah</strong> menjadi organik dan anorganik.</li>
        <li><strong>Menanam pohon</strong> di sekitar rumah dan sekolah.</li>
      </ol>

      <div class="callout">🌏 Bumi hanya satu — mari kita rawat bersama!</div>
    `,
    questions: [
      {
        subject: "Pengetahuan Umum",
        image: "\u{1FA90}",
        question: "Planet apa yang paling dekat dengan Matahari?",
        options: ["Venus", "Bumi", "Merkurius", "Mars"],
        answer: 2,
        fact: "Merkurius adalah planet yang paling dekat dengan Matahari."
      },
      {
        subject: "Pengetahuan Umum",
        image: "\u{1F333}",
        question: "Bagaimana cara yang benar menjaga kebersihan lingkungan?",
        options: [
          "Membuang sampah di sungai",
          "Memotong pohon sembarangan",
          "Membiarkan genangan air",
          "Menanam pohon dan memilah sampah"
        ],
        answer: 3,
        fact: "Menanam pohon dan memilah sampah membuat bumi tetap sehat!"
      }
    ]
  }
];

module.exports = { TEACHER, MATERIALS };
