const Specialist = require("../models/Specialist");
const Patient = require("../models/Patient");
const AnalysisResult = require("../models/AnalysisResult");
const Referral = require("../models/Referral");
const asyncHandler = require("../utils/asyncHandler");
const { sendMail } = require("../utils/mailer");
const { generateReportHtml } = require("../utils/generateReportHtml");
const { haversineKm } = require("../utils/geo");
const config = require("../config/env");

// GET /api/specialists?lat=&lng=
// `lat`/`lng` are the PHC's own browser geolocation (see frontend's
// getCurrentPosition() + AppContext). When provided, every specialist with
// a real `location` (i.e. self-registered doctors) gets a live haversine
// distance computed from that origin; specialists without a location (the
// legacy seeded demo doctors) fall back to their static distanceKm. Sorted
// nearest-first either way.
const getSpecialists = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const hasOrigin = Number.isFinite(lat) && Number.isFinite(lng);

  const specialists = await Specialist.find();

  const withDistance = specialists.map((s) => {
    const json = s.toJSON();
    if (hasOrigin && s.location && Number.isFinite(s.location.lat) && Number.isFinite(s.location.lng)) {
      json.distanceKm = Math.round(haversineKm(lat, lng, s.location.lat, s.location.lng) * 10) / 10;
      json.distanceSource = "live";
    } else {
      json.distanceSource = "estimated";
    }
    return json;
  });

  withDistance.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  res.json(withDistance);
});

// POST /api/specialists/:id/send  { patientId }
// Emails the specialist the patient's report as a PDF (via Nodemailer) and
// always logs the referral (who/when/to-which-doctor), regardless of
// whether the email itself succeeds - so referral history never silently
// depends on SMTP being up.
const sendReferral = asyncHandler(async (req, res) => {
  const specialist = await Specialist.findOne({ specialistId: req.params.id });
  if (!specialist) {
    return res.status(404).json({ error: `Specialist ${req.params.id} not found` });
  }

  const { patientId } = req.body;
  const patient = patientId ? await Patient.findOne({ patientId }) : null;
  const analysis = patientId ? await AnalysisResult.findOne({ patientId }) : null;

  // Demo-only: seeded specialists don't have real inboxes, so redirect to
  // DEMO_REFERRAL_EMAIL when it's set (see backend/.env). Self-registered
  // doctors always have a real email on file, but demoOverride still wins
  // while it's set, so every referral lands in one inbox for the demo.
  const recipient = config.email?.demoOverride || specialist.email || "";

  let emailStatus = "skipped";
  let emailError = "";

  if (!patient) {
    emailError = "No matching patient found";
  } else if (!analysis) {
    emailError = "No analysis result found for this patient yet";
  } else if (!recipient) {
    emailError = "No recipient email configured for this specialist";
  } else {
    try {
      const reportHtml = generateReportHtml({ patient, analysis, specialist });
      await sendMail({
        to: recipient,
        subject: `Referral: ${patient.name} (${patient.patientId}) - ${analysis.gradeText || "DR Screening"}`,
        text:
          `Dear ${specialist.name},\n\n` +
          `A new patient referral has been sent from RetinaVision AI.\n\n` +
          `Patient: ${patient.name} (${patient.patientId})\n` +
          `Grading result: ${analysis.gradeText || "N/A"}\n\n` +
          `The full screening report is below, and is also visible ` +
          `in your RetinaVision AI dashboard under "My Patients".\n\n` +
          `- RetinaVision AI (automated message)`,
        // The report itself, as the email body - not a PDF/file attachment.
        // See generateReportHtml.js for why (email-client-safe inline
        // styles, remote Cloudinary <img> URLs instead of fetched buffers).
        html: reportHtml
      });
      emailStatus = "sent";
    } catch (err) {
      emailStatus = "failed";
      emailError = err.message || "Unknown email error";
    }
  }

  const referral = await Referral.create({
    patientId: patient?.patientId || patientId || "unknown",
    patientName: patient?.name || "Unknown patient",
    specialistId: specialist.specialistId,
    specialistName: specialist.name,
    specialistFacility: specialist.facility,
    specialistEmail: recipient,
    referredBy: req.user?.id,
    referredByName: req.user?.name,
    emailStatus,
    emailError
  });

  const message =
    emailStatus === "sent"
      ? `Report for ${referral.patientName} (${referral.patientId}) emailed to ${specialist.name} (${recipient}).`
      : emailStatus === "failed"
      ? `Referral for ${referral.patientName} logged, but the email failed to send: ${emailError}`
      : `Referral for ${referral.patientName} logged. Email was skipped (${emailError || "no recipient configured"}).`;

  res.json({ message, referral });
});

module.exports = { getSpecialists, sendReferral };