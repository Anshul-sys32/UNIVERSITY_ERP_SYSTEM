const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/:userId/sessions", async (_req, res) => {
  try {
    const sessions = await pool.query(
      `SELECT E.*, C.COURSE_CODE, C.TITLE AS COURSE_TITLE,
        COUNT(DISTINCT R.EXAM_REGISTRATION_ID) AS REGISTRATION_COUNT,
        COUNT(DISTINCT M.EXAM_MARK_ID) AS MARK_COUNT
       FROM EXAM_SESSIONS E
       JOIN COURSES C ON C.COURSE_ID = E.COURSE_ID
       LEFT JOIN EXAM_REGISTRATIONS R ON R.EXAM_SESSION_ID = E.EXAM_SESSION_ID AND R.STATUS = 'REGISTERED'
       LEFT JOIN EXAM_MARKS M ON M.EXAM_SESSION_ID = E.EXAM_SESSION_ID
       GROUP BY E.EXAM_SESSION_ID
       ORDER BY E.EXAM_DATE DESC, E.START_TIME`,
    );
    return res.json(sessions);
  } catch (error) {
    console.error("Exam session listing error:", error);
    return res.status(500).json({ message: "Unable to load exam sessions." });
  }
});

router.post("/:userId/sessions", async (req, res) => {
  const { courseId, examCode, examType, examDate, startTime, endTime, venue = "", maxScore = 100, registrationDeadline } = req.body || {};
  if (!Number.isSafeInteger(Number(courseId)) || !examCode?.trim() || !examType?.trim()
    || !/^\d{4}-\d{2}-\d{2}$/.test(examDate || "")
    || !/^\d{2}:\d{2}(:\d{2})?$/.test(startTime || "")
    || !/^\d{2}:\d{2}(:\d{2})?$/.test(endTime || "")
    || !/^\d{4}-\d{2}-\d{2}$/.test(registrationDeadline || "")
    || !Number.isFinite(Number(maxScore)) || Number(maxScore) <= 0) {
    return res.status(400).json({ message: "Course, exam details, schedule, deadline, and a positive maximum score are required." });
  }

  try {
    const courses = await pool.query("SELECT COURSE_ID FROM COURSES WHERE COURSE_ID = ? AND IS_ACTIVE = 1", [courseId]);
    if (!courses.length) return res.status(404).json({ message: "Active course not found." });
    const result = await pool.query(
      `INSERT INTO EXAM_SESSIONS
        (COURSE_ID, EXAM_CODE, EXAM_TYPE, EXAM_DATE, START_TIME, END_TIME, VENUE, MAX_SCORE, REGISTRATION_DEADLINE, STATUS, CREATED_BY)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`,
      [courseId, examCode.trim(), examType.trim(), examDate, startTime, endTime, venue.trim(), maxScore, registrationDeadline, req.auth.userId],
    );
    return res.status(201).json({ id: Number(result.insertId), message: "Exam session created as draft." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "An exam with this code already exists." });
    console.error("Exam session create error:", error);
    return res.status(500).json({ message: "Unable to create exam session." });
  }
});

