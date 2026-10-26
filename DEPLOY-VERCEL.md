# Deploy ke Vercel

Panduan singkat untuk menaruh **Kuis Petualangan Ceria** di Vercel.

## Kenapa perlu database eksternal?

Aplikasi ini aslinya menjalankan PostgreSQL *embedded* di dalam proses Node
(folder `backend/.pgdata`). Cara itu hanya cocok untuk komputer sendiri.
Vercel menjalankan kode sebagai serverless function: tidak ada disk permanen
dan tidak bisa menyalakan proses database.

Karena itu di production dipakai PostgreSQL cloud (Neon / Supabase /
Vercel Postgres). Kode sudah menyesuaikan otomatis:

- `DATABASE_URL` **tidak diisi** → PostgreSQL embedded (mode lokal, seperti biasa)
- `DATABASE_URL` **diisi** → konek ke database cloud + sesi kuis disimpan di
  tabel `user_sessions`

## Langkah deploy

### 1. Buat database (sekali saja)

1. Daftar di <https://neon.tech> (gratis), buat project.
2. Salin **connection string** (bentuknya `postgresql://user:pass@host/db?sslmode=require`).

### 2. Isi database dengan tabel + data awal

Jalankan dari folder proyek (butuh internet, hanya sekali):

```powershell
$env:DATABASE_URL = "postgresql://user:pass@host/db?sslmode=require"
npm --prefix backend run db:init
```

Perintah ini menjalankan migrasi dan mengisi akun guru contoh, materi, serta soal.

### 3. Deploy (satu perintah)

```powershell
npx vercel login                                   # sekali saja, lewat browser
.\deploy.ps1 -DatabaseUrl "postgresql://user:pass@host/db?sslmode=require"
```

Skrip `deploy.ps1` menjalankan semuanya: migrasi + seed, tautkan project,
pasang `DATABASE_URL`/`JWT_SECRET`/`SESSION_SECRET`/`NODE_ENV`, deploy
production, lalu mengecek `/api/health` pada URL hasil deploy.

Kalau punya token Vercel (<https://vercel.com/account/tokens>), bisa tanpa login
interaktif:

```powershell
.\deploy.ps1 -DatabaseUrl "postgresql://..." -Token "token-vercel-kamu"
```

Langkah manual (kalau tidak memakai skrip):

```powershell
npx vercel link          # buat project baru, framework: Other
npx vercel env add DATABASE_URL production
npx vercel env add JWT_SECRET production
npx vercel env add SESSION_SECRET production
npx vercel env add NODE_ENV production    # isi: production
npx vercel --prod
```

`JWT_SECRET` dan `SESSION_SECRET` wajib diisi di production — server sengaja
menolak menyala tanpa keduanya. Buat nilai acak, misalnya:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Alternatif: Drop to Deploy (drag & drop)

Vercel punya fitur **Drop to Deploy** di <https://vercel.com/new> — folder bisa
diseret langsung tanpa Git dan tanpa CLI.

1. Seret **folder proyek ini** (bukan hanya `frontend/`) ke kotak Drop to Deploy.
2. Periksa daftar file yang muncul. Yang **wajib ada**:
   - `vercel.json`
   - `api/index.js`
   - `backend/` (src, scripts, data, package.json)
   - `frontend/`
   - `package.json`
3. Yang **wajib tidak ada**: `.env`, `backend/.pgdata`, `node_modules`.
4. Klik **Create project**, pilih scope/team, beri nama, lalu Deploy.
5. Buka **Settings → Environment Variables**, tambahkan untuk environment
   **Production** (boleh juga Preview + Development):

   | Nama | Nilai |
   | --- | --- |
   | `DATABASE_URL` | connection string Neon |
   | `JWT_SECRET` | string acak 64 karakter |
   | `SESSION_SECRET` | string acak 64 karakter lain |
   | `NODE_ENV` | `production` |

6. Buka **Deployments → (deployment teratas) → ⋯ → Redeploy** agar env var dipakai.
7. Cek **Settings → Build and Deployment**: *Output Directory* harus `frontend`
   (biasanya sudah otomatis dari `vercel.json`).

Tanpa langkah 5–6, halaman akan tampil tetapi semua data gagal dimuat
(`/api/health` membalas 500 dengan pesan DATABASE_URL).

> Catatan: Drop to Deploy hanya mengunggah file yang kamu seret. Kalau
> `.vercelignore` tidak ikut terunggah, pastikan sendiri `node_modules` dan
> `backend/.pgdata` tidak ada di folder yang diseret.

## Kalau ada masalah

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| `Server gagal menyala. Periksa DATABASE_URL` | Env var belum ada / salah | Cek `vercel env ls`, pastikan ada di environment **Production** |
| `JWT_SECRET belum diisi` | `NODE_ENV=production` tanpa secret | Tambahkan `JWT_SECRET` lalu redeploy |
| Halaman tampil tapi data kosong | Migrasi/seed belum dijalankan | Ulangi langkah 2 dengan `DATABASE_URL` yang sama |
| Login berhasil lalu logout sendiri | Cookie `secure` butuh HTTPS | Pastikan membuka domain `*.vercel.app` (HTTPS), bukan IP |

## Struktur file yang dipakai Vercel

```
api/index.js        Serverless function (Express)
vercel.json         Rewrite /api/* → function, output statis dari frontend/
.vercelignore       Menyingkirkan .pgdata, node_modules, .env dari upload
backend/src/db/pool.js   Koneksi pg.Pool dari DATABASE_URL
backend/scripts/db-init.js   Migrasi + seed ke database cloud
```

Frontend tetap memanggil `/api/...` tanpa perubahan, karena `vercel.json`
meneruskan semua request `/api/*` ke function di domain yang sama.
