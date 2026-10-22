const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { test } = require("node:test");
const request = require("supertest");

const users = [
  { USER_ID: 1, USERNAME: "student.one@example.edu", ROLE: "STUDENT", IS_ACTIVE: 1 },
  { USER_ID: 2, USERNAME: "student.two@example.edu", ROLE: "STUDENT", IS_ACTIVE: 1 },
  { USER_ID: 3, USERNAME: "faculty.one@example.edu", ROLE: "FACULTY", IS_ACTIVE: 1 },
  { USER_ID: 4, USERNAME: "faculty.two@example.edu", ROLE: "FACULTY", IS_ACTIVE: 1 },
  { USER_ID: 5, USERNAME: "admin@example.edu", ROLE: "ADMIN", IS_ACTIVE: 1 },
];
const feeRows = [
  { source: "FEE_TRANSACTION", id: 10, studentId: 200, AMOUNT: "125.50", STATUS: "UNPAID", TRANSACTION_ID: null },
];
const paymentAttempts = [];
let nextPaymentId = 1;
const examSessions = [
  { EXAM_SESSION_ID: 30, COURSE_ID: 20, EXAM_CODE: "CS101-MID-2026", EXAM_TYPE: "Midterm", EXAM_DATE: "2026-12-10", START_TIME: "10:00:00", END_TIME: "12:00:00", VENUE: "Hall A", MAX_SCORE: 100, REGISTRATION_DEADLINE: "2026-12-01", STATUS: "OPEN" },
];
const examRegistrations = [];
const examMarks = [];
const auditEvents = [];
const placementApplications = [];
const policyOverrides = new Map();
const policyChecks = [];
const grants = {
  STUDENT: ["student_profile", "student_academics", "student_finance", "student_library", "student_placements", "student_exams", "student_support", "campus_student", "wallet_data", "notifications", "announcements"],
  FACULTY: ["faculty_data", "faculty_academics", "faculty_questions", "faculty_rewards", "notifications", "announcements"],
  EMPLOYEE: ["employee_data", "dashboard_configuration", "announcements", "employee_feedback", "operations_placements", "notifications"],
  ADMIN: ["admin_home", "students", "student_data", "student_profile", "student_academics", "student_finance", "student_library", "student_placements", "student_exams", "student_support", "employee_feedback", "announcements", "campus_student", "wallet_data", "faculty_data", "faculty_academics", "faculty_questions", "faculty_rewards", "employee_data", "dashboard_configuration", "user_admin", "operations_accounting", "operations_library", "operations_placements", "academic_data", "exam_admin", "wallet_admin", "campus_admin", "reports", "notifications", "access_admin"],
  LIBRARIAN: ["employee_data", "dashboard_configuration", "operations_library", "notifications"],
  ACCOUNTANT: ["employee_data", "dashboard_configuration", "operations_accounting", "notifications"],
  MERCHANT: ["merchant_data", "notifications"],
};

