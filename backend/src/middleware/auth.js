/* ==========================================================================
   src/middleware/auth.js — Autentikasi pengajar berbasis JWT

   Flow:
     1. POST /api/auth/login  -> server mengirim token (JWT)
     2. Frontend menyimpan token lalu mengirimkannya di setiap request
        sebagai header:  Authorization: Bearer <token>
     3. Middleware ini memverifikasi token dan mengisi req.teacher,
        sehingga route dashboard admin hanya bisa diakses pengajar.
   ========================================================================== */

const jwt = require("jsonwebtoken");

const config = require("../config");
const { ApiError } = require("../utils/errors");

/** Buat token JWT untuk satu pengajar. */
function signToken(teacher) {
  return jwt.sign(
    {
      sub: teacher.id,
      username: teacher.username,
      fullName: teacher.fullName
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/**
 * Middleware autentikasi.
 *   authenticate()          -> token wajib ada (route admin/dashboard)
 *   authenticate({required:false}) -> token boleh tidak ada (route opsional)
 */
function authenticate({ required = true } = {}) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

    if (!token) {
      if (required) {
        return next(ApiError.unauthorized("Token tidak ditemukan. Silakan login terlebih dahulu."));
      }
      req.teacher = null;
      return next();
    }

    try {
      const payload = jwt.verify(token, config.jwt.secret);
      req.teacher = {
        id: Number(payload.sub),
        username: payload.username,
        fullName: payload.fullName
      };
      next();
    } catch (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Sesi berakhir. Silakan login kembali."
          : "Token tidak valid. Silakan login kembali.";
      next(new ApiError(401, message));
    }
  };
}

module.exports = { authenticate, signToken };
