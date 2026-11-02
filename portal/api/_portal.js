// Who is signed in to the client portal front page (clients.yourszn.com.au). Server-side only.
//
// The portal session is issued by /api/client-auth after an emailed code, so it
// proves the person owns the email address. It does NOT by itself open the tour
// or colour dashboard: /api/client-home checks the client lists before handing
// out those dashboards' own sessions.

const { readToken, sb } = require('./_colour');

const SIGN_IN_AGAIN = { error: 'Please sign in again.', signin: true };

// Returns { email, name } for the signed-in person, or sends a 401/500 and returns null.
function portalSession(req, res) {
  if (!process.env.COLOUR_SESSION_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[portal] missing COLOUR_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY');
    res.status(500).json({ error: 'Server not configured. Please contact YourSZN.' });
    return null;
  }
  const session = readToken(req, 'portal');
  if (!session) { res.status(401).json(SIGN_IN_AGAIN); return null; }
  return { email: String(session.cid).toLowerCase(), name: String(session.name || '').slice(0, 120) };
}

// The client's most recent finished questionnaire (drafts don't count), or null.
async function latestSubmission(email) {
  const rows = await sb('/rest/v1/szn_submissions?email=ilike.' + encodeURIComponent(email) +
    '&status=neq.draft&select=id,full_name,email,status,created_at,revised_photos_at&order=created_at.desc&limit=10');
  // ilike treats _ and % as wildcards: keep exact (case-insensitive) matches only.
  return rows.find((r) => String(r.email || '').trim().toLowerCase() === email) || null;
}

module.exports = { portalSession, latestSubmission };
