// Security and behaviour checks for the client APIs in portal/api.
// Runs with a pretend database and email service: no network, no real data.
//
//   node tests/portal/api.test.js
//
// Every check states what must hold. Add a check whenever a client API changes.

const assert = require('assert');
const path = require('path');
const { db, sentEmails, reset, fakeFetch } = require('./fake-services');

process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.COLOUR_SESSION_SECRET = 'test-session-secret';
process.env.RESEND_API_KEY = 'test-resend-key';
global.fetch = fakeFetch;

const API = path.join(__dirname, '..', '..', 'portal', 'api');
const AVA = '11111111-1111-1111-1111-111111111111';
const BEA = '22222222-2222-2222-2222-222222222222';
const CORA = '33333333-3333-3333-3333-333333333333';

const START = {
  vietnam_clients: [
    { id: AVA, name: 'Ava Tour', email: 'Ava@Example.com', budget_goal_amount: 0 },
    { id: BEA, name: 'Bea Tour', email: 'bea@example.com', budget_goal_amount: 0 },
  ],
  colour_clients: [{ id: CORA, email: 'cora@example.com', name: 'Cora Colour', season: 'True Spring', active: true, password_hash: null, sessions_valid_after: null }],
  szn_submissions: [
    { id: 'sub-cora', email: 'cora@example.com', full_name: 'Cora Colour', status: 'sent', created_at: '2026-10-01T00:00:00Z', revised_photos_at: null },
    { id: 'sub-dee', email: 'dee@example.com', full_name: 'Dee Review', status: 'in_progress', created_at: '2026-10-20T00:00:00Z', revised_photos_at: null },
    { id: 'sub-eve-draft', email: 'eve@example.com', full_name: 'Eve Draft', status: 'draft', created_at: '2026-10-21T00:00:00Z', revised_photos_at: null },
  ],
  client_accounts: [], colour_login_codes: [], vietnam_itinerary_items: [], vietnam_recommendations: [], vietnam_faqs: [],
  vietnam_packing_items: [], vietnam_budget_items: [], colour_access_log: [], szn_photos: [],
};

let ipCounter = 0;
function call(file, body, token, ip) {
  const handler = require(path.join(API, file));
  return new Promise((resolve) => {
    const res = {
      code: 200, setHeader() {}, status(c) { this.code = c; return this; },
      json(d) { resolve({ status: this.code, data: d }); return this; }, end() { resolve({ status: this.code }); },
    };
    const headers = { origin: 'https://clients.yourszn.com.au', 'x-real-ip': ip || '10.0.0.' + (++ipCounter % 250) };
    if (token) headers.authorization = 'Bearer ' + token;
    handler({ method: 'POST', headers, body }, res);
  });
}
const lastCode = () => sentEmails[sentEmails.length - 1].subject.match(/(\d{6})$/)[1];

async function signIn(file, email, name) {
  await call(file, { action: 'send', email, name });
  const r = await call(file, { action: 'verify', email, code: lastCode(), name });
  assert.strictEqual(r.status, 200, 'sign-in should work for ' + email);
  return r.data.token;
}

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

