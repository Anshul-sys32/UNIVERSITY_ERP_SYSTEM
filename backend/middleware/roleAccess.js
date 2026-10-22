const pool = require("../db");

const roleAccess = (roles, { matchPathUserId = false, database = pool, module } = {}) => async (req, res, next) => {
  const userId = Number(req.session?.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  if (matchPathUserId) {
    const pathUserId = String(req.path).split("/").filter(Boolean)[0];
    if (!/^\d+$/.test(pathUserId) || Number(pathUserId) !== userId) {
      return res.status(403).json({ message: "The requested account does not match the signed-in user." });
    }
  }

  try {
    const users = await database.query(
      "SELECT USER_ID, USERNAME, ROLE FROM USERS WHERE USER_ID = ? AND IS_ACTIVE = 1",
      [userId],
    );
    if (!users[0]) {
      return req.session.destroy(() => {
        res.clearCookie("erp.sid", { path: "/" });
        res.status(401).json({ message: "The signed-in account is inactive or unavailable." });
      });
    }
    if (!roles.includes(users[0].ROLE)) {
      return res.status(403).json({ message: "This account is not authorized for this module." });
    }
    const moduleKey = typeof module === "function" ? module(req) : module;
    let policy = null;
    if (moduleKey) {
      const actionColumn = ["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase()) ? "CAN_READ" : "CAN_WRITE";
      const policies = await database.query(
        `SELECT CAN_READ, CAN_WRITE, ROW_SCOPE, SIDEBAR_VISIBLE
         FROM ROLE_MODULE_POLICIES WHERE ROLE_NAME = ? AND MODULE_KEY = ?`,
        [users[0].ROLE, moduleKey],
      );
      policy = policies[0];
      if (!policy || !Number(policy[actionColumn])) {
        return res.status(403).json({ message: "This role does not have permission for this module action." });
      }
    }
    req.auth = {
      userId: Number(users[0].USER_ID),
      username: users[0].USERNAME,
      role: users[0].ROLE,
      module: moduleKey || null,
      rowScope: policy?.ROW_SCOPE || null,
    };
    req.erpRole = users[0].ROLE;
    return next();
  } catch (error) {
    console.error("Role authorization error:", error);
    res.status(500).json({ message: "Unable to verify account permissions." });
  }
};

module.exports = roleAccess;
