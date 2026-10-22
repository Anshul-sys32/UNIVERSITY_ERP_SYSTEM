const { timingSafeEqual } = require("node:crypto");

const csrfProtection = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const expected = req.session?.csrfToken;
  const provided = req.get("x-csrf-token");
  if (!expected || !provided) {
    return res.status(403).json({ message: "A valid CSRF token is required." });
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    return res.status(403).json({ message: "A valid CSRF token is required." });
  }

  return next();
};

module.exports = csrfProtection;