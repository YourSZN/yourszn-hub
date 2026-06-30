// ════════════════════════════════════════════════════════
// CLIENT PROFILES CRM
// ════════════════════════════════════════════════════════

var crmClients = [];
var crmIdSeq   = 100;
var crmSearch  = '';
var crmSeasonFilter = '';
var crmTagFilter    = '';
var crmOpenProfileId = null;
var crmEditingId     = null;
var crmSessionClientId = null;

var CRM_SEASON_COLOR = {
  Summer: '#5B8DB8', Winter: '#7052A3', Autumn: '#B86E35', Spring: '#5E8F45'
};

function crmSeasonFamily(s) {
  if (!s) return '';
  if (s.indexOf('Summer') > -1) return 'Summer';
  if (s.indexOf('Winter') > -1) return 'Winter';
  if (s.indexOf('Autumn') > -1) return 'Autumn';
  if (s.indexOf('Spring') > -1) return 'Spring';
  return '';
}
function crmSeasonColor(s) {
  return CRM_SEASON_COLOR[crmSeasonFamily(s)] || '#9E8B7A';
}
function crmFmtDate(d) {
  if (!d) return '—';
  var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var p  = d.split('-'); if (p.length < 3) return d;
  return parseInt(p[2]) + ' ' + mo[parseInt(p[1])-1] + ' ' + p[0];
}

var CRM_SEASONS = [
  '','Light Spring','True Spring','Bright Spring',
  'Light Summer','True Summer','Soft Summer',
  'Soft Autumn','True Autumn','Dark Autumn',
  'Dark Winter','True Winter','Bright Winter'
];

// ════════════════════════════════════════════════════════
// MAIN LIST VIEW
// ════════════════════════════════════════════════════════

