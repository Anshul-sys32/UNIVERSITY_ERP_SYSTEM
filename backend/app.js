const crypto = require("node:crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const session = require("express-session");
const pool = require("./db");
const MariaDbSessionStore = require("./sessionStore");
const csrfProtection = require("./middleware/csrf");
const roleAccess = require("./middleware/roleAccess");
const studentRoutes = require("./routes/students");
const studentDataRoutes = require("./routes/studentData");
const facultyDataRoutes = require("./routes/facultyData");
const employeeDataRoutes = require("./routes/employeeData");
const operationsDataRoutes = require("./routes/operationsData");
const academicDataRoutes = require("./routes/academicData");

const ALL_ROLES = ["STUDENT", "FACULTY", "EMPLOYEE", "ADMIN", "LIBRARIAN", "ACCOUNTANT"];
const COOKIE_NAME = "erp.sid";

const createApp = ({
  database = pool,
  sessionStore = new MariaDbSessionStore(database),
  sessionSecret = process.env.SESSION_SECRET,
  frontendOrigins = process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  production = process.env.NODE_ENV === "production",
} = {}) => {
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be set to a random value of at least 32 characters.");
  }

  const app = express();
  const allowedOrigins = new Set(frontendOrigins.split(",").map((origin) => origin.trim()).filter(Boolean));
  const cookieOptions = { httpOnly: true, secure: production, sameSite: "lax", path: "/" };
  const authorize = (roles, options = {}) => roleAccess(roles, { ...options, database });

  app.disable("x-powered-by");
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(session({
    name: COOKIE_NAME,
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { ...cookieOptions, maxAge: 30 * 60 * 1000 },
  }));
  app.use(csrfProtection);

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/csrf-token", (req, res) => {
    if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    res.json({ csrfToken: req.session.csrfToken });
  });
  app.get("/me", authorize(ALL_ROLES), (req, res) => {
    res.json({ user_id: req.auth.userId, username: req.auth.username, role: req.auth.role });
  });

  app.use("/students", authorize(["ADMIN"]), studentRoutes);
  app.use("/student-data", authorize(["STUDENT"], { matchPathUserId: true }), studentDataRoutes);
  app.use("/faculty-data", (req, res, next) => {
    const isProvisioning = req.method === "POST" && req.path === "/profiles";
    return authorize(isProvisioning ? ["ADMIN"] : ["FACULTY"], {
      matchPathUserId: !isProvisioning,
    })(req, res, next);
  }, facultyDataRoutes);
  app.use("/employee-data", authorize(["EMPLOYEE", "ADMIN", "LIBRARIAN", "ACCOUNTANT"], { matchPathUserId: true }), employeeDataRoutes);
  app.use("/operations-data", authorize(["EMPLOYEE", "ADMIN", "LIBRARIAN", "ACCOUNTANT"], { matchPathUserId: true }), operationsDataRoutes);
  app.use("/academic-data", authorize(["ADMIN"], { matchPathUserId: true }), academicDataRoutes);

  app.post("/login", async (req, res, next) => {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    try {
      const users = await database.query(
        "SELECT USER_ID, USERNAME, PASSWORD_HASH, ROLE FROM USERS WHERE USERNAME = ? AND IS_ACTIVE = 1",
        [username.trim()],
      );
      const user = users[0];
      if (!user?.PASSWORD_HASH || !(await bcrypt.compare(password, user.PASSWORD_HASH))) {
        return res.status(401).json({ message: "Invalid username or password." });
      }

      await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
      req.session.userId = Number(user.USER_ID);
      req.session.csrfToken = crypto.randomBytes(32).toString("hex");
      await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
      return res.json({ user_id: Number(user.USER_ID), username: user.USERNAME, role: user.ROLE, csrfToken: req.session.csrfToken });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/logout", (req, res, next) => {
    if (!req.session?.userId) {
      res.clearCookie(COOKIE_NAME, cookieOptions);
      return res.status(204).end();
    }
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie(COOKIE_NAME, cookieOptions);
      return res.status(204).end();
    });
  });

  app.post("/register", async (req, res, next) => {
    const { username, password, role } = req.body || {};
    if (role !== undefined && (typeof role !== "string" || role.toUpperCase() !== "STUDENT")) {
      return res.status(403).json({ message: "Public registration is limited to eligible student accounts." });
    }
    if (typeof username !== "string" || !username.trim() || typeof password !== "string" || password.length < 12) {
      return res.status(400).json({ message: "A student email and password of at least 12 characters are required." });
    }

    let connection;
    try {
      connection = await database.getConnection();
      await connection.beginTransaction();
      const students = await connection.query(
        "SELECT STUDENT_ID FROM STUDENTS WHERE EMAIL = ? AND USER_ID IS NULL AND STATUS = 'ACTIVE' FOR UPDATE",
        [username.trim()],
      );
      if (!students.length) {
        await connection.rollback();
        return res.status(403).json({ message: "No eligible student roster record matches that email." });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const result = await connection.query(
        "INSERT INTO USERS (USERNAME, PASSWORD_HASH, ROLE) VALUES (?, ?, 'STUDENT')",
        [username.trim(), passwordHash],
      );
      const update = await connection.query(
        "UPDATE STUDENTS SET USER_ID = ? WHERE STUDENT_ID = ? AND USER_ID IS NULL",
        [result.insertId, students[0].STUDENT_ID],
      );
      if (!update.affectedRows) {
        await connection.rollback();
        return res.status(409).json({ message: "This student record has already been linked to an account." });
      }
      await connection.commit();
      return res.status(201).json({ message: "Student account created. You can now sign in." });
    } catch (error) {
      if (connection) await connection.rollback();
      if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "An account already exists for that email." });
      return next(error);
    } finally {
      connection?.release();
    }
  });

  app.use((error, _req, res, _next) => {
    console.error("Unhandled server error:", error);
    res.status(500).json({ message: "Internal server error." });
  });

  return app;
};

module.exports = { createApp, COOKIE_NAME };