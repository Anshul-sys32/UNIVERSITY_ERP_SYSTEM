const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/:userId/courses", async (_req, res) => {
  try {
    res.json(await pool.query(
      `SELECT C.COURSE_ID, C.COURSE_CODE, C.TITLE, C.CREDITS, C.SEMESTER,
        C.DEPARTMENT, C.COURSE_TYPE, C.CAPACITY, C.IS_ACTIVE,
        F.USER_ID AS FACULTY_USER_ID, F.FIRST_NAME, F.LAST_NAME
       FROM COURSES C
       LEFT JOIN FACULTY F ON F.FACULTY_ID = C.FACULTY_ID
       ORDER BY C.SEMESTER, C.COURSE_CODE`,
    ));
  } catch (error) {
    console.error("Admin course listing error:", error);
    res.status(500).json({ message: "Unable to load courses." });
  }
});

router.post("/:userId/courses", async (req, res) => {
  try {
    const {
      courseCode,
      title,
      credits,
      semester,
      department = "",
      courseType = "CORE",
      capacity = 60,
      facultyUserId = null,
    } = req.body;

    if (!courseCode?.trim() || !title?.trim() || !Number.isFinite(Number(credits))
      || !Number.isInteger(Number(semester)) || Number(semester) < 1
      || !Number.isInteger(Number(capacity)) || Number(capacity) < 1
      || !["CORE", "ELECTIVE", "OPEN_ELECTIVE"].includes(courseType)) {
      return res.status(400).json({
        message: "Course code, title, credits, semester, capacity, and a valid course type are required.",
      });
    }

    let facultyId = null;
    if (facultyUserId !== null && facultyUserId !== "") {
      const faculty = await pool.query(
        "SELECT FACULTY_ID FROM FACULTY F JOIN USERS U ON U.USER_ID = F.USER_ID WHERE U.USER_ID = ? AND U.ROLE = 'FACULTY' AND U.IS_ACTIVE = 1 AND F.STATUS = 'ACTIVE'",
        [facultyUserId],
      );
      if (!faculty.length) return res.status(404).json({ message: "Active faculty user was not found." });
      facultyId = faculty[0].FACULTY_ID;
    }

    const duplicate = await pool.query(
      "SELECT COURSE_ID FROM COURSES WHERE COURSE_CODE = ?",
      [courseCode.trim()],
    );
    if (duplicate.length) return res.status(409).json({ message: "A course with this code already exists." });

    const result = await pool.query(
      `INSERT INTO COURSES
        (COURSE_CODE, TITLE, CREDITS, SEMESTER, DEPARTMENT, COURSE_TYPE, FACULTY_ID, CAPACITY)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseCode.trim(), title.trim(), credits, semester, department.trim(),
        courseType, facultyId, capacity,
      ],
    );
    res.status(201).json({ courseId: Number(result.insertId), message: "Course created successfully." });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ message: "Unable to create course." });
  }
});

router.patch("/:userId/courses/:courseId/assign", async (req, res) => {
  try {
    const { facultyUserId } = req.body;
    const faculty = await pool.query(
      "SELECT FACULTY_ID FROM FACULTY F JOIN USERS U ON U.USER_ID = F.USER_ID WHERE U.USER_ID = ? AND U.ROLE = 'FACULTY' AND U.IS_ACTIVE = 1 AND F.STATUS = 'ACTIVE'",
      [facultyUserId],
    );
    if (!faculty.length) return res.status(404).json({ message: "Active faculty user was not found." });
    const result = await pool.query(
      "UPDATE COURSES SET FACULTY_ID = ? WHERE COURSE_ID = ?",
      [faculty[0].FACULTY_ID, req.params.courseId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Course not found." });
    res.json({ message: "Course assigned to faculty successfully." });
  } catch (error) {
    console.error("Assign course faculty error:", error);
    res.status(500).json({ message: "Unable to assign course faculty." });
  }
});

router.get("/:userId/registrations", async (_req, res) => {
  try {
    res.json(await pool.query(
      `SELECT R.REGISTRATION_ID, R.ACADEMIC_YEAR, R.STATUS, R.REGISTERED_AT,
        S.STUDENT_ID, S.ROLL_NUMBER, S.FIRST_NAME, S.LAST_NAME,
        C.COURSE_ID, C.COURSE_CODE, C.TITLE
       FROM COURSE_REGISTRATIONS R
       JOIN STUDENTS S ON S.STUDENT_ID = R.STUDENT_ID
       JOIN COURSES C ON C.COURSE_ID = R.COURSE_ID
       ORDER BY R.REGISTERED_AT DESC`,
    ));
  } catch (error) {
    console.error("Admin registration listing error:", error);
    res.status(500).json({ message: "Unable to load course registrations." });
  }
});

router.post("/:userId/registrations", async (req, res) => {
  try {
    const { rollNumber, courseId, academicYear } = req.body;
    if (!rollNumber?.trim() || !Number.isInteger(Number(courseId)) || !academicYear?.trim()) {
      return res.status(400).json({ message: "Student roll number, course, and academic year are required." });
    }
    const students = await pool.query(
      "SELECT STUDENT_ID, FIRST_NAME, LAST_NAME FROM STUDENTS WHERE ROLL_NUMBER = ? AND STATUS = 'ACTIVE'",
      [rollNumber.trim()],
    );
    if (!students.length) return res.status(404).json({ message: "Active student with that roll number was not found." });
    const courses = await pool.query(
      "SELECT COURSE_ID, CAPACITY FROM COURSES WHERE COURSE_ID = ? AND IS_ACTIVE = 1",
      [courseId],
    );
    if (!courses.length) return res.status(404).json({ message: "Active course was not found." });
    const duplicate = await pool.query(
      "SELECT REGISTRATION_ID FROM COURSE_REGISTRATIONS WHERE COURSE_ID = ? AND STUDENT_ID = ? AND ACADEMIC_YEAR = ?",
      [courseId, students[0].STUDENT_ID, academicYear.trim()],
    );
    if (duplicate.length) return res.status(409).json({ message: "Student is already registered for this course and academic year." });
    const count = await pool.query(
      "SELECT COUNT(*) AS TOTAL FROM COURSE_REGISTRATIONS WHERE COURSE_ID = ? AND ACADEMIC_YEAR = ? AND STATUS = 'REGISTERED'",
      [courseId, academicYear.trim()],
    );
    if (Number(count[0]?.TOTAL || 0) >= Number(courses[0].CAPACITY)) {
      return res.status(409).json({ message: "Course registration capacity has been reached." });
    }
    const result = await pool.query(
      "INSERT INTO COURSE_REGISTRATIONS (COURSE_ID, STUDENT_ID, ACADEMIC_YEAR) VALUES (?, ?, ?)",
      [courseId, students[0].STUDENT_ID, academicYear.trim()],
    );
    res.status(201).json({ registrationId: Number(result.insertId), message: "Student assigned to course." });
  } catch (error) {
    console.error("Admin course registration error:", error);
    res.status(500).json({ message: "Unable to assign course to student." });
  }
});

router.patch("/:userId/registrations/:registrationId/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["REGISTERED", "DROPPED", "COMPLETED"].includes(status)) {
      return res.status(400).json({ message: "Invalid registration status." });
    }
    const result = await pool.query(
      "UPDATE COURSE_REGISTRATIONS SET STATUS = ? WHERE REGISTRATION_ID = ?",
      [status, req.params.registrationId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Registration not found." });
    res.json({ message: "Registration status updated." });
  } catch (error) {
    console.error("Registration status error:", error);
    res.status(500).json({ message: "Unable to update registration status." });
  }
});

const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const validTime = (value) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
const validateTimetableSlot = (body = {}) => {
  const { courseId, dayOfWeek, startTime, endTime, room = "" } = body;
  if (!Number.isInteger(Number(courseId)) || Number(courseId) < 1
    || !daysOfWeek.includes(dayOfWeek) || !validTime(startTime) || !validTime(endTime)
    || startTime >= endTime || typeof room !== "string" || room.length > 80) {
    return "Select a course, weekday, valid start and end times, and a room no longer than 80 characters.";
  }
  return null;
};

router.get("/:userId/timetable-targets", async (req, res) => {
  const audience = String(req.query.audience || "").toLowerCase();
  if (!["student", "faculty"].includes(audience)) {
    return res.status(400).json({ message: "Audience must be student or faculty." });
  }
  try {
    const rows = audience === "student"
      ? await pool.query(
        `SELECT DISTINCT U.USER_ID, U.USERNAME, S.STUDENT_ID, S.ROLL_NUMBER,
          S.FIRST_NAME, S.LAST_NAME
         FROM USERS U JOIN STUDENTS S ON S.USER_ID = U.USER_ID
         JOIN COURSE_REGISTRATIONS R ON R.STUDENT_ID = S.STUDENT_ID AND R.STATUS = 'REGISTERED'
         WHERE U.ROLE = 'STUDENT' AND U.IS_ACTIVE = 1 AND S.STATUS = 'ACTIVE'
         ORDER BY S.ROLL_NUMBER`,
      )
      : await pool.query(
        `SELECT U.USER_ID, U.USERNAME, F.FACULTY_ID, F.FIRST_NAME, F.LAST_NAME, F.DEPARTMENT
         FROM USERS U JOIN FACULTY F ON F.USER_ID = U.USER_ID
         WHERE U.ROLE = 'FACULTY' AND U.IS_ACTIVE = 1 AND F.STATUS = 'ACTIVE'
         ORDER BY F.FIRST_NAME, F.LAST_NAME`,
      );
    return res.json(rows);
  } catch (error) {
    console.error("Admin timetable audience listing error:", error);
    return res.status(500).json({ message: "Unable to load timetable users." });
  }
});

router.get("/:userId/timetable-slots", async (req, res) => {
  const { audience, targetId, courseId } = req.query;
  if (audience && !["student", "faculty"].includes(audience)) {
    return res.status(400).json({ message: "Audience must be student or faculty." });
  }
  if (audience && (!Number.isInteger(Number(targetId)) || Number(targetId) < 1)) {
    return res.status(400).json({ message: "A valid student or faculty user ID is required." });
  }
  try {
    let audienceJoin = "";
    let audienceWhere = "";
    const params = [];
    if (audience === "student") {
      audienceJoin = `JOIN COURSE_REGISTRATIONS TR ON TR.COURSE_ID = C.COURSE_ID AND TR.STATUS = 'REGISTERED'
        JOIN STUDENTS TS ON TS.STUDENT_ID = TR.STUDENT_ID`;
      audienceWhere = " AND TS.USER_ID = ?";
      params.push(targetId);
    } else if (audience === "faculty") {
      audienceWhere = " AND FU.USER_ID = ?";
      params.push(targetId);
    }
    if (courseId !== undefined) {
      if (!Number.isInteger(Number(courseId)) || Number(courseId) < 1) return res.status(400).json({ message: "A valid course ID is required." });
      audienceWhere += " AND C.COURSE_ID = ?";
      params.push(courseId);
    }
    const rows = await pool.query(
      `SELECT DISTINCT T.SLOT_ID, T.COURSE_ID, T.DAY_OF_WEEK, T.START_TIME, T.END_TIME, T.ROOM,
        C.COURSE_CODE, C.TITLE, C.SEMESTER, C.IS_ACTIVE,
        FU.USER_ID AS FACULTY_USER_ID, FU.FIRST_NAME AS FACULTY_FIRST_NAME, FU.LAST_NAME AS FACULTY_LAST_NAME,
        (SELECT COUNT(*) FROM COURSE_REGISTRATIONS CR WHERE CR.COURSE_ID = C.COURSE_ID AND CR.STATUS = 'REGISTERED') AS REGISTERED_STUDENTS
       FROM TIMETABLE_SLOTS T
       JOIN COURSES C ON C.COURSE_ID = T.COURSE_ID
       LEFT JOIN FACULTY FU ON FU.FACULTY_ID = C.FACULTY_ID
       ${audienceJoin}
       WHERE 1 = 1${audienceWhere}
       ORDER BY FIELD(T.DAY_OF_WEEK, 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'), T.START_TIME, C.COURSE_CODE`,
      params,
    );
    return res.json(rows);
  } catch (error) {
    console.error("Admin timetable listing error:", error);
    return res.status(500).json({ message: "Unable to load timetable slots." });
  }
});

router.post("/:userId/timetable-slots", async (req, res) => {
  const validationError = validateTimetableSlot(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  const { courseId, dayOfWeek, startTime, endTime, room = "" } = req.body;
  try {
    const courses = await pool.query("SELECT COURSE_ID FROM COURSES WHERE COURSE_ID = ?", [courseId]);
    if (!courses.length) return res.status(404).json({ message: "Course not found." });
    const result = await pool.query(
      `INSERT INTO TIMETABLE_SLOTS (COURSE_ID, DAY_OF_WEEK, START_TIME, END_TIME, ROOM)
       VALUES (?, ?, ?, ?, ?)`,
      [courseId, dayOfWeek, startTime, endTime, room.trim() || null],
    );
    return res.status(201).json({ slotId: Number(result.insertId), message: "Timetable slot created." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "This course already has a slot starting at that time on that weekday." });
    console.error("Admin timetable create error:", error);
    return res.status(500).json({ message: "Unable to create timetable slot." });
  }
});

router.put("/:userId/timetable-slots/:slotId", async (req, res) => {
  const validationError = validateTimetableSlot(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  const { courseId, dayOfWeek, startTime, endTime, room = "" } = req.body;
  try {
    const result = await pool.query(
      `UPDATE TIMETABLE_SLOTS SET COURSE_ID = ?, DAY_OF_WEEK = ?, START_TIME = ?, END_TIME = ?, ROOM = ?
       WHERE SLOT_ID = ?`,
      [courseId, dayOfWeek, startTime, endTime, room.trim() || null, req.params.slotId],
    );
    if (!result.affectedRows) {
      const existing = await pool.query("SELECT SLOT_ID FROM TIMETABLE_SLOTS WHERE SLOT_ID = ?", [req.params.slotId]);
      if (!existing.length) return res.status(404).json({ message: "Timetable slot not found." });
    }
    return res.json({ message: "Timetable slot updated." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "This course already has a slot starting at that time on that weekday." });
    console.error("Admin timetable update error:", error);
    return res.status(500).json({ message: "Unable to update timetable slot." });
  }
});

router.delete("/:userId/timetable-slots/:slotId", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM TIMETABLE_SLOTS WHERE SLOT_ID = ?", [req.params.slotId]);
    if (!result.affectedRows) return res.status(404).json({ message: "Timetable slot not found." });
    return res.json({ message: "Timetable slot deleted." });
  } catch (error) {
    console.error("Admin timetable delete error:", error);
    return res.status(500).json({ message: "Unable to delete timetable slot." });
  }
});

module.exports = router;