const passwordHash = bcrypt.hashSync("correct horse battery", 4);
const database = {
  async query(sql, params = []) {
    if (sql.includes("INSERT INTO AUDIT_EVENTS")) { auditEvents.push({ params }); return { insertId: auditEvents.length }; }
    if (sql.includes("FROM ROLE_MODULE_POLICIES WHERE ROLE_NAME = ? AND MODULE_KEY = ?")) {
      policyChecks.push([params[0], params[1]]);
      const key = `${params[0]}:${params[1]}`;
      if (policyOverrides.has(key)) return [policyOverrides.get(key)];
      const allowed = (grants[params[0]] || []).includes(params[1]);
      return allowed ? [{ CAN_READ: 1, CAN_WRITE: 1, ROW_SCOPE: params[0] === "FACULTY" ? "assigned_course" : "university", SIDEBAR_VISIBLE: 1 }] : [];
    }
    if (sql.includes("FROM ROLE_MODULE_POLICIES") && sql.includes("SIDEBAR_VISIBLE = 1")) {
      const role = params[0];
      const keys = new Set(grants[role] || []);
      for (const [key, policy] of policyOverrides.entries()) {
        const [policyRole, moduleKey] = key.split(":");
        if (policyRole === role && Number(policy.CAN_READ) && Number(policy.SIDEBAR_VISIBLE)) keys.add(moduleKey);
        if (policyRole === role && (!Number(policy.CAN_READ) || !Number(policy.SIDEBAR_VISIBLE))) keys.delete(moduleKey);
      }
      return [...keys].map((MODULE_KEY) => ({ MODULE_KEY, ROW_SCOPE: "self" }));
    }
    if (sql.includes("INSERT INTO ROLE_MODULE_POLICIES")) {
      policyOverrides.set(`${params[0]}:${params[1]}`, { CAN_READ: params[2], CAN_WRITE: params[3], ROW_SCOPE: params[4], SIDEBAR_VISIBLE: params[5] });
      return { affectedRows: 1 };
    }
    if (sql.includes("FROM USERS WHERE USERNAME =")) {
      return users.filter((user) => user.USERNAME === params[0] && user.IS_ACTIVE)
        .map((user) => ({ ...user, PASSWORD_HASH: passwordHash }));
    }
    if (sql.includes("FROM USERS WHERE USER_ID =")) {
      return users.filter((user) => user.USER_ID === Number(params[0]) && user.IS_ACTIVE)
        .map(({ USER_ID, USERNAME, ROLE }) => ({ USER_ID, USERNAME, ROLE }));
    }
    if (sql.includes("FROM FACULTY WHERE USER_ID =")) {
      const user = users.find((candidate) => candidate.USER_ID === Number(params[0]));
      return user?.ROLE === "FACULTY"
        ? [{ FACULTY_ID: user.USER_ID + 100, USER_ID: user.USER_ID, STATUS: "ACTIVE" }]
        : [];
    }
    if (sql.includes("FROM STUDENTS") && sql.includes("WHERE USER_ID = ? AND STATUS = 'ACTIVE'")) {
      const student = users.find((user) => user.USER_ID === Number(params[0]) && user.ROLE === "STUDENT");
      return student ? [{
        STUDENT_ID: student.USER_ID + 199,
        ROLL_NUMBER: "R-001",
        ADMISSION_NUMBER: "A-001",
        FIRST_NAME: "Student",
        LAST_NAME: "One",
        EMAIL: student.USERNAME,
        PHONE_NUMBER: "555-0101",
        PROGRAM_ID: 11,
        DEPARTMENT_ID: 4,
        BATCH_YEAR: 2025,
        CURRENT_SEMESTER: 2,
        ADMISSION_DATE: "2025-08-01",
        STATUS: "ACTIVE",
      }] : [];
    }
    if (sql.includes("INSERT INTO FEEDBACK")) return { insertId: 500 };
    if (sql.includes("FROM PLACEMENT_DRIVES D") && sql.includes("LEFT JOIN PLACEMENT_APPLICATIONS")) {
      return [{ DRIVE_ID: 40, COMPANY_NAME: "Synthetic Co", ROLE_TITLE: "Intern", STATUS: "OPEN", APPLICATION_DEADLINE: "2026-12-01", APPLICATION_STATUS: placementApplications.find((application) => application.studentId === Number(params[0]))?.status || null }];
    }
    if (sql.includes("FROM PLACEMENT_DRIVES") && sql.includes("APPLICATION_DEADLINE >= CURRENT_DATE")) return [{ DRIVE_ID: 40 }];
    if (sql.includes("SELECT APPLICATION_ID, STATUS FROM PLACEMENT_APPLICATIONS WHERE DRIVE_ID = ? AND STUDENT_ID = ?")) {
      return placementApplications.filter((application) => application.driveId === Number(params[0]) && application.studentId === Number(params[1])).map((application) => ({ APPLICATION_ID: application.id, STATUS: application.status }));
    }
    if (sql.includes("INSERT INTO PLACEMENT_APPLICATIONS")) {
      const application = { id: 1, driveId: Number(params[0]), studentId: Number(params[1]), status: "APPLIED" };
      placementApplications.push(application);
      return { insertId: application.id };
    }
    if (sql.includes("SELECT STUDENT_ID FROM STUDENTS WHERE USER_ID = ?")) {
      const student = users.find((user) => user.USER_ID === Number(params[0]) && user.ROLE === "STUDENT");
      return student ? [{ STUDENT_ID: student.USER_ID + 199 }] : [];
    }
    if (sql.includes("FROM EXAM_SESSIONS E") && sql.includes("JOIN COURSE_REGISTRATIONS CR")) {
      const studentId = Number(params[0]);
      if (studentId !== 200) return [];
      return examSessions.filter((exam) => ["OPEN", "CLOSED", "PUBLISHED"].includes(exam.STATUS)).map((exam) => ({
        ...exam,
        COURSE_CODE: "CS101",
        COURSE_TITLE: "Intro to Computing",
        REGISTRATION_STATUS: examRegistrations.find((registration) => registration.examId === exam.EXAM_SESSION_ID && registration.studentId === studentId)?.status || null,
      }));
    }
    if (sql.includes("FROM EXAM_MARKS M") && sql.includes("E.STATUS = 'PUBLISHED'")) {
      return examMarks.filter((mark) => mark.studentId === Number(params[0]) && mark.status === "PUBLISHED")
        .map((mark) => ({ ...mark.result }));
    }
      if (sql.includes("FROM ASSIGNMENTS WHERE FACULTY_NAME =")) return [{ TOTAL: 0, PENDING: 0 }];
      if (sql.includes("FROM FACULTY_QUESTIONS WHERE FACULTY_ID =")) return [{ TOTAL: 0 }];
      if (sql.includes("FROM FACULTY_FORMS WHERE FACULTY_ID =")) return [{ TOTAL: 0 }];
    if (sql.includes("FROM COURSES WHERE COURSE_ID = ? AND FACULTY_ID = ?")) {
      return Number(params[0]) === 20 && Number(params[1]) === 103 ? [{ COURSE_ID: 20 }] : [];
    }
    if (sql.includes("FROM COURSE_REGISTRATIONS WHERE COURSE_ID = ? AND STUDENT_ID = ?")) {
      return Number(params[0]) === 20 && Number(params[1]) === 200 ? [{ REGISTRATION_ID: 1 }] : [];
    }
    throw new Error(`Unexpected test query: ${sql}`);
  },
  async getConnection() {
    let snapshot;
    return {
      async beginTransaction() {
        snapshot = { feeRows: structuredClone(feeRows), paymentAttempts: structuredClone(paymentAttempts), nextPaymentId, examRegistrations: structuredClone(examRegistrations) };
      },
      async commit() { snapshot = null; },
      async rollback() {
        if (!snapshot) return;
        feeRows.splice(0, feeRows.length, ...snapshot.feeRows);
        paymentAttempts.splice(0, paymentAttempts.length, ...snapshot.paymentAttempts);
        nextPaymentId = snapshot.nextPaymentId;
        examRegistrations.splice(0, examRegistrations.length, ...snapshot.examRegistrations);
        snapshot = null;
      },
      release() {},
      async query(sql, params = []) {
        if (sql.includes("FROM STUDENTS WHERE STUDENT_ID = ? AND USER_ID = ?")) {
          return Number(params[0]) === Number(params[1]) + 199 ? [{ STUDENT_ID: Number(params[0]) }] : [];
        }
        if (sql.includes("FROM EXAM_SESSIONS E WHERE E.EXAM_SESSION_ID = ? FOR UPDATE")) {
          return examSessions.filter((exam) => exam.EXAM_SESSION_ID === Number(params[0])).map((exam) => ({ COURSE_ID: exam.COURSE_ID, STATUS: exam.STATUS, REGISTRATION_DEADLINE: exam.REGISTRATION_DEADLINE, DEADLINE_PASSED: 0 }));
        }
        if (sql.includes("FROM COURSE_REGISTRATIONS WHERE COURSE_ID = ? AND STUDENT_ID = ? AND STATUS = 'REGISTERED'")) {
          return Number(params[0]) === 20 && Number(params[1]) === 200 ? [{ REGISTRATION_ID: 9 }] : [];
        }
        if (sql.includes("INSERT INTO EXAM_REGISTRATIONS")) {
          const found = examRegistrations.find((registration) => registration.examId === Number(params[0]) && registration.studentId === Number(params[1]));
          if (found) found.status = "REGISTERED";
          else examRegistrations.push({ examId: Number(params[0]), studentId: Number(params[1]), status: "REGISTERED" });
          return { affectedRows: 1 };
        }
        if (sql.includes("FROM FEE_PAYMENT_ATTEMPTS WHERE STUDENT_ID = ? AND IDEMPOTENCY_KEY = ?")) {
          return paymentAttempts.filter((payment) => payment.STUDENT_ID === Number(params[0]) && payment.IDEMPOTENCY_KEY === params[1]);
        }
        if (sql.includes("FROM FEE_TRANSACTIONS")) {
          const row = feeRows.find((fee) => fee.id === Number(params[0]) && fee.studentId === Number(params[1]));
          return row ? [{ FEE_ID: row.id, AMOUNT: row.AMOUNT, STATUS: row.STATUS }] : [];
        }
        if (sql.includes("INSERT INTO FEE_PAYMENT_ATTEMPTS")) {
          const row = {
            PAYMENT_ID: nextPaymentId++,
            STUDENT_ID: Number(params[0]),
            FEE_SOURCE: params[1],
            FEE_RECORD_ID: Number(params[2]),
            IDEMPOTENCY_KEY: params[3],
            TRANSACTION_REFERENCE: params[4],
            AMOUNT: params[5],
            STATUS: "SUCCEEDED",
          };
          paymentAttempts.push(row);
          return { insertId: row.PAYMENT_ID };
        }
        if (sql.includes("UPDATE FEE_TRANSACTIONS SET STATUS = 'PAID'")) {
          const row = feeRows.find((fee) => fee.id === Number(params[1]) && fee.studentId === Number(params[2]) && ["UNPAID", "PENDING"].includes(fee.STATUS));
          if (row) { row.STATUS = "PAID"; row.TRANSACTION_ID = params[0]; }
          return { affectedRows: row ? 1 : 0 };
        }
        throw new Error(`Unexpected test connection query: ${sql}`);
      },
    };
  },
};

