const Discussion = require("../models/Discussion");
const Referral = require("../models/Referral");
const Specialist = require("../models/Specialist");
const Patient = require("../models/Patient");
const AnalysisResult = require("../models/AnalysisResult"); // NEW
const asyncHandler = require("../utils/asyncHandler");
const { discussionRoom, userRoom } = require("../sockets");

// A doctor is a "participant" in a discussion if they started it or were
// the one invited into it - this is the only access check every route
// below relies on, so a doctor can never read/post into a thread they
// weren't part of.
function isParticipant(discussion, doctorId) {
  return discussion.startedBy === doctorId || discussion.invitedDoctorId === doctorId;
}

// The other doctor in a (always exactly two-participant) discussion.
function otherParticipantId(discussion, doctorId) {
  return discussion.startedBy === doctorId ? discussion.invitedDoctorId : discussion.startedBy;
}

// How many of THIS discussion's comments count as unread for `doctorId`:
// authored by the other participant, and posted after doctorId's own
// lastReadAt entry (never read = epoch, i.e. everything from them counts).
// Must run on the raw mongoose document (before toJSON, which strips
// lastReadAt) - see Discussion.js's note on why that field is never
// serialized as-is.
function unreadCountFor(discussion, doctorId) {
  const lastRead = discussion.lastReadAt?.get(doctorId) || new Date(0);
  return discussion.comments.filter(
    (c) => c.authorId !== doctorId && c.createdAt > lastRead
  ).length;
}

// Stamps doctorId's lastReadAt to now and persists it - called whenever
// that doctor actually looks at the thread (opening it, or already having
// it open when a new reply streams in over the socket).
async function markReadFor(discussion, doctorId) {
  discussion.lastReadAt.set(doctorId, new Date());
  await discussion.save();
}

// NEW: attaches the actual patient + AI report to a discussion, the same
// way referralController.getMyReferrals does for the inbox. Necessary
// because doctor accounts have zero access to /api/patients or
// /api/analysis directly (see routes/index.js) - a discussion's embedded
// patient/analysis is the ONLY way the invited doctor ever sees more than
// the subject line for this patient.
// NEW: viewerId is optional so createDiscussion (no meaningful "unread" the
// instant a thread is created) can keep calling this without it - unreadCount
// then just falls back to 0.
async function withPatientReport(discussion, viewerId) {
  const [patient, analysis] = await Promise.all([
    Patient.findOne({ patientId: discussion.patientId }),
    AnalysisResult.findOne({ patientId: discussion.patientId })
  ]);

  return {
    ...discussion.toJSON(),
    unreadCount: viewerId ? unreadCountFor(discussion, viewerId) : 0,
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

  // NEW: unreadCount computed per-viewer from the raw docs (must happen
  // before .toJSON() strips lastReadAt) - this is what lets the
  // Discussions list and the sidebar show an "unread reply" indicator
  // without opening every thread.
  res.json(
    discussions.map((d) => ({
      ...d.toJSON(),
      unreadCount: unreadCountFor(d, req.user.id)
    }))
  );
});

// GET /api/discussions/:id
const getDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.id);
  if (!discussion || !isParticipant(discussion, req.user.id)) {
    return res.status(404).json({ error: "Discussion not found" });
  }
  // NEW: opening a thread is itself "reading" it, so mark it read before
  // responding - the returned unreadCount will be 0.
  await markReadFor(discussion, req.user.id);
  res.json(await withPatientReport(discussion, req.user.id));
});

// POST /api/discussions/:id/read
// Called by the frontend when a doctor already has a thread open and a new
// reply streams in over the socket - keeps the server's read-state in sync
// so the unread indicator doesn't reappear next time they visit the list.
const markDiscussionRead = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.id);
  if (!discussion || !isParticipant(discussion, req.user.id)) {
    return res.status(404).json({ error: "Discussion not found" });
  }
  await markReadFor(discussion, req.user.id);
  res.json({ unreadCount: 0 });
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
  const withReport = await withPatientReport(discussion, req.user.id);

  const io = req.app.get("io");
  if (io) {
    // Real-time push to whoever else is currently viewing this discussion,
    // over the room the socket layer joins clients into (see
    // sockets/index.js). The REST response above is still what the
    // poster's own screen updates from - this is purely for everyone
    // else's screen, and it's a no-op if the io server hasn't been wired
    // up (e.g. in tests).
    io.to(discussionRoom(discussion.id)).emit("discussion:comment", withReport.comments[withReport.comments.length - 1]);

    // NEW: the "unread reply" indicator. Pushed to the other doctor's
    // personal room (see sockets/index.js's userRoom) rather than the
    // discussion room, since they may not currently have this thread open
    // at all - this is what lights up the badge on the Discussions list
    // and the sidebar nav item even from a completely different page.
    const recipientId = otherParticipantId(discussion, req.user.id);
    io.to(userRoom(recipientId)).emit("discussion:unread", {
      discussionId: discussion.id,
      unreadCount: unreadCountFor(discussion, recipientId),
      subject: discussion.subject,
      patientName: discussion.patientName,
      authorName: req.user.name
    });
  }

  res.status(201).json(withReport);
});

module.exports = {
  listInvitableDoctors,
  createDiscussion,
  getMyDiscussions,
  getDiscussion,
  addComment,
  markDiscussionRead
};