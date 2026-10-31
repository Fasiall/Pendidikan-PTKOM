/* ==========================================================================
   src/controllers/auth.controller.js — Autentikasi pengajar (JWT) & Verifikasi Email (OTP)

   Endpoint:
     POST /api/auth/register    { username, password, confirmPassword, email } -> { needsVerification, email }
     POST /api/auth/verify-otp  { email, otp } -> { token, teacher }
     POST /api/auth/resend-otp  { email } -> { ok, resendAvailableIn }
     POST /api/auth/login       { usernameOrEmail, password } -> { token, teacher }
     GET  /api/auth/me          (Bearer)               -> { teacher }
     POST /api/auth/logout      (Bearer)               -> { ok }
   ========================================================================== */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const config = require("../config");
const { getPool } = require("../db/embedded");
const { ApiError, asyncHandler } = require("../utils/errors");
const { requireFields } = require("../utils/validate");
const { signToken } = require("../middleware/auth");
const { sendVerificationEmail } = require("../utils/mailer");

/** Buat kode OTP acak 6 digit */
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Hash OTP menggunakan SHA-256 untuk disimpan di database */
function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
}

/** Registrasi pengajar baru: username, password, confirmPassword, email. */
const register = asyncHandler(async (req, res) => {
  requireFields(req.body, ["username", "password", "confirmPassword", "email"]);

  const { username, password, confirmPassword, email } = req.body;
  const cleanUsername = String(username).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  // Validasi password dan konfirmasi password
  if (password !== confirmPassword) {
    throw new ApiError(400, "Password dan konfirmasi password tidak cocok");
  }

  // Validasi format email sederhana
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new ApiError(400, "Format email tidak valid");
  }

  const pool = getPool();

  // Cek apakah username sudah digunakan
  const { rows: usernameRows } = await pool.query(
    "SELECT id FROM teachers WHERE username = $1",
    [cleanUsername]
  );
  if (usernameRows.length > 0) {
    throw new ApiError(400, "Username sudah digunakan");
  }

  // Cek apakah email sudah digunakan
  const { rows: emailRows } = await pool.query(
    "SELECT id, email_verified_at FROM teachers WHERE LOWER(email) = $1",
    [cleanEmail]
  );
  if (emailRows.length > 0) {
    if (emailRows[0].email_verified_at) {
      throw new ApiError(400, "Email sudah terdaftar. Silakan masuk menggunakan akun tersebut.");
    }
    // Jika ada akun lama yang belum terverifikasi, hapus data lama agar bisa daftar ulang
    await pool.query("DELETE FROM teachers WHERE id = $1", [emailRows[0].id]);
  }

  // Hash password
  const passwordHash = bcrypt.hashSync(password, 10);

  // Tambah pengguna baru (email_verified_at NULL)
  const { rows } = await pool.query(
    `INSERT INTO teachers (username, password_hash, full_name, email, email_verified_at)
     VALUES ($1, $2, $3, $4, NULL)
     RETURNING id, username, full_name, email`,
    [cleanUsername, passwordHash, cleanUsername, cleanEmail]
  );
  const teacher = rows[0];

  // Buat kode OTP 6 digit (berlaku 10 menit, cooldown resend 60 detik)
  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  await pool.query(
    `INSERT INTO email_verifications (teacher_id, email, otp_hash, attempts, expires_at, resend_available_at)
     VALUES ($1, $2, $3, 0, now() + interval '10 minutes', now() + interval '60 seconds')`,
    [teacher.id, cleanEmail, otpHash]
  );

  // Kirim email kode OTP
  await sendVerificationEmail({
    to: cleanEmail,
    otp,
    username: teacher.username
  });

  res.status(201).json({
    ok: true,
    needsVerification: true,
    message: "Pendaftaran berhasil! Kode verifikasi 6 digit telah dikirim ke email Anda.",
    email: cleanEmail,
    resendAvailableIn: 60
  });
});

