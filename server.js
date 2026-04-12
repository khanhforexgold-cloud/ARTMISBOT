const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

async function q(text, params = []) { return pool.query(text, params); }

async function initDb() {
  await q(`CREATE TABLE IF NOT EXISTS site_content (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q(`CREATE TABLE IF NOT EXISTS leads (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    package_name TEXT,
    capital TEXT,
    market TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const defaults = {
    hero: {
      title: "Giao dịch rõ ràng hơn cùng ARTEMIS BOT",
      subtitle: "Công cụ dành cho trader muốn nhìn rõ điểm vào lệnh và tự tin hơn khi giao dịch XAUUSD.",
      hotline: "0961 282 422",
      zalo: "https://zalo.me/0961282422"
    },
    packages: [
      {tag:"DỄ BẮT ĐẦU",name:"Gói Demo",priceMain:"299",priceUnit:"K",desc:"Dùng thử ngay để trải nghiệm hệ thống trước khi nâng cấp.",features:["Trải nghiệm 3–7 ngày","Phù hợp người mới","Cài đặt nhanh, dùng ngay"],button:"Nhận demo",primary:false},
      {tag:"ĐƯỢC CHỌN NHIỀU NHẤT",name:"Gói Pro",priceMain:"999",priceUnit:"K",desc:"Gói dùng chính cho trader muốn giao dịch thực chiến mỗi ngày.",features:["Full BOT cho XAUUSD","Tín hiệu rõ ràng","Dễ dùng, hiệu quả hơn"],button:"Mua ngay",primary:true},
      {tag:"CAO CẤP",name:"Gói VIP",priceMain:"2.5",priceUnit:"TR",desc:"Gói tối ưu lợi nhuận cho người muốn được hỗ trợ sát hơn.",features:["BOT + hỗ trợ 1-1","Hướng dẫn vào lệnh","Ưu tiên support"],button:"Đăng ký VIP",primary:false}
    ],
    signals: [
      {badge:"BUY ALIGNED",title:"XAUUSD M15",desc:"Tín hiệu thuận xu hướng, phù hợp trader muốn nhìn điểm vào lệnh rõ hơn.",tags:["RSI OK","Volume OK","Trend Bullish"]},
      {badge:"SELL SETUP",title:"XAUUSD M5",desc:"Tín hiệu đảo chiều rõ hơn, giúp khách hiểu BOT có lọc lệnh chứ không vào bừa.",tags:["Momentum","Filter ON","Stop Hunt"]},
      {badge:"VIP SUPPORT",title:"Cài nhanh trong ngày",desc:"Khách chọn gói xong có thể được hỗ trợ cài BOT nhanh để bắt đầu dùng sớm hơn.",tags:["Hỗ trợ","Nhanh","Dễ dùng"]}
    ]
  };

  for (const [key, value] of Object.entries(defaults)) {
    await q(`INSERT INTO site_content (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [key, JSON.stringify(value)]);
  }
}

async function getContent(key, fallback) {
  const { rows } = await q(`SELECT value FROM site_content WHERE key = $1 LIMIT 1`, [key]);
  return rows[0]?.value ?? fallback;
}

async function setContent(key, value) {
  await q(`INSERT INTO site_content (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`, [key, JSON.stringify(value)]);
}

function requireAdmin(req, res, next) {
  const password = req.header("x-admin-password");
  if (!password || password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Sai mật khẩu admin." });
  next();
}

app.get("/health", async (_req, res) => {
  try { await q("SELECT 1"); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post("/api/admin/login", (req, res) => {
  if ((req.body || {}).password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Sai mật khẩu." });
  res.json({ success: true });
});

app.get("/api/hero", async (_req, res) => res.json(await getContent("hero", {})));
app.get("/api/packages", async (_req, res) => res.json(await getContent("packages", [])));
app.get("/api/signals", async (_req, res) => res.json(await getContent("signals", [])));

app.put("/api/admin/hero", requireAdmin, async (req, res) => { await setContent("hero", req.body || {}); res.json({ success: true }); });
app.put("/api/admin/packages", requireAdmin, async (req, res) => { await setContent("packages", Array.isArray(req.body) ? req.body : []); res.json({ success: true }); });
app.put("/api/admin/signals", requireAdmin, async (req, res) => { await setContent("signals", Array.isArray(req.body) ? req.body : []); res.json({ success: true }); });

app.post("/api/leads", async (req, res) => {
  const { name, phone, packageName, capital, market, note } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: "Thiếu tên hoặc số điện thoại." });
  await q(`INSERT INTO leads (name, phone, package_name, capital, market, note) VALUES ($1,$2,$3,$4,$5,$6)`,
    [name, phone, packageName || null, capital || null, market || null, note || null]);
  res.json({ success: true });
});

app.get("/api/admin/leads", requireAdmin, async (_req, res) => {
  const { rows } = await q(`SELECT id, name, phone, package_name AS "packageName", capital, market, note, created_at AS "createdAt" FROM leads ORDER BY id DESC LIMIT 500`);
  res.json(rows);
});

initDb().then(() => {
  app.listen(PORT, () => console.log("Server running on port " + PORT));
}).catch(err => {
  console.error("DB init failed:", err);
  process.exit(1);
});
