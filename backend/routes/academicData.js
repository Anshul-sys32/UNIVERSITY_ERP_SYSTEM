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

module.exports = router;
