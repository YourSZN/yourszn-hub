// POST /api/vietnam-staff-info
// Staff-only access to Vietnam client records, personal info, and documents.
// Auth: prefers a real Supabase session token (from the internal hub's
// existing staff login) verified server-side against Supabase Auth — never
// trusts anything the client claims about who it is. Falls back to a shared
// password (VIETNAM_STAFF_PASSWORD) only if no token is sent, kept for
// backwards compatibility.
//
// Required env vars: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
// Optional: VIETNAM_STAFF_PASSWORD (legacy fallback)

const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
// Same publishable key the internal hub's login (index.html) uses — needed so
// tokens minted by that login verify correctly here.
const SUPABASE_ANON_KEY = 'sb_publishable_H4rfsOyYOd8A3OQr0ckmfQ_D_JVaGNJ';
const BUCKET = 'vietnam-client-documents';
const ALLOWED_ORIGINS = ['https://portal.yourszn.com.au', 'https://clients.yourszn.com.au', 'http://localhost:3000'];
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const SIGNED_URL_TTL = 600;

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

// Verifies a Supabase Auth access token by asking Supabase who it belongs to
// — this can't be spoofed client-side since Supabase itself checks the JWT
// signature. Returns the staff member's email, or null if invalid/expired.
async function verifyStaffToken(token) {
  if (!token) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!r.ok) return null;
    const user = await r.json();
    return (user && user.email) || null;
  } catch (e) { return null; }
}

