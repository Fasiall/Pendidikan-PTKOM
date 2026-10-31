/* ==========================================================================
   src/utils/quizSchedule.js — Aturan jadwal akses kuis (WIB)

   Penyimpanan memakai timestamptz (UTC). Semua label untuk pengguna dibuat
   dengan zona waktu Asia/Jakarta agar konsisten di server mana pun.
   ========================================================================== */

const { ApiError } = require("./errors");

const WIB_TIME_ZONE = "Asia/Jakarta";

/** Ubah nilai dari klien menjadi Date; null/"" berarti tanpa jadwal. */
function parseScheduleDate(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw ApiError.badRequest(`${label} tidak valid.`);
  }
  return date;
}

/**
 * Validasi pasangan jadwal. Keduanya harus diisi bersama dan jam selesai
 * wajib lebih besar dari jam mulai.
 * @returns {{start: Date|null, end: Date|null}}
 */
function normalizeSchedule(startValue, endValue) {
  const start = parseScheduleDate(startValue, "Jadwal mulai");
  const end = parseScheduleDate(endValue, "Jadwal selesai");

  if ((start && !end) || (!start && end)) {
    throw ApiError.badRequest("Jadwal akses harus diisi lengkap: tanggal, jam mulai, dan jam selesai.");
  }
  if (start && end && end.getTime() <= start.getTime()) {
    throw ApiError.badRequest("Jam selesai harus lebih besar dari jam mulai.");
  }
  return { start, end };
}

/** Status jadwal memakai jam server. null = kuis bebas diakses. */
function getScheduleStatus(set, now = new Date()) {
  const start = set && set.schedule_start ? new Date(set.schedule_start) : null;
  const end = set && set.schedule_end ? new Date(set.schedule_end) : null;
  if (!start && !end) return null;
  if (start && now.getTime() < start.getTime()) return "not_open";
  if (end && now.getTime() > end.getTime()) return "ended";
  return "open";
}

/** Label waktu ramah dalam WIB, mis. "Senin, 12 November 2026 pukul 13.00 WIB". */
function formatWibLabel(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  return formatter.format(date) + " WIB";
}

/** Pesan siswa sesuai status jadwal. */
function buildScheduleMessage(set, now = new Date()) {
  const status = getScheduleStatus(set, now);
  if (status === "not_open") {
    return "Kuis belum dibuka. Dibuka pada " + formatWibLabel(set.schedule_start) + ".";
  }
  if (status === "ended") {
    return "Waktu kuis sudah berakhir.";
  }
  return null;
}

/**
 * Batas akhir efektif pengerjaan = yang lebih dulu habis antara timer durasi
 * dan jam selesai jadwal.
 * @returns {number|null} epoch milliseconds, atau null bila tanpa batas.
 */
function resolveDeadline({ startedAt, timeLimit, scheduleEnd }) {
  const candidates = [];
  if (Number(timeLimit) > 0) {
    candidates.push(Number(startedAt) + Number(timeLimit) * 60 * 1000);
  }
  if (scheduleEnd) {
    const end = new Date(scheduleEnd).getTime();
    if (!Number.isNaN(end)) candidates.push(end);
  }
  if (!candidates.length) return null;
  return Math.min.apply(null, candidates);
}

module.exports = {
  WIB_TIME_ZONE,
  normalizeSchedule,
  getScheduleStatus,
  formatWibLabel,
  buildScheduleMessage,
  resolveDeadline
};
