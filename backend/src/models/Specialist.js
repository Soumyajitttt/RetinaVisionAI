const mongoose = require("mongoose");

const specialistSchema = new mongoose.Schema(
  {
    specialistId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    facility: { type: String, required: true },
    // Legacy static fallback distance (km), used only when this specialist
    // has no real `location` yet (i.e. the 3 seeded demo doctors) or when
    // the requesting PHC didn't share their browser location. Once a real
    // `location` exists, getSpecialists() computes a live distance instead
    // and this field is ignored.
    distanceKm: { type: Number, default: 0 },
    // Recipient for referral emails (see src/utils/mailer.js). Falls back to
    // config.email.demoOverride when a specialist has no real inbox yet.
    email: { type: String, trim: true, lowercase: true, default: "" },
    // Set for doctors who self-registered (role: "doctor" on User) via
    // POST /api/auth/register - captured through the browser Geolocation
    // API or entered manually on the registration form. Absent for the
    // legacy seeded demo specialists.
    location: {
      lat: { type: Number },
      lng: { type: Number }
    },
    // Human-readable place name (e.g. "Rampur, Uttar Pradesh, India"),
    // resolved client-side via reverse/forward geocoding at registration
    // (see frontend/src/utils/geolocation.js). Shown on the Specialists
    // page instead of raw coordinates; `location` above stays the source
    // of truth for the haversine distance sort.
    locationLabel: { type: String, trim: true, default: "" },
    // Links back to the doctor's own account, so their login can query
    // "referrals sent to me" via specialistId === user.clinicianId without
    // needing this field - kept mainly for traceability/debugging.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

specialistSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret.specialistId;
    delete ret._id;
    delete ret.specialistId;
    delete ret.userId;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Specialist", specialistSchema);