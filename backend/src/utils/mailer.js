/* ==========================================================================
   src/utils/mailer.js — Pengiriman email OTP verifikasi (Nodemailer + Fallback)
   ========================================================================== */

const nodemailer = require("nodemailer");
const config = require("../config");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { host, port, secure, user, pass } = config.email;
  if (!host || !user || !pass) {
    return null; // SMTP belum dikonfigurasi
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  return transporter;
}

/**
 * Kirim email berisi kode OTP 6 digit.
 * Jika SMTP tidak terkonfigurasi, kode akan dicetak di console server (development fallback).
 *
 * @param {Object} opts
 * @param {string} opts.to Email tujuan
 * @param {string} opts.otp Kode OTP 6 digit
 * @param {string} opts.username Nama pengguna pengajar
 * @returns {Promise<{ delivered: boolean, method: string }>}
 */
async function sendVerificationEmail({ to, otp, username = "Pengajar" }) {
  const mailTransport = getTransporter();

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Nunito', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f9fc; margin: 0; padding: 20px; color: #2d3748; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.06); border: 1px solid #edf2f7; }
    .header { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); padding: 32px 24px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; opacity: 0.95; font-size: 15px; }
    .body { padding: 32px 28px; }
    .greeting { font-size: 17px; margin-bottom: 16px; font-weight: 600; }
    .otp-container { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-label { font-size: 13px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; font-weight: 700; margin-bottom: 8px; }
    .otp-code { font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #ff5722; font-family: monospace, monospace; }
    .expiry { font-size: 13px; color: #64748b; margin-top: 8px; }
    .info { font-size: 14px; line-height: 1.6; color: #475569; margin: 16px 0; }
    .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Kuis Petualangan Ceria</h1>
      <p>Verifikasi Email Akun Area Guru</p>
    </div>
    <div class="body">
      <div class="greeting">Halo, ${escapeHtml(username)}! 👋</div>
      <p class="info">
        Terima kasih telah mendaftar di <strong>Kuis Petualangan Ceria</strong>. Untuk mengaktifkan akun Guru Anda, silakan masukkan kode verifikasi berikut:
      </p>
      <div class="otp-container">
        <div class="otp-label">Kode Verifikasi (OTP)</div>
        <div class="otp-code">${otp}</div>
        <div class="expiry">Kode berlaku selama <strong>10 menit</strong></div>
      </div>
      <p class="info">
        Jangan bagikan kode verifikasi ini kepada siapa pun. Jika Anda tidak merasa mendaftar di Kuis Petualangan Ceria, Anda dapat mengabaikan email ini.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Kuis Petualangan Ceria &bull; Platform Belajar & Kuis Interaktif
    </div>
  </div>
</body>
</html>
  `;

  if (mailTransport) {
    try {
      await mailTransport.sendMail({
        from: config.email.from,
        to,
        subject: `[Kuis Ceria] Kode Verifikasi Email Anda: ${otp}`,
        text: `Halo ${username},\n\nKode verifikasi akun Kuis Petualangan Ceria Anda adalah: ${otp}\nKode ini berlaku selama 10 menit.\n\nJangan bagikan kode ini kepada siapa pun.`,
        html: htmlContent
      });
      return { delivered: true, method: "smtp" };
    } catch (err) {
      console.error("[mailer] Gagal mengirim email via SMTP:", err.message);
      // Fallback ke console jika SMTP gagal
      printConsoleOtp(to, otp);
      return { delivered: false, method: "fallback-console", error: err.message };
    }
  } else {
    // Mode tanpa SMTP (Local dev / Belum set SMTP di env)
    printConsoleOtp(to, otp);
    return { delivered: true, method: "console" };
  }
}

function printConsoleOtp(to, otp) {
  console.log("\n=======================================================");
  console.log(" 📬 [DEV EMAIL SERVICE] VERIFIKASI EMAIL OTP");
  console.log(` 📧 Kepada: ${to}`);
  console.log(` 🔑 Kode OTP: ${otp}`);
  console.log(" (Berlaku 10 menit. Konfigurasi SMTP di .env untuk email asli)");
  console.log("=======================================================\n");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = { sendVerificationEmail };
