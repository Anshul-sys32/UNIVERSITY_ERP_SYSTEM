const express = require("express");
const pool = require("../db");

const router = express.Router();

const findFaculty = async (userId) => {
  const rows = await pool.query(
    "SELECT * FROM FACULTY WHERE USER_ID = ? AND STATUS = 'ACTIVE'",
    [userId],
  );
  return rows[0] || null;
};

const requireFaculty = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    res.status(400).json({ message: "A valid user id is required." });
    return null;
  }
  const faculty = await findFaculty(userId);
  if (!faculty) {
    res.status(404).json({ message: "No active faculty profile is linked to this account." });
    return null;
  }
  return faculty;
};

router.post("/profiles", async (req, res) => {
  try {
    const {
      userId,
      firstName,
      lastName = "",
      department,
      email,
      phoneNumber = "",
      designation = "",
    } = req.body;

    if (!Number.isInteger(Number(userId)) || !firstName?.trim() || !department?.trim() || !email?.trim()) {
      return res.status(400).json({
        message: "userId, firstName, department, and email are required.",
      });
    }

    const users = await pool.query(
      "SELECT USER_ID FROM USERS WHERE USER_ID = ? AND ROLE = 'FACULTY' AND IS_ACTIVE = 1",
      [userId],
    );
    if (!users.length) {
      return res.status(404).json({ message: "Active FACULTY user was not found." });
    }

    const existing = await pool.query("SELECT FACULTY_ID FROM FACULTY WHERE USER_ID = ?", [userId]);
    if (existing.length) {
      return res.status(409).json({ message: "A faculty profile already exists for this user." });
    }

    const result = await pool.query(
      `INSERT INTO FACULTY
        (USER_ID, FIRST_NAME, LAST_NAME, DEPARTMENT, EMAIL, PHONE_NUMBER, DESIGNATION)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        firstName.trim(),
        lastName.trim(),
        department.trim(),
        email.trim(),
        phoneNumber.trim(),
        designation.trim(),
      ],
    );

    res.status(201).json({
      facultyId: Number(result.insertId),
      message: "Faculty profile created successfully.",
    });
  } catch (error) {
    console.error("Create faculty profile error:", error);
    res.status(500).json({ message: "Unable to create faculty profile." });
  }
});

router.get("/:userId/dashboard", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    const [assignmentRows, questionRows, formRows] = await Promise.all([
      pool.query(
        "SELECT COUNT(*) AS TOTAL, SUM(STATUS = 'PENDING') AS PENDING FROM ASSIGNMENTS WHERE FACULTY_NAME = ?",
        [`${faculty.FIRST_NAME} ${faculty.LAST_NAME || ""}`.trim()],
      ),
      pool.query("SELECT COUNT(*) AS TOTAL FROM FACULTY_QUESTIONS WHERE FACULTY_ID = ?", [faculty.FACULTY_ID]),
      pool.query("SELECT COUNT(*) AS TOTAL FROM FACULTY_FORMS WHERE FACULTY_ID = ?", [faculty.FACULTY_ID]),
    ]);
    res.json({
      faculty,
      assignments: assignmentRows[0] || { TOTAL: 0, PENDING: 0 },
      questions: questionRows[0] || { TOTAL: 0 },
      forms: formRows[0] || { TOTAL: 0 },
    });

  } catch (error) {
    console.error("Faculty dashboard error:", error);
    res.status(500).json({ message: "Unable to load the faculty dashboard." });
  }
});

router.get("/:userId/courses", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    res.json(await pool.query(
      `SELECT C.COURSE_ID, C.COURSE_CODE, C.TITLE, C.CREDITS, C.SEMESTER,
        C.COURSE_TYPE, C.CAPACITY, COUNT(R.REGISTRATION_ID) AS REGISTERED_COUNT
       FROM COURSES C
       LEFT JOIN COURSE_REGISTRATIONS R ON R.COURSE_ID = C.COURSE_ID AND R.STATUS = 'REGISTERED'
       WHERE C.FACULTY_ID = ? AND C.IS_ACTIVE = 1
       GROUP BY C.COURSE_ID
       ORDER BY C.SEMESTER, C.COURSE_CODE`,
      [faculty.FACULTY_ID],
    ));
  } catch (error) {
    console.error("Faculty courses error:", error);
    res.status(500).json({ message: "Unable to load faculty courses." });
  }
});

router.post("/:userId/course-registrations", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    const { courseId, rollNumber, academicYear } = req.body;
    if (!Number.isInteger(Number(courseId)) || !rollNumber?.trim() || !academicYear?.trim()) {
      return res.status(400).json({ message: "Course id, student roll number, and academic year are required." });
    }

    const courses = await pool.query(
      "SELECT COURSE_ID, CAPACITY FROM COURSES WHERE COURSE_ID = ? AND FACULTY_ID = ? AND IS_ACTIVE = 1",
      [courseId, faculty.FACULTY_ID],
    );
    if (!courses.length) {
      return res.status(403).json({ message: "This course is not assigned to the signed-in faculty member." });
    }

    const students = await pool.query(
      "SELECT STUDENT_ID, FIRST_NAME, LAST_NAME FROM STUDENTS WHERE ROLL_NUMBER = ? AND STATUS = 'ACTIVE'",
      [rollNumber.trim()],
    );
    if (!students.length) return res.status(404).json({ message: "Active student with that roll number was not found." });

    const existing = await pool.query(
      "SELECT REGISTRATION_ID, STATUS FROM COURSE_REGISTRATIONS WHERE COURSE_ID = ? AND STUDENT_ID = ? AND ACADEMIC_YEAR = ?",
      [courseId, students[0].STUDENT_ID, academicYear.trim()],
    );
    if (existing.length) {
      return res.status(409).json({ message: "Student is already registered for this course and academic year.", registration: existing[0] });
    }

    const count = await pool.query(
      "SELECT COUNT(*) AS TOTAL FROM COURSE_REGISTRATIONS WHERE COURSE_ID = ? AND ACADEMIC_YEAR = ? AND STATUS = 'REGISTERED'",
      [courseId, academicYear.trim()],
    );
    if (Number(count[0]?.TOTAL || 0) >= Number(courses[0].CAPACITY)) {
      return res.status(409).json({ message: "Course registration capacity has been reached." });
    }

    const result = await pool.query(
      `INSERT INTO COURSE_REGISTRATIONS (COURSE_ID, STUDENT_ID, ACADEMIC_YEAR)
       VALUES (?, ?, ?)`,
      [courseId, students[0].STUDENT_ID, academicYear.trim()],
    );
    res.status(201).json({
      registrationId: Number(result.insertId),
      student: students[0],
      message: "Student registered for the course.",
    });
  } catch (error) {
    console.error("Faculty course registration error:", error);
    res.status(500).json({ message: "Unable to register student for the course." });
  }
});

router.get("/:userId/timetable", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    res.json(await pool.query(
      `SELECT T.SLOT_ID, T.DAY_OF_WEEK, T.START_TIME, T.END_TIME, T.ROOM,
        C.COURSE_ID, C.COURSE_CODE, C.TITLE, C.SEMESTER
       FROM TIMETABLE_SLOTS T
       JOIN COURSES C ON C.COURSE_ID = T.COURSE_ID
       WHERE C.FACULTY_ID = ? AND C.IS_ACTIVE = 1
       ORDER BY FIELD(T.DAY_OF_WEEK, 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'), T.START_TIME`,
      [faculty.FACULTY_ID],
    ));
  } catch (error) {
    console.error("Faculty timetable error:", error);
    res.status(500).json({ message: "Unable to load faculty timetable." });
  }
});