const poolModule = require.resolve("../db");
require.cache[poolModule] = { id: poolModule, filename: poolModule, loaded: true, exports: database };
const { createApp } = require("../app");
const app = createApp({
  database,
  sessionStore: new session.MemoryStore(),
  sessionSecret: "unit-test-session-secret-at-least-32-characters",
  production: false,
  mockPaymentsEnabled: true,
});

const csrfFor = async (agent) => {
  const response = await agent.get("/csrf-token").expect(200);
  return response.body.csrfToken;
};

const signedInAgent = async (username, targetApp = app) => {
  const agent = request.agent(targetApp);
  const token = await csrfFor(agent);
  const response = await agent.post("/login")
    .set("X-CSRF-Token", token)
    .send({ username, password: "correct horse battery" })
    .expect(200);
  return { agent, csrfToken: response.body.csrfToken };
};

test("valid login establishes a session and rotates the session ID", async () => {
  const agent = request.agent(app);
  const csrfResponse = await agent.get("/csrf-token").expect(200);
  const csrfToken = csrfResponse.body.csrfToken;
  const before = csrfResponse.headers["set-cookie"]?.[0]?.split(";")[0];
  const response = await agent.post("/login").set("X-CSRF-Token", csrfToken)
    .send({ username: "student.one@example.edu", password: "correct horse battery" }).expect(200);
  const after = response.headers["set-cookie"]?.[0];
  assert.equal(response.body.role, "STUDENT");
  assert.match(after, /^erp\.sid=/);
  assert.match(after, /HttpOnly/);
  assert.match(after, /SameSite=Lax/);
  assert.notEqual(after.split(";")[0], before);
  await agent.get("/me").expect(200, { user_id: 1, username: "student.one@example.edu", role: "STUDENT" });
});

