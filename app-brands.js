// ═══════════════════════════════════════════════════
// APP — BRANDS CHART
// One row per brand in the app: status, ShopMy commission, what's pulled, issues.
// Stored in appData.brands (saved with the rest of appData via saveData()).
// Seeded once from the "Your SZN brand websites" sheet (app-brands-seed.js).
// ═══════════════════════════════════════════════════

var APP_BRAND_STATUS = {
  live:    { label: 'Live in app',  color: '#2F7D5B', bg: '#E3F1EA' },
  confirm: { label: 'To confirm',   color: '#9A6B12', bg: '#FBF0D9' },
  fix:     { label: 'Needs fixing', color: '#B4412F', bg: '#F9E3DE' },
  paused:  { label: 'Paused',       color: '#6B6259', bg: '#EDE8E2' }
};
var APP_BRAND_STATUS_ORDER = ['live', 'confirm', 'fix', 'paused'];
var APP_BRAND_SECTIONS = { 'new-arrivals': 'New Arrivals', 'best-sellers': 'Best Sellers', 'all': 'All' };
var APP_BRAND_TIERS = ['Budget / affordable', 'High street / accessible', 'Mid-market', 'Mid-range contemporary',
  'Premium everyday', 'Premium contemporary', 'Luxury / designer'];

var appBrandFilter = { q: '', status: 'all', cat: 'all', comm: 'all' };
var appBrandSort   = { key: 'status', dir: 1 };
var editingAppBrandId = null;

function _appBrandsEnsure() {
  if (!Array.isArray(appData.brands)) {
    appData.brands = (typeof APP_BRANDS_SEED !== 'undefined')
      ? JSON.parse(JSON.stringify(APP_BRANDS_SEED)) : [];
    if (window._cloudDataLoaded) saveData();
  }
}

function _appBrandCategories() {
  var set = {};
  appData.brands.forEach(function(b) { (b.categories || []).forEach(function(c) { set[c] = 1; }); });
  return Object.keys(set).sort();
}

function _appBrandCommLabel(b) {
  if (b.affiliate === 'none') return '<span style="color:var(--muted)">No affiliate</span>';
  if (b.affiliate === 'shopmy') {
    return '<span style="font-weight:700;color:var(--deep)">' + (b.rate !== '' && b.rate != null ? esc(b.rate) + '%' : '—') + '</span>'
      + '<span style="font-size:10px;color:var(--muted);margin-left:5px">ShopMy</span>';
  }
  if (b.affiliate === 'other') {
    return '<span style="font-weight:700;color:var(--deep)">' + (b.rate !== '' && b.rate != null ? esc(b.rate) + '%' : '—') + '</span>'
      + '<span style="font-size:10px;color:var(--muted);margin-left:5px">' + esc(b.affiliateName || 'Other') + '</span>';
  }
  return '<button onclick="openAppBrandModal(\'' + b.id + '\')" style="background:none;border:1px dashed var(--sand);border-radius:6px;padding:2px 8px;font-size:11px;color:var(--muted);cursor:pointer">+ Add</button>';
}

function _appBrandFmtDate(iso) {
  if (!iso) return '';
  var p = iso.split('-');
  var m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1] - 1] || '';
  return (+p[2]) + ' ' + m + ' ' + p[0].slice(2);
}

function appBrandSetFilter(k, v) { appBrandFilter[k] = v; renderAppBrandsChartTab(); }
function appBrandSearch(v) {
  appBrandFilter.q = v;
  renderAppBrandsTable();
}
function appBrandSortBy(key) {
  if (appBrandSort.key === key) appBrandSort.dir *= -1; else { appBrandSort.key = key; appBrandSort.dir = 1; }
  renderAppBrandsTable();
}

function appBrandSetStatus(id, status) {
  var b = appData.brands.find(function(x) { return x.id === id; }); if (!b) return;
  b.status = status;
  if (status === 'live' && !b.dateAdded) b.dateAdded = ymdLocal(new Date());
  saveData(); renderAppBrandsChartTab();
}
function appBrandRemove(id) {
  var b = appData.brands.find(function(x) { return x.id === id; }); if (!b) return;
  if (!confirm('Remove ' + b.name + ' from the brands chart?')) return;
  appData.brands = appData.brands.filter(function(x) { return x.id !== id; });
  saveData(); renderAppBrandsChartTab();
}

