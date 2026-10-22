const crypto = require("node:crypto");

const auditLog = (database) => (req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return next();

  res.once("finish", () => {
    if (!req.auth?.userId) return;
    const resource = String(req.originalUrl || req.path).split("?")[0].slice(0, 255);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 240) : null;
    database.query(
      `INSERT INTO AUDIT_EVENTS (ACTOR_USER_ID, REQUEST_ID, ACTION, RESOURCE, HTTP_STATUS, REASON)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.auth.userId, req.requestId, method, resource, res.statusCode, reason || null],
    ).catch((error) => console.error("Audit event write failed:", error));
  });
  return next();
};

module.exports = auditLog;