// ── Tour sign-in (/api/vietnam-login) ──
check('tour: unknown email gets the same answer and no email', async () => {
  const r = await call('vietnam-login.js', { action: 'send', email: 'stranger@example.com' });
  assert.strictEqual(r.status, 200); assert.strictEqual(sentEmails.length, 0);
});
check('tour: code is emailed, never stored in plain text, works once', async () => {
  await call('vietnam-login.js', { action: 'send', email: 'ava@example.com' });
  const code = lastCode();
  assert.ok(sentEmails[0].subject.startsWith('Your Vietnam Tailoring Tour code'));
  assert.ok(!JSON.stringify(db.colour_login_codes).includes(code));
  const wrong = await call('vietnam-login.js', { action: 'verify', email: 'ava@example.com', code: code === '000000' ? '111111' : '000000' });
  assert.strictEqual(wrong.status, 401); assert.strictEqual(db.colour_login_codes[0].attempts, 1);
  const ok = await call('vietnam-login.js', { action: 'verify', email: 'ava@example.com', code });
  assert.strictEqual(ok.status, 200);
  const again = await call('vietnam-login.js', { action: 'verify', email: 'ava@example.com', code });
  assert.strictEqual(again.status, 401);
});
check('tour: every endpoint refuses without a session, even with a real id and email', async () => {
  for (const f of ['vietnam-dashboard.js', 'vietnam-packing.js', 'vietnam-budget.js', 'vietnam-info.js', 'vietnam-board.js', 'vietnam-wardrobe.js']) {
    const r = await call(f, { cid: BEA, email: 'bea@example.com', action: 'list', op: 'get' });
    assert.strictEqual(r.status, 401, f);
  }
});
check('tour: a session plus another client\'s id still returns only your own data', async () => {
  const t = await signIn('vietnam-login.js', 'ava@example.com');
  const r = await call('vietnam-dashboard.js', { cid: BEA, email: 'bea@example.com' }, t);
  assert.strictEqual(r.status, 200); assert.strictEqual(r.data.client.id, AVA);
});
check('tour: tampered token rejected; removed client loses access', async () => {
  const t = await signIn('vietnam-login.js', 'ava@example.com');
  assert.strictEqual((await call('vietnam-dashboard.js', {}, t.slice(0, -2) + 'xx')).status, 401);
  db.vietnam_clients.shift();
  assert.strictEqual((await call('vietnam-dashboard.js', {}, t)).status, 401);
});

// ── Portal sign-in (/api/client-auth) and home (/api/client-home) ──
check('portal: anyone can sign in with an emailed code', async () => {
  await call('client-auth.js', { action: 'send', email: 'new@example.com', name: 'Nina New' });
  assert.ok(sentEmails[0].subject.startsWith('Your YourSZN sign-in code'));
  const r = await call('client-auth.js', { action: 'verify', email: 'new@example.com', code: lastCode(), name: 'Nina New' });
  assert.strictEqual(r.status, 200); assert.ok(r.data.token);
});
check('portal: new person sees "start", locked dashboard, tour not booked', async () => {
  const t = await signIn('client-auth.js', 'new@example.com', 'Nina New');
  const r = await call('client-home.js', { action: 'get' }, t);
  assert.strictEqual(r.data.name, 'Nina New');
  assert.deepStrictEqual(r.data.analysis, { state: 'none' });
  assert.strictEqual(r.data.tour.booked, false); assert.strictEqual(r.data.dashboard.open, false);
});
check('portal: drafts don\'t count as a submission', async () => {
  const t = await signIn('client-auth.js', 'eve@example.com', 'Eve');
  assert.strictEqual((await call('client-home.js', { action: 'get' }, t)).data.analysis.state, 'none');
});
check('portal: in-progress client sees "review"; approved client sees her season', async () => {
  const dee = await signIn('client-auth.js', 'dee@example.com', 'Dee');
  assert.strictEqual((await call('client-home.js', { action: 'get' }, dee)).data.analysis.state, 'review');
  const cora = await signIn('client-auth.js', 'cora@example.com', 'Cora');
  const r = await call('client-home.js', { action: 'get' }, cora);
  assert.strictEqual(r.data.analysis.state, 'sent'); assert.deepStrictEqual(r.data.dashboard, { open: true, season: 'True Spring', trial: false });
});
check('portal: opening the tour or dashboard only works for people on that list', async () => {
  const nina = await signIn('client-auth.js', 'new@example.com', 'Nina');
  assert.strictEqual((await call('client-home.js', { action: 'open', target: 'tour' }, nina)).status, 403);
  assert.strictEqual((await call('client-home.js', { action: 'open', target: 'colour' }, nina)).status, 403);
  const ava = await signIn('client-auth.js', 'ava@example.com', 'Ava');
  const tour = await call('client-home.js', { action: 'open', target: 'tour' }, ava);
  assert.strictEqual(tour.status, 200);
  const dash = await call('vietnam-dashboard.js', {}, tour.data.token);
  assert.strictEqual(dash.data.client.id, AVA, 'tour session from the portal opens her own tour');
  const cora = await signIn('client-auth.js', 'cora@example.com', 'Cora');
  assert.strictEqual((await call('client-home.js', { action: 'open', target: 'colour' }, cora)).status, 200);
});
check('sessions only open the area they were issued for', async () => {
  const portal = await signIn('client-auth.js', 'ava@example.com', 'Ava');
  const tour = await signIn('vietnam-login.js', 'ava@example.com');
  const { newSession } = require(path.join(API, '_colour.js'));
  const colour = newSession(CORA, 30).token;
  assert.strictEqual((await call('vietnam-dashboard.js', {}, portal)).status, 401, 'portal session must not open the tour API');
  assert.strictEqual((await call('vietnam-dashboard.js', {}, colour)).status, 401, 'colour session must not open the tour API');
  assert.strictEqual((await call('client-home.js', { action: 'get' }, tour)).status, 401, 'tour session must not open the portal home');
  assert.strictEqual((await call('colour-dashboard.js', { action: 'get' }, tour)).status, 401, 'tour session must not open the colour dashboard');
  assert.strictEqual((await call('colour-dashboard.js', { action: 'get' }, portal)).status, 401, 'portal session must not open the colour dashboard');
});

