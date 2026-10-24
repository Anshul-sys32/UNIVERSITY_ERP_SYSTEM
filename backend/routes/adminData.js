const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");

const createAdminDataRouter = (database = pool) => {
  const router = express.Router();

  const listTables = async () => database.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
  );

  const quoteIdentifier = (identifier) => `\`${String(identifier).replaceAll("`", "``")}\``;

  const getTable = async (requestedName) => {
    const tables = await listTables();
    const table = tables.find((item) => item.TABLE_NAME === requestedName);
    if (!table) return null;
    const columns = await database.query(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT,
        EXTRA, COLUMN_KEY, ORDINAL_POSITION
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [table.TABLE_NAME],
    );
    if (!columns.length) return null;
    return {
      name: table.TABLE_NAME,
      columns: columns.map((column) => column.COLUMN_NAME === "PASSWORD_HASH" && table.TABLE_NAME === "USERS"
        ? { ...column, COLUMN_NAME: "PASSWORD", DATA_TYPE: "password", COLUMN_TYPE: "password", IS_NULLABLE: "NO", EXTRA: "WRITE_ONLY" }
        : column),
      storageColumns: columns,
      primaryKey: columns.filter((column) => column.COLUMN_KEY === "PRI").map((column) => column.COLUMN_NAME),
    };
  };

  const publicColumns = (table) => table.columns.map(({ COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_KEY }) => ({
    name: COLUMN_NAME,
    type: DATA_TYPE,
    columnType: COLUMN_TYPE,
    nullable: IS_NULLABLE === "YES",
    defaultValue: COLUMN_DEFAULT,
    extra: EXTRA,
    primaryKey: COLUMN_KEY === "PRI",
    readOnly: COLUMN_KEY === "PRI" || /auto_increment|generated/i.test(EXTRA || ""),
  }));

  const validateFields = (table, values, { editing = false } = {}) => {
    if (!values || typeof values !== "object" || Array.isArray(values)) return { error: "Record values must be an object." };
    const allowed = new Map(table.columns.map((column) => [column.COLUMN_NAME, column]));
    const entries = Object.entries(values).filter(([name]) => !(editing && table.primaryKey.includes(name)));
    for (const [name, value] of entries) {
      const column = allowed.get(name);
      if (!column) return { error: `Unknown column: ${name}.` };
      if (/auto_increment|generated/i.test(column.EXTRA || "") || column.COLUMN_KEY === "PRI") {
        return { error: `Column ${name} is managed by the database and cannot be changed.` };
      }
      if (table.name === "USERS" && name === "PASSWORD" && editing && (value === "" || value === null || value === undefined)) continue;
      if (value === "" && column.IS_NULLABLE === "YES") values[name] = null;
    }
    return { entries };
  };

  const databaseValues = async (table, entries) => {
    const mapped = [];
    for (const [name, value] of entries) {
      if (table.name === "USERS" && name === "PASSWORD") {
        if (value === "" || value === null || value === undefined) continue;
        if (typeof value !== "string" || value.length < 12) throw Object.assign(new Error("Passwords must contain at least 12 characters."), { status: 400 });
        mapped.push(["PASSWORD_HASH", await bcrypt.hash(value, 12)]);
      } else {
        mapped.push([name, value]);
      }
    }
    return mapped;
  };

  const validateKey = (table, key) => {
    if (!table.primaryKey.length) return "This table has no primary key and cannot be updated or deleted here.";
    if (!key || typeof key !== "object" || Array.isArray(key)) return "A primary-key value is required.";
    if (table.primaryKey.some((column) => key[column] === undefined || key[column] === null || key[column] === "")) {
      return "Provide every primary-key column for this record.";
    }
    return null;
  };

  const wherePrimaryKey = (table, key) => ({
    clause: table.primaryKey.map((column) => `${quoteIdentifier(column)} = ?`).join(" AND "),
    values: table.primaryKey.map((column) => key[column]),
  });

  router.get("/tables", async (_req, res) => {
    try {
      const tables = await listTables();
      return res.json({ tables: tables.map((table) => table.TABLE_NAME) });
    } catch (error) {
      console.error("Admin table inventory error:", error);
      return res.status(500).json({ message: "Unable to list database tables." });
    }
  });

  router.get("/:table", async (req, res) => {
    try {
      const table = await getTable(req.params.table);
      if (!table) return res.status(404).json({ message: "Database table not found." });
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 200);
      const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
      const storageNames = table.storageColumns
        .filter((column) => !(table.name === "USERS" && column.COLUMN_NAME === "PASSWORD_HASH"))
        .map((column) => quoteIdentifier(column.COLUMN_NAME));
      const orderBy = table.primaryKey.length
        ? ` ORDER BY ${table.primaryKey.map(quoteIdentifier).join(", ")}`
        : "";
      const rows = await database.query(
        `SELECT ${storageNames.join(", ")} FROM ${quoteIdentifier(table.name)}${orderBy} LIMIT ? OFFSET ?`,
        [limit, offset],
      );
      return res.json({ table: table.name, columns: publicColumns(table), primaryKey: table.primaryKey, rows, limit, offset });
    } catch (error) {
      console.error("Admin table read error:", error);
      return res.status(500).json({ message: "Unable to read this database table." });
    }
  });

  router.post("/:table", async (req, res) => {
    try {
      const table = await getTable(req.params.table);
      if (!table) return res.status(404).json({ message: "Database table not found." });
      const checked = validateFields(table, req.body?.values);
      if (checked.error) return res.status(400).json({ message: checked.error });
      const entries = await databaseValues(table, checked.entries);
      const columns = entries.map(([name]) => quoteIdentifier(name));
      const placeholders = entries.map(() => "?");
      const result = columns.length
        ? await database.query(`INSERT INTO ${quoteIdentifier(table.name)} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`, entries.map(([, value]) => value))
        : await database.query(`INSERT INTO ${quoteIdentifier(table.name)} () VALUES ()`);
      const insertId = result.insertId === undefined || result.insertId === null
        ? null
        : String(result.insertId);
      return res.status(201).json({ message: "Record created.", insertId });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      if (["ER_DUP_ENTRY", "ER_NO_REFERENCED_ROW_2", "ER_ROW_IS_REFERENCED_2", "ER_CHECK_CONSTRAINT_VIOLATED"].includes(error.code)) {
        return res.status(409).json({ message: "The record conflicts with a unique key, relationship, or table constraint." });
      }
      console.error("Admin table create error:", error);
      return res.status(500).json({ message: "Unable to create this record." });
    }
  });

  router.put("/:table", async (req, res) => {
    try {
      const table = await getTable(req.params.table);
      if (!table) return res.status(404).json({ message: "Database table not found." });
      const keyError = validateKey(table, req.body?.key);
      if (keyError) return res.status(400).json({ message: keyError });
      const checked = validateFields(table, req.body?.values, { editing: true });
      if (checked.error) return res.status(400).json({ message: checked.error });
      const entries = await databaseValues(table, checked.entries);
      if (!entries.length) return res.status(400).json({ message: "No editable values were supplied." });
      const where = wherePrimaryKey(table, req.body.key);
      const assignments = entries.map(([name]) => `${quoteIdentifier(name)} = ?`).join(", ");
      const result = await database.query(
        `UPDATE ${quoteIdentifier(table.name)} SET ${assignments} WHERE ${where.clause}`,
        [...entries.map(([, value]) => value), ...where.values],
      );
      if (!result.affectedRows) {
        const existing = await database.query(
          `SELECT 1 AS RECORD_EXISTS FROM ${quoteIdentifier(table.name)} WHERE ${where.clause} LIMIT 1`,
          where.values,
        );
        if (!existing.length) return res.status(404).json({ message: "Record not found." });
      }
      return res.json({ message: "Record updated." });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      if (["ER_DUP_ENTRY", "ER_NO_REFERENCED_ROW_2", "ER_ROW_IS_REFERENCED_2", "ER_CHECK_CONSTRAINT_VIOLATED"].includes(error.code)) {
        return res.status(409).json({ message: "The record conflicts with a unique key, relationship, or table constraint." });
      }
      console.error("Admin table update error:", error);
      return res.status(500).json({ message: "Unable to update this record." });
    }
  });

  router.delete("/:table", async (req, res) => {
    try {
      const table = await getTable(req.params.table);
      if (!table) return res.status(404).json({ message: "Database table not found." });
      const keyError = validateKey(table, req.body?.key);
      if (keyError) return res.status(400).json({ message: keyError });
      const where = wherePrimaryKey(table, req.body.key);
      const result = await database.query(
        `DELETE FROM ${quoteIdentifier(table.name)} WHERE ${where.clause}`,
        where.values,
      );
      if (!result.affectedRows) return res.status(404).json({ message: "Record not found." });
      return res.json({ message: "Record deleted." });
    } catch (error) {
      if (["ER_ROW_IS_REFERENCED_2", "ER_ROW_IS_REFERENCED", "ER_ROW_IS_REFERENCED_NO_PARENT"].includes(error.code)) {
        return res.status(409).json({ message: "This record is referenced by other records and cannot be deleted first." });
      }
      console.error("Admin table delete error:", error);
      return res.status(500).json({ message: "Unable to delete this record." });
    }
  });

  return router;
};

module.exports = createAdminDataRouter;
