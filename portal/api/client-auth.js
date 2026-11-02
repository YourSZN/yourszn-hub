// POST /api/client-auth
// Sign-in for the client portal front page (clients.yourszn.com.au).
// Anyone can sign in: new clients need an account to start their analysis.
//
//   { action: "send",   email }              -> emails a 6-digit code (sign in, or forgot password)
//   { action: "verify", email, code, name }  -> { ok, token, expires, hasPassword }
//   { action: "login",  email, password }    -> { ok, token, expires }   (no email sent)
//   { action: "set_password", password }     -> { ok, token, expires }
//        needs the portal session (Authorization: Bearer …). Creates or changes the
//        client's one password (see _accounts.js) and signs out their other devices.
//
// The token (scope 'portal') proves the person owns the email. /api/client-home
// uses it to show their own analysis, tour and dashboard, and to open those
// dashboards without a second sign-in. Codes and limits: see _login-codes.js.
//
// Required env vars: SUPABASE_SERVICE_ROLE_KEY, COLOUR_SESSION_SECRET, RESEND_API_KEY

const { cors, clientIp, newSession } = require('./_colour');
const { cleanEmail, validEmail, sendCode, checkCode } = require('./_login-codes');
const { hasPassword, setPassword, checkLogin, clearLockout } = require('./_accounts');
const { portalSession } = require('./_portal');

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

  if (body.action === 'set_password') {
    try {
      const who = await portalSession(req, res);
      if (!who) return;
      const problem = await setPassword(who.email, String(body.password || ''));
      if (problem) return res.status(400).json({ error: problem });
      // Other devices are now signed out; keep this one signed in.
      const { token, expires } = newSession(who.email, SESSION_DAYS, 'portal', { name: who.name });
      return res.status(200).json({ ok: true, token, expires });
    } catch (err) {
      console.error('[client-auth]', err && err.message);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }

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
      await clearLockout(email);
      const { token, expires } = newSession(email, SESSION_DAYS, 'portal', { name: cleanName(body.name) });
      return res.status(200).json({ ok: true, token, expires, hasPassword: await hasPassword(email) });
    }

    if (body.action === 'login') {
      const checked = await checkLogin(email, String(body.password || ''));
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
