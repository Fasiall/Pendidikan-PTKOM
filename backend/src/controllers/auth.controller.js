/* ==========================================================================
   src/controllers/auth.controller.js — Autentikasi pengajar (JWT)

   Endpoint:
     POST /api/auth/register   { username, password, confirmPassword, fullName, email } -> { token, teacher }
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

/** Registrasi pengajar baru: username, password, confirmPassword, fullName, email. */
const register = asyncHandler(async (req, res) => {
  requireFields(req.body, ["username", "password", "confirmPassword", "fullName", "email"]);

  const { username, password, confirmPassword, fullName, email } = req.body;

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
    [username.trim(), passwordHash, fullName.trim(), email.trim() || null]
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
  requireFields(req.body, ["usernameOrEmail", "password"]);

  const usernameOrEmail = String(req.body.usernameOrEmail).trim();
  const password = String(req.body.password);

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

module.exports = { register, login, me, logout };
