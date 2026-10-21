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
    // Shared recommendations (client_id null) plus any added just for this client.
    const recUrl = SUPABASE_URL + '/rest/v1/vietnam_recommendations?or=(client_id.is.null,client_id.eq.' + encodeURIComponent(cid) + ')&select=*&order=sort_order.asc,created_at.asc';
    const [itinRes, recRes] = await Promise.all([fetch(itinUrl, { headers }), fetch(recUrl, { headers })]);
    const faqRes = await fetch(SUPABASE_URL + '/rest/v1/vietnam_faqs?select=id,icon,question,answer,sort_order&order=sort_order.asc,created_at.asc', { headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY } }).catch(function() { return null; });
    const faqs = faqRes && faqRes.ok ? await faqRes.json() : [];
    const [ownItinerary, recommendations] = await Promise.all([itinRes.json(), recRes.json()]);

    // Shared tour itinerary + trip info (edited in the staff portal). A client's own
    // itinerary items, if any exist, take priority over the shared plan.
    const svc = { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY };
    const [tourItems, tourContent] = await Promise.all([
      fetch(SUPABASE_URL + '/rest/v1/vietnam_tour_itinerary?select=*&order=day_number.asc,sort_order.asc', { headers: svc }).then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; }),
      fetch(SUPABASE_URL + '/rest/v1/vietnam_tour_content?select=key,value', { headers: svc }).then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; })
    ]);
    const content = {};
    (Array.isArray(tourContent) ? tourContent : []).forEach(function(row) { content[row.key] = row.value || ''; });
    let dayTitles = {};
    try { dayTitles = JSON.parse(content.day_titles || '{}'); } catch (e) { dayTitles = {}; }
    const start = /^\d{4}-\d{2}-\d{2}$/.test(content.tour_start_date || '') ? new Date(content.tour_start_date + 'T00:00:00Z') : null;
    const dateFor = function(day) {
      if (!start) return null;
      const d = new Date(start.getTime() + (day - 1) * 86400000);
      return d.toISOString().slice(0, 10);
    };
    const sharedItinerary = (Array.isArray(tourItems) ? tourItems : []).map(function(it) {
      return Object.assign({}, it, { item_date: dateFor(it.day_number), day_title: dayTitles[String(it.day_number)] || '' });
    });
    const itinerary = Array.isArray(ownItinerary) && ownItinerary.length ? ownItinerary : sharedItinerary;

    return res.status(200).json({
      ok: true,
      client: { id: client.id, name: client.name },
      itinerary: itinerary,
      recommendations: recommendations,
      faqs: Array.isArray(faqs) ? faqs : [],
      tour: { welcome_note: content.welcome_note || '', intro_video_url: content.intro_video_url || '', included: content.included || '', not_included: content.not_included || '' }
    });
  } catch (err) {
    console.error('[vietnam-dashboard] error:', err);
    return res.status(500).json({ error: 'Something went wrong loading your dashboard.' });
  }
};
