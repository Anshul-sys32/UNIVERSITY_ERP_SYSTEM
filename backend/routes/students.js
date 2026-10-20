const express = require("express");
const router = express.Router();
const pool = require("../db");

// Get all students
router.get("/", async (req, res) => {
  const conn = await pool.getConnection();
  const students = await conn.query("SELECT * FROM STUDENTS");
  conn.release();
  res.json(students);
});

// Add a new student
router.post("/", async (req, res) => {
  const data = req.body;
  const conn = await pool.getConnection();

  const keys = Object.keys(data).join(", ");
  const values = Object.values(data);
  const placeholders = values.map(() => "?").join(", ");

  await conn.query(`INSERT INTO STUDENTS (${keys}) VALUES (${placeholders})`, values);
  conn.release();
  res.status(201).json({ message: "Student added." });
});

// Update a student
router.put("/:id", async (req, res) => {
  const conn = await pool.getConnection();
  const { id } = req.params;
  const data = req.body;

  const updates = Object.entries(data).map(([key]) => `${key} = ?`).join(", ");
  const values = [...Object.values(data), id];

  await conn.query(`UPDATE STUDENTS SET ${updates} WHERE STUDENT_ID = ?`, values);
  conn.release();
  res.json({ message: "Student updated." });
});

// Delete a student
router.delete("/:id", async (req, res) => {
  const conn = await pool.getConnection();
  const { id } = req.params;
  await conn.query("DELETE FROM STUDENTS WHERE STUDENT_ID = ?", [id]);
  conn.release();
  res.json({ message: "Student deleted." });
});

module.exports = router;
