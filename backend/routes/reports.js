const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/:userId/overview", async (_req, res) => {
  try {
    const [students, faculty, courses, fees, placements, notifications] = await Promise.all([
      pool.query("SELECT COUNT(*) AS TOTAL FROM STUDENTS WHERE STATUS = 'ACTIVE'"),
      pool.query("SELECT COUNT(*) AS TOTAL FROM FACULTY WHERE STATUS = 'ACTIVE'"),
      pool.query("SELECT COUNT(*) AS TOTAL FROM COURSES WHERE IS_ACTIVE = 1"),
      pool.query(`SELECT COALESCE(SUM(AMOUNT), 0) AS BILLED,
        COALESCE(SUM(CASE WHEN STATUS IN ('UNPAID', 'PENDING') THEN AMOUNT ELSE 0 END), 0) AS OUTSTANDING
        FROM ACCOUNTING_LEDGER`),
      pool.query(`SELECT COUNT(*) AS OPEN_DRIVES FROM PLACEMENT_DRIVES
        WHERE STATUS = 'OPEN' AND APPLICATION_DEADLINE >= CURRENT_DATE`),
      pool.query(`SELECT COUNT(*) AS UNREAD FROM IN_APP_NOTIFICATIONS WHERE READ_AT IS NULL`),
    ]);
    return res.json({
      students: Number(students[0]?.TOTAL || 0),
      faculty: Number(faculty[0]?.TOTAL || 0),
      courses: Number(courses[0]?.TOTAL || 0),
      fees: { billed: fees[0]?.BILLED || "0.00", outstanding: fees[0]?.OUTSTANDING || "0.00" },
      openPlacementDrives: Number(placements[0]?.OPEN_DRIVES || 0),
      unreadNotifications: Number(notifications[0]?.UNREAD || 0),
    });
  } catch (error) {
    console.error("Leadership overview report error:", error);
    return res.status(500).json({ message: "Unable to load aggregate overview." });
  }
});

module.exports = router;