// ── Revised photos (/api/client-submission) ──
check('photos: recorded against your own submission only', async () => {
  const dee = await signIn('client-auth.js', 'dee@example.com', 'Dee');
  const mine = await call('client-submission.js', { action: 'revised', photos: [{ path: 'sub-dee/revised_1_0_a.jpg', name: 'a.jpg', type: 'image/jpeg' }] }, dee);
  assert.strictEqual(mine.status, 200); assert.strictEqual(db.szn_photos.length, 1);
  const theirs = await call('client-submission.js', { action: 'revised', photos: [{ path: 'sub-cora/revised_1_0_a.jpg', name: 'a.jpg', type: 'image/jpeg' }] }, dee);
  assert.strictEqual(theirs.status, 400); assert.strictEqual(db.szn_photos.length, 1);
  const badType = await call('client-submission.js', { action: 'revised', photos: [{ path: 'sub-dee/revised_1_0_a.svg', name: 'a.svg', type: 'image/svg+xml' }] }, dee);
  assert.strictEqual(badType.status, 400);
  assert.strictEqual((await call('client-submission.js', { action: 'revised', photos: [] })).status, 401, 'no session, no upload');
});

// ── Limits ──
check('limits: 5 codes per email per hour, 10 per IP per hour', async () => {
  for (let i = 0; i < 5; i++) await call('client-auth.js', { action: 'send', email: 'bea@example.com' });
  assert.strictEqual((await call('client-auth.js', { action: 'send', email: 'bea@example.com' })).status, 429);
  for (let i = 0; i < 10; i++) await call('client-auth.js', { action: 'send', email: 'x' + i + '@example.com' }, null, '9.9.9.9');
  assert.strictEqual((await call('client-auth.js', { action: 'send', email: 'y@example.com' }, null, '9.9.9.9')).status, 429);
});

// ── Colour dashboard sign-in still works through the shared code module ──
check('colour: sign-in unchanged', async () => {
  await call('colour-auth.js', { action: 'send', email: 'cora@example.com' });
  assert.ok(sentEmails[0].subject.startsWith('Your YourSZN dashboard code'));
  const r = await call('colour-auth.js', { action: 'verify', email: 'cora@example.com', code: lastCode() });
  assert.strictEqual(r.status, 200); assert.ok(r.data.token);
});

check('colour: saves the makeup bag with the rest of your progress; unknown fields dropped', async () => {
  await call('colour-auth.js', { action: 'send', email: 'cora@example.com' });
  const token = (await call('colour-auth.js', { action: 'verify', email: 'cora@example.com', code: lastCode() })).data.token;
  const r = await call('colour-dashboard.js', { action: 'save', state: { favourites: ['#ff8844'], makeup_bag: ['mk/lips-67-0-177.webp'], password_hash: 'x' } }, token);
  assert.strictEqual(r.status, 200);
  const row = db.colour_client_state[db.colour_client_state.length - 1];
  assert.deepStrictEqual(row.makeup_bag, ['mk/lips-67-0-177.webp']);
  assert.strictEqual(row.client_id, CORA, 'saved against the signed-in client only');
  assert.strictEqual(row.password_hash, undefined, 'only known progress fields are saved');
  assert.strictEqual((await call('colour-dashboard.js', { action: 'save', state: { makeup_bag: [] } })).status, 401, 'no session, no save');
});

