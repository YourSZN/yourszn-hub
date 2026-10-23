// POST /api/client-booking
// Backend for client-upload.html (in-person clients uploading their photos).
// The browser no longer reads or writes in_person_bookings / in_person_persons
// directly — anonymous access to those tables is revoked. This endpoint uses the
// Supabase SERVICE ROLE key server-side only, and only ever returns or changes
// the single booking that matches the client's own name + email.
//
// Actions:
//   { action:'start', name, email, date, type }
//       → finds the client's latest booking (or creates one) and returns it with
//         its people + short-lived preview links for any existing photos.
//   { action:'save', name, email, bookingId, consent, persons:[{id,name,is_primary,photo_path}] }
//       → saves the people/photos for that booking and marks photos submitted.
//
// Photos themselves are uploaded by the browser straight into the private
// in-person-photos bucket (insert-only for the public; nothing can be read back
// without a signed link). photo_path must sit under booking_<id>/.
//
// Required env var: SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
const BUCKET = 'in-person-photos';
const ALLOWED_ORIGINS = ['https://portal.yourszn.com.au', 'https://clients.yourszn.com.au', 'http://localhost:3000'];
const MAX_PERSONS = 4;
const CONSENTS = ['photos_and_video', 'photos_only', 'none'];

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
// Escape LIKE wildcards so a typed value only ever matches itself.
const likeEsc = (v) => v.replace(/[\\%_*]/g, (c) => '\\' + c);

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

function pathFromPerson(p) {
  if (p.photo_path) return p.photo_path;
  const m = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/in-person-photos\/([^?#]+)/.exec(p.photo_url || '');
  if (!m) return '';
  try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}

async function signPaths(api, paths) {
  const out = {};
  const list = paths.filter(Boolean);
  if (!list.length) return out;
  const res = await api('/storage/v1/object/sign/' + BUCKET, { method: 'POST', body: { expiresIn: 3600, paths: list } });
  (res || []).forEach((r) => { if (r && r.signedURL) out[r.path] = SUPABASE_URL + '/storage/v1' + r.signedURL; });
  return out;
}

async function findBooking(api, name, email) {
  const rows = await api('/rest/v1/in_person_bookings?client_email=ilike.' + encodeURIComponent(likeEsc(email)) +
    '&select=id,client_name,client_email,appointment_date,appointment_type,status,created_at&order=created_at.desc&limit=20');
  return (rows || []).find((b) => lower(b.client_email) === email && lower(b.client_name) === name.toLowerCase()) || null;
}

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!KEY) { console.error('[client-booking] missing SUPABASE_SERVICE_ROLE_KEY'); return res.status(500).json({ error: 'Server not configured. Please contact YourSZN.' }); }
  const api = sb(KEY);

  const body = req.body || {};
  const name = clean(body.name, 120);
  const email = lower(body.email);
  if (!name || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter your full name and a valid email address.' });

  try {
    if (body.action === 'start') {
      let booking = await findBooking(api, name, email);
      let returning = !!booking;
      let persons = [];
      if (booking) {
        persons = await api('/rest/v1/in_person_persons?booking_id=eq.' + booking.id + '&select=id,name,is_primary,photo_path,photo_url,sort_order&order=sort_order.asc') || [];
      } else {
        const date = clean(body.date, 10);
        const type = clean(body.type, 80);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Please select your appointment date.' });
        if (!type) return res.status(400).json({ error: 'Please select your appointment type.' });
        const now = new Date().toISOString();
        const created = await api('/rest/v1/in_person_bookings?select=id,client_name,client_email,appointment_date,appointment_type,status,created_at', {
          method: 'POST', prefer: 'return=representation',
          body: { client_name: name, client_email: email, appointment_date: date, appointment_type: type, status: 'pending', created_at: now, updated_at: now }
        });
        booking = created[0];
      }
      const signed = await signPaths(api, persons.map(pathFromPerson));
      return res.status(200).json({
        ok: true, returning,
        booking: { id: booking.id, client_name: booking.client_name, appointment_date: booking.appointment_date, appointment_type: booking.appointment_type },
        persons: persons.map((p) => {
          const path = pathFromPerson(p);
          return { id: p.id, name: p.name || '', is_primary: !!p.is_primary, photo_path: path, preview: signed[path] || '' };
        })
      });
    }

    if (body.action === 'save') {
      const bookingId = clean(body.bookingId, 64);
      const rows = await api('/rest/v1/in_person_bookings?id=eq.' + encodeURIComponent(bookingId) + '&select=id,client_name,client_email&limit=1');
      const booking = rows && rows[0];
      if (!booking || lower(booking.client_email) !== email || lower(booking.client_name) !== name.toLowerCase()) {
        return res.status(403).json({ error: 'We couldn’t match that booking. Please go back and re-enter your details.' });
      }
      const incoming = Array.isArray(body.persons) ? body.persons.slice(0, MAX_PERSONS) : [];
      const prefix = 'booking_' + booking.id + '/';
      const existing = await api('/rest/v1/in_person_persons?booking_id=eq.' + booking.id + '&select=id') || [];
      const existingIds = existing.map((p) => p.id);
      const keep = [];

      for (let i = 0; i < incoming.length; i++) {
        const p = incoming[i] || {};
        const pname = clean(p.name, 120);
        const path = clean(p.photo_path, 300);
        if (!pname && !path) continue;
        if (path && (path.indexOf(prefix) !== 0 || path.indexOf('..') !== -1)) return res.status(400).json({ error: 'Invalid photo.' });
        const fields = { name: pname, sort_order: i, is_primary: !!p.is_primary };
        if (path) { fields.photo_path = path; fields.photo_url = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + path; }
        if (p.id && existingIds.indexOf(p.id) !== -1) {
          await api('/rest/v1/in_person_persons?id=eq.' + encodeURIComponent(p.id), { method: 'PATCH', body: fields, prefer: 'return=minimal' });
          keep.push(p.id);
        } else {
          fields.booking_id = booking.id;
          fields.created_at = new Date().toISOString();
          const ins = await api('/rest/v1/in_person_persons?select=id', { method: 'POST', body: fields, prefer: 'return=representation' });
          if (ins && ins[0]) keep.push(ins[0].id);
        }
      }
      const toDelete = existingIds.filter((id) => keep.indexOf(id) === -1);
      if (toDelete.length) await api('/rest/v1/in_person_persons?id=in.(' + toDelete.map(encodeURIComponent).join(',') + ')', { method: 'DELETE', prefer: 'return=minimal' });

      const now = new Date().toISOString();
      await api('/rest/v1/in_person_bookings?id=eq.' + booking.id, {
        method: 'PATCH', prefer: 'return=minimal',
        body: { status: 'uploaded', media_consent: CONSENTS.indexOf(body.consent) !== -1 ? body.consent : 'none', photos_submitted_at: now, updated_at: now }
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('[client-booking] error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
