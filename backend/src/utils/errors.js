/* ==========================================================================
   src/utils/errors.js — ApiError & pembungkus async controller

   Melempar ApiError membuat error handler global (middleware/errorHandler.js)
   otomatis merespons dengan kode HTTP yang tepat.
   ========================================================================== */

class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details = null) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Silakan login terlebih dahulu.") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Anda tidak punya akses ke resource ini.") {
    return new ApiError(403, message);
  }

  static notFound(message = "Data tidak ditemukan.") {
    return new ApiError(404, message);
  }
}

/** Bungkus async controller agar error langsung diteruskan ke error handler. */
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

module.exports = { ApiError, asyncHandler };
