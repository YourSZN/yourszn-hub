// Shared helpers for staff-only APIs on the staff hub (portal.yourszn.com.au).
// Server-side only. Uses the Supabase SERVICE ROLE key, which never reaches the browser.
//
// Staff sign in to the hub with Supabase Auth. Each request sends that session's
// access token as "Authorization: Bearer …". We ask Supabase who the token belongs
// to (it checks the signature, so it can't be faked in the browser), then look up
// their role in `profiles`. Nothing the browser says about who it is is trusted.
//
// Required env vars: SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
// Publishable key used by the hub's own login (index.html); needed to ask Supabase Auth about a token.
const SUPABASE_ANON_KEY = 'sb_publishable_H4rfsOyYOd8A3OQr0ckmfQ_D_JVaGNJ';
const ALLOWED_ORIGINS = ['https://portal.yourszn.com.au', 'http://localhost:3000'];

function cors(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  return true;
}

// Minimal Supabase REST call with the service role key.
async function sb(path, opts = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = Object.assign({ apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, opts.headers || {});
  if ((opts.method === 'POST' || opts.method === 'PATCH') && !headers.Prefer) headers.Prefer = 'return=representation';
  const r = await fetch(SUPABASE_URL + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error('supabase ' + r.status + ' ' + path.split('?')[0] + ' ' + text.slice(0, 200));
  return text ? JSON.parse(text) : null;
}

// Returns { id, email, role } for a signed-in staff member whose role is in `roles`,
// or sends 401/403 and returns null.
async function requireStaff(req, res, roles) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[staff] missing SUPABASE_SERVICE_ROLE_KEY');
    res.status(500).json({ error: 'Server not configured.' });
    return null;
  }
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  let user = null;
  if (token) {
    try {
      const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } });
      if (r.ok) user = await r.json();
    } catch (e) { user = null; }
  }
  if (!user || !user.id) { res.status(401).json({ error: 'Please log in again.' }); return null; }

  const rows = await sb('/rest/v1/profiles?id=eq.' + encodeURIComponent(user.id) + '&select=role&limit=1');
  const role = rows && rows[0] && rows[0].role;
  if (!roles.includes(role)) { res.status(403).json({ error: 'Your login doesn\'t have access to this.' }); return null; }
  return { id: user.id, email: String(user.email || '').toLowerCase(), role };
}

module.exports = { SUPABASE_URL, cors, sb, requireStaff };
