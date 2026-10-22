const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/:userId/policies", async (_req, res) => {
  try {
    const rows = await pool.query(
      `SELECT P.*, COALESCE(SUM(L.AMOUNT), 0) AS ISSUED_AMOUNT
       FROM WALLET_REWARD_POLICIES P
       LEFT JOIN WALLET_LEDGER_ENTRIES L ON L.POLICY_ID = P.POLICY_ID AND L.ENTRY_TYPE = 'CREDIT'
       GROUP BY P.POLICY_ID ORDER BY P.CREATED_AT DESC`,
    );
    return res.json(rows);
  } catch (error) {
    console.error("Wallet policy list error:", error);
    return res.status(500).json({ message: "Unable to load wallet policies." });
  }
});

router.post("/:userId/policies", async (req, res) => {
  const { policyName, periodCode, programId = null, semester = null, budgetAmount, perStudentCap, expiresAt = null } = req.body || {};
  if (!policyName?.trim() || !periodCode?.trim() || !Number.isFinite(Number(budgetAmount)) || Number(budgetAmount) <= 0
    || !Number.isFinite(Number(perStudentCap)) || Number(perStudentCap) <= 0
    || Number(perStudentCap) > Number(budgetAmount)
    || (programId !== null && !Number.isSafeInteger(Number(programId)))
    || (semester !== null && (!Number.isInteger(Number(semester)) || Number(semester) < 1 || Number(semester) > 20))) {
    return res.status(400).json({ message: "Policy name, period, positive budget, and a valid per-student cap are required." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO WALLET_REWARD_POLICIES
        (POLICY_NAME, PERIOD_CODE, PROGRAM_ID, SEMESTER, BUDGET_AMOUNT, PER_STUDENT_CAP, EXPIRES_AT, CREATED_BY)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [policyName.trim(), periodCode.trim(), programId || null, semester || null, budgetAmount, perStudentCap, expiresAt || null, req.auth.userId],
    );
    return res.status(201).json({ policyId: Number(result.insertId), message: "Reward policy created." });
  } catch (error) {
    console.error("Wallet policy create error:", error);
    return res.status(500).json({ message: "Unable to create reward policy." });
  }
});

router.patch("/:userId/policies/:policyId/status", async (req, res) => {
  const { status } = req.body || {};
  if (!["ACTIVE", "PAUSED", "CLOSED"].includes(status)) return res.status(400).json({ message: "Invalid policy status." });
  try {
    const result = await pool.query("UPDATE WALLET_REWARD_POLICIES SET STATUS = ? WHERE POLICY_ID = ?", [status, req.params.policyId]);
    if (!result.affectedRows) return res.status(404).json({ message: "Reward policy not found." });
    return res.json({ message: "Reward policy status updated." });
  } catch (error) {
    console.error("Wallet policy update error:", error);
    return res.status(500).json({ message: "Unable to update reward policy." });
  }
});

router.get("/:userId/reward-requests", async (_req, res) => {
  try {
    const rows = await pool.query(
      `SELECT R.*, S.ROLL_NUMBER, S.FIRST_NAME, S.LAST_NAME, P.POLICY_NAME, C.COURSE_CODE
       FROM WALLET_REWARD_REQUESTS R
       JOIN STUDENTS S ON S.STUDENT_ID = R.STUDENT_ID
       JOIN WALLET_REWARD_POLICIES P ON P.POLICY_ID = R.POLICY_ID
       JOIN COURSES C ON C.COURSE_ID = R.COURSE_ID
       ORDER BY FIELD(R.STATUS, 'REQUESTED', 'APPROVED', 'ISSUED', 'REJECTED'), R.CREATED_AT DESC`,
    );
    return res.json(rows);
  } catch (error) {
    console.error("Wallet reward requests error:", error);
    return res.status(500).json({ message: "Unable to load reward requests." });
  }
});

router.post("/:userId/reward-requests/:requestId/review", async (req, res) => {
  const { decision, reviewNote = "" } = req.body || {};
  if (!['APPROVE', 'REJECT'].includes(decision) || typeof reviewNote !== "string") {
    return res.status(400).json({ message: "A valid approval decision is required." });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const requests = await connection.query(
      `SELECT REQUEST_ID, POLICY_ID, STUDENT_ID, AMOUNT, STATUS
       FROM WALLET_REWARD_REQUESTS WHERE REQUEST_ID = ? FOR UPDATE`,
      [req.params.requestId],
    );
    if (!requests.length || requests[0].STATUS !== "REQUESTED") {
      await connection.rollback();
      return res.status(404).json({ message: "Pending reward request not found." });
    }
    const reward = requests[0];
    if (decision === "REJECT") {
      await connection.query(
        "UPDATE WALLET_REWARD_REQUESTS SET STATUS = 'REJECTED', REVIEWED_BY = ?, REVIEWED_AT = CURRENT_TIMESTAMP WHERE REQUEST_ID = ?",
        [req.auth.userId, reward.REQUEST_ID],
      );
      await connection.commit();
      return res.json({ message: "Reward request rejected." });
    }

    const policies = await connection.query(
      "SELECT * FROM WALLET_REWARD_POLICIES WHERE POLICY_ID = ? AND (EXPIRES_AT IS NULL OR EXPIRES_AT >= CURRENT_DATE) FOR UPDATE",
      [reward.POLICY_ID],
    );
    if (!policies.length || policies[0].STATUS !== "ACTIVE") {
      await connection.rollback();
      return res.status(409).json({ message: "The reward policy is inactive or expired." });
    }
    const policy = policies[0];
    const spentRows = await connection.query("SELECT COALESCE(SUM(AMOUNT), 0) AS TOTAL FROM WALLET_LEDGER_ENTRIES WHERE POLICY_ID = ? AND ENTRY_TYPE = 'CREDIT'", [reward.POLICY_ID]);
    const studentRows = await connection.query("SELECT COALESCE(SUM(AMOUNT), 0) AS TOTAL FROM WALLET_LEDGER_ENTRIES WHERE POLICY_ID = ? AND STUDENT_ID = ? AND ENTRY_TYPE = 'CREDIT'", [reward.POLICY_ID, reward.STUDENT_ID]);
    if (Number(spentRows[0].TOTAL) + Number(reward.AMOUNT) > Number(policy.BUDGET_AMOUNT)
      || Number(studentRows[0].TOTAL) + Number(reward.AMOUNT) > Number(policy.PER_STUDENT_CAP)) {
      await connection.rollback();
      return res.status(409).json({ message: "Approving this reward would exceed the policy budget or student cap." });
    }
    await connection.query("INSERT IGNORE INTO CAMPUS_WALLETS (STUDENT_ID, BALANCE) VALUES (?, 0)", [reward.STUDENT_ID]);
    await connection.query("SELECT WALLET_ID FROM CAMPUS_WALLETS WHERE STUDENT_ID = ? FOR UPDATE", [reward.STUDENT_ID]);
    await connection.query("UPDATE CAMPUS_WALLETS SET BALANCE = BALANCE + ? WHERE STUDENT_ID = ?", [reward.AMOUNT, reward.STUDENT_ID]);
    await connection.query(
      `INSERT INTO WALLET_LEDGER_ENTRIES
        (STUDENT_ID, ENTRY_TYPE, AMOUNT, REASON_CODE, DESCRIPTION, POLICY_ID, ACTOR_USER_ID, IDEMPOTENCY_KEY)
       VALUES (?, 'CREDIT', ?, 'APPROVED_REWARD', ?, ?, ?, ?)`,
      [reward.STUDENT_ID, reward.AMOUNT, reviewNote.trim() || "Approved campus reward", reward.POLICY_ID, req.auth.userId, `reward-request-${reward.REQUEST_ID}`],
    );
    await connection.query(
      `INSERT INTO IN_APP_NOTIFICATIONS (USER_ID, TITLE, MESSAGE, NOTIFICATION_TYPE, RESOURCE_PATH)
       SELECT USER_ID, 'Campus reward credited', ?, 'WALLET_REWARD', '/erp/student/wallet'
       FROM STUDENTS WHERE STUDENT_ID = ? AND USER_ID IS NOT NULL`,
      [`${reward.AMOUNT} campus credits were added to your wallet.`, reward.STUDENT_ID],
    );
    await connection.query(
      "UPDATE WALLET_REWARD_REQUESTS SET STATUS = 'ISSUED', REVIEWED_BY = ?, REVIEWED_AT = CURRENT_TIMESTAMP WHERE REQUEST_ID = ?",
      [req.auth.userId, reward.REQUEST_ID],
    );
    await connection.commit();
    return res.json({ message: "Reward approved and credited." });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "This reward has already been issued." });
    console.error("Wallet reward review error:", error);
    return res.status(500).json({ message: "Unable to review reward request." });
  } finally {
    if (connection) connection.release();
  }
});

router.post("/:userId/merchants", async (req, res) => {
  const { userId, displayName } = req.body || {};
  if (!Number.isSafeInteger(Number(userId)) || !displayName?.trim()) return res.status(400).json({ message: "Merchant user and display name are required." });
  try {
    const users = await pool.query("SELECT USER_ID FROM USERS WHERE USER_ID = ? AND ROLE = 'MERCHANT' AND IS_ACTIVE = 1", [userId]);
    if (!users.length) return res.status(404).json({ message: "Active merchant account not found." });
    const result = await pool.query(
      "INSERT INTO MERCHANT_ACCOUNTS (USER_ID, DISPLAY_NAME, STATUS) VALUES (?, ?, 'ACTIVE')",
      [userId, displayName.trim()],
    );
    return res.status(201).json({ merchantId: Number(result.insertId), message: "Merchant account enabled." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "This user already has a merchant account." });
    console.error("Merchant provisioning error:", error);
    return res.status(500).json({ message: "Unable to create merchant account." });
  }
});

module.exports = router;