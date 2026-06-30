// ════════════════════════════════════════════════════════
// CLIENT PROFILES CRM
// ════════════════════════════════════════════════════════

var crmClients         = [];
var crmIdSeq           = 100;
var crmSearch          = '';
var crmSeasonFilter    = '';
var crmTagFilter       = '';
var crmOpenProfileId   = null;
var crmProfileTab      = 'overview';
var crmEditingId       = null;
var crmSessionClientId = null;
var crmPaymentClientId = null;
var crmComposeClientId = null;
var crmSending         = false;

var CRM_SEASON_COLOR = {
  Summer: '#5B8DB8', Winter: '#7052A3', Autumn: '#B86E35', Spring: '#5E8F45'
};
var CRM_SEASONS = [
  '','Light Spring','True Spring','Bright Spring',
  'Light Summer','True Summer','Soft Summer',
  'Soft Autumn','True Autumn','Dark Autumn',
  'Dark Winter','True Winter','Bright Winter'
];

function crmSeasonFamily(s) {
  if (!s) return '';
  if (s.indexOf('Summer') > -1) return 'Summer';
  if (s.indexOf('Winter') > -1) return 'Winter';
  if (s.indexOf('Autumn') > -1) return 'Autumn';
  if (s.indexOf('Spring') > -1) return 'Spring';
  return '';
}
function crmSeasonColor(s) { return CRM_SEASON_COLOR[crmSeasonFamily(s)] || '#9E8B7A'; }
function crmFmtDate(d) {
  if (!d) return '—';
  var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var p = d.split('-'); if (p.length < 3) return d;
  return parseInt(p[2]) + ' ' + mo[parseInt(p[1])-1] + ' ' + p[0];
}
function todayISO() { return new Date().toISOString().split('T')[0]; }
function crmSectionHd(t) {
  return '<div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);font-weight:600;margin-bottom:8px">'+t+'</div>';
}

// ════════════════════════════════════════════════════════
// MAIN LIST VIEW
// ════════════════════════════════════════════════════════

