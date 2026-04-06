// ═══════════════════════════════════════════════════════════════
// IVOREY SUBMISSIONS — Google Sheets CSV + Supabase Overrides
// ═══════════════════════════════════════════════════════════════

var ivoreyData = [];
var ivoreyOverrides = {};  // keyed by email
var ivoreySort = { col: 2, asc: false }; // default: Photo Submission date, newest first
var ivoreySearch = '';
var ivoreyLoading = false;
var ivoreySentCollapsed = true; // sent section collapsed by default

var IVOREY_CSV_URL = 'https://docs.google.com/spreadsheets/d/1j06xazCUHPFtfw9fcmU5cv8TvF3brvK_fMP2zHep1YY/gviz/tq?tqx=out:csv&gid=0';

var IVOREY_COLS = [
  'Full Name', 'Email', 'Photo Submission', 'PAID?',
  'Photos confirmed as good to analyse?', 'Assumed season?',
  'Status', 'Date sent', 'Season', 'Notes'
];

var IVOREY_PAID_OPTIONS = ['', 'Paid', 'Yes', 'No', 'Sale'];
var IVOREY_PHOTOS_OPTIONS = ['', 'Pending', 'YES', 'NO', 'Waiting on new'];
var IVOREY_STATUS_OPTIONS = ['', 'Started', 'Complete', 'In Document', 'Sent to Client'];
var IVOREY_SEASON_OPTIONS = [
  '', 'Light Spring', 'True Spring', 'Bright Spring',
  'Light Summer', 'True Summer', 'Soft Summer',
  'Soft Autumn', 'True Autumn', 'Dark Autumn',
  'Dark Winter', 'True Winter', 'Bright Winter'
];

// ── CSV Parsing ─────────────────────────────────────────────

function ivoreyParseCSV(text) {
  var rows = [];
  var current = '';
  var inQuotes = false;
  var row = [];

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
        row.push(current.trim());
        current = '';
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
          rows.push(row);
        }
        row = [];
      } else {
        current += ch;
      }
    }
  }
  row.push(current.trim());
  if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
    rows.push(row);
  }
  return rows;
}

// ── Load Supabase overrides ─────────────────────────────────

async function ivoreyLoadOverrides() {
  var db = getSupa();
  if (!db) return;
  try {
    var res = await db.from('ivorey_overrides').select('*');
    if (res.error) throw res.error;
    ivoreyOverrides = {};
    (res.data || []).forEach(function(row) {
      ivoreyOverrides[row.email.toLowerCase().trim()] = row;
    });
  } catch(e) {
    console.warn('Failed to load ivorey overrides:', e);
  }
}

// ── Save single override field ──────────────────────────────

async function ivoreySaveField(email, field, value) {
  var db = getSupa();
  if (!db) return;
  var key = email.toLowerCase().trim();
  try {
    var existing = ivoreyOverrides[key];
    if (existing) {
      var update = { updated_at: new Date().toISOString() };
      update[field] = value;
      await db.from('ivorey_overrides').update(update).eq('id', existing.id);
      existing[field] = value;
    } else {
      var insert = { email: key, updated_at: new Date().toISOString() };
      insert[field] = value;
      var res = await db.from('ivorey_overrides').insert(insert).select().single();
      if (res.error) throw res.error;
      ivoreyOverrides[key] = res.data;
    }
  } catch(e) {
    console.warn('Failed to save ivorey override:', e);
    alert('Failed to save. Please try again.');
  }
}

// ── Get effective value (override > CSV) ────────────────────

function ivoreyGetVal(row, colIndex, field) {
  var email = (row[1] || '').toLowerCase().trim();
  var override = ivoreyOverrides[email];
  if (override && override[field] !== null && override[field] !== undefined && override[field] !== '') {
    return override[field];
  }
  return row[colIndex] || '';
}

// ── Fetch Data ──────────────────────────────────────────────