function renderCRMPage() {
  var el = document.getElementById('clients-profiles-panel');
  if (!el) return;

  // Filter
  var list = crmClients.filter(function(c) {
    var q = crmSearch.toLowerCase();
    var ok = !q ||
      (c.firstName + ' ' + c.lastName).toLowerCase().indexOf(q) > -1 ||
      (c.email  || '').toLowerCase().indexOf(q) > -1 ||
      (c.season || '').toLowerCase().indexOf(q) > -1 ||
      (c.tags   || []).some(function(t){ return t.indexOf(q) > -1; });
    if (!ok) return false;
    if (crmSeasonFilter && (c.season||'') !== crmSeasonFilter) return false;
    if (crmTagFilter    && (c.tags||[]).indexOf(crmTagFilter) === -1) return false;
    return true;
  });

  // All tags for filter pill
  var allTags = [];
  crmClients.forEach(function(c) {
    (c.tags||[]).forEach(function(t){ if (allTags.indexOf(t)===-1) allTags.push(t); });
  });
  allTags.sort();

  // ── Toolbar ──
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

  // ── Season family stats ──
  html +=
    '<div style="display:flex;gap:10px;margin-bottom:22px;flex-wrap:wrap">'
    + ['Summer','Winter','Autumn','Spring'].map(function(fam) {
        var n = crmClients.filter(function(c){ return crmSeasonFamily(c.season)===fam; }).length;
        return '<div style="flex:1;min-width:80px;background:white;border-radius:10px;padding:10px 14px;border:1px solid var(--sand);text-align:center;cursor:pointer'+(crmSeasonFilter && crmSeasonFamily(crmSeasonFilter)===fam?' outline:2px solid '+CRM_SEASON_COLOR[fam]:'')+'"">'
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

  // ── Client table ──
  var rows = list.map(function(c) {
    var col  = crmSeasonColor(c.season);
    var init = ((c.firstName||'').charAt(0) + (c.lastName||'').charAt(0)).toUpperCase() || '?';
    var lastSess = c.sessions && c.sessions.length ? c.sessions[c.sessions.length-1].date : '';
    var tagBadges = (c.tags||[]).slice(0,2).map(function(t){
      return '<span style="font-size:10px;background:var(--warm);border:1px solid var(--sand);border-radius:7px;padding:2px 6px;white-space:nowrap">'+esc(t)+'</span>';
    }).join(' ');
    var mailHref = c.email
      ? 'mailto:'+encodeURIComponent(c.email)
        +'?subject='+encodeURIComponent('Your Colour Analysis — '+(c.season||'YourSZN'))
        +'&body='+encodeURIComponent('Hi '+c.firstName+',\n\n')
      : '';

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
      + '<td style="padding:10px 12px 10px 0;font-size:11px;color:var(--muted);white-space:nowrap">'+crmFmtDate(lastSess)+'</td>'
      + '<td style="padding:10px 0;white-space:nowrap" onclick="event.stopPropagation()">'
      +   (mailHref ? '<a href="'+mailHref+'" style="font-size:11px;padding:4px 10px;border:1px solid var(--sand);border-radius:7px;background:white;color:var(--deep);text-decoration:none;margin-right:4px">✉ Email</a>' : '')
      +   (curUser==='latisha' ? '<button onclick="openCRMNewModal(\''+c.id+'\')" style="font-size:11px;padding:4px 10px;border:1px solid var(--sand);border-radius:7px;background:white;color:var(--muted);cursor:pointer">Edit</button>' : '')
      + '</td>'
      + '</tr>';
  }).join('');

  html +=
    '<div style="overflow-x:auto;border:1px solid var(--sand);border-radius:12px;background:white">'
    + '<table style="width:100%;border-collapse:collapse;padding:0 16px">'
    + '<thead><tr style="text-align:left;border-bottom:1px solid var(--sand)">'
    + ['','Name','Season','Phone','Tags','Last Session',''].map(function(h){
        return '<th style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:600;padding:10px 12px 10px '+(h===''?'0':'0')+'">'+h+'</th>';
      }).join('')
    + '</tr></thead>'
    + '<tbody style="padding:0 16px">'+rows+'</tbody>'
    + '</table></div>';

  el.innerHTML = html;
}

// ════════════════════════════════════════════════════════
// PROFILE SLIDE-IN PANEL
// ════════════════════════════════════════════════════════

function openCRMProfile(id) {
  var c = crmClients.find(function(x){ return x.id===id; });
  if (!c) return;
  crmOpenProfileId = id;

  var col  = crmSeasonColor(c.season);
  var fam  = crmSeasonFamily(c.season);
  var init = ((c.firstName||'').charAt(0) + (c.lastName||'').charAt(0)).toUpperCase() || '?';

  var sessHtml = '';
  if (!c.sessions || !c.sessions.length) {
    sessHtml = '<div style="color:var(--muted);font-size:13px;padding:10px 0">No sessions recorded yet.</div>';
  } else {
    sessHtml = c.sessions.slice().reverse().map(function(s) {
      var sCol = crmSeasonColor(s.season||c.season);
      return '<div style="border:1px solid var(--sand);border-radius:10px;padding:12px 14px;margin-bottom:10px;position:relative">'
        + '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:8px">'
        +   '<span style="font-size:11px;font-weight:700;color:white;background:'+sCol+';border-radius:7px;padding:2px 9px">'+(s.season||c.season||'')+'</span>'
        +   '<span style="font-size:11px;color:var(--muted)">'+crmFmtDate(s.date)+'</span>'
        +   '<span style="font-size:10px;background:var(--warm);border-radius:6px;padding:2px 7px;color:var(--deep)">'+esc(s.type||'OCA')+'</span>'
        + '</div>'
        + (s.notes ? '<div style="font-size:12px;color:var(--brown);line-height:1.6;margin-bottom:6px">'+esc(s.notes)+'</div>' : '')
        + (s.reportUrl ? '<a href="'+esc(s.reportUrl)+'" target="_blank" style="font-size:11px;color:var(--accent);text-decoration:none">↗ View Report</a>' : '')
        + (curUser==='latisha' ? '<button onclick="crmDeleteSession(\''+id+'\',\''+s.id+'\')" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:12px;color:var(--muted);cursor:pointer;padding:2px 6px">✕</button>' : '')
        + '</div>';
    }).join('');
  }

  var sisterHtml = (c.sisterSeasons && c.sisterSeasons.length)
    ? c.sisterSeasons.map(function(s){ return '<span style="font-size:11px;background:var(--warm);border-radius:8px;padding:3px 9px;border:1px solid var(--sand)">'+esc(s)+'</span>'; }).join(' ')
    : '<span style="color:var(--muted);font-size:12px">None recorded</span>';

  var tagHtml = (c.tags && c.tags.length)
    ? c.tags.map(function(t){ return '<span style="font-size:11px;background:#EDE9FE;color:#5B21B6;border-radius:8px;padding:3px 9px">'+esc(t)+'</span>'; }).join(' ')
    : '<span style="color:var(--muted);font-size:12px">No tags</span>';

  var mailHref = c.email
    ? 'mailto:'+encodeURIComponent(c.email)
      +'?subject='+encodeURIComponent('Your Colour Analysis — '+(c.season||'YourSZN'))
      +'&body='+encodeURIComponent('Hi '+c.firstName+',\n\nThank you for your recent colour analysis session!\n\nYour season is: '+(c.season||'[season]')+'.\n\nPlease find your colour report attached.\n\nWith love,\nLatisha\nYourSZN')
    : '';

  var panel = document.getElementById('crm-profile-panel');
  if (!panel) return;

  panel.innerHTML =
    // ── Header ──
    '<div style="background:'+col+';padding:24px 20px 18px;position:relative;flex-shrink:0">'
    + '<button onclick="closeCRMProfile()" style="position:absolute;top:12px;right:14px;background:rgba(255,255,255,.2);border:none;cursor:pointer;color:white;font-size:16px;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center">✕</button>'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">'
    +   '<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;color:white;font-family:\'Cormorant Garamond\',serif;font-size:22px;font-weight:600;flex-shrink:0">'+init+'</div>'
    +   '<div>'
    +     '<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;color:white;font-weight:600">'+esc(c.firstName+' '+c.lastName)+'</div>'
    +     (c.season ? '<div style="font-size:11px;color:rgba(255,255,255,.8);margin-top:3px">'+esc(c.season)+(fam?' · '+fam+' season':'')+'</div>' : '<div style="font-size:11px;color:rgba(255,255,255,.6)">No season recorded</div>')
    +   '</div>'
    + '</div>'
    + '<div style="display:flex;gap:7px;flex-wrap:wrap">'
    +   (mailHref ? '<a href="'+mailHref+'" style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:6px 13px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:8px;color:white;text-decoration:none">✉ Email</a>' : '')
    +   (curUser==='latisha' ? '<button onclick="openCRMNewModal(\''+c.id+'\')" style="font-size:12px;font-weight:600;padding:6px 13px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:8px;color:white;cursor:pointer">✎ Edit</button>' : '')
    +   (curUser==='latisha' ? '<button onclick="openAddSessionModal(\''+c.id+'\')" style="font-size:12px;font-weight:600;padding:6px 13px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:8px;color:white;cursor:pointer">+ Session</button>' : '')
    + '</div>'
    + '</div>'
    // ── Body ──
    + '<div style="padding:18px 20px;overflow-y:auto;flex:1">'
    // Contact
    + '<div style="margin-bottom:18px">'
    + crmSectionHd('Contact')
    + '<div style="display:flex;flex-direction:column;gap:7px">'
    +   (c.email ? '<div style="font-size:13px"><span style="color:var(--muted);display:inline-block;min-width:56px">Email</span><span style="color:var(--deep)">'+esc(c.email)+'</span></div>' : '')
    +   (c.phone ? '<div style="font-size:13px"><span style="color:var(--muted);display:inline-block;min-width:56px">Phone</span><span style="color:var(--deep)">'+esc(c.phone)+'</span></div>' : '')
    +   '<div style="font-size:13px"><span style="color:var(--muted);display:inline-block;min-width:56px">Source</span><span style="color:var(--deep)">'+cap(c.source||'—')+'</span></div>'
    +   '<div style="font-size:13px"><span style="color:var(--muted);display:inline-block;min-width:56px">Added</span><span style="color:var(--deep)">'+crmFmtDate(c.createdAt)+'</span></div>'
    + '</div>'
    + '</div>'
    // Tags
    + '<div style="margin-bottom:18px">'
    + crmSectionHd('Tags')
    + '<div style="display:flex;gap:6px;flex-wrap:wrap">'+tagHtml+'</div>'
    + '</div>'
    // Season
    + (c.season
      ? '<div style="margin-bottom:18px;background:var(--warm);border-radius:10px;padding:13px 15px;border:1px solid var(--sand)">'
      + crmSectionHd('Season Result')
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
      +   '<span style="font-size:13px;font-weight:700;color:white;background:'+col+';border-radius:8px;padding:4px 12px">'+esc(c.season)+'</span>'
      + '</div>'
      + '<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:6px">Sister Seasons</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap">'+sisterHtml+'</div>'
      + (c.seasonNotes ? '<div style="font-size:12px;color:var(--brown);margin-top:10px;line-height:1.55;padding-top:10px;border-top:1px solid var(--sand)">'+esc(c.seasonNotes)+'</div>' : '')
      + '</div>'
      : '')
    // Notes
    + '<div style="margin-bottom:18px">'
    + crmSectionHd('Internal Notes')
    + (curUser==='latisha'
      ? '<textarea class="fi" style="width:100%;font-size:12px;resize:vertical" rows="3" placeholder="Private notes…" oninput="crmSaveNote(\''+id+'\',this.value)">'+esc(c.notes||'')+'</textarea>'
      : '<div style="font-size:13px;color:var(--brown)">'+esc(c.notes||'—')+'</div>')
    + '</div>'
    // Sessions
    + '<div>'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
    + crmSectionHd('Sessions ('+(c.sessions?c.sessions.length:0)+')')
    + '</div>'
    + sessHtml
    + '</div>'
    + '</div>';

  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  document.getElementById('crm-overlay').style.display = 'block';
}

function closeCRMProfile() {
  crmOpenProfileId = null;
  var p = document.getElementById('crm-profile-panel'); if (p) p.style.display = 'none';
  var o = document.getElementById('crm-overlay');        if (o) o.style.display = 'none';
}

function crmSectionHd(t) {
  return '<div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);font-weight:600;margin-bottom:8px">'+t+'</div>';
}

function crmSaveNote(id, val) {
  var c = crmClients.find(function(x){ return x.id===id; });
  if (c) { c.notes = val; saveData(); }
}

// ════════════════════════════════════════════════════════
// NEW / EDIT CLIENT MODAL
// ════════════════════════════════════════════════════════

function openCRMNewModal(id) {
  if (curUser !== 'latisha') return;
  var c = id ? crmClients.find(function(x){ return x.id===id; }) : null;
  crmEditingId = id || null;

  document.getElementById('crm-m-heading').textContent = c ? 'Edit Client' : 'New Client';
  document.getElementById('crm-m-fname').value        = c ? c.firstName||''                  : '';
  document.getElementById('crm-m-lname').value        = c ? c.lastName||''                   : '';
  document.getElementById('crm-m-email').value        = c ? c.email||''                       : '';
  document.getElementById('crm-m-phone').value        = c ? c.phone||''                       : '';
  document.getElementById('crm-m-season').value       = c ? c.season||''                      : '';
  document.getElementById('crm-m-sisters').value      = c ? (c.sisterSeasons||[]).join(', ')  : '';
  document.getElementById('crm-m-tags').value         = c ? (c.tags||[]).join(', ')           : '';
  document.getElementById('crm-m-source').value       = c ? c.source||'online'                : 'online';
  document.getElementById('crm-m-season-notes').value = c ? c.seasonNotes||''                 : '';
  document.getElementById('crm-m-err').textContent    = '';
  document.getElementById('crm-m-del').style.display  = c ? 'inline-block' : 'none';
  document.getElementById('crm-modal').style.display  = 'flex';
}

function closeCRMModal() {
  document.getElementById('crm-modal').style.display = 'none';
}

function saveCRMClient() {
  var fname = document.getElementById('crm-m-fname').value.trim();
  if (!fname) { document.getElementById('crm-m-err').textContent = 'First name is required.'; return; }

  var tags    = (document.getElementById('crm-m-tags').value    || '').split(',').map(function(t){ return t.trim().toLowerCase(); }).filter(Boolean);
  var sisters = (document.getElementById('crm-m-sisters').value || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
  var exist   = crmEditingId ? crmClients.find(function(c){ return c.id===crmEditingId; }) : null;

  var obj = {
    id:            crmEditingId || ('c' + (crmIdSeq++)),
    firstName:     fname,
    lastName:      document.getElementById('crm-m-lname').value.trim(),
    email:         document.getElementById('crm-m-email').value.trim(),
    phone:         document.getElementById('crm-m-phone').value.trim(),
    season:        document.getElementById('crm-m-season').value,
    sisterSeasons: sisters,
    tags:          tags,
    source:        document.getElementById('crm-m-source').value,
    seasonNotes:   document.getElementById('crm-m-season-notes').value.trim(),
    notes:         exist ? (exist.notes||'') : '',
    sessions:      exist ? (exist.sessions||[]) : [],
    createdAt:     exist ? (exist.createdAt||todayISO()) : todayISO()
  };

  if (crmEditingId) {
    crmClients = crmClients.map(function(c){ return c.id===crmEditingId ? obj : c; });
  } else {
    crmClients.push(obj);
  }

  closeCRMModal();
  saveData();
  renderCRMPage();
  if (crmOpenProfileId === crmEditingId) openCRMProfile(crmEditingId);
}

function deleteCRMClient() {
  if (!crmEditingId || !confirm('Delete this client profile? This cannot be undone.')) return;
  crmClients = crmClients.filter(function(c){ return c.id!==crmEditingId; });
  closeCRMModal();
  closeCRMProfile();
  saveData();
  renderCRMPage();
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

function closeCRMSessionModal() {
  document.getElementById('crm-sess-modal').style.display = 'none';
}

function saveCRMSession() {
  var c = crmClients.find(function(x){ return x.id===crmSessionClientId; });
  if (!c) return;
  if (!c.sessions) c.sessions = [];
  var season = document.getElementById('crm-s-season').value;
  c.sessions.push({
    id:        'ss' + Date.now(),
    date:      document.getElementById('crm-s-date').value   || todayISO(),
    type:      document.getElementById('crm-s-type').value,
    season:    season,
    notes:     document.getElementById('crm-s-notes').value.trim(),
    reportUrl: document.getElementById('crm-s-report').value.trim()
  });
  if (season && !c.season) c.season = season;
  closeCRMSessionModal();
  saveData();
  renderCRMPage();
  openCRMProfile(crmSessionClientId);
}

function crmDeleteSession(clientId, sessId) {
  if (!confirm('Remove this session record?')) return;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c || !c.sessions) return;
  c.sessions = c.sessions.filter(function(s){ return s.id!==sessId; });
  saveData();
  openCRMProfile(clientId);
  renderCRMPage();
}

// ════════════════════════════════════════════════════════
// IMPORT FROM OCA SUBMISSIONS (ivoreyData)
// ════════════════════════════════════════════════════════

function crmImportIvorey() {
  if (typeof ivoreyData === 'undefined' || !ivoreyData.length) {
    alert('No OCA submissions found. Open the Online CA tab first so they can load, then try again.');
    return;
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
    var obj = {
      id:            'c' + (crmIdSeq++),
      firstName:     parts[0]||'',
      lastName:      parts.slice(1).join(' ')||'',
      email:         email,
      phone:         '',
      season:        season,
      sisterSeasons: [],
      tags:          ['online ca'].concat(season ? [season.toLowerCase()] : []),
      source:        'online',
      seasonNotes:   notes,
      notes:         '',
      sessions:      season ? [{ id:'ss'+Date.now()+'i'+imported, date:todayISO(), type:'Online CA', season:season, notes:notes, reportUrl:'' }] : [],
      createdAt:     todayISO()
    };
    crmClients.push(obj);
    imported++;
  });
  saveData();
  renderCRMPage();
  alert(imported + ' client' + (imported!==1?'s':'') + ' imported.');
}

// ── helper ──
function todayISO() { return new Date().toISOString().split('T')[0]; }