function renderCRMPage() {
  var el = document.getElementById('clients-profiles-panel');
  if (!el) return;

  var list = crmClients.filter(function(c) {
    var q = crmSearch.toLowerCase();
    var ok = !q ||
      (c.firstName + ' ' + c.lastName).toLowerCase().indexOf(q) > -1 ||
      (c.email||'').toLowerCase().indexOf(q) > -1 ||
      (c.season||'').toLowerCase().indexOf(q) > -1 ||
      (c.tags||[]).some(function(t){ return t.indexOf(q) > -1; });
    if (!ok) return false;
    if (crmSeasonFilter && (c.season||'') !== crmSeasonFilter) return false;
    if (crmTagFilter    && (c.tags||[]).indexOf(crmTagFilter) === -1) return false;
    return true;
  });

  var allTags = [];
  crmClients.forEach(function(c) {
    (c.tags||[]).forEach(function(t){ if (allTags.indexOf(t)===-1) allTags.push(t); });
  });
  allTags.sort();

  var html =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap">'
    + '<input class="fi" placeholder="Search by name, email, or season…" value="'+esc(crmSearch)+'" '
    +   'oninput="crmSearch=this.value;renderCRMPage()" style="flex:1;min-width:180px;font-size:13px">'
    + '<select class="fsel" onchange="crmSeasonFilter=this.value;renderCRMPage()" style="font-size:12px">'
    +   CRM_SEASONS.map(function(s){ return '<option value="'+s+'"'+(s===crmSeasonFilter?' selected':'')+'>'+(s||'All Seasons')+'</option>'; }).join('')
    + '</select>'
    + (allTags.length
      ? '<select class="fsel" onchange="crmTagFilter=this.value;renderCRMPage()" style="font-size:12px">'
      +   [''].concat(allTags).map(function(t){ return '<option value="'+t+'"'+(t===crmTagFilter?' selected':'')+'>'+(t||'All Tags')+'</option>'; }).join('')
      + '</select>'
      : '')
    + (typeof ivoreyData !== 'undefined' && ivoreyData.length && curUser==='latisha'
      ? '<button class="btn btns" onclick="crmImportIvorey()" style="font-size:12px;white-space:nowrap">↓ Import OCA</button>'
      : '')
    + '<button class="btn btnp" onclick="openCRMNewModal(null)" style="font-size:12px;white-space:nowrap">+ New Client</button>'
    + '</div>';

  html +=
    '<div style="display:flex;gap:10px;margin-bottom:22px;flex-wrap:wrap">'
    + ['Summer','Winter','Autumn','Spring'].map(function(fam) {
        var n = crmClients.filter(function(c){ return crmSeasonFamily(c.season)===fam; }).length;
        return '<div style="flex:1;min-width:80px;background:white;border-radius:10px;padding:10px 14px;border:1px solid var(--sand);text-align:center">'
          + '<div style="font-size:20px;font-weight:700;color:'+CRM_SEASON_COLOR[fam]+';font-family:\'Cormorant Garamond\',serif">'+n+'</div>'
          + '<div style="font-size:10px;letter-spacing:.5px;color:var(--muted);margin-top:1px">'+fam+'</div>'
          + '</div>';
      }).join('')
    + '<div style="flex:1;min-width:80px;background:var(--deep);border-radius:10px;padding:10px 14px;border:1px solid var(--sand);text-align:center">'
    +   '<div style="font-size:20px;font-weight:700;color:white;font-family:\'Cormorant Garamond\',serif">'+crmClients.length+'</div>'
    +   '<div style="font-size:10px;letter-spacing:.5px;color:rgba(255,255,255,.6);margin-top:1px">Total</div>'
    + '</div>'
    + '</div>';

  if (!list.length) {
    el.innerHTML = html + '<div style="padding:60px 0;text-align:center;color:var(--muted);font-size:13px">'
      + (crmClients.length ? 'No clients match your search.' : 'No client profiles yet — click "+ New Client" or "↓ Import OCA" to get started.')
      + '</div>';
    return;
  }

  var rows = list.map(function(c) {
    var col  = crmSeasonColor(c.season);
    var init = ((c.firstName||'').charAt(0) + (c.lastName||'').charAt(0)).toUpperCase() || '?';
    var lastSess = c.sessions && c.sessions.length ? c.sessions[c.sessions.length-1].date : '';
    var tagBadges = (c.tags||[]).slice(0,2).map(function(t){
      return '<span style="font-size:10px;background:var(--warm);border:1px solid var(--sand);border-radius:7px;padding:2px 6px;white-space:nowrap">'+esc(t)+'</span>';
    }).join(' ');
    var outstanding = (c.payments||[])
      .filter(function(p){ return p.status==='pending'||p.status==='overdue'; })
      .reduce(function(s,p){ return s+p.amount; }, 0);

    return '<tr onclick="openCRMProfile(\''+c.id+'\')" style="cursor:pointer;border-bottom:1px solid var(--warm)"'
      + ' onmouseover="this.style.background=\'#FBF8F4\'" onmouseout="this.style.background=\'\'">'
      + '<td style="padding:10px 10px 10px 0;width:44px">'
      +   '<div style="width:38px;height:38px;border-radius:50%;background:'+col+';display:flex;align-items:center;justify-content:center;color:white;font-family:\'Cormorant Garamond\',serif;font-size:16px;font-weight:600">'+init+'</div>'
      + '</td>'
      + '<td style="padding:10px 12px 10px 0">'
      +   '<div style="font-weight:600;color:var(--deep);font-size:13px">'+esc(c.firstName+' '+c.lastName)+'</div>'
      +   (c.email ? '<div style="font-size:11px;color:var(--muted);margin-top:1px">'+esc(c.email)+'</div>' : '')
      + '</td>'
      + '<td style="padding:10px 12px 10px 0">'
      +   (c.season
          ? '<span style="font-size:11px;font-weight:600;color:white;background:'+col+';border-radius:8px;padding:3px 10px;white-space:nowrap">'+esc(c.season)+'</span>'
          : '<span style="color:var(--muted);font-size:11px">—</span>')
      + '</td>'
      + '<td style="padding:10px 12px 10px 0;font-size:11px;color:var(--muted);white-space:nowrap">'+esc(c.phone||'—')+'</td>'
      + '<td style="padding:10px 12px 10px 0"><div style="display:flex;gap:4px;flex-wrap:wrap">'+tagBadges+'</div></td>'
      + '<td style="padding:10px 12px 10px 0;white-space:nowrap">'
      +   (outstanding > 0
          ? '<span style="font-size:11px;font-weight:600;color:#D97706;background:#FEF3C7;border-radius:6px;padding:2px 8px">$'+outstanding.toFixed(0)+' due</span>'
          : '<span style="font-size:11px;color:var(--muted)">—</span>')
      + '</td>'
      + '<td style="padding:10px 12px 10px 0;font-size:11px;color:var(--muted);white-space:nowrap">'+crmFmtDate(lastSess)+'</td>'
      + '<td style="padding:10px 0;white-space:nowrap" onclick="event.stopPropagation()">'
      +   (curUser==='latisha' ? '<button onclick="openCRMNewModal(\''+c.id+'\')" style="font-size:11px;padding:4px 10px;border:1px solid var(--sand);border-radius:7px;background:white;color:var(--muted);cursor:pointer">Edit</button>' : '')
      + '</td>'
      + '</tr>';
  }).join('');

  html +=
    '<div style="overflow-x:auto;border:1px solid var(--sand);border-radius:12px;background:white">'
    + '<table style="width:100%;border-collapse:collapse">'
    + '<thead><tr style="text-align:left;border-bottom:1px solid var(--sand)">'
    + ['','Name','Season','Phone','Tags','Balance','Last Session',''].map(function(h){
        return '<th style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:600;padding:10px 12px 10px 0">'+h+'</th>';
      }).join('')
    + '</tr></thead>'
    + '<tbody>'+rows+'</tbody>'
    + '</table></div>';

  el.innerHTML = html;
}

// ════════════════════════════════════════════════════════
// PROFILE SLIDE-IN — SHELL + TAB STRIP
// ════════════════════════════════════════════════════════