router.get("/:userId/attendance/:courseId", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    const courses = await pool.query(
      "SELECT COURSE_ID FROM COURSES WHERE COURSE_ID = ? AND FACULTY_ID = ?",
      [req.params.courseId, faculty.FACULTY_ID],
    );
    if (!courses.length) return res.status(404).json({ message: "Course not found for this faculty member." });
    res.json(await pool.query(
      `SELECT S.STUDENT_ID, S.ROLL_NUMBER, S.FIRST_NAME, S.LAST_NAME,
        A.LECTURE_DATE, A.STATUS
       FROM COURSE_REGISTRATIONS R
       JOIN STUDENTS S ON S.STUDENT_ID = R.STUDENT_ID
       LEFT JOIN ATTENDANCE_LOGS A ON A.STUDENT_ID = S.STUDENT_ID AND A.COURSE_ID = R.COURSE_ID
       WHERE R.COURSE_ID = ? AND R.STATUS = 'REGISTERED'
       ORDER BY S.ROLL_NUMBER, A.LECTURE_DATE DESC`,
      [req.params.courseId],
    ));
  } catch (error) {
    console.error("Faculty attendance listing error:", error);
    res.status(500).json({ message: "Unable to load course attendance." });
  }
});

router.post("/:userId/attendance", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    const { courseId, studentId, lectureDate, status } = req.body;
    if (!Number.isInteger(Number(courseId)) || !Number.isInteger(Number(studentId)) || !lectureDate || !["PRESENT", "ABSENT", "ON_DUTY"].includes(status)) {
      return res.status(400).json({ message: "Course, student, date, and valid attendance status are required." });
    }
    const courses = await pool.query(
      "SELECT COURSE_ID FROM COURSES WHERE COURSE_ID = ? AND FACULTY_ID = ?",
      [courseId, faculty.FACULTY_ID],
    );
    if (!courses.length) return res.status(403).json({ message: "You can only record attendance for your courses." });
    const scheduledSlots = await pool.query(
      `SELECT SLOT_ID FROM TIMETABLE_SLOTS
       WHERE COURSE_ID = ? AND FIELD(DAY_OF_WEEK, 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY') = WEEKDAY(?) + 1
         AND ? <= CURRENT_DATE`,
      [courseId, lectureDate, lectureDate],
    );
    if (!scheduledSlots.length) return res.status(400).json({ message: "Attendance can only be recorded for a scheduled lecture date that has occurred." });
    const enrollment = await pool.query(
      "SELECT REGISTRATION_ID FROM COURSE_REGISTRATIONS WHERE COURSE_ID = ? AND STUDENT_ID = ? AND STATUS = 'REGISTERED'",
      [courseId, studentId],
    );
    if (!enrollment.length) return res.status(403).json({ message: "The student is not registered for this course." });
    await pool.query(
      `INSERT INTO ATTENDANCE_LOGS (COURSE_ID, STUDENT_ID, FACULTY_ID, LECTURE_DATE, STATUS)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE STATUS = VALUES(STATUS), FACULTY_ID = VALUES(FACULTY_ID)`,
      [courseId, studentId, faculty.FACULTY_ID, lectureDate, status],
    );
    res.status(201).json({ message: "Attendance recorded." });
  } catch (error) {
    console.error("Record attendance error:", error);
    res.status(500).json({ message: "Unable to record attendance." });
  }
});

