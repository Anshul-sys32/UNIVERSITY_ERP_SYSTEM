const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/:userId/hostel/buildings", async (_req, res) => {
  try {
    const rows = await pool.query(
      `SELECT B.BUILDING_ID, B.NAME, B.STATUS, COUNT(R.ROOM_ID) AS ROOM_COUNT
       FROM HOSTEL_BUILDINGS B LEFT JOIN HOSTEL_ROOMS R ON R.BUILDING_ID = B.BUILDING_ID
       GROUP BY B.BUILDING_ID ORDER BY B.NAME`,
    );
    return res.json(rows);
  } catch (error) {
    console.error("Hostel building list error:", error);
    return res.status(500).json({ message: "Unable to load hostel buildings." });
  }
});

router.get("/:userId/hostel/rooms", async (_req, res) => {
  try {
    const rows = await pool.query(
      `SELECT R.ROOM_ID, R.ROOM_NUMBER, R.CAPACITY, R.STATUS, B.NAME AS BUILDING_NAME,
        (SELECT COUNT(*) FROM HOSTEL_ALLOCATIONS A WHERE A.ROOM_ID = R.ROOM_ID AND A.STATUS = 'ACTIVE') AS OCCUPIED
       FROM HOSTEL_ROOMS R JOIN HOSTEL_BUILDINGS B ON B.BUILDING_ID = R.BUILDING_ID
       ORDER BY B.NAME, R.ROOM_NUMBER`,
    );
    return res.json(rows);
  } catch (error) {
    console.error("Hostel room list error:", error);
    return res.status(500).json({ message: "Unable to load hostel rooms." });
  }
});

router.post("/:userId/hostel/buildings", async (req, res) => {
  const name = req.body?.name;
  if (!name?.trim() || name.length > 140) return res.status(400).json({ message: "A building name is required." });
  try {
    const result = await pool.query("INSERT INTO HOSTEL_BUILDINGS (NAME) VALUES (?)", [name.trim()]);
    return res.status(201).json({ buildingId: Number(result.insertId), message: "Hostel building created." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "A building with that name already exists." });
    console.error("Hostel building create error:", error);
    return res.status(500).json({ message: "Unable to create hostel building." });
  }
});

router.post("/:userId/hostel/buildings/:buildingId/rooms", async (req, res) => {
  const { roomNumber, capacity } = req.body || {};
  if (!roomNumber?.trim() || !Number.isInteger(Number(capacity)) || Number(capacity) < 1 || Number(capacity) > 20) {
    return res.status(400).json({ message: "A room number and capacity from 1 to 20 are required." });
  }
  try {
    const result = await pool.query("INSERT INTO HOSTEL_ROOMS (BUILDING_ID, ROOM_NUMBER, CAPACITY) VALUES (?, ?, ?)", [req.params.buildingId, roomNumber.trim(), capacity]);
    return res.status(201).json({ roomId: Number(result.insertId), message: "Hostel room created." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "That room number already exists in this building." });
    console.error("Hostel room create error:", error);
    return res.status(500).json({ message: "Unable to create hostel room." });
  }
});

router.get("/:userId/hostel/applications", async (_req, res) => {
  try {
    const rows = await pool.query(
      `SELECT A.APPLICATION_ID, A.ACADEMIC_YEAR, A.REASON, A.STATUS, A.CREATED_AT,
        S.STUDENT_ID, S.ROLL_NUMBER, S.FIRST_NAME, S.LAST_NAME,
        B.NAME AS PREFERRED_BUILDING
       FROM HOSTEL_APPLICATIONS A JOIN STUDENTS S ON S.STUDENT_ID = A.STUDENT_ID
       LEFT JOIN HOSTEL_BUILDINGS B ON B.BUILDING_ID = A.PREFERRED_BUILDING_ID
       ORDER BY A.CREATED_AT`,
    );
    return res.json(rows);
  } catch (error) {
    console.error("Hostel application list error:", error);
    return res.status(500).json({ message: "Unable to load hostel applications." });
  }
});