function ivoreyFetchData(cb) {
  ivoreyLoading = true;
  renderIvoreySubmissions();

  Promise.all([
    fetch(IVOREY_CSV_URL).then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }),
    ivoreyLoadOverrides()
  ])
  .then(function(results) {
    var text = results[0];
    var rows = ivoreyParseCSV(text);
    if (rows.length > 0) {
      rows.shift();
    }
    ivoreyData = rows.map(function(r) {
      while (r.length < 10) r.push('');
      return r;
    });
    ivoreyLoading = false;
    if (cb) cb();
    renderIvoreySubmissions();
  })
  .catch(function(err) {
    ivoreyLoading = false;
    console.error('Ivorey fetch error:', err);
    var panel = document.getElementById('oca-content');
    if (panel) {
      panel.innerHTML =
        '<div class="cwrap" style="padding:40px;text-align:center;">' +
        '<p style="color:#c44;font-weight:600;">Failed to load Ivorey submissions</p>' +
        '<p style="color:#888;font-size:13px;margin-top:8px;">' + (err.message || 'Unknown error') + '</p>' +
        '<button class="btn btnp" onclick="ivoreyFetchData()" style="margin-top:16px;">Retry</button>' +
        '</div>';
    }
  });
}

// ── Badge Helpers ───────────────────────────────────────────

function ivoreyPaidBadge(val) {
  var v = (val || '').toLowerCase().trim();
  if (v === 'yes' || v === 'y' || v === 'true' || v === 'paid') {
    return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.3px;color:#44AA66;background:#EDFBF2">Paid</span>';
  }
  if (v === 'no' || v === 'n' || v === 'false' || v === 'unpaid' || v === '') {
    return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.3px;color:#E07020;background:#FFF3EB">Unpaid</span>';
  }
  return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.3px;color:#888;background:#F4F4F4">' + ivoreyEsc(val) + '</span>';
}

function ivoreyPhotoBadge(val) {
  var v = (val || '').toLowerCase().trim();
  if (v === 'yes' || v === 'y' || v === 'true' || v === 'confirmed') {
    return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.3px;color:#44AA66;background:#EDFBF2">Confirmed</span>';
  }
  if (v === 'no' || v === 'n' || v === 'false') {
    return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.3px;color:#c44;background:#FDECEC">No</span>';
  }
  if (v === '' || v === '—' || v === '-') {
    return '<span style="color:#aaa">—</span>';
  }
  return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.3px;color:#888;background:#F4F4F4">' + ivoreyEsc(val) + '</span>';
}

// Traffic light status: Sent=green, Started=red, Complete=orange, In Document=orange, blank=grey
function ivoreyStatusBadge(val) {
  var v = (val || '').toLowerCase().trim();
  var map = {
    'sent to client':  { label: 'Sent to Client', colour: '#fff', bg: '#44AA66' },
    'sent':            { label: 'Sent',            colour: '#fff', bg: '#44AA66' },
    'started':         { label: 'Started',         colour: '#fff', bg: '#CC3333' },
    'complete':        { label: 'Complete',         colour: '#fff', bg: '#E08020' },
    'completed':       { label: 'Complete',         colour: '#fff', bg: '#E08020' },
    'in document':     { label: 'In Document',      colour: '#fff', bg: '#E08020' },
    'pending':         { label: 'Pending',          colour: '#fff', bg: '#CC3333' },
    'in progress':     { label: 'In Progress',      colour: '#fff', bg: '#E08020' },
    'in_progress':     { label: 'In Progress',      colour: '#fff', bg: '#E08020' },
    'new':             { label: 'New',              colour: '#fff', bg: '#CC3333' },
    'waiting':         { label: 'Waiting',          colour: '#fff', bg: '#E08020' },
    'need photos':     { label: 'Need Photos',      colour: '#fff', bg: '#E08020' }
  };
  if (!val || val.trim() === '') return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.3px;color:#888;background:#eee">—</span>';
  var s = map[v] || { label: val, colour: '#fff', bg: '#888' };
  return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.3px;color:' + s.colour + ';background:' + s.bg + '">' + s.label + '</span>';
}