test("invalid login does not establish an authenticated session", async () => {
  const agent = request.agent(app);
  const csrfToken = await csrfFor(agent);
  await agent.post("/login").set("X-CSRF-Token", csrfToken)
    .send({ username: "student.one@example.edu", password: "wrong password" }).expect(401);
  await agent.get("/me").expect(401);
});

test("logout destroys the server-side session", async () => {
  const { agent, csrfToken } = await signedInAgent("student.one@example.edu");
  await agent.post("/logout").set("X-CSRF-Token", csrfToken).expect(204);
  await agent.get("/me").expect(401);
  await agent.get("/student-data/1/dashboard").expect(401);
});

test("deactivating an account invalidates its existing server session", async () => {
  const { agent } = await signedInAgent("student.one@example.edu");
  users[0].IS_ACTIVE = 0;
  try {
    await agent.get("/me").expect(401);
    users[0].IS_ACTIVE = 1;
    await agent.get("/me").expect(401);
  } finally {
    users[0].IS_ACTIVE = 1;
  }
});

test("protected APIs reject unauthenticated requests even with a forged user header", async () => {
  await request(app).get("/student-data/1/dashboard").set("X-User-Id", "1").expect(401);
  await request(app).get("/academic-data/5/courses").set("X-User-Id", "5").expect(401);
});

test("public registration rejects privileged roles before touching persistence", async () => {
  const agent = request.agent(app);
  const csrfToken = await csrfFor(agent);
  await agent.post("/register").set("X-CSRF-Token", csrfToken)
    .send({ username: "attacker@example.edu", password: "long enough password", role: "ADMIN" })
    .expect(403);
});

