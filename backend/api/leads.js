// GET /api/leads?key=SECRET — list captured leads (serverless / Vercel, Blob-backed).
import store from './_store.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const secret = process.env.LEADS_SECRET || 'kaundinya-admin';
  if (req.query.key !== secret) {
    return res.status(401).json({ error: 'Unauthorized. Append ?key=YOUR_SECRET' });
  }

  try {
    const leads = await store.listLeads();
    if (leads === null) {
      return res.status(200).json({
        count: 0,
        leads: [],
        note: 'Blob storage not configured (BLOB_READ_WRITE_TOKEN missing).',
      });
    }
    return res.status(200).json({ count: leads.length, leads });
  } catch (e) {
    console.error('leads read error:', e);
    return res.status(500).json({ error: 'Failed to read leads.' });
  }
}
