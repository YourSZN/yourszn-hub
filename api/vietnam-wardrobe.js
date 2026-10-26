// POST /api/vietnam-wardrobe
// The client's "Wardrobe & Planning" questionnaire on the Vietnam trip dashboard
// (vietnam-tour.html → Tailoring → Wardrobe & Planning).
//
// Every request carries { cid, email } — the identity the dashboard is verified
// with (see /api/vietnam-dashboard). It's re-checked against vietnam_clients and
// the client can only read/write their OWN row in vietnam_wardrobe_plans.
// Uses the Supabase SERVICE ROLE key server-side only.
//
// Body shapes:
//   { cid, email, op:'get' }
//       → { ok, plan: { answers, photos:[{path, url, category, why, note, copy}], step, completed_at } | null }
//   { cid, email, op:'save', answers?, photos?, step?, complete? }
//       → upserts; photos must live under wardrobe/<cid>/ in the private bucket
//   { cid, email, op:'deletePhoto', path }
//       → removes one of the client's own wardrobe photos
//
// Photos are uploaded by the browser straight into the private
// 'inspiration-photos' bucket (upload-only for the public), under wardrobe/<cid>/.

const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
const BUCKET = 'inspiration-photos';
const ALLOWED_ORIGINS = ['https://clients.yourszn.com.au', 'https://portal.yourszn.com.au', 'http://localhost:3000'];
const MAX_PHOTOS = 6;
const MAX_ANSWERS_BYTES = 40000;

function cors(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  return true;
}

const lower = (v) => String(v == null ? '' : v).trim().toLowerCase();
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
class Denied extends Error { constructor(m) { super(m || 'Not allowed.'); this.code = 403; } }

function sb(key) {
  return async function (path, opts) {
    opts = opts || {};
    const r = await fetch(SUPABASE_URL + path, {
      method: opts.method || 'GET',
      headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, opts.prefer ? { Prefer: opts.prefer } : {}),
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    });
    const text = await r.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    return { ok: r.ok, status: r.status, data, text };
  };
}

function cleanPhotos(list, prefix) {
  if (!Array.isArray(list)) return null;
  return list.slice(0, MAX_PHOTOS).filter((p) => p && typeof p === 'object'
    && typeof p.path === 'string' && p.path.indexOf(prefix) === 0 && p.path.indexOf('..') === -1)
    .map((p) => ({
      path: str(p.path, 200),
      category: str(p.category, 40),
      why: Array.isArray(p.why) ? p.why.slice(0, 10).map((w) => str(w, 40)) : [],
      note: str(p.note, 600),
      copy: str(p.copy, 20)
    }));
}

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!KEY) { console.error('[vietnam-wardrobe] missing SUPABASE_SERVICE_ROLE_KEY'); return res.status(500).json({ error: 'Server not configured.' }); }
  const api = sb(KEY);
  const b = req.body || {};

  try {
    if (!b.cid || !b.email || !/^[0-9a-f-]{36}$/i.test(String(b.cid))) throw new Denied('Please log in again.');
    const vc = await api('/rest/v1/vietnam_clients?id=eq.' + encodeURIComponent(b.cid) + '&select=id,email&limit=1');
    const client = vc.ok && vc.data && vc.data[0];
    if (!client || lower(client.email) !== lower(b.email)) throw new Denied('Please log in again.');
    const cid = client.id;
    const prefix = 'wardrobe/' + cid + '/';
    const rowUrl = '/rest/v1/vietnam_wardrobe_plans?client_id=eq.' + cid;

    if (b.op === 'get') {
      const r = await api(rowUrl + '&select=answers,photos,step,completed_at,updated_at&limit=1');
      const plan = r.ok && r.data && r.data[0] ? r.data[0] : null;
      if (plan && Array.isArray(plan.photos) && plan.photos.length) {
        const s = await api('/storage/v1/object/sign/' + BUCKET, { method: 'POST', body: { expiresIn: 3600, paths: plan.photos.map((p) => p.path) } });
        const map = {};
        (s.data || []).forEach((x) => { if (x && x.signedURL) map[x.path] = SUPABASE_URL + '/storage/v1' + x.signedURL; });
        plan.photos.forEach((p) => { p.url = map[p.path] || ''; });
      }
      return res.status(200).json({ ok: true, plan });
    }

    if (b.op === 'save') {
      const row = { client_id: cid, updated_at: new Date().toISOString() };
      if (b.answers !== undefined) {
        if (!b.answers || typeof b.answers !== 'object' || Array.isArray(b.answers)) throw new Denied('Bad answers.');
        if (JSON.stringify(b.answers).length > MAX_ANSWERS_BYTES) throw new Denied('That’s a lot of text — please shorten some answers.');
        row.answers = b.answers;
      }
      if (b.photos !== undefined) {
        const ph = cleanPhotos(b.photos, prefix);
        if (!ph) throw new Denied('Bad photos.');
        row.photos = ph;
      }
      if (b.step !== undefined) row.step = Math.max(0, Math.min(20, parseInt(b.step, 10) || 0));
      if (b.complete === true) row.completed_at = new Date().toISOString();
      if (b.complete === false) row.completed_at = null;
      const r = await api('/rest/v1/vietnam_wardrobe_plans?on_conflict=client_id', {
        method: 'POST', body: row, prefer: 'resolution=merge-duplicates,return=representation'
      });
      if (!r.ok) { console.error('[vietnam-wardrobe] save', r.status, r.text); return res.status(500).json({ error: 'Couldn’t save — try again.' }); }
      const saved = r.data && r.data[0];
      return res.status(200).json({ ok: true, completed_at: saved ? saved.completed_at : null });
    }

    if (b.op === 'deletePhoto') {
      const p = String(b.path || '');
      if (p.indexOf(prefix) !== 0 || p.indexOf('..') !== -1) throw new Denied();
      await api('/storage/v1/object/' + BUCKET + '/' + p.split('/').map(encodeURIComponent).join('/'), { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    throw new Denied('Unknown request.');
  } catch (err) {
    if (err && err.code === 403) return res.status(403).json({ error: err.message });
    console.error('[vietnam-wardrobe] error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};