function openCRMProfile(id, tab) {
  var c = crmClients.find(function(x){ return x.id===id; });
  if (!c) return;
  crmOpenProfileId = id;
  if (tab) crmProfileTab = tab;
  if (!crmProfileTab) crmProfileTab = 'overview';

  var col  = crmSeasonColor(c.season);
  var fam  = crmSeasonFamily(c.season);
  var init = ((c.firstName||'').charAt(0)+(c.lastName||'').charAt(0)).toUpperCase() || '?';

  var TABS   = ['overview','sessions','payments','correspondence'];
  var LABELS = { overview:'Overview', sessions:'Sessions', payments:'Payments', correspondence:'Messages' };

  var panel = document.getElementById('crm-profile-panel');
  if (!panel) return;

  panel.innerHTML =
    '<div style="background:'+col+';padding:24px 20px 0;position:relative;flex-shrink:0">'
    + '<button onclick="closeCRMProfile()" style="position:absolute;top:12px;right:14px;background:rgba(255,255,255,.2);border:none;cursor:pointer;color:white;font-size:16px;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">'
    +   '<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;color:white;font-family:\'Cormorant Garamond\',serif;font-size:22px;font-weight:600;flex-shrink:0">'+init+'</div>'
    +   '<div>'
    +     '<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;color:white;font-weight:600">'+esc(c.firstName+' '+c.lastName)+'</div>'
    +     (c.season
          ? '<div style="font-size:11px;color:rgba(255,255,255,.8);margin-top:3px">'+esc(c.season)+(fam?' · '+fam:'')+'</div>'
          : '<div style="font-size:11px;color:rgba(255,255,255,.6)">No season recorded</div>')
    +   '</div>'
    + '</div>'
    + '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px">'
    +   (curUser==='latisha' ? '<button onclick="openCRMComposeModal(\''+id+'\',\'email\')" style="font-size:11px;font-weight:600;padding:5px 11px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:8px;color:white;cursor:pointer">✉ Email</button>' : '')
    +   (curUser==='latisha'&&c.phone ? '<button onclick="openCRMComposeModal(\''+id+'\',\'sms\')" style="font-size:11px;font-weight:600;padding:5px 11px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:8px;color:white;cursor:pointer">💬 SMS</button>' : '')
    +   (curUser==='latisha' ? '<button onclick="openCRMPaymentModal(\''+id+'\')" style="font-size:11px;font-weight:600;padding:5px 11px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:8px;color:white;cursor:pointer">$ Payment</button>' : '')
    +   (curUser==='latisha' ? '<button onclick="openAddSessionModal(\''+id+'\')" style="font-size:11px;font-weight:600;padding:5px 11px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:8px;color:white;cursor:pointer">+ Session</button>' : '')
    +   (curUser==='latisha' ? '<button onclick="openCRMNewModal(\''+id+'\')" style="font-size:11px;font-weight:600;padding:5px 11px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:8px;color:white;cursor:pointer">✎ Edit</button>' : '')
    + '</div>'
    + '<div style="display:flex">'
    + TABS.map(function(t) {
        var active = t === crmProfileTab;
        return '<button onclick="switchCRMTab(\''+t+'\')" style="'
          + 'font-size:12px;padding:8px 14px;border:none;cursor:pointer;white-space:nowrap;'
          + 'font-weight:'+(active?'600':'400')+';'
          + 'background:'+(active?'white':'transparent')+';'
          + 'color:'+(active?col:'rgba(255,255,255,.72)')+';'
          + 'border-radius:'+(active?'8px 8px 0 0':'0')
          + '">'+LABELS[t]+'</button>';
      }).join('')
    + '</div>'
    + '</div>'
    + '<div id="crm-tab-body" style="overflow-y:auto;flex:1;padding:20px"></div>';

  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  document.getElementById('crm-overlay').style.display = 'block';
  crmRenderTab(id, crmProfileTab);
}

function switchCRMTab(tab) {
  crmProfileTab = tab;
  openCRMProfile(crmOpenProfileId, tab);
}

function crmRenderTab(id, tab) {
  var el = document.getElementById('crm-tab-body');
  if (!el) return;
  var c = crmClients.find(function(x){ return x.id===id; });
  if (!c) return;
  if (tab === 'overview')        el.innerHTML = crmTabOverview(c);
  else if (tab === 'sessions')   el.innerHTML = crmTabSessions(c);
  else if (tab === 'payments')   el.innerHTML = crmTabPayments(c);
  else if (tab === 'correspondence') el.innerHTML = crmTabCorrespondence(c);
}

