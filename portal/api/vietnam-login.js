// POST /api/vietnam-login
// Validates the shared access code and looks up a Vietnam Tailoring Tour client
// by email. Uses the Supabase SERVICE ROLE key server-side only — this key never
// reaches the browser. Direct anon access to vietnam_clients has been revoked, so
// this endpoint is now the only way to read that table.
//
// Required env var (set in Vercel → this project → Settings → Environment Variables):
//   SUPABASE_SERVICE_ROLE_KEY — from Supabase Dashboard → Settings → API → service_role key

const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
const ACCESS_CODE = '2462';
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

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { code, name, email } = req.body || {};
  if (!code || code !== ACCESS_CODE) {
    return res.status(401).json({ error: 'Invalid access code. Please check and try again.' });
  }
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    console.error('[vietnam-login] missing SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server not configured. Please contact YourSZN.' });
  }

  try {
    const url = SUPABASE_URL + '/rest/v1/vietnam_clients?email=eq.' + encodeURIComponent(String(email).trim().toLowerCase()) + '&select=id,name,email&limit=1';
    const r = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY } });
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ error: 'We couldn’t find a dashboard for that email. Please check with your tour coordinator.' });
    }
    return res.status(200).json({ ok: true, cid: data[0].id, name: data[0].name });
  } catch (err) {
    console.error('[vietnam-login] error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
