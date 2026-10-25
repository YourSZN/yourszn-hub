// POST /api/colour-auth
// Email + 6-digit code login for Online Colour Analysis clients.
//
// Why not Supabase Auth? Every staff table in this project allows ANY
// "authenticated" user full access. If clients signed in through Supabase Auth
// they would become "authenticated" and could read staff data. So clients get
// their own login here instead: codes are stored hashed in colour_login_codes
// (no anon/auth policies, service role only) and a signed session token is
// issued by this API. Clients never get a Supabase session.
//
//   { action: "send",   email }            -> emails a 6-digit code (sign in, or reset a forgotten password)
//   { action: "verify", email, code }      -> { ok, token, expires, hasPassword }
//   { action: "login",  email, password }  -> { ok, token, expires }  (no email sent)
//
// Passwords are optional. They're set after a code sign-in through
// /api/colour-dashboard { action: "set_password" }, stored as scrypt hashes,
// and locked for 15 minutes after 10 wrong tries.
//
// Required env vars (Vercel project that serves clients.yourszn.com.au):
//   SUPABASE_SERVICE_ROLE_KEY  - already set for the Vietnam dashboard
//   RESEND_API_KEY             - resend.com API key (domain yourszn.com.au verified)
//   EMAIL_FROM                 - e.g. "YourSZN <hello@yourszn.com.au>"
//   COLOUR_SESSION_SECRET      - long random string: openssl rand -hex 32

const crypto = require('crypto');
const { cors, sb, clientIp, checkPassword, newSession } = require('./_colour');

const CODE_MINUTES = 10;
const MAX_CODES_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
const SESSION_DAYS = 30;
const MAX_PASSWORD_TRIES = 10;
const LOCK_MINUTES = 15;

const hash = (email, code) =>
  crypto.createHmac('sha256', process.env.COLOUR_SESSION_SECRET).update(email + ':' + code).digest('hex');
const cleanEmail = (e) => String(e || '').trim().toLowerCase().slice(0, 200);
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

