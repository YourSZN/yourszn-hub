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

    const { client_id } = req.body;
    if (!client_id) return res.status(400).json({ error: 'Missing client_id.' });

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
