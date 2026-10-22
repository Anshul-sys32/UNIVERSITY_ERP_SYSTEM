const express = require("express");
const pool = require("../db");

const router = express.Router();

const studentIdFor = async (userId) => {
  const rows = await pool.query("SELECT STUDENT_ID FROM STUDENTS WHERE USER_ID = ? AND STATUS = 'ACTIVE'", [userId]);
  return rows[0]?.STUDENT_ID || null;
};

router.get("/:userId/hostel", async (req, res) => {
  try {
    const studentId = await studentIdFor(req.auth.userId);
    if (!studentId) return res.status(404).json({ message: "No active student record is linked to this account." });
    const [buildings, applications, allocations, maintenance] = await Promise.all([
      pool.query("SELECT BUILDING_ID, NAME FROM HOSTEL_BUILDINGS WHERE STATUS = 'ACTIVE' ORDER BY NAME"),
      pool.query("SELECT APPLICATION_ID, ACADEMIC_YEAR, STATUS, CREATED_AT FROM HOSTEL_APPLICATIONS WHERE STUDENT_ID = ? ORDER BY CREATED_AT DESC", [studentId]),
      pool.query(`SELECT A.ALLOCATION_ID, A.BED_NUMBER, A.STATUS, B.ROOM_NUMBER, H.NAME AS BUILDING_NAME
        FROM HOSTEL_ALLOCATIONS A JOIN HOSTEL_ROOMS B ON B.ROOM_ID = A.ROOM_ID
        JOIN HOSTEL_BUILDINGS H ON H.BUILDING_ID = B.BUILDING_ID
        WHERE A.STUDENT_ID = ? ORDER BY A.ALLOCATION_ID DESC`, [studentId]),
      pool.query(`SELECT REQUEST_ID, CATEGORY, DESCRIPTION, STATUS, CREATED_AT
        FROM HOSTEL_MAINTENANCE_REQUESTS WHERE STUDENT_ID = ? ORDER BY CREATED_AT DESC`, [studentId]),
    ]);
    return res.json({ buildings, applications, allocations, maintenance });
  } catch (error) {
    console.error("Student hostel overview error:", error);
    return res.status(500).json({ message: "Unable to load hostel information." });
  }
});

router.post("/:userId/hostel/applications", async (req, res) => {
  const { academicYear, preferredBuildingId = null, reason = "" } = req.body || {};
  if (!/^\d{4}-\d{4}$/.test(academicYear || "") || typeof reason !== "string") {
    return res.status(400).json({ message: "Academic year and an optional reason are required." });
  }
  try {
    const studentId = await studentIdFor(req.auth.userId);
    if (!studentId) return res.status(404).json({ message: "No active student record is linked to this account." });
    const active = await pool.query("SELECT ALLOCATION_ID FROM HOSTEL_ALLOCATIONS WHERE STUDENT_ID = ? AND STATUS = 'ACTIVE'", [studentId]);
    if (active.length) return res.status(409).json({ message: "An active hostel allocation already exists." });
    if (preferredBuildingId) {
      const buildings = await pool.query("SELECT BUILDING_ID FROM HOSTEL_BUILDINGS WHERE BUILDING_ID = ? AND STATUS = 'ACTIVE'", [preferredBuildingId]);
      if (!buildings.length) return res.status(400).json({ message: "Preferred building is not available." });
    }
    const result = await pool.query(
      `INSERT INTO HOSTEL_APPLICATIONS (STUDENT_ID, ACADEMIC_YEAR, PREFERRED_BUILDING_ID, REASON)
       VALUES (?, ?, ?, ?)`,
      [studentId, academicYear, preferredBuildingId || null, reason.trim()],
    );
    return res.status(201).json({ applicationId: Number(result.insertId), message: "Hostel application submitted for review." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "An application already exists for this academic year." });
    console.error("Hostel application error:", error);
    return res.status(500).json({ message: "Unable to submit hostel application." });
  }
});

router.post("/:userId/hostel/maintenance", async (req, res) => {
  const { category, description } = req.body || {};
  if (!category?.trim() || !description?.trim() || category.length > 80 || description.length > 1000) {
    return res.status(400).json({ message: "A category and description (up to 1000 characters) are required." });
  }
  try {
    const studentId = await studentIdFor(req.auth.userId);
    if (!studentId) return res.status(404).json({ message: "No active student record is linked to this account." });
    const allocations = await pool.query("SELECT ALLOCATION_ID FROM HOSTEL_ALLOCATIONS WHERE STUDENT_ID = ? AND STATUS = 'ACTIVE'", [studentId]);
    if (!allocations.length) return res.status(403).json({ message: "A current hostel allocation is required to submit a maintenance request." });
    const result = await pool.query(
      `INSERT INTO HOSTEL_MAINTENANCE_REQUESTS (STUDENT_ID, ALLOCATION_ID, CATEGORY, DESCRIPTION)
       VALUES (?, ?, ?, ?)`,
      [studentId, allocations[0].ALLOCATION_ID, category.trim(), description.trim()],
    );
    return res.status(201).json({ requestId: Number(result.insertId), message: "Maintenance request submitted." });
  } catch (error) {
    console.error("Hostel maintenance request error:", error);
    return res.status(500).json({ message: "Unable to submit maintenance request." });
  }
});

