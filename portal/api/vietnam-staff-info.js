// POST /api/vietnam-staff-info
// Staff-only access to client personal info + documents, for uploading
// contracts and looking up client details. Gated by a shared staff password
// checked server-side (never embedded in any page's JS source, unlike the
// PIN system on the main internal hub) — a real step up in protection for
// this more sensitive data, without needing full staff accounts yet.
//
// Required env vars: SUPABASE_SERVICE_ROLE_KEY, VIETNAM_STAFF_PASSWORD

const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
const BUCKET = 'vietnam-client-documents';
const ALLOWED_ORIGINS = ['https://clients.yourszn.com.au', 'http://localhost:3000'];
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

  const { staff_password, action } = req.body || {};
  const STAFF_PASSWORD = process.env.VIETNAM_STAFF_PASSWORD;
  if (!STAFF_PASSWORD) {
    console.error('[vietnam-staff-info] missing VIETNAM_STAFF_PASSWORD');
    return res.status(500).json({ error: 'Server not configured. Please contact YourSZN.' });
  }
  if (!staff_password || staff_password !== STAFF_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password.' });
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
