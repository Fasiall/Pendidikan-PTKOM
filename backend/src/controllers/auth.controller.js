/* ==========================================================================
   src/controllers/auth.controller.js — Autentikasi pengajar (JWT)

   Endpoint:
     POST /api/auth/login   { username, password } -> { token, teacher }
     GET  /api/auth/me      (Bearer)               -> { teacher }
     POST /api/auth/logout  (Bearer)               -> { ok }
   ========================================================================== */

const bcrypt = require("bcryptjs");

const config = require("../config");
const { getPool } = require("../db/embedded");
const { ApiError, asyncHandler } = require("../utils/errors");
const { requireFields } = require("../utils/validate");
const { signToken } = require("../middleware/auth");

/** Login pengajar: cocokkan username + password (hash bcrypt). */
const login = asyncHandler(async (req, res) => {
  requireFields(req.body, ["username", "password"]);

  const username = String(req.body.username).trim();
  const password = String(req.body.password);

  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT id, username, password_hash, full_name FROM teachers WHERE username = $1",
    [username]
  );
  const teacher = rows[0];

  /* Pesan sengaja sama untuk username & password agar tidak membocorkan
     keberadaan akun (tidak ada informasi "username tidak terdaftar"). */
  if (!teacher || !bcrypt.compareSync(password, teacher.password_hash)) {
    throw new ApiError(401, "Username atau password salah.");
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
      fullName: teacher.full_name
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

module.exports = { login, me, logout };
