// Blob-backed persistence for the DEPLOYED (serverless) backend.
// Each lead is stored as its own private blob under leads/ — append-only,
// so concurrent submits never overwrite each other.
// The local Express server (server.js) uses file storage instead.

const PREFIX = 'leads/';

function hasBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

async function saveLead(lead) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;
  const { put } = await import('@vercel/blob');
  const id = lead.id || Date.now().toString(36);
  await put(`${PREFIX}${lead.timestamp}_${id}.json`, JSON.stringify(lead), {
    access: 'private',
    token,
    contentType: 'application/json',
    addRandomSuffix: false,
  });
  return true;
}

async function listLeads() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ token, prefix: PREFIX });
  const leads = await Promise.all(
    blobs.map(async (b) => {
      const r = await fetch(b.url, { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) return null;
      try { return await r.json(); } catch { return null; }
    })
  );
  return leads
    .filter(Boolean)
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
}

module.exports = { hasBlob, saveLead, listLeads };
