const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/:userId/catalog", async (req, res) => {
  try {
    const merchants = await pool.query("SELECT MERCHANT_ID FROM MERCHANT_ACCOUNTS WHERE USER_ID = ? AND STATUS = 'ACTIVE'", [req.auth.userId]);
    if (!merchants.length) return res.status(403).json({ message: "No active merchant account is linked to this user." });
    const rows = await pool.query("SELECT ITEM_ID, ITEM_NAME, DESCRIPTION, PRICE_CREDITS, IS_AVAILABLE FROM MERCHANT_CATALOG_ITEMS WHERE MERCHANT_ID = ? ORDER BY ITEM_NAME", [merchants[0].MERCHANT_ID]);
    return res.json(rows);
  } catch (error) {
    console.error("Merchant catalog list error:", error);
    return res.status(500).json({ message: "Unable to load merchant catalog." });
  }
});

router.post("/:userId/catalog", async (req, res) => {
  const { itemName, description = "", priceCredits } = req.body || {};
  if (!itemName?.trim() || !Number.isFinite(Number(priceCredits)) || Number(priceCredits) <= 0) {
    return res.status(400).json({ message: "Item name and a positive credit price are required." });
  }
  try {
    const merchants = await pool.query("SELECT MERCHANT_ID FROM MERCHANT_ACCOUNTS WHERE USER_ID = ? AND STATUS = 'ACTIVE'", [req.auth.userId]);
    if (!merchants.length) return res.status(403).json({ message: "No active merchant account is linked to this user." });
    const result = await pool.query(
      "INSERT INTO MERCHANT_CATALOG_ITEMS (MERCHANT_ID, ITEM_NAME, DESCRIPTION, PRICE_CREDITS) VALUES (?, ?, ?, ?)",
      [merchants[0].MERCHANT_ID, itemName.trim(), description.trim(), priceCredits],
    );
    return res.status(201).json({ itemId: Number(result.insertId), message: "Catalog item created." });
  } catch (error) {
    console.error("Merchant catalog create error:", error);
    return res.status(500).json({ message: "Unable to create catalog item." });
  }
});

router.get("/:userId/orders", async (req, res) => {
  try {
    const rows = await pool.query(
      `SELECT O.ORDER_ID, O.ITEM_NAME, O.QUANTITY, O.TOTAL_CREDITS, O.STATUS, O.CREATED_AT
       FROM CAMPUS_WALLET_ORDERS O JOIN MERCHANT_ACCOUNTS M ON M.MERCHANT_ID = O.MERCHANT_ID
       WHERE M.USER_ID = ? ORDER BY O.CREATED_AT DESC LIMIT 100`,
      [req.auth.userId],
    );
    return res.json(rows);
  } catch (error) {
    console.error("Merchant orders list error:", error);
    return res.status(500).json({ message: "Unable to load merchant orders." });
  }
});

router.post("/:userId/orders/:orderId/refund", async (req, res) => {
  const reason = req.body?.reason;
  if (typeof reason !== "string" || !reason.trim()) return res.status(400).json({ message: "A refund reason is required." });
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const orders = await connection.query(
      `SELECT O.ORDER_ID, O.STUDENT_ID, O.TOTAL_CREDITS, O.STATUS
       FROM CAMPUS_WALLET_ORDERS O JOIN MERCHANT_ACCOUNTS M ON M.MERCHANT_ID = O.MERCHANT_ID
       WHERE O.ORDER_ID = ? AND M.USER_ID = ? AND M.STATUS = 'ACTIVE' FOR UPDATE`,
      [req.params.orderId, req.auth.userId],
    );
    if (!orders.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Merchant order not found." });
    }
    const order = orders[0];
    if (order.STATUS !== "PAID") {
      await connection.rollback();
      return res.status(409).json({ message: "This order has already been refunded or is not refundable." });
    }
    await connection.query("SELECT WALLET_ID FROM CAMPUS_WALLETS WHERE STUDENT_ID = ? FOR UPDATE", [order.STUDENT_ID]);
    await connection.query("UPDATE CAMPUS_WALLETS SET BALANCE = BALANCE + ? WHERE STUDENT_ID = ?", [order.TOTAL_CREDITS, order.STUDENT_ID]);
    await connection.query(
      `INSERT INTO WALLET_LEDGER_ENTRIES
        (STUDENT_ID, ENTRY_TYPE, AMOUNT, REASON_CODE, DESCRIPTION, ORDER_ID, ACTOR_USER_ID, IDEMPOTENCY_KEY)
       VALUES (?, 'REVERSAL', ?, 'MERCHANT_REFUND', ?, ?, ?, ?)`,
      [order.STUDENT_ID, order.TOTAL_CREDITS, reason.trim(), order.ORDER_ID, req.auth.userId, `refund-order-${order.ORDER_ID}`],
    );
    await connection.query("UPDATE CAMPUS_WALLET_ORDERS SET STATUS = 'REFUNDED' WHERE ORDER_ID = ?", [order.ORDER_ID]);
    await connection.query(
      `INSERT INTO IN_APP_NOTIFICATIONS (USER_ID, TITLE, MESSAGE, NOTIFICATION_TYPE, RESOURCE_PATH)
       SELECT USER_ID, 'Campus order refunded', ?, 'WALLET_REFUND', '/erp/student/wallet'
       FROM STUDENTS WHERE STUDENT_ID = ? AND USER_ID IS NOT NULL`,
      [`${order.TOTAL_CREDITS} credits were returned to your wallet.`, order.STUDENT_ID],
    );
    await connection.commit();
    return res.json({ message: "Refund issued as a compensating wallet credit." });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "This order has already been refunded." });
    console.error("Merchant refund error:", error);
    return res.status(500).json({ message: "Unable to refund this order." });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;