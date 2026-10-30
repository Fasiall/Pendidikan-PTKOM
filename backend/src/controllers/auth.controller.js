/* ==========================================================================
   src/controllers/auth.controller.js — Autentikasi pengajar (JWT)

   Endpoint:
     POST /api/auth/register   { username, password, confirmPassword, email } -> { token, teacher }
     POST /api/auth/login      { usernameOrEmail, password } -> { token, teacher }
     GET  /api/auth/me         (Bearer)               -> { teacher }
     POST /api/auth/logout     (Bearer)               -> { ok }
   ========================================================================== */

const bcrypt = require("bcryptjs");

const config = require("../config");
const { getPool } = require("../db/embedded");
const { ApiError, asyncHandler } = require("../utils/errors");
const { requireFields } = require("../utils/validate");
const { signToken } = require("../middleware/auth");

/** Registrasi pengajar baru: username, password, confirmPassword, email. */
const register = asyncHandler(async (req, res) => {
  requireFields(req.body, ["username", "password", "confirmPassword", "email"]);

  const { username, password, confirmPassword, email } = req.body;

  // Validasi password dan konfirmasi password
  if (password !== confirmPassword) {
    throw new ApiError(400, "Password dan konfirmasi password tidak cocok");
  }

  // Validasi format email sederhana
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Format email tidak valid");
  }

  const pool = getPool();

  // Cek apakah username sudah digunakan
  const { rows: usernameRows } = await pool.query(
    "SELECT id FROM teachers WHERE username = $1",
    [username.trim()]
  );
  if (usernameRows.length > 0) {
    throw new ApiError(400, "Username sudah digunakan");
  }

  // Cek apakah email sudah digunakan (jika disediakan)
  if (email) {
    const { rows: emailRows } = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [email.trim()]
    );
    if (emailRows.length > 0) {
      throw new ApiError(400, "Email sudah digunakan");
    }
  }

  // Hash password
  const passwordHash = bcrypt.hashSync(password, 10);

  // Tambah pengguna baru
  const { rows } = await pool.query(
    `INSERT INTO teachers (username, password_hash, full_name, email)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, full_name, email`,
    [username.trim(), passwordHash, username.trim(), email.trim() || null]
  );
  const teacher = rows[0];

  // Buat token JWT
  const token = signToken({
    id: teacher.id,
    username: teacher.username,
    fullName: teacher.full_name
  });

  res.status(201).json({
    ok: true,
    message: "Registrasi berhasil",
    token,
    tokenType: "Bearer",
    expiresIn: config.jwt.expiresIn,
    teacher: {
      id: teacher.id,
      username: teacher.username,
      fullName: teacher.full_name,
      email: teacher.email
    }
  });
});

/** Login pengajar: cocokkan username/email + password (hash bcrypt). */
const login = asyncHandler(async (req, res) => {
  const usernameOrEmail = String(req.body.usernameOrEmail || req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!usernameOrEmail || !password) {
    throw new ApiError(400, "Username/email dan password wajib diisi.");
  }

  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT id, username, password_hash, full_name, email FROM teachers WHERE username = $1 OR email = $1",
    [usernameOrEmail]
  );
  const teacher = rows[0];

  /* Pesan sengaja sama untuk username/email & password agar tidak membocorkan
     keberadaan akun (tidak ada informasi "username/email tidak terdaftar"). */
  if (!teacher || !bcrypt.compareSync(password, teacher.password_hash)) {
    throw new ApiError(401, "Username/email atau password salah.");
  }

  const token = signToken({
    id: teacher.id,
    username: teacher.username,
    fullName: teacher.full_name
  });

  res.json({
    ok: true,
    token,
    tokenType: "Bearer",
    expiresIn: config.jwt.expiresIn,
    teacher: {
      id: teacher.id,
      username: teacher.username,
      fullName: teacher.full_name,
      email: teacher.email
    }
  });
});

/** Profil pengajar dari token yang sedang dipakai. */
const me = asyncHandler(async (req, res) => {
  res.json({ teacher: req.teacher });
});

/** Logout bersifat stateless: klien cukup membuang token. */
const logout = asyncHandler(async (req, res) => {
  res.json({ ok: true, message: "Token dibuang di sisi klien. Sampai jumpa!" });
});

/** Ambil Google Client ID untuk inisialisasi di frontend. */
const getGoogleClientId = asyncHandler(async (req, res) => {
  res.json({
    ok: true,
    clientId: config.google.clientId
  });
});

