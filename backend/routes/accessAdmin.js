const express = require("express");
const pool = require("../db");

const router = express.Router();
const roles = ["STUDENT", "FACULTY", "EMPLOYEE", "LIBRARIAN", "ACCOUNTANT", "MERCHANT"];
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
  ["campus_student", "Hostel and research", ["self"]],
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
  ["campus_admin", "Campus administration", ["university"]],
  ["reports", "Aggregate reports", ["university"]],
  ["notifications", "Notifications", ["self", "university"]],
  ["merchant_data", "Merchant workspace", ["self"]],
];
const scopesByModule = new Map(modules.map(([key, , scopes]) => [key, scopes]));

router.get("/policies", async (_req, res) => {
  try {
    const rows = await pool.query(
      "SELECT ROLE_NAME, MODULE_KEY, CAN_READ, CAN_WRITE, ROW_SCOPE, SIDEBAR_VISIBLE, UPDATED_AT FROM ROLE_MODULE_POLICIES ORDER BY ROLE_NAME, MODULE_KEY",
    );
    return res.json({ roles, modules: modules.map(([key, label, scopes]) => ({ key, label, scopes })), policies: rows });
  } catch (error) {
    console.error("Role policy list error:", error);
    return res.status(500).json({ message: "Unable to load access policies. Apply migration 007 first." });
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
  if (typeof canRead !== "boolean" || typeof canWrite !== "boolean" || typeof sidebarVisible !== "boolean"
    || (canWrite && !canRead) || !scopesByModule.get(moduleKey).includes(rowScope)) {
    return res.status(400).json({ message: "Invalid permission flags or unsupported data scope for this module." });
  }
  if (moduleKey === "access_admin") return res.status(403).json({ message: "Access administration remains restricted to administrators." });

  try {
    await pool.query(
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

module.exports = router;