router.get("/:userId/assignments", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    const name = `${faculty.FIRST_NAME} ${faculty.LAST_NAME || ""}`.trim();
    const rows = await pool.query(
      "SELECT ASSIGNMENT_ID, TITLE, DESCRIPTION, DUE_DATE, STATUS, FACULTY_NAME, FACULTY_EMAIL FROM ASSIGNMENTS WHERE FACULTY_NAME = ? ORDER BY DUE_DATE ASC",
      [name],
    );
    res.json(rows);
  } catch (error) {
    console.error("Faculty assignments error:", error);
    res.status(500).json({ message: "Unable to load faculty assignments." });
  }
});

router.post("/:userId/assignments", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    const { title, description, dueDate, studentId } = req.body;
    if (!title?.trim() || !description?.trim() || !dueDate || !Number.isInteger(Number(studentId))) {
      return res.status(400).json({ message: "Title, description, due date, and student id are required." });
    }
    const name = `${faculty.FIRST_NAME} ${faculty.LAST_NAME || ""}`.trim();
    const result = await pool.query(
      "INSERT INTO ASSIGNMENTS (STUDENT_ID, TITLE, DESCRIPTION, DUE_DATE, FACULTY_NAME, FACULTY_EMAIL) VALUES (?, ?, ?, ?, ?, ?)",
      [studentId, title.trim(), description.trim(), dueDate, name, faculty.EMAIL],
    );
    res.status(201).json({ id: Number(result.insertId), message: "Assignment created." });
  } catch (error) {
    console.error("Create faculty assignment error:", error);
    res.status(500).json({ message: "Unable to create assignment." });
  }
});

