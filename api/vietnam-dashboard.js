// POST /api/vietnam-dashboard
// Returns one client's itinerary + recommendations, after verifying the given
// email matches the record for the given client id. Uses the Supabase SERVICE
// ROLE key server-side only. Direct anon access to vietnam_clients,
// vietnam_itinerary_items, and vietnam_recommendations has been revoked, so this
// endpoint is now the only way to read that data.
//
// Required env var (set in Vercel → this project → Settings → Environment Variables):
//   SUPABASE_SERVICE_ROLE_KEY — from Supabase Dashboard → Settings → API → service_role key

const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
const ALLOWED_ORIGINS = ['https://clients.yourszn.com.au', 'http://localhost:3000'];

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

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { cid, email } = req.body || {};
  if (!cid || !email) {
    return res.status(400).json({ error: 'Missing client id or email.' });
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    console.error('[vietnam-dashboard] missing SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server not configured. Please contact YourSZN.' });
  }
  const headers = { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY };

  try {
    const clientUrl = SUPABASE_URL + '/rest/v1/vietnam_clients?id=eq.' + encodeURIComponent(cid) + '&select=id,name,email&limit=1';
    const clientRes = await fetch(clientUrl, { headers });
    const clientData = await clientRes.json();
    if (!Array.isArray(clientData) || clientData.length === 0) {
      return res.status(404).json({ error: 'Dashboard not found.' });
    }
    const client = clientData[0];
    if (String(client.email || '').trim().toLowerCase() !== String(email).trim().toLowerCase()) {
      return res.status(403).json({ error: 'That email doesn’t match this dashboard. Please log in again.' });
    }

    const itinUrl = SUPABASE_URL + '/rest/v1/vietnam_itinerary_items?client_id=eq.' + encodeURIComponent(cid) + '&select=*&order=sort_order.asc';
    const recUrl = SUPABASE_URL + '/rest/v1/vietnam_recommendations?client_id=eq.' + encodeURIComponent(cid) + '&select=*&order=sort_order.asc';
    const [itinRes, recRes] = await Promise.all([fetch(itinUrl, { headers }), fetch(recUrl, { headers })]);
    const [itinerary, recommendations] = await Promise.all([itinRes.json(), recRes.json()]);

    return res.status(200).json({
      ok: true,
      client: { id: client.id, name: client.name },
      itinerary: itinerary,
      recommendations: recommendations
    });
  } catch (err) {
    console.error('[vietnam-dashboard] error:', err);
    return res.status(500).json({ error: 'Something went wrong loading your dashboard.' });
  }
};