router.patch("/:userId/sessions/:examSessionId/status", async (req, res) => {
  const { status } = req.body || {};
  const allowed = ["DRAFT", "OPEN", "CLOSED", "CANCELLED"];
  if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid exam session status." });
  try {
    const result = await pool.query(
      "UPDATE EXAM_SESSIONS SET STATUS = ? WHERE EXAM_SESSION_ID = ? AND STATUS != 'PUBLISHED'",
      [status, req.params.examSessionId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Editable exam session not found." });
    return res.json({ message: "Exam session status updated." });
  } catch (error) {
    console.error("Exam session status error:", error);
    return res.status(500).json({ message: "Unable to update exam session." });
  }
});

router.get("/:userId/sessions/:examSessionId/marks", async (req, res) => {
  try {
    const rows = await pool.query(
      `SELECT R.STUDENT_ID, S.ROLL_NUMBER, S.FIRST_NAME, S.LAST_NAME,
        M.EXAM_MARK_ID, M.SCORE, M.MAX_SCORE, M.STATUS
       FROM EXAM_REGISTRATIONS R
       JOIN STUDENTS S ON S.STUDENT_ID = R.STUDENT_ID
       LEFT JOIN EXAM_MARKS M ON M.EXAM_SESSION_ID = R.EXAM_SESSION_ID AND M.STUDENT_ID = R.STUDENT_ID
       WHERE R.EXAM_SESSION_ID = ? AND R.STATUS = 'REGISTERED'
       ORDER BY S.ROLL_NUMBER`,
      [req.params.examSessionId],
    );
    return res.json(rows);
  } catch (error) {
    console.error("Exam marks listing error:", error);
    return res.status(500).json({ message: "Unable to load exam marks." });
  }
});

router.put("/:userId/sessions/:examSessionId/students/:studentId/marks", async (req, res) => {
  const score = Number(req.body?.score);
  if (!Number.isFinite(score) || score < 0) return res.status(400).json({ message: "A non-negative score is required." });
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const sessions = await connection.query(
      "SELECT MAX_SCORE, STATUS FROM EXAM_SESSIONS WHERE EXAM_SESSION_ID = ? FOR UPDATE",
      [req.params.examSessionId],
    );
    if (!sessions.length || sessions[0].STATUS === "CANCELLED" || sessions[0].STATUS === "PUBLISHED") {
      await connection.rollback();
      return res.status(409).json({ message: "This exam session cannot accept mark changes." });
    }
    if (score > Number(sessions[0].MAX_SCORE)) {
      await connection.rollback();
      return res.status(400).json({ message: "Score cannot exceed the exam maximum." });
    }
    const registrations = await connection.query(
      "SELECT EXAM_REGISTRATION_ID FROM EXAM_REGISTRATIONS WHERE EXAM_SESSION_ID = ? AND STUDENT_ID = ? AND STATUS = 'REGISTERED'",
      [req.params.examSessionId, req.params.studentId],
    );
    if (!registrations.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Student is not registered for this exam." });
    }
    const existingMarks = await connection.query(
      "SELECT STATUS FROM EXAM_MARKS WHERE EXAM_SESSION_ID = ? AND STUDENT_ID = ? FOR UPDATE",
      [req.params.examSessionId, req.params.studentId],
    );
    if (existingMarks.length && existingMarks[0].STATUS !== "DRAFT") {
      await connection.rollback();
      return res.status(409).json({ message: "Submitted or approved marks cannot be changed." });
    }
    await connection.query(
      `INSERT INTO EXAM_MARKS (EXAM_SESSION_ID, STUDENT_ID, SCORE, MAX_SCORE, STATUS, UPDATED_BY)
      VALUES (?, ?, ?, ?, 'DRAFT', ?, NULL, NULL)
      ON DUPLICATE KEY UPDATE SCORE = VALUES(SCORE), MAX_SCORE = VALUES(MAX_SCORE), STATUS = 'DRAFT', UPDATED_BY = VALUES(UPDATED_BY), APPROVED_BY = NULL, APPROVED_AT = NULL`,
      [req.params.examSessionId, req.params.studentId, score, sessions[0].MAX_SCORE, req.auth.userId],
    );
    await connection.commit();
    return res.json({ message: "Mark saved as draft." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Exam mark save error:", error);
    return res.status(500).json({ message: "Unable to save exam mark." });
  } finally {
    if (connection) connection.release();
  }
});

router.post("/:userId/sessions/:examSessionId/submit-marks", async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const sessions = await connection.query("SELECT STATUS FROM EXAM_SESSIONS WHERE EXAM_SESSION_ID = ? FOR UPDATE", [req.params.examSessionId]);
    if (!sessions.length || sessions[0].STATUS !== "CLOSED") {
      await connection.rollback();
      return res.status(409).json({ message: "Close registration before submitting marks for moderation." });
    }
    const counts = await connection.query(
      `SELECT COUNT(*) AS REGISTERED_COUNT,
        SUM(CASE WHEN M.EXAM_MARK_ID IS NULL OR M.STATUS != 'DRAFT' THEN 1 ELSE 0 END) AS INCOMPLETE_COUNT
       FROM EXAM_REGISTRATIONS R
       LEFT JOIN EXAM_MARKS M ON M.EXAM_SESSION_ID = R.EXAM_SESSION_ID AND M.STUDENT_ID = R.STUDENT_ID
       WHERE R.EXAM_SESSION_ID = ? AND R.STATUS = 'REGISTERED'`,
      [req.params.examSessionId],
    );
    if (Number(counts[0]?.REGISTERED_COUNT || 0) === 0 || Number(counts[0]?.INCOMPLETE_COUNT || 0) > 0) {
      await connection.rollback();
      return res.status(409).json({ message: "Every registered student needs a draft mark before moderation." });
    }
    await connection.query("UPDATE EXAM_MARKS SET STATUS = 'SUBMITTED' WHERE EXAM_SESSION_ID = ? AND STATUS = 'DRAFT'", [req.params.examSessionId]);
    await connection.commit();
    return res.json({ message: "Marks submitted for moderation." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Exam marks submit error:", error);
    return res.status(500).json({ message: "Unable to submit marks." });
  } finally {
    if (connection) connection.release();
  }
});

router.post("/:userId/sessions/:examSessionId/approve-marks", async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const sessions = await connection.query("SELECT STATUS FROM EXAM_SESSIONS WHERE EXAM_SESSION_ID = ? FOR UPDATE", [req.params.examSessionId]);
    if (!sessions.length || sessions[0].STATUS !== "CLOSED") {
      await connection.rollback();
      return res.status(409).json({ message: "Only marks for a closed exam can be approved." });
    }
    const pending = await connection.query(
      `SELECT COUNT(*) AS TOTAL FROM EXAM_MARKS M
       JOIN EXAM_REGISTRATIONS R ON R.EXAM_SESSION_ID = M.EXAM_SESSION_ID AND R.STUDENT_ID = M.STUDENT_ID
       WHERE M.EXAM_SESSION_ID = ? AND R.STATUS = 'REGISTERED' AND M.STATUS = 'SUBMITTED' AND M.UPDATED_BY != ?`,
      [req.params.examSessionId, req.auth.userId],
    );
    const unapproved = await connection.query(
      "SELECT COUNT(*) AS TOTAL FROM EXAM_MARKS WHERE EXAM_SESSION_ID = ? AND STATUS = 'SUBMITTED'",
      [req.params.examSessionId],
    );
    if (!Number(unapproved[0]?.TOTAL || 0) || Number(pending[0]?.TOTAL || 0) !== Number(unapproved[0].TOTAL)) {
      await connection.rollback();
      return res.status(403).json({ message: "A different administrator must approve every submitted mark." });
    }
    await connection.query(
      `UPDATE EXAM_MARKS SET STATUS = 'APPROVED', APPROVED_BY = ?, APPROVED_AT = CURRENT_TIMESTAMP
       WHERE EXAM_SESSION_ID = ? AND STATUS = 'SUBMITTED' AND UPDATED_BY != ?`,
      [req.auth.userId, req.params.examSessionId, req.auth.userId],
    );
    await connection.commit();
    return res.json({ message: "Marks approved. Results can now be published." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Exam marks approval error:", error);
    return res.status(500).json({ message: "Unable to approve marks." });
  } finally {
    if (connection) connection.release();
  }
});

router.post("/:userId/sessions/:examSessionId/publish", async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const sessions = await connection.query("SELECT STATUS FROM EXAM_SESSIONS WHERE EXAM_SESSION_ID = ? FOR UPDATE", [req.params.examSessionId]);
    if (!sessions.length || sessions[0].STATUS !== "CLOSED") {
      await connection.rollback();
      return res.status(409).json({ message: "Close the exam before publishing its approved results." });
    }
    const counts = await connection.query(
      `SELECT COUNT(*) AS REGISTERED_COUNT,
        SUM(CASE WHEN M.EXAM_MARK_ID IS NULL OR M.STATUS != 'APPROVED' THEN 1 ELSE 0 END) AS MISSING_COUNT
       FROM EXAM_REGISTRATIONS R
       LEFT JOIN EXAM_MARKS M ON M.EXAM_SESSION_ID = R.EXAM_SESSION_ID AND M.STUDENT_ID = R.STUDENT_ID
       WHERE R.EXAM_SESSION_ID = ? AND R.STATUS = 'REGISTERED'`,
      [req.params.examSessionId],
    );
    if (Number(counts[0]?.REGISTERED_COUNT || 0) === 0 || Number(counts[0]?.MISSING_COUNT || 0) > 0) {
      await connection.rollback();
      return res.status(409).json({ message: "All registered students need approved marks before publication." });
    }
    await connection.query("UPDATE EXAM_MARKS SET STATUS = 'PUBLISHED' WHERE EXAM_SESSION_ID = ?", [req.params.examSessionId]);
    await connection.query("UPDATE EXAM_SESSIONS SET STATUS = 'PUBLISHED' WHERE EXAM_SESSION_ID = ?", [req.params.examSessionId]);
    await connection.query(
      `INSERT INTO IN_APP_NOTIFICATIONS (USER_ID, TITLE, MESSAGE, NOTIFICATION_TYPE, RESOURCE_PATH)
       SELECT S.USER_ID, 'Exam results published', 'Results are available in your student portal.', 'EXAM_RESULT', '/erp/student/exams'
       FROM EXAM_REGISTRATIONS R JOIN STUDENTS S ON S.STUDENT_ID = R.STUDENT_ID
       WHERE R.EXAM_SESSION_ID = ? AND R.STATUS = 'REGISTERED' AND S.USER_ID IS NOT NULL`,
      [req.params.examSessionId],
    );
    await connection.commit();
    return res.json({ message: "Exam results published." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Exam result publish error:", error);
    return res.status(500).json({ message: "Unable to publish exam results." });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;