function _appBrandFiltered() {
  var f = appBrandFilter, q = f.q.trim().toLowerCase();
  var list = appData.brands.filter(function(b) {
    if (f.status !== 'all' && b.status !== f.status) return false;
    if (f.cat !== 'all' && (b.categories || []).indexOf(f.cat) < 0) return false;
    if (f.comm === 'shopmy' && b.affiliate !== 'shopmy') return false;
    if (f.comm === 'none' && b.affiliate !== 'none') return false;
    if (f.comm === 'unset' && b.affiliate) return false;
    if (f.comm === 'issues' && !b.issues) return false;
    if (q && (b.name + ' ' + (b.website || '') + ' ' + (b.categories || []).join(' ') + ' ' + (b.notes || '') + ' ' + (b.issues || '')).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  var k = appBrandSort.key, d = appBrandSort.dir;
  list.sort(function(a, b) {
    var va, vb;
    if (k === 'status') { va = APP_BRAND_STATUS_ORDER.indexOf(a.status); vb = APP_BRAND_STATUS_ORDER.indexOf(b.status); }
    else if (k === 'rate') {
      va = a.affiliate === 'none' ? -1 : (a.rate === '' || a.rate == null ? -2 : +a.rate);
      vb = b.affiliate === 'none' ? -1 : (b.rate === '' || b.rate == null ? -2 : +b.rate);
      return (vb - va) * d || a.name.localeCompare(b.name);
    }
    else if (k === 'date') { va = a.dateAdded || ''; vb = b.dateAdded || ''; return (va < vb ? 1 : va > vb ? -1 : 0) * d || a.name.localeCompare(b.name); }
    else { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
    return (va < vb ? -1 : va > vb ? 1 : 0) * d || a.name.localeCompare(b.name);
  });
  return list;
}

function renderAppBrandsChartTab() {
  var el = document.getElementById('app-brands-content'); if (!el) return;
  if (typeof appData === 'undefined') return;
  _appBrandsEnsure();
  _appBrandInjectModal();

  var all = appData.brands;
  var count = function(s) { return all.filter(function(b) { return b.status === s; }).length; };
  var shop = all.filter(function(b) { return b.affiliate === 'shopmy' && b.rate !== '' && b.rate != null; });
  var avg = shop.length ? (shop.reduce(function(s, b) { return s + (+b.rate || 0); }, 0) / shop.length) : null;
  var noAff = all.filter(function(b) { return b.affiliate === 'none'; }).length;
  var issues = all.filter(function(b) { return b.issues; }).length;

  var stat = function(num, label, onclick, color) {
    return '<div onclick="' + onclick + '" style="cursor:pointer;background:white;border:1px solid var(--sand);border-radius:12px;padding:12px 16px;min-width:0">'
      + '<div style="font-size:22px;font-weight:700;color:' + (color || 'var(--deep)') + ';line-height:1.1">' + num + '</div>'
      + '<div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-top:4px">' + label + '</div>'
      + '</div>';
  };
  var summary = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:18px">'
    + stat(count('live'), 'Live in app', "appBrandSetFilter('status','live')", APP_BRAND_STATUS.live.color)
    + stat(count('confirm'), 'To confirm', "appBrandSetFilter('status','confirm')", APP_BRAND_STATUS.confirm.color)
    + stat(avg == null ? '—' : (Math.round(avg * 10) / 10) + '%', 'Avg ShopMy rate', "appBrandSetFilter('comm','shopmy')")
    + stat(noAff, 'No affiliate', "appBrandSetFilter('comm','none')")
    + stat(issues, 'With issues', "appBrandSetFilter('comm','issues')", issues ? APP_BRAND_STATUS.fix.color : null)
    + '</div>';

  var f = appBrandFilter;
  var chip = function(val, label) {
    var on = f.status === val;
    var n = val === 'all' ? all.length : count(val);
    return '<button class="vt-tab' + (on ? ' on' : '') + '" onclick="appBrandSetFilter(\'status\',\'' + val + '\')" style="padding:6px 14px;font-size:12px">'
      + label + ' <span style="opacity:.6;font-weight:600">' + n + '</span></button>';
  };
  var cats = _appBrandCategories();
  var sel = 'style="padding:7px 10px;border:1px solid var(--sand);border-radius:8px;background:white;font-size:12px;color:var(--deep);font-family:inherit"';
  var toolbar = '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:12px">'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
    +   chip('all', 'All') + chip('live', 'Live') + chip('confirm', 'To confirm') + chip('fix', 'Needs fixing') + chip('paused', 'Paused')
    + '</div>'
    + '<button class="btn btnp" onclick="openAppBrandModal(null)">+ Add Brand</button>'
    + '</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px">'
    +   '<input id="app-brand-q" placeholder="Search brands…" value="' + esc(f.q) + '" oninput="appBrandSearch(this.value)" '
    +     'style="flex:1;min-width:180px;padding:8px 12px;border:1px solid var(--sand);border-radius:8px;font-size:13px;background:white;font-family:inherit">'
    +   '<select ' + sel + ' onchange="appBrandSetFilter(\'cat\',this.value)"><option value="all">All categories</option>'
    +     cats.map(function(c) { return '<option' + (f.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('')
    +   '</select>'
    +   '<select ' + sel + ' onchange="appBrandSetFilter(\'comm\',this.value)">'
    +     [['all', 'All commission'], ['shopmy', 'ShopMy'], ['none', 'No affiliate'], ['unset', 'Commission not set'], ['issues', 'Has issues']]
            .map(function(o) { return '<option value="' + o[0] + '"' + (f.comm === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('')
    +   '</select>'
    +   ((f.status !== 'all' || f.cat !== 'all' || f.comm !== 'all' || f.q)
          ? '<button onclick="appBrandFilter={q:\'\',status:\'all\',cat:\'all\',comm:\'all\'};renderAppBrandsChartTab()" style="background:none;border:none;color:var(--muted);font-size:12px;cursor:pointer;text-decoration:underline">Clear</button>' : '')
    + '</div>';

  el.innerHTML = summary + toolbar + '<div id="app-brands-table"></div>';
  renderAppBrandsTable();
}

function renderAppBrandsTable() {
  var el = document.getElementById('app-brands-table'); if (!el) return;
  var list = _appBrandFiltered();
  var arrow = function(k) { return appBrandSort.key === k ? (appBrandSort.dir > 0 ? ' ↑' : ' ↓') : ''; };
  var th = function(label, key, extra) {
    return '<th ' + (key ? 'onclick="appBrandSortBy(\'' + key + '\')" ' : '') + 'style="text-align:left;padding:10px 12px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);white-space:nowrap;border-bottom:1px solid var(--sand);' + (key ? 'cursor:pointer;' : '') + (extra || '') + '">' + label + (key ? arrow(key) : '') + '</th>';
  };

  if (!list.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:40px 20px;text-align:center;border:1px dashed var(--sand);border-radius:12px">No brands match these filters.</div>';
    return;
  }

  var rows = list.map(function(b) {
    var st = APP_BRAND_STATUS[b.status] || APP_BRAND_STATUS.confirm;
    var cats = (b.categories || []).map(function(c) {
      return '<span style="display:inline-block;font-size:10px;padding:2px 7px;border-radius:5px;background:var(--cream);color:var(--deep);margin:0 4px 3px 0;white-space:nowrap">' + esc(c) + '</span>';
    }).join('');
    var secs = (b.sections || []).map(function(s) { return APP_BRAND_SECTIONS[s] || s; }).join(' · ');
    var statusSel = '<select onchange="appBrandSetStatus(\'' + b.id + '\',this.value)" style="appearance:none;-webkit-appearance:none;border:none;cursor:pointer;font-family:inherit;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;color:' + st.color + ';background:' + st.bg + '">'
      + APP_BRAND_STATUS_ORDER.map(function(k) { return '<option value="' + k + '"' + (k === b.status ? ' selected' : '') + '>' + APP_BRAND_STATUS[k].label + '</option>'; }).join('')
      + '</select>';
    var quick = b.status === 'confirm'
      ? '<button title="Mark live" onclick="appBrandSetStatus(\'' + b.id + '\',\'live\')" style="border:1px solid #B9DCC9;background:#E3F1EA;color:#2F7D5B;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer">✓ Live</button>'
        + '<button title="Remove" onclick="appBrandRemove(\'' + b.id + '\')" style="border:1px solid var(--sand);background:white;color:var(--muted);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer">✕</button>'
      : '';
    var site = b.website
      ? '<a href="https://' + esc(b.website.replace(/^https?:\/\//, '')) + '" target="_blank" rel="noopener" style="font-size:11px;color:var(--muted);text-decoration:none">' + esc(b.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) + ' ↗</a>'
      : '';
    var td = 'style="padding:10px 12px;border-bottom:1px solid var(--sand);vertical-align:top"';
    return '<tr>'
      + '<td ' + td + '><div style="font-weight:700;color:var(--deep);font-size:13px">' + esc(b.name) + '</div>' + site + '</td>'
      + '<td ' + td + '>' + cats + '</td>'
      + '<td ' + td + '>' + statusSel + '</td>'
      + '<td ' + td.replace('vertical-align:top', 'vertical-align:top;white-space:nowrap') + '>' + _appBrandCommLabel(b) + '</td>'
      + '<td ' + td + '><span style="font-size:11px;color:var(--deep)">' + esc(secs) + '</span></td>'
      + '<td ' + td.replace('vertical-align:top', 'vertical-align:top;white-space:nowrap') + '><span style="font-size:11px;color:var(--muted)">' + _appBrandFmtDate(b.dateAdded) + '</span></td>'
      + '<td ' + td + '>'
      +   (b.issues ? '<div style="font-size:11px;color:#B4412F;line-height:1.35">⚠ ' + esc(b.issues) + '</div>' : '')
      +   (b.notes ? '<div style="font-size:11px;color:var(--muted);line-height:1.35;margin-top:' + (b.issues ? '3px' : '0') + '">' + esc(b.notes) + '</div>' : '')
      + '</td>'
      + '<td ' + td.replace('vertical-align:top', 'vertical-align:top;white-space:nowrap;text-align:right') + '>'
      +   '<div style="display:inline-flex;gap:5px;align-items:center">' + quick
      +   '<button class="fin-row-edit" onclick="openAppBrandModal(\'' + b.id + '\')">Edit</button></div>'
      + '</td>'
      + '</tr>';
  }).join('');

  el.innerHTML = '<div style="font-size:11px;color:var(--muted);margin-bottom:8px">Showing ' + list.length + ' of ' + appData.brands.length + ' brands</div>'
    + '<div style="background:white;border:1px solid var(--sand);border-radius:12px;overflow-x:auto">'
    + '<table style="width:100%;border-collapse:collapse;min-width:900px">'
    + '<thead><tr style="background:var(--cream)">'
    +   th('Brand', 'name') + th('Category') + th('Status', 'status') + th('Commission', 'rate')
    +   th('Pulled') + th('Added', 'date') + th('Issues / notes', null, 'width:26%') + th('')
    + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

// ── Add / edit modal ─────────────────────────────────
function _appBrandInjectModal() {
  if (document.getElementById('app-brand-modal')) return;
  var inp = 'class="sm-inp"';
  var html = '<div id="app-brand-modal" style="display:none;position:fixed;inset:0;background:rgba(28,23,18,.55);z-index:600;align-items:center;justify-content:center;padding:20px">'
    + '<div class="sm-modal" style="max-width:560px;width:100%;max-height:90vh;overflow-y:auto">'
    + '<button onclick="closeAppBrandModal()" class="sm-modal-x">&#215;</button>'
    + '<div id="abm-heading" class="sm-modal-title">New Brand</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    +   '<div class="sm-field"><label class="sm-lbl">Brand *</label><input id="abm-name" ' + inp + ' placeholder="e.g. Sol Sana"></div>'
    +   '<div class="sm-field"><label class="sm-lbl">Website</label><input id="abm-website" ' + inp + ' placeholder="solsana.com"></div>'
    + '</div>'
    + '<div class="sm-field" style="position:relative"><label class="sm-lbl">Categories</label>'
    +   '<div id="abm-cats-btn" onclick="_abmCatToggle(event)" class="sm-inp" style="cursor:pointer;display:flex;flex-wrap:wrap;gap:5px;align-items:center;min-height:42px;padding-right:30px;position:relative"></div>'
    +   '<div id="abm-cats-panel" onclick="event.stopPropagation()" style="display:none;position:absolute;left:0;right:0;top:100%;margin-top:4px;background:white;border:1px solid var(--sand);border-radius:10px;box-shadow:0 10px 30px rgba(28,23,18,.15);z-index:10;padding:8px">'
    +     '<div id="abm-cats-list" style="max-height:220px;overflow-y:auto"></div>'
    +     '<div style="display:flex;gap:6px;border-top:1px solid var(--sand);padding-top:8px;margin-top:6px">'
    +       '<input id="abm-cat-new" placeholder="Add new category…" onkeydown="if(event.key===\'Enter\'){event.preventDefault();_abmCatAdd();}" style="flex:1;padding:7px 10px;border:1px solid var(--sand);border-radius:7px;font-size:13px;font-family:inherit">'
    +       '<button type="button" onclick="_abmCatAdd()" class="btn btnp" style="padding:6px 12px;font-size:12px">Add</button>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    +   '<div class="sm-field"><label class="sm-lbl">Status</label><select id="abm-status" ' + inp + '>'
    +     APP_BRAND_STATUS_ORDER.map(function(k) { return '<option value="' + k + '">' + APP_BRAND_STATUS[k].label + '</option>'; }).join('')
    +   '</select></div>'
    +   '<div class="sm-field"><label class="sm-lbl">Date added</label><input id="abm-date" type="date" ' + inp + '></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    +   '<div class="sm-field"><label class="sm-lbl">Affiliate</label><select id="abm-aff" ' + inp + ' onchange="_appBrandAffChange()">'
    +     '<option value="">Not set yet</option><option value="shopmy">ShopMy</option><option value="none">No affiliate</option><option value="other">Other</option>'
    +   '</select></div>'
    +   '<div class="sm-field" id="abm-rate-wrap"><label class="sm-lbl">Commission %</label><input id="abm-rate" type="number" min="0" max="100" step="0.5" ' + inp + ' placeholder="e.g. 10"></div>'
    + '</div>'
    + '<div class="sm-field" id="abm-affname-wrap" style="display:none"><label class="sm-lbl">Affiliate name</label><input id="abm-affname" ' + inp + ' placeholder="e.g. Rakuten, direct code"></div>'
    + '<div class="sm-field"><label class="sm-lbl">Sections pulled</label><div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px">'
    +   Object.keys(APP_BRAND_SECTIONS).map(function(k) {
          return '<label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" class="abm-sec" value="' + k + '"> ' + APP_BRAND_SECTIONS[k] + '</label>';
        }).join('')
    + '</div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    +   '<div class="sm-field"><label class="sm-lbl">Origin</label><input id="abm-origin" ' + inp + ' placeholder="e.g. Sydney, AUS"></div>'
    +   '<div class="sm-field"><label class="sm-lbl">Price tier</label><input id="abm-tier" ' + inp + ' list="abm-tier-list"><datalist id="abm-tier-list">'
    +     APP_BRAND_TIERS.map(function(t) { return '<option value="' + t + '">'; }).join('') + '</datalist></div>'
    + '</div>'
    + '<div class="sm-field"><label class="sm-lbl">Issues</label><input id="abm-issues" ' + inp + ' placeholder="e.g. can\'t change to AUD"></div>'
    + '<div class="sm-field"><label class="sm-lbl">Notes</label><textarea id="abm-notes" ' + inp + ' rows="2" style="resize:vertical;font-family:inherit"></textarea></div>'
    + '<div id="abm-err" style="color:#EF4444;font-size:12px;min-height:16px"></div>'
    + '<div style="display:flex;gap:10px;margin-top:12px;align-items:center">'
    +   '<button class="btn btnp" onclick="saveAppBrandModal()">Save Brand</button>'
    +   '<button class="btn btns" onclick="closeAppBrandModal()">Cancel</button>'
    +   '<button id="abm-del" class="btn" style="display:none;margin-left:auto;background:#FEE2E2;color:#EF4444;border:none" onclick="deleteAppBrandFromModal()">Delete</button>'
    + '</div>'
    + '</div></div>';
  var wrap = document.createElement('div'); wrap.innerHTML = html;
  document.body.appendChild(wrap.firstChild);
}

function _appBrandAffChange() {
  var v = document.getElementById('abm-aff').value;
  document.getElementById('abm-rate-wrap').style.visibility = (v === 'shopmy' || v === 'other') ? 'visible' : 'hidden';
  document.getElementById('abm-affname-wrap').style.display = v === 'other' ? 'block' : 'none';
}

// ── Category multi-select ──
var abmCats = [];       // selected in the open modal
var abmExtraCats = [];  // new categories typed in this modal, not yet on any brand

function _abmAllCats() {
  var set = {};
  _appBrandCategories().concat(abmExtraCats, abmCats).forEach(function(c) { set[c] = 1; });
  return Object.keys(set).sort(function(a, b) { return a.localeCompare(b); });
}

function _abmCatRender() {
  var btn = document.getElementById('abm-cats-btn'); if (!btn) return;
  btn.innerHTML = (abmCats.length
      ? abmCats.map(function(c, i) {
          return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 6px 3px 9px;border-radius:6px;background:var(--cream);color:var(--deep)">' + esc(c)
            + '<span onclick="event.stopPropagation();_abmCatToggleOne(' + i + ',true)" style="cursor:pointer;opacity:.55;font-size:14px;line-height:1">&#215;</span></span>';
        }).join('')
      : '<span style="color:var(--muted);font-size:13px">Select categories…</span>')
    + '<span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:10px;color:var(--muted)">&#9662;</span>';
  var list = document.getElementById('abm-cats-list');
  var keepScroll = list.scrollTop;
  list.innerHTML = _abmAllCats().map(function(c) {
    var on = abmCats.indexOf(c) > -1;
    return '<label style="display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:6px;cursor:pointer;font-size:13px;color:var(--deep);' + (on ? 'background:var(--cream);' : '') + '">'
      + '<input type="checkbox" ' + (on ? 'checked ' : '') + 'onchange="_abmCatSet(this.dataset.cat,this.checked)" data-cat="' + esc(c) + '"> ' + esc(c) + '</label>';
  }).join('') || '<div style="font-size:12px;color:var(--muted);padding:8px">No categories yet — add one below.</div>';
  list.scrollTop = keepScroll;
}

function _abmCatSet(cat, on) {
  var i = abmCats.indexOf(cat);
  if (on && i < 0) abmCats.push(cat);
  if (!on && i > -1) abmCats.splice(i, 1);
  _abmCatRender();
}
function _abmCatToggleOne(idx) { abmCats.splice(idx, 1); _abmCatRender(); }

function _abmCatAdd() {
  var inp = document.getElementById('abm-cat-new');
  var v = inp.value.trim(); if (!v) return;
  var existing = _abmAllCats().find(function(c) { return c.toLowerCase() === v.toLowerCase(); });
  var cat = existing || v;
  if (!existing) abmExtraCats.push(cat);
  if (abmCats.indexOf(cat) < 0) abmCats.push(cat);
  inp.value = '';
  _abmCatRender();
  inp.focus();
}

function _abmCatToggle(e) {
  if (e) e.stopPropagation();
  var p = document.getElementById('abm-cats-panel');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}
document.addEventListener('click', function() {
  var p = document.getElementById('abm-cats-panel');
  if (p) p.style.display = 'none';
});

function openAppBrandModal(id) {
  _appBrandInjectModal();
  editingAppBrandId = id;
  var b = id ? appData.brands.find(function(x) { return x.id === id; }) : null;
  var $ = function(i) { return document.getElementById(i); };
  $('abm-heading').textContent = b ? 'Edit ' + b.name : 'New Brand';
  $('abm-name').value    = b ? b.name : '';
  $('abm-website').value = b ? (b.website || '') : '';
  abmCats = b ? (b.categories || []).slice() : (appBrandFilter.cat !== 'all' ? [appBrandFilter.cat] : []);
  abmExtraCats = [];
  $('abm-cats-panel').style.display = 'none';
  $('abm-cat-new').value = '';
  _abmCatRender();
  $('abm-status').value  = b ? b.status : 'live';
  $('abm-date').value    = b ? (b.dateAdded || '') : ymdLocal(new Date());
  $('abm-aff').value     = b ? (b.affiliate || '') : 'shopmy';
  $('abm-rate').value    = b ? (b.rate == null ? '' : b.rate) : '';
  $('abm-affname').value = b ? (b.affiliateName || '') : '';
  $('abm-origin').value  = b ? (b.origin || '') : '';
  $('abm-tier').value    = b ? (b.tier || '') : '';
  $('abm-issues').value  = b ? (b.issues || '') : '';
  $('abm-notes').value   = b ? (b.notes || '') : '';
  document.querySelectorAll('.abm-sec').forEach(function(c) { c.checked = !!(b && (b.sections || []).indexOf(c.value) > -1); });
  $('abm-del').style.display = b ? 'inline-block' : 'none';
  $('abm-err').textContent = '';
  _appBrandAffChange();
  $('app-brand-modal').style.display = 'flex';
  setTimeout(function() { (b ? $('abm-rate') : $('abm-name')).focus(); }, 80);
}
function closeAppBrandModal() { var m = document.getElementById('app-brand-modal'); if (m) m.style.display = 'none'; }

function saveAppBrandModal() {
  var $ = function(i) { return document.getElementById(i); };
  var name = $('abm-name').value.trim();
  if (!name) { $('abm-err').textContent = 'Brand name is required.'; return; }
  var dupe = appData.brands.find(function(x) { return x.name.toLowerCase() === name.toLowerCase() && x.id !== editingAppBrandId; });
  if (dupe) { $('abm-err').textContent = name + ' is already in the chart.'; return; }
  var aff = $('abm-aff').value;
  var rate = $('abm-rate').value.trim();
  var obj = {
    id: editingAppBrandId || ('b' + Date.now()),
    name: name,
    website: $('abm-website').value.trim().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
    categories: abmCats.slice(),
    status: $('abm-status').value,
    dateAdded: $('abm-date').value,
    affiliate: aff,
    affiliateName: aff === 'other' ? $('abm-affname').value.trim() : '',
    rate: (aff === 'shopmy' || aff === 'other') ? rate : '',
    sections: Array.prototype.slice.call(document.querySelectorAll('.abm-sec:checked')).map(function(c) { return c.value; }),
    origin: $('abm-origin').value.trim(),
    tier: $('abm-tier').value.trim(),
    issues: $('abm-issues').value.trim(),
    notes: $('abm-notes').value.trim()
  };
  if (editingAppBrandId) {
    var i = appData.brands.findIndex(function(x) { return x.id === editingAppBrandId; });
    if (i > -1) appData.brands[i] = obj;
  } else {
    appData.brands.push(obj);
  }
  closeAppBrandModal(); saveData(); renderAppBrandsChartTab();
}

function deleteAppBrandFromModal() {
  var b = appData.brands.find(function(x) { return x.id === editingAppBrandId; }); if (!b) return;
  if (!confirm('Delete ' + b.name + ' from the brands chart?')) return;
  appData.brands = appData.brands.filter(function(x) { return x.id !== editingAppBrandId; });
  closeAppBrandModal(); saveData(); renderAppBrandsChartTab();
}
