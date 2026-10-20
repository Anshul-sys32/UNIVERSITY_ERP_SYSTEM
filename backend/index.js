const express = require("express");
const bcrypt = require("bcrypt");
const cors = require("cors");
const pool = require("./db");
const studentRoutes = require("./routes/students");
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());


app.use("/students", studentRoutes);


app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Basic check before DB query
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const conn = await pool.getConnection();
    const rows = await conn.query("SELECT * FROM USERS WHERE username = ? AND is_active = 1", [username]);
    conn.release();

    if (rows.length === 0) {
      return res.status(401).json({ message: "User not found or inactive." });
    }

    const user = rows[0];
    // console.log("username:",user.USERNAME+" hashed:",user.PASSWORD_HASH+ " role:",user.ROLE);

    // Debug log to catch if anything is undefined
    if (!user.PASSWORD_HASH) {
      console.error("Password hash missing in DB for user:", username);
      // console.log("Fetched Hash Pass : ", user.PASSWORD_HASH)
      return res.status(500).json({ message: "Internal error (missing password hash)." });
    }

    const passwordMatch = await bcrypt.compare(password, user.PASSWORD_HASH);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    return res.json({
      user_id: user.USER_ID,
      username: user.USERNAME,
      role: user.ROLE,
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});


app.post("/register", async (req, res) => {
    const { username, password, role } = req.body;
  
    if (!username || !password || !role) {
      return res.status(400).json({ message: "Missing required fields." });
    }
  
    try {
      const conn = await pool.getConnection();
  
      // Check if user already exists
      const existing = await conn.query("SELECT * FROM USERS WHERE USERNAME = ?", [username]);
      if (existing.length > 0) {
        conn.release();
        return res.status(409).json({ message: "User already exists." });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      await conn.query(
        "INSERT INTO USERS (USERNAME, PASSWORD_HASH, ROLE) VALUES (?, ?, ?)",
        [username, hashedPassword, role] 
      );
  
      conn.release();
  
      res.status(201).json({ message: "User registered successfully." });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  });
  


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
