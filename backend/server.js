// Kaundinya Tradings — Lead-capture backend
// A small Express server that receives enquiries from the frontend
// (e.g. the insurance "Get Quote" mobile-number form) and appends
// each one to data/leads.json and data/leads.csv.

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { notifyLead } = require('./api/_notify');

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_KEY = process.env.LEADS_SECRET || 'kaundinya-admin';

const DATA_DIR = path.join(__dirname, 'data');
const JSON_FILE = path.join(DATA_DIR, 'leads.json');
const CSV_FILE = path.join(DATA_DIR, 'leads.csv');

// ---------- Middleware ----------
app.use(cors());                          // allow the frontend (any origin) to call us
app.use(express.json());                  // parse JSON request bodies
app.use(express.urlencoded({ extended: true }));

// ---------- Storage helpers ----------
function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(JSON_FILE)) fs.writeFileSync(JSON_FILE, '[]');
  if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, 'timestamp,name,mobile,product,type,page\n');
  }
}

function readLeads() {
  try {
    return JSON.parse(fs.readFileSync(JSON_FILE, 'utf8') || '[]');
  } catch {
    return [];
  }
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function appendLead(lead) {
  ensureStore();
  // Append to the JSON array (read-modify-write; fine for low volume).
  const leads = readLeads();
  leads.push(lead);
  fs.writeFileSync(JSON_FILE, JSON.stringify(leads, null, 2));

  // Append one row to the CSV.
  const row = [lead.timestamp, lead.name, lead.mobile, lead.product, lead.type, lead.page]
    .map(csvCell)
    .join(',');
  fs.appendFileSync(CSV_FILE, row + '\n');

  return leads.length;
}

// ---------- Routes ----------

// Health check
app.get('/health', (req, res) => res.json({ ok: true, service: 'kaundinya-leads', port: PORT }));

// Capture a new lead  (called by the frontend insurance form)
app.post('/api/lead', async (req, res) => {
  const body = req.body || {};
  const mobile = String(body.mobile || '').replace(/\D/g, '').slice(-10);

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return res.status(400).json({ error: 'A valid 10-digit Indian mobile number is required.' });
  }

  const lead = {
    id: Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    name: String(body.name || '').slice(0, 80),
    mobile,
    product: String(body.product || '').slice(0, 80),
    type: String(body.type || 'enquiry').slice(0, 40),
    page: String(body.page || '').slice(0, 300),
    ip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString(),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
    timestamp: new Date().toISOString(),
  };

  try {
    const total = appendLead(lead);
    console.log(`[lead] ${lead.mobile} — ${lead.product} (total: ${total})`);

    // Forward to Telegram / email if configured (safe no-op otherwise).
    const notified = await notifyLead(lead);
    console.log('[notify]', JSON.stringify(notified));

    return res.status(201).json({ ok: true, id: lead.id, total, notified });
  } catch (e) {
    console.error('Failed to save lead:', e);
    return res.status(500).json({ error: 'Could not save your enquiry. Please try again.' });
  }
});

// View captured leads (simple key protection)
app.get('/api/leads', (req, res) => {
  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Append ?key=YOUR_SECRET' });
  }
  const leads = readLeads();
  return res.json({ count: leads.length, leads: leads.slice().reverse() });
});

// ---------- Start ----------
ensureStore();
app.listen(PORT, () => {
  console.log(`Kaundinya Tradings lead API running on http://localhost:${PORT}`);
  console.log(`  POST http://localhost:${PORT}/api/lead`);
  console.log(`  GET  http://localhost:${PORT}/api/leads?key=${ADMIN_KEY}`);
  console.log(`  Leads saved to: ${JSON_FILE}`);
});
