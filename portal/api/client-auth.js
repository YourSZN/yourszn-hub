// POST /api/client-auth
// Sign-in for the client portal front page (clients.yourszn.com.au).
// Anyone can sign in: new clients need an account to start their analysis.
//
//   { action: "send",   email }              -> emails a 6-digit code
//   { action: "verify", email, code, name }  -> { ok, token, expires }
//
// The token (scope 'portal') proves the person owns the email. /api/client-home
// uses it to show their own analysis, tour and dashboard, and to open those
// dashboards without a second sign-in. Codes and limits: see _login-codes.js.
//
// Required env vars: SUPABASE_SERVICE_ROLE_KEY, COLOUR_SESSION_SECRET, RESEND_API_KEY

const { cors, clientIp, newSession } = require('./_colour');
const { cleanEmail, validEmail, sendCode, checkCode } = require('./_login-codes');

const SESSION_DAYS = 30;
const cleanName = (n) => String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 120);

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  for (const k of ['SUPABASE_SERVICE_ROLE_KEY', 'COLOUR_SESSION_SECRET', 'RESEND_API_KEY']) {
    if (!process.env[k]) {
      console.error('[client-auth] missing ' + k);
      return res.status(500).json({ error: 'Sign-in isn\'t set up yet. Please contact YourSZN.' });
    }
  }

  const body = req.body || {};
  const email = cleanEmail(body.email);
  if (!validEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  try {
    if (body.action === 'send') {
      const sent = await sendCode(email, cleanName(body.name), 'portal', clientIp(req));
      if (!sent.ok) return res.status(sent.status).json({ error: sent.error });
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'verify') {
      const checked = await checkCode(email, body.code);
      if (!checked.ok) return res.status(checked.status).json({ error: checked.error });
      const { token, expires } = newSession(email, SESSION_DAYS, 'portal', { name: cleanName(body.name) });
      return res.status(200).json({ ok: true, token, expires });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('[client-auth]', err && err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
