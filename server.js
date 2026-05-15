const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app      = express();
const PORT     = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'entries.json');

app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

app.get('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) return res.json([]);
    res.json(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'expected array' });
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body), 'utf8');
    res.json({ ok: true, count: req.body.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`La Table des Savoirs · http://localhost:${PORT}`));
