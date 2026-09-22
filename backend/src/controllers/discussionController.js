const Discussion = require("../models/Discussion");
const Referral = require("../models/Referral");
const Specialist = require("../models/Specialist");
const Patient = require("../models/Patient");
const AnalysisResult = require("../models/AnalysisResult"); // NEW
const asyncHandler = require("../utils/asyncHandler");

// A doctor is a "participant" in a discussion if they started it or were
// the one invited into it - this is the only access check every route
// below relies on, so a doctor can never read/post into a thread they
// weren't part of.
function isParticipant(discussion, doctorId) {
  return discussion.startedBy === doctorId || discussion.invitedDoctorId === doctorId;
}

// NEW: attaches the actual patient + AI report to a discussion, the same
// way referralController.getMyReferrals does for the inbox. Necessary
// because doctor accounts have zero access to /api/patients or
// /api/analysis directly (see routes/index.js) - a discussion's embedded
// patient/analysis is the ONLY way the invited doctor ever sees more than
// the subject line for this patient.
async function withPatientReport(discussion) {
  const [patient, analysis] = await Promise.all([
    Patient.findOne({ patientId: discussion.patientId }),
    AnalysisResult.findOne({ patientId: discussion.patientId })
  ]);

  return {
    ...discussion.toJSON(),
    patient: patient ? patient.toJSON() : null,
    analysis: analysis ? analysis.toJSON() : null
  };
}

// GET /api/discussions/doctors
// The picker list for "invite a doctor to discuss" - every OTHER
// self-registered doctor (Specialist docs with a linked userId; the 3
// legacy seeded specialists have no userId and never show up here, since
// they aren't real logins that could join a discussion).
const listInvitableDoctors = asyncHandler(async (req, res) => {
  const doctors = await Specialist.find({
    userId: { $ne: null },
    specialistId: { $ne: req.user.id }
  }).sort({ name: 1 });

  res.json(
    doctors.map((d) => ({
      id: d.specialistId,
      name: d.name,
      role: d.role,
      facility: d.facility
    }))
  );
});

// POST /api/discussions  { patientId, invitedDoctorId, subject }
// Only the doctor who actually received a referral for this patient can
// start a discussion about them - checked via Referral, not trusted from
// the request body.
const createDiscussion = asyncHandler(async (req, res) => {
  const { patientId, invitedDoctorId, subject } = req.body;

  if (!patientId || !invitedDoctorId || !subject) {
    return res.status(400).json({ error: "patientId, invitedDoctorId and subject are required" });
  }
  if (invitedDoctorId === req.user.id) {
    return res.status(400).json({ error: "You can't invite yourself to a discussion" });
  }

  const ownReferral = await Referral.findOne({ patientId, specialistId: req.user.id });
  if (!ownReferral) {
    return res.status(403).json({ error: "You can only start a discussion about a patient referred to you" });
  }

  const invitedDoctor = await Specialist.findOne({ specialistId: invitedDoctorId, userId: { $ne: null } });
  if (!invitedDoctor) {
    return res.status(404).json({ error: "That doctor could not be found" });
  }

  const patient = await Patient.findOne({ patientId });

  const discussion = await Discussion.create({
    patientId,
    patientName: patient?.name || ownReferral.patientName,
    subject,
    startedBy: req.user.id,
    startedByName: req.user.name,
    invitedDoctorId: invitedDoctor.specialistId,
    invitedDoctorName: invitedDoctor.name
  });

  // NEW: embed the report on creation too, so DiscussModal's redirect
  // straight into DiscussionDetailPage has it immediately, no refetch needed.
  res.status(201).json(await withPatientReport(discussion));
});

// GET /api/discussions/mine
// Every thread the logged-in doctor is part of, whether they started it or
// were invited into it - newest activity first.
const getMyDiscussions = asyncHandler(async (req, res) => {
  const discussions = await Discussion.find({
    $or: [{ startedBy: req.user.id }, { invitedDoctorId: req.user.id }]
  }).sort({ updatedAt: -1 });

  res.json(discussions);
});

// GET /api/discussions/:id
const getDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.id);
  if (!discussion || !isParticipant(discussion, req.user.id)) {
    return res.status(404).json({ error: "Discussion not found" });
  }
  // NEW
  res.json(await withPatientReport(discussion));
});

// POST /api/discussions/:id/comments  { text }
const addComment = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Comment text is required" });
  }

  const discussion = await Discussion.findById(req.params.id);
  if (!discussion || !isParticipant(discussion, req.user.id)) {
    return res.status(404).json({ error: "Discussion not found" });
  }

  discussion.comments.push({ authorId: req.user.id, authorName: req.user.name, text: text.trim() });
  await discussion.save();

  // NEW: without this, the frontend's setDiscussion(updated) after posting
  // a reply would wipe out patient/analysis (since a plain Discussion
  // document doesn't have them) and the report would vanish from the page
  // the moment you send your first message.
  res.status(201).json(await withPatientReport(discussion));
});

module.exports = { listInvitableDoctors, createDiscussion, getMyDiscussions, getDiscussion, addComment };