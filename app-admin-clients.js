// ═══════════════════════════════════════════════════════════════
// CLIENTS PAGE (staff hub: Latisha and staff) — Online Colour Analysis clients
//
// One row per client email: paid tick, questionnaire status, season from the
// drape, tier, and Colour Dashboard access. Everything goes through
// /api/admin-clients, which checks the signed-in person's staff role; this file
// only draws the page. Approved mock-up: "Your admin · Clients" artboard.
//
// Entry points: renderAdminClients() (showPage('clients')), adminClientsRefreshBadge()
// (at sign-in). Also draws the sidebar client search and the dashboard's Today card,
// which both list these clients.
// ═══════════════════════════════════════════════════════════════

var acState = {
  clients: [], seasons: [], readySeasons: [],
  loaded: false, loading: false, error: '',
  filter: 'all', search: '', selected: null, busy: false, notice: '',
};

var AC_STATUS = {
  pending:     { label: 'New',         bg: '#FFF3EB', col: '#A04A10' },
  in_progress: { label: 'In progress', bg: '#EBF2FF', col: '#2F5FA8' },
  complete:    { label: 'Complete',    bg: '#EDFBF2', col: '#2E7A4A' },
  sent:        { label: 'Sent',        bg: '#F4F4F4', col: '#555555' },
};

var AC_FILTERS = [
  { id: 'all',         label: 'All',                 test: function () { return true; } },
  { id: 'paid_no_sub', label: 'Paid, not submitted', test: function (c) { return c.paid && !c.submission; } },
  { id: 'new',         label: 'New',                 test: function (c) { return acStatusOf(c) === 'pending'; } },
  { id: 'in_progress', label: 'In progress',         test: function (c) { return acStatusOf(c) === 'in_progress'; } },
  { id: 'complete',    label: 'Complete',            test: function (c) { return acStatusOf(c) === 'complete'; } },
  { id: 'live',        label: 'Dashboard live',      test: function (c) { return c.dashboard.live; } },
];

function acStatusOf(c) { return c.submission ? (c.submission.status || 'pending') : null; }

function acDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// ── Server calls ────────────────────────────────────────────────
async function acApi(action, extra) {
  var db = getSupa();
  var session = db ? (await db.auth.getSession()).data.session : null;
  if (!session) throw new Error('Please log in again.');
  var r = await fetch('/api/admin-clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    body: JSON.stringify(Object.assign({ action: action }, extra || {})),
  });
  var data = {};
  try { data = await r.json(); } catch (e) {}
  if (!r.ok || !data.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

async function acLoad() {
  acState.loading = true; acState.error = '';
  acRender();
  try {
    var data = await acApi('list');
    acState.clients = data.clients;
    acState.seasons = data.seasons;
    acState.readySeasons = data.readySeasons;
    acState.loaded = true;
    if (acState.selected && !acFind(acState.selected)) acState.selected = null;
  } catch (e) {
    acState.error = e.message;
  }
  acState.loading = false;
  acRender();
  acUpdateBadge();
}

function acFind(email) {
  return acState.clients.find(function (c) { return c.email === email; }) || null;
}

// Replaces one client in the list with the server's fresh copy.
function acReplace(client) {
  if (!client) return;
  var i = acState.clients.findIndex(function (c) { return c.email === client.email; });
  if (i === -1) acState.clients.unshift(client); else acState.clients[i] = client;
  acUpdateBadge();
}

async function acDo(action, extra, doneNotice) {
  if (acState.busy) return;
  acState.busy = true; acState.notice = '';
  acRender();
  try {
    var data = await acApi(action, extra);
    acReplace(data.client);
    acState.notice = data.emailFailed
      ? 'Dashboard is open, but the email didn\'t send. Use "Resend email" to try again.'
      : (doneNotice || '');
  } catch (e) {
    alert(e.message);
  }
  acState.busy = false;
  acRender();
}

// Sidebar badge: questionnaires waiting to be started.
function acUpdateBadge() {
  var b = document.getElementById('n-clients-badge');
  if (!b) return;
  var n = acState.clients.filter(function (c) { return acStatusOf(c) === 'pending'; }).length;
  b.textContent = n;
  b.style.display = n ? 'inline-block' : 'none';
}

// Called once at sign-in. Loads the list for the badge, the sidebar search and
// the dashboard's Today card. People without the Clients page don't get the search.
function adminClientsRefreshBadge() {
  if (!document.getElementById('n-clients-badge')) {
    var wrap = document.getElementById('gsearch-wrap');
    if (wrap) wrap.style.display = 'none';
    return;
  }
  acApi('list').then(function (data) {
    acState.clients = data.clients; acState.seasons = data.seasons; acState.readySeasons = data.readySeasons;
    acState.loaded = true;
    acUpdateBadge();
    renderDashToday();
  }).catch(function () {});
}

// ── Actions (called from the page) ──────────────────────────────
function renderAdminClients() {
  acRender();
  acLoad();
}

// Page buttons never carry client details in their markup: the list passes a
// position in acState.clients, and the detail buttons act on the selected client.
function acSetFilter(id) { acState.filter = id; acRender(); }
function acSetSearch(v) { acState.search = v; acRenderList(); }
function acSelectAt(i) {
  var c = acState.clients[i]; if (!c) return;
  acState.selected = c.email; acState.notice = ''; acRender();
}
// From the sidebar search or the dashboard: open the Clients page on one client.
function acOpenAt(i) {
  var c = acState.clients[i]; if (!c) return;
  acState.selected = c.email; acState.filter = 'all'; acState.search = ''; acState.notice = '';
  showPage('clients');
}
function acSel() { return acState.selected ? acFind(acState.selected) : null; }

function acSetPaid(paid) { var c = acSel(); if (c) acDo('update', { email: c.email, paid: paid }); }
function acSetStatus(status) { var c = acSel(); if (c) acDo('update', { email: c.email, status: status }); }
function acSetSeason(season) { var c = acSel(); if (c) acDo('update', { email: c.email, drapeSeason: season || null }); }
function acSetTier(tier) { var c = acSel(); if (c) acDo('update', { email: c.email, tier: tier }); }

function acGiveDashboard() {
  var c = acSel(); if (!c) return;
  if (!confirm('Open the ' + c.drapeSeason + ' dashboard for ' + (c.name || c.email) + ' and email them that their results are ready?')) return;
  acDo('give_dashboard', { email: c.email }, 'Dashboard open. "Your results are ready" email sent to ' + c.email + '.');
}
function acResendEmail() {
  var c = acSel(); if (!c) return;
  if (!confirm('Send the "Your results are ready" email to ' + c.email + ' again?')) return;
  acDo('resend_email', { email: c.email }, 'Email sent again to ' + c.email + '.');
}
function acRemoveDashboard() {
  var c = acSel(); if (!c) return;
  if (!confirm('Close the Colour Dashboard for ' + c.email + '? They\'ll be signed out of it straight away. You can open it again later.')) return;
  acDo('remove_dashboard', { email: c.email }, 'Dashboard closed.');
}

function acOpenQuestionnaire() {
  var c = acSel(); if (!c || !c.submission) return;
  // Start loading the questionnaire first, so the Online page opens on it
  // (showing "Loading…") instead of fetching and flashing the full list.
  ocaSubSource = 'oca';
  ocaSubLoadDetail(c.submission.id);
  showPage('online');
  setOcaTab('submissions');
}

// ── Grant OCA access (someone who paid with a different email) ──
function acOpenGrant() {
  var el = document.getElementById('ac-grant');
  if (el) { el.style.display = 'flex'; document.getElementById('ac-grant-name').focus(); }
}
function acCloseGrant() {
  var el = document.getElementById('ac-grant');
  if (el) el.style.display = 'none';
}
async function acSubmitGrant(ev) {
  ev.preventDefault();
  var val = function (id) { return document.getElementById(id).value.trim(); };
  var email = val('ac-grant-email').toLowerCase();
  var tierEl = document.querySelector('input[name="ac-grant-tier"]:checked');
  var extra = { name: val('ac-grant-name'), email: email, paidEmail: val('ac-grant-paid'), tier: tierEl ? tierEl.value : 'standard' };
  if (acState.busy) return;
  acState.busy = true;
  var err = document.getElementById('ac-grant-err');
  err.textContent = '';
  try {
    var data = await acApi('grant', extra);
    acReplace(data.client);
    acState.selected = email;
    acState.notice = (extra.name || email) + ' added as paid. They can now sign in at clients.yourszn.com.au with ' + email + '.';
    acCloseGrant();
    document.getElementById('ac-grant-form').reset();
  } catch (e) {
    err.textContent = e.message;
  }
  acState.busy = false;
  acRender();
}

// ── Drawing ─────────────────────────────────────────────────────
function acBadge(c) {
  if (c.dashboard.live) return '<span class="ac-pill" style="background:#E2EFE6;color:#2E6B44">Dashboard live</span>';
  var st = acStatusOf(c);
  if (st) {
    var s = AC_STATUS[st] || { label: st, bg: '#F4F4F4', col: '#555' };
    return '<span class="ac-pill" style="background:' + s.bg + ';color:' + s.col + '">' + esc(s.label) + '</span>';
  }
  if (c.paid) return '<span class="ac-pill" style="background:#F8E6EA;color:#8A3E5A">Paid, not submitted</span>';
  return '<span class="ac-pill" style="background:#F4F4F4;color:#555">Not paid</span>';
}

function acVisible() {
  var f = AC_FILTERS.find(function (x) { return x.id === acState.filter; }) || AC_FILTERS[0];
  var q = acState.search.trim().toLowerCase();
  return acState.clients.filter(function (c) {
    if (!f.test(c)) return false;
    if (!q) return true;
    return (c.name || '').toLowerCase().indexOf(q) > -1 || c.email.indexOf(q) > -1 || (c.paidEmail || '').indexOf(q) > -1;
  });
}

function acRender() {
  var root = document.getElementById('admin-clients-root');
  if (!root) return;

  var head =
    '<div class="ph" style="align-items:flex-start">'
    + '<div><div class="ptitle">Clients</div>'
    + '<div class="psub">Online Colour Analysis: payment, analysis and dashboard access</div></div>'
    + '<button class="btn btns" onclick="acOpenGrant()" style="font-size:13px;padding:8px 18px;border:1px dashed var(--brown);white-space:nowrap">+ Grant OCA access</button>'
    + '</div>';

  var chips = '<div class="ac-chips" role="group" aria-label="Filter clients">'
    + AC_FILTERS.map(function (f) {
        var n = acState.clients.filter(f.test).length;
        var on = acState.filter === f.id;
        return '<button type="button" class="ac-chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" onclick="acSetFilter(\'' + f.id + '\')">'
          + esc(f.label) + (acState.loaded ? ' <span class="ac-chip-n">' + n + '</span>' : '') + '</button>';
      }).join('')
    + '</div>';

  var body;
  if (acState.error && !acState.loaded) {
    body = '<div class="card"><div class="cb" style="color:#B42318;font-size:13px">' + esc(acState.error)
      + ' <button class="btn btns" style="margin-left:8px;font-size:12px" onclick="acLoad()">Try again</button></div></div>';
  } else if (!acState.loaded) {
    body = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:13px">Loading clients…</div>';
  } else {
    body = '<div class="ac-cols">'
      + '<div class="ac-listcol">'
      +   '<label for="ac-search" class="ac-sr">Search clients</label>'
      +   '<input id="ac-search" class="fi" type="search" placeholder="Search name or email" value="' + esc(acState.search) + '" oninput="acSetSearch(this.value)">'
      +   '<div id="ac-list"></div>'
      + '</div>'
      + '<section class="ac-detail" aria-live="polite">' + acDetailHtml() + '</section>'
      + '</div>';
  }

  root.innerHTML = acStyles() + head + chips + body + acGrantHtml();
  if (acState.loaded) acRenderList();
}

function acRenderList() {
  var el = document.getElementById('ac-list');
  if (!el) return;
  var list = acVisible();
  if (!list.length) {
    el.innerHTML = '<div style="padding:24px 4px;color:var(--muted);font-size:13px">'
      + (acState.clients.length ? 'No clients match.' : 'No online clients yet.') + '</div>';
    return;
  }
  el.innerHTML = list.map(function (c) {
    var i = acState.clients.indexOf(c);
    var on = c.email === acState.selected;
    var sub = c.paid ? ('Paid' + (c.paidAt ? ' ' + acDate(c.paidAt) : '')) : 'Not marked paid';
    return '<button type="button" class="ac-card' + (on ? ' on' : '') + '" aria-pressed="' + on + '" onclick="acSelectAt(' + i + ')">'
      + '<span class="ac-card-top"><b>' + esc(c.name || c.email) + '</b>' + acBadge(c) + '</span>'
      + '<span class="ac-card-sub">' + esc(c.email) + ' · ' + esc(sub) + '</span>'
      + '</button>';
  }).join('');
}

function acDetailHtml() {
  var c = acSel();
  if (!c) return '<div style="color:var(--muted);font-size:13px;padding:30px 0;text-align:center">Choose a client to see their details.</div>';
  var dis = acState.busy ? ' disabled' : '';
  var s = c.submission;

  var sub = [esc(c.email)];
  if (s) sub.push('Submitted ' + acDate(s.submittedAt));
  if (s && s.predictedSeason) sub.push('Predicts: ' + esc(s.predictedSeason));

  var head = '<div class="ac-dhead"><div>'
    + '<h2 class="ac-name">' + esc(c.name || c.email) + '</h2>'
    + '<div class="ac-dsub">' + sub.join(' · ') + '</div>'
    + (c.paidEmail ? '<div class="ac-dsub">Paid with ' + esc(c.paidEmail) + '</div>' : '')
    + '</div>'
    + (s ? '<button type="button" class="ac-link" onclick="acOpenQuestionnaire()">Open questionnaire + photos →</button>' : '')
    + '</div>';

  var payment = '<div class="ac-tile' + (c.paid ? ' paid' : '') + '">'
    + '<span class="ac-tlbl">Payment</span>'
    + '<label class="ac-check"><input type="checkbox"' + (c.paid ? ' checked' : '') + dis + ' onchange="acSetPaid(this.checked)"> Paid</label>'
    + '<span class="ac-tnote">' + (c.paid ? (c.paidAt ? 'Marked paid ' + acDate(c.paidAt) : 'Marked paid') : 'Tick once payment is in') + '</span>'
    + '</div>';

  var statusSel = s
    ? '<label for="ac-status" class="ac-sr">Status</label><select id="ac-status" class="ac-select"' + dis + ' onchange="acSetStatus(this.value)">'
      + Object.keys(AC_STATUS).map(function (k) { return '<option value="' + k + '"' + (acStatusOf(c) === k ? ' selected' : '') + '>' + AC_STATUS[k].label + '</option>'; }).join('')
      + '</select>'
    : '<b style="font-size:14px">No questionnaire yet</b>';
  var status = '<div class="ac-tile"><span class="ac-tlbl">Status</span>' + statusSel
    + '<span class="ac-tnote">' + (s && s.revisedAt ? 'Revised photos ' + acDate(s.revisedAt) : (s ? 'Same as Online Analysis' : 'Shows once they submit')) + '</span></div>';

  var dash = '<div class="ac-tile' + (c.dashboard.live ? ' paid' : '') + '"><span class="ac-tlbl">Dashboard</span>'
    + '<b style="font-size:14px">' + (c.dashboard.live ? 'Live · ' + esc(c.dashboard.season) : 'Not live yet') + '</b>'
    + '<span class="ac-tnote">' + (c.dashboard.live ? 'Since ' + acDate(c.dashboard.since) : 'Client sees "being prepared"') + '</span></div>';

  var ready = acState.readySeasons;
  var seasonOpts = '<option value="">Choose season…</option>' + acState.seasons.map(function (sn) {
    return '<option value="' + esc(sn) + '"' + (c.drapeSeason === sn ? ' selected' : '') + '>' + esc(sn) + (ready.indexOf(sn) > -1 ? ' · dashboard ready' : ' · coming soon') + '</option>';
  }).join('');

  var tier = '<div class="ac-seg" role="radiogroup" aria-label="Tier">'
    + ['standard', 'premium'].map(function (t) {
        var on = c.tier === t;
        return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? 'on' : '') + '"' + dis + ' onclick="acSetTier(\'' + t + '\')">' + (t === 'standard' ? 'Standard' : 'Premium') + '</button>';
      }).join('')
    + '</div>';

  var action;
  if (c.dashboard.live) {
    action = '<button type="button" class="ac-main"' + dis + ' onclick="acResendEmail()">Resend "results ready" email</button>'
      + '<button type="button" class="ac-link danger"' + dis + ' onclick="acRemoveDashboard()">Remove dashboard access</button>';
  } else {
    var why = !c.drapeSeason ? 'Choose their season first.'
      : ready.indexOf(c.drapeSeason) === -1 ? 'The ' + esc(c.drapeSeason) + ' dashboard isn\'t built yet.'
      : esc((c.name || 'They').split(' ')[0]) + ' gets a "Your results are ready" email and their home page unlocks ' + esc(c.drapeSeason) + '.';
    var can = c.drapeSeason && ready.indexOf(c.drapeSeason) > -1;
    action = '<button type="button" class="ac-main"' + (can && !acState.busy ? '' : ' disabled') + ' onclick="acGiveDashboard()">Give dashboard access + email client</button>'
      + '<span class="ac-tnote" style="max-width:360px">' + why + '</span>';
  }

  return head
    + (acState.notice ? '<div class="ac-notice" role="status">' + esc(acState.notice) + '</div>' : '')
    + '<div class="ac-tiles">' + payment + status + dash + '</div>'
    + '<div class="ac-results">'
    +   '<span class="ac-tlbl">Results + dashboard access</span>'
    +   '<div class="ac-grid2">'
    +     '<div class="ac-field"><label for="ac-season">Season (from your drape)</label>'
    +       '<select id="ac-season" class="ac-select"' + dis + ' onchange="acSetSeason(this.value)">' + seasonOpts + '</select></div>'
    +     '<div class="ac-field"><span class="ac-flbl">Tier</span>' + tier + '</div>'
    +   '</div>'
    +   '<div class="ac-actions">' + action + '</div>'
    + '</div>';
}

