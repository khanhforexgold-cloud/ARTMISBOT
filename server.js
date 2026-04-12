const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 10000;

// ===== DATABASE =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ===== MIDDLEWARE =====
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ===== FIX LỖI NOT FOUND (QUAN TRỌNG) =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== API SAVE FORM =====
app.post("/api/register", async (req, res) => {
  const { name, phone, goi, von, thi_truong, ghi_chu } = req.body;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name TEXT,
        phone TEXT,
        goi TEXT,
        von TEXT,
        thi_truong TEXT,
        ghi_chu TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(
      `INSERT INTO leads (name, phone, goi, von, thi_truong, ghi_chu)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [name, phone, goi, von, thi_truong, ghi_chu]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
});

// ===== ADMIN LOGIN =====
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// ===== ADMIN GET DATA =====
app.get("/api/leads", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM leads ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.json([]);
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});