router.get("/:userId/research", async (req, res) => {
  try {
    const studentId = await studentIdFor(req.auth.userId);
    if (!studentId) return res.status(404).json({ message: "No active student record is linked to this account." });
    const rows = await pool.query(
      `SELECT P.PROJECT_ID, P.TITLE, P.DESCRIPTION, P.SUPERVISOR, P.APPLICATION_DEADLINE, P.CAPACITY,
        A.APPLICATION_ID, A.STATUS AS APPLICATION_STATUS,
        (SELECT COUNT(*) FROM RESEARCH_APPLICATIONS RA WHERE RA.PROJECT_ID = P.PROJECT_ID AND RA.STATUS = 'ACCEPTED') AS ACCEPTED_COUNT
       FROM RESEARCH_PROJECTS P LEFT JOIN RESEARCH_APPLICATIONS A
         ON A.PROJECT_ID = P.PROJECT_ID AND A.STUDENT_ID = ?
       WHERE P.STATUS = 'OPEN' AND P.APPLICATION_DEADLINE >= CURRENT_DATE
         AND (P.PROGRAM_ID IS NULL OR P.PROGRAM_ID = (SELECT PROGRAM_ID FROM STUDENTS WHERE STUDENT_ID = ?))
       ORDER BY P.APPLICATION_DEADLINE, P.TITLE`,
      [studentId, studentId],
    );
    return res.json(rows);
  } catch (error) {
    console.error("Research opportunities error:", error);
    return res.status(500).json({ message: "Unable to load research opportunities." });
  }
});

router.post("/:userId/research/:projectId/apply", async (req, res) => {
  const statement = req.body?.statement;
  if (typeof statement !== "string" || statement.trim().length < 20 || statement.length > 2000) {
    return res.status(400).json({ message: "A statement between 20 and 2000 characters is required." });
  }
  let connection;
  try {
    const studentId = await studentIdFor(req.auth.userId);
    if (!studentId) return res.status(404).json({ message: "No active student record is linked to this account." });
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const projects = await connection.query(
      `SELECT PROJECT_ID, PROGRAM_ID, CAPACITY, STATUS, (APPLICATION_DEADLINE < CURRENT_DATE) AS DEADLINE_PASSED
       FROM RESEARCH_PROJECTS WHERE PROJECT_ID = ? FOR UPDATE`,
      [req.params.projectId],
    );
    if (!projects.length || projects[0].STATUS !== "OPEN" || Number(projects[0].DEADLINE_PASSED)) {
      await connection.rollback();
      return res.status(409).json({ message: "This research opportunity is closed." });
    }
    const studentRows = await connection.query("SELECT PROGRAM_ID FROM STUDENTS WHERE STUDENT_ID = ? AND STATUS = 'ACTIVE'", [studentId]);
    if (!studentRows.length || (projects[0].PROGRAM_ID && Number(projects[0].PROGRAM_ID) !== Number(studentRows[0].PROGRAM_ID))) {
      await connection.rollback();
      return res.status(403).json({ message: "This research opportunity is not available to your program." });
    }
    const counts = await connection.query("SELECT COUNT(*) AS TOTAL FROM RESEARCH_APPLICATIONS WHERE PROJECT_ID = ? AND STATUS = 'ACCEPTED'", [req.params.projectId]);
    if (Number(counts[0].TOTAL) >= Number(projects[0].CAPACITY)) {
      await connection.rollback();
      return res.status(409).json({ message: "This project has reached its available team capacity." });
    }
    const result = await connection.query(
      `INSERT INTO RESEARCH_APPLICATIONS (PROJECT_ID, STUDENT_ID, STATEMENT)
       VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE STATEMENT = VALUES(STATEMENT), STATUS = 'SUBMITTED', REVIEWED_BY = NULL, REVIEWED_AT = NULL`,
      [req.params.projectId, studentId, statement.trim()],
    );
    await connection.commit();
    return res.status(201).json({ applicationId: Number(result.insertId || 0), message: "Research application submitted." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Research application error:", error);
    return res.status(500).json({ message: "Unable to submit research application." });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;