function acGrantHtml() {
  return '<div id="ac-grant" class="ac-modal" style="display:none" onclick="if(event.target===this)acCloseGrant()">'
    + '<form id="ac-grant-form" class="ac-modal-box" onsubmit="acSubmitGrant(event)" aria-labelledby="ac-grant-title">'
    +   '<h3 id="ac-grant-title" class="ac-name" style="font-size:22px">Grant OCA access</h3>'
    +   '<p class="ac-dsub" style="margin:0 0 16px">For someone who paid but will sign in with a different email. They\'re added as paid. No email is sent.</p>'
    +   '<div class="ac-field"><label for="ac-grant-name">Name</label><input id="ac-grant-name" class="fi" autocomplete="off" required></div>'
    +   '<div class="ac-field"><label for="ac-grant-email">Email they\'ll sign in with</label><input id="ac-grant-email" class="fi" type="email" autocomplete="off" required></div>'
    +   '<div class="ac-field"><label for="ac-grant-paid">Email they paid with <span style="font-weight:400;color:var(--muted)">(optional)</span></label><input id="ac-grant-paid" class="fi" type="email" autocomplete="off"></div>'
    +   '<fieldset class="ac-field" style="border:0;padding:0;margin:0 0 14px"><legend class="ac-flbl" style="margin-bottom:6px">Tier</legend>'
    +     '<label class="ac-check" style="margin-right:16px"><input type="radio" name="ac-grant-tier" value="standard" checked> Standard</label>'
    +     '<label class="ac-check"><input type="radio" name="ac-grant-tier" value="premium"> Premium</label></fieldset>'
    +   '<div id="ac-grant-err" role="alert" style="color:#B42318;font-size:12px;min-height:16px"></div>'
    +   '<div style="display:flex;gap:10px;margin-top:8px"><button type="submit" class="btn btnp">Add as paid</button><button type="button" class="btn btns" onclick="acCloseGrant()">Cancel</button></div>'
    + '</form></div>';
}

