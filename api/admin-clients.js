// POST /api/admin-clients
// Staff hub → Clients page. Admins only (profiles.role = 'admin').
// Header: Authorization: Bearer <the hub's Supabase session access token>
//
// One "client" = one email. The list joins three places:
//   oca_clients      paid, tier, season from the drape (set on this page)
//   szn_submissions  their latest questionnaire (drafts ignored) and its status
//   colour_clients   whether their Colour Dashboard is live
//
// Actions:
//   { action: "list" }
//       -> { ok, clients: [...], seasons: [...], readySeasons: [...] }
//   { action: "update", email, paid?, tier?, drapeSeason?, status? }
//       paid/tier/drapeSeason save to oca_clients; status saves to their latest questionnaire.
//       A tier change also updates a live dashboard. A season change doesn't: closing and
//       reopening the dashboard is a deliberate step.
//   { action: "grant", name, email, paidEmail?, tier? }
//       "Grant OCA access": adds someone as paid (e.g. they paid with a different email).
//       No email is sent.
//   { action: "give_dashboard", email }
//       Opens their Colour Dashboard (colour_clients row, active) and emails
//       "Your results are ready". Only for seasons in READY_SEASONS.
//   { action: "resend_email", email }     emails "Your results are ready" again.
//   { action: "remove_dashboard", email } closes the dashboard and signs them out of it.
//
// Required env vars: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
// Optional: EMAIL_FROM (defaults to "YourSZN <hello@yourszn.com.au>")

const { cors, sb, requireStaff } = require('./_staff');

const SEASONS = [
  'Light Spring', 'True Spring', 'Bright Spring',
  'Light Summer', 'True Summer', 'Soft Summer',
  'Soft Autumn', 'True Autumn', 'Dark Autumn',
  'Bright Winter', 'True Winter', 'Dark Winter',
];
// Seasons whose Colour Dashboard is built. Nobody else can be given access yet.
// Add a season here when its dashboard is finished.
const READY_SEASONS = ['True Spring'];

const STATUSES = ['pending', 'in_progress', 'complete', 'sent'];
const TIERS = ['standard', 'premium'];
const PORTAL_URL = 'https://clients.yourszn.com.au';

const cleanEmail = (e) => String(e || '').trim().toLowerCase().slice(0, 200);
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const cleanName = (n) => String(n || '').trim().replace(/\s+/g, ' ').slice(0, 120);
const escapeHtml = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const enc = encodeURIComponent;

// ---- Reading ----

async function loadAll() {
  const [records, subs, dashboards] = await Promise.all([
    sb('/rest/v1/oca_clients?select=*'),
    // Drafts aren't questionnaires yet. (A missing status counts as sent in, i.e. New.)
    sb('/rest/v1/szn_submissions?or=(status.is.null,status.neq.draft)&select=id,email,full_name,status,created_at,predicted_season,revised_photos_at&order=created_at.desc'),
    sb('/rest/v1/colour_clients?select=id,email,name,season,tier,active,created_at'),
  ]);
  const byEmail = {};
  const get = (email) => byEmail[email] || (byEmail[email] = { email });

  (records || []).forEach((r) => { get(r.email).record = r; });
  (subs || []).forEach((s) => {
    const email = cleanEmail(s.email);
    if (!email) return;
    const c = get(email);
    if (!c.submission) c.submission = s; // newest first, so the first one is the latest
  });
  (dashboards || []).forEach((d) => { get(cleanEmail(d.email)).dashboard = d; });

  return Object.values(byEmail).map((c) => {
    const r = c.record || {};
    const s = c.submission;
    const d = c.dashboard;
    return {
      email: c.email,
      name: r.name || (s && s.full_name) || (d && d.name) || '',
      paid: !!r.paid,
      paidAt: r.paid_at || null,
      paidEmail: r.paid_email || null,
      tier: r.tier || (d && d.tier) || 'standard',
      drapeSeason: r.drape_season || (d && d.season) || null,
      submission: s ? { id: s.id, status: s.status, submittedAt: s.created_at, predictedSeason: s.predicted_season || null, revisedAt: s.revised_photos_at || null } : null,
      dashboard: d ? { live: !!d.active, season: d.season, since: d.created_at } : { live: false },
      addedAt: r.created_at || (s && s.created_at) || (d && d.created_at) || null,
    };
  }).sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')));
}

