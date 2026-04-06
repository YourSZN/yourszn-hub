// ═══════════════════════════════════════════════════════════════
// IVOREY SUBMISSIONS — Google Sheets CSV Integration
// ═══════════════════════════════════════════════════════════════

var ivoreyData = [];
var ivoreySort = { col: 0, asc: true };
var ivoreySearch = '';
var ivoreyLoading = false;

var IVOREY_CSV_URL = 'https://docs.google.com/spreadsheets/d/1j06xazCUHPFtfw9fcmU5cv8TvF3brvK_fMP2zHep1YY/gviz/tq?tqx=out:csv&gid=0';

var IVOREY_COLS = [
  'Full Name', 'Email', 'Photo Submission', 'PAID?',
  'Photos confirmed as good to analyse?', 'Assumed season?',
  'Status', 'Date sent', 'Season', 'Notes'
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

// ── Fetch Data ──────────────────────────────────────────────

function ivoreyFetchData(cb) {
  ivoreyLoading = true;
  renderIvoreySubmissions();

  fetch(IVOREY_CSV_URL)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function(text) {
      var rows = ivoreyParseCSV(text);
      // Skip header row
      if (rows.length > 0) {
        rows.shift();
      }
      // Pad each row to 10 columns
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
      var panel = document.getElementById('clients-ivorey-panel');
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

function ivoreyStatusBadge(val) {
  var v = (val || '').toLowerCase().trim();
  var map = {
    'sent':        { label: 'Sent',        colour: '#5588DD', bg: '#EBF2FF' },
    'complete':    { label: 'Complete',     colour: '#44AA66', bg: '#EDFBF2' },
    'completed':   { label: 'Complete',     colour: '#44AA66', bg: '#EDFBF2' },
    'pending':     { label: 'Pending',      colour: '#E07020', bg: '#FFF3EB' },
    'in progress': { label: 'In Progress',  colour: '#5588DD', bg: '#EBF2FF' },
    'in_progress': { label: 'In Progress',  colour: '#5588DD', bg: '#EBF2FF' },
    'new':         { label: 'New',          colour: '#E07020', bg: '#FFF3EB' },
    'waiting':     { label: 'Waiting',      colour: '#D4A017', bg: '#FFF9E6' },
    'need photos': { label: 'Need Photos',  colour: '#D4A017', bg: '#FFF9E6' }
  };
  var s = map[v] || { label: val || '—', colour: '#888', bg: '#F4F4F4' };
  if (!val || val.trim() === '') return '<span style="color:#aaa">—</span>';
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
    'clear spring':  { colour: '#5A9E3C', bg: '#EFF8EB' },
    'light summer':  { colour: '#7799CC', bg: '#EFF4FB' },
    'cool summer':   { colour: '#5577AA', bg: '#EBF0F9' },
    'soft summer':   { colour: '#8899AA', bg: '#F0F3F6' },
    'soft autumn':   { colour: '#AA8844', bg: '#FAF4E8' },
    'warm autumn':   { colour: '#CC7722', bg: '#FFF5E6' },
    'deep autumn':   { colour: '#8B4513', bg: '#F8EDE4' },
    'deep winter':   { colour: '#223366', bg: '#E8ECF4' },
    'cool winter':   { colour: '#334488', bg: '#EAECF6' },
    'clear winter':  { colour: '#2255AA', bg: '#E8EFF8' }
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
    var va = (a[col] || '').toLowerCase();
    var vb = (b[col] || '').toLowerCase();
    if (va < vb) return asc ? -1 : 1;
    if (va > vb) return asc ? 1 : -1;
    return 0;
  });
}

// ── Summary Stats ───────────────────────────────────────────

function ivoreyGetStats(data) {
  var total = data.length;
  var sent = 0;
  var complete = 0;
  var pending = 0;
  var paid = 0;

  data.forEach(function(r) {
    var status = (r[6] || '').toLowerCase().trim();
    var paidVal = (r[3] || '').toLowerCase().trim();

    if (status === 'sent') sent++;
    if (status === 'complete' || status === 'completed') complete++;
    if (status === 'pending' || status === 'new' || status === '' ||
        status === 'waiting' || status === 'need photos' || status === 'in progress' || status === 'in_progress') pending++;
    if (paidVal === 'yes' || paidVal === 'y' || paidVal === 'true' || paidVal === 'paid') paid++;
  });

  return { total: total, sent: sent, complete: complete, pending: pending, paid: paid };
}

// ── Render ──────────────────────────────────────────────────

function renderIvoreySubmissions() {
  var panel = document.getElementById('clients-ivorey-panel');
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

  // Table
  h += '<div style="overflow-x:auto;border-radius:10px;border:1px solid #eee;">';
  h += '<table class="ctable" style="width:100%;min-width:1200px;border-collapse:collapse;font-size:13px;">';

  // Header
  h += '<thead><tr style="background:#FAFAF8;">';
  IVOREY_COLS.forEach(function(col, i) {
    var arrow = '';
    if (ivoreySort.col === i) {
      arrow = ivoreySort.asc ? ' ▲' : ' ▼';
    }
    var shortLabel = col;
    if (col === 'Photos confirmed as good to analyse?') shortLabel = 'Photos OK?';
    if (col === 'Assumed season?') shortLabel = 'Assumed';
    h += '<th onclick="ivoreySetSort(' + i + ')" style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;cursor:pointer;white-space:nowrap;border-bottom:2px solid #eee;user-select:none">' + shortLabel + arrow + '</th>';
  });
  h += '</tr></thead>';

  // Body
  h += '<tbody>';
  if (sorted.length === 0) {
    h += '<tr><td colspan="10" style="padding:30px;text-align:center;color:#aaa;">No matching submissions</td></tr>';
  } else {
    sorted.forEach(function(r, ri) {
      h += '<tr style="border-bottom:1px solid #f0f0f0;' + (ri % 2 === 0 ? '' : 'background:#FDFDFB;') + '">';
      // Full Name (col 0)
      h += '<td style="padding:10px 12px;font-weight:600;white-space:nowrap;">' + ivoreyEsc(r[0]) + '</td>';
      // Email (col 1)
      h += '<td style="padding:10px 12px;color:#666;font-size:12px;">' + ivoreyEsc(r[1]) + '</td>';
      // Photo Submission date (col 2)
      h += '<td style="padding:10px 12px;white-space:nowrap;font-size:12px;">' + (r[2] ? ivoreyEsc(r[2]) : '<span style="color:#aaa">—</span>') + '</td>';
      // PAID? (col 3)
      h += '<td style="padding:10px 12px;">' + ivoreyPaidBadge(r[3]) + '</td>';
      // Photos confirmed (col 4)
      h += '<td style="padding:10px 12px;">' + ivoreyPhotoBadge(r[4]) + '</td>';
      // Assumed season (col 5)
      h += '<td style="padding:10px 12px;">' + ivoreySeasonBadge(r[5]) + '</td>';
      // Status (col 6)
      h += '<td style="padding:10px 12px;">' + ivoreyStatusBadge(r[6]) + '</td>';
      // Date sent (col 7)
      h += '<td style="padding:10px 12px;white-space:nowrap;font-size:12px;">' + (r[7] ? ivoreyEsc(r[7]) : '<span style="color:#aaa">—</span>') + '</td>';
      // Season (col 8)
      h += '<td style="padding:10px 12px;">' + ivoreySeasonBadge(r[8]) + '</td>';
      // Notes (col 9)
      h += '<td style="padding:10px 12px;font-size:12px;color:#666;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + ivoreyEsc(r[9]) + '">' + (r[9] ? ivoreyEsc(r[9]) : '<span style="color:#aaa">—</span>') + '</td>';
      h += '</tr>';
    });
  }
  h += '</tbody></table></div>';

  panel.innerHTML = h;
}
