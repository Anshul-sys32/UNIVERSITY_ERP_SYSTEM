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

module.exports = router;
