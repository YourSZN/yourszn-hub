// ════════════════════════════════════════════════════════
// CLIENT PROFILES CRM
// ════════════════════════════════════════════════════════

var crmClients         = [];
var crmIdSeq           = 100;
var crmSearch          = '';
var crmSeasonFilter    = '';
var crmTagFilter       = '';
var crmOpenProfileId   = null;
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
  return '<div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:8px">'+t+'</div>';
}

// ════════════════════════════════════════════════════════
// MAIN LIST VIEW
// ════════════════════════════════════════════════════════

function renderCRMPage() {
  var el = document.getElementById('clients-profiles-panel');
  if (!el) return;
  crmOpenProfileId = null;

  // Close any stale overlay/panel
  var ov = document.getElementById('crm-overlay');
  if (ov) ov.style.display = 'none';
  var sp = document.getElementById('crm-profile-panel');
  if (sp) sp.style.display = 'none';

  var list = crmClients.filter(function(c) {
    var q = crmSearch.toLowerCase();
    var ok = !q ||
      (c.firstName+' '+c.lastName).toLowerCase().indexOf(q) > -1 ||
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
    var init = ((c.firstName||'').charAt(0)+(c.lastName||'').charAt(0)).toUpperCase() || '?';
    var lastSess = c.sessions&&c.sessions.length ? c.sessions[c.sessions.length-1].date : '';
    var tagBadges = (c.tags||[]).slice(0,2).map(function(t){
      return '<span style="font-size:10px;background:var(--warm);border:1px solid var(--sand);border-radius:7px;padding:2px 6px;white-space:nowrap">'+esc(t)+'</span>';
    }).join(' ');
    var outstanding = (c.payments||[])
      .filter(function(p){ return p.status==='pending'||p.status==='overdue'; })
      .reduce(function(s,p){ return s+p.amount; },0);

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
// FULL-PAGE PROFILE (3-COLUMN LAYOUT)
// ════════════════════════════════════════════════════════

function openCRMProfile(id) {
  var el = document.getElementById('clients-profiles-panel');
  var c  = crmClients.find(function(x){ return x.id===id; });
  if (!el || !c) return;
  crmOpenProfileId   = id;
  crmComposeClientId = id;

  var col  = crmSeasonColor(c.season);
  var init = ((c.firstName||'').charAt(0)+(c.lastName||'').charAt(0)).toUpperCase() || '?';

  // ── LEFT SIDEBAR ──────────────────────────────────────
  var tagHtml = (c.tags&&c.tags.length)
    ? c.tags.map(function(t){ return '<span style="font-size:11px;background:#EDE9FE;color:#5B21B6;border-radius:8px;padding:3px 9px;display:inline-block;margin:2px">'+esc(t)+'</span>'; }).join('')
    : '<span style="color:var(--muted);font-size:12px">No tags</span>';

  var sisterHtml = (c.sisterSeasons&&c.sisterSeasons.length)
    ? c.sisterSeasons.map(function(s){ return '<span style="font-size:11px;background:var(--warm);border-radius:8px;padding:2px 8px;border:1px solid var(--sand);display:inline-block;margin:2px">'+esc(s)+'</span>'; }).join('')
    : '<span style="color:var(--muted);font-size:12px">None recorded</span>';

  var leftCol =
    // Avatar + name
    '<div style="text-align:center;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid var(--sand)">'
    + '<div style="width:64px;height:64px;border-radius:50%;background:'+col+';display:flex;align-items:center;justify-content:center;color:white;font-family:\'Cormorant Garamond\',serif;font-size:26px;font-weight:600;margin:0 auto 12px">'+init+'</div>'
    + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:18px;font-weight:600;color:var(--deep);margin-bottom:6px">'+esc(c.firstName+' '+c.lastName)+'</div>'
    + (c.season ? '<span style="font-size:11px;font-weight:600;color:white;background:'+col+';border-radius:8px;padding:3px 12px">'+esc(c.season)+'</span>' : '<span style="font-size:11px;color:var(--muted)">No season recorded</span>')
    + '</div>'
    // Contact
    + crmSectionHd('Contact')
    + '<div style="display:flex;flex-direction:column;gap:9px;margin-bottom:18px">'
    + (c.email ? '<div><span style="font-size:10px;color:var(--muted);display:block">Email</span><a href="mailto:'+esc(c.email)+'" style="font-size:12px;color:var(--deep);text-decoration:none;word-break:break-all">'+esc(c.email)+'</a></div>' : '')
    + (c.phone ? '<div><span style="font-size:10px;color:var(--muted);display:block">Phone</span><span style="font-size:12px;color:var(--deep)">'+esc(c.phone)+'</span></div>' : '')
    + '<div><span style="font-size:10px;color:var(--muted);display:block">Source</span><span style="font-size:12px;color:var(--deep)">'+cap(c.source||'—')+'</span></div>'
    + '<div><span style="font-size:10px;color:var(--muted);display:block">Client since</span><span style="font-size:12px;color:var(--deep)">'+crmFmtDate(c.createdAt)+'</span></div>'
    + '</div>'
    // Tags
    + crmSectionHd('Tags')
    + '<div style="margin-bottom:18px">'+tagHtml+'</div>'
    // Season details
    + (c.season
      ? '<div style="background:var(--warm);border-radius:10px;padding:12px;margin-bottom:18px;border:1px solid var(--sand)">'
        + crmSectionHd('Season Result')
        + '<div style="margin-bottom:8px"><span style="font-size:10px;color:var(--muted);display:block;margin-bottom:4px">Sister Seasons</span>'+sisterHtml+'</div>'
        + (c.seasonNotes ? '<div style="font-size:11px;color:var(--brown);line-height:1.55;margin-top:10px;padding-top:10px;border-top:1px solid var(--sand)">'+esc(c.seasonNotes)+'</div>' : '')
        + '</div>'
      : '')
    // Notes
    + crmSectionHd('Internal Notes')
    + (curUser==='latisha'
      ? '<textarea class="fi" style="width:100%;font-size:12px;resize:vertical;box-sizing:border-box;min-height:80px" placeholder="Private notes…" oninput="crmSaveNote(\''+c.id+'\',this.value)">'+esc(c.notes||'')+'</textarea>'
      : '<div style="font-size:12px;color:var(--brown)">'+esc(c.notes||'—')+'</div>');

  // ── CENTER: MESSAGE THREAD + COMPOSE ─────────────────
  var msgs = (c.correspondence||[]).slice(); // oldest first
  var CH_ICON = { email:'✉', sms:'💬' };
  var threadHtml = msgs.length
    ? msgs.map(function(m) {
        var outbound = m.direction !== 'inbound';
        return '<div style="margin-bottom:16px;display:flex;flex-direction:column;align-items:'+(outbound?'flex-end':'flex-start')+'">'
          + '<div style="font-size:10px;color:var(--muted);margin-bottom:4px">'
          +   (CH_ICON[m.channel]||'✉')+' '+(outbound?'You':'Client')+' · '+crmFmtDate((m.sentAt||'').split('T')[0])
          + '</div>'
          + '<div style="max-width:82%;background:'+(outbound?col:'white')+';color:'+(outbound?'white':'var(--deep)')+';'
          +   'border:1px solid '+(outbound?'transparent':'var(--sand)')+';'
          +   'border-radius:'+(outbound?'14px 14px 4px 14px':'14px 14px 14px 4px')+';padding:10px 14px">'
          +   (m.subject ? '<div style="font-size:11px;font-weight:700;margin-bottom:5px;opacity:.85">'+esc(m.subject)+'</div>' : '')
          +   '<div style="font-size:12px;line-height:1.65;white-space:pre-wrap">'+esc(m.body||'')+'</div>'
          + '</div>'
          + '</div>';
      }).join('')
    : '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px">No messages yet — send the first one below.</div>';

  var apiOk = !!localStorage.getItem('yszn_api_key');

  var centerCol =
    '<div id="crm-thread" style="flex:1;overflow-y:auto;padding:20px 20px 0;display:flex;flex-direction:column">'+threadHtml+'</div>'
    + (!apiOk && curUser==='latisha'
      ? '<div style="padding:8px 16px;background:#FEF3C7;border-top:1px solid #F59E0B;font-size:11px;color:#92400E;display:flex;align-items:center;gap:8px;flex-shrink:0">'
        + '⚠ Set up API key to enable sending. '
        + '<button onclick="openCRMApiConfig()" style="background:none;border:none;color:#D97706;text-decoration:underline;cursor:pointer;font-size:11px;padding:0">Configure →</button>'
        + '</div>'
      : '')
    + (curUser==='latisha'
      ? '<div style="padding:14px 16px;border-top:1px solid var(--sand);background:#FDFBF8;flex-shrink:0">'
        + '<div style="display:flex;gap:8px;margin-bottom:8px">'
        +   '<select class="fsel" id="crm-compose-channel" onchange="crmComposeToggleUI(this.value)" style="font-size:12px;flex-shrink:0">'
        +   '<option value="email">✉ Email</option><option value="sms">💬 SMS</option>'
        +   '</select>'
        +   '<input class="fi" id="crm-compose-to" value="'+esc(c.email||'')+'" placeholder="To" style="flex:1;font-size:12px">'
        + '</div>'
        + '<div id="crm-compose-subject-row" style="margin-bottom:8px">'
        +   '<input class="fi" id="crm-compose-subject" value="'+esc(c.season?'Your Colour Analysis — '+c.season:'Your Colour Analysis')+'" placeholder="Subject" style="font-size:12px">'
        + '</div>'
        + '<div style="display:flex;gap:8px;align-items:flex-end">'
        +   '<textarea class="fi" id="crm-compose-body" rows="3" placeholder="Type your message…" style="flex:1;font-size:12px;resize:none;line-height:1.5"></textarea>'
        +   '<button id="crm-compose-send-btn" onclick="crmInlineSend(\''+c.id+'\')" class="btn btnp" style="white-space:nowrap;align-self:flex-end;font-size:12px">Send</button>'
        + '</div>'
        + '<div style="color:#EF4444;font-size:11px;margin-top:5px;min-height:16px" id="crm-compose-err"></div>'
        + '</div>'
      : '');

  // ── RIGHT: PAYMENTS + SESSIONS ────────────────────────
  var payments  = c.payments || [];
  var totalPaid = payments.filter(function(p){ return p.status==='paid'; }).reduce(function(s,p){ return s+p.amount; },0);
  var totalPend = payments.filter(function(p){ return p.status==='pending'||p.status==='overdue'; }).reduce(function(s,p){ return s+p.amount; },0);
  var S = { paid:'background:#D1FAE5;color:#065F46', pending:'background:#FEF3C7;color:#92400E', overdue:'background:#FEE2E2;color:#991B1B', refunded:'background:#EDE9FE;color:#5B21B6' };

  var payList = payments.length
    ? payments.slice().reverse().map(function(p) {
        var ss = S[p.status]||S.pending;
        return '<div style="display:flex;align-items:flex-start;gap:8px;padding:9px 0;border-bottom:1px solid var(--warm)">'
          + '<div style="flex:1;min-width:0">'
          +   '<div style="font-size:13px;font-weight:600;color:var(--deep)">$'+p.amount.toFixed(2)+' <span style="font-size:10px;font-weight:400;color:var(--muted)">AUD</span></div>'
          +   '<div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(p.description||p.type||'—')+'</div>'
          +   '<div style="font-size:10px;color:var(--muted);margin-top:1px">'+crmFmtDate(p.date)+(p.invoiceRef?' · '+esc(p.invoiceRef):'')+'</div>'
          + '</div>'
          + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">'
          +   '<span style="font-size:10px;font-weight:700;border-radius:5px;padding:2px 7px;'+ss+'">'+p.status.toUpperCase()+'</span>'
          +   (p.status==='pending'||p.status==='overdue'
              ? '<button onclick="crmMarkPaid(\''+c.id+'\',\''+p.id+'\')" style="font-size:10px;padding:2px 8px;border:1px solid #6EE7B7;border-radius:5px;background:#D1FAE5;color:#065F46;cursor:pointer">✓ Paid</button>'
              : '')
          + '</div>'
          + '</div>';
      }).join('')
    : '<div style="font-size:12px;color:var(--muted);padding:10px 0;text-align:center">No payments yet.</div>';

  var sessList = (!c.sessions||!c.sessions.length)
    ? '<div style="font-size:12px;color:var(--muted);padding:10px 0;text-align:center">No sessions yet.</div>'
    : c.sessions.slice().reverse().map(function(s) {
        var sCol = crmSeasonColor(s.season||c.season);
        return '<div style="padding:9px 0;border-bottom:1px solid var(--warm)">'
          + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">'
          +   '<span style="font-size:10px;font-weight:700;color:white;background:'+sCol+';border-radius:5px;padding:1px 7px">'+(s.season||c.season||'—')+'</span>'
          +   '<span style="font-size:10px;color:var(--muted)">'+crmFmtDate(s.date)+'</span>'
          + '</div>'
          + '<div style="font-size:11px;color:var(--muted)">'+esc(s.type||'OCA')+'</div>'
          + (s.reportUrl ? '<a href="'+esc(s.reportUrl)+'" target="_blank" style="font-size:11px;color:var(--accent);text-decoration:none">↗ Report</a>' : '')
          + '</div>';
      }).join('');

  var rightCol =
    // Payment summary cards
    '<div style="display:flex;gap:8px;margin-bottom:12px">'
    + '<div style="flex:1;background:#D1FAE5;border-radius:8px;padding:9px 11px">'
    +   '<div style="font-size:15px;font-weight:700;color:#065F46;font-family:\'Cormorant Garamond\',serif">$'+totalPaid.toFixed(2)+'</div>'
    +   '<div style="font-size:10px;color:#065F46;opacity:.7;margin-top:1px">Total Paid</div>'
    + '</div>'
    + '<div style="flex:1;background:#FEF3C7;border-radius:8px;padding:9px 11px">'
    +   '<div style="font-size:15px;font-weight:700;color:#92400E;font-family:\'Cormorant Garamond\',serif">$'+totalPend.toFixed(2)+'</div>'
    +   '<div style="font-size:10px;color:#92400E;opacity:.7;margin-top:1px">Outstanding</div>'
    + '</div>'
    + '</div>'
    // Payments header + list
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
    + crmSectionHd('Transactions')
    + (curUser==='latisha' ? '<button onclick="openCRMPaymentModal(\''+c.id+'\')" class="btn btns" style="font-size:11px">+ Add</button>' : '')
    + '</div>'
    + '<div style="margin-bottom:22px">'+payList+'</div>'
    // Sessions header + list
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
    + crmSectionHd('Sessions')
    + (curUser==='latisha' ? '<button onclick="openAddSessionModal(\''+c.id+'\')" class="btn btns" style="font-size:11px">+ Add</button>' : '')
    + '</div>'
    + sessList;

  // ── Assemble full-page layout ─────────────────────────
  el.innerHTML =
    // Top bar
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
    + '<button onclick="closeCRMProfile()" style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);background:none;border:none;cursor:pointer;padding:5px 0;flex-shrink:0">← Clients</button>'
    + '<div style="height:16px;width:1px;background:var(--sand);flex-shrink:0"></div>'
    + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;color:var(--deep);font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(c.firstName+' '+c.lastName)+'</div>'
    + (c.season ? '<span style="font-size:11px;font-weight:600;color:white;background:'+col+';border-radius:8px;padding:3px 11px;flex-shrink:0">'+esc(c.season)+'</span>' : '')
    + (curUser==='latisha' ? '<button onclick="openCRMNewModal(\''+c.id+'\')" class="btn btns" style="font-size:12px;flex-shrink:0">✎ Edit</button>' : '')
    + '</div>'
    // 3-column panel
    + '<div style="display:flex;border:1px solid var(--sand);border-radius:14px;overflow:hidden;background:white;height:calc(100vh - 260px);min-height:500px">'
    + '<div style="width:250px;flex-shrink:0;border-right:1px solid var(--sand);padding:20px;overflow-y:auto;background:#FDFBF8">'+leftCol+'</div>'
    + '<div style="flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden">'+centerCol+'</div>'
    + '<div style="width:270px;flex-shrink:0;border-left:1px solid var(--sand);padding:20px;overflow-y:auto;background:#FDFBF8">'+rightCol+'</div>'
    + '</div>';
}

function closeCRMProfile() {
  crmOpenProfileId   = null;
  crmComposeClientId = null;
  renderCRMPage();
}

function crmSaveNote(id, val) {
  var c = crmClients.find(function(x){ return x.id===id; });
  if (c) { c.notes = val; saveData(); }
}

// ── Inline compose helpers ────────────────────────────
function crmComposeToggleUI(ch) {
  var subRow = document.getElementById('crm-compose-subject-row');
  if (subRow) subRow.style.display = ch==='email' ? 'block' : 'none';
  if (crmOpenProfileId) {
    var c = crmClients.find(function(x){ return x.id===crmOpenProfileId; });
    if (c) {
      var toEl = document.getElementById('crm-compose-to');
      if (toEl) toEl.value = ch==='sms' ? (c.phone||'') : (c.email||'');
    }
  }
  var btn = document.getElementById('crm-compose-send-btn');
  if (btn) btn.textContent = ch==='sms' ? 'Send SMS' : 'Send';
}

function crmInlineSend(clientId) {
  if (crmSending) return;
  var channel = ((document.getElementById('crm-compose-channel')||{}).value) || 'email';
  var to      = (((document.getElementById('crm-compose-to')||{}).value)||'').trim();
  var subject = (((document.getElementById('crm-compose-subject')||{}).value)||'').trim();
  var body    = (((document.getElementById('crm-compose-body')||{}).value)||'').trim();
  var errEl   = document.getElementById('crm-compose-err');

  if (errEl) errEl.textContent = '';
  if (!to)   { if (errEl) errEl.textContent = channel==='sms' ? 'Phone number required.' : 'Email address required.'; return; }
  if (!body) { if (errEl) errEl.textContent = 'Message cannot be empty.'; return; }

  var apiKey = localStorage.getItem('yszn_api_key') || '';
  if (!apiKey) {
    if (errEl) errEl.innerHTML = 'API key not set. <button onclick="openCRMApiConfig()" style="background:none;border:none;color:#D97706;text-decoration:underline;cursor:pointer;font-size:11px;padding:0">Configure →</button>';
    return;
  }

  var endpoint = channel==='sms' ? '/api/send-sms' : '/api/send-email';
  var payload  = channel==='sms' ? { to:to, body:body } : { to:to, subject:subject||'(no subject)', body:body };

  crmSending = true;
  var btn = document.getElementById('crm-compose-send-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  fetch(endpoint, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+apiKey },
    body: JSON.stringify(payload)
  })
  .then(function(r){ return r.json().then(function(d){ return {ok:r.ok,data:d}; }); })
  .then(function(res) {
    crmSending = false;
    if (!res.ok) {
      if (errEl) errEl.textContent = res.data.error || 'Send failed.';
      if (btn) { btn.disabled=false; btn.textContent='Send'; }
      return;
    }
    var c = crmClients.find(function(x){ return x.id===clientId; });
    if (c) {
      if (!c.correspondence) c.correspondence = [];
      c.correspondence.push({ id:'msg'+Date.now(), channel:channel, direction:'outbound', subject:subject, body:body, status:'sent', sentAt:new Date().toISOString() });
      saveData();
    }
    openCRMProfile(clientId);
  })
  .catch(function() {
    crmSending = false;
    if (errEl) errEl.textContent = 'Network error — check your connection.';
    if (btn) { btn.disabled=false; btn.textContent='Send'; }
  });
}

function openCRMApiConfig() {
  var current = localStorage.getItem('yszn_api_key') || '';
  var key = prompt('Paste your YSZN_API_SECRET (from Vercel Environment Variables):', current ? '••••••••' : '');
  if (key === null) return;
  key = key.trim();
  if (key && key !== '••••••••') { localStorage.setItem('yszn_api_key', key); alert('API key saved.'); }
  else if (!key) localStorage.removeItem('yszn_api_key');
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
  if (!amtRaw || isNaN(amt) || amt <= 0) { document.getElementById('crm-pay-err').textContent = 'Enter a valid amount.'; return; }
  var c = crmClients.find(function(x){ return x.id===crmPaymentClientId; });
  if (!c) return;
  if (!c.payments) c.payments = [];
  c.payments.push({
    id:'pay'+Date.now(), amount:amt, currency:'AUD',
    date:        document.getElementById('crm-pay-date').value   || todayISO(),
    type:        document.getElementById('crm-pay-type').value,
    status:      document.getElementById('crm-pay-status').value,
    description: document.getElementById('crm-pay-desc').value.trim(),
    invoiceRef:  document.getElementById('crm-pay-ref').value.trim()
  });
  closeCRMPaymentModal();
  saveData(); renderCRMPage();
  openCRMProfile(crmPaymentClientId);
}

function crmMarkPaid(clientId, payId) {
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c||!c.payments) return;
  c.payments = c.payments.map(function(p){ return p.id===payId ? Object.assign({},p,{status:'paid'}) : p; });
  saveData(); renderCRMPage();
  openCRMProfile(clientId);
}

function crmDeletePayment(clientId, payId) {
  if (!confirm('Remove this payment?')) return;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c||!c.payments) return;
  c.payments = c.payments.filter(function(p){ return p.id!==payId; });
  saveData(); renderCRMPage();
  openCRMProfile(clientId);
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
    date:      document.getElementById('crm-s-date').value   || todayISO(),
    type:      document.getElementById('crm-s-type').value,
    season:    season,
    notes:     document.getElementById('crm-s-notes').value.trim(),
    reportUrl: document.getElementById('crm-s-report').value.trim()
  });
  if (season && !c.season) c.season = season;
  closeCRMSessionModal();
  saveData(); renderCRMPage();
  openCRMProfile(crmSessionClientId);
}

function crmDeleteSession(clientId, sessId) {
  if (!confirm('Remove this session?')) return;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c||!c.sessions) return;
  c.sessions = c.sessions.filter(function(s){ return s.id!==sessId; });
  saveData(); renderCRMPage();
  openCRMProfile(clientId);
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