// ── OVERVIEW ──
function crmTabOverview(c) {
  var col = crmSeasonColor(c.season);
  var tagHtml = (c.tags && c.tags.length)
    ? c.tags.map(function(t){ return '<span style="font-size:11px;background:#EDE9FE;color:#5B21B6;border-radius:8px;padding:3px 9px">'+esc(t)+'</span>'; }).join(' ')
    : '<span style="color:var(--muted);font-size:12px">No tags</span>';
  var sisterHtml = (c.sisterSeasons && c.sisterSeasons.length)
    ? c.sisterSeasons.map(function(s){ return '<span style="font-size:11px;background:var(--warm);border-radius:8px;padding:3px 9px;border:1px solid var(--sand)">'+esc(s)+'</span>'; }).join(' ')
    : '<span style="color:var(--muted);font-size:12px">None recorded</span>';

  return crmSectionHd('Contact')
    + '<div style="display:flex;flex-direction:column;gap:7px;margin-bottom:20px">'
    +   (c.email ? '<div style="font-size:13px"><span style="color:var(--muted);display:inline-block;min-width:60px">Email</span><a href="mailto:'+esc(c.email)+'" style="color:var(--deep);text-decoration:none">'+esc(c.email)+'</a></div>' : '')
    +   (c.phone ? '<div style="font-size:13px"><span style="color:var(--muted);display:inline-block;min-width:60px">Phone</span><span style="color:var(--deep)">'+esc(c.phone)+'</span></div>' : '')
    +   '<div style="font-size:13px"><span style="color:var(--muted);display:inline-block;min-width:60px">Source</span><span style="color:var(--deep)">'+cap(c.source||'—')+'</span></div>'
    +   '<div style="font-size:13px"><span style="color:var(--muted);display:inline-block;min-width:60px">Added</span><span style="color:var(--deep)">'+crmFmtDate(c.createdAt)+'</span></div>'
    + '</div>'
    + crmSectionHd('Tags')
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px">'+tagHtml+'</div>'
    + (c.season
      ? '<div style="background:var(--warm);border-radius:10px;padding:13px 15px;border:1px solid var(--sand);margin-bottom:20px">'
        + crmSectionHd('Season Result')
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="font-size:13px;font-weight:700;color:white;background:'+col+';border-radius:8px;padding:4px 12px">'+esc(c.season)+'</span></div>'
        + '<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:6px">Sister Seasons</div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap">'+sisterHtml+'</div>'
        + (c.seasonNotes ? '<div style="font-size:12px;color:var(--brown);margin-top:10px;line-height:1.55;padding-top:10px;border-top:1px solid var(--sand)">'+esc(c.seasonNotes)+'</div>' : '')
        + '</div>'
      : '')
    + crmSectionHd('Internal Notes')
    + (curUser==='latisha'
      ? '<textarea class="fi" style="width:100%;font-size:12px;resize:vertical;box-sizing:border-box" rows="4" placeholder="Private notes…" oninput="crmSaveNote(\''+c.id+'\',this.value)">'+esc(c.notes||'')+'</textarea>'
      : '<div style="font-size:13px;color:var(--brown)">'+esc(c.notes||'—')+'</div>');
}

// ── SESSIONS ──
function crmTabSessions(c) {
  var sessHtml = (!c.sessions || !c.sessions.length)
    ? '<div style="padding:40px 0;text-align:center;color:var(--muted);font-size:13px">No sessions yet.</div>'
    : c.sessions.slice().reverse().map(function(s) {
        var sCol = crmSeasonColor(s.season||c.season);
        return '<div style="border:1px solid var(--sand);border-radius:10px;padding:12px 14px;margin-bottom:10px;position:relative">'
          + '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:8px">'
          +   '<span style="font-size:11px;font-weight:700;color:white;background:'+sCol+';border-radius:7px;padding:2px 9px">'+(s.season||c.season||'—')+'</span>'
          +   '<span style="font-size:11px;color:var(--muted)">'+crmFmtDate(s.date)+'</span>'
          +   '<span style="font-size:10px;background:var(--warm);border-radius:6px;padding:2px 7px;color:var(--deep)">'+esc(s.type||'OCA')+'</span>'
          + '</div>'
          + (s.notes ? '<div style="font-size:12px;color:var(--brown);line-height:1.6;margin-bottom:6px">'+esc(s.notes)+'</div>' : '')
          + (s.reportUrl ? '<a href="'+esc(s.reportUrl)+'" target="_blank" style="font-size:11px;color:var(--accent);text-decoration:none">↗ View Report</a>' : '')
          + (curUser==='latisha' ? '<button onclick="crmDeleteSession(\''+c.id+'\',\''+s.id+'\')" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:11px;color:var(--muted);cursor:pointer;padding:2px 6px">✕</button>' : '')
          + '</div>';
      }).join('');

  return '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
    + crmSectionHd('Sessions ('+(c.sessions?c.sessions.length:0)+')')
    + (curUser==='latisha' ? '<button onclick="openAddSessionModal(\''+c.id+'\')" class="btn btns" style="font-size:11px">+ Add</button>' : '')
    + '</div>'
    + sessHtml;
}

