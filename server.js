
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
const DATA_DIR = path.join(__dirname, "data");

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));
}

function writeJson(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(data, null, 2), "utf8");
}

function requireAdmin(req, res, next) {
  const password = req.header("x-admin-password");
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu admin." });
  }
  next();
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu." });
  }
  res.json({ success: true });
});

app.get("/api/signals", (_req, res) => res.json(readJson("signals.json")));
app.get("/api/packages", (_req, res) => res.json(readJson("packages.json")));

app.put("/api/admin/signals", requireAdmin, (req, res) => {
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
  writeJson("signals.json", items);
  res.json({ success: true, items });
});

app.put("/api/admin/packages", requireAdmin, (req, res) => {
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
  writeJson("packages.json", items);
  res.json({ success: true, items });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
