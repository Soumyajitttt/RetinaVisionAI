const express = require("express");
const { getReferralHistory, getMyReferrals } = require("../controllers/referralController");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

// Order matters: "/mine" must be declared before "/" wouldn't actually
// conflict here (different paths), but kept first for readability since
// it's the doctor-facing entry point.
router.get("/mine", requireRole("doctor"), getMyReferrals);
router.get("/", requireRole("phc"), getReferralHistory);

module.exports = router;