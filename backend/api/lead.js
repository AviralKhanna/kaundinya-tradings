// POST /api/lead — serverless (Vercel) version of the lead capture endpoint.
// Persists to Vercel KV when connected; always logs so nothing is lost.
// The local Express server (server.js) is the file-based equivalent.

import notify from './_notify.js';
import store from './_store.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
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
      ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
      timestamp: new Date().toISOString(),
    };

    let stored = false;
    try {
      stored = await store.saveLead(lead);
    } catch (e) {
      console.error('Blob store failed:', e);
    }

    console.log('LEAD_CAPTURED', JSON.stringify(lead));

    // Forward to Telegram / email if configured (safe no-op otherwise).
    const notified = await notify.notifyLead(lead);
    console.log('LEAD_NOTIFIED', JSON.stringify(notified));

    return res.status(201).json({ ok: true, id: lead.id, stored, notified });
  } catch (e) {
    console.error('lead handler error:', e);
    return res.status(500).json({ error: 'Could not save your enquiry. Please try again.' });
  }
}
