const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const DATA_DIR = path.join(__dirname, "data");

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file)));
}

function writeJson(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// TEST SERVER
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// GET DATA
app.get("/api/packages", (req, res) => {
  res.json(readJson("packages.json"));
});

app.get("/api/signals", (req, res) => {
  res.json(readJson("signals.json"));
});

// SAVE DATA
app.post("/api/admin/packages", (req, res) => {
  writeJson("packages.json", req.body);
  res.json({ success: true });
});

app.post("/api/admin/signals", (req, res) => {
  writeJson("signals.json", req.body);
  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port " + PORT));



    
 
 
