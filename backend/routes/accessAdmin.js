const express = require("express");
const pool = require("../db");

const createAccessAdminRouter = (database = pool) => {
const router = express.Router();
const roles = ["STUDENT", "FACULTY", "EMPLOYEE", "LIBRARIAN", "ACCOUNTANT", "MERCHANT"];
const userAssignableModules = {
  STUDENT: ["student_data", "student_profile", "student_academics", "student_finance", "student_library", "student_placements", "student_exams", "student_support", "announcements", "campus_hostel", "campus_research", "wallet_data", "notifications"],
  FACULTY: ["faculty_data", "faculty_academics", "faculty_questions", "faculty_rewards", "announcements", "notifications"],
  EMPLOYEE: ["employee_data", "dashboard_configuration", "announcements", "employee_feedback", "operations_placements", "notifications"],
  LIBRARIAN: ["employee_data", "dashboard_configuration", "operations_library", "notifications"],
  ACCOUNTANT: ["employee_data", "dashboard_configuration", "operations_accounting", "notifications"],
  MERCHANT: ["merchant_data", "notifications"],
};
const modules = [
  ["admin_home", "Administrator dashboard", ["university"]],
  ["access_admin", "Role access control", ["university"]],
  ["students", "Student records", ["university"]],
  ["student_data", "Student portal legacy endpoints", ["self"]],
  ["student_profile", "Student profile and dashboard", ["self"]],
  ["student_academics", "Student academics", ["self"]],
  ["student_finance", "Student fees", ["self"]],
  ["student_library", "Student library", ["self"]],
  ["student_placements", "Student placements", ["self"]],
  ["student_exams", "Student exams and results", ["self"]],
  ["student_support", "Student support", ["self"]],
  ["employee_feedback", "Employee feedback review", ["university"]],
  ["announcements", "Announcements", ["self", "university"]],
  ["campus_hostel", "Hostel services", ["self", "university"]],
  ["campus_research", "Research and development", ["self", "university"]],
  ["campus_admin_hostel", "Hostel administration", ["university"]],
  ["campus_admin_research", "Research administration", ["university"]],
  ["wallet_data", "Student wallet", ["self"]],
  ["faculty_data", "Faculty provisioning", ["university"]],
  ["faculty_academics", "Faculty courses and attendance", ["assigned_course"]],
  ["faculty_questions", "Faculty question bank", ["assigned_course"]],
  ["faculty_rewards", "Faculty reward requests", ["assigned_course"]],
  ["employee_data", "Employee operations", ["university"]],
  ["user_admin", "User administration", ["university"]],
  ["dashboard_configuration", "Dashboard configuration", ["self"]],
  ["operations_accounting", "Accounting records", ["university"]],
  ["operations_library", "Library operations", ["university"]],
  ["operations_placements", "Placement operations", ["university"]],
  ["academic_data", "Academic setup", ["university"]],
  ["exam_admin", "Exam administration", ["university"]],
  ["wallet_admin", "Wallet administration", ["university"]],
  ["reports", "Aggregate reports", ["university"]],
  ["notifications", "Notifications", ["self", "university"]],
  ["merchant_data", "Merchant workspace", ["self"]],
];
const scopesByModule = new Map(modules.map(([key, , scopes]) => [key, scopes]));

router.get("/policies", async (_req, res) => {
  try {
    const [rows, users, userPolicies] = await Promise.all([database.query(
      "SELECT ROLE_NAME, MODULE_KEY, CAN_READ, CAN_WRITE, ROW_SCOPE, SIDEBAR_VISIBLE, UPDATED_AT FROM ROLE_MODULE_POLICIES ORDER BY ROLE_NAME, MODULE_KEY",
    ), database.query(
      "SELECT USER_ID, USERNAME, ROLE FROM USERS WHERE IS_ACTIVE = 1 AND ROLE <> 'ADMIN' ORDER BY ROLE, USERNAME",
    ), database.query(
      "SELECT USER_ID, MODULE_KEY, CAN_READ, CAN_WRITE, ROW_SCOPE, SIDEBAR_VISIBLE, UPDATED_AT FROM USER_MODULE_POLICIES ORDER BY USER_ID, MODULE_KEY",
    )]);
    return res.json({
      roles,
      modules: modules.map(([key, label, scopes]) => ({
        key,
        label,
        scopes,
        roles: roles.filter((role) => userAssignableModules[role]?.includes(key)),
      })),
      policies: rows,
      users,
      userPolicies,
    });
  } catch (error) {
    console.error("Role policy list error:", error);
    return res.status(500).json({ message: "Unable to load access policies. Apply migrations 007 and 008 first." });
  }
});

router.put("/policies/users/:userId/:module", async (req, res) => {
  const userId = Number(req.params.userId);
  const moduleKey = req.params.module;
  const { canRead, canWrite, rowScope, sidebarVisible } = req.body || {};
  if (!Number.isSafeInteger(userId) || userId < 1 || !scopesByModule.has(moduleKey)) {
    return res.status(400).json({ message: "Unknown user or module." });
  }
  if (typeof canRead !== "boolean" || typeof canWrite !== "boolean" || typeof sidebarVisible !== "boolean"
    || (canWrite && !canRead) || !scopesByModule.get(moduleKey).includes(rowScope)) {
    return res.status(400).json({ message: "Invalid permission flags or unsupported data scope for this module." });
  }
  if (moduleKey === "access_admin") return res.status(403).json({ message: "Access administration remains restricted to administrators." });
  try {
    const users = await database.query("SELECT USER_ID, ROLE FROM USERS WHERE USER_ID = ? AND IS_ACTIVE = 1 AND ROLE <> 'ADMIN'", [userId]);
    if (!users.length) return res.status(404).json({ message: "Active non-administrator user not found." });
    if (!userAssignableModules[users[0].ROLE]?.includes(moduleKey)) {
      return res.status(403).json({ message: "This module is not assignable to the selected user's role." });
    }
    await database.query(
      `INSERT INTO USER_MODULE_POLICIES
        (USER_ID, MODULE_KEY, CAN_READ, CAN_WRITE, ROW_SCOPE, SIDEBAR_VISIBLE, UPDATED_BY)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE CAN_READ = VALUES(CAN_READ), CAN_WRITE = VALUES(CAN_WRITE),
         ROW_SCOPE = VALUES(ROW_SCOPE), SIDEBAR_VISIBLE = VALUES(SIDEBAR_VISIBLE), UPDATED_BY = VALUES(UPDATED_BY)`,
      [userId, moduleKey, canRead ? 1 : 0, canWrite ? 1 : 0, rowScope, sidebarVisible ? 1 : 0, req.auth.userId],
    );
    return res.json({ message: "Individual user access override saved." });
  } catch (error) {
    console.error("User access override error:", error);
    return res.status(500).json({ message: "Unable to save individual user access." });
  }
});

router.delete("/policies/users/:userId/:module", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isSafeInteger(userId) || userId < 1 || !scopesByModule.has(req.params.module)) {
    return res.status(400).json({ message: "Unknown user or module." });
  }
  try {
    await database.query("DELETE FROM USER_MODULE_POLICIES WHERE USER_ID = ? AND MODULE_KEY = ?", [userId, req.params.module]);
    return res.json({ message: "Individual override removed; the role policy now applies." });
  } catch (error) {
    console.error("User access override reset error:", error);
    return res.status(500).json({ message: "Unable to reset individual user access." });
  }
});

