// Usage: router.use(requireAuth, requireRole("phc"))
// Must run after requireAuth (needs req.user.role, set from the JWT payload).
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Your account role cannot access this resource" });
    }
    next();
  };
}

module.exports = requireRole;