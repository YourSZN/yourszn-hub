// Shared helpers for the Online Colour Analysis client dashboard API.
// Server-side only. Uses the Supabase SERVICE ROLE key, which never reaches the browser.

const crypto = require('crypto');

const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
const ALLOWED_ORIGINS = ['https://clients.yourszn.com.au', 'http://localhost:3000'];

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

// Minimal Supabase REST/Storage call with the service role key.
async function sb(path, opts = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = Object.assign({ apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, opts.headers || {});
  if (opts.method === 'POST' && !headers.Prefer) headers.Prefer = 'return=representation';
  const r = await fetch(SUPABASE_URL + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error('supabase ' + r.status + ' ' + path.split('?')[0] + ' ' + text.slice(0, 200));
  return text ? JSON.parse(text) : null;
}

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const sig = (data) => b64u(crypto.createHmac('sha256', process.env.COLOUR_SESSION_SECRET).update(data).digest());

function signToken(payload) {
  const body = b64u(JSON.stringify(payload));
  return body + '.' + sig(body);
}

// Returns the payload ({ cid, exp }) or null if the token is missing, tampered with or expired.
function readToken(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const [body, s] = token.split('.');
  if (!body || !s) return null;
  const expected = sig(body);
  if (s.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    return p && p.cid && p.exp > Date.now() ? p : null;
  } catch (e) { return null; }
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 64) || null;
}

module.exports = { SUPABASE_URL, cors, sb, signToken, readToken, clientIp };