async function findClient(email) {
  return (await loadAll()).find((c) => c.email === email) || null;
}

// Creates the oca_clients row if needed, then applies `fields`.
async function saveRecord(email, fields, staff) {
  const body = Object.assign({}, fields, { updated_at: new Date().toISOString(), updated_by: staff.email });
  const existing = await sb('/rest/v1/oca_clients?email=eq.' + enc(email) + '&select=id&limit=1');
  if (existing.length) {
    await sb('/rest/v1/oca_clients?id=eq.' + existing[0].id, { method: 'PATCH', body });
  } else {
    await sb('/rest/v1/oca_clients', { method: 'POST', body: Object.assign({ email }, body) });
  }
}

// ---- Email ----

async function sendResultsEmail(to, name) {
  const first = (name || '').split(' ')[0] || 'there';
  const html =
    '<div style="font-family:Georgia,serif;color:#1C1712;max-width:520px;margin:0 auto;padding:32px 24px;line-height:1.7">' +
    '<div style="font-size:22px;letter-spacing:3px;text-transform:uppercase;margin-bottom:24px">Your <i style="opacity:.6">SZN</i></div>' +
    '<p>Hi ' + escapeHtml(first) + ',</p>' +
    '<p>Your Online Colour Analysis results are ready, and your Colour Dashboard is open.</p>' +
    '<p>Sign in with this email address to see your season, your palette and everything that goes with it.</p>' +
    '<p style="margin:28px 0"><a href="' + PORTAL_URL + '" style="display:inline-block;background:#7A5C48;color:#FFFFFF;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:14px 26px;border-radius:999px">Open my results</a></p>' +
    '<p style="font-size:13px;color:#5E5248">Or go to ' + PORTAL_URL.replace('https://', '') + '. Any questions, just reply to this email.</p>' +
    '<p>Latisha<br>YourSZN</p>' +
    '</div>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'YourSZN <hello@yourszn.com.au>',
      to,
      subject: 'Your colour results are ready',
      html,
      text: 'Hi ' + first + ', your Online Colour Analysis results are ready. Sign in at ' + PORTAL_URL +
        ' with this email address to open your Colour Dashboard. Any questions, just reply to this email. Latisha, YourSZN',
    }),
  });
  // Never log the response body: it can echo the recipient address.
  if (!r.ok) throw new Error('resend ' + r.status);
}

async function logEvent(clientId, event, staff) {
  await sb('/rest/v1/colour_access_log', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: { client_id: clientId, event, user_agent: ('staff: ' + staff.email).slice(0, 300) },
  });
}

