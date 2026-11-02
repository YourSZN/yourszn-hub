// Security and behaviour checks for the staff hub's Clients page API (api/admin-clients.js).
// Runs with a pretend database, login service and email service: no network, no real data.
//
//   node tests/staff/admin-clients.test.js
//
// Every check states what must hold. Add a check whenever the API changes.

const assert = require('assert');
const path = require('path');
const { db, sentEmails, authUsers, reset, fakeFetch } = require('../portal/fake-services');

process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.RESEND_API_KEY = 'test-resend-key';
global.fetch = fakeFetch;

const API = path.join(__dirname, '..', '..', 'api', 'admin-clients.js');
const ADMIN = 'admin-token';
const STAFF = 'staff-token';
const OUTSIDER = 'outsider-token'; // a real Supabase login with no staff profile

const START = {
  profiles: [
    { id: 'u-admin', email: 'boss@example.com', role: 'admin' },
    { id: 'u-staff', email: 'helper@example.com', role: 'staff' },
  ],
  oca_clients: [
    { id: 'oc-gina', email: 'gina@example.com', name: 'Gina Paid', paid: true, paid_at: '2026-10-30T00:00:00Z', paid_email: null, tier: 'standard', drape_season: null, created_at: '2026-10-30T00:00:00Z' },
  ],
  szn_submissions: [
    { id: 'sub-mona-old', email: 'mona@example.com', full_name: 'Mona Spring', status: 'sent', created_at: '2026-09-01T00:00:00Z', predicted_season: 'True Summer' },
    { id: 'sub-mona', email: 'Mona@Example.com', full_name: 'Mona Spring', status: 'complete', created_at: '2026-10-29T00:00:00Z', predicted_season: 'True Summer' },
    { id: 'sub-nell', email: 'nell@example.com', full_name: 'Nell New', status: 'pending', created_at: '2026-10-31T00:00:00Z', predicted_season: null },
    { id: 'sub-dora', email: 'dora@example.com', full_name: 'Dora Draft', status: 'draft', created_at: '2026-11-01T00:00:00Z', predicted_season: null },
  ],
  colour_clients: [
    { id: 'cc-lily', email: 'lily@example.com', name: 'Lily Summer', season: 'Light Summer', tier: 'premium', active: true, created_at: '2026-10-01T00:00:00Z' },
  ],
  colour_access_log: [],
};

function call(body, token) {
  const handler = require(API);
  return new Promise((resolve) => {
    const res = {
      code: 200, setHeader() {}, status(c) { this.code = c; return this; },
      json(d) { resolve({ status: this.code, data: d }); return this; }, end() { resolve({ status: this.code }); },
    };
    const headers = { origin: 'https://portal.yourszn.com.au' };
    if (token) headers.authorization = 'Bearer ' + token;
    handler({ method: 'POST', headers, body }, res);
  });
}
const clientIn = (r, email) => r.data.clients.find((c) => c.email === email);

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

// ── Who can use it ──
check('access: no login, a fake token, or a login with no staff role are all refused', async () => {
  assert.strictEqual((await call({ action: 'list' })).status, 401);
  assert.strictEqual((await call({ action: 'list' }, 'made-up-token')).status, 401);
  assert.strictEqual((await call({ action: 'list' }, OUTSIDER)).status, 403, 'signed in, but not staff');
  const g = await call({ action: 'give_dashboard', email: 'mona@example.com' }, OUTSIDER);
  assert.strictEqual(g.status, 403); assert.strictEqual(db.colour_clients.length, 1); assert.strictEqual(sentEmails.length, 0);
});

check('access: staff (Salma) can use the page, and her changes are recorded under her email', async () => {
  assert.strictEqual((await call({ action: 'list' }, STAFF)).status, 200);
  assert.strictEqual((await call({ action: 'update', email: 'nell@example.com', paid: true }, STAFF)).status, 200);
  assert.strictEqual(db.oca_clients.find((x) => x.email === 'nell@example.com').updated_by, 'helper@example.com');
});