test("student cannot read another student's records or administrator endpoints", async () => {
  const { agent } = await signedInAgent("student.one@example.edu");
  await agent.get("/student-data/1/profile").expect(200);
  await agent.get("/student-data/2/profile").expect(403);
  await agent.get("/student-data/2/dashboard").expect(403);
  await agent.get("/students").expect(403);
  await agent.get("/academic-data/1/courses").expect(403);
  await agent.get("/exam-admin/1/sessions").expect(403);
  await agent.get("/campus-admin/1/hostel/applications").expect(403);
  await agent.get("/reports/1/overview").expect(403);
});

test("student profile returns only the selected identity, contact, and academic fields", async () => {
  const { agent } = await signedInAgent("student.one@example.edu");
  const response = await agent.get("/student-data/1/profile").expect(200);
  assert.deepEqual(Object.keys(response.body).sort(), [
    "ADMISSION_DATE", "ADMISSION_NUMBER", "BATCH_YEAR", "CURRENT_SEMESTER",
    "DEPARTMENT_ID", "EMAIL", "FIRST_NAME", "LAST_NAME", "PHONE_NUMBER",
    "PROGRAM_ID", "ROLL_NUMBER", "STATUS", "STUDENT_ID",
  ].sort());
  assert.equal(response.body.EMAIL, "student.one@example.edu");
});

test("student cannot access wallet administration or merchant APIs", async () => {
  const { agent } = await signedInAgent("student.one@example.edu");
  await agent.get("/wallet-admin/1/policies").expect(403);
  await agent.get("/merchant-data/1/orders").expect(403);
  await agent.get("/access-admin/policies").expect(403);
});

test("role navigation is derived from sidebar-enabled read policies", async () => {
  const { agent } = await signedInAgent("student.one@example.edu");
  const response = await agent.get("/me/navigation").expect(200);
  assert.ok(response.body.modules.includes("student_finance"));
  assert.ok(!response.body.modules.includes("wallet_admin"));
});

test("administrator can change another role's backend module and sidebar grant", async () => {
  const { agent } = await signedInAgent("admin@example.edu");
  const csrfToken = await csrfFor(agent);
  await agent.put("/access-admin/policies/STUDENT/student_finance")
    .set("X-CSRF-Token", csrfToken)
    .send({ canRead: false, canWrite: false, rowScope: "self", sidebarVisible: false })
    .expect(200);
  assert.ok(policyOverrides.has("STUDENT:student_finance"), JSON.stringify([...policyOverrides.keys()]));
  try {
    const student = await signedInAgent("student.one@example.edu");
    await student.agent.get("/student-data/1/fees").expect(403);
    const navigation = await agent.get("/me/navigation?role=STUDENT").expect(200);
    assert.ok(!navigation.body.modules.includes("student_finance"), JSON.stringify(navigation.body.modules));
  } finally {
    policyOverrides.delete("STUDENT:student_finance");
  }
});

test("administrator role control cannot be removed by the policy console", async () => {
  const { agent } = await signedInAgent("admin@example.edu");
  const csrfToken = await csrfFor(agent);
  await agent.put("/access-admin/policies/ADMIN/reports")
    .set("X-CSRF-Token", csrfToken)
    .send({ canRead: false, canWrite: false, rowScope: "university", sidebarVisible: false })
    .expect(403);
});

test("student can apply to an open placement drive for their own account only", async () => {
  const { agent, csrfToken } = await signedInAgent("student.one@example.edu");
  const drives = await agent.get("/student-data/1/placements").expect(200);
  assert.equal(drives.body[0].DRIVE_ID, 40);
  await agent.post("/student-data/1/placements/40/apply").set("X-CSRF-Token", csrfToken).send({}).expect(201);
  await agent.post("/student-data/1/placements/40/apply").set("X-CSRF-Token", csrfToken).send({}).expect(409);
  await agent.post("/student-data/2/placements/40/apply").set("X-CSRF-Token", csrfToken).send({}).expect(403);
});

test("authenticated write requests emit append-only audit events without request bodies", async () => {
  const { agent, csrfToken } = await signedInAgent("student.one@example.edu");
  const startCount = auditEvents.length;
  await agent.post("/student-data/1/feedback").set("X-CSRF-Token", csrfToken).send({ subject: "Test", message: "Synthetic feedback" }).expect(201);
  assert.ok(auditEvents.length > startCount);
  assert.equal(auditEvents.at(-1).params.length, 6);
  assert.equal(typeof auditEvents.at(-1).params[3], "string");
});

