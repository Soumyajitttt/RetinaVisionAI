const nodemailer = require("nodemailer");
const config = require("../config/env");

let transporter = null;

// Lazily built so the app doesn't crash on boot if EMAIL_USER/EMAIL_PASS
// aren't set yet - referrals still get recorded, just with emailStatus
// "skipped", until email is configured.
function getTransporter() {
  if (!config.email.user || !config.email.pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: config.email.service,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html, attachments }) {
  const t = getTransporter();
  if (!t) {
    throw new Error("Email is not configured (set EMAIL_USER / EMAIL_PASS in backend/.env)");
  }
  return t.sendMail({ from: config.email.from, to, subject, text, html, attachments });
}

module.exports = { sendMail, getTransporter };