// ── One password for the whole client site (/api/client-auth, _accounts.js) ──
check('password: offered after a code sign-in, needs that session, min 8 characters', async () => {
  await call('client-auth.js', { action: 'send', email: 'dee@example.com', name: 'Dee' });
  const v = await call('client-auth.js', { action: 'verify', email: 'dee@example.com', code: lastCode(), name: 'Dee' });
  assert.strictEqual(v.data.hasPassword, false, 'no password yet, so the page asks for one');
  assert.strictEqual((await call('client-auth.js', { action: 'set_password', password: 'longenough1' })).status, 401, 'no session, no password');
  assert.strictEqual((await call('client-auth.js', { action: 'set_password', password: 'short' }, v.data.token)).status, 400);
  const set = await call('client-auth.js', { action: 'set_password', password: 'longenough1' }, v.data.token);
  assert.strictEqual(set.status, 200); assert.ok(set.data.token);
  const acct = db.client_accounts.find((a) => a.email === 'dee@example.com');
  assert.ok(acct.password_hash.startsWith('scrypt$') && !JSON.stringify(acct).includes('longenough1'), 'stored only as a hash');
});

check('password: signs in on the front page with no email; wrong ones refused, then locked', async () => {
  const token = await signIn('client-auth.js', 'dee@example.com', 'Dee');
  await call('client-auth.js', { action: 'set_password', password: 'longenough1' }, token);
  const sent = sentEmails.length;
  const ok = await call('client-auth.js', { action: 'login', email: 'DEE@example.com', password: 'longenough1' });
  assert.strictEqual(ok.status, 200); assert.ok(ok.data.token); assert.strictEqual(sentEmails.length, sent, 'no email sent');
  assert.strictEqual((await call('client-home.js', { action: 'get' }, ok.data.token)).data.email, 'dee@example.com');
  assert.strictEqual((await call('client-auth.js', { action: 'login', email: 'nobody@example.com', password: 'longenough1' })).status, 401);
  for (let i = 0; i < 9; i++) assert.strictEqual((await call('client-auth.js', { action: 'login', email: 'dee@example.com', password: 'wrong-guess' })).status, 401);
  assert.strictEqual((await call('client-auth.js', { action: 'login', email: 'dee@example.com', password: 'wrong-guess' })).status, 429, 'locked after 10');
  assert.strictEqual((await call('client-auth.js', { action: 'login', email: 'dee@example.com', password: 'longenough1' })).status, 429, 'even the right one, while locked');
  await signIn('client-auth.js', 'dee@example.com', 'Dee');
  assert.strictEqual((await call('client-auth.js', { action: 'login', email: 'dee@example.com', password: 'longenough1' })).status, 200, 'an emailed code clears the lock');
});

check('password: changing it signs out other devices, front page and dashboard', async () => {
  const phone = await signIn('client-auth.js', 'cora@example.com', 'Cora');
  const dash = (await call('client-home.js', { action: 'open', target: 'colour' }, phone)).data.token;
  assert.strictEqual((await call('colour-dashboard.js', { action: 'load' }, dash)).status, 200);
  const laptop = await signIn('client-auth.js', 'cora@example.com', 'Cora');
  await new Promise((r) => setTimeout(r, 5));
  const fresh = await call('client-auth.js', { action: 'set_password', password: 'longenough1' }, laptop);
  assert.strictEqual((await call('client-home.js', { action: 'get' }, phone)).status, 401, 'old front page session ends');
  assert.strictEqual((await call('colour-dashboard.js', { action: 'load' }, dash)).status, 401, 'old dashboard session ends');
  assert.strictEqual((await call('client-home.js', { action: 'get' }, fresh.data.token)).status, 200, 'this device stays in');
});