// ── PAYMENTS ──
function crmTabPayments(c) {
  var payments    = c.payments || [];
  var totalPaid   = payments.filter(function(p){ return p.status==='paid'; }).reduce(function(s,p){ return s+p.amount; },0);
  var totalPend   = payments.filter(function(p){ return p.status==='pending'||p.status==='overdue'; }).reduce(function(s,p){ return s+p.amount; },0);
  var S = { paid:'background:#D1FAE5;color:#065F46', pending:'background:#FEF3C7;color:#92400E', overdue:'background:#FEE2E2;color:#991B1B', refunded:'background:#EDE9FE;color:#5B21B6' };

  var list = payments.length
    ? payments.slice().reverse().map(function(p) {
        var ss = S[p.status] || S.pending;
        return '<div style="border:1px solid var(--sand);border-radius:10px;padding:13px 15px;margin-bottom:8px;background:white">'
          + '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px">'
          +   '<span style="font-size:16px;font-weight:700;color:var(--deep);font-family:\'Cormorant Garamond\',serif">$'+p.amount.toFixed(2)+'</span>'
          +   '<span style="font-size:10px;color:var(--muted)">AUD</span>'
          +   '<span style="margin-left:auto;font-size:10px;font-weight:700;border-radius:6px;padding:2px 8px;'+ss+'">'+p.status.toUpperCase()+'</span>'
          + '</div>'
          + '<div style="font-size:12px;color:var(--brown);margin-bottom:5px">'+esc(p.description||'—')+'</div>'
          + '<div style="display:flex;align-items:center;gap:8px">'
          +   '<span style="font-size:11px;color:var(--muted)">'+crmFmtDate(p.date)+'</span>'
          +   (p.invoiceRef ? '<span style="font-size:10px;background:var(--warm);border-radius:5px;padding:1px 7px;color:var(--deep)">'+esc(p.invoiceRef)+'</span>' : '')
          +   '<span style="font-size:10px;color:var(--muted);text-transform:capitalize">'+esc(p.type||'invoice')+'</span>'
          + '</div>'
          + (curUser==='latisha'
            ? '<div style="display:flex;gap:6px;margin-top:10px">'
            +   (p.status==='pending'||p.status==='overdue' ? '<button onclick="crmMarkPaid(\''+c.id+'\',\''+p.id+'\')" style="font-size:11px;padding:3px 10px;border:1px solid #6EE7B7;border-radius:6px;background:#D1FAE5;color:#065F46;cursor:pointer">✓ Mark Paid</button>' : '')
            +   '<button onclick="crmDeletePayment(\''+c.id+'\',\''+p.id+'\')" style="font-size:11px;padding:3px 10px;border:1px solid var(--sand);border-radius:6px;background:white;color:var(--muted);cursor:pointer;margin-left:auto">Remove</button>'
            + '</div>'
            : '')
          + '</div>';
      }).join('')
    : '<div style="padding:40px 0;text-align:center;color:var(--muted);font-size:13px">No payments recorded yet.</div>';

  return '<div style="display:flex;gap:10px;margin-bottom:18px">'
    + '<div style="flex:1;background:#D1FAE5;border-radius:10px;padding:12px 14px">'
    +   '<div style="font-size:18px;font-weight:700;color:#065F46;font-family:\'Cormorant Garamond\',serif">$'+totalPaid.toFixed(2)+'</div>'
    +   '<div style="font-size:10px;color:#065F46;opacity:.7;margin-top:1px">Total Paid</div>'
    + '</div>'
    + '<div style="flex:1;background:#FEF3C7;border-radius:10px;padding:12px 14px">'
    +   '<div style="font-size:18px;font-weight:700;color:#92400E;font-family:\'Cormorant Garamond\',serif">$'+totalPend.toFixed(2)+'</div>'
    +   '<div style="font-size:10px;color:#92400E;opacity:.7;margin-top:1px">Outstanding</div>'
    + '</div>'
    + (curUser==='latisha'
      ? '<button onclick="openCRMPaymentModal(\''+c.id+'\')" class="btn btnp" style="align-self:center;font-size:12px;white-space:nowrap">+ Add</button>'
      : '')
    + '</div>'
    + crmSectionHd('Payment History')
    + list;
}

// ── CORRESPONDENCE ──
function crmTabCorrespondence(c) {
  var msgs    = c.correspondence || [];
  var apiOk   = !!localStorage.getItem('yszn_api_key');
  var CH_ICON = { email:'✉', sms:'💬' };
  var S_BADGE = {
    failed: 'background:#FEE2E2;color:#991B1B',
    draft:  'background:#EDE9FE;color:#5B21B6'
  };

  var list = msgs.length
    ? msgs.slice().reverse().map(function(m) {
        var icon = CH_ICON[m.channel] || '✉';
        var outbound = m.direction !== 'inbound';
        return '<div style="border:1px solid var(--sand);border-radius:10px;padding:12px 14px;margin-bottom:8px;background:'+(outbound?'var(--warm)':'white')+'">'
          + '<div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">'
          +   '<span>'+icon+'</span>'
          +   (m.subject ? '<span style="font-size:12px;font-weight:600;color:var(--deep)">'+esc(m.subject)+'</span>' : '')
          +   '<span style="font-size:10px;color:var(--muted);margin-left:auto">'+crmFmtDate((m.sentAt||'').split('T')[0])+'</span>'
          +   (S_BADGE[m.status] ? '<span style="font-size:10px;font-weight:700;border-radius:5px;padding:2px 7px;'+S_BADGE[m.status]+'">'+m.status.toUpperCase()+'</span>' : '')
          + '</div>'
          + '<div style="font-size:12px;color:var(--brown);line-height:1.6;white-space:pre-wrap">'+esc(m.body||'')+'</div>'
          + '<div style="font-size:10px;color:var(--muted);margin-top:6px;text-transform:capitalize">'+m.direction+' · '+(m.channel||'email')+'</div>'
          + '</div>';
      }).join('')
    : '<div style="padding:40px 0;text-align:center;color:var(--muted);font-size:13px">No messages yet.</div>';

  return '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
    + crmSectionHd('Messages')
    + (curUser==='latisha'
      ? '<div style="display:flex;gap:6px">'
        + '<button onclick="openCRMComposeModal(\''+c.id+'\',\'email\')" class="btn btns" style="font-size:11px">✉ Email</button>'
        + (c.phone ? '<button onclick="openCRMComposeModal(\''+c.id+'\',\'sms\')" class="btn btns" style="font-size:11px">💬 SMS</button>' : '')
        + '</div>'
      : '')
    + '</div>'
    + (!apiOk && curUser==='latisha'
      ? '<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:10px;padding:11px 14px;margin-bottom:14px;font-size:12px;color:#92400E;display:flex;align-items:center;gap:8px">'
        + '<span>⚠ API key required for sending.</span>'
        + '<button onclick="openCRMApiConfig()" style="background:none;border:none;color:#D97706;text-decoration:underline;cursor:pointer;font-size:12px;padding:0;white-space:nowrap">Configure →</button>'
        + '</div>'
      : '')
    + list;
}

