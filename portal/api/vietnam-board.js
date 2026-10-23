// POST /api/vietnam-board
// Secure backend for the client's Inspiration Board on the Vietnam trip
// dashboard (vietnam-tour.html). Anonymous access to the inspiration_* tables
// is revoked; the browser sends its board requests here instead.
//
// Every request carries { cid, email } — the same identity the dashboard is
// already verified with (see /api/vietnam-dashboard). This endpoint re-checks it
// against vietnam_clients, then only allows reads/writes on THAT client's own
// inspiration board. Uses the Supabase SERVICE ROLE key server-side only.
//
// Body shapes:
//   { cid, email, path:'inspiration_items?client_id=eq.…', method, body, prefer }
//       → a scoped Supabase REST request (same paths the page used before)
//   { cid, email, op:'deletePhoto', storagePath }
//       → removes one of the client's own photos from the private bucket
//
// GET responses for inspiration_items include a short-lived signed_url on each
// embedded photo (the bucket is private).
//
// Required env var: SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
const BUCKET = 'inspiration-photos';
const ALLOWED_ORIGINS = ['https://clients.yourszn.com.au', 'https://portal.yourszn.com.au', 'http://localhost:3000'];
const TABLES = ['inspiration_clients', 'inspiration_items', 'inspiration_photos', 'inspiration_item_colours', 'inspiration_admin_notes'];
const FILTER_COLS = ['id', 'item_id', 'client_id', 'email'];
const LOCKED_FIELDS = ['id', 'client_id', 'item_id', 'created_at'];

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

const lower = (v) => String(v == null ? '' : v).trim().toLowerCase();
class Denied extends Error { constructor(m) { super(m || 'Not allowed.'); this.code = 403; } }

function sb(key) {
  return async function (path, opts) {
    opts = opts || {};
    const r = await fetch(SUPABASE_URL + path, {
      method: opts.method || 'GET',
      headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, opts.prefer ? { Prefer: opts.prefer } : {}),
      body: opts.body !== undefined ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined
    });
    const text = await r.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    return { ok: r.ok, status: r.status, data, text };
  };
}

// Parse "table?col=eq.val&select=…&order=…" into parts, rejecting anything
// beyond simple equality filters on known id/email columns.
function parsePath(path) {
  const q = String(path || '').indexOf('?');
  const table = q === -1 ? path : path.slice(0, q);
  if (TABLES.indexOf(table) === -1) throw new Denied('Unknown table.');
  const params = new URLSearchParams(q === -1 ? '' : path.slice(q + 1));
  const filters = {};
  const passthrough = [];
  for (const [k, v] of params) {
    if (k === 'select' && /admin_notes/.test(v)) throw new Denied(); // staff-only notes
    if (k === 'select' || k === 'order' || k === 'limit') { passthrough.push([k, v]); continue; }
    if (FILTER_COLS.indexOf(k) === -1 || !/^eq\./.test(v)) throw new Denied('Unsupported filter.');
    filters[k] = v.slice(3);
  }
  return { table, filters, passthrough };
}