function ivoreySeasonBadge(val) {
  var v = (val || '').toLowerCase().trim();
  var map = {
    'spring':        { colour: '#5A9E3C', bg: '#EFF8EB' },
    'summer':        { colour: '#E07020', bg: '#FFF3EB' },
    'autumn':        { colour: '#B8560F', bg: '#FDF0E6' },
    'fall':          { colour: '#B8560F', bg: '#FDF0E6' },
    'winter':        { colour: '#3366AA', bg: '#EBF0FF' },
    'light spring':  { colour: '#7CB950', bg: '#F2FAEF' },
    'warm spring':   { colour: '#8DAA30', bg: '#F5F9E8' },
    'true spring':   { colour: '#5A9E3C', bg: '#EFF8EB' },
    'bright spring': { colour: '#5A9E3C', bg: '#EFF8EB' },
    'clear spring':  { colour: '#5A9E3C', bg: '#EFF8EB' },
    'light summer':  { colour: '#7799CC', bg: '#EFF4FB' },
    'cool summer':   { colour: '#5577AA', bg: '#EBF0F9' },
    'true summer':   { colour: '#5577AA', bg: '#EBF0F9' },
    'soft summer':   { colour: '#8899AA', bg: '#F0F3F6' },
    'soft autumn':   { colour: '#AA8844', bg: '#FAF4E8' },
    'warm autumn':   { colour: '#CC7722', bg: '#FFF5E6' },
    'true autumn':   { colour: '#CC7722', bg: '#FFF5E6' },
    'deep autumn':   { colour: '#8B4513', bg: '#F8EDE4' },
    'dark autumn':   { colour: '#8B4513', bg: '#F8EDE4' },
    'deep winter':   { colour: '#223366', bg: '#E8ECF4' },
    'dark winter':   { colour: '#223366', bg: '#E8ECF4' },
    'cool winter':   { colour: '#334488', bg: '#EAECF6' },
    'true winter':   { colour: '#334488', bg: '#EAECF6' },
    'clear winter':  { colour: '#2255AA', bg: '#E8EFF8' },
    'bright winter': { colour: '#2255AA', bg: '#E8EFF8' }
  };
  if (!val || val.trim() === '') return '<span style="color:#aaa">—</span>';
  var s = map[v] || { colour: '#666', bg: '#F4F4F4' };
  return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.3px;color:' + s.colour + ';background:' + s.bg + '">' + ivoreyEsc(val) + '</span>';
}