function closeCRMProfile() {
  crmOpenProfileId = null;
  var p = document.getElementById('crm-profile-panel'); if (p) p.style.display = 'none';
  var o = document.getElementById('crm-overlay');       if (o) o.style.display = 'none';
}
function crmSaveNote(id, val) {
  var c = crmClients.find(function(x){ return x.id===id; });
  if (c) { c.notes = val; saveData(); }
}

// ════════════════════════════════════════════════════════
// PAYMENT MODAL
// ════════════════════════════════════════════════════════

function openCRMPaymentModal(clientId) {
  if (curUser !== 'latisha') return;
  crmPaymentClientId = clientId;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  document.getElementById('crm-pay-amount').value  = '';
  document.getElementById('crm-pay-date').value    = todayISO();
  document.getElementById('crm-pay-type').value    = 'invoice';
  document.getElementById('crm-pay-status').value  = 'pending';
  document.getElementById('crm-pay-desc').value    = c&&c.season ? 'Colour Analysis — '+c.season : 'Colour Analysis';
  document.getElementById('crm-pay-ref').value     = 'INV-' + String(Date.now()).slice(-5);
  document.getElementById('crm-pay-err').textContent = '';
  document.getElementById('crm-pay-modal').style.display = 'flex';
}
function closeCRMPaymentModal() { document.getElementById('crm-pay-modal').style.display = 'none'; }

function saveCRMPayment() {
  var amtRaw = document.getElementById('crm-pay-amount').value.trim();
  var amt    = parseFloat(amtRaw);
  if (!amtRaw || isNaN(amt) || amt <= 0) {
    document.getElementById('crm-pay-err').textContent = 'Enter a valid amount.'; return;
  }
  var c = crmClients.find(function(x){ return x.id===crmPaymentClientId; });
  if (!c) return;
  if (!c.payments) c.payments = [];
  c.payments.push({
    id:          'pay' + Date.now(),
    amount:      amt,
    currency:    'AUD',
    date:        document.getElementById('crm-pay-date').value    || todayISO(),
    type:        document.getElementById('crm-pay-type').value,
    status:      document.getElementById('crm-pay-status').value,
    description: document.getElementById('crm-pay-desc').value.trim(),
    invoiceRef:  document.getElementById('crm-pay-ref').value.trim()
  });
  closeCRMPaymentModal();
  saveData(); renderCRMPage();
  openCRMProfile(crmPaymentClientId, 'payments');
}

function crmMarkPaid(clientId, payId) {
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c||!c.payments) return;
  c.payments = c.payments.map(function(p){ return p.id===payId ? Object.assign({},p,{status:'paid'}) : p; });
  saveData(); renderCRMPage();
  openCRMProfile(clientId, 'payments');
}

function crmDeletePayment(clientId, payId) {
  if (!confirm('Remove this payment?')) return;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c||!c.payments) return;
  c.payments = c.payments.filter(function(p){ return p.id!==payId; });
  saveData(); renderCRMPage();
  openCRMProfile(clientId, 'payments');
}

// ════════════════════════════════════════════════════════
// COMPOSE MODAL (email / sms)
// ════════════════════════════════════════════════════════

function openCRMComposeModal(clientId, channel) {
  if (curUser !== 'latisha') return;
  crmComposeClientId = clientId;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  var ch = channel || 'email';
  document.getElementById('crm-compose-channel').value  = ch;
  document.getElementById('crm-compose-to').value       = ch==='sms' ? (c?c.phone||'':'') : (c?c.email||'':'');
  document.getElementById('crm-compose-subject').value  = c&&c.season ? 'Your Colour Analysis — '+c.season : 'Your Colour Analysis';
  document.getElementById('crm-compose-body').value     = c ? 'Hi '+c.firstName+',\n\n' : '';
  document.getElementById('crm-compose-err').textContent    = '';
  document.getElementById('crm-compose-status').textContent = '';
  crmComposeToggleUI(ch);
  document.getElementById('crm-compose-modal').style.display = 'flex';
}

function crmComposeToggleUI(ch) {
  var subRow  = document.getElementById('crm-compose-subject-row');
  var toLabel = document.getElementById('crm-compose-to-label');
  if (subRow)  subRow.style.display  = ch==='email' ? 'block' : 'none';
  if (toLabel) toLabel.textContent   = ch==='sms'   ? 'To (phone number)' : 'To (email address)';
  var btn = document.getElementById('crm-compose-send-btn');
  if (btn) btn.textContent = ch==='sms' ? 'Send SMS' : 'Send Email';
}