router.put("/policies/:role/:module", async (req, res) => {
  const role = String(req.params.role).toUpperCase();
  const moduleKey = req.params.module;
  const { canRead, canWrite, rowScope, sidebarVisible } = req.body || {};
  if (role === "ADMIN") return res.status(403).json({ message: "The administrator control role cannot be edited here." });
  if (!roles.includes(role) || !scopesByModule.has(moduleKey)) {
    return res.status(400).json({ message: "Unknown role or module." });
  }
  if (!userAssignableModules[role].includes(moduleKey)) {
    return res.status(403).json({ message: "This module is not assignable to the selected role." });
  }
  if (typeof canRead !== "boolean" || typeof canWrite !== "boolean" || typeof sidebarVisible !== "boolean"
    || (canWrite && !canRead) || !scopesByModule.get(moduleKey).includes(rowScope)) {
    return res.status(400).json({ message: "Invalid permission flags or unsupported data scope for this module." });
  }
  if (moduleKey === "access_admin") return res.status(403).json({ message: "Access administration remains restricted to administrators." });

  try {
    await database.query(
      `INSERT INTO ROLE_MODULE_POLICIES
        (ROLE_NAME, MODULE_KEY, CAN_READ, CAN_WRITE, ROW_SCOPE, SIDEBAR_VISIBLE, UPDATED_BY)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE CAN_READ = VALUES(CAN_READ), CAN_WRITE = VALUES(CAN_WRITE),
         ROW_SCOPE = VALUES(ROW_SCOPE), SIDEBAR_VISIBLE = VALUES(SIDEBAR_VISIBLE), UPDATED_BY = VALUES(UPDATED_BY)`,
      [role, moduleKey, canRead ? 1 : 0, canWrite ? 1 : 0, rowScope, sidebarVisible ? 1 : 0, req.auth.userId],
    );
    return res.json({ message: "Role access policy saved." });
  } catch (error) {
    console.error("Role policy update error:", error);
    return res.status(500).json({ message: "Unable to save access policy." });
  }
});

return router;
};

module.exports = createAccessAdminRouter;