const express = require("express");
const requireRole = require("../middlewares/requireRole");
const {
  listInvitableDoctors,
  createDiscussion,
  getMyDiscussions,
  getDiscussion,
  addComment,
  markDiscussionRead
} = require("../controllers/discussionController");

const router = express.Router();

// Doctor-only, end to end - PHC clinicians have no part in these
// consultations between doctors.
router.use(requireRole("doctor"));

// Static paths declared before "/:id" so they're never swallowed by it.
router.get("/doctors", listInvitableDoctors);
router.get("/mine", getMyDiscussions);
router.post("/", createDiscussion);
router.get("/:id", getDiscussion);
router.post("/:id/comments", addComment);
router.post("/:id/read", markDiscussionRead);

module.exports = router;