/** Verifikasi kode OTP email pengajar. */
const verifyOtp = asyncHandler(async (req, res) => {
  requireFields(req.body, ["email", "otp"]);

  const cleanEmail = String(req.body.email).trim().toLowerCase();
  const cleanOtp = String(req.body.otp).trim();

  if (!/^\d{6}$/.test(cleanOtp)) {
    throw new ApiError(400, "Kode verifikasi harus berupa 6 digit angka.");
  }

  const pool = getPool();

  // Cari data verifikasi terbaru untuk email ini
  const { rows: verifRows } = await pool.query(
    `SELECT id, teacher_id, email, otp_hash, attempts, expires_at
     FROM email_verifications
     WHERE LOWER(email) = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [cleanEmail]
  );

  if (verifRows.length === 0) {
    throw new ApiError(400, "Permintaan verifikasi tidak ditemukan atau sudah kadaluarsa. Silakan minta kode baru.");
  }

  const verif = verifRows[0];

  // Cek apakah sudah kedaluwarsa
  if (new Date(verif.expires_at) < new Date()) {
    await pool.query("DELETE FROM email_verifications WHERE id = $1", [verif.id]);
    throw new ApiError(400, "Kode verifikasi telah kedaluwarsa. Silakan minta kode baru.");
  }

  // Cek jumlah percobaan gagal (maksimal 5 kali)
  if (verif.attempts >= 5) {
    await pool.query("DELETE FROM email_verifications WHERE id = $1", [verif.id]);
    throw new ApiError(400, "Terlalu banyak percobaan gagal. Kode telah dibatalkan, silakan minta kode baru.");
  }

  // Cocokkan hash OTP
  const inputHash = hashOtp(cleanOtp);
  if (inputHash !== verif.otp_hash) {
    const nextAttempts = verif.attempts + 1;
    await pool.query(
      "UPDATE email_verifications SET attempts = $1 WHERE id = $2",
      [nextAttempts, verif.id]
    );
    const sisa = Math.max(0, 5 - nextAttempts);
    throw new ApiError(400, `Kode verifikasi salah. Sisa kesempatan: ${sisa} kali.`);
  }

  // Sukses: tandai email pengajar telah terverifikasi
  const { rows: teacherRows } = await pool.query(
    `UPDATE teachers
     SET email_verified_at = now()
     WHERE id = $1
     RETURNING id, username, full_name, email, avatar_url`,
    [verif.teacher_id]
  );

  if (teacherRows.length === 0) {
    throw new ApiError(404, "Akun pengajar tidak ditemukan.");
  }
  const teacher = teacherRows[0];

  // Bersihkan data verifikasi yang sudah berhasil
  await pool.query("DELETE FROM email_verifications WHERE LOWER(email) = $1", [cleanEmail]);

  // Terbitkan token JWT
  const token = signToken({
    id: teacher.id,
    username: teacher.username,
    fullName: teacher.full_name,
    avatarUrl: teacher.avatar_url
  });

  res.json({
    ok: true,
    message: "Verifikasi email berhasil! Selamat datang.",
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

/** Kirim ulang kode verifikasi OTP (dengan cooldown 60 detik). */
const resendOtp = asyncHandler(async (req, res) => {
  requireFields(req.body, ["email"]);

  const cleanEmail = String(req.body.email).trim().toLowerCase();
  const pool = getPool();

  // Cari akun pengajar
  const { rows: teacherRows } = await pool.query(
    "SELECT id, username, email, email_verified_at FROM teachers WHERE LOWER(email) = $1",
    [cleanEmail]
  );

  if (teacherRows.length === 0) {
    throw new ApiError(404, "Akun dengan email ini tidak ditemukan.");
  }

  const teacher = teacherRows[0];
  if (teacher.email_verified_at) {
    throw new ApiError(400, "Email ini sudah terverifikasi. Silakan langsung masuk.");
  }

  // Cek cooldown permintaan sebelumnya
  const { rows: recentVerifs } = await pool.query(
    `SELECT resend_available_at FROM email_verifications
     WHERE teacher_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [teacher.id]
  );

  if (recentVerifs.length > 0) {
    const resendAt = new Date(recentVerifs[0].resend_available_at);
    const now = new Date();
    if (resendAt > now) {
      const waitSeconds = Math.ceil((resendAt.getTime() - now.getTime()) / 1000);
      throw new ApiError(429, `Harap tunggu ${waitSeconds} detik sebelum meminta kode baru.`);
    }
  }

  // Hapus kode lama
  await pool.query("DELETE FROM email_verifications WHERE teacher_id = $1", [teacher.id]);

  // Buat kode baru
  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  await pool.query(
    `INSERT INTO email_verifications (teacher_id, email, otp_hash, attempts, expires_at, resend_available_at)
     VALUES ($1, $2, $3, 0, now() + interval '10 minutes', now() + interval '60 seconds')`,
    [teacher.id, cleanEmail, otpHash]
  );

  await sendVerificationEmail({
    to: cleanEmail,
    otp,
    username: teacher.username
  });

  res.json({
    ok: true,
    message: "Kode verifikasi baru telah dikirim ke email Anda.",
    email: cleanEmail,
    resendAvailableIn: 60
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
    "SELECT id, username, password_hash, full_name, email, email_verified_at, avatar_url FROM teachers WHERE username = $1 OR LOWER(email) = LOWER($1)",
    [usernameOrEmail]
  );
  const teacher = rows[0];

  /* Pesan sengaja sama untuk username/email & password agar tidak membocorkan
     keberadaan akun (tidak ada informasi "username/email tidak terdaftar"). */
  if (!teacher || !teacher.password_hash || !bcrypt.compareSync(password, teacher.password_hash)) {
    throw new ApiError(401, "Username/email atau password salah.");
  }

  // Cek apakah email belum diverifikasi
  if (teacher.email && !teacher.email_verified_at) {
    // Generate/resend OTP secara otomatis agar mempermudah alur verifikasi
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await pool.query("DELETE FROM email_verifications WHERE teacher_id = $1", [teacher.id]);
    await pool.query(
      `INSERT INTO email_verifications (teacher_id, email, otp_hash, attempts, expires_at, resend_available_at)
       VALUES ($1, $2, $3, 0, now() + interval '10 minutes', now() + interval '60 seconds')`,
      [teacher.id, teacher.email, otpHash]
    );

    await sendVerificationEmail({
      to: teacher.email,
      otp,
      username: teacher.username
    });

    return res.status(403).json({
      ok: false,
      needsVerification: true,
      email: teacher.email,
      message: "Email akun Anda belum diverifikasi. Kode verifikasi 6 digit telah dikirimkan ke email Anda."
    });
  }

  const token = signToken({
    id: teacher.id,
    username: teacher.username,
    fullName: teacher.full_name,
    avatarUrl: teacher.avatar_url
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
      email: teacher.email,
      avatarUrl: teacher.avatar_url
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

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  me,
  logout
};
