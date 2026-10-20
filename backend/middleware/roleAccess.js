const pool = require("../db");

const roleAccess = (roles) => async (req, res, next) => {
  const pathUserId = String(req.path).split("/")[1];
  const headerUserId = req.headers["x-user-id"];
  const userId = Number(/^\d+$/.test(pathUserId) ? pathUserId : headerUserId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(401).json({ message: "A valid signed-in user is required." });
  }

  try {
    const users = await pool.query(
      "SELECT ROLE FROM USERS WHERE USER_ID = ? AND IS_ACTIVE = 1",
      [userId],
    );
    if (!users[0] || !roles.includes(users[0].ROLE)) {
      return res.status(403).json({ message: "This account is not authorized for this module." });
    }
    req.erpRole = users[0].ROLE;
    next();
  } catch (error) {
    console.error("Role authorization error:", error);
    res.status(500).json({ message: "Unable to verify account permissions." });
  }
};

module.exports = roleAccess;