test("student exam list is limited to their registered course and registration is idempotent", async () => {
  const { agent, csrfToken } = await signedInAgent("student.one@example.edu");
  const exams = await agent.get("/student-data/1/exams").expect(200);
  assert.equal(exams.body.length, 1);
  assert.equal(exams.body[0].EXAM_CODE, "CS101-MID-2026");
  await agent.post("/student-data/1/exams/30/register").set("X-CSRF-Token", csrfToken).send({}).expect(201);
  await agent.post("/student-data/1/exams/30/register").set("X-CSRF-Token", csrfToken).send({}).expect(201);
  assert.equal(examRegistrations.length, 1);
  await agent.post("/student-data/2/exams/30/register").set("X-CSRF-Token", csrfToken).send({}).expect(403);
});

test("student can only read published exam marks", async () => {
  const { agent } = await signedInAgent("student.one@example.edu");
  examMarks.push({ studentId: 200, status: "PUBLISHED", result: { EXAM_CODE: "CS101-MID-2026", SCORE: "84.00", MAX_SCORE: "100.00" } });
  try {
    const results = await agent.get("/student-data/1/exam-results").expect(200);
    assert.equal(results.body.length, 1);
    assert.equal(results.body[0].SCORE, "84.00");
  } finally {
    examMarks.splice(0, examMarks.length);
  }
});

test("mock payment uses the stored amount and same-key retries return one payment", async () => {
  const { agent, csrfToken } = await signedInAgent("student.one@example.edu");
  const path = "/student-data/1/fees/FEE_TRANSACTION/10/pay";
  const idempotencyKey = "payment-attempt-0001";
  const first = await agent.post(path)
    .set("X-CSRF-Token", csrfToken)
    .set("Idempotency-Key", idempotencyKey)
    .send({ amount: 0.01 });
  assert.equal(first.status, 201, `${first.text}; checked=${JSON.stringify(policyChecks.slice(-5))}`);
  const retry = await agent.post(path)
    .set("X-CSRF-Token", csrfToken)
    .set("Idempotency-Key", idempotencyKey)
    .send({ amount: 999999 })
    .expect(200);

  assert.equal(first.body.amount, "125.50");
  assert.equal(first.body.provider, "MOCK");
  assert.equal(first.body.transactionReference, retry.body.transactionReference);
  assert.equal(paymentAttempts.length, 1);
  assert.equal(feeRows[0].STATUS, "PAID");
  await agent.post("/student-data/1/fees/ACCOUNTING_LEDGER/10/pay")
    .set("X-CSRF-Token", csrfToken)
    .set("Idempotency-Key", idempotencyKey)
    .send({})
    .expect(409, { message: "This idempotency key was already used for another fee." });
});

test("mock payment refuses a student URL outside the authenticated session", async () => {
  const { agent, csrfToken } = await signedInAgent("student.one@example.edu");
  const response = await agent.post("/student-data/2/fees/FEE_TRANSACTION/10/pay")
    .set("X-CSRF-Token", csrfToken)
    .set("Idempotency-Key", "payment-attempt-0002")
    .send({});
  assert.equal(response.status, 403, response.text);
});

test("mock payments can be disabled", async () => {
  const disabledApp = createApp({
    database,
    sessionStore: new session.MemoryStore(),
    sessionSecret: "disabled-mock-test-session-secret-32chars",
    production: false,
    mockPaymentsEnabled: false,
  });
  const { agent, csrfToken } = await signedInAgent("student.two@example.edu", disabledApp);
  await agent.post("/student-data/2/fees/FEE_TRANSACTION/10/pay")
    .set("X-CSRF-Token", csrfToken)
    .set("Idempotency-Key", "payment-attempt-0003")
    .send({})
    .expect(503);
});

test("faculty cannot access another faculty member's records", async () => {
  const { agent } = await signedInAgent("faculty.one@example.edu");
  await agent.get("/faculty-data/4/dashboard").expect(403);
  await agent.get("/faculty-data/3/dashboard").expect(200);
});

test("faculty cannot record attendance for a student not registered in the course", async () => {
  const { agent, csrfToken } = await signedInAgent("faculty.one@example.edu");
  await agent.post("/faculty-data/3/attendance")
    .set("X-CSRF-Token", csrfToken)
    .send({ courseId: 20, studentId: 201, lectureDate: "2026-10-22", status: "PRESENT" })
    .expect(403, { message: "The student is not registered for this course." });
});
