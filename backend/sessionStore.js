const session = require("express-session");

class MariaDbSessionStore extends session.Store {
  constructor(pool) {
    super();
    this.pool = pool;
    this.cleanupTimer = setInterval(() => {
      this.pool.query("DELETE FROM ERP_SESSIONS WHERE EXPIRES_AT <= CURRENT_TIMESTAMP")
        .catch((error) => console.error("Expired session cleanup failed:", error));
    }, 15 * 60 * 1000);
    this.cleanupTimer.unref();
  }

  get(sessionId, callback) {
    this.pool.query(
      "SELECT SESSION_DATA FROM ERP_SESSIONS WHERE SESSION_ID = ? AND EXPIRES_AT > CURRENT_TIMESTAMP",
      [sessionId],
    ).then((rows) => callback(null, rows[0] ? JSON.parse(rows[0].SESSION_DATA) : null))
      .catch(callback);
  }

  set(sessionId, sessionData, callback = () => {}) {
    const expiresAt = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires)
      : new Date(Date.now() + (sessionData.cookie?.maxAge || 30 * 60 * 1000));
    this.pool.query(
      `INSERT INTO ERP_SESSIONS (SESSION_ID, EXPIRES_AT, SESSION_DATA)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE EXPIRES_AT = VALUES(EXPIRES_AT), SESSION_DATA = VALUES(SESSION_DATA)`,
      [sessionId, expiresAt, JSON.stringify(sessionData)],
    ).then(() => callback(null)).catch(callback);
  }

  destroy(sessionId, callback = () => {}) {
    this.pool.query("DELETE FROM ERP_SESSIONS WHERE SESSION_ID = ?", [sessionId])
      .then(() => callback(null)).catch(callback);
  }

  touch(sessionId, sessionData, callback = () => {}) {
    const expiresAt = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires)
      : new Date(Date.now() + (sessionData.cookie?.maxAge || 30 * 60 * 1000));
    this.pool.query("UPDATE ERP_SESSIONS SET EXPIRES_AT = ? WHERE SESSION_ID = ?", [expiresAt, sessionId])
      .then(() => callback(null)).catch(callback);
  }
}

module.exports = MariaDbSessionStore;