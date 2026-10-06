/* ==========================================================================
   src/utils/validate.js — Validasi input sederhana untuk controller
   ========================================================================== */

const { ApiError } = require("./errors");

/** Pastikan field wajib ada dan tidak kosong. */
function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    const value = body ? body[field] : undefined;
    return value === undefined || value === null || String(value).trim() === "";
  });

  if (missing.length) {
    throw ApiError.badRequest(
      "Field wajib belum diisi: " + missing.join(", "),
      { missing }
    );
  }
}

/** Ubah menjadi integer positif; lempar error bila bukan angka valid. */
function toInt(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw ApiError.badRequest(`Field "${field}" harus bilangan bulat ${min}..${max}.`);
  }
  return number;
}

/** Nilai boolean fleksibel: true/"true"/1. */
function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes"].includes(String(value).toLowerCase());
}

module.exports = { requireFields, toInt, toBool };