router.post("/:userId/hostel/applications/:applicationId/review", async (req, res) => {
  const { decision, roomId, bedNumber } = req.body || {};
  if (!["APPROVE", "REJECT"].includes(decision)) return res.status(400).json({ message: "Review decision must be approve or reject." });
  if (decision === "APPROVE" && (!Number.isSafeInteger(Number(roomId)) || !Number.isInteger(Number(bedNumber)) || Number(bedNumber) < 1)) {
    return res.status(400).json({ message: "Room and positive bed number are required for an approval." });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const applications = await connection.query("SELECT * FROM HOSTEL_APPLICATIONS WHERE APPLICATION_ID = ? FOR UPDATE", [req.params.applicationId]);
    if (!applications.length || applications[0].STATUS !== "REQUESTED") {
      await connection.rollback();
      return res.status(404).json({ message: "Pending hostel application not found." });
    }
    const application = applications[0];
    if (decision === "REJECT") {
      await connection.query("UPDATE HOSTEL_APPLICATIONS SET STATUS = 'REJECTED', REVIEWED_BY = ?, REVIEWED_AT = CURRENT_TIMESTAMP WHERE APPLICATION_ID = ?", [req.auth.userId, application.APPLICATION_ID]);
      await connection.query(
        `INSERT INTO IN_APP_NOTIFICATIONS (USER_ID, TITLE, MESSAGE, NOTIFICATION_TYPE, RESOURCE_PATH)
         SELECT S.USER_ID, 'Hostel application reviewed', 'Your hostel application was not approved.', 'HOSTEL_UPDATE', '/erp/student/campus-services'
         FROM HOSTEL_APPLICATIONS A JOIN STUDENTS S ON S.STUDENT_ID = A.STUDENT_ID
         WHERE A.APPLICATION_ID = ? AND S.USER_ID IS NOT NULL`,
        [application.APPLICATION_ID],
      );
      await connection.commit();
      return res.json({ message: "Hostel application rejected." });
    }
    const rooms = await connection.query(
      `SELECT R.ROOM_ID, R.CAPACITY, R.STATUS FROM HOSTEL_ROOMS R
       JOIN HOSTEL_BUILDINGS B ON B.BUILDING_ID = R.BUILDING_ID
       WHERE R.ROOM_ID = ? AND B.STATUS = 'ACTIVE' FOR UPDATE`,
      [roomId],
    );
    if (!rooms.length || rooms[0].STATUS !== "ACTIVE" || Number(bedNumber) > Number(rooms[0].CAPACITY)) {
      await connection.rollback();
      return res.status(409).json({ message: "Room or bed is unavailable." });
    }
    const activeAllocations = await connection.query("SELECT ALLOCATION_ID FROM HOSTEL_ALLOCATIONS WHERE STUDENT_ID = ? AND STATUS = 'ACTIVE' FOR UPDATE", [application.STUDENT_ID]);
    if (activeAllocations.length) {
      await connection.rollback();
      return res.status(409).json({ message: "This student already has an active hostel allocation." });
    }
    const occupied = await connection.query("SELECT ALLOCATION_ID FROM HOSTEL_ALLOCATIONS WHERE ROOM_ID = ? AND BED_NUMBER = ? AND STATUS = 'ACTIVE'", [roomId, bedNumber]);
    if (occupied.length) {
      await connection.rollback();
      return res.status(409).json({ message: "That bed is already occupied." });
    }
    await connection.query(
      `INSERT INTO HOSTEL_ALLOCATIONS (APPLICATION_ID, STUDENT_ID, ROOM_ID, BED_NUMBER, CHECKED_IN_AT)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [application.APPLICATION_ID, application.STUDENT_ID, roomId, bedNumber],
    );
    await connection.query("UPDATE HOSTEL_APPLICATIONS SET STATUS = 'APPROVED', REVIEWED_BY = ?, REVIEWED_AT = CURRENT_TIMESTAMP WHERE APPLICATION_ID = ?", [req.auth.userId, application.APPLICATION_ID]);
    await connection.query(
      `INSERT INTO IN_APP_NOTIFICATIONS (USER_ID, TITLE, MESSAGE, NOTIFICATION_TYPE, RESOURCE_PATH)
       SELECT S.USER_ID, 'Hostel room allocated', 'Your hostel application was approved and a room was allocated.', 'HOSTEL_UPDATE', '/erp/student/campus-services'
       FROM HOSTEL_APPLICATIONS A JOIN STUDENTS S ON S.STUDENT_ID = A.STUDENT_ID
       WHERE A.APPLICATION_ID = ? AND S.USER_ID IS NOT NULL`,
      [application.APPLICATION_ID],
    );
    await connection.commit();
    return res.json({ message: "Hostel application approved and bed allocated." });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "The application or bed already has an allocation." });
    console.error("Hostel review error:", error);
    return res.status(500).json({ message: "Unable to review hostel application." });
  } finally {
    if (connection) connection.release();
  }
});

router.get("/:userId/hostel/maintenance", async (_req, res) => {
  try {
    const rows = await pool.query(
      `SELECT M.REQUEST_ID, M.CATEGORY, M.DESCRIPTION, M.STATUS, M.CREATED_AT,
        S.ROLL_NUMBER, S.FIRST_NAME, S.LAST_NAME, B.NAME AS BUILDING_NAME, R.ROOM_NUMBER
       FROM HOSTEL_MAINTENANCE_REQUESTS M
       JOIN STUDENTS S ON S.STUDENT_ID = M.STUDENT_ID
       JOIN HOSTEL_ALLOCATIONS A ON A.ALLOCATION_ID = M.ALLOCATION_ID
       JOIN HOSTEL_ROOMS R ON R.ROOM_ID = A.ROOM_ID
       JOIN HOSTEL_BUILDINGS B ON B.BUILDING_ID = R.BUILDING_ID
       ORDER BY M.CREATED_AT DESC`,
    );
    return res.json(rows);
  } catch (error) {
    console.error("Hostel maintenance list error:", error);
    return res.status(500).json({ message: "Unable to load maintenance requests." });
  }
});

router.patch("/:userId/hostel/maintenance/:requestId/status", async (req, res) => {
  const { status } = req.body || {};
  if (!["OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED"].includes(status)) return res.status(400).json({ message: "Invalid maintenance status." });
  try {
    const result = await pool.query("UPDATE HOSTEL_MAINTENANCE_REQUESTS SET STATUS = ? WHERE REQUEST_ID = ?", [status, req.params.requestId]);
    if (!result.affectedRows) return res.status(404).json({ message: "Maintenance request not found." });
    try {
      await pool.query(
        `INSERT INTO IN_APP_NOTIFICATIONS (USER_ID, TITLE, MESSAGE, NOTIFICATION_TYPE, RESOURCE_PATH)
         SELECT S.USER_ID, 'Hostel maintenance update', ?, 'HOSTEL_UPDATE', '/erp/student/campus-services'
         FROM HOSTEL_MAINTENANCE_REQUESTS M JOIN STUDENTS S ON S.STUDENT_ID = M.STUDENT_ID
         WHERE M.REQUEST_ID = ? AND S.USER_ID IS NOT NULL`,
        [`Your maintenance request status is now ${status.toLowerCase()}.`, req.params.requestId],
      );
    } catch (notificationError) {
      console.error("Hostel maintenance notification failed:", notificationError);
    }
    return res.json({ message: "Maintenance status updated." });
  } catch (error) {
    console.error("Hostel maintenance update error:", error);
    return res.status(500).json({ message: "Unable to update maintenance request." });
  }
});

router.post("/:userId/research/projects", async (req, res) => {
  const { title, description, supervisor = "", programId = null, applicationDeadline, capacity = 1 } = req.body || {};
  if (!title?.trim() || !description?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(applicationDeadline || "")
    || !Number.isInteger(Number(capacity)) || Number(capacity) < 1 || Number(capacity) > 100) {
    return res.status(400).json({ message: "Project details, deadline, and capacity from 1 to 100 are required." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO RESEARCH_PROJECTS (TITLE, DESCRIPTION, SUPERVISOR, PROGRAM_ID, APPLICATION_DEADLINE, CAPACITY, CREATED_BY)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), description.trim(), supervisor.trim(), programId || null, applicationDeadline, capacity, req.auth.userId],
    );
    return res.status(201).json({ projectId: Number(result.insertId), message: "Research opportunity created." });
  } catch (error) {
    console.error("Research project create error:", error);
    return res.status(500).json({ message: "Unable to create research opportunity." });
  }
});

router.get("/:userId/research/applications", async (_req, res) => {
  try {
    const rows = await pool.query(
      `SELECT A.APPLICATION_ID, A.STATEMENT, A.STATUS, A.CREATED_AT,
        P.PROJECT_ID, P.TITLE AS PROJECT_TITLE, S.STUDENT_ID, S.ROLL_NUMBER, S.FIRST_NAME, S.LAST_NAME
       FROM RESEARCH_APPLICATIONS A JOIN RESEARCH_PROJECTS P ON P.PROJECT_ID = A.PROJECT_ID
       JOIN STUDENTS S ON S.STUDENT_ID = A.STUDENT_ID ORDER BY A.CREATED_AT DESC`,
    );
    return res.json(rows);
  } catch (error) {
    console.error("Research application list error:", error);
    return res.status(500).json({ message: "Unable to load research applications." });
  }
});

router.patch("/:userId/research/applications/:applicationId/review", async (req, res) => {
  const { decision } = req.body || {};
  const status = { ACCEPT: "ACCEPTED", REJECT: "REJECTED", REVIEW: "UNDER_REVIEW" }[decision];
  if (!status) return res.status(400).json({ message: "A valid review decision is required." });
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const applications = await connection.query(
      "SELECT APPLICATION_ID, PROJECT_ID, STATUS FROM RESEARCH_APPLICATIONS WHERE APPLICATION_ID = ? FOR UPDATE",
      [req.params.applicationId],
    );
    if (!applications.length || !["SUBMITTED", "UNDER_REVIEW"].includes(applications[0].STATUS)) {
      await connection.rollback();
      return res.status(404).json({ message: "Reviewable research application not found." });
    }
    if (status === "ACCEPTED") {
      const projects = await connection.query("SELECT CAPACITY FROM RESEARCH_PROJECTS WHERE PROJECT_ID = ? FOR UPDATE", [applications[0].PROJECT_ID]);
      const accepted = await connection.query("SELECT COUNT(*) AS TOTAL FROM RESEARCH_APPLICATIONS WHERE PROJECT_ID = ? AND STATUS = 'ACCEPTED'", [applications[0].PROJECT_ID]);
      if (!projects.length || Number(accepted[0].TOTAL) >= Number(projects[0].CAPACITY)) {
        await connection.rollback();
        return res.status(409).json({ message: "The research project is already at capacity." });
      }
    }
    await connection.query(
      `UPDATE RESEARCH_APPLICATIONS SET STATUS = ?, REVIEWED_BY = ?, REVIEWED_AT = CURRENT_TIMESTAMP
       WHERE APPLICATION_ID = ?`,
      [status, req.auth.userId, req.params.applicationId],
    );
    await connection.query(
      `INSERT INTO IN_APP_NOTIFICATIONS (USER_ID, TITLE, MESSAGE, NOTIFICATION_TYPE, RESOURCE_PATH)
       SELECT S.USER_ID, 'Research application reviewed', ?, 'RESEARCH_UPDATE', '/erp/student/campus-services'
       FROM RESEARCH_APPLICATIONS A JOIN STUDENTS S ON S.STUDENT_ID = A.STUDENT_ID
       WHERE A.APPLICATION_ID = ? AND S.USER_ID IS NOT NULL`,
      [`Your research application was ${status.toLowerCase()}.`, req.params.applicationId],
    );
    await connection.commit();
    return res.json({ message: `Research application ${status.toLowerCase()}.` });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Research application review error:", error);
    return res.status(500).json({ message: "Unable to review research application." });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;