function rowsOf(body) { if (body == null) return []; return Array.isArray(body) ? body : [body]; }

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!KEY) { console.error('[vietnam-board] missing SUPABASE_SERVICE_ROLE_KEY'); return res.status(500).json({ error: 'Server not configured.' }); }
  const api = sb(KEY);
  const b = req.body || {};

  try {
    // ── 1. Verify the dashboard identity ──
    if (!b.cid || !b.email) throw new Denied('Please log in again.');
    const vc = await api('/rest/v1/vietnam_clients?id=eq.' + encodeURIComponent(b.cid) + '&select=id,name,email&limit=1');
    const client = vc.ok && vc.data && vc.data[0];
    const email = lower(b.email);
    if (!client || lower(client.email) !== email) throw new Denied('Please log in again.');

    // ── 2. This client's board (may not exist yet) ──
    const ic = await api('/rest/v1/inspiration_clients?email=eq.' + encodeURIComponent(email) + '&select=id&limit=1');
    const boardId = ic.ok && ic.data && ic.data[0] ? ic.data[0].id : null;
    let itemIds = null;
    async function myItems() {
      if (itemIds) return itemIds;
      if (!boardId) return (itemIds = []);
      const r = await api('/rest/v1/inspiration_items?client_id=eq.' + boardId + '&select=id');
      return (itemIds = (r.data || []).map((x) => x.id));
    }
    async function ownsItem(id) { return !!id && (await myItems()).indexOf(id) !== -1; }

    // ── Storage delete ──
    if (b.op === 'deletePhoto') {
      const p = String(b.storagePath || '');
      if (!boardId || p.indexOf(boardId + '/') !== 0 || p.indexOf('..') !== -1) throw new Denied();
      await api('/storage/v1/object/' + BUCKET + '/' + p.split('/').map(encodeURIComponent).join('/'), { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    // ── 3. Scoped REST request ──
    const method = String(b.method || 'GET').toUpperCase();
    if (['GET', 'POST', 'PATCH', 'DELETE'].indexOf(method) === -1) throw new Denied();
    const { table, filters, passthrough } = parsePath(b.path);
    let body = b.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { throw new Denied('Bad body.'); } }
    const fkeys = Object.keys(filters);

    if (table === 'inspiration_clients') {
      if (method === 'GET') {
        if (fkeys.join() !== 'email' || lower(filters.email) !== email) throw new Denied();
      } else if (method === 'POST') {
        if (boardId) throw new Denied('Board already exists.');
        const rows = rowsOf(body);
        if (rows.length !== 1 || lower(rows[0].email) !== email) throw new Denied();
        body = { name: String(rows[0].name || client.name || '').slice(0, 120), email: email };
      } else if (method === 'PATCH') {
        if (fkeys.join() !== 'id' || filters.id !== boardId) throw new Denied();
        body = { name: String((body && body.name) || '').slice(0, 120) };
      } else throw new Denied();
    } else {
      if (!boardId) throw new Denied('No board yet.');
      const parentCol = table === 'inspiration_items' ? 'client_id' : 'item_id';
      // Filters: must pin the request to this board's rows.
      if (method !== 'POST') {
        if (!fkeys.length) throw new Denied();
        for (const k of fkeys) {
          const v = filters[k];
          if (table === 'inspiration_items') {
            if (k === 'client_id') { if (v !== boardId) throw new Denied(); }
            else if (k === 'id') { if (!(await ownsItem(v))) throw new Denied(); }
            else throw new Denied();
          } else {
            if (k === 'item_id') { if (!(await ownsItem(v))) throw new Denied(); }
            else if (k === 'id') {
              const r = await api('/rest/v1/' + table + '?id=eq.' + encodeURIComponent(v) + '&select=item_id&limit=1');
              const row = r.data && r.data[0];
              if (!row || !(await ownsItem(row.item_id))) throw new Denied();
            } else throw new Denied();
          }
        }
      }
      if (table === 'inspiration_admin_notes' && method !== 'DELETE') throw new Denied(); // staff-only notes
      // Bodies: can't point rows at someone else's board/items.
      if (method === 'POST' || method === 'PATCH') {
        for (const row of rowsOf(body)) {
          if (!row || typeof row !== 'object') throw new Denied('Bad body.');
          if (method === 'POST') {
            if (parentCol === 'client_id' ? row.client_id !== boardId : !(await ownsItem(row.item_id))) throw new Denied();
            if (table === 'inspiration_photos' && String(row.storage_path || '').indexOf(boardId + '/') !== 0) throw new Denied();
            delete row.id;
          } else {
            LOCKED_FIELDS.forEach((f) => { delete row[f]; });
            if (table === 'inspiration_photos') delete row.storage_path;
          }
        }
      }
    }

    // Forward with filters rebuilt from the validated values.
    const qs = new URLSearchParams();
    for (const k of fkeys) qs.append(k, 'eq.' + filters[k]);
    for (const [k, v] of passthrough) qs.append(k, v);
    const r = await api('/rest/v1/' + table + (qs.toString() ? '?' + qs.toString() : ''), {
      method, body: method === 'GET' || method === 'DELETE' ? undefined : body, prefer: b.prefer || undefined
    });
    if (!r.ok) { console.error('[vietnam-board] supabase', r.status, r.text); return res.status(r.status).json({ error: 'Request failed.' }); }

    // Private photos → attach short-lived links.
    let data = r.data;
    if (method === 'GET' && table === 'inspiration_items' && Array.isArray(data)) {
      const paths = [];
      data.forEach((it) => (it.inspiration_photos || []).forEach((p) => { if (p.storage_path) paths.push(p.storage_path); }));
      if (paths.length) {
        const s = await api('/storage/v1/object/sign/' + BUCKET, { method: 'POST', body: { expiresIn: 3600, paths } });
        const map = {};
        (s.data || []).forEach((x) => { if (x && x.signedURL) map[x.path] = SUPABASE_URL + '/storage/v1' + x.signedURL; });
        data.forEach((it) => (it.inspiration_photos || []).forEach((p) => { p.signed_url = map[p.storage_path] || ''; }));
      }
    }
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    if (err && err.code === 403) return res.status(403).json({ error: err.message });
    console.error('[vietnam-board] error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};
