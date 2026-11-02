// POST /api/colour-dashboard   (Authorization: Bearer <token from /api/colour-auth>)
//
//   { action: "load" }                 -> client details, saved progress, guide page links
//   { action: "pages" }                -> fresh guide page links (they expire after PAGE_LINK_SECONDS)
//   { action: "save", state: {...} }   -> saves favourites, quiz scores, closet, checklist and makeup bag
//   { action: "logout" }               -> records the sign-out
//   { action: "set_password", password } -> sets/changes the password, signs out other devices, returns a new token
//   { action: "logout_all" }           -> signs this client out on every device
//   { action: "open_tour" }            -> a Vietnam Tailoring Tour session, only if this client's
//                                         email is on the tour list (load says so: client.tourBooked)
//
// Guide pages live in the PRIVATE storage bucket "season-guides" at
// <season-slug>/pNNN.webp. Clients only ever get short-lived signed links, and
// only for their own season.

const { cors, sb, readToken, clientIp, sessionStillValid, newSession } = require('./_colour');
const { hasPassword, setPassword, signOutEverywhere } = require('./_accounts');
const { findTourClient } = require('./_tour');

// Must match vietnam-login.js and client-home.js.
const TOUR_SESSION_DAYS = 7;
const SESSION_DAYS = 30;

const PAGE_LINK_SECONDS = 15 * 60;
const STATE_KEYS = ['favourites', 'quiz', 'closet', 'checklist', 'makeup_bag'];
const MAX_STATE_BYTES = 20000;

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

async function guidePages(season) {
  const folder = slug(season);
  const list = await sb('/storage/v1/object/list/season-guides', {
    method: 'POST', headers: { Prefer: '' }, body: { prefix: folder, limit: 200, sortBy: { column: 'name', order: 'asc' } },
  });
  const paths = (list || []).filter((f) => /^p\d{3}\.(webp|jpg|png)$/.test(f.name)).map((f) => folder + '/' + f.name);
  if (!paths.length) return {};
  const signed = await sb('/storage/v1/object/sign/season-guides', {
    method: 'POST', headers: { Prefer: '' }, body: { expiresIn: PAGE_LINK_SECONDS, paths },
  });
  const out = {};
  (signed || []).forEach((s) => {
    const n = parseInt((s.path || '').split('/p')[1], 10);
    if (n && s.signedURL) out[n] = 'https://ntqemlkwsymdxhaonfdv.supabase.co/storage/v1' + s.signedURL;
  });
  return out;
}

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.COLOUR_SESSION_SECRET) {
    return res.status(500).json({ error: 'Dashboard isn\'t set up yet. Please contact YourSZN.' });
  }

  const session = readToken(req);
  if (!session) return res.status(401).json({ error: 'Please sign in again.', signin: true });

  try {
    const rows = await sb('/rest/v1/colour_clients?id=eq.' + session.cid + '&active=eq.true&select=id,name,email,season,tier,analysis,sessions_valid_after&limit=1');
    const client = rows[0];
    if (!client || !sessionStillValid(session, client)) return res.status(401).json({ error: 'Please sign in again.', signin: true });
    const { action, state } = req.body || {};

    if (action === 'load') {
      const [saved, pages] = await Promise.all([
        sb('/rest/v1/colour_client_state?client_id=eq.' + client.id + '&select=favourites,quiz,closet,checklist,makeup_bag&limit=1'),
        guidePages(client.season),
      ]);
      await sb('/rest/v1/colour_access_log', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: { client_id: client.id, event: 'open', ip: clientIp(req), user_agent: String(req.headers['user-agent'] || '').slice(0, 300) },
      });
      return res.status(200).json({
        ok: true,
        client: { name: client.name, first: (client.name || '').split(' ')[0], email: client.email, season: client.season, seasonSlug: slug(client.season), tier: client.tier, analysis: client.analysis || {}, hasPassword: await hasPassword(client.email), tourBooked: !!(await findTourClient(client.email)) },
        state: saved[0] || {},
        pages,
        pagesExpireIn: PAGE_LINK_SECONDS,
      });
    }

    if (action === 'pages') {
      return res.status(200).json({ ok: true, pages: await guidePages(client.season), pagesExpireIn: PAGE_LINK_SECONDS });
    }

    if (action === 'save') {
      const clean = {};
      STATE_KEYS.forEach((k) => { if (state && state[k] !== undefined) clean[k] = state[k]; });
      if (JSON.stringify(clean).length > MAX_STATE_BYTES) return res.status(413).json({ error: 'Too much data to save.' });
      await sb('/rest/v1/colour_client_state?on_conflict=client_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: Object.assign({ client_id: client.id, updated_at: new Date().toISOString() }, clean),
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'set_password') {
      const had = await hasPassword(client.email);
      const problem = await setPassword(client.email, String((req.body || {}).password || ''));
      if (problem) return res.status(400).json({ error: problem });
      await sb('/rest/v1/colour_access_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { client_id: client.id, event: had ? 'password-changed' : 'password-set', ip: clientIp(req) } });
      // Every other device is now signed out; keep this device signed in to the
      // dashboard and to the portal front page (same password covers both).
      const fresh = newSession(client.id, SESSION_DAYS);
      const portal = newSession(client.email, SESSION_DAYS, 'portal', { name: client.name });
      return res.status(200).json(Object.assign({ ok: true, portal }, fresh));
    }

    if (action === 'open_tour') {
      const tour = await findTourClient(client.email);
      if (!tour) return res.status(403).json({ error: 'We couldn\'t find a tour booking for your email.' });
      return res.status(200).json(Object.assign({ ok: true }, newSession(tour.id, TOUR_SESSION_DAYS, 'tour')));
    }

    if (action === 'logout_all') {
      await signOutEverywhere(client.email);
      await sb('/rest/v1/colour_access_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { client_id: client.id, event: 'logout-all', ip: clientIp(req) } });
      return res.status(200).json({ ok: true });
    }

    if (action === 'logout') {
      await sb('/rest/v1/colour_access_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { client_id: client.id, event: 'logout', ip: clientIp(req) } });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('[colour-dashboard]', err);
    return res.status(500).json({ error: 'Something went wrong loading your dashboard. Please try again.' });
  }
};
