import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";

const { Pool } = pkg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 10000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
const DATA_DIR = path.join(__dirname, "data");
const DATABASE_URL = process.env.DATABASE_URL || "";

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));
}

function requireAdmin(req, res, next) {
  const password = req.header("x-admin-password");
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu admin." });
  }
  next();
}

const fallbackData = {
  packages: readJson("packages.json"),
  signals: readJson("signals.json")
};

let pool = null;
if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

async function initDb() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const [key, value] of Object.entries(fallbackData)) {
    await pool.query(
      `INSERT INTO site_content (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      [key, JSON.stringify(value)]
    );
  }
}

async function getContent(key) {
  if (!pool) return fallbackData[key] || [];
  const { rows } = await pool.query(
    `SELECT value FROM site_content WHERE key = $1 LIMIT 1`,
    [key]
  );
  return rows[0]?.value || fallbackData[key] || [];
}

async function setContent(key, value) {
  if (!pool) {
    fallbackData[key] = value;
    return;
  }
  await pool.query(
    `INSERT INTO site_content (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
}

app.get("/health", async (_req, res) => {
  try {
    if (pool) await pool.query("SELECT 1");
    res.json({ ok: true, db: !!pool });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu." });
  }
  res.json({ success: true });
});

app.get("/api/signals", async (_req, res) => {
  res.json(await getContent("signals"));
});

app.get("/api/packages", async (_req, res) => {
  res.json(await getContent("packages"));
});

app.put("/api/admin/signals", requireAdmin, async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Signals phải là mảng." });
  }
  for (const item of items) {
    if (!item.badge || !item.title) {
      return res.status(400).json({ error: "Mỗi tín hiệu phải có badge và title." });
    }
    if (!Array.isArray(item.tags)) item.tags = [];
  }
  await setContent("signals", items);
  res.json({ success: true, items });
});

app.put("/api/admin/packages", requireAdmin, async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Packages phải là mảng." });
  }
  for (const item of items) {
    if (!item.name || !item.priceMain) {
      return res.status(400).json({ error: "Mỗi gói phải có name và priceMain." });
    }
    if (!Array.isArray(item.features)) item.features = [];
  }
  await setContent("packages", items);
  res.json({ success: true, items });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB init failed:", err);
    process.exit(1);
  });