function closeCRMComposeModal() {
  document.getElementById('crm-compose-modal').style.display = 'none';
  crmSending = false;
}

function sendCRMMessage() {
  if (crmSending) return;
  var channel = document.getElementById('crm-compose-channel').value;
  var to      = document.getElementById('crm-compose-to').value.trim();
  var subject = document.getElementById('crm-compose-subject').value.trim();
  var body    = document.getElementById('crm-compose-body').value.trim();
  var errEl   = document.getElementById('crm-compose-err');
  var statEl  = document.getElementById('crm-compose-status');

  errEl.textContent = '';
  if (!to)   { errEl.textContent = channel==='sms' ? 'Phone number is required.' : 'Email address is required.'; return; }
  if (!body) { errEl.textContent = 'Message body cannot be empty.'; return; }

  var apiKey = localStorage.getItem('yszn_api_key') || '';
  if (!apiKey) {
    errEl.innerHTML = 'API key not configured. <button onclick="openCRMApiConfig()" style="background:none;border:none;color:#D97706;text-decoration:underline;cursor:pointer;font-size:12px;padding:0">Set it up →</button>';
    return;
  }

  var endpoint = channel==='sms' ? '/api/send-sms' : '/api/send-email';
  var payload  = channel==='sms'
    ? { to:to, body:body }
    : { to:to, subject:subject||'(no subject)', body:body };

  crmSending = true;
  statEl.textContent = 'Sending…';
  var btn = document.getElementById('crm-compose-send-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+apiKey },
    body: JSON.stringify(payload)
  })
  .then(function(r){ return r.json().then(function(d){ return {ok:r.ok,data:d}; }); })
  .then(function(res) {
    crmSending = false;
    statEl.textContent = '';
    if (btn) { btn.disabled=false; btn.textContent = channel==='sms'?'Send SMS':'Send Email'; }
    if (!res.ok) { errEl.textContent = res.data.error || 'Send failed.'; return; }
    var c = crmClients.find(function(x){ return x.id===crmComposeClientId; });
    if (c) {
      if (!c.correspondence) c.correspondence = [];
      c.correspondence.push({
        id:'msg'+Date.now(), channel:channel, direction:'outbound',
        subject:subject, body:body, status:'sent', sentAt:new Date().toISOString()
      });
      saveData(); renderCRMPage();
    }
    closeCRMComposeModal();
    openCRMProfile(crmComposeClientId, 'correspondence');
  })
  .catch(function(e) {
    crmSending = false;
    statEl.textContent = '';
    if (btn) { btn.disabled=false; btn.textContent = channel==='sms'?'Send SMS':'Send Email'; }
    errEl.textContent = 'Network error — check your connection.';
  });
}

// ── API KEY CONFIG ──
function openCRMApiConfig() {
  var current = localStorage.getItem('yszn_api_key') || '';
  var key = prompt('Paste your YSZN_API_SECRET (from Vercel Environment Variables):', current ? '••••••••' : '');
  if (key === null) return;
  key = key.trim();
  if (key && key !== '••••••••') {
    localStorage.setItem('yszn_api_key', key);
    alert('API key saved to this browser. Reload to confirm.');
  } else if (!key) {
    localStorage.removeItem('yszn_api_key');
  }
}

// ════════════════════════════════════════════════════════
// NEW / EDIT CLIENT MODAL
// ════════════════════════════════════════════════════════

function openCRMNewModal(id) {
  if (curUser !== 'latisha') return;
  var c = id ? crmClients.find(function(x){ return x.id===id; }) : null;
  crmEditingId = id || null;

  document.getElementById('crm-m-heading').textContent  = c ? 'Edit Client' : 'New Client';
  document.getElementById('crm-m-fname').value          = c ? c.firstName||''                  : '';
  document.getElementById('crm-m-lname').value          = c ? c.lastName||''                   : '';
  document.getElementById('crm-m-email').value          = c ? c.email||''                      : '';
  document.getElementById('crm-m-phone').value          = c ? c.phone||''                      : '';
  document.getElementById('crm-m-season').value         = c ? c.season||''                     : '';
  document.getElementById('crm-m-sisters').value        = c ? (c.sisterSeasons||[]).join(', ') : '';
  document.getElementById('crm-m-tags').value           = c ? (c.tags||[]).join(', ')          : '';
  document.getElementById('crm-m-source').value         = c ? c.source||'online'               : 'online';
  document.getElementById('crm-m-season-notes').value   = c ? c.seasonNotes||''                : '';
  document.getElementById('crm-m-err').textContent      = '';
  document.getElementById('crm-m-del').style.display    = c ? 'inline-block' : 'none';
  document.getElementById('crm-modal').style.display    = 'flex';
}
function closeCRMModal() { document.getElementById('crm-modal').style.display = 'none'; }

