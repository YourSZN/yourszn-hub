// Emailed 6-digit sign-in codes, shared by every client sign-in on
// clients.yourszn.com.au (portal front page, colour dashboard, Vietnam Tailoring Tour).
// Server-side only.
//
// How it stays safe:
//   - Codes are never stored as plain text: colour_login_codes keeps an HMAC
//     hash (COLOUR_SESSION_SECRET). The table has no anon/auth policies, so only
//     this server (service role) can read it.
//   - A code works for CODE_MINUTES, once, and locks after MAX_ATTEMPTS wrong tries.
//   - At most MAX_CODES_PER_HOUR codes per email, and MAX_CODES_PER_IP_HOUR per
//     IP address, per hour (stops email bombing and slows guessing).
//   - Code rows (and the IP kept on them) are deleted after KEEP_DAYS.
//
// A code only proves the person owns the email address. Each sign-in endpoint
// then checks that email against its own client list before issuing a session.
//
// Required env vars: SUPABASE_SERVICE_ROLE_KEY, COLOUR_SESSION_SECRET, RESEND_API_KEY
// Optional: EMAIL_FROM (defaults to "YourSZN <hello@yourszn.com.au>")

const crypto = require('crypto');
const { sb } = require('./_colour');

const CODE_MINUTES = 10;
const MAX_CODES_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_IP_HOUR = 10;
const KEEP_DAYS = 7;

// Wording for each kind of sign-in email.
const PURPOSES = {
  portal: { subject: 'Your YourSZN sign-in code', line: 'Here is your code to sign in to the YourSZN client portal:' },
  colour: { subject: 'Your YourSZN dashboard code', line: 'Here is your code to open your colour dashboard:' },
  tour: { subject: 'Your Vietnam Tailoring Tour code', line: 'Here is your code to open your Vietnam Tailoring Tour dashboard:' },
};

const cleanEmail = (e) => String(e || '').trim().toLowerCase().slice(0, 200);
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const hashCode = (email, code) =>
  crypto.createHmac('sha256', process.env.COLOUR_SESSION_SECRET).update(email + ':' + code).digest('hex');
const escapeHtml = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

async function sendCodeEmail(to, name, code, purpose) {
  const words = PURPOSES[purpose] || PURPOSES.colour;
  const first = (name || '').split(' ')[0] || 'there';
  const html =
    '<div style="font-family:Georgia,serif;color:#1C1712;max-width:520px;margin:0 auto;padding:32px 24px;line-height:1.7">' +
    '<div style="font-size:22px;letter-spacing:3px;text-transform:uppercase;margin-bottom:24px">Your <i style="opacity:.6">SZN</i></div>' +
    '<p>Hi ' + escapeHtml(first) + ',</p>' +
    '<p>' + words.line + '</p>' +
    '<p style="font-family:Arial,sans-serif;font-size:34px;font-weight:700;letter-spacing:8px;margin:18px 0">' + code + '</p>' +
    '<p style="font-size:13px;color:#5E5248">This code works for ' + CODE_MINUTES + ' minutes. If you didn\'t ask for it, you can ignore this email.</p>' +
    '</div>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'YourSZN <hello@yourszn.com.au>',
      to,
      subject: words.subject + ': ' + code,
      html,
      text: words.line + ' ' + code + '. It works for ' + CODE_MINUTES + ' minutes.',
    }),
  });
  // Never log the response body in full: it can echo the recipient address.
  if (!r.ok) throw new Error('resend ' + r.status);
}

// Creates a code for `email` and emails it. `ip` is the requester's IP (may be null).
// Returns { ok: true } or { status, error } when an hourly limit is reached.
async function sendCode(email, name, purpose, ip) {
  const since = new Date(Date.now() - 3600e3).toISOString();
  const tooMany = { status: 429, error: 'Too many codes requested. Please wait an hour and try again.' };
  const recent = await sb('/rest/v1/colour_login_codes?email=eq.' + encodeURIComponent(email) + '&created_at=gte.' + since + '&select=id');
  if (recent.length >= MAX_CODES_PER_HOUR) return tooMany;
  if (ip) {
    const fromIp = await sb('/rest/v1/colour_login_codes?ip=eq.' + encodeURIComponent(ip) + '&created_at=gte.' + since + '&select=id');
    if (fromIp.length >= MAX_CODES_PER_IP_HOUR) return tooMany;
  }
  // Housekeeping: old code rows are no use and hold an IP address.
  const old = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString();
  await sb('/rest/v1/colour_login_codes?created_at=lt.' + old, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
  await sb('/rest/v1/colour_login_codes', {
    method: 'POST',
    body: { email, ip: ip || null, code_hash: hashCode(email, code), expires_at: new Date(Date.now() + CODE_MINUTES * 60e3).toISOString() },
  });
  await sendCodeEmail(email, name, code, purpose);
  return { ok: true };
}

// Checks the newest unused, unexpired code for `email` and marks it used.
// Returns { ok: true } or { status, error } with a message safe to show the client.
async function checkCode(email, rawCode) {
  const code = String(rawCode || '').replace(/\D/g, '');
  if (code.length !== 6) return { status: 400, error: 'Please enter the 6-digit code from your email.' };
  const now = new Date().toISOString();
  const rows = await sb('/rest/v1/colour_login_codes?email=eq.' + encodeURIComponent(email) +
    '&used_at=is.null&expires_at=gt.' + now + '&order=created_at.desc&limit=1&select=id,code_hash,attempts');
  const row = rows[0];
  if (!row || row.attempts >= MAX_ATTEMPTS) {
    return { status: 401, error: 'That code has expired. Please ask for a new one.' };
  }
  const ok = crypto.timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(hashCode(email, code)));
  if (!ok) {
    await sb('/rest/v1/colour_login_codes?id=eq.' + row.id, { method: 'PATCH', body: { attempts: row.attempts + 1 } });
    return { status: 401, error: 'That code doesn\'t match. Please check your email and try again.' };
  }
  await sb('/rest/v1/colour_login_codes?id=eq.' + row.id, { method: 'PATCH', body: { used_at: now } });
  return { ok: true };
}

module.exports = { cleanEmail, validEmail, sendCode, checkCode };
