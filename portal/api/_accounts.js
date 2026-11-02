// Client accounts: ONE optional password per client email, for the whole client site
// (portal front page and colour dashboard). Server-side only, service role.
//
// Table client_accounts (portal/sql/2026-11-02-client-accounts.sql):
//   email, password_hash (scrypt), password_set_at, failed_logins, locked_until,
//   sessions_valid_after (sessions issued before this time are signed out).
// A client gets a row the first time they create a password. Signing in with an
// emailed code never needs one.

const { sb, hashPassword, checkPassword, passwordProblem } = require('./_colour');

const MAX_PASSWORD_TRIES = 10;
const LOCK_MINUTES = 15;
const enc = encodeURIComponent;

const WRONG = 'That email or password isn\'t right. Try again, or tap "Forgot password?".';
const LOCKED = 'Too many wrong tries. Please wait ' + LOCK_MINUTES + ' minutes, or sign in with an emailed code.';

async function getAccount(email) {
  const rows = await sb('/rest/v1/client_accounts?email=eq.' + enc(email) + '&select=*&limit=1');
  return rows[0] || null;
}

async function hasPassword(email) {
  const a = await getAccount(email);
  return !!(a && a.password_hash);
}

async function saveAccount(email, fields) {
  const existing = await getAccount(email);
  if (existing) {
    await sb('/rest/v1/client_accounts?email=eq.' + enc(email), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: fields });
  } else {
    await sb('/rest/v1/client_accounts', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: Object.assign({ email }, fields) });
  }
}

// Signs the client out on every device: portal and colour dashboard sessions issued
// before now stop working. Call newSession() AFTER this to keep the current device in.
async function signOutEverywhere(email) {
  const now = new Date().toISOString();
  await saveAccount(email, { sessions_valid_after: now });
  await sb('/rest/v1/colour_clients?email=eq.' + enc(email), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { sessions_valid_after: now } });
}

// Sets or changes the password. Returns an error message, or null when saved.
// Changing a password signs every other device out (the caller issues a fresh session).
async function setPassword(email, password) {
  const problem = passwordProblem(password);
  if (problem) return problem;
  const now = new Date().toISOString();
  await saveAccount(email, { password_hash: hashPassword(password), password_set_at: now, failed_logins: 0, locked_until: null });
  await signOutEverywhere(email);
  return null;
}

// Checks email + password, with a lockout after too many wrong tries.
// Returns { ok: true } or { status, error } with a message safe to show.
async function checkLogin(email, password) {
  const a = await getAccount(email);
  if (!a || !password) return { status: 401, error: WRONG };
  if (a.locked_until && Date.parse(a.locked_until) > Date.now()) return { status: 429, error: LOCKED };
  if (!a.password_hash) return { status: 401, error: WRONG };
  if (!checkPassword(password, a.password_hash)) {
    const tries = (a.failed_logins || 0) + 1;
    const lock = tries >= MAX_PASSWORD_TRIES;
    await saveAccount(email, lock
      ? { failed_logins: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60e3).toISOString() }
      : { failed_logins: tries });
    return lock ? { status: 429, error: LOCKED } : { status: 401, error: WRONG };
  }
  if (a.failed_logins || a.locked_until) await saveAccount(email, { failed_logins: 0, locked_until: null });
  return { ok: true };
}

// A correct emailed code proves the email, so it also clears a password lockout.
async function clearLockout(email) {
  const a = await getAccount(email);
  if (a && (a.failed_logins || a.locked_until)) await saveAccount(email, { failed_logins: 0, locked_until: null });
}

// True if a session (with its issue time `iat`) was issued after the last sign-out-everywhere.
function sessionAllowed(session, account) {
  const after = account && account.sessions_valid_after ? Date.parse(account.sessions_valid_after) : 0;
  return !!(session && session.iat && session.iat >= after);
}

module.exports = { getAccount, hasPassword, setPassword, checkLogin, clearLockout, signOutEverywhere, sessionAllowed };
