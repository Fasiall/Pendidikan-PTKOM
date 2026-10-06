/* ==========================================================================
   data/questions.js — Sumber data soal & akun guru (dipakai oleh db.js)

   Menambah soal: salin satu blok objek lalu ubah isinya.
     subject  : nama topik (badge pada kartu soal)
     image    : emoji ilustrasi/gambar soal
     question : teks pertanyaan
     options  : array pilihan jawaban (maksimal 4)
     answer   : index jawaban BENAR (mulai dari 0)
     fact     : info tambahan yang tampil setelah menjawab
   ========================================================================== */

const QUESTIONS = [
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
    question: "Berapa hasil dari 9 \u00D7 6 ?",
    options: ["48", "54", "56", "63"],
    answer: 1,
    fact: "9 \u00D7 6 = 54. Triknya: 10 \u00D7 6 = 60, lalu kurangi 6."
  },
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
  },
  {
    subject: "Bahasa Indonesia",
    image: "\u{1F321}\uFE0F",
    question: "Apa lawan kata dari kata \"panas\"?",
    options: ["Terang", "Besar", "Dingin", "Tinggi"],
    answer: 2,
    fact: "Lawan kata panas adalah dingin. Contoh: siang panas, malam dingin."
  },
  {
    subject: "Bahasa Indonesia",
    image: "\u{1F60A}",
    question: "Apa sinonim (kata persamaan) dari kata \"senang\"?",
    options: ["Sedih", "Bahagia", "Marah", "Capek"],
    answer: 1,
    fact: "Senang = bahagia = gembira. Semuanya punya arti sama!"
  },
  {
    subject: "Pengetahuan Umum",
    image: "\u{1FA90}",
    question: "Planet apa yang paling dekat dengan Matahari?",
    options: ["Venus", "Bumi", "Merkurius", "Mars"],
    answer: 2,
    fact: "Merkurius adalah planet terdekat dengan Matahari."
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
];

/* Akun login Area Guru (di-hash oleh db.js saat pertama kali dijalankan) */
const TEACHER = {
  username: "guru",
  password: "guru123",
  fullName: "Guru Kelas Ceria"
};

module.exports = { QUESTIONS, TEACHER };
