const express = require("express");
const router = express.Router();
const pool = require("../db");
const studentFields = [
  "ROLL_NUMBER", "ADMISSION_NUMBER", "FIRST_NAME", "LAST_NAME", "GENDER", "DOB",
  "EMAIL", "PHONE_NUMBER", "ADDRESS_PERMANENT", "ADDRESS_CURRENT", "PROGRAM_ID",
  "DEPARTMENT_ID", "BATCH_YEAR", "CURRENT_SEMESTER", "ADMISSION_DATE",
  "PARENT_GUARDIAN_NAME", "PARENT_GUARDIAN_PHONE", "PHOTO_URL", "USER_ID", "STATUS",
];

const pickFields = (data) => Object.fromEntries(
  Object.entries(data).filter(([key]) => studentFields.includes(key)),
);

// Get all students
router.get("/", async (req, res) => {
  try {
    const students = await pool.query("SELECT * FROM STUDENTS ORDER BY STUDENT_ID DESC");
    res.json(students);
  } catch (error) {
    console.error("List students error:", error);
    res.status(500).json({ message: "Unable to load students." });
  }
});

// Add a new student
router.post("/", async (req, res) => {
  try {
    const data = pickFields(req.body);
    if (!data.FIRST_NAME || !data.EMAIL) {
      return res.status(400).json({ message: "First name and email are required." });
    }
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => "?").join(", ");
    const result = await pool.query(
      `INSERT INTO STUDENTS (${keys.join(", ")}) VALUES (${placeholders})`,
      values,
    );
    res.status(201).json({ id: Number(result.insertId), message: "Student added." });
  } catch (error) {
    console.error("Add student error:", error);
    res.status(500).json({ message: "Unable to add student." });
  }
});

// Update a student
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = pickFields(req.body);
    const entries = Object.entries(data);
    if (!entries.length) {
      return res.status(400).json({ message: "No valid student fields supplied." });
    }
    const updates = entries.map(([key]) => `${key} = ?`).join(", ");
    const result = await pool.query(
      `UPDATE STUDENTS SET ${updates} WHERE STUDENT_ID = ?`,
      [...entries.map(([, value]) => value), id],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Student not found." });
    res.json({ message: "Student updated." });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({ message: "Unable to update student." });
  }
});

// Delete a student
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM STUDENTS WHERE STUDENT_ID = ?", [id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Student not found." });
    res.json({ message: "Student deleted." });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ message: "Unable to delete student." });
  }
});

module.exports = router;