// ── The list ──
check('list: one row per email, joining paid record, latest questionnaire and dashboard', async () => {
  const r = await call({ action: 'list' }, ADMIN);
  assert.strictEqual(r.status, 200);
  const emails = r.data.clients.map((c) => c.email).sort();
  assert.deepStrictEqual(emails, ['gina@example.com', 'lily@example.com', 'mona@example.com', 'nell@example.com'], 'drafts are not clients yet; emails are matched case-insensitively');
  const mona = clientIn(r, 'mona@example.com');
  assert.strictEqual(mona.submission.id, 'sub-mona', 'latest questionnaire wins');
  assert.strictEqual(mona.paid, false);
  assert.strictEqual(clientIn(r, 'gina@example.com').submission, null, 'paid, not submitted');
  assert.strictEqual(clientIn(r, 'lily@example.com').dashboard.live, true);
  assert.deepStrictEqual(r.data.readySeasons, ['True Spring']);
});

// ── Editing ──
check('update: paid tick, tier and season save to the client record; status to the latest questionnaire', async () => {
  let r = await call({ action: 'update', email: 'Mona@example.com', paid: true, tier: 'premium', drapeSeason: 'True Spring', status: 'sent' }, ADMIN);
  assert.strictEqual(r.status, 200);
  const rec = db.oca_clients.find((x) => x.email === 'mona@example.com');
  assert.ok(rec && rec.paid && rec.paid_at, 'record created and paid');
  assert.strictEqual(rec.tier, 'premium'); assert.strictEqual(rec.drape_season, 'True Spring');
  assert.strictEqual(rec.updated_by, 'boss@example.com', 'records who changed it');
  assert.strictEqual(db.szn_submissions.find((s) => s.id === 'sub-mona').status, 'sent');
  assert.strictEqual(db.szn_submissions.find((s) => s.id === 'sub-mona-old').status, 'sent', 'older questionnaire untouched');
  r = await call({ action: 'update', email: 'mona@example.com', paid: false }, ADMIN);
  assert.strictEqual(db.oca_clients.find((x) => x.email === 'mona@example.com').paid_at, null);
});

check('update: rejects made-up values and unknown clients', async () => {
  assert.strictEqual((await call({ action: 'update', email: 'mona@example.com', tier: 'gold' }, ADMIN)).status, 400);
  assert.strictEqual((await call({ action: 'update', email: 'mona@example.com', drapeSeason: 'Neon Spring' }, ADMIN)).status, 400);
  assert.strictEqual((await call({ action: 'update', email: 'mona@example.com', status: 'deleted' }, ADMIN)).status, 400);
  assert.strictEqual((await call({ action: 'update', email: 'gina@example.com', status: 'sent' }, ADMIN)).status, 400, 'no questionnaire to change');
  assert.strictEqual((await call({ action: 'update', email: 'nobody@example.com', paid: true }, ADMIN)).status, 404);
});

// ── Grant OCA access ──
check('grant: adds a paid client under the sign-in email, keeps the payment email, sends nothing', async () => {
  const r = await call({ action: 'grant', name: '  Pia  Other ', email: 'PIA@example.com', paidEmail: 'pia.work@example.com', tier: 'premium' }, ADMIN);
  assert.strictEqual(r.status, 200);
  const rec = db.oca_clients.find((x) => x.email === 'pia@example.com');
  assert.strictEqual(rec.name, 'Pia Other'); assert.strictEqual(rec.paid, true);
  assert.strictEqual(rec.paid_email, 'pia.work@example.com'); assert.strictEqual(rec.tier, 'premium');
  assert.strictEqual(sentEmails.length, 0, 'no email on grant');
  assert.strictEqual((await call({ action: 'grant', name: '', email: 'x@example.com' }, ADMIN)).status, 400);
  assert.strictEqual((await call({ action: 'grant', name: 'X', email: 'not-an-email' }, ADMIN)).status, 400);
});

// ── Dashboard access ──
check('dashboard: only for a chosen, ready season; opens it, emails once, logs who did it', async () => {
  assert.strictEqual((await call({ action: 'give_dashboard', email: 'mona@example.com' }, ADMIN)).status, 400, 'no season chosen yet');
  await call({ action: 'update', email: 'mona@example.com', drapeSeason: 'Light Summer' }, ADMIN);
  assert.strictEqual((await call({ action: 'give_dashboard', email: 'mona@example.com' }, ADMIN)).status, 400, 'Light Summer not ready');
  assert.strictEqual(db.colour_clients.length, 1); assert.strictEqual(sentEmails.length, 0);

  await call({ action: 'update', email: 'mona@example.com', drapeSeason: 'True Spring', tier: 'premium' }, ADMIN);
  const r = await call({ action: 'give_dashboard', email: 'mona@example.com' }, ADMIN);
  assert.strictEqual(r.status, 200); assert.ok(!r.data.emailFailed);
  const cc = db.colour_clients.find((c) => c.email === 'mona@example.com');
  assert.ok(cc && cc.active); assert.strictEqual(cc.season, 'True Spring'); assert.strictEqual(cc.tier, 'premium');
  assert.strictEqual(cc.trial, false, 'a real result is never a trial');
  assert.strictEqual(sentEmails.length, 1); assert.strictEqual(sentEmails[0].to, 'mona@example.com');
  assert.ok(sentEmails[0].html.includes('https://clients.yourszn.com.au'));
  assert.strictEqual(db.colour_access_log[0].event, 'access-given');
  assert.ok(db.colour_access_log[0].user_agent.includes('boss@example.com'));
});