function acStyles() {
  return '<style>'
    + '.ac-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}'
    + '.ac-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}'
    + '.ac-chip{height:36px;padding:0 16px;border-radius:999px;border:1px solid var(--deep);background:#fff;color:var(--deep);font:inherit;font-size:13px;font-weight:600;cursor:pointer}'
    + '.ac-chip.on{background:var(--deep);color:#fff}'
    + '.ac-chip-n{opacity:.65;font-weight:500;margin-left:2px}'
    + '.ac-cols{display:flex;gap:20px;align-items:flex-start}'
    + '.ac-listcol{flex:0 0 340px;display:flex;flex-direction:column;gap:10px}'
    + '#ac-list{display:flex;flex-direction:column;gap:10px}'
    + '.ac-card{display:flex;flex-direction:column;gap:4px;text-align:left;background:#fff;border:1px solid #E2D8CB;border-radius:16px;padding:14px 16px;font:inherit;color:var(--deep);cursor:pointer;min-height:44px}'
    + '.ac-card.on{background:#E6DCCF;border-color:#D3C5B4}'
    + '.ac-card-top{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14.5px}'
    + '.ac-card-sub{font-size:12.5px;color:#5E5248;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.ac-pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap}'
    + '.ac-detail{flex:1;min-width:0;background:#fff;border:1px solid #E2D8CB;border-radius:20px;padding:24px;display:flex;flex-direction:column;gap:18px;box-shadow:0 8px 20px rgba(28,23,18,.06)}'
    + '.ac-dhead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}'
    + '.ac-name{margin:0;font-family:"Fraunces",Georgia,serif;font-weight:400;font-size:26px;color:var(--deep)}'
    + '.ac-dsub{font-size:13px;color:#5E5248;margin-top:4px}'
    + '.ac-link{background:none;border:0;padding:6px 0;font:inherit;font-size:13px;font-weight:600;color:#5F4636;cursor:pointer;text-decoration:underline;text-underline-offset:3px}'
    + '.ac-link.danger{color:#B42318}'
    + '.ac-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}'
    + '.ac-tile{background:#F6F1EA;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:6px}'
    + '.ac-tile.paid{background:#E2EFE6}'
    + '.ac-tlbl,.ac-flbl{font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#7A4F40}'
    + '.ac-tnote{font-size:12px;color:#5E5248;line-height:1.45}'
    + '.ac-check{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:700;cursor:pointer;min-height:28px}'
    + '.ac-check input{width:18px;height:18px;accent-color:#7A5C48}'
    + '.ac-select{height:40px;border:1px solid #D9CCBC;border-radius:10px;padding:0 10px;font:inherit;font-size:14px;background:#fff;color:var(--deep);width:100%}'
    + '.ac-results{border-top:1px solid #EFE7DC;padding-top:18px;display:flex;flex-direction:column;gap:14px}'
    + '.ac-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}'
    + '.ac-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}'
    + '.ac-field label{font-size:12.5px;font-weight:600;color:var(--deep)}'
    + '.ac-seg{display:grid;grid-template-columns:1fr 1fr;background:#E8DFD3;border-radius:12px;padding:4px;gap:4px;height:44px;box-sizing:border-box}'
    + '.ac-seg button{border:0;border-radius:9px;background:transparent;font:inherit;font-size:13px;font-weight:700;color:#5E5248;cursor:pointer}'
    + '.ac-seg button.on{background:#fff;color:var(--deep);box-shadow:0 4px 10px rgba(28,23,18,.08)}'
    + '.ac-actions{display:flex;align-items:center;gap:14px;flex-wrap:wrap}'
    + '.ac-main{height:48px;padding:0 24px;border-radius:999px;border:0;background:#7A5C48;color:#fff;font:inherit;font-size:14px;font-weight:700;cursor:pointer}'
    + '.ac-main:disabled,.ac-seg button:disabled{opacity:.45;cursor:not-allowed}'
    + '.ac-notice{background:#E2EFE6;color:#245238;border-radius:12px;padding:10px 14px;font-size:13px}'
    + '.ac-modal{position:fixed;inset:0;background:rgba(28,23,18,.45);z-index:900;align-items:center;justify-content:center;padding:16px}'
    + '.ac-modal-box{background:#fff;border-radius:18px;padding:26px;width:440px;max-width:100%;box-sizing:border-box}'
    + '@media (max-width:900px){.ac-cols{flex-direction:column;align-items:stretch}.ac-listcol{flex:none}.ac-tiles,.ac-grid2{grid-template-columns:1fr}}'
    + '</style>';
}

