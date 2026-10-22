/* ============================================================
   app-in-person.js  —  In-Person Clients Feature
   ============================================================ */
// --- HEIC display fix for Chrome ---

function ipFixHeicImg(img) {
  if (!img || !img.src) return;
  var src = img.src.toLowerCase();
  if (src.indexOf('.heic') === -1 && src.indexOf('.heif') === -1) return;
  fetch(img.src)
    .then(function(res) { return res.blob(); })
    .then(function(blob) {
      return HeicTo({ blob: blob, type: 'image/jpeg', quality: 0.85 });
    })
    .then(function(jpegBlob) {
      img.src = URL.createObjectURL(jpegBlob);
    })
    .catch(function(err) {
      console.warn('HEIC fix failed:', err);
    });
}
var IP_SEASONS = [
  'Bright Spring','Bright Winter','Dark Autumn','Dark Winter',
  'Light Spring','Light Summer','Soft Autumn','Soft Summer',
  'True Autumn','True Spring','True Summer','True Winter'
];

var IP_STATUSES = ['pending','uploaded','analysed','complete'];

var IP_GREY_VALS = [
  {bg:'#111'},{bg:'#222'},{bg:'#333'},{bg:'#444'},{bg:'#555'},
  {bg:'#777'},{bg:'#888'},{bg:'#999'},{bg:'#bbb'},{bg:'#ddd'}
];

/* ---------- helpers ---------- */

function ipContrastLevel(skin, hair, eyes) {
  if (!skin && !hair && !eyes) return { range: 0, level: 'Low' };
  var vals = [skin || 1, hair || 1, eyes || 1];
  var range = Math.max.apply(null, vals) - Math.min.apply(null, vals);
  var level = 'Low';
  if (range >= 8) level = 'High';
  else if (range >= 6) level = 'Medium-High';
  else if (range >= 4) level = 'Medium';
  else if (range >= 2) level = 'Medium-Low';
  return { range: range, level: level };
}

function ipContrastColor(level) {
  switch (level) {
    case 'High': return 'var(--deep)';
    case 'Medium-High': return 'var(--brown)';
    case 'Medium': return 'var(--tan)';
    case 'Medium-Low': return 'var(--sand)';
    default: return 'var(--muted)';
  }
}

function ipStatusColor(status) {
  switch (status) {
    case 'complete': return 'var(--green)';
    case 'analysed': return 'var(--gold)';
    case 'uploaded': return 'var(--rose)';
    default: return 'var(--muted)';
  }
}

function ipFormatDate(d) {
  if (!d) return '—';
  var dt = new Date(d);
  return dt.toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
}

/* ==========================================================
   PHOTO UPLOAD NOTIFICATIONS
   Checks for bookings where client submitted photos
   but status is still 'uploaded' (not yet reviewed by admin).
   ========================================================== */

var _ipPendingPhotos = [];

async function ipCheckPhotoNotifications() {
  var db = getSupa(); if (!db) return;

  var { data, error } = await db
    .from('in_person_bookings')
    .select('id, client_name, client_email, appointment_date, photos_submitted_at')
    .not('photos_submitted_at', 'is', null)
    .eq('status', 'uploaded')
    .order('photos_submitted_at', { ascending: false });

  _ipPendingPhotos = (error || !data) ? [] : data;

  ipUpdateNavBadge();
  ipUpdateDashBanner();
}

function ipUpdateNavBadge() {
  var badge = document.getElementById('n-clients-badge');
  if (!badge) return;
  var count = _ipPendingPhotos.length;
  if (count > 0) {
    badge.style.display = 'inline-block';
    badge.textContent = count;
  } else {
    badge.style.display = 'none';
  }
}

function ipUpdateDashBanner() {
  var el = document.getElementById('dash-photo-banner');
  if (!el) return;
  var count = _ipPendingPhotos.length;
  if (count === 0) { el.innerHTML = ''; return; }

  var names = _ipPendingPhotos.slice(0, 3).map(function(b) { return b.client_name; }).join(', ');
  var extra = count > 3 ? ' + ' + (count - 3) + ' more' : '';

  el.innerHTML =
    '<div onclick="showPage(\'clients\');showClientsTab(\'inperson\');" style="' +
      'display:flex;align-items:center;gap:12px;padding:12px 18px;margin-bottom:16px;' +
      'background:linear-gradient(135deg,#FEF2F2,#FFF7ED);border:1px solid #FECACA;border-radius:10px;' +
      'cursor:pointer;transition:transform 0.15s;" ' +
      'onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'none\'">' +
      '<div style="width:36px;height:36px;border-radius:50%;background:var(--rose);color:white;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">&#128247;</div>' +
      '<div style="flex:1;">' +
        '<div style="font-size:13px;font-weight:700;color:var(--charcoal);">' + count + ' client' + (count !== 1 ? 's have' : ' has') + ' uploaded photos</div>' +
        '<div style="font-size:12px;color:var(--brown);margin-top:2px;">' + names + extra + ' — ready for contrast analysis</div>' +
      '</div>' +
      '<div style="font-size:12px;color:var(--muted);">View →</div>' +
    '</div>';
}

function ipGetInPersonBanner() {
  var count = _ipPendingPhotos.length;
  if (count === 0) return '';

  var names = _ipPendingPhotos.slice(0, 3).map(function(b) { return b.client_name; }).join(', ');
  var extra = count > 3 ? ' + ' + (count - 3) + ' more' : '';

  return '<div style="' +
    'display:flex;align-items:center;gap:12px;padding:12px 18px;margin-bottom:16px;' +
    'background:linear-gradient(135deg,#FEF2F2,#FFF7ED);border:1px solid #FECACA;border-radius:10px;">' +
    '<div style="width:32px;height:32px;border-radius:50%;background:var(--rose);color:white;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">&#128247;</div>' +
    '<div style="flex:1;">' +
      '<div style="font-size:13px;font-weight:600;color:var(--charcoal);">' + count + ' photo submission' + (count !== 1 ? 's' : '') + ' awaiting review</div>' +
      '<div style="font-size:12px;color:var(--brown);margin-top:2px;">' + names + extra + '</div>' +
    '</div>' +
  '</div>';
}

/* ==========================================================
   TAB SWITCHING
   ========================================================== */

