const crypto = require("node:crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const session = require("express-session");
const { rateLimit } = require("express-rate-limit");
const pool = require("./db");
const MariaDbSessionStore = require("./sessionStore");
const csrfProtection = require("./middleware/csrf");
const roleAccess = require("./middleware/roleAccess");
const auditLog = require("./middleware/auditLog");
const studentRoutes = require("./routes/students");
const studentDataRoutes = require("./routes/studentData");
const facultyDataRoutes = require("./routes/facultyData");
const employeeDataRoutes = require("./routes/employeeData");
const operationsDataRoutes = require("./routes/operationsData");
const academicDataRoutes = require("./routes/academicData");
const examAdminRoutes = require("./routes/examAdmin");

const ALL_ROLES = ["STUDENT", "FACULTY", "EMPLOYEE", "ADMIN", "LIBRARIAN", "ACCOUNTANT", "MERCHANT"];
const COOKIE_NAME = "erp.sid";

const createApp = ({
  database = pool,
  sessionStore = new MariaDbSessionStore(database),
  sessionSecret = process.env.SESSION_SECRET,
  frontendOrigins = process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  production = process.env.NODE_ENV === "production",
  mockPaymentsEnabled,
} = {}) => {
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be set to a random value of at least 32 characters.");
  }

  const app = express();
  const allowedOrigins = new Set(frontendOrigins.split(",").map((origin) => origin.trim()).filter(Boolean));
  const cookieOptions = { httpOnly: true, secure: production, sameSite: "lax", path: "/" };
  const authorize = (roles, options = {}) => roleAccess(roles, { ...options, database });
  const pathSections = (req) => String(req.path).split("/").filter(Boolean);
  const moduleForStudent = (req) => {
    const sections = pathSections(req);
    const sectionMap = {
      profile: "student_profile", dashboard: "student_profile",
      assignments: "student_academics", courses: "student_academics", timetable: "student_academics", attendance: "student_academics",
      fees: "student_finance", library: "student_library",
      events: "student_placements", placements: "student_placements",
      "question-papers": "student_exams", results: "student_exams", exams: "student_exams", "exam-results": "student_exams",
      feedback: "student_support", announcements: "notifications",
    };
    const moduleKey = sections.map((section) => sectionMap[section]).find(Boolean);
    return moduleKey || "student_data";
  };
  const moduleForFaculty = (req) => {
    if (req.method === "POST" && pathSections(req).includes("profiles")) return "faculty_data";
    const sections = pathSections(req);
    if (sections.includes("questions")) return "faculty_questions";
    if (sections.some((section) => ["reward-requests", "reward-policies"].includes(section))) return "faculty_rewards";
    return "faculty_academics";
  };
  const moduleForEmployee = (req) => {
    const sections = pathSections(req);
    if (sections.includes("users")) return "user_admin";
    if (sections.includes("config")) return "dashboard_configuration";
    if (sections.includes("placements")) return "operations_placements";
    if (sections.includes("feedback")) return "employee_feedback";
    if (sections.includes("announcements")) return "announcements";
    return "employee_data";
  };
  const moduleForOperations = (req) => {
    const sectionMap = { accounting: "operations_accounting", library: "operations_library", placements: "operations_placements" };
    return pathSections(req).map((section) => sectionMap[section]).find(Boolean) || null;
  };
  const moduleForStudentCampus = (req) => pathSections(req).includes("research") ? "campus_research" : "campus_hostel";
  const moduleForCampusAdmin = (req) => pathSections(req).includes("research") ? "campus_admin_research" : "campus_admin_hostel";
  app.locals.mockPaymentsEnabled = mockPaymentsEnabled ?? (!production && process.env.MOCK_PAYMENTS_ENABLED !== "false");
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: production ? 10 : 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many authentication attempts. Try again later." },
  });

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
  app.use(auditLog(database));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/csrf-token", (req, res) => {
    if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    res.json({ csrfToken: req.session.csrfToken });
  });
  app.get("/me", authorize(ALL_ROLES), (req, res) => {
    res.json({ user_id: req.auth.userId, username: req.auth.username, role: req.auth.role });
  });
  app.get("/me/navigation", authorize(ALL_ROLES), async (req, res, next) => {
    try {
      const requestedRole = req.query.role ? String(req.query.role).toUpperCase() : req.auth.role;
      if (requestedRole !== req.auth.role && req.auth.role !== "ADMIN") {
        return res.status(403).json({ message: "Only administrators can preview another role's navigation." });
      }
      const [policies, overrides] = await Promise.all([database.query(
        `SELECT R.MODULE_KEY, COALESCE(U.ROW_SCOPE, R.ROW_SCOPE) AS ROW_SCOPE
         FROM ROLE_MODULE_POLICIES R
         LEFT JOIN USER_MODULE_POLICIES U ON U.MODULE_KEY = R.MODULE_KEY AND U.USER_ID = ?
         WHERE R.ROLE_NAME = ? AND COALESCE(U.CAN_READ, R.CAN_READ) = 1
           AND COALESCE(U.SIDEBAR_VISIBLE, R.SIDEBAR_VISIBLE) = 1 ORDER BY R.MODULE_KEY`,
        [requestedRole === req.auth.role ? req.auth.userId : 0, requestedRole],
      ), requestedRole === req.auth.role ? database.query(
        "SELECT MODULE_KEY, CAN_READ, SIDEBAR_VISIBLE, ROW_SCOPE FROM USER_MODULE_POLICIES WHERE USER_ID = ?",
        [req.auth.userId],
      ) : Promise.resolve([])]);
      const navigation = new Map(policies.map((policy) => [policy.MODULE_KEY, policy.ROW_SCOPE]));
      overrides.forEach((policy) => {
        if (Number(policy.CAN_READ) && Number(policy.SIDEBAR_VISIBLE)) navigation.set(policy.MODULE_KEY, policy.ROW_SCOPE);
        else navigation.delete(policy.MODULE_KEY);
      });
      res.json({ modules: [...navigation.keys()], scopes: Object.fromEntries(navigation) });
    } catch (error) { next(error); }
  });

  app.use("/students", authorize(ALL_ROLES, { module: "students" }), studentRoutes);
  app.use("/student-data", authorize(ALL_ROLES, { matchPathUserId: true, module: moduleForStudent }), studentDataRoutes);
  app.use("/campus-student", authorize(ALL_ROLES, { matchPathUserId: true, module: moduleForStudentCampus }), require("./routes/campusStudent"));
  app.use("/wallet-data", authorize(ALL_ROLES, { matchPathUserId: true, module: "wallet_data" }), require("./routes/walletStudent"));
  app.use("/merchant-data", authorize(ALL_ROLES, { matchPathUserId: true, module: "merchant_data" }), require("./routes/walletMerchant"));
  app.use("/faculty-data", (req, res, next) => {
    const isProvisioning = req.method === "POST" && req.path === "/profiles";
    return authorize(isProvisioning ? ["ADMIN"] : ALL_ROLES, { matchPathUserId: !isProvisioning, module: moduleForFaculty })(req, res, next);
  }, facultyDataRoutes);
  app.use("/employee-data", authorize(ALL_ROLES, { matchPathUserId: true, module: moduleForEmployee }), employeeDataRoutes);
  app.use("/operations-data", authorize(ALL_ROLES, { matchPathUserId: true, module: moduleForOperations }), operationsDataRoutes);
  app.use("/academic-data", authorize(ALL_ROLES, { matchPathUserId: true, module: "academic_data" }), academicDataRoutes);
  app.use("/exam-admin", authorize(ALL_ROLES, { matchPathUserId: true, module: "exam_admin" }), examAdminRoutes);
  app.use("/wallet-admin", authorize(ALL_ROLES, { matchPathUserId: true, module: "wallet_admin" }), require("./routes/walletAdmin"));
  app.use("/notifications", authorize(ALL_ROLES, { matchPathUserId: true, module: "notifications" }), require("./routes/notifications"));
  app.use("/reports", authorize(ALL_ROLES, { matchPathUserId: true, module: "reports" }), require("./routes/reports"));
  app.use("/campus-admin", authorize(ALL_ROLES, { matchPathUserId: true, module: moduleForCampusAdmin }), require("./routes/campusAdmin"));
  app.use("/access-admin", authorize(["ADMIN"]), require("./routes/accessAdmin")(database));
  app.use("/admin-data", authorize(["ADMIN"]), require("./routes/adminData")(database));

  app.post("/login", authLimiter, async (req, res, next) => {
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

  app.post("/register", authLimiter, async (req, res, next) => {
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