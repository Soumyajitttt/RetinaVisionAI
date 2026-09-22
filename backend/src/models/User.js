const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// A single account can be either:
//  - a PHC clinician (role: "phc") - the original account type, unchanged
//  - a referral doctor/specialist (role: "doctor") - registers with a
//    hospital/facility name and a location, and gets auto-listed on the
//    PHC's "Nearest Specialists" page (see authController.register, which
//    creates a linked Specialist document for every doctor signup).
// clinicianId doubles as the generic login handle for both roles.
const userSchema = new mongoose.Schema(
  {
    clinicianId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    facility: { type: String, trim: true, default: "" },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["phc", "doctor"], default: "phc", index: true },
    // Doctor-only. Free-text specialty shown on their Specialist card, e.g.
    // "Ophthalmologist", "Vitreoretinal Specialist".
    specialty: { type: String, trim: true, default: "" },
    // Doctor-only. Captured via the browser Geolocation API at registration
    // (with a manual place-search fallback) - lets the PHC's Specialists
    // page sort doctors by real distance instead of a hardcoded number.
    // `label` is a human-readable place name (e.g. "Rampur, Uttar
    // Pradesh, India") resolved client-side via reverse/forward geocoding
    // (see frontend/src/utils/geolocation.js) - shown in the UI instead of
    // raw coordinates, which are kept here only for distance math.
    location: {
      lat: { type: Number },
      lng: { type: Number },
      label: { type: String, trim: true, default: "" }
    }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
};

// Never leak the hash if a User document is ever sent to the client directly.
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("User", userSchema);