function saveCRMClient() {
  var fname = document.getElementById('crm-m-fname').value.trim();
  if (!fname) { document.getElementById('crm-m-err').textContent = 'First name is required.'; return; }

  var tags    = (document.getElementById('crm-m-tags').value    ||'').split(',').map(function(t){ return t.trim().toLowerCase(); }).filter(Boolean);
  var sisters = (document.getElementById('crm-m-sisters').value ||'').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
  var exist   = crmEditingId ? crmClients.find(function(c){ return c.id===crmEditingId; }) : null;

  var obj = {
    id:             crmEditingId || ('c'+(crmIdSeq++)),
    firstName:      fname,
    lastName:       document.getElementById('crm-m-lname').value.trim(),
    email:          document.getElementById('crm-m-email').value.trim(),
    phone:          document.getElementById('crm-m-phone').value.trim(),
    season:         document.getElementById('crm-m-season').value,
    sisterSeasons:  sisters,
    tags:           tags,
    source:         document.getElementById('crm-m-source').value,
    seasonNotes:    document.getElementById('crm-m-season-notes').value.trim(),
    notes:          exist ? (exist.notes||'')          : '',
    sessions:       exist ? (exist.sessions||[])       : [],
    payments:       exist ? (exist.payments||[])       : [],
    correspondence: exist ? (exist.correspondence||[]) : [],
    createdAt:      exist ? (exist.createdAt||todayISO()) : todayISO()
  };

  if (crmEditingId) {
    crmClients = crmClients.map(function(c){ return c.id===crmEditingId ? obj : c; });
  } else {
    crmClients.push(obj);
  }
  closeCRMModal();
  saveData(); renderCRMPage();
  if (crmOpenProfileId === crmEditingId) openCRMProfile(crmEditingId);
}

function deleteCRMClient() {
  if (!crmEditingId || !confirm('Delete this client profile? This cannot be undone.')) return;
  crmClients = crmClients.filter(function(c){ return c.id!==crmEditingId; });
  closeCRMModal(); closeCRMProfile();
  saveData(); renderCRMPage();
}

// ════════════════════════════════════════════════════════
// ADD SESSION MODAL
// ════════════════════════════════════════════════════════

function openAddSessionModal(clientId) {
  if (curUser !== 'latisha') return;
  crmSessionClientId = clientId;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  document.getElementById('crm-s-date').value    = todayISO();
  document.getElementById('crm-s-type').value    = 'Online CA';
  document.getElementById('crm-s-season').value  = c ? (c.season||'') : '';
  document.getElementById('crm-s-notes').value   = '';
  document.getElementById('crm-s-report').value  = '';
  document.getElementById('crm-s-err').textContent = '';
  document.getElementById('crm-sess-modal').style.display = 'flex';
}
function closeCRMSessionModal() { document.getElementById('crm-sess-modal').style.display = 'none'; }

function saveCRMSession() {
  var c = crmClients.find(function(x){ return x.id===crmSessionClientId; });
  if (!c) return;
  if (!c.sessions) c.sessions = [];
  var season = document.getElementById('crm-s-season').value;
  c.sessions.push({
    id:'ss'+Date.now(),
    date:   document.getElementById('crm-s-date').value   || todayISO(),
    type:   document.getElementById('crm-s-type').value,
    season: season,
    notes:  document.getElementById('crm-s-notes').value.trim(),
    reportUrl: document.getElementById('crm-s-report').value.trim()
  });
  if (season && !c.season) c.season = season;
  closeCRMSessionModal();
  saveData(); renderCRMPage();
  openCRMProfile(crmSessionClientId, 'sessions');
}

function crmDeleteSession(clientId, sessId) {
  if (!confirm('Remove this session?')) return;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c||!c.sessions) return;
  c.sessions = c.sessions.filter(function(s){ return s.id!==sessId; });
  saveData(); renderCRMPage();
  openCRMProfile(clientId, 'sessions');
}

// ════════════════════════════════════════════════════════
// IMPORT FROM OCA SUBMISSIONS
// ════════════════════════════════════════════════════════

function crmImportIvorey() {
  if (typeof ivoreyData === 'undefined' || !ivoreyData.length) {
    alert('No OCA submissions found. Open the Online CA tab first to load them, then try again.'); return;
  }
  var imported = 0;
  ivoreyData.forEach(function(row) {
    var fullName = (row[0]||'').trim();
    var email    = (row[1]||'').trim().toLowerCase();
    var season   = (row[8]||'').trim();
    var notes    = (row[9]||'').trim();
    if (!fullName) return;
    if (email && crmClients.some(function(c){ return (c.email||'').toLowerCase()===email; })) return;
    if (!email && crmClients.some(function(c){ return (c.firstName+' '+c.lastName).trim().toLowerCase()===fullName.toLowerCase(); })) return;
    var parts = fullName.split(' ');
    crmClients.push({
      id:'c'+(crmIdSeq++), firstName:parts[0]||'', lastName:parts.slice(1).join(' ')||'',
      email:email, phone:'', season:season, sisterSeasons:[],
      tags:['online ca'].concat(season?[season.toLowerCase()]:[]),
      source:'online', seasonNotes:notes, notes:'',
      sessions: season ? [{id:'ss'+Date.now()+'i'+imported,date:todayISO(),type:'Online CA',season:season,notes:notes,reportUrl:''}] : [],
      payments:[], correspondence:[], createdAt:todayISO()
    });
    imported++;
  });
  saveData(); renderCRMPage();
  alert(imported+' client'+(imported!==1?'s':'')+' imported.');
}