// ── Sidebar search ("Search clients…") ─────────────────────────
function globalSearch(q) {
  var el = document.getElementById('gsearch-results');
  if (!el) return;
  q = (q || '').trim().toLowerCase();
  if (q.length < 2) { el.style.display = 'none'; return; }
  var matches = acState.clients.filter(function (c) {
    return (c.name || '').toLowerCase().indexOf(q) > -1 || c.email.indexOf(q) > -1 || (c.drapeSeason || '').toLowerCase().indexOf(q) > -1;
  }).slice(0, 6);
  el.innerHTML = matches.length
    ? matches.map(function (c) {
        return '<button type="button" onclick="globalSearchSelect(' + acState.clients.indexOf(c) + ')" style="display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--warm);padding:9px 14px;cursor:pointer;font:inherit">'
          + '<div style="font-size:12px;font-weight:600;color:var(--deep);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.name || c.email) + '</div>'
          + '<div style="font-size:10px;color:var(--muted)">' + esc(c.drapeSeason ? c.drapeSeason + ' · ' : '') + esc(c.email) + '</div>'
          + '</button>';
      }).join('')
    : '<div style="padding:12px 14px;font-size:12px;color:var(--muted)">' + (acState.loaded ? 'No clients found.' : 'Loading clients…') + '</div>';
  el.style.display = 'block';
}

