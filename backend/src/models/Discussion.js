const mongoose = require("mongoose");

// A single reply in a discussion thread. Embedded (not a separate
// collection) since a thread's comments are always read/written together
// and a discussion is expected to stay small (a handful of doctors
// consulting on one patient), not a general chat system.
const commentSchema = new mongoose.Schema(
  {
    // The commenting doctor's clinicianId (e.g. "DOC-RAMPUR-01") - same
    // convention as Referral.referredBy: a human-readable login handle,
    // never a Mongo ObjectId (see Referral.js's note on this).
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    text: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

// One discussion thread, always scoped to exactly one patient - started by
// the doctor who received that patient's referral, inviting exactly one
// other registered doctor to weigh in. Both doctors can then post comments.
// (See discussionController.createDiscussion for the rule that you can only
// start a discussion about a patient that was actually referred to you.)
const discussionSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    subject: { type: String, required: true, trim: true },
    startedBy: { type: String, required: true, index: true },
    startedByName: { type: String, required: true },
    invitedDoctorId: { type: String, required: true, index: true },
    invitedDoctorName: { type: String, required: true },
    comments: [commentSchema],
    // Per-participant "last read" timestamp, keyed by doctorId (same
    // clinicianId convention as startedBy/invitedDoctorId). Used to derive
    // an unread-reply indicator: any comment authored by the OTHER doctor
    // with createdAt after this doctor's own entry here counts as unread.
    // Never serialized directly (see toJSON below) - always surfaced as a
    // derived `unreadCount` computed per-viewer in discussionController.js,
    // since a raw Map keyed by doctorId would otherwise leak the other
    // participant's read timestamp to whoever fetches the discussion.
    lastReadAt: { type: Map, of: Date, default: () => new Map() }
  },
  { timestamps: true }
);

discussionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.commentCount = (ret.comments || []).length;
    if (ret.comments) {
      ret.comments = ret.comments.map((c) => ({
        id: c._id?.toString(),
        authorId: c.authorId,
        authorName: c.authorName,
        text: c.text,
        createdAt: c.createdAt
      }));
    }
    delete ret._id;
    delete ret.__v;
    delete ret.lastReadAt;
    return ret;
  }
});

module.exports = mongoose.model("Discussion", discussionSchema);