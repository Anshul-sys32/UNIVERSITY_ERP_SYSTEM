const express = require("express");
const pool = require("../db");

const router = express.Router();

const findStudentId = async (userId) => {
  const rows = await pool.query(
    "SELECT STUDENT_ID FROM STUDENTS WHERE USER_ID = ? AND STATUS = 'ACTIVE'",
    [userId],
  );
  return rows[0]?.STUDENT_ID || null;
};

const requireStudent = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    res.status(400).json({ message: "A valid user id is required." });
    return null;
  }
  const studentId = await findStudentId(userId);
  if (!studentId) {
    res.status(404).json({ message: "No active student profile is linked to this account." });
    return null;
  }
  return studentId;
};

const withStudent = (query, field = "STUDENT_ID") => `${query} WHERE ${field} = ?`;

router.get("/:userId/dashboard", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const [studentRows, attendanceRows, assignmentRows, resultRows] = await Promise.all([
      pool.query(
        "SELECT STUDENT_ID, FIRST_NAME, LAST_NAME, EMAIL, ROLL_NUMBER, CURRENT_SEMESTER, BATCH_YEAR FROM STUDENTS WHERE STUDENT_ID = ?",
        [studentId],
      ),
      pool.query("SELECT TODAY_PERCENT, OVERALL_PERCENT FROM ATTENDANCE_SUMMARY WHERE STUDENT_ID = ?", [studentId]),
      pool.query(
        withStudent("SELECT ASSIGNMENT_ID, TITLE, DUE_DATE, STATUS FROM ASSIGNMENTS") + " ORDER BY DUE_DATE ASC LIMIT 5",
        [studentId],
      ),
      pool.query(
        withStudent("SELECT SUBJECT, SCORE, MAX_SCORE FROM RESULTS") + " ORDER BY RESULT_ID DESC LIMIT 5",
        [studentId],
      ),
    ]);
    res.json({
      student: studentRows[0],
      attendance: attendanceRows[0] || { TODAY_PERCENT: 0, OVERALL_PERCENT: 0 },
      assignments: assignmentRows,
      results: resultRows,
    });
  } catch (error) {
    console.error("Student dashboard error:", error);
    res.status(500).json({ message: "Unable to load the student dashboard." });
  }
});

router.get("/:userId/assignments", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const rows = await pool.query(
      withStudent("SELECT * FROM ASSIGNMENTS") + " ORDER BY DUE_DATE ASC",
      [studentId],
    );
    res.json(rows);
  } catch (error) {
    console.error("Student assignments error:", error);
    res.status(500).json({ message: "Unable to load assignments." });
  }
});

router.get("/:userId/fees", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const rows = await pool.query(
      withStudent("SELECT * FROM FEE_TRANSACTIONS") + " ORDER BY DUE_DATE DESC, FEE_ID DESC",
      [studentId],
    );
    res.json(rows);
  } catch (error) {
    console.error("Student fees error:", error);
    res.status(500).json({ message: "Unable to load fee transactions." });
  }
});

router.get("/:userId/library", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const rows = await pool.query(
      withStudent("SELECT * FROM LIBRARY_BOOKS") + " ORDER BY ISSUE_DATE DESC",
      [studentId],
    );
    res.json(rows);
  } catch (error) {
    console.error("Student library error:", error);
    res.status(500).json({ message: "Unable to load library records." });
  }
});

router.get("/:userId/events", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const rows = await pool.query("SELECT * FROM CAMPUS_EVENTS ORDER BY EVENT_DATE ASC");
    res.json(rows);
  } catch (error) {
    console.error("Campus events error:", error);
    res.status(500).json({ message: "Unable to load campus events." });
  }
});

router.get("/:userId/question-papers", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const rows = await pool.query("SELECT * FROM QUESTION_PAPERS ORDER BY EXAM_YEAR DESC, SUBJECT ASC");
    res.json(rows);
  } catch (error) {
    console.error("Question papers error:", error);
    res.status(500).json({ message: "Unable to load question papers." });
  }
});

router.get("/:userId/results", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const rows = await pool.query(
      withStudent("SELECT * FROM RESULTS") + " ORDER BY SEMESTER DESC, RESULT_ID DESC",
      [studentId],
    );
    res.json(rows);
  } catch (error) {
    console.error("Student results error:", error);
    res.status(500).json({ message: "Unable to load results." });
  }
});

router.post("/:userId/feedback", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const { subject, message } = req.body;
    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Subject and message are required." });
    }
    await pool.query(
      "INSERT INTO FEEDBACK (STUDENT_ID, SUBJECT, MESSAGE) VALUES (?, ?, ?)",
      [studentId, subject.trim(), message.trim()],
    );
    res.status(201).json({ message: "Feedback submitted successfully." });
  } catch (error) {
    console.error("Student feedback error:", error);
    res.status(500).json({ message: "Unable to submit feedback." });
  }
});

module.exports = router;
