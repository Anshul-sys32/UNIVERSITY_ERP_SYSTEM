const express = require("express");
const crypto = require("node:crypto");
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

const dateOnly = (value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const scheduledLectureCount = (startValue, endValue, scheduledDays) => {
  if (!startValue || !endValue || !scheduledDays.size) return 0;
  const start = new Date(`${dateOnly(startValue)}T00:00:00Z`);
  const end = new Date(`${dateOnly(endValue)}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;
  let count = 0;
  for (const current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
    const mondayIndex = (current.getUTCDay() + 6) % 7;
    if (scheduledDays.has(mondayIndex)) count += 1;
  }
  return count;
};

const loadAttendanceSummary = async (studentId) => {
  const [scheduleRows, attendanceRows, dates] = await Promise.all([
    pool.query(
      `SELECT R.COURSE_ID, R.REGISTERED_AT, C.COURSE_CODE, C.TITLE, T.DAY_OF_WEEK
       FROM COURSE_REGISTRATIONS R
       JOIN COURSES C ON C.COURSE_ID = R.COURSE_ID
       LEFT JOIN TIMETABLE_SLOTS T ON T.COURSE_ID = R.COURSE_ID
       WHERE R.STUDENT_ID = ? AND R.STATUS = 'REGISTERED'
       ORDER BY C.COURSE_CODE, T.DAY_OF_WEEK`,
      [studentId],
    ),
    pool.query(
      `SELECT A.COURSE_ID, A.LECTURE_DATE, A.STATUS
       FROM ATTENDANCE_LOGS A
       JOIN COURSE_REGISTRATIONS R ON R.COURSE_ID = A.COURSE_ID
         AND R.STUDENT_ID = A.STUDENT_ID AND R.STATUS = 'REGISTERED'
       WHERE A.STUDENT_ID = ? AND A.LECTURE_DATE >= DATE(R.REGISTERED_AT)
         AND A.LECTURE_DATE <= CURRENT_DATE`,
      [studentId],
    ),
    pool.query("SELECT CURRENT_DATE AS AS_OF_DATE"),
  ]);

  const asOfDate = dateOnly(dates[0]?.AS_OF_DATE || new Date());
  const weekdayIndex = new Map(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((day, index) => [day, index]));
  const subjects = new Map();
  for (const row of scheduleRows) {
    let subject = subjects.get(Number(row.COURSE_ID));
    if (!subject) {
      subject = {
        COURSE_ID: Number(row.COURSE_ID),
        COURSE_CODE: row.COURSE_CODE,
        TITLE: row.TITLE,
        REGISTERED_AT: row.REGISTERED_AT,
        SCHEDULED_DAYS: new Set(),
      };
      subjects.set(subject.COURSE_ID, subject);
    }
    const dayIndex = weekdayIndex.get(String(row.DAY_OF_WEEK || "").toUpperCase());
    if (dayIndex !== undefined) subject.SCHEDULED_DAYS.add(dayIndex);
  }

  for (const subject of subjects.values()) {
    subject.TOTAL_CLASSES = scheduledLectureCount(subject.REGISTERED_AT, asOfDate, subject.SCHEDULED_DAYS);
    subject.ATTENDED_CLASSES = 0;
    subject.TODAY_TOTAL_CLASSES = 0;
    subject.TODAY_ATTENDED_CLASSES = 0;
    subject.LAST_CLASS_DATE = null;
    const today = new Date(`${asOfDate}T00:00:00Z`);
    if (subject.SCHEDULED_DAYS.has((today.getUTCDay() + 6) % 7)) subject.TODAY_TOTAL_CLASSES = 1;
  }

  for (const row of attendanceRows) {
    const subject = subjects.get(Number(row.COURSE_ID));
    if (!subject) continue;
    const lectureDate = dateOnly(row.LECTURE_DATE);
    const day = new Date(`${lectureDate}T00:00:00Z`);
    if (!subject.SCHEDULED_DAYS.has((day.getUTCDay() + 6) % 7)) continue;
    if (!subject.LAST_CLASS_DATE || lectureDate > dateOnly(subject.LAST_CLASS_DATE)) subject.LAST_CLASS_DATE = lectureDate;
    if (["PRESENT", "ON_DUTY"].includes(row.STATUS)) {
      subject.ATTENDED_CLASSES += 1;
      if (lectureDate === asOfDate) subject.TODAY_ATTENDED_CLASSES += 1;
    }
  }

  const subjectRows = [...subjects.values()].map(({ SCHEDULED_DAYS, REGISTERED_AT, ...subject }) => ({
    ...subject,
    ATTENDANCE_PERCENT: subject.TOTAL_CLASSES
      ? Number(((subject.ATTENDED_CLASSES / subject.TOTAL_CLASSES) * 100).toFixed(2))
      : 0,
  }));
  const totalClasses = subjectRows.reduce((total, subject) => total + subject.TOTAL_CLASSES, 0);
  const attendedClasses = subjectRows.reduce((total, subject) => total + subject.ATTENDED_CLASSES, 0);
  const todayTotalClasses = subjectRows.reduce((total, subject) => total + subject.TODAY_TOTAL_CLASSES, 0);
  const todayAttendedClasses = subjectRows.reduce((total, subject) => total + subject.TODAY_ATTENDED_CLASSES, 0);
  return {
    TODAY_PERCENT: todayTotalClasses ? Number(((todayAttendedClasses / todayTotalClasses) * 100).toFixed(2)) : 0,
    OVERALL_PERCENT: totalClasses ? Number(((attendedClasses / totalClasses) * 100).toFixed(2)) : 0,
    TODAY_ATTENDED_CLASSES: todayAttendedClasses,
    TODAY_TOTAL_CLASSES: todayTotalClasses,
    ATTENDED_CLASSES: attendedClasses,
    TOTAL_CLASSES: totalClasses,
    SUBJECTS: subjectRows,
  };
};

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
    const [studentRows, attendance, assignmentRows, resultRows] = await Promise.all([
      pool.query(
        "SELECT STUDENT_ID, FIRST_NAME, LAST_NAME, EMAIL, ROLL_NUMBER, CURRENT_SEMESTER, BATCH_YEAR FROM STUDENTS WHERE STUDENT_ID = ?",
        [studentId],
      ),
      loadAttendanceSummary(studentId),
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
      attendance,
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
    const summary = await loadAttendanceSummary(studentId);
    res.json(summary.SUBJECTS);
  } catch (error) {
    console.error("Student attendance error:", error);
    res.status(500).json({ message: "Unable to load course attendance." });
  }
});

router.get("/:userId/exams", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const rows = await pool.query(
      `SELECT E.EXAM_SESSION_ID, E.EXAM_CODE, E.EXAM_TYPE, E.EXAM_DATE,
        E.START_TIME, E.END_TIME, E.VENUE, E.MAX_SCORE, E.REGISTRATION_DEADLINE,
        E.STATUS AS EXAM_STATUS, C.COURSE_ID, C.COURSE_CODE, C.TITLE AS COURSE_TITLE,
        R.STATUS AS REGISTRATION_STATUS
       FROM EXAM_SESSIONS E
       JOIN COURSES C ON C.COURSE_ID = E.COURSE_ID
       JOIN COURSE_REGISTRATIONS CR ON CR.COURSE_ID = C.COURSE_ID
         AND CR.STUDENT_ID = ? AND CR.STATUS = 'REGISTERED'
       LEFT JOIN EXAM_REGISTRATIONS R ON R.EXAM_SESSION_ID = E.EXAM_SESSION_ID
         AND R.STUDENT_ID = ?
       WHERE E.STATUS IN ('OPEN', 'CLOSED', 'PUBLISHED')
       ORDER BY E.EXAM_DATE, E.START_TIME`,
      [studentId, studentId],
    );
    return res.json(rows);
  } catch (error) {
    console.error("Student exam listing error:", error);
    return res.status(500).json({ message: "Unable to load exam sessions." });
  }
});

router.post("/:userId/exams/:examSessionId/register", async (req, res) => {
  let connection;
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const exams = await connection.query(
      `SELECT E.COURSE_ID, E.STATUS, E.REGISTRATION_DEADLINE,
        (E.REGISTRATION_DEADLINE < CURRENT_DATE) AS DEADLINE_PASSED
       FROM EXAM_SESSIONS E WHERE E.EXAM_SESSION_ID = ? FOR UPDATE`,
      [req.params.examSessionId],
    );
    if (!exams.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Exam session not found." });
    }
    const exam = exams[0];
    if (exam.STATUS !== "OPEN" || Number(exam.DEADLINE_PASSED) === 1) {
      await connection.rollback();
      return res.status(409).json({ message: "Registration for this exam is closed." });
    }
    const courseRegistrations = await connection.query(
      "SELECT REGISTRATION_ID FROM COURSE_REGISTRATIONS WHERE COURSE_ID = ? AND STUDENT_ID = ? AND STATUS = 'REGISTERED'",
      [exam.COURSE_ID, studentId],
    );
    if (!courseRegistrations.length) {
      await connection.rollback();
      return res.status(403).json({ message: "Only students registered in the course may register for this exam." });
    }
    await connection.query(
      `INSERT INTO EXAM_REGISTRATIONS (EXAM_SESSION_ID, STUDENT_ID, STATUS)
       VALUES (?, ?, 'REGISTERED')
       ON DUPLICATE KEY UPDATE STATUS = 'REGISTERED'`,
      [req.params.examSessionId, studentId],
    );
    await connection.commit();
    return res.status(201).json({ message: "Exam registration confirmed." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Student exam registration error:", error);
    return res.status(500).json({ message: "Unable to register for this exam." });
  } finally {
    if (connection) connection.release();
  }
});

router.get("/:userId/exam-results", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const rows = await pool.query(
      `SELECT E.EXAM_CODE, E.EXAM_TYPE, E.EXAM_DATE, C.COURSE_CODE,
        C.TITLE AS COURSE_TITLE, M.SCORE, M.MAX_SCORE, M.UPDATED_AT AS PUBLISHED_AT
       FROM EXAM_MARKS M
       JOIN EXAM_SESSIONS E ON E.EXAM_SESSION_ID = M.EXAM_SESSION_ID AND E.STATUS = 'PUBLISHED'
       JOIN COURSES C ON C.COURSE_ID = E.COURSE_ID
       WHERE M.STUDENT_ID = ? AND M.STATUS = 'PUBLISHED'
       ORDER BY E.EXAM_DATE DESC, E.EXAM_CODE`,
      [studentId],
    );
    return res.json(rows);
  } catch (error) {
    console.error("Student exam results error:", error);
    return res.status(500).json({ message: "Unable to load published exam results." });
  }
});

router.get("/:userId/fees", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const rows = await pool.query(
      `SELECT FEE_ID, 'FEE_TRANSACTION' AS FEE_SOURCE, DETAIL, DUE_DATE, AMOUNT,
        TRANSACTION_ID, STATUS, PAID_AT, NULL AS CREATED_AT
       FROM FEE_TRANSACTIONS
       WHERE STUDENT_ID = ?
       UNION ALL
       SELECT LEDGER_ID AS FEE_ID, 'ACCOUNTING_LEDGER' AS FEE_SOURCE, DETAIL, DUE_DATE,
        AMOUNT, TRANSACTION_ID, STATUS, PAID_AT, CREATED_AT
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

router.post("/:userId/fees/:feeSource/:feeId/pay", async (req, res) => {
  if (!req.app.locals.mockPaymentsEnabled) {
    return res.status(503).json({ message: "Online payments are not configured." });
  }

  const source = req.params.feeSource;
  const sourceConfig = {
    FEE_TRANSACTION: { table: "FEE_TRANSACTIONS", idColumn: "FEE_ID" },
    ACCOUNTING_LEDGER: { table: "ACCOUNTING_LEDGER", idColumn: "LEDGER_ID" },
  }[source];
  const feeId = Number(req.params.feeId);
  const idempotencyKey = req.get("Idempotency-Key");
  if (!sourceConfig || !Number.isSafeInteger(feeId) || feeId < 1) {
    return res.status(400).json({ message: "A valid fee record is required." });
  }
  if (typeof idempotencyKey !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(idempotencyKey)) {
    return res.status(400).json({ message: "A valid Idempotency-Key is required." });
  }

  let connection;
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      "SELECT STUDENT_ID FROM STUDENTS WHERE STUDENT_ID = ? AND USER_ID = ? AND STATUS = 'ACTIVE' FOR UPDATE",
      [studentId, req.auth.userId],
    );

    const previous = await connection.query(
      `SELECT PAYMENT_ID, FEE_SOURCE, FEE_RECORD_ID, TRANSACTION_REFERENCE, AMOUNT, STATUS
       FROM FEE_PAYMENT_ATTEMPTS WHERE STUDENT_ID = ? AND IDEMPOTENCY_KEY = ?`,
      [studentId, idempotencyKey],
    );
    if (previous.length) {
      const payment = previous[0];
      if (payment.FEE_SOURCE !== source || Number(payment.FEE_RECORD_ID) !== feeId) {
        await connection.rollback();
        return res.status(409).json({ message: "This idempotency key was already used for another fee." });
      }
      await connection.commit();
      return res.json({ paymentId: Number(payment.PAYMENT_ID), transactionReference: payment.TRANSACTION_REFERENCE, amount: payment.AMOUNT, status: payment.STATUS, provider: "MOCK" });
    }

    const feeRows = await connection.query(
      `SELECT ${sourceConfig.idColumn} AS FEE_ID, AMOUNT, STATUS
       FROM ${sourceConfig.table}
       WHERE ${sourceConfig.idColumn} = ? AND STUDENT_ID = ? FOR UPDATE`,
      [feeId, studentId],
    );
    if (!feeRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Fee record not found." });
    }
    const fee = feeRows[0];
    if (fee.STATUS === "PAID") {
      await connection.rollback();
      return res.status(409).json({ message: "This fee has already been paid." });
    }
    if (!["UNPAID", "PENDING"].includes(fee.STATUS) || Number(fee.AMOUNT) <= 0) {
      await connection.rollback();
      return res.status(409).json({ message: "This fee is not currently payable." });
    }

    const transactionReference = `MOCK-${crypto.randomUUID()}`;
    const inserted = await connection.query(
      `INSERT INTO FEE_PAYMENT_ATTEMPTS
        (STUDENT_ID, FEE_SOURCE, FEE_RECORD_ID, IDEMPOTENCY_KEY, TRANSACTION_REFERENCE, AMOUNT, STATUS)
       VALUES (?, ?, ?, ?, ?, ?, 'SUCCEEDED')`,
      [studentId, source, feeId, idempotencyKey, transactionReference, fee.AMOUNT],
    );
    await connection.query(
      `UPDATE ${sourceConfig.table} SET STATUS = 'PAID', TRANSACTION_ID = ?, PAID_AT = CURRENT_TIMESTAMP
       WHERE ${sourceConfig.idColumn} = ? AND STUDENT_ID = ? AND STATUS IN ('UNPAID', 'PENDING')`,
      [transactionReference, feeId, studentId],
    );
    await connection.commit();
    return res.status(201).json({
      paymentId: Number(inserted.insertId),
      transactionReference,
      amount: fee.AMOUNT,
      status: "SUCCEEDED",
      provider: "MOCK",
      message: "Development mock payment completed. No real money was charged.",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "A payment for this fee was already processed." });
    console.error("Student mock payment error:", error);
    return res.status(500).json({ message: "Unable to process the payment." });
  } finally {
    if (connection) connection.release();
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

router.get("/:userId/placements", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const rows = await pool.query(
      `SELECT D.DRIVE_ID, D.COMPANY_NAME, D.ROLE_TITLE, D.ELIGIBILITY,
        D.DRIVE_DATE, D.APPLICATION_DEADLINE, D.LOCATION, D.PACKAGE, D.DESCRIPTION,
        A.APPLICATION_ID, A.STATUS AS APPLICATION_STATUS
       FROM PLACEMENT_DRIVES D
       LEFT JOIN PLACEMENT_APPLICATIONS A ON A.DRIVE_ID = D.DRIVE_ID AND A.STUDENT_ID = ?
       WHERE D.STATUS = 'OPEN' AND D.APPLICATION_DEADLINE >= CURRENT_DATE
       ORDER BY D.APPLICATION_DEADLINE, D.COMPANY_NAME`,
      [studentId],
    );
    return res.json(rows);
  } catch (error) {
    console.error("Student placement drive list error:", error);
    return res.status(500).json({ message: "Unable to load placement drives." });
  }
});

router.post("/:userId/placements/:driveId/apply", async (req, res) => {
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    const drives = await pool.query(
      `SELECT DRIVE_ID FROM PLACEMENT_DRIVES
       WHERE DRIVE_ID = ? AND STATUS = 'OPEN' AND APPLICATION_DEADLINE >= CURRENT_DATE`,
      [req.params.driveId],
    );
    if (!drives.length) return res.status(409).json({ message: "This placement drive is closed or past its deadline." });
    const existing = await pool.query(
      "SELECT APPLICATION_ID, STATUS FROM PLACEMENT_APPLICATIONS WHERE DRIVE_ID = ? AND STUDENT_ID = ?",
      [req.params.driveId, studentId],
    );
    if (existing.length && existing[0].STATUS !== "WITHDRAWN") {
      return res.status(409).json({ message: "You already have an application for this drive." });
    }
    if (existing.length) {
      await pool.query(
        "UPDATE PLACEMENT_APPLICATIONS SET STATUS = 'APPLIED', APPLIED_AT = CURRENT_TIMESTAMP WHERE APPLICATION_ID = ? AND STUDENT_ID = ?",
        [existing[0].APPLICATION_ID, studentId],
      );
      return res.json({ applicationId: Number(existing[0].APPLICATION_ID), message: "Application resubmitted." });
    }
    const result = await pool.query(
      "INSERT INTO PLACEMENT_APPLICATIONS (DRIVE_ID, STUDENT_ID, STATUS) VALUES (?, ?, 'APPLIED')",
      [req.params.driveId, studentId],
    );
    return res.status(201).json({ applicationId: Number(result.insertId), message: "Application submitted." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "You already have an application for this drive." });
    console.error("Student placement application error:", error);
    return res.status(500).json({ message: "Unable to submit this application." });
  }
});

router.post("/:userId/placements/applications/:applicationId/withdraw", async (req, res) => {
  let connection;
  try {
    const studentId = await requireStudent(req, res);
    if (!studentId) return;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const applications = await connection.query(
      `SELECT A.APPLICATION_ID, A.STATUS, D.STATUS AS DRIVE_STATUS,
        (D.APPLICATION_DEADLINE < CURRENT_DATE) AS DEADLINE_PASSED
       FROM PLACEMENT_APPLICATIONS A JOIN PLACEMENT_DRIVES D ON D.DRIVE_ID = A.DRIVE_ID
       WHERE A.APPLICATION_ID = ? AND A.STUDENT_ID = ? FOR UPDATE`,
      [req.params.applicationId, studentId],
    );
    if (!applications.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Placement application not found." });
    }
    const application = applications[0];
    if (application.STATUS !== "APPLIED" || application.DRIVE_STATUS !== "OPEN" || Number(application.DEADLINE_PASSED)) {
      await connection.rollback();
      return res.status(409).json({ message: "This application can no longer be withdrawn." });
    }
    await connection.query("UPDATE PLACEMENT_APPLICATIONS SET STATUS = 'WITHDRAWN' WHERE APPLICATION_ID = ? AND STUDENT_ID = ?", [application.APPLICATION_ID, studentId]);
    await connection.commit();
    return res.json({ message: "Application withdrawn." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Placement application withdraw error:", error);
    return res.status(500).json({ message: "Unable to withdraw this application." });
  } finally {
    if (connection) connection.release();
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