check('password: the same password opens the dashboard sign-in, only for approved clients', async () => {
  const cora = await signIn('client-auth.js', 'cora@example.com', 'Cora');
  await call('client-auth.js', { action: 'set_password', password: 'longenough1' }, cora);
  const d = await call('colour-auth.js', { action: 'login', email: 'cora@example.com', password: 'longenough1' });
  assert.strictEqual(d.status, 200); assert.ok(d.data.token);
  const dee = await signIn('client-auth.js', 'dee@example.com', 'Dee');
  await call('client-auth.js', { action: 'set_password', password: 'longenough1' }, dee);
  assert.strictEqual((await call('colour-auth.js', { action: 'login', email: 'dee@example.com', password: 'longenough1' })).status, 401, 'no dashboard, no dashboard session');
});

check('password: set inside the dashboard, it also works on the front page and keeps this device in', async () => {
  await call('colour-auth.js', { action: 'send', email: 'cora@example.com' });
  const t = (await call('colour-auth.js', { action: 'verify', email: 'cora@example.com', code: lastCode() })).data.token;
  await new Promise((r) => setTimeout(r, 5));
  const r = await call('colour-dashboard.js', { action: 'set_password', password: 'longenough1' }, t);
  assert.strictEqual(r.status, 200); assert.ok(r.data.token && r.data.portal && r.data.portal.token);
  assert.strictEqual((await call('client-home.js', { action: 'get' }, r.data.portal.token)).status, 200);
  assert.strictEqual((await call('client-auth.js', { action: 'login', email: 'cora@example.com', password: 'longenough1' })).status, 200);
  assert.strictEqual((await call('colour-dashboard.js', { action: 'load' }, r.data.token)).data.client.hasPassword, true);
});

check('portal: a trial client is told it is a trial, not "results ready"', async () => {
  db.colour_clients[0].trial = true;
  const token = await signIn('client-auth.js', 'cora@example.com', 'Cora');
  const d = (await call('client-home.js', { action: 'get' }, token)).data;
  assert.strictEqual(d.dashboard.open, true); assert.strictEqual(d.dashboard.trial, true);
});

// ── Tour from the colour dashboard's account menu ──
check('dashboard: opens the tour only for clients on the tour list', async () => {
  db.vietnam_clients.push({ id: 'vt-cora', name: 'Cora Colour', email: 'cora@example.com', budget_goal_amount: 0 });
  await call('colour-auth.js', { action: 'send', email: 'cora@example.com' });
  const t = (await call('colour-auth.js', { action: 'verify', email: 'cora@example.com', code: lastCode() })).data.token;
  assert.strictEqual((await call('colour-dashboard.js', { action: 'load' }, t)).data.client.tourBooked, true);
  assert.strictEqual((await call('colour-dashboard.js', { action: 'load' }, t)).data.client.trial, false, 'not a trial unless set');
  db.colour_clients[0].trial = true;
  assert.strictEqual((await call('colour-dashboard.js', { action: 'load' }, t)).data.client.trial, true, 'trial clients see the banner');
  const r = await call('colour-dashboard.js', { action: 'open_tour' }, t);
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await call('vietnam-dashboard.js', { action: 'get' }, r.data.token)).status !== 401, true, 'the tour session works on the tour');
  db.vietnam_clients = db.vietnam_clients.filter((c) => c.id !== 'vt-cora');
  assert.strictEqual((await call('colour-dashboard.js', { action: 'load' }, t)).data.client.tourBooked, false);
  assert.strictEqual((await call('colour-dashboard.js', { action: 'open_tour' }, t)).status, 403);
  assert.strictEqual((await call('colour-dashboard.js', { action: 'open_tour' })).status, 401, 'no session, no tour');
});

(async () => {
  let failed = 0;
  for (const c of checks) {
    reset(START);
    try { await c.fn(); console.log('  ok   ' + c.name); }
    catch (e) { failed++; console.log('  FAIL ' + c.name + '\n       ' + e.message); }
  }
  console.log(failed ? '\n' + failed + ' of ' + checks.length + ' checks failed' : '\nAll ' + checks.length + ' checks passed');
  process.exit(failed ? 1 : 0);
})();
