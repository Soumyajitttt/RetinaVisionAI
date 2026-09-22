const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Specialist = require("../models/Specialist");
const config = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");

function issueToken(user) {
  return jwt.sign(
    { sub: user.clinicianId, name: user.name, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function publicUser(user) {
  return {
    id: user.clinicianId,
    name: user.name,
    role: user.role,
    facility: user.facility,
    specialty: user.specialty,
    location: user.location
  };
}

// POST /api/auth/register
//   PHC:    { clinicianId, name, email, password, facility? }
//   Doctor: { clinicianId, name, email, password, role: "doctor",
//             facility (hospital name), specialty?, location: { lat, lng } }
const register = asyncHandler(async (req, res) => {
  let { clinicianId, name, email, password, facility, role, specialty, location, locationLabel } = req.body;
  // Normalize so "PHC-Rampur-109" and "phc-rampur-109" can never become two
  // different accounts that shadow each other - this was a real path to
  // the "logs in as the wrong role" bug (see auth.js's comment for the
  // matching fix on the lookup side).
  clinicianId = clinicianId?.trim().toUpperCase();
  const finalRole = role === "doctor" ? "doctor" : "phc";

  if (!clinicianId || !name || !email || !password) {
    return res
      .status(400)
      .json({ error: "clinicianId, name, email and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  if (finalRole === "doctor") {
    if (!facility) {
      return res.status(400).json({ error: "Hospital/facility name is required for doctor accounts" });
    }
    const lat = Number(location?.lat);
    const lng = Number(location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res
        .status(400)
        .json({ error: "A location (latitude & longitude) is required for doctor accounts" });
    }
  }

  const existing = await User.findOne({
    $or: [{ clinicianId }, { email: email.toLowerCase() }]
  });
  if (existing) {
    return res
      .status(409)
      .json({ error: "An account with that ID or email already exists" });
  }
  if (finalRole === "doctor" && (await Specialist.findOne({ specialistId: clinicianId }))) {
    return res.status(409).json({ error: "That ID is already in use by a specialist listing - pick another" });
  }

  const user = await User.create({
    clinicianId,
    name,
    email,
    facility: facility || "",
    role: finalRole,
    specialty: finalRole === "doctor" ? specialty || "" : "",
    location: finalRole === "doctor"
      ? { lat: Number(location.lat), lng: Number(location.lng), label: locationLabel || "" }
      : undefined,
    passwordHash: await User.hashPassword(password)
  });

  // Doctors are immediately listed as a referral target on the PHC's
  // Specialists page. If this fails (e.g. a race on specialistId), roll
  // back the user account rather than leaving an orphaned doctor login
  // with no listing - there's no DB transaction here (single-node Mongo),
  // so this manual cleanup keeps the two in sync.
  if (finalRole === "doctor") {
    try {
      await Specialist.create({
        specialistId: user.clinicianId,
        name: user.name,
        role: specialty || "Doctor",
        facility: user.facility,
        email: user.email,
        location: { lat: user.location.lat, lng: user.location.lng },
        locationLabel: locationLabel || "",
        userId: user._id
      });
    } catch (err) {
      await User.deleteOne({ _id: user._id });
      return res.status(500).json({ error: "Could not create specialist listing - please try again" });
    }
  }

  const token = issueToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login  { clinicianId, password }
const login = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const clinicianId = req.body.clinicianId?.trim().toUpperCase();

  if (!clinicianId || !password) {
    return res.status(400).json({ error: "clinicianId and password are required" });
  }

  const user = await User.findOne({ clinicianId });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: "Invalid ID or password" });
  }

  const token = issueToken(user);
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me  (requires Authorization header)
const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

module.exports = { register, login, me };