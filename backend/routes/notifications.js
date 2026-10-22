const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/:userId", async (req, res) => {
  try {
    const rows = await pool.query(
      `SELECT NOTIFICATION_ID, TITLE, MESSAGE, NOTIFICATION_TYPE, RESOURCE_PATH, CREATED_AT, READ_AT
       FROM IN_APP_NOTIFICATIONS WHERE USER_ID = ?
       ORDER BY CREATED_AT DESC LIMIT 100`,
      [req.auth.userId],
    );
    return res.json(rows);
  } catch (error) {
    console.error("Notification list error:", error);
    return res.status(500).json({ message: "Unable to load notifications." });
  }
});

router.patch("/:userId/:notificationId/read", async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE IN_APP_NOTIFICATIONS SET READ_AT = CURRENT_TIMESTAMP WHERE NOTIFICATION_ID = ? AND USER_ID = ? AND READ_AT IS NULL",
      [req.params.notificationId, req.auth.userId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Unread notification not found." });
    return res.json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("Notification update error:", error);
    return res.status(500).json({ message: "Unable to update notification." });
  }
});

router.patch("/:userId/read-all", async (req, res) => {
  try {
    await pool.query("UPDATE IN_APP_NOTIFICATIONS SET READ_AT = CURRENT_TIMESTAMP WHERE USER_ID = ? AND READ_AT IS NULL", [req.auth.userId]);
    return res.json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Notification read-all error:", error);
    return res.status(500).json({ message: "Unable to update notifications." });
  }
});

module.exports = router;