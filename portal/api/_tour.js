// Who is signed in to the Vietnam Tailoring Tour dashboard. Server-side only.
//
// Every tour endpoint calls tourSession() before doing anything else.
// The client id and email come ONLY from the signed session token issued by
// /api/vietnam-login (scope 'tour'), never from the request body or the URL,
// so nobody can open another client's dashboard by changing an id or email.

const { readToken, sb } = require('./_colour');

const SIGN_IN_AGAIN = { error: 'Please sign in again.', signin: true };

// Returns { cid, email } for the signed-in tour client, or sends a 401 and returns null.
async function tourSession(req, res) {
  if (!process.env.COLOUR_SESSION_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[tour] missing COLOUR_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY');
    res.status(500).json({ error: 'Server not configured. Please contact YourSZN.' });
    return null;
  }
  const session = readToken(req, 'tour');
  if (!session) { res.status(401).json(SIGN_IN_AGAIN); return null; }
  // Re-check the client still exists, so removing them from the tour list ends their access.
  let client = null;
  try {
    const rows = await sb('/rest/v1/vietnam_clients?id=eq.' + encodeURIComponent(session.cid) + '&select=id,email&limit=1');
    client = rows && rows[0];
  } catch (err) {
    console.error('[tour] client lookup failed', err && err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
    return null;
  }
  if (!client || !client.email) { res.status(401).json(SIGN_IN_AGAIN); return null; }
  return { cid: client.id, email: String(client.email).trim().toLowerCase() };
}

// The tour client with this (lowercased) email, or null. Used by sign-in and the portal home.
async function findTourClient(email) {
  // Emails may have been typed with capitals in the hub, so match case-insensitively,
  // then keep only exact matches (ilike treats _ and % as wildcards) and require exactly one.
  const rows = await sb('/rest/v1/vietnam_clients?email=ilike.' + encodeURIComponent(email) + '&select=id,name,email&limit=10');
  const exact = rows.filter((r) => String(r.email || '').trim().toLowerCase() === email);
  return exact.length === 1 ? exact[0] : null;
}

module.exports = { tourSession, findTourClient };