function showClientsTab(tab) {
  // Appointment Slots is hidden for now — send anything that asks for it to In-Person Clients.
  if (tab !== 'inperson' && tab !== 'profiles') tab = 'inperson';
  var btnSlots    = document.getElementById('cst-slots');
  var btnInperson = document.getElementById('cst-inperson');
  var btnProfiles = document.getElementById('cst-profiles');
  var panelSlots    = document.getElementById('clients-slots-panel');
  var panelInperson = document.getElementById('clients-inperson-panel');
  var panelProfiles = document.getElementById('clients-profiles-panel');
  var psub          = document.getElementById('clients-psub');
  var headerActions = document.getElementById('clients-header-actions');

  // Clear all active states
  [btnSlots, btnInperson, btnProfiles].forEach(function(b){ if (b) b.classList.remove('on'); });
  [panelSlots, panelInperson, panelProfiles].forEach(function(p){ if (p) p.style.display = 'none'; });

  if (tab === 'inperson') {
    if (btnInperson)   btnInperson.classList.add('on');
    if (panelInperson) panelInperson.style.display = 'block';
    if (psub) psub.textContent = 'Manage in-person client bookings';
    if (headerActions) headerActions.innerHTML =
      '<button class="btn btnp" onclick="openNewBookingModal()" style="font-size:13px;padding:8px 18px;">+ New Booking</button>';
    renderInPersonList();
  } else if (tab === 'profiles') {
    if (btnProfiles)   btnProfiles.classList.add('on');
    if (panelProfiles) panelProfiles.style.display = 'block';
    if (psub) psub.textContent = 'Client colour profiles — season results, session history, notes';
    if (headerActions) headerActions.innerHTML = '';
    renderCRMPage();
  } else {
    if (btnSlots)   btnSlots.classList.add('on');
    if (panelSlots) panelSlots.style.display = 'block';
    if (psub) psub.textContent = 'Manage your appointment slots and client bookings';
    if (headerActions) headerActions.innerHTML = '';
  }
}

function renderInPersonTab() {
  var btnInperson = document.getElementById('cst-inperson');
  if (btnInperson && btnInperson.classList.contains('on')) {
    renderInPersonList();
  }
}

/* ==========================================================
   LIST VIEW  (month tiles + slim weekly list, auto status)
   ========================================================== */

var _ipAllBookings = [];

async function renderInPersonList() {
  var panel = document.getElementById('clients-inperson-panel');
  if (!panel) return;

  panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">Loading bookings...</div>';

  var db = getSupa();
  if (!db) {
    panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--rose);">Database not available</div>';
    return;
  }

  var { data, error } = await db
    .from('in_person_bookings')
    .select('*, in_person_persons(id)')
    .order('appointment_date', { ascending: false });

  if (error) {
    panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--rose);">Error loading bookings: ' + error.message + '</div>';
    return;
  }

  _ipAllBookings = data || [];
  ipRenderFilteredList('');
}

/* ── Month tiles + slim weekly list ─────────────────────────
   Status is automatic: appointment date before today = Done,
   today or later = Upcoming. */
var ipSelMonth = null;       // 'YYYY-MM'
var ipStatusFilt = 'all';    // all | upcoming | done
var ipSearchQ = '';

function ipBookingDate(b) {
  var s = b.appointment_date || b.created_at;
  if (!s) return new Date();
  // appointment_date is a plain date — parse as local, not UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  return new Date(s);
}
function ipMonthKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function ipAutoStatus(b) {
  var t = new Date(); t.setHours(0, 0, 0, 0);
  return ipBookingDate(b) < t ? 'done' : 'upcoming';
}
function ipPersons(b) { return b.in_person_persons ? b.in_person_persons.length : 0; }

function ipSetMonth(k) { ipSelMonth = k; ipRenderFilteredList(ipSearchQ); }
function ipSetStatusFilt(f) { ipStatusFilt = f; ipRenderFilteredList(ipSearchQ); }

function ipInjectStyles() {
  if (document.getElementById('ip-list-styles')) return;
  var st = document.createElement('style'); st.id = 'ip-list-styles';
  st.textContent =
    '.ip-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin:0 0 22px}' +
    '.ip-tile{background:white;border:1px solid var(--sand);border-radius:12px;padding:12px 14px;cursor:pointer;transition:border-color .15s}' +
    '.ip-tile:hover{border-color:var(--brown)}' +
    '.ip-tile .y{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);font-weight:700}' +
    '.ip-tile .m{font-family:Fraunces,serif;font-size:20px;color:var(--deep);margin:2px 0 6px}' +
    '.ip-tile .n{font-size:12px;color:var(--deep);font-weight:600}.ip-tile .p{font-size:11px;color:var(--muted)}' +
    '.ip-tile.on{background:var(--deep);border-color:var(--deep)}.ip-tile.on .y,.ip-tile.on .m,.ip-tile.on .n,.ip-tile.on .p{color:white}' +
    '.ip-tile.empty{opacity:.45;cursor:default}.ip-tile.empty:hover{border-color:var(--sand)}' +
    '.ip-tile.now .y:after{content:" · now";color:var(--rose)}' +
    '.ip-seg{display:flex;background:white;border:1px solid var(--sand);border-radius:999px;padding:3px}' +
    '.ip-seg button{border:none;background:none;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;font-family:inherit}' +
    '.ip-seg button.on{background:var(--deep);color:white}' +
    '.ip-list{background:white;border:1px solid var(--sand);border-radius:12px;overflow:hidden;margin-bottom:18px}' +
    '.ip-wk{padding:9px 18px;background:var(--cream);font-size:10px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:var(--muted);border-top:1px solid var(--sand)}' +
    '.ip-wk:first-child{border-top:none}' +
    '.ip-row{display:grid;grid-template-columns:56px 34px minmax(0,1fr) 130px 90px 96px 14px;gap:12px;align-items:center;padding:11px 18px;border-top:1px solid #EFE9E2;font-size:13px;cursor:pointer}' +
    '.ip-wk + .ip-row{border-top:none}.ip-row:hover{background:#FBF8F5}' +
    '.ip-d{font-weight:700;color:var(--deep);line-height:1.1;font-size:15px}.ip-d small{display:block;font-size:10px;color:var(--muted);font-weight:600;letter-spacing:.8px;text-transform:uppercase}' +
    '.ip-av{width:30px;height:30px;border-radius:50%;color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}' +
    '.ip-nm{font-weight:600;color:var(--deep);min-width:0}.ip-nm div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ip-nm small{display:block;font-size:11px;color:var(--muted);font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.ip-mut{color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.ip-pill{font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;justify-self:start}' +
    '.ip-pill.done{background:#E3F1EA;color:#2F7D5B}.ip-pill.upcoming{background:#FBF0D9;color:#9A6B12}' +
    '.ip-mh{font-family:Fraunces,serif;font-size:18px;color:var(--deep);margin:4px 0 10px}' +
    '@media (max-width:760px){.ip-tiles{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px}.ip-tile{flex:0 0 112px;scroll-snap-align:start}.ip-row{grid-template-columns:44px 30px minmax(0,1fr) 80px}.ip-row .ip-type,.ip-row .ip-ppl,.ip-row .ip-chev{display:none}}';
  document.head.appendChild(st);
}

