/* ==========================================================================
   src/middleware/errorHandler.js — Penangkap semua error API

   Dipasang sebagai middleware TERAKHIR di src/app.js.
   ========================================================================== */

const config = require("../config");
const { ApiError } = require("../utils/errors");

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Endpoint ${req.method} ${req.path} tidak ditemukan.`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  /* Error validasi dari driver PostgreSQL */
  if (err && err.code === "23505") {
    return res.status(409).json({
      error: "Data sudah ada (nilai duplikat).",
      detail: err.detail
    });
  }
  if (err && err.code === "23503") {
    return res.status(400).json({
      error: "Relasi data tidak valid — pastikan ID yang dirujuk benar."
    });
  }

  /* Error sintaks JSON dari body parser */
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Format JSON tidak valid." });
  }

  const status = err instanceof ApiError ? err.status : err.status || 500;
  const message =
    err instanceof ApiError ? err.message : status === 500 ? "Terjadi kesalahan pada server." : err.message;

  if (status === 500) {
    console.error("[error]", req.method, req.originalUrl, "→", err);
  }

  res.status(status).json({
    error: message,
    ...(err instanceof ApiError && err.details ? { details: err.details } : {}),
    ...(!config.isProduction && status === 500 ? { stack: err.stack } : {})
  });
}

module.exports = { notFoundHandler, errorHandler };
