const express = require("express");
const pool = require("../db");

const router = express.Router();

const defaults = {
  student: {
    background: "linear-gradient(300deg,rgba(67,10,199,0.96),rgba(255,35,15,0.95))",
    sidebarItems: [{ label: "Dashboard", path: "/erp/student" }],
  },
  faculty: {
    background: "linear-gradient(315deg,#0a30c7,#ff0f0f)",
    sidebarItems: [{ label: "Dashboard", path: "/erp/faculty" }],
  },
  staff: {
    background: "linear-gradient(315deg,#0a30c7,#ff0f0f)",
    sidebarItems: [{ label: "Dashboard", path: "/erp/employee" }],
  },
};

const validType = (type) => ["student", "faculty", "staff"].includes(type);

router.get("/:userId/summary", async (_req, res) => {
  try {
    const [users, students, faculty, feedback] = await Promise.all([
      pool.query("SELECT COUNT(*) AS TOTAL FROM USERS WHERE IS_ACTIVE = 1"),
      pool.query("SELECT COUNT(*) AS TOTAL FROM STUDENTS WHERE STATUS = 'ACTIVE'"),
      pool.query("SELECT COUNT(*) AS TOTAL FROM FACULTY WHERE STATUS = 'ACTIVE'"),
      pool.query("SELECT COUNT(*) AS TOTAL FROM FEEDBACK WHERE STATUS != 'RESOLVED'"),
    ]);
    res.json({
      users: users[0]?.TOTAL || 0,
      students: students[0]?.TOTAL || 0,
      faculty: faculty[0]?.TOTAL || 0,
      openFeedback: feedback[0]?.TOTAL || 0,
    });
  } catch (error) {
    console.error("Employee summary error:", error);
    res.status(500).json({ message: "Unable to load employee summary." });
  }
});

router.get("/:userId/users", async (_req, res) => {
  try {
    const rows = await pool.query(
      "SELECT USER_ID, USERNAME, ROLE, IS_ACTIVE, CREATED_AT FROM USERS ORDER BY CREATED_AT DESC",
    );
    res.json(rows);
  } catch (error) {
    console.error("Employee users error:", error);
    res.status(500).json({ message: "Unable to load users." });
  }
});

router.patch("/:userId/users/:targetUserId/status", async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean." });
    }
    const result = await pool.query(
      "UPDATE USERS SET IS_ACTIVE = ? WHERE USER_ID = ?",
      [isActive ? 1 : 0, req.params.targetUserId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "User not found." });
    res.json({ message: `User ${isActive ? "activated" : "deactivated"}.` });
  } catch (error) {
    console.error("Employee user status error:", error);
    res.status(500).json({ message: "Unable to update user status." });
  }
});

router.get("/:userId/feedback", async (_req, res) => {
  try {
    const rows = await pool.query(
      `SELECT F.FEEDBACK_ID, F.SUBJECT, F.MESSAGE, F.STATUS, F.CREATED_AT,
        S.FIRST_NAME, S.LAST_NAME, S.ROLL_NUMBER
       FROM FEEDBACK F
       JOIN STUDENTS S ON S.STUDENT_ID = F.STUDENT_ID
       ORDER BY F.CREATED_AT DESC`,
    );
    res.json(rows);
  } catch (error) {
    console.error("Employee feedback error:", error);
    res.status(500).json({ message: "Unable to load feedback." });
  }
});

router.patch("/:userId/feedback/:feedbackId/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["OPEN", "IN_REVIEW", "RESOLVED"].includes(status)) {
      return res.status(400).json({ message: "Invalid feedback status." });
    }
    const result = await pool.query(
      "UPDATE FEEDBACK SET STATUS = ? WHERE FEEDBACK_ID = ?",
      [status, req.params.feedbackId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Feedback not found." });
    res.json({ message: "Feedback status updated." });
  } catch (error) {
    console.error("Employee feedback status error:", error);
    res.status(500).json({ message: "Unable to update feedback status." });
  }
});

router.get("/:userId/config/:type", async (req, res) => {
  try {
    if (!validType(req.params.type)) return res.status(400).json({ message: "Invalid dashboard type." });
    const rows = await pool.query(
      "SELECT BACKGROUND, SIDEBAR_ITEMS_JSON FROM EMPLOYEE_DASHBOARD_CONFIG WHERE USER_ID = ? AND DASHBOARD_TYPE = ?",
      [req.params.userId, req.params.type.toUpperCase()],
    );
    const fallback = defaults[req.params.type];
    if (!rows[0]) return res.json(fallback);
    res.json({
      background: rows[0].BACKGROUND,
      sidebarItems: JSON.parse(rows[0].SIDEBAR_ITEMS_JSON),
    });
  } catch (error) {
    console.error("Employee config error:", error);
    res.status(500).json({ message: "Unable to load dashboard configuration." });
  }
});

router.put("/:userId/config/:type", async (req, res) => {
  try {
    if (!validType(req.params.type)) return res.status(400).json({ message: "Invalid dashboard type." });
    const { background, sidebarItems } = req.body;
    if (typeof background !== "string" || !Array.isArray(sidebarItems)) {
      return res.status(400).json({ message: "Background and sidebar items are required." });
    }
    await pool.query(
      `INSERT INTO EMPLOYEE_DASHBOARD_CONFIG
        (USER_ID, DASHBOARD_TYPE, BACKGROUND, SIDEBAR_ITEMS_JSON)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE BACKGROUND = VALUES(BACKGROUND), SIDEBAR_ITEMS_JSON = VALUES(SIDEBAR_ITEMS_JSON)`,
      [req.params.userId, req.params.type.toUpperCase(), background.trim(), JSON.stringify(sidebarItems)],
    );
    res.json({ message: "Dashboard configuration saved." });
  } catch (error) {
    console.error("Save employee config error:", error);
    res.status(500).json({ message: "Unable to save dashboard configuration." });
  }
});

module.exports = router;
