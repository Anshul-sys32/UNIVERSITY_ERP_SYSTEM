const mariadb = require('mariadb');
require('dotenv').config();

const pool = mariadb.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "university_erp",
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
  bigIntAsNumber: true,
  acquireTimeout: 10000,
});

module.exports = pool;
