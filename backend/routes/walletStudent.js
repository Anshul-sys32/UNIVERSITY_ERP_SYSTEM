const express = require("express");
const pool = require("../db");

const router = express.Router();

const resolveStudentId = async (userId) => {
  const rows = await pool.query("SELECT STUDENT_ID FROM STUDENTS WHERE USER_ID = ? AND STATUS = 'ACTIVE'", [userId]);
  return rows[0]?.STUDENT_ID || null;
};

const cents = (value) => {
  const match = String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  return BigInt(match[1]) * 100n + BigInt((match[2] || "").padEnd(2, "0") || "0");
};

const decimal = (amountCents) => `${amountCents / 100n}.${String(amountCents % 100n).padStart(2, "0")}`;

router.get("/:userId", async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.auth.userId);
    if (!studentId) return res.status(404).json({ message: "No active student wallet is available." });
    const [wallets, totals] = await Promise.all([
      pool.query("SELECT BALANCE, UPDATED_AT FROM CAMPUS_WALLETS WHERE STUDENT_ID = ?", [studentId]),
      pool.query(
        `SELECT
          COALESCE(SUM(CASE WHEN ENTRY_TYPE = 'CREDIT' THEN AMOUNT ELSE 0 END), 0) AS LIFETIME_EARNED,
          COALESCE(SUM(CASE WHEN ENTRY_TYPE IN ('DEBIT', 'REVERSAL') THEN AMOUNT ELSE 0 END), 0) AS LIFETIME_SPENT
         FROM WALLET_LEDGER_ENTRIES WHERE STUDENT_ID = ?`,
        [studentId],
      ),
    ]);
    return res.json({ balance: wallets[0]?.BALANCE || "0.00", updatedAt: wallets[0]?.UPDATED_AT || null, ...totals[0] });
  } catch (error) {
    console.error("Student wallet summary error:", error);
    return res.status(500).json({ message: "Unable to load your wallet." });
  }
});

router.get("/:userId/ledger", async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.auth.userId);
    if (!studentId) return res.status(404).json({ message: "No active student wallet is available." });
    const rows = await pool.query(
      `SELECT LEDGER_ENTRY_ID, ENTRY_TYPE, AMOUNT, REASON_CODE, DESCRIPTION, CREATED_AT
       FROM WALLET_LEDGER_ENTRIES WHERE STUDENT_ID = ?
       ORDER BY CREATED_AT DESC, LEDGER_ENTRY_ID DESC LIMIT 100`,
      [studentId],
    );
    return res.json(rows);
  } catch (error) {
    console.error("Student wallet ledger error:", error);
    return res.status(500).json({ message: "Unable to load wallet history." });
  }
});

router.get("/:userId/catalog", async (_req, res) => {
  try {
    const rows = await pool.query(
      `SELECT I.ITEM_ID, I.ITEM_NAME, I.DESCRIPTION, I.PRICE_CREDITS,
        M.MERCHANT_ID, M.DISPLAY_NAME AS MERCHANT_NAME
       FROM MERCHANT_CATALOG_ITEMS I
       JOIN MERCHANT_ACCOUNTS M ON M.MERCHANT_ID = I.MERCHANT_ID
       WHERE I.IS_AVAILABLE = 1 AND M.STATUS = 'ACTIVE'
       ORDER BY M.DISPLAY_NAME, I.ITEM_NAME`,
    );
    return res.json(rows);
  } catch (error) {
    console.error("Wallet catalog error:", error);
    return res.status(500).json({ message: "Unable to load the campus catalog." });
  }
});