check('trial: opens True Spring with a trial flag, leaves their drape season alone, sends nothing', async () => {
  await call({ action: 'update', email: 'nell@example.com', drapeSeason: 'Soft Autumn' }, ADMIN);
  const r = await call({ action: 'give_trial', email: 'nell@example.com' }, STAFF);
  assert.strictEqual(r.status, 200);
  const cc = db.colour_clients.find((c) => c.email === 'nell@example.com');
  assert.ok(cc.active && cc.trial); assert.strictEqual(cc.season, 'True Spring');
  assert.strictEqual(db.oca_clients.find((x) => x.email === 'nell@example.com').drape_season, 'Soft Autumn');
  assert.strictEqual(sentEmails.length, 0);
  assert.strictEqual(r.data.client.dashboard.trial, true);
  assert.strictEqual((await call({ action: 'give_trial', email: 'nell@example.com' }, ADMIN)).status, 400, 'already open');
  assert.strictEqual((await call({ action: 'give_trial', email: 'nell@example.com' }, OUTSIDER)).status, 403);
  // Their real result later switches the trial off
  await call({ action: 'remove_dashboard', email: 'nell@example.com' }, ADMIN);
  await call({ action: 'update', email: 'nell@example.com', drapeSeason: 'True Spring' }, ADMIN);
  await call({ action: 'give_dashboard', email: 'nell@example.com' }, ADMIN);
  assert.strictEqual(db.colour_clients.find((c) => c.email === 'nell@example.com').trial, false);
});

check('dashboard: names in the email are escaped', async () => {
  await call({ action: 'grant', name: '<b>Evil</b>', email: 'evil@example.com' }, ADMIN);
  await call({ action: 'update', email: 'evil@example.com', drapeSeason: 'True Spring' }, ADMIN);
  await call({ action: 'give_dashboard', email: 'evil@example.com' }, ADMIN);
  assert.ok(!sentEmails[0].html.includes('<b>Evil'));
});

check('dashboard: changing tier updates a live dashboard too', async () => {
  await call({ action: 'update', email: 'lily@example.com', tier: 'standard' }, ADMIN);
  assert.strictEqual(db.colour_clients.find((c) => c.email === 'lily@example.com').tier, 'standard');
});

check('dashboard: resend only when live; remove closes it and signs them out', async () => {
  assert.strictEqual((await call({ action: 'resend_email', email: 'nell@example.com' }, ADMIN)).status, 400);
  assert.strictEqual((await call({ action: 'resend_email', email: 'lily@example.com' }, ADMIN)).status, 200);
  assert.strictEqual(sentEmails.length, 1);
  const r = await call({ action: 'remove_dashboard', email: 'lily@example.com' }, ADMIN);
  assert.strictEqual(r.status, 200);
  const cc = db.colour_clients.find((c) => c.email === 'lily@example.com');
  assert.strictEqual(cc.active, false); assert.ok(cc.sessions_valid_after);
  assert.strictEqual(r.data.client.dashboard.live, false);
});

(async () => {
  let failed = 0;
  for (const c of checks) {
    reset(START);
    authUsers[ADMIN] = { id: 'u-admin', email: 'Boss@example.com' };
    authUsers[STAFF] = { id: 'u-staff', email: 'helper@example.com' };
    authUsers[OUTSIDER] = { id: 'u-nobody', email: 'stranger@example.com' };
    try { await c.fn(); console.log('  ok   ' + c.name); }
    catch (e) { failed++; console.log('  FAIL ' + c.name + '\n       ' + e.message); }
  }
  console.log(failed ? '\n' + failed + ' of ' + checks.length + ' checks failed' : '\nAll ' + checks.length + ' checks passed');
  process.exit(failed ? 1 : 0);
})();