async function sendCodeEmail(to, name, code) {
  const first = (name || '').split(' ')[0] || 'there';
  const html =
    '<div style="font-family:Georgia,serif;color:#1C1712;max-width:520px;margin:0 auto;padding:32px 24px;line-height:1.7">' +
    '<div style="font-size:22px;letter-spacing:3px;text-transform:uppercase;margin-bottom:24px">Your <i style="opacity:.6">SZN</i></div>' +
    '<p>Hi ' + first.replace(/[<>&]/g, '') + ',</p>' +
    '<p>Here is your code to open your colour dashboard:</p>' +
    '<p style="font-family:Arial,sans-serif;font-size:34px;font-weight:700;letter-spacing:8px;margin:18px 0">' + code + '</p>' +
    '<p style="font-size:13px;color:#5E5248">This code works for ' + CODE_MINUTES + ' minutes. If you didn\'t ask for it, you can ignore this email.</p>' +
    '</div>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'YourSZN <hello@yourszn.com.au>',
      to,
      subject: 'Your YourSZN dashboard code: ' + code,
      html,
      text: 'Your YourSZN dashboard code is ' + code + '. It works for ' + CODE_MINUTES + ' minutes.',
    }),
  });
  if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
}

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  for (const k of ['SUPABASE_SERVICE_ROLE_KEY', 'COLOUR_SESSION_SECRET', 'RESEND_API_KEY']) {
    if (!process.env[k]) {
      console.error('[colour-auth] missing ' + k);
      return res.status(500).json({ error: 'Login isn\'t set up yet. Please contact YourSZN.' });
    }
  }

  const { action } = req.body || {};
  const email = cleanEmail((req.body || {}).email);
  if (!validEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  try {
    if (action === 'send') {
      // Same answer whether or not the email exists, so the form can't be used to find client emails.
      const generic = { ok: true, message: 'If that email has a YourSZN dashboard, a code is on its way.' };
      const clients = await sb('/rest/v1/colour_clients?email=eq.' + encodeURIComponent(email) + '&active=eq.true&select=id,name&limit=1');
      if (!clients.length) return res.status(200).json(generic);

      const since = new Date(Date.now() - 3600e3).toISOString();
      const recent = await sb('/rest/v1/colour_login_codes?email=eq.' + encodeURIComponent(email) + '&created_at=gte.' + since + '&select=id');
      if (recent.length >= MAX_CODES_PER_HOUR) {
        return res.status(429).json({ error: 'Too many codes requested. Please wait an hour and try again.' });
      }
      const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
      await sb('/rest/v1/colour_login_codes', {
        method: 'POST',
        body: { email, code_hash: hash(email, code), expires_at: new Date(Date.now() + CODE_MINUTES * 60e3).toISOString() },
      });
      await sendCodeEmail(email, clients[0].name, code);
      return res.status(200).json(generic);
    }

    if (action === 'verify') {
      const code = String((req.body || {}).code || '').replace(/\D/g, '');
      if (code.length !== 6) return res.status(400).json({ error: 'Please enter the 6-digit code from your email.' });
      const now = new Date().toISOString();
      const rows = await sb('/rest/v1/colour_login_codes?email=eq.' + encodeURIComponent(email) +
        '&used_at=is.null&expires_at=gt.' + now + '&order=created_at.desc&limit=1&select=id,code_hash,attempts');
      const row = rows[0];
      if (!row || row.attempts >= MAX_ATTEMPTS) {
        return res.status(401).json({ error: 'That code has expired. Please ask for a new one.' });
      }
      const ok = crypto.timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(hash(email, code)));
      if (!ok) {
        await sb('/rest/v1/colour_login_codes?id=eq.' + row.id, { method: 'PATCH', body: { attempts: row.attempts + 1 } });
        return res.status(401).json({ error: 'That code doesn\'t match. Please check your email and try again.' });
      }
      await sb('/rest/v1/colour_login_codes?id=eq.' + row.id, { method: 'PATCH', body: { used_at: now } });
      const clients = await sb('/rest/v1/colour_clients?email=eq.' + encodeURIComponent(email) + '&active=eq.true&select=id,password_hash&limit=1');
      if (!clients.length) return res.status(401).json({ error: 'This dashboard is no longer active. Please contact YourSZN.' });

      // A correct code also clears any password lockout.
      await sb('/rest/v1/colour_clients?id=eq.' + clients[0].id, { method: 'PATCH', body: { failed_logins: 0, locked_until: null } });
      const { token, expires } = newSession(clients[0].id, SESSION_DAYS);
      await sb('/rest/v1/colour_access_log', {
        method: 'POST',
        body: { client_id: clients[0].id, event: 'login', ip: clientIp(req), user_agent: String(req.headers['user-agent'] || '').slice(0, 300) },
      });
      return res.status(200).json({ ok: true, token, expires, hasPassword: !!clients[0].password_hash });
    }

    if (action === 'login') {
      const password = String((req.body || {}).password || '');
      const wrong = { error: 'That email or password isn\'t right. Try again, or tap "Forgot password?".' };
      const rows = await sb('/rest/v1/colour_clients?email=eq.' + encodeURIComponent(email) + '&active=eq.true&select=id,password_hash,failed_logins,locked_until&limit=1');
      const c = rows[0];
      if (!c || !password) return res.status(401).json(wrong);
      if (c.locked_until && Date.parse(c.locked_until) > Date.now()) {
        return res.status(429).json({ error: 'Too many wrong tries. Please wait ' + LOCK_MINUTES + ' minutes, or tap "Email me a code instead".' });
      }
      if (!c.password_hash) {
        return res.status(400).json({ error: 'You haven\'t set a password yet. Tap "Email me a code instead" to sign in.' });
      }
      if (!checkPassword(password, c.password_hash)) {
        const tries = (c.failed_logins || 0) + 1;
        const lock = tries >= MAX_PASSWORD_TRIES;
        await sb('/rest/v1/colour_clients?id=eq.' + c.id, {
          method: 'PATCH',
          body: lock ? { failed_logins: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60e3).toISOString() } : { failed_logins: tries },
        });
        return res.status(lock ? 429 : 401).json(lock ? { error: 'Too many wrong tries. Please wait ' + LOCK_MINUTES + ' minutes, or tap "Email me a code instead".' } : wrong);
      }
      await sb('/rest/v1/colour_clients?id=eq.' + c.id, { method: 'PATCH', body: { failed_logins: 0, locked_until: null } });
      const { token, expires } = newSession(c.id, SESSION_DAYS);
      await sb('/rest/v1/colour_access_log', {
        method: 'POST',
        body: { client_id: c.id, event: 'login-password', ip: clientIp(req), user_agent: String(req.headers['user-agent'] || '').slice(0, 300) },
      });
      return res.status(200).json({ ok: true, token, expires });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('[colour-auth]', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
