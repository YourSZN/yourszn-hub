// POST /api/vietnam-login
// Email + 6-digit code sign-in for Vietnam Tailoring Tour clients.
// Replaces the old shared access code, which anyone could read in the page source.
//
//   { action: "send",   email }        -> emails a code if the email is on the tour client list
//   { action: "verify", email, code }  -> { ok, token, expires, name }
//
// The token (scope 'tour') goes in the Authorization header of every tour API
// call; _tour.js checks it. Sessions last SESSION_DAYS. Codes: see _login-codes.js.
//
// Who can sign in: any vietnam_clients row with this email (booked clients,
// plus "preview" rows used for testing). Staff add clients in the hub's Tours page.
//
// Required env vars: SUPABASE_SERVICE_ROLE_KEY, COLOUR_SESSION_SECRET, RESEND_API_KEY

const { cors, sb, clientIp, newSession } = require('./_colour');
const { cleanEmail, validEmail, sendCode, checkCode } = require('./_login-codes');
const { findTourClient } = require('./_tour');

// Shorter than the colour dashboard (30 days): tour dashboards hold passport and flight details.
const SESSION_DAYS = 7;

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  for (const k of ['SUPABASE_SERVICE_ROLE_KEY', 'COLOUR_SESSION_SECRET', 'RESEND_API_KEY']) {
    if (!process.env[k]) {
      console.error('[vietnam-login] missing ' + k);
      return res.status(500).json({ error: 'Sign-in isn\'t set up yet. Please contact YourSZN.' });
    }
  }

  const { action } = req.body || {};
  const email = cleanEmail((req.body || {}).email);
  if (!validEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  try {
    if (action === 'send') {
      // Same answer whether or not the email is on the list, so the form can't be used to find tour clients.
      const generic = { ok: true, message: 'If that email is booked on the tour, a code is on its way.' };
      const client = await findTourClient(email);
      if (!client) return res.status(200).json(generic);
      const sent = await sendCode(email, client.name, 'tour', clientIp(req));
      if (!sent.ok) return res.status(sent.status).json({ error: sent.error });
      return res.status(200).json(generic);
    }

    if (action === 'verify') {
      const checked = await checkCode(email, (req.body || {}).code);
      if (!checked.ok) return res.status(checked.status).json({ error: checked.error });
      const client = await findTourClient(email);
      if (!client) return res.status(401).json({ error: 'We couldn\'t find a tour booking for that email. Please contact YourSZN.' });
      const { token, expires } = newSession(client.id, SESSION_DAYS, 'tour');
      return res.status(200).json({ ok: true, token, expires, name: client.name || '' });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('[vietnam-login]', err && err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
