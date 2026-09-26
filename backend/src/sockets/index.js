const jwt = require("jsonwebtoken");
const config = require("../config/env");
const User = require("../models/User");
const Discussion = require("../models/Discussion");

// Same participant check discussionController.js uses - kept in sync here
// since a socket handshake bypasses the Express route/requireRole chain
// entirely, so it must be re-verified independently before letting a
// socket into a discussion's room.
function isParticipant(discussion, doctorId) {
  return discussion.startedBy === doctorId || discussion.invitedDoctorId === doctorId;
}

// One Socket.IO room per discussion thread, keyed by the same id the
// frontend already uses (discussion._id.toString(), i.e. discussion.id in
// the API's JSON). discussionController.addComment broadcasts into this
// same room after saving, so REST stays the single source of truth for
// writes and the socket layer is purely a broadcast/presence layer.
function discussionRoom(discussionId) {
  return `discussion:${discussionId}`;
}

function initSockets(io) {
  // Every socket must present the same JWT the REST API uses, passed in
  // the handshake as `auth: { token }` (never a query string, so it never
  // ends up logged or cached). Mirrors middlewares/auth.js: role/name are
  // re-read from the DB on connect rather than trusted from the token
  // payload.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Missing auth token"));

      const payload = jwt.verify(token, config.jwt.secret);
      const user = await User.findOne({ clinicianId: payload.sub });
      if (!user) return next(new Error("Account no longer exists"));

      socket.user = { id: user.clinicianId, name: user.name, role: user.role };
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("discussion:join", async (discussionId, ack) => {
      try {
        const discussion = await Discussion.findById(discussionId);
        if (!discussion || !isParticipant(discussion, socket.user.id)) {
          return ack?.({ error: "Discussion not found" });
        }
        socket.join(discussionRoom(discussionId));
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: "Could not join discussion" });
      }
    });

    socket.on("discussion:leave", (discussionId) => {
      socket.leave(discussionRoom(discussionId));
    });

    // Lightweight "X is typing..." indicator - never persisted, just
    // relayed live to whoever else is currently in the room.
    socket.on("discussion:typing", ({ discussionId, isTyping }) => {
      if (!discussionId) return;
      socket.to(discussionRoom(discussionId)).emit("discussion:typing", {
        authorId: socket.user.id,
        authorName: socket.user.name,
        isTyping: Boolean(isTyping)
      });
    });
  });
}

module.exports = { initSockets, discussionRoom };