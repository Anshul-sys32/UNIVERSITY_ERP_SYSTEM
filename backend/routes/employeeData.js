const express = require("express");
const pool = require("../db");

const router = express.Router();
const onlyRoles = (roles) => (req, res, next) => {
  if (!roles.includes(req.erpRole)) {
    return res.status(403).json({ message: "This role does not have access to this operation." });
  }
  return next();
};

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
const placementRoles = ["EMPLOYEE", "ADMIN"];
const requirePlacementRole = (req, res, next) => {
  if (!placementRoles.includes(req.erpRole)) {
    return res.status(403).json({ message: "Placement access is restricted to placement staff and administrators." });
  }
  next();
};

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

router.get("/:userId/users", onlyRoles(["ADMIN"]), async (_req, res) => {
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

router.patch("/:userId/users/:targetUserId/status", onlyRoles(["ADMIN"]), async (req, res) => {
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

router.get("/:userId/feedback", onlyRoles(["ADMIN", "EMPLOYEE"]), async (_req, res) => {
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

router.get("/:userId/announcements", onlyRoles(["ADMIN", "EMPLOYEE"]), async (_req, res) => {
  try {
    res.json(await pool.query(
      `SELECT A.ANNOUNCEMENT_ID, A.TITLE, A.MESSAGE, A.AUDIENCE, A.IS_ACTIVE, A.CREATED_AT,
        U.USERNAME AS PUBLISHED_BY_NAME
       FROM ANNOUNCEMENTS A LEFT JOIN USERS U ON U.USER_ID = A.PUBLISHED_BY
       ORDER BY A.CREATED_AT DESC LIMIT 50`,
    ));
  } catch (error) {
    console.error("Employee announcements error:", error);
    res.status(500).json({ message: "Unable to load announcements." });
  }
});

router.post("/:userId/announcements", onlyRoles(["ADMIN", "EMPLOYEE"]), async (req, res) => {
  try {
    const { title, message, audience = "ALL" } = req.body;
    if (!title?.trim() || !message?.trim() || !["ALL", "STUDENT", "FACULTY", "EMPLOYEE"].includes(audience)) {
      return res.status(400).json({ message: "Title, message, and a valid audience are required." });
    }
    const result = await pool.query(
      "INSERT INTO ANNOUNCEMENTS (TITLE, MESSAGE, AUDIENCE, PUBLISHED_BY) VALUES (?, ?, ?, ?)",
      [title.trim(), message.trim(), audience, req.params.userId],
    );
    res.status(201).json({ id: Number(result.insertId), message: "Announcement published." });
  } catch (error) {
    console.error("Create announcement error:", error);
    res.status(500).json({ message: "Unable to publish announcement." });
  }
});

router.patch("/:userId/announcements/:announcementId/status", onlyRoles(["ADMIN", "EMPLOYEE"]), async (req, res) => {
  try {
    const isActive = req.body.isActive;
    if (typeof isActive !== "boolean") return res.status(400).json({ message: "isActive must be a boolean." });
    const result = await pool.query(
      "UPDATE ANNOUNCEMENTS SET IS_ACTIVE = ? WHERE ANNOUNCEMENT_ID = ?",
      [isActive ? 1 : 0, req.params.announcementId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Announcement not found." });
    res.json({ message: `Announcement ${isActive ? "published" : "archived"}.` });
  } catch (error) {
    console.error("Announcement status error:", error);
    res.status(500).json({ message: "Unable to update announcement." });
  }
});

router.patch("/:userId/feedback/:feedbackId/status", onlyRoles(["ADMIN", "EMPLOYEE"]), async (req, res) => {
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

router.get("/:userId/placements", requirePlacementRole, async (_req, res) => {
  try {
    const drives = await pool.query(
      `SELECT D.*, COUNT(A.APPLICATION_ID) AS APPLICATION_COUNT
       FROM PLACEMENT_DRIVES D
       LEFT JOIN PLACEMENT_APPLICATIONS A ON A.DRIVE_ID = D.DRIVE_ID
       GROUP BY D.DRIVE_ID
       ORDER BY D.DRIVE_DATE DESC, D.CREATED_AT DESC`,
    );
    res.json(drives);
  } catch (error) {
    console.error("Placement drives error:", error);
    res.status(500).json({ message: "Unable to load placement drives." });
  }
});

router.post("/:userId/placements", requirePlacementRole, async (req, res) => {
  try {
    const {
      companyName, roleTitle, eligibility = "", driveDate, applicationDeadline,
      location = "", package: salaryPackage = "", description = "",
    } = req.body;
    if (!companyName?.trim() || !roleTitle?.trim() || !driveDate || !applicationDeadline) {
      return res.status(400).json({ message: "Company, role, drive date, and application deadline are required." });
    }
    const result = await pool.query(
      `INSERT INTO PLACEMENT_DRIVES
        (COMPANY_NAME, ROLE_TITLE, ELIGIBILITY, DRIVE_DATE, APPLICATION_DEADLINE,
         LOCATION, PACKAGE, DESCRIPTION, CREATED_BY)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyName.trim(), roleTitle.trim(), eligibility.trim(), driveDate,
        applicationDeadline, location.trim(), salaryPackage.trim(), description.trim(),
        req.params.userId,
      ],
    );
    res.status(201).json({ id: Number(result.insertId), message: "Placement drive created." });
  } catch (error) {
    console.error("Create placement drive error:", error);
    res.status(500).json({ message: "Unable to create placement drive." });
  }
});

router.patch("/:userId/placements/:driveId/status", requirePlacementRole, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["OPEN", "CLOSED", "COMPLETED"].includes(status)) {
      return res.status(400).json({ message: "Invalid placement status." });
    }
    const result = await pool.query(
      "UPDATE PLACEMENT_DRIVES SET STATUS = ? WHERE DRIVE_ID = ?",
      [status, req.params.driveId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Placement drive not found." });
    res.json({ message: "Placement drive status updated." });
  } catch (error) {
    console.error("Placement status error:", error);
    res.status(500).json({ message: "Unable to update placement status." });
  }
});

router.get("/:userId/placements/applications", requirePlacementRole, async (_req, res) => {
  try {
    const applications = await pool.query(
      `SELECT A.APPLICATION_ID, A.DRIVE_ID, A.STATUS, A.APPLIED_AT,
        D.COMPANY_NAME, D.ROLE_TITLE, S.STUDENT_ID, S.FIRST_NAME, S.LAST_NAME, S.ROLL_NUMBER
       FROM PLACEMENT_APPLICATIONS A
       JOIN PLACEMENT_DRIVES D ON D.DRIVE_ID = A.DRIVE_ID
       JOIN STUDENTS S ON S.STUDENT_ID = A.STUDENT_ID
       ORDER BY A.APPLIED_AT DESC`,
    );
    res.json(applications);
  } catch (error) {
    console.error("Placement applications error:", error);
    res.status(500).json({ message: "Unable to load placement applications." });
  }
});

router.patch("/:userId/placements/applications/:applicationId/status", requirePlacementRole, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["APPLIED", "SHORTLISTED", "SELECTED", "REJECTED", "WITHDRAWN"].includes(status)) {
      return res.status(400).json({ message: "Invalid application status." });
    }
    const result = await pool.query(
      "UPDATE PLACEMENT_APPLICATIONS SET STATUS = ? WHERE APPLICATION_ID = ?",
      [status, req.params.applicationId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Application not found." });
    res.json({ message: "Application status updated." });
  } catch (error) {
    console.error("Placement application status error:", error);
    res.status(500).json({ message: "Unable to update application status." });
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