// ---- Handler ----

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const staff = await requireStaff(req, res, ['admin']);
  if (!staff) return;
  const body = req.body || {};
  const email = cleanEmail(body.email);

  try {
    if (body.action === 'list') {
      return res.status(200).json({ ok: true, clients: await loadAll(), seasons: SEASONS, readySeasons: READY_SEASONS });
    }

    if (body.action === 'update') {
      if (!validEmail(email)) return res.status(400).json({ error: 'Missing client email.' });
      const client = await findClient(email);
      if (!client) return res.status(404).json({ error: 'Client not found.' });

      const fields = {};
      if (body.paid !== undefined) {
        fields.paid = body.paid === true;
        fields.paid_at = fields.paid ? (client.paidAt || new Date().toISOString()) : null;
      }
      if (body.tier !== undefined) {
        if (!TIERS.includes(body.tier)) return res.status(400).json({ error: 'Pick Standard or Premium.' });
        fields.tier = body.tier;
      }
      if (body.drapeSeason !== undefined) {
        if (body.drapeSeason !== null && !SEASONS.includes(body.drapeSeason)) return res.status(400).json({ error: 'Pick a season.' });
        fields.drape_season = body.drapeSeason;
      }
      if (body.status !== undefined) {
        if (!STATUSES.includes(body.status)) return res.status(400).json({ error: 'Pick a status.' });
        if (!client.submission) return res.status(400).json({ error: 'This client hasn\'t sent a questionnaire yet.' });
        await sb('/rest/v1/szn_submissions?id=eq.' + enc(client.submission.id), {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: { status: body.status, updated_at: new Date().toISOString() },
        });
      }
      if (Object.keys(fields).length) {
        fields.name = client.name || '';
        await saveRecord(email, fields, staff);
      }
      // A live dashboard shows premium extras by tier, so keep it in step.
      if (fields.tier && client.dashboard.live) {
        await sb('/rest/v1/colour_clients?email=eq.' + enc(email), {
          method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { tier: fields.tier },
        });
      }
      return res.status(200).json({ ok: true, client: await findClient(email) });
    }

    if (body.action === 'grant') {
      const name = cleanName(body.name);
      const paidEmail = cleanEmail(body.paidEmail);
      const tier = body.tier || 'standard';
      if (!name) return res.status(400).json({ error: 'Add their name.' });
      if (!validEmail(email)) return res.status(400).json({ error: 'Add the email they will sign in with.' });
      if (paidEmail && !validEmail(paidEmail)) return res.status(400).json({ error: 'The email they paid with doesn\'t look right.' });
      if (!TIERS.includes(tier)) return res.status(400).json({ error: 'Pick Standard or Premium.' });
      await saveRecord(email, {
        name, paid: true, paid_at: new Date().toISOString(), tier,
        paid_email: paidEmail && paidEmail !== email ? paidEmail : null,
      }, staff);
      return res.status(200).json({ ok: true, client: await findClient(email) });
    }

    if (body.action === 'give_dashboard' || body.action === 'resend_email') {
      if (!validEmail(email)) return res.status(400).json({ error: 'Missing client email.' });
      if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'Email isn\'t set up on the server (RESEND_API_KEY).' });
      const client = await findClient(email);
      if (!client) return res.status(404).json({ error: 'Client not found.' });

      if (body.action === 'resend_email') {
        if (!client.dashboard.live) return res.status(400).json({ error: 'Their dashboard isn\'t live yet.' });
        await sendResultsEmail(email, client.name);
        return res.status(200).json({ ok: true, client });
      }

      const season = client.drapeSeason;
      if (!season) return res.status(400).json({ error: 'Choose their season (from your drape) first.' });
      if (!READY_SEASONS.includes(season)) return res.status(400).json({ error: 'The ' + season + ' dashboard isn\'t built yet.' });
      if (!client.name) return res.status(400).json({ error: 'This client has no name on file.' });

      // Save the choices on their record, then open the dashboard.
      await saveRecord(email, { name: client.name, tier: client.tier, drape_season: season }, staff);
      const existing = await sb('/rest/v1/colour_clients?email=eq.' + enc(email) + '&select=id&limit=1');
      let id;
      if (existing.length) {
        id = existing[0].id;
        await sb('/rest/v1/colour_clients?id=eq.' + id, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: { name: client.name, season, tier: client.tier, active: true },
        });
      } else {
        const created = await sb('/rest/v1/colour_clients', { method: 'POST', body: { email, name: client.name, season, tier: client.tier, active: true } });
        id = created[0].id;
      }
      await logEvent(id, 'access-given', staff);

      // Access is open even if the email fails; say so rather than pretend.
      try {
        await sendResultsEmail(email, client.name);
      } catch (err) {
        console.error('[admin-clients] results email failed', err && err.message);
        return res.status(200).json({ ok: true, emailFailed: true, client: await findClient(email) });
      }
      return res.status(200).json({ ok: true, client: await findClient(email) });
    }

    if (body.action === 'remove_dashboard') {
      if (!validEmail(email)) return res.status(400).json({ error: 'Missing client email.' });
      const rows = await sb('/rest/v1/colour_clients?email=eq.' + enc(email) + '&select=id&limit=1');
      if (!rows.length) return res.status(404).json({ error: 'This client has no dashboard.' });
      // sessions_valid_after signs them out of any device still holding a session.
      await sb('/rest/v1/colour_clients?id=eq.' + rows[0].id, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: { active: false, sessions_valid_after: new Date().toISOString() },
      });
      await logEvent(rows[0].id, 'access-removed', staff);
      return res.status(200).json({ ok: true, client: await findClient(email) });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('[admin-clients]', err && err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
