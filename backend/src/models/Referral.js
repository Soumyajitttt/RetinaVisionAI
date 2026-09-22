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
    emailError: { type: String, default: "" }
  },
  { timestamps: true }
);

referralSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.referredAt = ret.createdAt;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Referral", referralSchema);