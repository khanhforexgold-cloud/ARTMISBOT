
const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false },
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS content_store (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const defaultSignals = [
    {
      badge: "BUY ALIGNED",
      title: "XAUUSD M15",
      desc: "Tín hiệu thuận xu hướng, phù hợp trader muốn nhìn điểm vào lệnh rõ hơn.",
      tags: ["RSI OK", "Volume OK", "Trend Bullish"]
    },
    {
      badge: "SELL SETUP",
      title: "XAUUSD M5",
      desc: "Tín hiệu đảo chiều rõ hơn, giúp khách hiểu BOT có lọc lệnh chứ không vào bừa.",
      tags: ["Momentum", "Filter ON", "Stop Hunt"]
    },
    {
      badge: "VIP SUPPORT",
      title: "Cài nhanh trong ngày",
      desc: "Khách chọn gói xong có thể được hỗ trợ cài BOT nhanh để bắt đầu dùng sớm hơn.",
      tags: ["Hỗ trợ", "Nhanh", "Dễ dùng"]
    }
  ];

  const defaultPackages = [
    {
      tag: "DỄ BẮT ĐẦU",
      name: "Gói Demo",
      priceMain: "299",
      priceUnit: "K",
      desc: "Dùng thử ngay để trải nghiệm hệ thống trước khi nâng cấp.",
      features: ["Trải nghiệm 3–7 ngày", "Phù hợp người mới", "Cài đặt nhanh, dùng ngay"],
      button: "Nhận demo",
      primary: false
    },
    {
      tag: "ĐƯỢC CHỌN NHIỀU NHẤT",
      name: "Gói Pro",
      priceMain: "999",
      priceUnit: "K",
      desc: "Gói dùng chính cho trader muốn giao dịch thực chiến mỗi ngày.",
      features: ["Full BOT cho XAUUSD", "Tín hiệu rõ ràng", "Dễ dùng, hiệu quả hơn"],
      button: "Mua ngay",
      primary: true
    },
    {
      tag: "CAO CẤP",
      name: "Gói VIP",
      priceMain: "2.5",
      priceUnit: "TR",
      desc: "Gói tối ưu lợi nhuận cho người muốn được hỗ trợ sát hơn.",
      features: ["BOT + hỗ trợ 1-1", "Hướng dẫn vào lệnh", "Ưu tiên support"],
      button: "Đăng ký VIP",
      primary: false
    }
  ];

  await pool.query(
    `INSERT INTO content_store (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key) DO NOTHING`,
    ["signals", JSON.stringify(defaultSignals)]
  );

  await pool.query(
    `INSERT INTO content_store (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key) DO NOTHING`,
    ["packages", JSON.stringify(defaultPackages)]
  );
}

async function getContent(key) {
  const { rows } = await pool.query("SELECT value FROM content_store WHERE key = $1 LIMIT 1", [key]);
  return rows[0]?.value || [];
}

async function setContent(key, value) {
  await pool.query(
    `INSERT INTO content_store (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
}

function requireAdmin(req, res, next) {
  const password = req.header("x-admin-password");
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu admin." });
  }
  next();
}

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
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
  try {
    res.json(await getContent("signals"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/packages", async (_req, res) => {
  try {
    res.json(await getContent("packages"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/signals", requireAdmin, async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: "Signals phải là mảng." });
  for (const item of items) {
    if (!item.badge || !item.title) return res.status(400).json({ error: "Mỗi tín hiệu phải có badge và title." });
    if (!Array.isArray(item.tags)) item.tags = [];
  }
  try {
    await setContent("signals", items);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/packages", requireAdmin, async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: "Packages phải là mảng." });
  for (const item of items) {
    if (!item.name || !item.priceMain) return res.status(400).json({ error: "Mỗi gói phải có name và priceMain." });
    if (!Array.isArray(item.features)) item.features = [];
  }
  try {
    await setContent("packages", items);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log("Server running on port " + PORT);
    });
  })
  .catch((err) => {
    console.error("Init DB failed:", err);
    process.exit(1);
  });
