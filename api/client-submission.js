// POST /api/client-submission
// Backend for the client portal (client-portal.html / portal/index.html) when an
// online colour-analysis client checks for an existing submission or uploads
// revised photos. Anonymous read/update access to szn_submissions and
// szn_photos is revoked, so the browser can no longer search those tables.
// Uses the Supabase SERVICE ROLE key server-side only, and only answers about the
// one submission matching the client's own name + email.
//
// Actions:
//   { action:'check',  name, email }        → { status:'match'|'mismatch'|'none', full_name?, created_at? }
//   { action:'lookup', name, email }        → { ok, submission:{ id, full_name, email } }
//   { action:'revised', name, email, id, photos:[{ path, name, type }] }
//        → records the revised photos (already uploaded by the browser into the
//          private online-clients-photos bucket under <id>/revised_...) and
//          stamps revised_photos_at.
//
// Required env var: SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
const BUCKET = 'online-clients-photos';
const ALLOWED_ORIGINS = ['https://portal.yourszn.com.au', 'https://clients.yourszn.com.au', 'http://localhost:3000'];

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

const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max || 200);
const lower = (v) => clean(v).toLowerCase();
const EMAIL_RE = /^[^\s@*%,()]+@[^\s@*%,()]+\.[^\s@*%,()]+$/;

function sb(key) {
  return async function (path, opts) {
    opts = opts || {};
    const r = await fetch(SUPABASE_URL + path, {
      method: opts.method || 'GET',
      headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, opts.prefer ? { Prefer: opts.prefer } : {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    const text = await r.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!r.ok) { const err = new Error('Supabase ' + r.status + ': ' + text); err.status = r.status; throw err; }
    return data;
  };
}

async function byEmail(api, email) {
  return await api('/rest/v1/szn_submissions?email=eq.' + encodeURIComponent(email) + '&select=id,full_name,email,created_at&order=created_at.desc&limit=20') || [];
}

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!KEY) { console.error('[client-submission] missing SUPABASE_SERVICE_ROLE_KEY'); return res.status(500).json({ error: 'Server not configured. Please contact YourSZN.' }); }
  const api = sb(KEY);

  const body = req.body || {};
  const name = clean(body.name, 120).toLowerCase();
  const email = lower(body.email);
  if (!name || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter your name and a valid email address.' });

  try {
    const rows = await byEmail(api, email);
    const match = rows.find((s) => lower(s.full_name) === name) || null;

    if (body.action === 'check') {
      if (match) return res.status(200).json({ status: 'match', full_name: match.full_name, created_at: match.created_at });
      return res.status(200).json({ status: rows.length ? 'mismatch' : 'none' });
    }

    if (!match) return res.status(404).json({ error: 'No submission found. Please check your name and email and try again.' });

    if (body.action === 'lookup') {
      return res.status(200).json({ ok: true, submission: { id: match.id, full_name: match.full_name, email: match.email } });
    }

    if (body.action === 'revised') {
      if (clean(body.id, 64) !== match.id) return res.status(403).json({ error: 'Submission mismatch. Please look up your submission again.' });
      const prefix = match.id + '/revised_';
      const photos = (Array.isArray(body.photos) ? body.photos : []).slice(0, 20);
      const rowsToInsert = [];
      for (const p of photos) {
        const path = clean(p && p.path, 300);
        if (path.indexOf(prefix) !== 0 || path.indexOf('..') !== -1) return res.status(400).json({ error: 'Invalid photo.' });
        rowsToInsert.push({
          submission_id: match.id,
          file_url: SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + path,
          file_name: clean(p.name, 200), file_type: clean(p.type, 60),
          is_revised: true, revised_at: new Date().toISOString(), slot_number: null, slot_label: null
        });
      }
      if (!rowsToInsert.length) return res.status(400).json({ error: 'No photos received.' });
      await api('/rest/v1/szn_photos', { method: 'POST', body: rowsToInsert, prefer: 'return=minimal' });
      await api('/rest/v1/szn_submissions?id=eq.' + match.id, { method: 'PATCH', body: { revised_photos_at: new Date().toISOString() }, prefer: 'return=minimal' });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('[client-submission] error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