function ipRenderFilteredList(query) {
  var panel = document.getElementById('clients-inperson-panel');
  if (!panel) return;
  ipInjectStyles();
  ipSearchQ = query || '';
  var q = ipSearchQ.toLowerCase().trim();

  // ── Month summary (all bookings) ──
  var byMonth = {};
  _ipAllBookings.forEach(function(b) {
    var k = ipMonthKey(ipBookingDate(b));
    if (!byMonth[k]) byMonth[k] = { n: 0, ppl: 0 };
    byMonth[k].n++; byMonth[k].ppl += ipPersons(b);
  });
  var nowKey = ipMonthKey(new Date());
  var keys = Object.keys(byMonth).sort();
  var tiles = [];
  if (keys.length) {
    // Every month from the earliest booking to the later of (latest booking, this month), newest first
    var last = keys[keys.length - 1] > nowKey ? keys[keys.length - 1] : nowKey;
    var cur = keys[0].split('-').map(Number);
    while (true) {
      var k = cur[0] + '-' + String(cur[1]).padStart(2, '0');
      tiles.unshift(k);
      if (k >= last) break;
      cur[1]++; if (cur[1] > 12) { cur[1] = 1; cur[0]++; }
    }
  }
  if (!ipSelMonth || !byMonth[ipSelMonth]) {
    // Default: this month if it has bookings, else the latest month that does
    ipSelMonth = byMonth[nowKey] ? nowKey : (keys[keys.length - 1] || null);
  }

  var html = ipGetInPersonBanner();

  if (!_ipAllBookings.length) {
    panel.innerHTML = html + '<div style="padding:40px;text-align:center;"><div style="color:var(--muted);font-size:14px;margin-bottom:12px;">No in-person bookings yet</div>' +
      '<button class="btn btnp" onclick="openNewBookingModal()" style="font-size:13px;padding:8px 18px;">+ New Booking</button></div>';
    return;
  }

  // ── Month tiles ──
  html += '<div class="ip-tiles">';
  tiles.forEach(function(k) {
    var p = k.split('-'), d = new Date(+p[0], +p[1] - 1, 1);
    var info = byMonth[k];
    var cls = 'ip-tile' + (info ? '' : ' empty') + (k === ipSelMonth && !q ? ' on' : '') + (k === nowKey ? ' now' : '');
    html += '<div class="' + cls + '"' + (info ? ' onclick="ipSearchQ=\'\';ipSetMonth(\'' + k + '\')"' : '') + '>'
      + '<div class="y">' + p[0] + '</div>'
      + '<div class="m">' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + '</div>'
      + '<div class="n">' + (info ? info.n + ' booking' + (info.n !== 1 ? 's' : '') : 'No bookings') + '</div>'
      + '<div class="p">' + (info ? info.ppl + ' ' + (info.ppl === 1 ? 'person' : 'people') : '&nbsp;') + '</div>'
      + '</div>';
  });
  html += '</div>';

  // ── Which bookings to show ──
  var list = _ipAllBookings.filter(function(b) {
    if (q) {
      var hay = ((b.client_name || '') + ' ' + (b.client_email || '') + ' ' + (b.appointment_type || '') + ' ' + (b.notes || '')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    } else if (ipMonthKey(ipBookingDate(b)) !== ipSelMonth) return false;
    if (ipStatusFilt !== 'all' && ipAutoStatus(b) !== ipStatusFilt) return false;
    return true;
  }).sort(function(a, b) { return ipBookingDate(b) - ipBookingDate(a); });

  // ── Header: title, search, status filter ──
  var title;
  if (q) title = list.length + ' result' + (list.length !== 1 ? 's' : '') + ' for “' + esc(ipSearchQ.trim()) + '”';
  else { var sp = ipSelMonth.split('-'); title = new Date(+sp[0], +sp[1] - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }); }
  var segBtn = function(v, l) { return '<button class="' + (ipStatusFilt === v ? 'on' : '') + '" onclick="ipSetStatusFilt(\'' + v + '\')">' + l + '</button>'; };
  html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">'
    + '<div style="font-family:Fraunces,serif;font-size:20px;color:var(--deep);flex:1;min-width:160px">' + title + '</div>'
    + '<input type="text" id="ip-search-input" placeholder="Search all clients…" value="' + esc(ipSearchQ) + '" oninput="ipRenderFilteredList(this.value)"'
    +   ' style="padding:8px 12px;border:1px solid var(--sand);border-radius:8px;width:240px;max-width:100%;font-size:13px;background:white;font-family:inherit">'
    + '<div class="ip-seg">' + segBtn('all', 'All') + segBtn('upcoming', 'Upcoming') + segBtn('done', 'Done') + '</div>'
    + '</div>';

  if (!list.length) {
    html += '<div style="padding:40px 20px;text-align:center;color:var(--muted);font-size:13px;border:1px dashed var(--sand);border-radius:12px">'
      + (q ? 'No clients match your search.' : 'No ' + (ipStatusFilt === 'all' ? '' : ipStatusFilt + ' ') + 'bookings this month.') + '</div>';
    panel.innerHTML = html;
    ipRestoreSearchFocus(q);
    return;
  }

  // ── Rows grouped by (month when searching) → week ──
  var groups = [], gIdx = {};
  list.forEach(function(b) {
    var d = ipBookingDate(b);
    var mk = ipMonthKey(d);
    var mon = ipWeekStart(d);
    var wk = mon.getFullYear() + '-' + (mon.getMonth() + 1) + '-' + mon.getDate();
    var gk = (q ? mk + '|' : '') + wk;
    if (!gIdx[gk]) {
      var sun = new Date(mon); sun.setDate(sun.getDate() + 6);
      gIdx[gk] = { mk: mk, label: ipShortDate(mon) + ' – ' + ipShortDate(sun), items: [] };
      groups.push(gIdx[gk]);
    }
    gIdx[gk].items.push(b);
  });

  var curMonth = null, open = false;
  groups.forEach(function(g) {
    if (q && g.mk !== curMonth) {
      if (open) html += '</div>';
      var mp = g.mk.split('-');
      html += '<div class="ip-mh">' + new Date(+mp[0], +mp[1] - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) + '</div><div class="ip-list">';
      curMonth = g.mk; open = true;
    } else if (!open) { html += '<div class="ip-list">'; open = true; }
    html += '<div class="ip-wk">Week of ' + g.label + ' · ' + g.items.length + '</div>';
    g.items.forEach(function(b) {
      var d = ipBookingDate(b), st = ipAutoStatus(b), n = ipPersons(b);
      html += '<div class="ip-row" onclick="showBookingDetail(\'' + b.id + '\')">'
        + '<div class="ip-d">' + d.getDate() + '<small>' + d.toLocaleDateString('en-AU', { weekday: 'short' }) + '</small></div>'
        + '<div class="ip-av" style="background:' + ipInitialsColor(b.client_name) + '">' + ipInitials(b.client_name) + '</div>'
        + '<div class="ip-nm"><div>' + esc(b.client_name || 'Unnamed') + '</div>' + (b.client_email ? '<small>' + esc(b.client_email) + '</small>' : '') + '</div>'
        + '<div class="ip-mut ip-type">' + esc(b.appointment_type || '—') + '</div>'
        + '<div class="ip-mut ip-ppl">' + n + ' ' + (n === 1 ? 'person' : 'people') + '</div>'
        + '<span class="ip-pill ' + st + '">' + (st === 'done' ? 'Done' : 'Upcoming') + '</span>'
        + '<div class="ip-mut ip-chev">›</div>'
        + '</div>';
    });
  });
  if (open) html += '</div>';

  panel.innerHTML = html;
  panel.querySelectorAll('img').forEach(function(img) { ipFixHeicImg(img); });
  ipRestoreSearchFocus(q);
}

function ipRestoreSearchFocus(q) {
  if (!q) return;
  var inp = document.getElementById('ip-search-input');
  if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
}

/* Get Monday of the week for a given date */
function ipWeekStart(d) {
  var dt = new Date(d);
  var day = dt.getDay();
  var diff = (day === 0 ? -6 : 1) - day; // Monday = 1
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0,0,0,0);
  return dt;
}