async function getDocuments(cid, headers) {
  const url = SUPABASE_URL + '/rest/v1/vietnam_client_documents?client_id=eq.' + encodeURIComponent(cid) + '&select=*&order=created_at.desc';
  const r = await fetch(url, { headers });
  const docs = await r.json();
  if (!Array.isArray(docs)) return [];
  return Promise.all(docs.map(async function(doc) {
    const signed = await fetch(SUPABASE_URL + '/storage/v1/object/sign/' + BUCKET + '/' + doc.storage_path, {
      method: 'POST', headers: headers, body: JSON.stringify({ expiresIn: SIGNED_URL_TTL })
    }).then(function(r) { return r.json(); }).catch(function() { return null; });
    return Object.assign({}, doc, { url: signed && signed.signedURL ? SUPABASE_URL + '/storage/v1' + signed.signedURL : null });
  }));
}

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { staff_token, staff_password, action } = req.body || {};

  let staffEmail = await verifyStaffToken(staff_token);
  if (!staffEmail) {
    const STAFF_PASSWORD = process.env.VIETNAM_STAFF_PASSWORD;
    if (STAFF_PASSWORD && staff_password && staff_password === STAFF_PASSWORD) {
      staffEmail = 'password-auth';
    } else {
      return res.status(401).json({ error: 'Please log in again.' });
    }
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    console.error('[vietnam-staff-info] missing SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server not configured. Please contact YourSZN.' });
  }
  const headers = { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' };

  try {
    if (action === 'list_clients') {
      const url = SUPABASE_URL + '/rest/v1/vietnam_clients?select=id,name,email&order=name.asc';
      const r = await fetch(url, { headers });
      return res.status(200).json({ ok: true, clients: await r.json() });
    }

    if (action === 'upsert_client') {
      const { id, name, email, room_type, partner_name, notes, contract_drive_link, list_type, onboarding_steps } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required.' });
      const body = {
        name: name,
        email: email || null,
        room_type: room_type || null,
        partner_name: partner_name || null,
        notes: notes || null,
        contract_drive_link: contract_drive_link || null,
        list_type: list_type || 'booked'
      };
      if (onboarding_steps !== undefined) body.onboarding_steps = onboarding_steps;
      if (id) {
        await fetch(SUPABASE_URL + '/rest/v1/vietnam_clients?id=eq.' + encodeURIComponent(id), {
          method: 'PATCH', headers: Object.assign({ Prefer: 'return=minimal' }, headers), body: JSON.stringify(body)
        });
        return res.status(200).json({ ok: true, id: id });
      }
      const createRes = await fetch(SUPABASE_URL + '/rest/v1/vietnam_clients', {
        method: 'POST', headers: Object.assign({ Prefer: 'return=representation' }, headers), body: JSON.stringify(body)
      });
      const created = await createRes.json();
      return res.status(200).json({ ok: true, id: Array.isArray(created) && created[0] && created[0].id });
    }

    // ── Shared tour recommendations (shown to every client) ──
    const REC_CATEGORIES = ['food','cafe','bar','activity','sightseeing','spa','shopping','beach','daytrip'];
    const REC_URL = SUPABASE_URL + '/rest/v1/vietnam_recommendations';

    if (action === 'list_recs') {
      const r = await fetch(REC_URL + '?client_id=is.null&select=*&order=sort_order.asc,created_at.asc', { headers });
      return res.status(200).json({ ok: true, recs: await r.json() });
    }

    if (action === 'save_rec') {
      const { id, category, name, description, maps_url, image_url, sort_order, photos, popular, price_range, walk_time, hours, booking, tip, menu_url, menu_photos, lat, lng } = req.body;
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required.' });
      if (REC_CATEGORIES.indexOf(category) === -1) return res.status(400).json({ error: 'Pick a category.' });
      const body = {
        category: category,
        name: String(name).trim(),
        description: description || null,
        maps_url: maps_url || null,
        image_url: image_url || null,
        photos: Array.isArray(photos) ? photos.filter(function(u){ return /^https:\/\//.test(u); }).slice(0, 10) : [],
        popular: popular || null,
        price_range: price_range || null,
        walk_time: walk_time || null,
        hours: hours || null,
        booking: booking || null,
        tip: tip || null,
        menu_url: /^https:\/\//.test(menu_url || '') ? menu_url : null,
        menu_photos: Array.isArray(menu_photos) ? menu_photos.filter(function(u){ return /^https:\/\//.test(u); }).slice(0, 30) : [],
        lat: null,
        lng: null,
        updated_at: new Date().toISOString()
      };
      // Map pin: both numbers, inside Vietnam-ish bounds, or no pin at all.
      const la = parseFloat(lat), ln = parseFloat(lng);
      if (isFinite(la) && isFinite(ln) && la > 8 && la < 24 && ln > 102 && ln < 110) { body.lat = la; body.lng = ln; }
      if (body.photos.length) body.image_url = body.photos[0];
      if (typeof sort_order === 'number') body.sort_order = sort_order;
      const url = id ? REC_URL + '?id=eq.' + encodeURIComponent(id) : REC_URL;
      if (!id) body.client_id = null;
      const r = await fetch(url, {
        method: id ? 'PATCH' : 'POST', headers: Object.assign({ Prefer: 'return=representation' }, headers), body: JSON.stringify(body)
      });
      const out = await r.json();
      if (!r.ok) return res.status(400).json({ error: (out && out.message) || 'Could not save.' });
      return res.status(200).json({ ok: true, rec: Array.isArray(out) ? out[0] : out });
    }

    if (action === 'upload_rec_photo') {
      const { content_type, file_base64 } = req.body;
      if (!file_base64) return res.status(400).json({ error: 'Missing photo.' });
      const type = ['image/jpeg','image/png','image/webp','application/pdf'].indexOf(content_type) > -1 ? content_type : 'image/jpeg';
      const buf = Buffer.from(file_base64, 'base64');
      if (buf.length > MAX_FILE_BYTES) return res.status(400).json({ error: 'File is too large (max 4MB).' });
      const ext = type === 'application/pdf' ? 'pdf' : type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
      const path = 'recs/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      const upRes = await fetch(SUPABASE_URL + '/storage/v1/object/vietnam-recommendations/' + path, {
        method: 'POST', headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': type }, body: buf
      });
      if (!upRes.ok) return res.status(502).json({ error: 'Upload failed. Please try again.' });
      return res.status(200).json({ ok: true, url: SUPABASE_URL + '/storage/v1/object/public/vietnam-recommendations/' + path });
    }

    // ── Shared tour itinerary + trip info ──
    const TOUR_URL = SUPABASE_URL + '/rest/v1/vietnam_tour_itinerary';
    const CONTENT_URL = SUPABASE_URL + '/rest/v1/vietnam_tour_content';
    const CONTENT_KEYS = ['welcome_note', 'intro_video_url', 'included', 'not_included', 'tour_start_date', 'day_titles', 'day_photos', 'day_tips'];
    if (action === 'list_tour') {
      const [items, content] = await Promise.all([
        fetch(TOUR_URL + '?select=*&order=day_number.asc,sort_order.asc', { headers }).then(function(r) { return r.json(); }),
        fetch(CONTENT_URL + '?select=key,value', { headers }).then(function(r) { return r.json(); })
      ]);
      const map = {};
      (Array.isArray(content) ? content : []).forEach(function(row) { map[row.key] = row.value || ''; });
      return res.status(200).json({ ok: true, items: Array.isArray(items) ? items : [], content: map });
    }
    if (action === 'save_tour_item') {
      const { id, day_number, time_label, title, description, location, sort_order } = req.body;
      const day = parseInt(day_number, 10);
      if (!title || !String(title).trim()) return res.status(400).json({ error: 'Title is required.' });
      if (!(day >= 1 && day <= 30)) return res.status(400).json({ error: 'Pick a day.' });
      const body = { day_number: day, time_label: time_label || null, title: String(title).trim(), description: description || null, location: location || null, updated_at: new Date().toISOString() };
      if (typeof sort_order === 'number') body.sort_order = sort_order;
      const r = await fetch(id ? TOUR_URL + '?id=eq.' + encodeURIComponent(id) : TOUR_URL, {
        method: id ? 'PATCH' : 'POST', headers: Object.assign({ Prefer: 'return=representation' }, headers), body: JSON.stringify(body)
      });
      const out = await r.json();
      if (!r.ok) return res.status(400).json({ error: (out && out.message) || 'Could not save.' });
      return res.status(200).json({ ok: true, item: Array.isArray(out) ? out[0] : out });
    }
    if (action === 'delete_tour_item') {
      if (!req.body.id) return res.status(400).json({ error: 'Missing id.' });
      await fetch(TOUR_URL + '?id=eq.' + encodeURIComponent(req.body.id), { method: 'DELETE', headers });
      return res.status(200).json({ ok: true });
    }
    if (action === 'reorder_tour_items') {
      const { ids } = req.body;
      if (!Array.isArray(ids)) return res.status(400).json({ error: 'Missing ids.' });
      await Promise.all(ids.map(function(tid, i) {
        return fetch(TOUR_URL + '?id=eq.' + encodeURIComponent(tid), { method: 'PATCH', headers: Object.assign({ Prefer: 'return=minimal' }, headers), body: JSON.stringify({ sort_order: i }) });
      }));
      return res.status(200).json({ ok: true });
    }
    if (action === 'save_tour_content') {
      const { key, value } = req.body;
      if (CONTENT_KEYS.indexOf(key) === -1) return res.status(400).json({ error: 'Unknown field.' });
      if (key === 'tour_start_date' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return res.status(400).json({ error: 'Pick a valid date.' });
      if (key === 'intro_video_url' && value && !/^https:\/\//i.test(String(value).trim())) return res.status(400).json({ error: 'The video link should start with https://' });
      const r = await fetch(CONTENT_URL + '?on_conflict=key', {
        method: 'POST', headers: Object.assign({ Prefer: 'resolution=merge-duplicates,return=minimal' }, headers),
        body: JSON.stringify({ key: key, value: value == null ? '' : String(value), updated_at: new Date().toISOString() })
      });
      if (!r.ok) return res.status(400).json({ error: 'Could not save.' });
      return res.status(200).json({ ok: true });
    }

    // ── Tour FAQ (shared, shown on every client's dashboard) ──
    const FAQ_URL = SUPABASE_URL + '/rest/v1/vietnam_faqs';
    if (action === 'list_faqs') {
      const r = await fetch(FAQ_URL + '?select=*&order=sort_order.asc,created_at.asc', { headers });
      return res.status(200).json({ ok: true, faqs: await r.json() });
    }
    if (action === 'save_faq') {
      const { id, icon, question, answer, sort_order, published } = req.body;
      if (!question || !String(question).trim()) return res.status(400).json({ error: 'Question is required.' });
      const body = { icon: icon || null, question: String(question).trim(), answer: answer || '', updated_at: new Date().toISOString() };
      if (typeof published === 'boolean') body.published = published;
      if (typeof sort_order === 'number') body.sort_order = sort_order;
      const r = await fetch(id ? FAQ_URL + '?id=eq.' + encodeURIComponent(id) : FAQ_URL, {
        method: id ? 'PATCH' : 'POST', headers: Object.assign({ Prefer: 'return=representation' }, headers), body: JSON.stringify(body)
      });
      const out = await r.json();
      if (!r.ok) return res.status(400).json({ error: (out && out.message) || 'Could not save.' });
      return res.status(200).json({ ok: true, faq: Array.isArray(out) ? out[0] : out });
    }
    if (action === 'delete_faq') {
      if (!req.body.id) return res.status(400).json({ error: 'Missing id.' });
      await fetch(FAQ_URL + '?id=eq.' + encodeURIComponent(req.body.id), { method: 'DELETE', headers });
      return res.status(200).json({ ok: true });
    }
    if (action === 'reorder_faqs') {
      const { ids } = req.body;
      if (!Array.isArray(ids)) return res.status(400).json({ error: 'Missing ids.' });
      await Promise.all(ids.map(function(fid, i) {
        return fetch(FAQ_URL + '?id=eq.' + encodeURIComponent(fid), {
          method: 'PATCH', headers: Object.assign({ Prefer: 'return=minimal' }, headers), body: JSON.stringify({ sort_order: i })
        });
      }));
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete_rec') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id.' });
      await fetch(REC_URL + '?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers });
      return res.status(200).json({ ok: true });
    }

    if (action === 'reorder_recs') {
      const { ids } = req.body;
      if (!Array.isArray(ids)) return res.status(400).json({ error: 'Missing ids.' });
      await Promise.all(ids.map(function(rid, i) {
        return fetch(REC_URL + '?id=eq.' + encodeURIComponent(rid), {
          method: 'PATCH', headers: Object.assign({ Prefer: 'return=minimal' }, headers), body: JSON.stringify({ sort_order: i })
        });
      }));
      return res.status(200).json({ ok: true });
    }

    const { client_id } = req.body;
    if (!client_id) return res.status(400).json({ error: 'Missing client_id.' });

    // ── Per-client payment schedule ──
    const PAY_URL = SUPABASE_URL + '/rest/v1/vietnam_client_payments';
    const listPayments = function() {
      return fetch(PAY_URL + '?client_id=eq.' + encodeURIComponent(client_id) + '&select=*&order=sort_order.asc,due_date.asc', { headers }).then(function(r) { return r.json(); });
    };
    if (action === 'list_payments') return res.status(200).json({ ok: true, payments: await listPayments() });
    if (action === 'save_payment') {
      const { id, label, amount, due_date, status, note, sort_order } = req.body;
      if (!label || !String(label).trim()) return res.status(400).json({ error: 'Add a name, e.g. Deposit.' });
      const amt = amount === '' || amount == null ? null : Number(amount);
      if (amt !== null && !(amt >= 0)) return res.status(400).json({ error: 'Amount should be a number.' });
      if (due_date && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) return res.status(400).json({ error: 'Pick a valid due date.' });
      const body = { client_id: client_id, label: String(label).trim(), amount: amt, due_date: due_date || null, status: status === 'paid' ? 'paid' : 'due', note: note || null, updated_at: new Date().toISOString() };
      if (typeof sort_order === 'number') body.sort_order = sort_order;
      const r = await fetch(id ? PAY_URL + '?id=eq.' + encodeURIComponent(id) + '&client_id=eq.' + encodeURIComponent(client_id) : PAY_URL, {
        method: id ? 'PATCH' : 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, headers), body: JSON.stringify(body)
      });
      if (!r.ok) return res.status(400).json({ error: 'Could not save.' });
      return res.status(200).json({ ok: true, payments: await listPayments() });
    }
    if (action === 'delete_payment') {
      if (!req.body.id) return res.status(400).json({ error: 'Missing id.' });
      await fetch(PAY_URL + '?id=eq.' + encodeURIComponent(req.body.id) + '&client_id=eq.' + encodeURIComponent(client_id), { method: 'DELETE', headers });
      return res.status(200).json({ ok: true, payments: await listPayments() });
    }

    if (action === 'get_client_info') {
      const infoUrl = SUPABASE_URL + '/rest/v1/vietnam_client_personal_info?client_id=eq.' + encodeURIComponent(client_id) + '&select=*&limit=1';
      const infoRes = await fetch(infoUrl, { headers });
      const infoData = await infoRes.json();
      const docs = await getDocuments(client_id, headers);
      return res.status(200).json({ ok: true, info: (Array.isArray(infoData) && infoData[0]) || null, documents: docs });
    }

    if (action === 'save_info') {
      const { passport_number, passport_expiry, emergency_contact_name, emergency_contact_phone, dietary_needs, allergies, notes } = req.body;
      const body = {
        client_id: client_id,
        passport_number: passport_number || null,
        passport_expiry: passport_expiry || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        dietary_needs: dietary_needs || null,
        allergies: allergies || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      };
      await fetch(SUPABASE_URL + '/rest/v1/vietnam_client_personal_info?on_conflict=client_id', {
        method: 'POST', headers: Object.assign({ Prefer: 'resolution=merge-duplicates,return=minimal' }, headers), body: JSON.stringify(body)
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'upload_contract') {
      const { file_name, content_type, file_base64 } = req.body;
      if (!file_name || !file_base64) return res.status(400).json({ error: 'Missing file.' });
      const buf = Buffer.from(file_base64, 'base64');
      if (buf.length > MAX_FILE_BYTES) return res.status(400).json({ error: 'File is too large (max 4MB).' });
      const safeName = String(file_name).replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = client_id + '/contract_' + Date.now() + '_' + safeName;
      const upRes = await fetch(SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + path, {
        method: 'POST',
        headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': content_type || 'application/octet-stream' },
        body: buf
      });
      if (!upRes.ok) return res.status(502).json({ error: 'Upload failed. Please try again.' });
      await fetch(SUPABASE_URL + '/rest/v1/vietnam_client_documents', {
        method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, headers),
        body: JSON.stringify({ client_id: client_id, doc_type: 'contract', file_name: file_name, storage_path: path, content_type: content_type || null, uploaded_by: 'staff' })
      });
      return res.status(200).json({ ok: true, documents: await getDocuments(client_id, headers) });
    }

    if (action === 'delete_document') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing document id.' });
      const checkUrl = SUPABASE_URL + '/rest/v1/vietnam_client_documents?id=eq.' + encodeURIComponent(id) + '&select=storage_path&limit=1';
      const checkRes = await fetch(checkUrl, { headers });
      const checkData = await checkRes.json();
      const doc = Array.isArray(checkData) && checkData[0];
      if (doc) {
        await fetch(SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + doc.storage_path, { method: 'DELETE', headers: headers });
        await fetch(SUPABASE_URL + '/rest/v1/vietnam_client_documents?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: headers });
      }
      return res.status(200).json({ ok: true, documents: await getDocuments(client_id, headers) });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('[vietnam-staff-info] error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
