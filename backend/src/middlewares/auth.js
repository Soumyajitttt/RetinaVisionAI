const jwt = require("jsonwebtoken");
const config = require("../config/env");
const User = require("../models/User");

// Verifies "Authorization: Bearer <token>" and attaches
// req.user = { id, name, role }.
//
// IMPORTANT: role is re-fetched from the database on every request rather
// than trusted from the JWT payload. A token only ever proves WHO you are
// (the clinicianId in `sub`) - it should never be the source of truth for
// WHAT you're allowed to do right now. Baking role into the token meant a
// token minted before this account's role was last changed (or minted
// before the role field existed at all) would keep granting the OLD role
// forever, until someone thought to log out - which is exactly the bug
// this replaced. Looking it up fresh costs one indexed query per request,
// which is trivial at this app's scale, and makes role changes (or fixing
// a bad account in the DB) take effect on the very next request with zero
// re-login required.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const user = await User.findOne({ clinicianId: payload.sub });
    if (!user) {
      return res.status(401).json({ error: "Account no longer exists" });
    }
    req.user = { id: user.clinicianId, name: user.name, role: user.role };
    next();
  } catch (err) {
    return res.status(500).json({ error: "Authentication check failed" });
  }
}

module.exports = requireAuth;