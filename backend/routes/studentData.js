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

router.get("/:userId/profile", async (req, res) => {
  try {
    const userId = Number(req.auth?.userId);
    const rows = await pool.query(
      `SELECT STUDENT_ID, ROLL_NUMBER, ADMISSION_NUMBER, FIRST_NAME, LAST_NAME,
        EMAIL, PHONE_NUMBER, PROGRAM_ID, DEPARTMENT_ID, BATCH_YEAR,
        CURRENT_SEMESTER, ADMISSION_DATE, STATUS
       FROM STUDENTS
       WHERE USER_ID = ? AND STATUS = 'ACTIVE'`,
      [userId],
    );
    if (!rows.length) return res.status(404).json({ message: "No active student profile is linked to this account." });
    return res.json(rows[0]);
  } catch (error) {
    console.error("Student profile error:", error);
    return res.status(500).json({ message: "Unable to load your profile." });
  }
});

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

router.get("/:userId/courses", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const rows = await pool.query(
      `SELECT C.COURSE_ID, C.COURSE_CODE, C.TITLE, C.CREDITS, C.SEMESTER,
        C.COURSE_TYPE, C.DEPARTMENT, R.STATUS, R.ACADEMIC_YEAR
       FROM COURSE_REGISTRATIONS R
       JOIN COURSES C ON C.COURSE_ID = R.COURSE_ID
       WHERE R.STUDENT_ID = ? AND R.STATUS = 'REGISTERED'
       ORDER BY C.SEMESTER, C.COURSE_CODE`,
      [studentId],
    );
    res.json(rows);
  } catch (error) {
    console.error("Student courses error:", error);
    res.status(500).json({ message: "Unable to load registered courses." });
  }
});

router.get("/:userId/timetable", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    res.json(await pool.query(
      `SELECT T.SLOT_ID, T.DAY_OF_WEEK, T.START_TIME, T.END_TIME, T.ROOM,
        C.COURSE_CODE, C.TITLE
       FROM TIMETABLE_SLOTS T
       JOIN COURSES C ON C.COURSE_ID = T.COURSE_ID
       JOIN COURSE_REGISTRATIONS R ON R.COURSE_ID = C.COURSE_ID
       WHERE R.STUDENT_ID = ? AND R.STATUS = 'REGISTERED'
       ORDER BY FIELD(T.DAY_OF_WEEK, 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'), T.START_TIME`,
      [studentId],
    ));
  } catch (error) {
    console.error("Student timetable error:", error);
    res.status(500).json({ message: "Unable to load timetable." });
  }
});

router.get("/:userId/attendance", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    res.json(await pool.query(
      `SELECT C.COURSE_ID, C.COURSE_CODE, C.TITLE,
        COUNT(A.ATTENDANCE_ID) AS TOTAL_CLASSES,
        COALESCE(SUM(A.STATUS IN ('PRESENT', 'ON_DUTY')), 0) AS ATTENDED_CLASSES,
        COALESCE(ROUND((SUM(A.STATUS IN ('PRESENT', 'ON_DUTY')) / NULLIF(COUNT(A.ATTENDANCE_ID), 0)) * 100, 2), 0) AS ATTENDANCE_PERCENT,
        MAX(A.LECTURE_DATE) AS LAST_CLASS_DATE
       FROM COURSE_REGISTRATIONS R
       JOIN COURSES C ON C.COURSE_ID = R.COURSE_ID
       LEFT JOIN ATTENDANCE_LOGS A ON A.COURSE_ID = C.COURSE_ID AND A.STUDENT_ID = R.STUDENT_ID
       WHERE R.STUDENT_ID = ? AND R.STATUS = 'REGISTERED'
       GROUP BY C.COURSE_ID, C.COURSE_CODE, C.TITLE
       ORDER BY C.COURSE_CODE`,
      [studentId],
    ));
  } catch (error) {
    console.error("Student attendance error:", error);
    res.status(500).json({ message: "Unable to load course attendance." });
  }
});

router.get("/:userId/fees", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const rows = await pool.query(
      `SELECT FEE_ID, DETAIL, DUE_DATE, AMOUNT, TRANSACTION_ID, STATUS, PAID_AT, NULL AS CREATED_AT
       FROM FEE_TRANSACTIONS
       WHERE STUDENT_ID = ?
       UNION ALL
       SELECT LEDGER_ID AS FEE_ID, DETAIL, DUE_DATE, AMOUNT, TRANSACTION_ID, STATUS, PAID_AT, CREATED_AT
       FROM ACCOUNTING_LEDGER
       WHERE STUDENT_ID = ?
       ORDER BY DUE_DATE DESC, CREATED_AT DESC, FEE_ID DESC`,
      [studentId, studentId],
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
      `SELECT ISSUE_ID, TITLE, ISSUE_DATE, RETURN_DATE, STATUS, NULL AS DUE_DATE
       FROM LIBRARY_BOOKS
       WHERE STUDENT_ID = ?
       UNION ALL
       SELECT I.ISSUE_ID, C.TITLE, I.ISSUE_DATE, I.RETURN_DATE, I.STATUS, I.DUE_DATE
       FROM LIBRARY_ISSUES I
       JOIN LIBRARY_CATALOG C ON C.BOOK_ID = I.BOOK_ID
       WHERE I.STUDENT_ID = ?
       ORDER BY ISSUE_DATE DESC, ISSUE_ID DESC`,
      [studentId, studentId],
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

router.get("/:userId/announcements", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const rows = await pool.query(
      `SELECT ANNOUNCEMENT_ID, TITLE, MESSAGE, CREATED_AT
       FROM ANNOUNCEMENTS
       WHERE IS_ACTIVE = 1 AND AUDIENCE IN ('ALL', 'STUDENT')
       ORDER BY CREATED_AT DESC LIMIT 20`,
    );
    res.json(rows);
  } catch (error) {
    console.error("Student announcements error:", error);
    res.status(500).json({ message: "Unable to load announcements." });
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