function globalSearchClose() {
  var el = document.getElementById('gsearch-results');
  if (el) el.style.display = 'none';
}

function globalSearchSelect(i) {
  globalSearchClose();
  var inp = document.getElementById('gsearch-input');
  if (inp) inp.value = '';
  acOpenAt(i);
}

// ── Dashboard: "Today" card (tasks due today + clients waiting on you) ──
function acNeedsYou(c) {
  var st = acStatusOf(c);
  return st === 'pending' || st === 'in_progress' || (st === 'complete' && !c.dashboard.live);
}

function renderDashToday() {
  var el = document.getElementById('dash-today');
  if (!el) return;
  var d0 = new Date();
  var today = d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0') + '-' + String(d0.getDate()).padStart(2, '0');
  var dayLabel = d0.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  var hd = function (t) { return '<div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:8px">' + t + '</div>'; };
  var empty = function (t) { return '<div style="font-size:12px;color:var(--muted);font-style:italic">' + t + '</div>'; };

  var PCOLOR = { red: '#EF4444', orange: '#F59E0B', green: '#10B981' };
  var tasksDue = (typeof tasks !== 'undefined' ? tasks : []).filter(function (t) {
    return t.due === today && (t.status || '') !== 'done' && t.freq === 'one-off';
  });
  var tasksHtml = tasksDue.length
    ? tasksDue.map(function (t) {
        return '<div style="display:flex;align-items:flex-start;gap:7px;padding:4px 0">'
          + '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + (PCOLOR[t.priority || ''] || 'var(--muted)') + ';flex-shrink:0;margin-top:4px"></span>'
          + '<span style="font-size:12px;color:var(--deep);line-height:1.4">' + esc(t.title) + '</span></div>';
      }).join('')
    : empty('No tasks due today.');

  var waiting = acState.clients.filter(acNeedsYou).slice(0, 5);
  var clientsHtml = !acState.loaded ? empty('Loading…')
    : waiting.length
      ? waiting.map(function (c) {
          return '<button type="button" onclick="acOpenAt(' + acState.clients.indexOf(c) + ')" style="display:flex;align-items:center;gap:8px;width:100%;padding:4px 0;background:none;border:0;cursor:pointer;font:inherit;text-align:left">'
            + '<span style="font-size:12px;color:var(--deep);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.name || c.email) + '</span>'
            + acBadge(c) + '</button>';
        }).join('')
      : empty('All clients up to date.');

  el.innerHTML = acStyles() + '<div class="card" style="margin-bottom:0">'
    + '<div class="ch"><div class="ct">Today: ' + esc(dayLabel) + '</div></div>'
    + '<div class="cb"><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">'
    + '<div>' + hd('Tasks due') + tasksHtml + '</div>'
    + '<div>' + hd('Clients waiting on you') + clientsHtml + '</div>'
    + '</div></div></div>';
}