function ivoreyEsc(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Dropdown change handler ─────────────────────────────────

function ivoreyOnDropdown(email, field, selectEl) {
  var val = selectEl.value;
  ivoreySaveField(email, field, val);
  selectEl.style.opacity = '0.6';
  setTimeout(function() { selectEl.style.opacity = '1'; }, 300);
}

// ── Notes save handler ──────────────────────────────────────

var _ivoreyNotesTimer = {};
function ivoreyOnNotes(email, textareaEl) {
  var val = textareaEl.value;
  if (_ivoreyNotesTimer[email]) clearTimeout(_ivoreyNotesTimer[email]);
  _ivoreyNotesTimer[email] = setTimeout(function() {
    ivoreySaveField(email, 'notes', val);
  }, 800);
}

// ── Build dropdown HTML ─────────────────────────────────────

function ivoreyDropdown(email, field, options, currentVal) {
  var safeEmail = ivoreyEsc(email).replace(/'/g, '&#39;');
  var h = '<select onchange="ivoreyOnDropdown(\'' + safeEmail + '\',\'' + field + '\',this)" '
    + 'style="font-size:11px;padding:4px 6px;border-radius:6px;border:1px solid #ddd;background:#fff;'
    + 'cursor:pointer;font-family:inherit;max-width:130px;color:var(--charcoal)">';
  options.forEach(function(opt) {
    var selected = (currentVal || '').toLowerCase().trim() === opt.toLowerCase().trim();
    h += '<option value="' + ivoreyEsc(opt) + '"' + (selected ? ' selected' : '') + '>'
      + (opt === '' ? '—' : ivoreyEsc(opt)) + '</option>';
  });
  h += '</select>';
  return h;
}

// ── Toggle sent section ─────────────────────────────────────

function ivoreyToggleSent() {
  ivoreySentCollapsed = !ivoreySentCollapsed;
  renderIvoreySubmissions();
}

// ── Sorting ─────────────────────────────────────────────────

function ivoreySetSort(col) {
  if (ivoreySort.col === col) {
    ivoreySort.asc = !ivoreySort.asc;
  } else {
    ivoreySort.col = col;
    ivoreySort.asc = true;
  }
  renderIvoreySubmissions();
}

function ivoreySortedData(data) {
  var col = ivoreySort.col;
  var asc = ivoreySort.asc;
  return data.slice().sort(function(a, b) {
    var va, vb;
    if (col === 2) {
      va = ivoreyParseDate(a[col]);
      vb = ivoreyParseDate(b[col]);
    } else {
      va = (a[col] || '').toLowerCase();
      vb = (b[col] || '').toLowerCase();
    }
    if (va < vb) return asc ? -1 : 1;
    if (va > vb) return asc ? 1 : -1;
    return 0;
  });
}

function ivoreyParseDate(str) {
  if (!str) return 0;
  var parts = str.split('/');
  if (parts.length === 3) {
    var d = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    return new Date(y, m - 1, d).getTime() || 0;
  }
  return new Date(str).getTime() || 0;
}

// ── Summary Stats ───────────────────────────────────────────

function ivoreyGetStats(data) {
  var total = data.length;
  var sent = 0;
  var complete = 0;
  var pending = 0;
  var paid = 0;

  data.forEach(function(r) {
    var statusVal = ivoreyGetVal(r, 6, 'status').toLowerCase().trim();
    var paidVal = ivoreyGetVal(r, 3, 'paid').toLowerCase().trim();

    if (statusVal === 'sent to client' || statusVal === 'sent') sent++;
    if (statusVal === 'complete' || statusVal === 'completed') complete++;
    if (statusVal === 'pending' || statusVal === 'new' || statusVal === '' ||
        statusVal === 'waiting' || statusVal === 'need photos' ||
        statusVal === 'in progress' || statusVal === 'in_progress' || statusVal === 'started') pending++;
    if (paidVal === 'yes' || paidVal === 'y' || paidVal === 'true' || paidVal === 'paid' || paidVal === 'sale') paid++;
  });

  return { total: total, sent: sent, complete: complete, pending: pending, paid: paid };
}

// ── Render a single table row ───────────────────────────────

function ivoreyRenderRow(r, ri, isSent) {
  var email = (r[1] || '').toLowerCase().trim();
  var paidVal = ivoreyGetVal(r, 3, 'paid');
  var photosVal = ivoreyGetVal(r, 4, 'photos_confirmed');
  var assumedVal = ivoreyGetVal(r, 5, 'assumed_season');
  var statusVal = ivoreyGetVal(r, 6, 'status');
  var seasonVal = ivoreyGetVal(r, 8, 'season');
  var notesVal = ivoreyGetVal(r, 9, 'notes');

  var rowStyle = 'border-bottom:1px solid ' + (isSent ? '#b6e2c4' : '#f0f0f0') + ';';
  if (isSent) {
    rowStyle += 'opacity:0.55;';
  } else if (ri % 2 !== 0) {
    rowStyle += 'background:#FDFDFB;';
  }

  var h = '<tr style="' + rowStyle + '">';

  // Full Name
  h += '<td style="padding:10px 12px;font-weight:600;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + ivoreyEsc(r[0]) + '">' + ivoreyEsc(r[0]) + '</td>';

  // Email
  h += '<td style="padding:10px 12px;color:#666;font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + ivoreyEsc(r[1]) + '">' + ivoreyEsc(r[1]) + '</td>';

  // Photo Submission date
  h += '<td style="padding:10px 12px;white-space:nowrap;font-size:12px;">' + (r[2] ? ivoreyEsc(r[2]) : '<span style="color:#aaa">—</span>') + '</td>';

  // PAID? — dropdown
  h += '<td style="padding:10px 12px;">' + ivoreyDropdown(email, 'paid', IVOREY_PAID_OPTIONS, paidVal) + '</td>';

  // Photos OK? — dropdown
  h += '<td style="padding:10px 12px;">' + ivoreyDropdown(email, 'photos_confirmed', IVOREY_PHOTOS_OPTIONS, photosVal) + '</td>';

  // Assumed Season — dropdown
  h += '<td style="padding:10px 12px;">' + ivoreyDropdown(email, 'assumed_season', IVOREY_SEASON_OPTIONS, assumedVal) + '</td>';

  // Status — dropdown
  h += '<td style="padding:10px 12px;">' + ivoreyDropdown(email, 'status', IVOREY_STATUS_OPTIONS, statusVal) + '</td>';

  // Date sent
  h += '<td style="padding:10px 12px;white-space:nowrap;font-size:12px;">' + (r[7] ? ivoreyEsc(r[7]) : '<span style="color:#aaa">—</span>') + '</td>';

  // Season (confirmed) — dropdown
  h += '<td style="padding:10px 12px;">' + ivoreyDropdown(email, 'season', IVOREY_SEASON_OPTIONS, seasonVal) + '</td>';

  // Notes — textarea
  var safeEmail = ivoreyEsc(email).replace(/'/g, '&#39;');
  h += '<td style="padding:6px 8px;">'
    + '<textarea onchange="ivoreyOnNotes(\'' + safeEmail + '\',this)" oninput="ivoreyOnNotes(\'' + safeEmail + '\',this)" '
    + 'style="width:100%;min-width:140px;min-height:28px;max-height:80px;font-size:11px;padding:6px 8px;'
    + 'border-radius:6px;border:1px solid #ddd;resize:vertical;font-family:inherit;background:#fff;color:var(--charcoal)"'
    + ' placeholder="Add notes…">' + ivoreyEsc(notesVal) + '</textarea>'
    + '</td>';

  h += '</tr>';
  return h;
}

// ── Render ──────────────────────────────────────────────────

function renderIvoreySubmissions() {
  var panel = document.getElementById('oca-content');
  if (!panel) return;

  if (ivoreyLoading) {
    panel.innerHTML =
      '<div class="cwrap" style="padding:60px;text-align:center;">' +
      '<div style="display:inline-block;width:32px;height:32px;border:3px solid #ddd;border-top-color:#5588DD;border-radius:50%;animation:spin 0.8s linear infinite"></div>' +
      '<p style="color:#888;margin-top:12px;font-size:13px;">Loading Ivorey submissions…</p>' +
      '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>' +
      '</div>';
    return;
  }

  if (ivoreyData.length === 0) {
    panel.innerHTML =
      '<div class="cwrap" style="padding:40px;text-align:center;">' +
      '<p style="color:#888;">No submissions loaded</p>' +
      '<button class="btn btnp" onclick="ivoreyFetchData()" style="margin-top:12px;">Load Submissions</button>' +
      '</div>';
    return;
  }

  // Filter by search
  var filtered = ivoreyData;
  if (ivoreySearch) {
    var q = ivoreySearch.toLowerCase();
    filtered = ivoreyData.filter(function(r) {
      return r.some(function(cell) {
        return (cell || '').toLowerCase().indexOf(q) !== -1;
      });
    });
  }

  // Sort
  var sorted = ivoreySortedData(filtered);

  // Separate active vs sent
  var activeRows = [];
  var sentRows = [];
  sorted.forEach(function(r) {
    var sv = ivoreyGetVal(r, 6, 'status').toLowerCase().trim();
    if (sv === 'sent to client' || sv === 'sent') {
      sentRows.push(r);
    } else {
      activeRows.push(r);
    }
  });

  // Stats
  var stats = ivoreyGetStats(ivoreyData);

  // Build HTML
  var h = '';

  // Summary cards
  h += '<div class="csumrow" style="margin-bottom:20px;">';
  h += '<div class="csum"><div style="font-size:22px;font-weight:700;color:var(--charcoal)">' + stats.total + '</div><div style="font-size:11px;color:#888;margin-top:2px">Total</div></div>';
  h += '<div class="csum"><div style="font-size:22px;font-weight:700;color:#44AA66">' + stats.paid + '</div><div style="font-size:11px;color:#888;margin-top:2px">Paid</div></div>';
  h += '<div class="csum"><div style="font-size:22px;font-weight:700;color:#5588DD">' + stats.sent + '</div><div style="font-size:11px;color:#888;margin-top:2px">Sent</div></div>';
  h += '<div class="csum"><div style="font-size:22px;font-weight:700;color:#44AA66">' + stats.complete + '</div><div style="font-size:11px;color:#888;margin-top:2px">Complete</div></div>';
  h += '<div class="csum"><div style="font-size:22px;font-weight:700;color:#E07020">' + stats.pending + '</div><div style="font-size:11px;color:#888;margin-top:2px">Pending</div></div>';
  h += '</div>';

  // Search + Refresh bar
  h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">';
  h += '<input type="text" placeholder="Search submissions…" value="' + ivoreyEsc(ivoreySearch) + '" oninput="ivoreySearch=this.value;renderIvoreySubmissions()" style="flex:1;min-width:200px;padding:8px 14px;border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none;font-family:inherit;">';
  h += '<button class="btn" onclick="ivoreyFetchData()" style="padding:8px 16px;font-size:12px;border-radius:8px;background:var(--warm);border:1px solid var(--sand);color:var(--brown);cursor:pointer;">↻ Refresh</button>';
  h += '<span style="font-size:12px;color:#888;">' + filtered.length + ' of ' + ivoreyData.length + ' shown</span>';
  h += '</div>';

  // ── Table header helper ──
  var colHeaders = ['Full Name', 'Email', 'Submitted', 'Paid?', 'Photos OK?', 'Assumed', 'Status', 'Date Sent', 'Season', 'Notes'];
  var colWidths = ['140px', '', '100px', '100px', '120px', '130px', '120px', '90px', '130px', '180px'];

  function buildTableHeader() {
    var th = '<thead><tr style="background:#FAFAF8;">';
    colHeaders.forEach(function(col, i) {
      var arrow = '';
      if (ivoreySort.col === i) {
        arrow = ivoreySort.asc ? ' ▲' : ' ▼';
      }
      var widthStyle = colWidths[i] ? 'width:' + colWidths[i] + ';' : '';
      th += '<th onclick="ivoreySetSort(' + i + ')" style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;cursor:pointer;white-space:nowrap;border-bottom:2px solid #eee;user-select:none;' + widthStyle + '">' + col + arrow + '</th>';
    });
    th += '</tr></thead>';
    return th;
  }

  // ── Active submissions table ──
  h += '<div style="overflow-x:auto;border-radius:10px;border:1px solid #eee;margin-bottom:24px;">';
  h += '<table class="ctable" style="width:100%;min-width:1200px;border-collapse:collapse;font-size:13px;">';
  h += buildTableHeader();
  h += '<tbody>';

  if (activeRows.length === 0 && sentRows.length === 0) {
    h += '<tr><td colspan="10" style="padding:30px;text-align:center;color:#aaa;">No matching submissions</td></tr>';
  } else if (activeRows.length === 0) {
    h += '<tr><td colspan="10" style="padding:20px;text-align:center;color:#aaa;font-size:12px;">All submissions have been sent</td></tr>';
  } else {
    activeRows.forEach(function(r, ri) {
      h += ivoreyRenderRow(r, ri, false);
    });
  }

  h += '</tbody></table></div>';

  // ── Sent submissions — collapsible section ──
  if (sentRows.length > 0) {
    var chevron = ivoreySentCollapsed ? '▶' : '▼';
    h += '<div style="margin-bottom:24px;">';

    // Header bar
    h += '<div onclick="ivoreyToggleSent()" style="display:flex;align-items:center;gap:10px;padding:12px 16px;'
      + 'background:linear-gradient(135deg,#EDFBF2,#E8F8ED);border:1px solid #b6e2c4;border-radius:10px;cursor:pointer;user-select:none;'
      + (ivoreySentCollapsed ? '' : 'border-bottom-left-radius:0;border-bottom-right-radius:0;')
      + '">'
      + '<span style="font-size:14px;color:#44AA66">' + chevron + '</span>'
      + '<span style="font-size:13px;font-weight:700;color:#2E8B4E;letter-spacing:.3px">✓ Sent to Client</span>'
      + '<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#44AA66;color:#fff">' + sentRows.length + '</span>'
      + '</div>';

    // Collapsible table
    if (!ivoreySentCollapsed) {
      h += '<div style="overflow-x:auto;border:1px solid #b6e2c4;border-top:none;border-radius:0 0 10px 10px;">';
      h += '<table class="ctable" style="width:100%;min-width:1200px;border-collapse:collapse;font-size:13px;">';
      h += '<tbody>';
      sentRows.forEach(function(r, ri) {
        h += ivoreyRenderRow(r, ri, true);
      });
      h += '</tbody></table></div>';
    }

    h += '</div>';
  }

  panel.innerHTML = h;
}
