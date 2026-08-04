// POST /api/vietnam-budget
// Client's trip budget — spending goal + expense log, verified server-side
// against the client's email (same pattern as vietnam-packing.js). Uses the
// Supabase SERVICE ROLE key; vietnam_budget_items has no anon policy.
//
// Required env var: SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
const ALLOWED_ORIGINS = ['https://clients.yourszn.com.au', 'http://localhost:3000'];

function cors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  return true;
}

async function getClient(cid, headers) {
  const url = SUPABASE_URL + '/rest/v1/vietnam_clients?id=eq.' + encodeURIComponent(cid) + '&select=id,email,budget_goal_amount&limit=1';
  const r = await fetch(url, { headers });
  const data = await r.json();
  return (Array.isArray(data) && data[0]) ? data[0] : null;
}

async function listItems(cid, headers) {
  const url = SUPABASE_URL + '/rest/v1/vietnam_budget_items?client_id=eq.' + encodeURIComponent(cid) + '&select=*&order=expense_date.desc.nullslast,created_at.desc';
  const r = await fetch(url, { headers });
  return r.json();
}

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { cid, email, action } = req.body || {};
  if (!cid || !email) return res.status(400).json({ error: 'Missing client id or email.' });

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    console.error('[vietnam-budget] missing SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server not configured. Please contact YourSZN.' });
  }
  const headers = { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' };

  try {
    const client = await getClient(cid, headers);
    if (!client || String(client.email || '').trim().toLowerCase() !== String(email).trim().toLowerCase()) {
      return res.status(403).json({ error: 'Email does not match this dashboard.' });
    }

    if (action === 'list' || !action) {
      const items = await listItems(cid, headers);
      return res.status(200).json({ ok: true, goal: client.budget_goal_amount, items: items });
    }

    if (action === 'set_goal') {
      const { amount } = req.body;
      const val = amount === null || amount === '' || amount === undefined ? null : Number(amount);
      await fetch(SUPABASE_URL + '/rest/v1/vietnam_clients?id=eq.' + encodeURIComponent(cid), {
        method: 'PATCH', headers: Object.assign({ Prefer: 'return=minimal' }, headers),
        body: JSON.stringify({ budget_goal_amount: val })
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'add') {
      const { expense_date, category, description, amount } = req.body;
      const amt = Number(amount);
      if (!amt || isNaN(amt)) return res.status(400).json({ error: 'A valid amount is required.' });
      await fetch(SUPABASE_URL + '/rest/v1/vietnam_budget_items', {
        method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, headers),
        body: JSON.stringify({ client_id: cid, expense_date: expense_date || null, category: category || 'Other', description: description || '', amount: amt })
      });
      return res.status(200).json({ ok: true, items: await listItems(cid, headers) });
    }

    if (action === 'delete') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing item id.' });
      await fetch(SUPABASE_URL + '/rest/v1/vietnam_budget_items?id=eq.' + encodeURIComponent(id) + '&client_id=eq.' + encodeURIComponent(cid), {
        method: 'DELETE', headers: headers
      });
      return res.status(200).json({ ok: true, items: await listItems(cid, headers) });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('[vietnam-budget] error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
