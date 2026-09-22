const express = require("express");
const requireAuth = require("../middlewares/auth");
const requireRole = require("../middlewares/requireRole");
const authRoutes = require("./authRoutes");
const patientRoutes = require("./patientRoutes");
const analysisRoutes = require("./analysisRoutes");
const specialistRoutes = require("./specialistRoutes");
const referralRoutes = require("./referralRoutes");
const discussionRoutes = require("./discussionRoutes");
const publicAnalysisRoutes = require("./publicAnalysisRoutes");

const router = express.Router();

router.get("/health", (req, res) => res.json({ status: "ok" }));

// Public
router.use("/auth", authRoutes);

// PHC-only: the whole point of the doctor role is that it can NOT browse
// the general patient database, run analyses, or see the specialist
// directory - a doctor's only view into patient data is their own referral
// inbox (see referralRoutes, gated per-route instead).
router.use("/patients", requireAuth, requireRole("phc"), patientRoutes);
router.use("/analysis", requireAuth, requireRole("phc"), analysisRoutes);
router.use("/specialists", requireAuth, requireRole("phc"), specialistRoutes);

// Mixed: /api/referrals/mine is doctor-only, /api/referrals is phc-only -
// see the role checks inside referralRoutes.js itself.
router.use("/referrals", requireAuth, referralRoutes);

// Doctor-only: inter-doctor consultation threads about a specific
// referred patient (see discussionRoutes.js / discussionController.js).
router.use("/discussions", requireAuth, discussionRoutes);

router.use("/analyze", publicAnalysisRoutes);

module.exports = router;