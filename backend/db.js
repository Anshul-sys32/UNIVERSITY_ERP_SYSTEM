const mariadb = require('mariadb');
require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });

const pool = mariadb.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "university_erp",
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
  bigIntAsNumber: true,
  acquireTimeout: 10000,
  cachingRsaPublicKey: process.env.DB_CACHING_RSA_PUBLIC_KEY || undefined,
  allowPublicKeyRetrieval: process.env.DB_ALLOW_PUBLIC_KEY_RETRIEVAL === "true",
});

module.exports = pool;