/* Short date like "30 Mar" */
function ipShortDate(d) {
  return d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
}

/* Toggle any collapsible section (month or week) */
function ipToggleSection(key) {
  var el = document.getElementById('ip-sec-' + key);
  var chevron = document.getElementById('ip-chev-' + key);
  if (!el) return;
  if (el.style.display === 'none') {
    el.style.display = el.dataset.displayMode || 'block';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  } else {
    el.dataset.displayMode = el.style.display || 'block';
    el.style.display = 'none';
    if (chevron) chevron.style.transform = 'rotate(-90deg)';
  }
}

/* Initials from name */
function ipInitials(name) {
  if (!name) return '?';
  var parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

/* Deterministic colour from name */
function ipInitialsColor(name) {
  var colours = ['#E05555','#5578E0','#42A85F','#D4853B','#8B5CF6','#E0559B','#0EA5A9','#6366F1','#CA8A04','#DC2626'];
  var hash = 0;
  var s = name || '';
  for (var i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return colours[Math.abs(hash) % colours.length];
}

/* ==========================================================
   DETAIL VIEW
   ========================================================== */

async function showBookingDetail(bookingId) {
  var panel = document.getElementById('clients-inperson-panel');
  if (!panel) return;

  panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">Loading booking...</div>';

  var db = getSupa();
  if (!db) return;

  var { data: booking, error: bErr } = await db
    .from('in_person_bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (bErr || !booking) {
    panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--rose);">Booking not found</div>';
    return;
  }

  var { data: persons, error: pErr } = await db
    .from('in_person_persons')
    .select('*')
    .eq('booking_id', bookingId)
    .order('sort_order', { ascending: true });

  if (pErr) persons = [];

  var statusOpts = '';
  for (var s = 0; s < IP_STATUSES.length; s++) {
    statusOpts += '<option value="' + IP_STATUSES[s] + '"' +
      (booking.status === IP_STATUSES[s] ? ' selected' : '') + '>' +
      IP_STATUSES[s].charAt(0).toUpperCase() + IP_STATUSES[s].slice(1) + '</option>';
  }

  var html =
    '<div style="padding:8px 0;">' +
      /* header row */
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<button class="btn btns" onclick="renderInPersonList()" style="font-size:12px;padding:6px 12px;">← Back</button>' +
          '<div>' +
            '<div style="font-weight:600;font-size:17px;color:var(--charcoal);">' + (booking.client_name || 'Unnamed') + '</div>' +
            '<div style="font-size:12px;color:var(--muted);">' + (booking.client_email || '') + ' · ' + ipFormatDate(booking.appointment_date) + '</div>' +
            (booking.media_consent ? '<div style="font-size:11px;margin-top:4px;"><span style="padding:2px 8px;border-radius:10px;background:' + (booking.media_consent === 'none' ? 'var(--rose)' : booking.media_consent === 'photos_only' ? 'var(--gold)' : 'var(--green)') + ';color:white;font-size:10px;font-weight:600;">' + (booking.media_consent === 'photos_and_video' ? 'Consents: Photos & Video' : booking.media_consent === 'photos_only' ? 'Consents: Photos Only' : 'No Media Consent') + '</span></div>' : '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<select onchange="ipUpdateStatus(\'' + bookingId + '\', this.value)"' +
          ' style="font-size:12px;padding:6px 12px;border-radius:8px;border:1px solid var(--sand);background:var(--warm);color:var(--brown);cursor:pointer;">' +
            statusOpts +
          '</select>' +
          '<button class="btn" onclick="ipDeleteBooking(\'' + bookingId + '\')"' +
          ' style="font-size:12px;padding:6px 12px;color:var(--rose);border:1px solid var(--rose);">Delete</button>' +
        '</div>' +
      '</div>' +

      /* persons grid */
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
        '<div style="font-size:13px;font-weight:600;color:var(--brown);">People (' + (persons ? persons.length : 0) + ')</div>' +
        '<button class="btn btnp" onclick="ipAddGuest(\'' + bookingId + '\')" style="font-size:12px;padding:6px 14px;">+ Add Guest</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;">';

  for (var p = 0; p < persons.length; p++) {
    var person = persons[p];
    var cl = ipContrastLevel(person.skin_value, person.hair_value, person.eyes_value);
    var photoThumb = person.photo_url
      ? '<div style="position:relative;width:48px;height:48px;flex-shrink:0;">' +
          '<img id="ip-thumb-' + p + '" src="' + person.photo_url + '" style="width:48px;height:48px;border-radius:8px;object-fit:cover;filter:grayscale(100%);" />' +
          '<div onclick="event.stopPropagation();ipToggleThumb(' + p + ')" style="position:absolute;bottom:-4px;right:-4px;width:20px;height:20px;border-radius:50%;background:var(--charcoal);color:white;display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer;border:2px solid white;" title="Toggle colour">&#127912;</div>' +
        '</div>'
      : '<div style="width:48px;height:48px;border-radius:8px;background:var(--sand);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--muted);flex-shrink:0;">?</div>';

    html +=
      '<div class="card" style="cursor:pointer;" onclick="showPersonContrast(\'' + person.id + '\',\'' + bookingId + '\')">' +
        '<div class="cb" style="padding:16px;">' +
          '<div style="display:flex;gap:12px;align-items:center;">' +
            photoThumb +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-weight:600;font-size:14px;color:var(--charcoal);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
                (person.name || 'Unnamed') +
                (person.is_primary ? ' <span style="font-size:10px;color:var(--muted);font-weight:400;">(primary)</span>' : '') +
              '</div>' +
              '<div style="display:flex;gap:6px;margin-top:6px;align-items:center;">' +
                '<span style="font-size:11px;padding:3px 8px;border-radius:12px;background:' + ipContrastColor(cl.level) + ';color:white;">' + cl.level + '</span>' +
                (person.season ? '<span style="font-size:11px;color:var(--brown);">' + person.season + '</span>' : '') +
              '</div>' +
            '</div>' +
            '<div style="font-size:12px;color:var(--muted);">Edit →</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  html += '</div></div>';
  panel.innerHTML = html;
}

/* ---------- status & delete ---------- */

async function ipUpdateStatus(bookingId, status) {
  var db = getSupa(); if (!db) return;
  await db.from('in_person_bookings').update({ status: status, updated_at: new Date().toISOString() }).eq('id', bookingId);
  /* Sync to appointment slots when analysed (or re-sync on any status change) */
  ipSyncToSlots();
}

async function ipDeleteBooking(bookingId) {
  if (!confirm('Delete this booking and all associated person data?')) return;
  var db = getSupa(); if (!db) return;
  await db.from('in_person_persons').delete().eq('booking_id', bookingId);
  await db.from('in_person_bookings').delete().eq('id', bookingId);
  renderInPersonList();
  ipSyncToSlots();
}

async function ipAddGuest(bookingId) {
  var name = prompt('Guest name:');
  if (!name) return;
  var db = getSupa(); if (!db) return;

  var { data: existing } = await db.from('in_person_persons').select('sort_order').eq('booking_id', bookingId).order('sort_order', { ascending: false }).limit(1);
  var nextSort = (existing && existing.length > 0 && existing[0].sort_order != null) ? existing[0].sort_order + 1 : 1;

  await db.from('in_person_persons').insert({
    booking_id: bookingId,
    name: name,
    is_primary: false,
    sort_order: nextSort
  });

  showBookingDetail(bookingId);
}

/* ==========================================================
   PER-PERSON CONTRAST ANALYSER  (matches client-page widget)
   ========================================================== */

/* Per-person scoped state (not global) */
var ipCTags = {
  skin: { label:'SKIN', val:5, x:0, y:0,   col:'#E05555' },
  hair: { label:'HAIR', val:3, x:0, y:40,  col:'#5578E0' },
  eyes: { label:'EYES', val:7, x:0, y:80,  col:'#42A85F' }
};
var ipCDragKey = null, ipCDragOX = 0, ipCDragOY = 0;
var ipCPersonId = null, ipCBookingId = null;

async function showPersonContrast(personId, bookingId) {
  var panel = document.getElementById('clients-inperson-panel');
  if (!panel) return;

  var db = getSupa(); if (!db) return;

  var { data: person, error } = await db
    .from('in_person_persons')
    .select('*')
    .eq('id', personId)
    .single();

  if (error || !person) { alert('Person not found'); return; }

  /* Store IDs for drag/save callbacks */
  ipCPersonId = personId;
  ipCBookingId = bookingId;

  /* Reset tag state from DB values */
  ipCTags.skin.val = person.skin_value || 5;
  ipCTags.hair.val = person.hair_value || 5;
  ipCTags.eyes.val = person.eyes_value || 5;
  ipCTags.skin.x = 0; ipCTags.skin.y = 0;
  ipCTags.hair.x = 0; ipCTags.hair.y = 40;
  ipCTags.eyes.x = 0; ipCTags.eyes.y = 80;

  var seasonOpts = '<option value="">— Select Season —</option>';
  for (var s = 0; s < IP_SEASONS.length; s++) {
    seasonOpts += '<option value="' + IP_SEASONS[s] + '"' + (person.season === IP_SEASONS[s] ? ' selected' : '') + '>' + IP_SEASONS[s] + '</option>';
  }

  var html =
    '<div style="padding:8px 0;">' +
      /* back + name */
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">' +
        '<button class="btn btns" onclick="showBookingDetail(\'' + bookingId + '\')" style="font-size:12px;padding:6px 12px;">← Back</button>' +
        '<div style="font-weight:600;font-size:17px;color:var(--charcoal);">' + (person.name || 'Unnamed') + ' — Contrast Analysis</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;" id="ip-contrast-grid">' +

        /* ── LEFT COLUMN: photo preview with draggable tags ── */
        '<div class="card"><div class="ch">' +
          '<div class="ct">Contrast</div>' +
          '<div style="font-size:11px;color:var(--muted)">Drag each tag over the matching feature.</div>' +
          '<div style="display:flex;gap:8px;margin-top:8px;align-items:center">' +
            '<label style="display:inline-flex;align-items:center;gap:6px;background:var(--deep);color:#fff;font-size:11px;font-weight:600;padding:6px 14px;border-radius:8px;cursor:pointer;letter-spacing:.3px">' +
              '<span>&#128247;</span> Upload Photo' +
              '<input type="file" accept="image/*" id="ip-photo-input" style="display:none" onchange="ipUploadPhoto(this.files[0],\'' + personId + '\',\'' + bookingId + '\')">' +
            '</label>' +
            '<button onclick="ipClearPhoto(\'' + personId + '\',\'' + bookingId + '\')" style="background:none;border:1px solid var(--sand);color:var(--muted);font-size:11px;padding:5px 12px;border-radius:8px;cursor:pointer">Clear</button>' +
            '<button id="ip-colour-toggle-btn" onclick="ipToggleContrastColour()" style="background:none;border:1px solid var(--sand);color:var(--muted);font-size:11px;padding:5px 12px;border-radius:8px;cursor:pointer">&#127912; View Original</button>' +
          '</div>' +
        '</div><div class="cb">' +
          '<div id="ip-contrast-preview" style="position:relative;width:100%;padding-top:115%;border-radius:8px;overflow:hidden;background:var(--sand)"></div>' +
        '</div></div>' +

        /* ── RIGHT COLUMN: sliders + result ── */
        '<div>' +
          '<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Feature Values</div>' +
          '<div id="ip-contrast-controls"></div>' +
          '<div style="background:var(--warm);border-radius:10px;padding:10px 14px;border:1px solid var(--sand)">' +
            '<div style="font-size:11px;font-weight:600;color:var(--deep);margin-bottom:6px">Contrast Range</div>' +
            '<div id="ip-contrast-result" style="font-size:12px;color:var(--brown);line-height:1.5"></div>' +
          '</div>' +

          /* season */
          '<div style="margin-top:16px;">' +
            '<label style="font-size:12px;font-weight:600;color:var(--brown);display:block;margin-bottom:6px;">SEASON</label>' +
            '<select id="ip-season-select" onchange="ipSaveSeason(\'' + personId + '\',this.value)"' +
            ' style="font-size:13px;padding:8px 12px;border-radius:8px;border:1px solid var(--sand);background:var(--warm);color:var(--brown);width:100%;">' +
              seasonOpts +
            '</select>' +
          '</div>' +

          /* delete */
          '<div style="margin-top:16px;text-align:right;">' +
            '<button class="btn" onclick="ipDeletePerson(\'' + personId + '\',\'' + bookingId + '\')" ' +
            'style="font-size:12px;padding:6px 14px;color:var(--rose);border:1px solid var(--rose);">Delete Person</button>' +
          '</div>' +
        '</div>' +

      '</div>' +
    '</div>';

  panel.innerHTML = html;

  /* Responsive: stack on narrow screens */
  if (window.innerWidth < 700) {
    var grid = document.getElementById('ip-contrast-grid');
    if (grid) grid.style.gridTemplateColumns = '1fr';
  }

  /* Reset colour toggle + render the interactive widget */
  _ipContrastColourOn = false;
  ipRenderContrast(person.photo_url);
}

/* ── Render photo preview + tags + sliders (mirrors renderClientContrast) ── */

function ipRenderContrast(photoUrl) {
  var preview = document.getElementById('ip-contrast-preview');
  var controls = document.getElementById('ip-contrast-controls');
  if (!preview || !controls) return;

  var greyVals = IP_GREY_VALS;
  var clip = 'polygon(0% 0%, 100% 0%, 100% 20%, 75% 20%, 75% 80%, 100% 80%, 100% 100%, 0% 100%)';

  /* Photo */
  var photoHtml = photoUrl
    ? '<img id="ip-contrast-photo" src="'+photoUrl+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;filter:grayscale(100%);display:block;">'
    : '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted);gap:8px"><div style="font-size:32px">&#128247;</div><div style="font-size:13px">Upload a photo above</div></div>';

  /* Draggable tags */
  var tagHtml = Object.keys(ipCTags).map(function(key) {
    var t = ipCTags[key];
    var greyBg = greyVals[t.val - 1].bg;
    var numCol = t.val > 6 ? '#333' : '#fff';
    return '<div id="ip-tag-'+key+'" style="position:absolute;left:'+t.x+'px;top:'+t.y+'px;z-index:10;cursor:move;user-select:none;touch-action:none;display:flex;align-items:center;gap:5px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.35))"'
      +' onmousedown="ipDragStart(event,\''+key+'\')" ontouchstart="ipTouchStart(event,\''+key+'\')">'
      +'<span style="font-size:8px;font-weight:800;color:'+t.col+';letter-spacing:1.5px;text-transform:uppercase;text-shadow:0 1px 3px rgba(0,0,0,0.6);white-space:nowrap;flex-shrink:0">'+t.label+'</span>'
      +'<div id="ip-swatch-'+key+'" style="position:relative;width:80px;height:36px;border-radius:6px 0 0 6px;background:'+greyBg+';clip-path:'+clip+'">'
      +'<div id="ip-num-'+key+'" style="position:absolute;top:50%;left:35%;transform:translate(-50%,-50%);font-size:10px;font-weight:800;color:'+numCol+';pointer-events:none">'+t.val+'</div>'
      +'</div></div>';
  }).join('');

  preview.innerHTML = photoHtml + tagHtml;
  // Fix HEIC display in contrast analyser
    var caImg = preview.querySelector('img');
    if (caImg) ipFixHeicImg(caImg);

  /* Slider controls (card-style, matching existing) */
  controls.innerHTML = Object.keys(ipCTags).map(function(key) {
    var t = ipCTags[key];
    var greyBg = greyVals[t.val - 1].bg;
    return '<div style="background:white;border:1px solid var(--sand);border-radius:10px;padding:14px 16px;margin-bottom:10px">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
      +'<div style="width:14px;height:14px;border-radius:50%;background:'+t.col+';flex-shrink:0"></div>'
      +'<div style="font-size:12px;font-weight:600;color:var(--deep)">'+t.label+'</div>'
      +'<div id="ip-ctrl-swatch-'+key+'" style="margin-left:auto;width:32px;height:20px;border-radius:4px;background:'+greyBg+';border:1px solid var(--sand)"></div>'
      +'<div id="ip-ctrl-num-'+key+'" style="font-size:12px;font-weight:700;color:var(--deep);min-width:16px;text-align:right">'+t.val+'</div>'
      +'</div>'
      +'<input id="ip-slider-'+key+'" type="range" min="1" max="10" value="'+t.val+'" style="width:100%;accent-color:'+t.col+';cursor:pointer" oninput="ipSetVal(\''+key+'\',this.value)">'
      +'<div style="display:flex;justify-content:space-between;margin-top:3px">'
      +'<span style="font-size:9px;color:var(--muted)">Dark 1</span>'
      +'<span style="font-size:9px;color:var(--muted)">Light 10</span>'
      +'</div></div>';
  }).join('');

  ipUpdateResult();
}

/* ── Slider value change ── */

var _ipSaveTimer = null;

function ipSetVal(key, val) {
  val = parseInt(val);
  ipCTags[key].val = val;
  var greyVals = IP_GREY_VALS;
  var greyBg = greyVals[val - 1].bg;
  var numCol = val > 6 ? '#333' : '#fff';

  /* Update tag on photo */
  var sw = document.getElementById('ip-swatch-'+key);
  var nm = document.getElementById('ip-num-'+key);
  var csw = document.getElementById('ip-ctrl-swatch-'+key);
  var cnm = document.getElementById('ip-ctrl-num-'+key);
  if (sw) sw.style.background = greyBg;
  if (nm) { nm.textContent = val; nm.style.color = numCol; }
  if (csw) csw.style.background = greyBg;
  if (cnm) cnm.textContent = val;
  var sl = document.getElementById('ip-slider-' + key);
  if (sl) sl.value = val;

  ipUpdateResult();

  /* Debounced save to DB */
  clearTimeout(_ipSaveTimer);
  _ipSaveTimer = setTimeout(function() {
    ipSaveContrast();
  }, 500);
}

function ipUpdateResult() {
  var vals = Object.keys(ipCTags).map(function(k){ return ipCTags[k].val; });
  var range = Math.max.apply(null,vals) - Math.min.apply(null,vals);
  var level;
  if (range >= 8) level = 'High';
  else if (range >= 6) level = 'Medium-High';
  else if (range >= 4) level = 'Medium';
  else if (range >= 2) level = 'Medium-Low';
  else level = 'Low';
  var t = ipCTags;
  var el = document.getElementById('ip-contrast-result');
  if (el) el.innerHTML = 'Skin: '+t.skin.val+' · Hair: '+t.hair.val+' · Eyes: '+t.eyes.val+'<br>Range: '+Math.min.apply(null,vals)+'–'+Math.max.apply(null,vals)+' ('+range+' steps) — <strong>'+level+' Contrast</strong>';
}

async function ipSaveContrast() {
  if (!ipCPersonId) return;
  var db = getSupa(); if (!db) return;
  var vals = Object.keys(ipCTags).map(function(k){ return ipCTags[k].val; });
  var range = Math.max.apply(null,vals) - Math.min.apply(null,vals);
  var level;
  if (range >= 8) level = 'High';
  else if (range >= 6) level = 'Medium-High';
  else if (range >= 4) level = 'Medium';
  else if (range >= 2) level = 'Medium-Low';
  else level = 'Low';
  await db.from('in_person_persons').update({
    skin_value: ipCTags.skin.val,
    hair_value: ipCTags.hair.val,
    eyes_value: ipCTags.eyes.val,
    contrast_range: range,
    contrast_level: level
  }).eq('id', ipCPersonId);
  /* Keep slots synced when contrast changes */
  ipSyncToSlots();
}

async function ipSaveSeason(personId, season) {
  var db = getSupa(); if (!db) return;
  await db.from('in_person_persons').update({ season: season || null }).eq('id', personId);
}

/* ── Dragging (mouse) ── */

function ipDragStart(e, key) {
  e.preventDefault();
  ipCDragKey = key;
  var el = document.getElementById('ip-tag-'+key);
  var prev = document.getElementById('ip-contrast-preview');
  if (!el || !prev) return;
  var pr = prev.getBoundingClientRect();
  ipCDragOX = e.clientX - pr.left - ipCTags[key].x;
  ipCDragOY = e.clientY - pr.top - ipCTags[key].y;
  document.addEventListener('mousemove', ipDragMove);
  document.addEventListener('mouseup', ipDragEnd);
}
function ipDragMove(e) {
  if (!ipCDragKey) return;
  var prev = document.getElementById('ip-contrast-preview');
  if (!prev) return;
  var pr = prev.getBoundingClientRect();
  var nx = e.clientX - pr.left - ipCDragOX;
  var ny = e.clientY - pr.top - ipCDragOY;
  ipCTags[ipCDragKey].x = nx;
  ipCTags[ipCDragKey].y = ny;
  var el = document.getElementById('ip-tag-'+ipCDragKey);
  if (el) { el.style.left = nx+'px'; el.style.top = ny+'px'; }
}
function ipDragEnd() {
  ipCDragKey = null;
  document.removeEventListener('mousemove', ipDragMove);
  document.removeEventListener('mouseup', ipDragEnd);
}

/* ── Dragging (touch) ── */

function ipTouchStart(e, key) {
  var touch = e.touches[0];
  ipCDragKey = key;
  var prev = document.getElementById('ip-contrast-preview');
  if (!prev) return;
  var pr = prev.getBoundingClientRect();
  ipCDragOX = touch.clientX - pr.left - ipCTags[key].x;
  ipCDragOY = touch.clientY - pr.top - ipCTags[key].y;
  document.addEventListener('touchmove', ipTouchMove, {passive:false});
  document.addEventListener('touchend', ipTouchEnd);
}
function ipTouchMove(e) {
  e.preventDefault();
  if (!ipCDragKey) return;
  var touch = e.touches[0];
  var prev = document.getElementById('ip-contrast-preview');
  if (!prev) return;
  var pr = prev.getBoundingClientRect();
  var nx = touch.clientX - pr.left - ipCDragOX;
  var ny = touch.clientY - pr.top - ipCDragOY;
  ipCTags[ipCDragKey].x = nx;
  ipCTags[ipCDragKey].y = ny;
  var el = document.getElementById('ip-tag-'+ipCDragKey);
  if (el) { el.style.left = nx+'px'; el.style.top = ny+'px'; }
}
function ipTouchEnd() {
  ipCDragKey = null;
  document.removeEventListener('touchmove', ipTouchMove);
  document.removeEventListener('touchend', ipTouchEnd);
}

/* ── Photo upload & clear ── */

async function ipUploadPhoto(file, personId, bookingId) {
  if (!file) return;

  // Convert HEIC to JPEG before uploading
  var fileName = file.name.toLowerCase();
  if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
    try {
      var jpegBlob = await HeicTo({ blob: file, type: 'image/jpeg', quality: 0.85 });
      file = new File([jpegBlob], file.name.replace(/\.heic|\.heif/i, '.jpg'), { type: 'image/jpeg' });
    } catch (heicErr) {
      console.warn('HEIC conversion failed, uploading original:', heicErr);
    }
  }

  // Read file locally for MediaPipe — analysis runs on-device before upload
  var mpDataUrl = await new Promise(function(res) {
    var fr = new FileReader();
    fr.onload  = function(e) { res(e.target.result); };
    fr.onerror = function()  { res(null); };
    fr.readAsDataURL(file);
  });

  var db = getSupa(); if (!db) return;

  var path = 'booking_' + bookingId + '/person_' + personId + '_' + Date.now() + '.jpg';

  var { data, error } = await db.storage.from('in-person-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) { alert('Upload failed: ' + error.message); return; }

  var { data: urlData } = db.storage.from('in-person-photos').getPublicUrl(path);
  var photoUrl = urlData ? urlData.publicUrl : '';

  await db.from('in_person_persons').update({
    photo_path: path,
    photo_url: photoUrl
  }).eq('id', personId);

  await showPersonContrast(personId, bookingId);

  // Auto-detect contrast from local file data (photo stays on device)
  if (mpDataUrl && typeof mpAnalyzeContrast === 'function') {
    var ctn = document.getElementById('ip-contrast-preview');
    if (ctn && ctn.offsetWidth) {
      mpShowLoading(ctn);
      var result = await mpAnalyzeContrast(mpDataUrl, ctn);
      mpHideLoading(document.getElementById('ip-contrast-preview'));
      if (result) ipApplyAutoContrast(result);
    }
  }
}

function ipApplyAutoContrast(result) {
  ['skin', 'hair', 'eyes'].forEach(function(key) {
    var r = result[key];
    ipCTags[key].x = r.x;
    ipCTags[key].y = r.y;
    var tagEl = document.getElementById('ip-tag-' + key);
    if (tagEl) { tagEl.style.left = r.x + 'px'; tagEl.style.top = r.y + 'px'; }
    ipSetVal(key, r.val);
  });
  // Rebuild controls so range sliders reflect new values
  var controls = document.getElementById('ip-contrast-controls');
  if (controls) {
    var clip = 'polygon(0% 0%, 100% 0%, 100% 20%, 75% 20%, 75% 80%, 100% 80%, 100% 100%, 0% 100%)';
    controls.innerHTML = Object.keys(ipCTags).map(function(key) {
      var t = ipCTags[key];
      var gb = IP_GREY_VALS[t.val - 1].bg;
      return '<div style="background:white;border:1px solid var(--sand);border-radius:10px;padding:14px 16px;margin-bottom:10px">'
        + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
        + '<div style="width:14px;height:14px;border-radius:50%;background:' + t.col + ';flex-shrink:0"></div>'
        + '<div style="font-size:12px;font-weight:600;color:var(--deep)">' + t.label + '</div>'
        + '<div id="ip-ctrl-swatch-' + key + '" style="margin-left:auto;width:32px;height:20px;border-radius:4px;background:' + gb + ';border:1px solid var(--sand)"></div>'
        + '<div id="ip-ctrl-num-' + key + '" style="font-size:12px;font-weight:700;color:var(--deep);min-width:16px;text-align:right">' + t.val + '</div>'
        + '</div>'
        + '<input type="range" min="1" max="10" value="' + t.val + '" style="width:100%;accent-color:' + t.col + ';cursor:pointer" oninput="ipSetVal(\'' + key + '\',this.value)">'
        + '<div style="display:flex;justify-content:space-between;margin-top:3px">'
        + '<span style="font-size:9px;color:var(--muted)">Dark 1</span>'
        + '<span style="font-size:9px;color:var(--muted)">Light 10</span>'
        + '</div></div>';
    }).join('');
  }
  ipUpdateResult();
  ipSaveContrast();
}

function ipClearPhoto(personId, bookingId) {
  var inp = document.getElementById('ip-photo-input');
  if (inp) inp.value = '';
  ipRenderContrast(null);
}

/* ── Colour/Greyscale toggles ── */

/* Toggle thumbnail on booking detail person cards */
function ipToggleThumb(idx) {
  var img = document.getElementById('ip-thumb-' + idx);
  if (!img) return;
  var isGrey = img.style.filter && img.style.filter.indexOf('grayscale') !== -1;
  img.style.filter = isGrey ? 'none' : 'grayscale(100%)';
}

/* Toggle contrast analyser main photo */
var _ipContrastColourOn = false;
function ipToggleContrastColour() {
  var img = document.getElementById('ip-contrast-photo');
  if (!img) return;
  _ipContrastColourOn = !_ipContrastColourOn;
  img.style.filter = _ipContrastColourOn ? 'none' : 'grayscale(100%)';
  var btn = document.getElementById('ip-colour-toggle-btn');
  if (btn) btn.innerHTML = _ipContrastColourOn ? '&#127912; View Greyscale' : '&#127912; View Original';
}

/* ── Delete person ── */

async function ipDeletePerson(personId, bookingId) {
  if (!confirm('Delete this person?')) return;
  var db = getSupa(); if (!db) return;
  await db.from('in_person_persons').delete().eq('id', personId);
  showBookingDetail(bookingId);
}

/* ==========================================================
   NEW BOOKING MODAL
   ========================================================== */

function openNewBookingModal() {
  /* Remove existing modal if any */
  var old = document.getElementById('ip-booking-modal');
  if (old) old.remove();

  var modal = document.createElement('div');
  modal.id = 'ip-booking-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  var today = new Date().toISOString().split('T')[0];

  modal.innerHTML =
    '<div style="background:var(--cream);border-radius:16px;padding:28px 32px;width:90%;max-width:420px;box-shadow:0 12px 40px rgba(0,0,0,0.15);">' +
      '<div style="font-weight:700;font-size:17px;color:var(--charcoal);margin-bottom:20px;">New In-Person Booking</div>' +
      '<div style="margin-bottom:14px;">' +
        '<label style="font-size:12px;font-weight:600;color:var(--brown);display:block;margin-bottom:4px;">Client Name</label>' +
        '<input type="text" id="ip-new-name" placeholder="Full name"' +
        ' style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--sand);font-size:14px;background:white;box-sizing:border-box;" />' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
        '<label style="font-size:12px;font-weight:600;color:var(--brown);display:block;margin-bottom:4px;">Client Email</label>' +
        '<input type="email" id="ip-new-email" placeholder="email@example.com"' +
        ' style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--sand);font-size:14px;background:white;box-sizing:border-box;" />' +
      '</div>' +
      '<div style="margin-bottom:20px;">' +
        '<label style="font-size:12px;font-weight:600;color:var(--brown);display:block;margin-bottom:4px;">Appointment Date</label>' +
        '<input type="date" id="ip-new-date" value="' + today + '"' +
        ' style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--sand);font-size:14px;background:white;box-sizing:border-box;" />' +
      '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
        '<button class="btn btns" onclick="document.getElementById(\'ip-booking-modal\').remove()" style="font-size:13px;padding:8px 18px;">Cancel</button>' +
        '<button class="btn btnp" onclick="ipSaveNewBooking()" style="font-size:13px;padding:8px 18px;">Create Booking</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
  setTimeout(function() {
    var nameInput = document.getElementById('ip-new-name');
    if (nameInput) nameInput.focus();
  }, 100);
}

async function ipSaveNewBooking() {
  var name = (document.getElementById('ip-new-name').value || '').trim();
  var email = (document.getElementById('ip-new-email').value || '').trim();
  var date = document.getElementById('ip-new-date').value;

  if (!name) { alert('Please enter a client name'); return; }
  if (!date) { alert('Please select a date'); return; }

  var db = getSupa(); if (!db) return;

  var { data: booking, error: bErr } = await db
    .from('in_person_bookings')
    .insert({
      client_name: name,
      client_email: email,
      appointment_date: date,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (bErr || !booking) {
    alert('Failed to create booking: ' + (bErr ? bErr.message : 'unknown error'));
    return;
  }

  /* Auto-create primary person */
  await db.from('in_person_persons').insert({
    booking_id: booking.id,
    name: name,
    is_primary: true,
    sort_order: 0,
    created_at: new Date().toISOString()
  });

  /* Close modal, refresh */
  var modal = document.getElementById('ip-booking-modal');
  if (modal) modal.remove();

  renderInPersonList();
}

/* ==========================================================
   SYNC TO APPOINTMENT SLOTS TABLE
   When a booking is marked "analysed", populate the
   corresponding cRows entry so it appears on the
   Appointment Slots tab in date order.
   ========================================================== */

var IP_CON_MAP = {
  'Low': 'Low',
  'Medium-Low': 'Low/Med',
  'Medium': 'Med',
  'Medium-High': 'Med/High',
  'High': 'High'
};

function ipMapContrast(level) {
  return IP_CON_MAP[level] || '—';
}

function ipDayOfWeek(dateStr) {
  if (!dateStr) return '—';
  var d = new Date(dateStr);
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return days[d.getDay()] || '—';
}

async function ipSyncToSlots() {
  var db = getSupa(); if (!db) return;

  /* Fetch all analysed/complete bookings with their people */
  var { data: bookings, error } = await db
    .from('in_person_bookings')
    .select('*, in_person_persons(*)')
    .in('status', ['analysed', 'complete'])
    .order('appointment_date', { ascending: true });

  if (error || !bookings) return;

  /* Ensure cRows exists (it's global from app.js) */
  if (typeof cRows === 'undefined') return;

  /* 1. Preserve manually-set fields (type, inv, notes) from previously synced rows */
  var preserved = {};
  for (var c = 0; c < cRows.length; c++) {
    if (cRows[c]._ipBookingId) {
      preserved[cRows[c]._ipBookingId] = {
        type: cRows[c].type || '',
        inv: cRows[c].inv || '',
        notes: cRows[c].notes || ''
      };
    }
  }

  /* 2. Collect manual entries (rows with data that aren't synced) */
  var manualRows = [];
  for (var m = 0; m < cRows.length; m++) {
    if (cRows[m].name && !cRows[m]._ipBookingId) {
      manualRows.push(JSON.parse(JSON.stringify(cRows[m])));
    }
  }

  /* 3. Build in-person booking rows */
  var ipRows = [];
  for (var b = 0; b < bookings.length; b++) {
    var bk = bookings[b];
    var persons = bk.in_person_persons || [];

    var primary = null;
    var guests = [];
    for (var p = 0; p < persons.length; p++) {
      if (persons[p].is_primary) primary = persons[p];
      else guests.push(persons[p]);
    }
    if (!primary && persons.length > 0) primary = persons[0];

    var primaryCon = primary ? ipMapContrast(primary.contrast_level) : '—';

    var atts = [];
    for (var g = 0; g < guests.length; g++) {
      atts.push({
        name: guests[g].name || '',
        con: ipMapContrast(guests[g].contrast_level)
      });
    }

    var prev = preserved[bk.id] || {};

    ipRows.push({
      name: bk.client_name || '',
      day: ipDayOfWeek(bk.appointment_date),
      date: bk.appointment_date || '',
      type: bk.appointment_type || prev.type || '—',
      con: primaryCon,
      atts: atts,
      inv: prev.inv || '',
      notes: prev.notes || '',
      _ipBookingId: bk.id
    });

    /* Update client_slot in DB (will set final value after sort) */
  }

  /* 4. Merge manual + in-person rows, sort by date */
  var allRows = manualRows.concat(ipRows);
  var withDate = [];
  var noDate = [];
  for (var i = 0; i < allRows.length; i++) {
    if (allRows[i].date) withDate.push(allRows[i]);
    else noDate.push(allRows[i]);
  }
  withDate.sort(function(a, b) {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  });
  var sorted = withDate.concat(noDate);

  /* 5. Rebuild cRows: sorted entries first, then empty rows */
  for (var s = 0; s < 30; s++) {
    if (s < sorted.length) {
      cRows[s] = sorted[s];
    } else {
      cRows[s] = { name:'', day:'', date:'', type:'', con:'', atts:[], inv:'', notes:'' };
    }
  }

  /* 6. Update client_slot in DB for synced rows */
  for (var sl = 0; sl < cRows.length; sl++) {
    if (cRows[sl]._ipBookingId) {
      db.from('in_person_bookings').update({ client_slot: sl + 1 }).eq('id', cRows[sl]._ipBookingId);
    }
  }

  /* Re-render slots table and save */
  if (typeof renderClients === 'function') renderClients();
  if (typeof debouncedSave === 'function') debouncedSave();
}
