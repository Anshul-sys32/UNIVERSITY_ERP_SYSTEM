const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/:userId/accounting/summary", async (_req, res) => {
  try {
    const [totals, outstanding, recent] = await Promise.all([
      pool.query("SELECT COUNT(*) AS TOTAL, COALESCE(SUM(AMOUNT), 0) AS AMOUNT FROM ACCOUNTING_LEDGER"),
      pool.query("SELECT COUNT(*) AS TOTAL, COALESCE(SUM(AMOUNT), 0) AS AMOUNT FROM ACCOUNTING_LEDGER WHERE STATUS IN ('UNPAID', 'PENDING')"),
      pool.query(
        `SELECT L.LEDGER_ID, L.DETAIL, L.AMOUNT, L.DUE_DATE, L.TRANSACTION_ID, L.STATUS,
          S.FIRST_NAME, S.LAST_NAME, S.ROLL_NUMBER
         FROM ACCOUNTING_LEDGER L JOIN STUDENTS S ON S.STUDENT_ID = L.STUDENT_ID
         ORDER BY L.CREATED_AT DESC LIMIT 20`,
      ),
    ]);
    res.json({
      totals: totals[0],
      outstanding: outstanding[0],
      recent,
    });
  } catch (error) {
    console.error("Accounting summary error:", error);
    res.status(500).json({ message: "Unable to load accounting summary." });
  }
});

router.post("/:userId/accounting", async (req, res) => {
  try {
    const { studentId, detail, amount, dueDate, status = "UNPAID", transactionId = "" } = req.body;
    if (!Number.isInteger(Number(studentId)) || !detail?.trim() || !Number.isFinite(Number(amount))) {
      return res.status(400).json({ message: "Student id, detail, and amount are required." });
    }
    if (!["PAID", "UNPAID", "PENDING", "WAIVED"].includes(status)) {
      return res.status(400).json({ message: "Invalid accounting status." });
    }
    const result = await pool.query(
      `INSERT INTO ACCOUNTING_LEDGER
        (STUDENT_ID, DETAIL, AMOUNT, DUE_DATE, TRANSACTION_ID, STATUS, PAID_AT)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [studentId, detail.trim(), amount, dueDate || null, transactionId.trim(), status, status === "PAID" ? new Date() : null],
    );
    res.status(201).json({ id: Number(result.insertId), message: "Ledger entry created." });
  } catch (error) {
    console.error("Create ledger entry error:", error);
    res.status(500).json({ message: "Unable to create ledger entry." });
  }
});

router.patch("/:userId/accounting/:ledgerId/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["PAID", "UNPAID", "PENDING", "WAIVED"].includes(status)) {
      return res.status(400).json({ message: "Invalid accounting status." });
    }
    const result = await pool.query(
      "UPDATE ACCOUNTING_LEDGER SET STATUS = ?, PAID_AT = ? WHERE LEDGER_ID = ?",
      [status, status === "PAID" ? new Date() : null, req.params.ledgerId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Ledger entry not found." });
    res.json({ message: "Ledger status updated." });
  } catch (error) {
    console.error("Update ledger status error:", error);
    res.status(500).json({ message: "Unable to update ledger status." });
  }
});

router.get("/:userId/library/catalog", async (_req, res) => {
  try {
    res.json(await pool.query("SELECT * FROM LIBRARY_CATALOG ORDER BY TITLE ASC"));
  } catch (error) {
    console.error("Library catalog error:", error);
    res.status(500).json({ message: "Unable to load library catalog." });
  }
});

router.post("/:userId/library/catalog", async (req, res) => {
  try {
    const { isbn = "", title, author, category = "", totalCopies } = req.body;
    if (!title?.trim() || !author?.trim() || !Number.isInteger(Number(totalCopies)) || Number(totalCopies) < 1) {
      return res.status(400).json({ message: "Title, author, and a positive copy count are required." });
    }
    const result = await pool.query(
      `INSERT INTO LIBRARY_CATALOG
        (ISBN, TITLE, AUTHOR, CATEGORY, TOTAL_COPIES, AVAILABLE_COPIES)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [isbn.trim() || null, title.trim(), author.trim(), category.trim(), totalCopies, totalCopies],
    );
    res.status(201).json({ id: Number(result.insertId), message: "Book added to catalog." });
  } catch (error) {
    console.error("Add catalog book error:", error);
    res.status(500).json({ message: "Unable to add book." });
  }
});

router.get("/:userId/library/issues", async (_req, res) => {
  try {
    res.json(await pool.query(
      `SELECT I.*, C.TITLE, C.AUTHOR, S.FIRST_NAME, S.LAST_NAME, S.ROLL_NUMBER
       FROM LIBRARY_ISSUES I
       JOIN LIBRARY_CATALOG C ON C.BOOK_ID = I.BOOK_ID
       JOIN STUDENTS S ON S.STUDENT_ID = I.STUDENT_ID
       ORDER BY I.ISSUE_DATE DESC`,
    ));
  } catch (error) {
    console.error("Library issues error:", error);
    res.status(500).json({ message: "Unable to load library issues." });
  }
});

router.post("/:userId/library/issues", async (req, res) => {
  let conn;
  try {
    const { bookId, studentId, dueDate } = req.body;
    if (!Number.isInteger(Number(bookId)) || !Number.isInteger(Number(studentId)) || !dueDate) {
      return res.status(400).json({ message: "Book id, student id, and due date are required." });
    }
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const books = await conn.query("SELECT AVAILABLE_COPIES FROM LIBRARY_CATALOG WHERE BOOK_ID = ? FOR UPDATE", [bookId]);
    if (!books.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Book not found." });
    }
    if (books[0].AVAILABLE_COPIES < 1) {
      await conn.rollback();
      return res.status(409).json({ message: "No copies are currently available." });
    }
    const result = await conn.query(
      "INSERT INTO LIBRARY_ISSUES (BOOK_ID, STUDENT_ID, ISSUE_DATE, DUE_DATE) VALUES (?, ?, CURDATE(), ?)",
      [bookId, studentId, dueDate],
    );
    await conn.query("UPDATE LIBRARY_CATALOG SET AVAILABLE_COPIES = AVAILABLE_COPIES - 1 WHERE BOOK_ID = ?", [bookId]);
    await conn.commit();
    res.status(201).json({ id: Number(result.insertId), message: "Book issued." });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error("Issue library book error:", error);
    res.status(500).json({ message: "Unable to issue book." });
  } finally {
    if (conn) conn.release();
  }
});

router.patch("/:userId/library/issues/:issueId/return", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const issues = await conn.query("SELECT BOOK_ID, STATUS FROM LIBRARY_ISSUES WHERE ISSUE_ID = ? FOR UPDATE", [req.params.issueId]);
    if (!issues.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Issue record not found." });
    }
    if (issues[0].STATUS === "RETURNED") {
      await conn.rollback();
      return res.status(409).json({ message: "Book has already been returned." });
    }
    await conn.query("UPDATE LIBRARY_ISSUES SET STATUS = 'RETURNED', RETURN_DATE = CURDATE() WHERE ISSUE_ID = ?", [req.params.issueId]);
    await conn.query("UPDATE LIBRARY_CATALOG SET AVAILABLE_COPIES = AVAILABLE_COPIES + 1 WHERE BOOK_ID = ?", [issues[0].BOOK_ID]);
    await conn.commit();
    res.json({ message: "Book returned." });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error("Return library book error:", error);
    res.status(500).json({ message: "Unable to return book." });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
