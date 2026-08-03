// POST /api/vietnam-packing
// Client's packing checklist — list/add/toggle/edit/delete, all verified
// server-side against the client's email (same pattern as vietnam-dashboard.js).
// Uses the Supabase SERVICE ROLE key; vietnam_packing_items has no anon policy.
//
// Required env var: SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
const ALLOWED_ORIGINS = ['https://clients.yourszn.com.au', 'http://localhost:3000'];

const DEFAULT_ITEMS = [
  ['Documents', 'Passport (valid 6+ months)'],
  ['Documents', 'Visa / entry approval'],
  ['Documents', 'Travel insurance'],
  ['Documents', 'Flight confirmations'],
  ['Documents', 'Local currency (VND)'],
  ['Essentials', 'Phone charger'],
  ['Essentials', 'Power adapter'],
  ['Essentials', 'Portable battery pack'],
  ['Essentials', 'Sunscreen'],
  ['Essentials', 'Reusable water bottle'],
  ['Clothing', 'Comfortable walking shoes'],
  ['Clothing', 'Light layers for humidity'],
  ['Clothing', 'Swimwear'],
  ['Clothing', 'Something smart for dinners'],
  ['Clothing', 'Rain jacket (wet season)'],
  ['Tailoring Appointments', 'Photos/inspiration saved on phone'],
  ['Tailoring Appointments', 'Any garments you want copied'],
  ['Tailoring Appointments', 'Comfortable clothes for fittings']
];

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

async function verifyClient(cid, email, headers) {
  const url = SUPABASE_URL + '/rest/v1/vietnam_clients?id=eq.' + encodeURIComponent(cid) + '&select=id,email&limit=1';
  const r = await fetch(url, { headers });
  const data = await r.json();
  if (!Array.isArray(data) || data.length === 0) return false;
  return String(data[0].email || '').trim().toLowerCase() === String(email).trim().toLowerCase();
}

async function listItems(cid, headers) {
  const url = SUPABASE_URL + '/rest/v1/vietnam_packing_items?client_id=eq.' + encodeURIComponent(cid) + '&select=*&order=sort_order.asc,created_at.asc';
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
    console.error('[vietnam-packing] missing SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server not configured. Please contact YourSZN.' });
  }
  const headers = { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' };

  try {
    const ok = await verifyClient(cid, email, headers);
    if (!ok) return res.status(403).json({ error: 'Email does not match this dashboard.' });

    if (action === 'list' || !action) {
      let items = await listItems(cid, headers);
      if (Array.isArray(items) && items.length === 0) {
        const seed = DEFAULT_ITEMS.map(function(pair, i) {
          return { client_id: cid, category: pair[0], item_text: pair[1], sort_order: i };
        });
        await fetch(SUPABASE_URL + '/rest/v1/vietnam_packing_items', {
          method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, headers), body: JSON.stringify(seed)
        });
        items = await listItems(cid, headers);
      }
      return res.status(200).json({ ok: true, items: items });
    }

    if (action === 'add') {
      const { category, item_text } = req.body;
      if (!item_text) return res.status(400).json({ error: 'Item text is required.' });
      await fetch(SUPABASE_URL + '/rest/v1/vietnam_packing_items', {
        method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, headers),
        body: JSON.stringify({ client_id: cid, category: category || 'My Items', item_text: item_text, sort_order: 999 })
      });
      return res.status(200).json({ ok: true, items: await listItems(cid, headers) });
    }

    if (action === 'toggle') {
      const { id, is_checked } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing item id.' });
      await fetch(SUPABASE_URL + '/rest/v1/vietnam_packing_items?id=eq.' + encodeURIComponent(id) + '&client_id=eq.' + encodeURIComponent(cid), {
        method: 'PATCH', headers: Object.assign({ Prefer: 'return=minimal' }, headers),
        body: JSON.stringify({ is_checked: !!is_checked, updated_at: new Date().toISOString() })
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'edit') {
      const { id, item_text, category } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing item id.' });
      const body = { updated_at: new Date().toISOString() };
      if (item_text !== undefined) body.item_text = item_text;
      if (category !== undefined) body.category = category;
      await fetch(SUPABASE_URL + '/rest/v1/vietnam_packing_items?id=eq.' + encodeURIComponent(id) + '&client_id=eq.' + encodeURIComponent(cid), {
        method: 'PATCH', headers: Object.assign({ Prefer: 'return=minimal' }, headers), body: JSON.stringify(body)
      });
      return res.status(200).json({ ok: true, items: await listItems(cid, headers) });
    }

    if (action === 'delete') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing item id.' });
      await fetch(SUPABASE_URL + '/rest/v1/vietnam_packing_items?id=eq.' + encodeURIComponent(id) + '&client_id=eq.' + encodeURIComponent(cid), {
        method: 'DELETE', headers: headers
      });
      return res.status(200).json({ ok: true, items: await listItems(cid, headers) });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('[vietnam-packing] error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
