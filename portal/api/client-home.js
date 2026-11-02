// POST /api/client-home
// Everything the portal home page shows, for the signed-in person only.
// Needs the portal session (Authorization: Bearer …) from /api/client-auth.
//
//   { action: "get" }
//     -> { ok, name, email,
//          analysis:  { state, submissionId?, submittedAt?, revisedAt? },
//          tour:      { booked },
//          dashboard: { open, season? } }
//
//   { action: "open", target: "tour" | "colour" }
//     -> { ok, token, expires }  a session for that dashboard, only if this
//        email is on its client list. Saves signing in twice.
//
// analysis.state:  none      no questionnaire yet (drafts don't count)
//                  submitted received, not started
//                  review    being worked on (in progress or complete)
//                  sent      results sent
//
// Required env vars: SUPABASE_SERVICE_ROLE_KEY, COLOUR_SESSION_SECRET

const { cors, sb, clientIp, newSession } = require('./_colour');
const { portalSession, latestSubmission } = require('./_portal');
const { findTourClient } = require('./_tour');

// Must match colour-auth.js and vietnam-login.js.
const COLOUR_SESSION_DAYS = 30;
const TOUR_SESSION_DAYS = 7;

const STATE_BY_STATUS = { pending: 'submitted', in_progress: 'review', complete: 'review', sent: 'sent' };

async function findColourClient(email) {
  const rows = await sb('/rest/v1/colour_clients?email=eq.' + encodeURIComponent(email) + '&active=eq.true&select=id,name,season&limit=1');
  return rows[0] || null;
}

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const who = portalSession(req, res);
  if (!who) return;
  const body = req.body || {};

  try {
    if (body.action === 'get') {
      const [sub, tour, colour] = await Promise.all([latestSubmission(who.email), findTourClient(who.email), findColourClient(who.email)]);
      const name = who.name || (colour && colour.name) || (sub && sub.full_name) || (tour && tour.name) || '';
      return res.status(200).json({
        ok: true,
        name,
        email: who.email,
        analysis: sub
          ? { state: STATE_BY_STATUS[sub.status] || 'submitted', submissionId: sub.id, submittedAt: sub.created_at, revisedAt: sub.revised_photos_at }
          : { state: 'none' },
        tour: { booked: !!tour },
        dashboard: colour ? { open: true, season: colour.season || '' } : { open: false },
      });
    }

    if (body.action === 'open') {
      if (body.target === 'tour') {
        const tour = await findTourClient(who.email);
        if (!tour) return res.status(403).json({ error: 'We couldn\'t find a tour booking for your email.' });
        return res.status(200).json(Object.assign({ ok: true }, newSession(tour.id, TOUR_SESSION_DAYS, 'tour')));
      }
      if (body.target === 'colour') {
        const colour = await findColourClient(who.email);
        if (!colour) return res.status(403).json({ error: 'Your colour dashboard isn\'t ready yet.' });
        await sb('/rest/v1/colour_access_log', {
          method: 'POST',
          body: { client_id: colour.id, event: 'login-portal', ip: clientIp(req), user_agent: String(req.headers['user-agent'] || '').slice(0, 300) },
        });
        return res.status(200).json(Object.assign({ ok: true }, newSession(colour.id, COLOUR_SESSION_DAYS, 'colour')));
      }
      return res.status(400).json({ error: 'Unknown dashboard.' });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('[client-home]', err && err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
