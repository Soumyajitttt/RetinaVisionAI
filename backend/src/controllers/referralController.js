const Referral = require("../models/Referral");
const Patient = require("../models/Patient");
const AnalysisResult = require("../models/AnalysisResult");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/referrals?patientId=&specialistId=  (PHC role only - see routes)
// Powers the PHC's "Referral History" page: who was referred to which
// doctor, and when, with the email outcome for each send.
const getReferralHistory = asyncHandler(async (req, res) => {
  const { patientId, specialistId } = req.query;
  const filter = {};
  if (patientId) filter.patientId = patientId;
  if (specialistId) filter.specialistId = specialistId;

  const referrals = await Referral.find(filter).sort({ createdAt: -1 });
  res.json(referrals);
});

// GET /api/referrals/mine  (doctor role only - see routes)
// A doctor's own inbox: one row per PATIENT ever referred TO them (matched
// by specialistId === their own clinicianId, since doctor accounts are
// 1:1 with a Specialist listing - see authController.register), with the
// full Patient + AnalysisResult attached. This is the ONLY patient data a
// doctor account can reach - they have no access to /api/patients or
// /api/analysis (see routes/index.js), so a referral is the sole way
// patient info reaches a doctor's login.
//
// A patient can legitimately be referred more than once (re-screened and
// re-sent, referral resent after a failed email, etc.) - each of those is
// still logged as its own Referral row for the PHC's audit trail (see
// getReferralHistory above). But showing every one of those rows here
// would duplicate the same patient in the doctor's inbox. Instead we keep
// only the most recent referral per patientId, so the doctor always sees
// a single, up-to-date card per patient.
const getMyReferrals = asyncHandler(async (req, res) => {
  const referrals = await Referral.find({ specialistId: req.user.id }).sort({ createdAt: -1 });

  const latestByPatient = new Map();
  for (const r of referrals) {
    if (!latestByPatient.has(r.patientId)) {
      latestByPatient.set(r.patientId, r);
    }
  }
  const deduped = Array.from(latestByPatient.values());

  // Serve the snapshot frozen at send time - NOT the live Patient /
  // AnalysisResult. Changes made on the PHC side after sending only reach
  // the doctor when the PHC sends the patient again (new Referral row,
  // new snapshot). Legacy referrals created before snapshots existed have
  // no snapshot, so they fall back to the live data once and the result is
  // saved, freezing them from that point on.
  const enriched = await Promise.all(
    deduped.map(async (r) => {
      if (!r.patientSnapshot && !r.analysisSnapshot) {
        const [patient, analysis] = await Promise.all([
          Patient.findOne({ patientId: r.patientId }),
          AnalysisResult.findOne({ patientId: r.patientId })
        ]);
        if (patient || analysis) {
          r.patientSnapshot = patient ? patient.toJSON() : null;
          r.analysisSnapshot = analysis ? analysis.toJSON() : null;
          await r.save();
        }
      }
      return {
        ...r.toJSON(),
        patient: r.patientSnapshot || null,
        analysis: r.analysisSnapshot || null
      };
    })
  );

  res.json(enriched);
});

module.exports = { getReferralHistory, getMyReferrals };