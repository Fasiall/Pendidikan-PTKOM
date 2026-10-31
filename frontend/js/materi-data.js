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