router.post("/:userId/orders", async (req, res) => {
  const itemId = Number(req.body?.itemId);
  const quantity = Number(req.body?.quantity);
  const idempotencyKey = req.get("Idempotency-Key");
  if (!Number.isSafeInteger(itemId) || itemId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return res.status(400).json({ message: "Choose a valid item and quantity from 1 to 20." });
  }
  if (typeof idempotencyKey !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(idempotencyKey)) {
    return res.status(400).json({ message: "A valid Idempotency-Key is required." });
  }

  let connection;
  try {
    const studentId = await resolveStudentId(req.auth.userId);
    if (!studentId) return res.status(404).json({ message: "No active student wallet is available." });
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const previous = await connection.query(
      `SELECT ORDER_ID, TOTAL_CREDITS, STATUS FROM CAMPUS_WALLET_ORDERS
       WHERE STUDENT_ID = ? AND IDEMPOTENCY_KEY = ?`,
      [studentId, idempotencyKey],
    );
    if (previous.length) {
      await connection.commit();
      return res.json({ orderId: Number(previous[0].ORDER_ID), amount: previous[0].TOTAL_CREDITS, status: previous[0].STATUS, replayed: true });
    }

    const items = await connection.query(
      `SELECT I.ITEM_ID, I.ITEM_NAME, I.PRICE_CREDITS, I.MERCHANT_ID
       FROM MERCHANT_CATALOG_ITEMS I JOIN MERCHANT_ACCOUNTS M ON M.MERCHANT_ID = I.MERCHANT_ID
       WHERE I.ITEM_ID = ? AND I.IS_AVAILABLE = 1 AND M.STATUS = 'ACTIVE' FOR UPDATE`,
      [itemId],
    );
    if (!items.length) {
      await connection.rollback();
      return res.status(404).json({ message: "This catalog item is unavailable." });
    }
    const unitCents = cents(items[0].PRICE_CREDITS);
    if (unitCents === null || unitCents <= 0n) {
      await connection.rollback();
      return res.status(409).json({ message: "This catalog item has an invalid price." });
    }
    const totalCents = unitCents * BigInt(quantity);
    await connection.query("INSERT IGNORE INTO CAMPUS_WALLETS (STUDENT_ID, BALANCE) VALUES (?, 0)", [studentId]);
    const wallets = await connection.query("SELECT BALANCE FROM CAMPUS_WALLETS WHERE STUDENT_ID = ? FOR UPDATE", [studentId]);
    const balanceCents = cents(wallets[0]?.BALANCE || "0.00");
    if (balanceCents === null || balanceCents < totalCents) {
      await connection.rollback();
      return res.status(409).json({ message: "Insufficient campus credits." });
    }

    const order = await connection.query(
      `INSERT INTO CAMPUS_WALLET_ORDERS
        (STUDENT_ID, MERCHANT_ID, ITEM_ID, ITEM_NAME, QUANTITY, UNIT_PRICE, TOTAL_CREDITS, IDEMPOTENCY_KEY)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [studentId, items[0].MERCHANT_ID, itemId, items[0].ITEM_NAME, quantity, items[0].PRICE_CREDITS, decimal(totalCents), idempotencyKey],
    );
    await connection.query("UPDATE CAMPUS_WALLETS SET BALANCE = BALANCE - ? WHERE STUDENT_ID = ?", [decimal(totalCents), studentId]);
    await connection.query(
      `INSERT INTO WALLET_LEDGER_ENTRIES
        (STUDENT_ID, ENTRY_TYPE, AMOUNT, REASON_CODE, DESCRIPTION, ORDER_ID, ACTOR_USER_ID, IDEMPOTENCY_KEY)
       VALUES (?, 'DEBIT', ?, 'CAMPUS_PURCHASE', ?, ?, ?, ?)`,
      [studentId, decimal(totalCents), `${quantity} × ${items[0].ITEM_NAME}`, order.insertId, req.auth.userId, `order-${idempotencyKey}`],
    );
    await connection.query(
      `INSERT INTO IN_APP_NOTIFICATIONS (USER_ID, TITLE, MESSAGE, NOTIFICATION_TYPE, RESOURCE_PATH)
       SELECT USER_ID, 'Campus order received', ?, 'CAMPUS_ORDER', '/erp/merchant'
       FROM MERCHANT_ACCOUNTS WHERE MERCHANT_ID = ? AND STATUS = 'ACTIVE'`,
      [`Order #${order.insertId} is ready for fulfillment.`, items[0].MERCHANT_ID],
    );
    await connection.commit();
    return res.status(201).json({ orderId: Number(order.insertId), amount: decimal(totalCents), status: "PAID", provider: "CAMPUS_CREDITS" });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "This order was already submitted." });
    console.error("Wallet order error:", error);
    return res.status(500).json({ message: "Unable to complete the campus purchase." });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;