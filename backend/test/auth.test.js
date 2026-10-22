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

const passwordHash = bcrypt.hashSync("correct horse battery", 4);
const database = {
  async query(sql, params = []) {
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
};

const poolModule = require.resolve("../db");
require.cache[poolModule] = { id: poolModule, filename: poolModule, loaded: true, exports: database };
const { createApp } = require("../app");
const app = createApp({
  database,
  sessionStore: new session.MemoryStore(),
  sessionSecret: "unit-test-session-secret-at-least-32-characters",
  production: false,
});

const csrfFor = async (agent) => {
  const response = await agent.get("/csrf-token").expect(200);
  return response.body.csrfToken;
};

const signedInAgent = async (username) => {
  const agent = request.agent(app);
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
  await agent.get("/student-data/2/dashboard").expect(403);
  await agent.get("/students").expect(403);
  await agent.get("/academic-data/1/courses").expect(403);
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