/** Login / Register otomatis menggunakan Google Identity Services (ID Token). */
const googleLogin = asyncHandler(async (req, res) => {
  const credential = req.body && req.body.credential;
  if (!credential) {
    throw new ApiError(400, "Token Google (credential) tidak ditemukan.");
  }

  // Verifikasi ID Token via endpoint Google
  const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
  let payload;
  try {
    const googleRes = await fetch(verifyUrl);
    payload = await googleRes.json();
    if (!googleRes.ok || payload.error) {
      const errDetail = payload.error_description || payload.error || "Token tidak valid";
      throw new ApiError(401, `Verifikasi token Google gagal: ${errDetail}`);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, `Gagal menghubungi server verifikasi Google: ${err.message}`);
  }

  // Verifikasi audience (Client ID)
  const expectedClientId = config.google.clientId;
  if (payload.aud !== expectedClientId && payload.azp !== expectedClientId) {
    throw new ApiError(401, "Google Client ID tidak sesuai.");
  }

  const googleId = payload.sub;
  const email = (payload.email || "").toLowerCase().trim();
  const emailVerified = payload.email_verified === "true" || payload.email_verified === true;

  if (!email || !emailVerified) {
    throw new ApiError(400, "Akun Google tidak memiliki email terverifikasi.");
  }

  const fullName = payload.name || payload.given_name || email.split("@")[0] || "Pengajar Google";
  const avatarUrl = payload.picture || null;

  const pool = getPool();

  // 1. Cari berdasarkan google_id
  let { rows: existingRows } = await pool.query(
    "SELECT id, username, full_name, email, avatar_url FROM teachers WHERE google_id = $1",
    [googleId]
  );

  let teacher = existingRows[0];

  // 2. Jika belum ada google_id, cari berdasarkan email (menghubungkan akun lama)
  if (!teacher) {
    const { rows: emailRows } = await pool.query(
      "SELECT id, username, full_name, email, avatar_url FROM teachers WHERE LOWER(email) = $1",
      [email]
    );

    if (emailRows.length > 0) {
      // Hubungkan google_id ke akun yang sudah ada
      const { rows: updatedRows } = await pool.query(
        `UPDATE teachers
         SET google_id = $1,
             avatar_url = COALESCE(avatar_url, $2),
             full_name = COALESCE(NULLIF(full_name, ''), $3)
         WHERE id = $4
         RETURNING id, username, full_name, email, avatar_url`,
        [googleId, avatarUrl, fullName, emailRows[0].id]
      );
      teacher = updatedRows[0];
    }
  }

  // 3. Jika akun belum pernah ada, daftarkan otomatis akun baru
  if (!teacher) {
    let baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 45) || "guru";
    let username = baseUsername;
    let attempt = 0;

    // Pastikan username unik
    while (true) {
      const { rows: checkUser } = await pool.query(
        "SELECT id FROM teachers WHERE username = $1",
        [username]
      );
      if (checkUser.length === 0) break;
      attempt++;
      username = `${baseUsername.slice(0, 40)}_${attempt}${Math.floor(Math.random() * 100)}`;
    }

    const { rows: newRows } = await pool.query(
      `INSERT INTO teachers (username, full_name, email, google_id, avatar_url, password_hash)
       VALUES ($1, $2, $3, $4, $5, NULL)
       RETURNING id, username, full_name, email, avatar_url`,
      [username, fullName, email, googleId, avatarUrl]
    );
    teacher = newRows[0];
  } else if (avatarUrl && teacher.avatar_url !== avatarUrl) {
    // Perbarui avatar jika ada foto terbaru dari Google
    await pool.query("UPDATE teachers SET avatar_url = $1 WHERE id = $2", [avatarUrl, teacher.id]);
    teacher.avatar_url = avatarUrl;
  }

  // Terbitkan JWT
  const token = signToken({
    id: teacher.id,
    username: teacher.username,
    fullName: teacher.full_name,
    avatarUrl: teacher.avatar_url
  });

  res.json({
    ok: true,
    message: "Login Google berhasil",
    token,
    tokenType: "Bearer",
    expiresIn: config.jwt.expiresIn,
    teacher: {
      id: teacher.id,
      username: teacher.username,
      fullName: teacher.full_name,
      email: teacher.email,
      avatarUrl: teacher.avatar_url
    }
  });
});

module.exports = { register, login, me, logout, googleLogin, getGoogleClientId };
