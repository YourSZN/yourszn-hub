// A pretend Supabase (REST + the Auth "who is this token" call) and Resend, for testing
// portal/api and the staff APIs in api/ without any network or real data.
// Supports just the query shapes those APIs use.

const db = {};
const sentEmails = [];
// Pretend Supabase Auth: access token -> user. Tests add staff logins here.
const authUsers = {};
let nextId = 0;

function reset(tables) {
  Object.keys(db).forEach((k) => delete db[k]);
  Object.assign(db, JSON.parse(JSON.stringify(tables)));
  sentEmails.length = 0;
  Object.keys(authUsers).forEach((k) => delete authUsers[k]);
}

function matches(row, key, op) {
  const v = row[key];
  const val = (prefix) => decodeURIComponent(op.slice(prefix.length));
  if (op.startsWith('eq.')) return String(v) === val('eq.');
  if (op.startsWith('neq.')) return String(v) !== val('neq.');
  if (op.startsWith('ilike.')) return String(v || '').toLowerCase() === val('ilike.').toLowerCase();
  if (op === 'is.null') return v == null;
  if (op.startsWith('gte.')) return String(v) >= val('gte.');
  if (op.startsWith('gt.')) return String(v) > val('gt.');
  if (op.startsWith('lt.')) return String(v) < val('lt.');
  return true;
}

function respond(status, data) {
  const body = data === undefined ? '' : JSON.stringify(data);
  return { ok: status < 400, status, text: async () => body, json: async () => JSON.parse(body || 'null') };
}

async function fakeFetch(url, opts = {}) {
  const u = new URL(url);
  if (u.hostname === 'api.resend.com') { sentEmails.push(JSON.parse(opts.body)); return respond(200, {}); }
  if (u.pathname === '/auth/v1/user') {
    const token = ((opts.headers || {}).Authorization || '').replace(/^Bearer /, '');
    return authUsers[token] ? respond(200, authUsers[token]) : respond(401, { msg: 'invalid token' });
  }
  const m = u.pathname.match(/\/rest\/v1\/([a-z_]+)/);
  if (!m) return respond(200, []);
  const table = db[m[1]] || (db[m[1]] = []);
  const filters = [...u.searchParams].filter(([k]) => !['select', 'order', 'limit', 'or'].includes(k));
  const method = (opts.method || 'GET').toUpperCase();
  let rows = table.filter((r) => filters.every(([k, v]) => matches(r, k, v)));
  // or=(col.op.value,col.op.value): keep rows matching any of them.
  const or = u.searchParams.get('or');
  if (or) {
    const parts = or.replace(/^\(|\)$/g, '').split(',').map((p) => { const i = p.indexOf('.'); return [p.slice(0, i), p.slice(i + 1)]; });
    rows = rows.filter((r) => parts.some(([k, op]) => matches(r, k, op)));
  }
  if (method === 'POST') {
    const items = [].concat(JSON.parse(opts.body));
    rows = items.map((b) => Object.assign({ id: 'row' + (++nextId), created_at: new Date(Date.now() + nextId).toISOString(), attempts: 0, used_at: null }, b));
    table.push(...rows);
  }
  if (method === 'PATCH') { const b = JSON.parse(opts.body); rows.forEach((r) => Object.assign(r, b)); }
  if (method === 'DELETE') { rows.forEach((r) => table.splice(table.indexOf(r), 1)); return respond(200); }
  const order = u.searchParams.get('order') || '';
  if (order.startsWith('created_at.desc')) rows = rows.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const lim = u.searchParams.get('limit');
  if (lim) rows = rows.slice(0, +lim);
  return respond(200, rows);
}

module.exports = { db, sentEmails, authUsers, reset, fakeFetch };