router.delete("/:userId/assignments/:assignmentId", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    const name = `${faculty.FIRST_NAME} ${faculty.LAST_NAME || ""}`.trim();
    const result = await pool.query(
      "DELETE FROM ASSIGNMENTS WHERE ASSIGNMENT_ID = ? AND FACULTY_NAME = ?",
      [req.params.assignmentId, name],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Assignment not found." });
    res.json({ message: "Assignment deleted." });
  } catch (error) {
    console.error("Delete faculty assignment error:", error);
    res.status(500).json({ message: "Unable to delete assignment." });
  }
});

router.get("/:userId/questions", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    res.json(await pool.query(
      "SELECT QUESTION_ID, SUBJECT, QUESTION_TEXT, QUESTION_TYPE, OPTIONS_JSON, CREATED_AT FROM FACULTY_QUESTIONS WHERE FACULTY_ID = ? ORDER BY CREATED_AT DESC",
      [faculty.FACULTY_ID],
    ));
  } catch (error) {
    console.error("Faculty questions error:", error);
    res.status(500).json({ message: "Unable to load the question bank." });
  }
});

router.post("/:userId/questions", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    const { subject, questionText, questionType = "SHORT_ANSWER", options = [] } = req.body;
    if (!subject?.trim() || !questionText?.trim() || !["SHORT_ANSWER", "MCQ"].includes(questionType)) {
      return res.status(400).json({ message: "Subject, question text, and a valid question type are required." });
    }
    const result = await pool.query(
      "INSERT INTO FACULTY_QUESTIONS (FACULTY_ID, SUBJECT, QUESTION_TEXT, QUESTION_TYPE, OPTIONS_JSON) VALUES (?, ?, ?, ?, ?)",
      [faculty.FACULTY_ID, subject.trim(), questionText.trim(), questionType, JSON.stringify(options)],
    );
    res.status(201).json({ id: Number(result.insertId), message: "Question added." });
  } catch (error) {
    console.error("Create faculty question error:", error);
    res.status(500).json({ message: "Unable to add question." });
  }
});

router.delete("/:userId/questions/:questionId", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    const result = await pool.query(
      "DELETE FROM FACULTY_QUESTIONS WHERE QUESTION_ID = ? AND FACULTY_ID = ?",
      [req.params.questionId, faculty.FACULTY_ID],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Question not found." });
    res.json({ message: "Question deleted." });
  } catch (error) {
    console.error("Delete faculty question error:", error);
    res.status(500).json({ message: "Unable to delete question." });
  }
});

router.get("/:userId/forms", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    res.json(await pool.query(
      "SELECT FORM_ID, TITLE, QUESTIONS_JSON, STATUS, CREATED_AT, UPDATED_AT FROM FACULTY_FORMS WHERE FACULTY_ID = ? ORDER BY UPDATED_AT DESC",
      [faculty.FACULTY_ID],
    ));
  } catch (error) {
    console.error("Faculty forms error:", error);
    res.status(500).json({ message: "Unable to load forms." });
  }
});

router.post("/:userId/forms", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    const { title, questions, status = "DRAFT" } = req.body;
    if (!title?.trim() || !Array.isArray(questions) || !["DRAFT", "PUBLISHED"].includes(status)) {
      return res.status(400).json({ message: "Title, questions, and a valid status are required." });
    }
    const result = await pool.query(
      "INSERT INTO FACULTY_FORMS (FACULTY_ID, TITLE, QUESTIONS_JSON, STATUS) VALUES (?, ?, ?, ?)",
      [faculty.FACULTY_ID, title.trim(), JSON.stringify(questions), status],
    );
    res.status(201).json({ id: Number(result.insertId), message: "Form saved." });
  } catch (error) {
    console.error("Create faculty form error:", error);
    res.status(500).json({ message: "Unable to save form." });
  }
});

