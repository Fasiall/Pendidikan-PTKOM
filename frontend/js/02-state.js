

/* =============== (2) STATUS / VARIABEL GLOBAL =========================== */
let questions   = [];   // daftar soal dari server (tanpa kunci jawaban)
let currentIndex = 0;   // nomor soal yang sedang tampil (mulai dari 0)
let score       = 0;    // jumlah jawaban benar (dikembalikan server)
let isAnswered  = false;// soal ini sudah dijawab atau belum
let lastScore   = null; // skor terakhir (untuk dashboard guru)
let fxTimer     = null; // timer menyembunyikan flash layar
let toastTimer  = null; // timer menyembunyikan notifikasi
let timerInterval = null; // interval timer kuis
let timeRemaining = 0;    // sisa waktu dalam detik

/* Status form admin: daftar materi + id yang sedang diedit (null = mode tambah) */
let materiList      = [];
let setList         = [];
let editingMateriId = null;
let editingSetId    = null;
let editingSoalId   = null;
let activeManagerSetId = null;