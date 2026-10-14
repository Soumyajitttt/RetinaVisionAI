const mongoose = require("mongoose");

// One row per "Send" click on the Specialists page - who a patient was
// referred to and when, so clinicians can look back at referral history
// (see specialistController.sendReferral / referralController.getReferralHistory).
const referralSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    specialistId: { type: String, required: true, index: true },
    specialistName: { type: String, required: true },
    specialistFacility: { type: String, default: "" },
    specialistEmail: { type: String, default: "" },
    // The logged-in clinician's clinicianId (e.g. "PHC-RAMPUR-102") - NOT a
    // Mongo ObjectId. auth tokens are signed with `sub: user.clinicianId`
    // (see authController.issueToken), so req.user.id is always this
    // human-readable string, never an _id.
    referredBy: { type: String, default: "" },
    referredByName: { type: String, default: "" },
    // Whether the Nodemailer send actually succeeded - kept separate from
    // "the referral happened" so a flaky SMTP config never hides the
    // referral record itself.
    emailStatus: {
      type: String,
      enum: ["sent", "failed", "skipped"],
      default: "skipped"
    },
    emailError: { type: String, default: "" },
    // Frozen copy of the patient + analysis exactly as they were when the PHC
    // clicked "Send". The doctor's portal reads THIS, never the live
    // Patient/AnalysisResult docs, so re-analysing or editing a patient on
    // the PHC side does not leak into the doctor's view until the PHC
    // sends the updated report again (which creates a new snapshot).
    patientSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    analysisSnapshot: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

referralSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.referredAt = ret.createdAt;
    delete ret._id;
    delete ret.__v;
    // Snapshots are exposed via `patient` / `analysis` in the doctor inbox,
    // not as raw fields (and the PHC history page doesn't need them).
    delete ret.patientSnapshot;
    delete ret.analysisSnapshot;
    return ret;
  }
});

module.exports = mongoose.model("Referral", referralSchema);