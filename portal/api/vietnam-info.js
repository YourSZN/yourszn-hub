// POST /api/vietnam-info
// Client's "Your Info" tab — personal details, contract, and their own
// uploaded documents. Verified server-side against the client's email
// (same pattern as the other Vietnam endpoints). Uses the Supabase SERVICE
// ROLE key; vietnam_client_personal_info / vietnam_client_documents / the
// vietnam-client-documents storage bucket all have zero anon policies —
// this is the only way in or out.
//
// Required env var: SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
const BUCKET = 'vietnam-client-documents';
const ALLOWED_ORIGINS = ['https://clients.yourszn.com.au', 'http://localhost:3000'];
const MAX_FILE_BYTES = 4 * 1024 * 1024; // keep comfortably under serverless body limits
const SIGNED_URL_TTL = 600; // seconds

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

async function getPersonalInfo(cid, headers) {
  const url = SUPABASE_URL + '/rest/v1/vietnam_client_personal_info?client_id=eq.' + encodeURIComponent(cid) + '&select=*&limit=1';
  const r = await fetch(url, { headers });
  const data = await r.json();
  return (Array.isArray(data) && data[0]) || null;
}

async function getDocuments(cid, headers) {
  const url = SUPABASE_URL + '/rest/v1/vietnam_client_documents?client_id=eq.' + encodeURIComponent(cid) + '&select=*&order=created_at.desc';
  const r = await fetch(url, { headers });
  const docs = await r.json();
  if (!Array.isArray(docs)) return [];
  const withUrls = await Promise.all(docs.map(async function(doc) {
    const signed = await fetch(SUPABASE_URL + '/storage/v1/object/sign/' + BUCKET + '/' + doc.storage_path, {
      method: 'POST', headers: headers, body: JSON.stringify({ expiresIn: SIGNED_URL_TTL })
    }).then(function(r) { return r.json(); }).catch(function() { return null; });
    return Object.assign({}, doc, { url: signed && signed.signedURL ? SUPABASE_URL + '/storage/v1' + signed.signedURL : null });
  }));
  return withUrls;
}

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { cid, email, action } = req.body || {};
  if (!cid || !email) return res.status(400).json({ error: 'Missing client id or email.' });

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    console.error('[vietnam-info] missing SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server not configured. Please contact YourSZN.' });
  }
  const headers = { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' };

  try {
    const ok = await verifyClient(cid, email, headers);
    if (!ok) return res.status(403).json({ error: 'Email does not match this dashboard.' });

    if (action === 'get' || !action) {
      const [info, docs] = await Promise.all([getPersonalInfo(cid, headers), getDocuments(cid, headers)]);
      return res.status(200).json({ ok: true, info: info, documents: docs });
    }

    if (action === 'save_info') {
      const { passport_number, passport_expiry, emergency_contact_name, emergency_contact_phone, dietary_needs, allergies, notes } = req.body;
      const body = {
        client_id: cid,
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

    if (action === 'upload') {
      const { file_name, content_type, file_base64 } = req.body;
      if (!file_name || !file_base64) return res.status(400).json({ error: 'Missing file.' });
      const buf = Buffer.from(file_base64, 'base64');
      if (buf.length > MAX_FILE_BYTES) return res.status(400).json({ error: 'File is too large (max 4MB).' });
      const safeName = String(file_name).replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = cid + '/client_' + Date.now() + '_' + safeName;
      const upRes = await fetch(SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + path, {
        method: 'POST',
        headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': content_type || 'application/octet-stream' },
        body: buf
      });
      if (!upRes.ok) return res.status(502).json({ error: 'Upload failed. Please try again.' });
      await fetch(SUPABASE_URL + '/rest/v1/vietnam_client_documents', {
        method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, headers),
        body: JSON.stringify({ client_id: cid, doc_type: 'client_upload', file_name: file_name, storage_path: path, content_type: content_type || null, uploaded_by: 'client' })
      });
      return res.status(200).json({ ok: true, documents: await getDocuments(cid, headers) });
    }

    if (action === 'delete_document') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing document id.' });
      // Only allow deleting the client's own uploads, never the staff-uploaded contract.
      const checkUrl = SUPABASE_URL + '/rest/v1/vietnam_client_documents?id=eq.' + encodeURIComponent(id) + '&client_id=eq.' + encodeURIComponent(cid) + '&select=id,storage_path,uploaded_by&limit=1';
      const checkRes = await fetch(checkUrl, { headers });
      const checkData = await checkRes.json();
      const doc = Array.isArray(checkData) && checkData[0];
      if (!doc || doc.uploaded_by !== 'client') return res.status(403).json({ error: 'That document can’t be removed.' });
      await fetch(SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + doc.storage_path, { method: 'DELETE', headers: headers });
      await fetch(SUPABASE_URL + '/rest/v1/vietnam_client_documents?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: headers });
      return res.status(200).json({ ok: true, documents: await getDocuments(cid, headers) });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('[vietnam-info] error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