router.post("/:userId/reward-requests", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    const { courseId, studentId, policyId, amount, reason, evidenceReference = "" } = req.body || {};
    if (!Number.isSafeInteger(Number(courseId)) || !Number.isSafeInteger(Number(studentId))
      || !Number.isSafeInteger(Number(policyId)) || !Number.isFinite(Number(amount)) || Number(amount) <= 0
      || !reason?.trim()) {
      return res.status(400).json({ message: "Course, student, policy, positive amount, and reason are required." });
    }
    const assignedCourse = await pool.query(
      "SELECT COURSE_ID FROM COURSES WHERE COURSE_ID = ? AND FACULTY_ID = ? AND IS_ACTIVE = 1",
      [courseId, faculty.FACULTY_ID],
    );
    if (!assignedCourse.length) return res.status(403).json({ message: "Reward requests are limited to your assigned courses." });
    const enrollment = await pool.query(
      `SELECT S.STUDENT_ID, S.PROGRAM_ID, S.CURRENT_SEMESTER
       FROM COURSE_REGISTRATIONS R JOIN STUDENTS S ON S.STUDENT_ID = R.STUDENT_ID
       WHERE R.COURSE_ID = ? AND R.STUDENT_ID = ? AND R.STATUS = 'REGISTERED' AND S.STATUS = 'ACTIVE'`,
      [courseId, studentId],
    );
    if (!enrollment.length) return res.status(403).json({ message: "Reward requests are limited to students enrolled in your course." });
    const policies = await pool.query(
      `SELECT POLICY_ID, PER_STUDENT_CAP FROM WALLET_REWARD_POLICIES
       WHERE POLICY_ID = ? AND STATUS = 'ACTIVE'
         AND (PROGRAM_ID IS NULL OR PROGRAM_ID = ?)
         AND (SEMESTER IS NULL OR SEMESTER = ?)
         AND (EXPIRES_AT IS NULL OR EXPIRES_AT >= CURRENT_DATE)`,
      [policyId, enrollment[0].PROGRAM_ID, enrollment[0].CURRENT_SEMESTER],
    );
    if (!policies.length) return res.status(404).json({ message: "No active policy applies to this student." });
    if (Number(amount) > Number(policies[0].PER_STUDENT_CAP)) return res.status(400).json({ message: "Requested reward exceeds the policy's per-student cap." });
    const result = await pool.query(
      `INSERT INTO WALLET_REWARD_REQUESTS
        (POLICY_ID, STUDENT_ID, COURSE_ID, REQUESTED_BY, AMOUNT, REASON, EVIDENCE_REFERENCE)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [policyId, studentId, courseId, req.auth.userId, amount, reason.trim(), evidenceReference.trim() || null],
    );
    return res.status(201).json({ requestId: Number(result.insertId), message: "Reward request submitted for approval." });
  } catch (error) {
    console.error("Faculty reward request error:", error);
    return res.status(500).json({ message: "Unable to submit reward request." });
  }
});

router.get("/:userId/reward-policies", async (req, res) => {
  try {
    const faculty = await requireFaculty(req, res);
    if (!faculty) return;
    const rows = await pool.query(
      `SELECT POLICY_ID, POLICY_NAME, PERIOD_CODE, PROGRAM_ID, SEMESTER, PER_STUDENT_CAP
       FROM WALLET_REWARD_POLICIES
       WHERE STATUS = 'ACTIVE' AND (EXPIRES_AT IS NULL OR EXPIRES_AT >= CURRENT_DATE)
       ORDER BY POLICY_NAME`,
    );
    return res.json(rows);
  } catch (error) {
    console.error("Faculty reward policy list error:", error);
    return res.status(500).json({ message: "Unable to load reward policies." });
  }
});

module.exports = router;
