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
var crmDocFormOpen     = false;
var crmComposeOpen     = false;

var CRM_SEASON_COLOR = {
  Summer: '#5B8DB8', Winter: '#7052A3', Autumn: '#B86E35', Spring: '#5E8F45'
};
var CRM_SEASONS = [
  '','Light Spring','True Spring','Bright Spring',
  'Light Summer','True Summer','Soft Summer',
  'Soft Autumn','True Autumn','Dark Autumn',
  'Dark Winter','True Winter','Bright Winter'
];
var CRM_CONTRAST = [
  { val:'very-low',  label:'Very Low',  dots:1 },
  { val:'low',       label:'Low',       dots:2 },
  { val:'medium',    label:'Medium',    dots:3 },
  { val:'high',      label:'High',      dots:4 },
  { val:'very-high', label:'Very High', dots:5 }
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
function crmFmtDateShort(d) {
  if (!d) return '—';
  var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var p = d.split('-'); if (p.length < 3) return d;
  return parseInt(p[2]) + ' ' + mo[parseInt(p[1])-1];
}
function todayISO() { return new Date().toISOString().split('T')[0]; }
function crmSectionHd(t) {
  return '<div class="crm-sec-hd">'+t+'</div>';
}

function crmContrastDisplay(level, col) {
  var map = {'very-low':1,'low':2,'medium':3,'high':4,'very-high':5};
  var n   = map[level] || 0;
  if (!n) return '<span style="color:var(--muted);font-size:12px">Not recorded</span>';
  var label = (CRM_CONTRAST[n-1]||{}).label || '';
  var dots  = '';
  for (var i=1; i<=5; i++) {
    dots += '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:3px;vertical-align:middle;background:'+(i<=n?col:'var(--sand)')+'"></span>';
  }
  return dots + '<span style="font-size:11px;color:var(--muted);vertical-align:middle;margin-left:4px">'+label+'</span>';
}

// ── Photo resize helper ───────────────────────────────
function crmResizeImage(file, maxW, maxH, cb) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      var scale = Math.min(maxW/w, maxH/h, 1);
      var canvas = document.createElement('canvas');
      canvas.width  = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      cb(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ════════════════════════════════════════════════════════
// MAIN LIST VIEW
// ════════════════════════════════════════════════════════

function renderCRMPage() {
  var el = document.getElementById('clients-profiles-panel');
  if (!el) return;
  crmOpenProfileId = null;
  crmComposeOpen   = false;

  var list = crmClients.filter(function(c) {
    var q = crmSearch.toLowerCase();
    var ok = !q ||
      (c.firstName+' '+c.lastName).toLowerCase().indexOf(q) > -1 ||
      (c.email||'').toLowerCase().indexOf(q) > -1 ||
      (c.season||'').toLowerCase().indexOf(q) > -1 ||
      (c.tags||[]).some(function(t){ return t.toLowerCase().indexOf(q) > -1; });
    if (!ok) return false;
    if (crmSeasonFilter && (c.season||'') !== crmSeasonFilter) return false;
    if (crmTagFilter    && (c.tags||[]).indexOf(crmTagFilter) === -1) return false;
    return true;
  });

  var allTags = [];
  crmClients.forEach(function(c) {
    (c.tags||[]).forEach(function(t){ if (t && allTags.indexOf(t)===-1) allTags.push(t); });
  });
  allTags.sort();

  var html =
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">'
    + '<div style="position:relative;flex:1;min-width:180px">'
    +   '<input class="fi" placeholder="Search by name, email, season or tag…" value="'+esc(crmSearch)+'" '
    +   'oninput="crmSearch=this.value;renderCRMPage()" style="font-size:13px;padding-right:30px">'
    +   (crmSearch ? '<button onclick="crmSearch=\'\';renderCRMPage()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);font-size:16px;line-height:1">×</button>' : '')
    + '</div>'
    + '<select class="fsel" onchange="crmSeasonFilter=this.value;renderCRMPage()" style="font-size:12px">'
    +   CRM_SEASONS.map(function(s){ return '<option value="'+s+'"'+(s===crmSeasonFilter?' selected':'')+'>'+(s||'All Seasons')+'</option>'; }).join('')
    + '</select>'
    + (typeof ivoreyData !== 'undefined' && ivoreyData.length && curUser==='latisha'
      ? '<button class="btn btns" onclick="crmImportIvorey()" style="font-size:12px;white-space:nowrap">↓ Import OCA</button>'
      : '')
    + '<button class="btn btnp" onclick="openCRMNewModal(null)" style="font-size:12px;white-space:nowrap">+ New Client</button>'
    + '</div>';

  if (allTags.length) {
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;align-items:center">'
      + '<span style="font-size:10px;color:var(--muted);letter-spacing:.5px;text-transform:uppercase;white-space:nowrap">Filter by tag:</span>';
    allTags.forEach(function(t) {
      var active = t === crmTagFilter;
      html += '<button onclick="crmTagFilter=\''+(active?'':t.replace(/'/g,"\\'"))+'\';renderCRMPage()" style="font-size:11px;border-radius:20px;padding:3px 11px;cursor:pointer;'
        + (active
          ? 'background:var(--deep);color:white;border:1px solid var(--deep)'
          : 'background:var(--warm);color:var(--deep);border:1px solid var(--sand)')
        + '">'+esc(t)+(active?' ×':'')+'</button>';
    });
    html += '</div>';
  }

  html +=
    '<div style="display:flex;gap:10px;margin-bottom:22px;flex-wrap:wrap">'
    + ['Summer','Winter','Autumn','Spring'].map(function(fam) {
        var n = crmClients.filter(function(c){ return crmSeasonFamily(c.season)===fam; }).length;
        return '<div style="flex:1;min-width:80px;background:white;border-radius:10px;padding:10px 14px;border:1px solid var(--sand);text-align:center">'
          + '<div style="font-size:20px;font-weight:700;color:'+CRM_SEASON_COLOR[fam]+';font-family:\'Fraunces\',serif">'+n+'</div>'
          + '<div style="font-size:10px;letter-spacing:.5px;color:var(--muted);margin-top:1px">'+fam+'</div>'
          + '</div>';
      }).join('')
    + '<div style="flex:1;min-width:80px;background:var(--deep);border-radius:10px;padding:10px 14px;border:1px solid var(--sand);text-align:center">'
    +   '<div style="font-size:20px;font-weight:700;color:white;font-family:\'Fraunces\',serif">'+crmClients.length+'</div>'
    +   '<div style="font-size:10px;letter-spacing:.5px;color:rgba(255,255,255,.6);margin-top:1px">Total</div>'
    + '</div>'
    + '</div>';

  if (!list.length) {
    el.innerHTML = html + '<div style="padding:60px 0;text-align:center;color:var(--muted);font-size:13px">'
      + (crmClients.length ? 'No clients match your search.' : 'No client profiles yet — click "+ New Client" to get started.')
      + '</div>';
    return;
  }

  var rows = list.map(function(c) {
    var col  = crmSeasonColor(c.season);
    var init = ((c.firstName||'').charAt(0)+(c.lastName||'').charAt(0)).toUpperCase() || '?';
    var lastSess = c.sessions&&c.sessions.length ? c.sessions[c.sessions.length-1].date : '';
    var outstanding = (c.payments||[])
      .filter(function(p){ return p.status==='pending'||p.status==='overdue'; })
      .reduce(function(s,p){ return s+p.amount; },0);
    var docCount   = (c.documents||[]).length;
    var photoCount = (c.photos||[]).length;

    var avatarInner = c.photoBase64
      ? '<img src="'+c.photoBase64+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
      : '<span style="font-family:\'Fraunces\',serif;font-size:16px;font-weight:600;color:white">'+init+'</span>';

    var tagBadges = (c.tags||[]).slice(0,3).map(function(t){
      var active = t === crmTagFilter;
      return '<span onclick="event.stopPropagation();crmTagFilter=\''+(active?'':t.replace(/'/g,"\\'"))+'\';renderCRMPage()" '
        + 'style="font-size:10px;border-radius:7px;padding:2px 7px;cursor:pointer;white-space:nowrap;'
        + (active ? 'background:var(--deep);color:white' : 'background:var(--warm);border:1px solid var(--sand);color:var(--deep)')
        + '">'+esc(t)+'</span>';
    }).join(' ');

    return '<tr onclick="openCRMProfile(\''+c.id+'\')" style="cursor:pointer;border-bottom:1px solid var(--warm)"'
      + ' onmouseover="this.style.background=\'#FBF8F4\'" onmouseout="this.style.background=\'\'">'
      + '<td style="padding:10px 10px 10px 0;width:44px">'
      +   '<div style="width:38px;height:38px;border-radius:50%;background:'+col+';display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">'+avatarInner+'</div>'
      + '</td>'
      + '<td style="padding:10px 12px 10px 0">'
      +   '<div style="display:flex;align-items:center;gap:6px">'
      +     '<span style="font-weight:600;color:var(--deep);font-size:13px">'+esc(c.firstName+' '+c.lastName)+'</span>'
      +     (docCount   ? '<span title="'+docCount+' document'+(docCount!==1?'s':'')+'" style="font-size:11px;color:var(--muted)">📎'+docCount+'</span>' : '')
      +     (photoCount ? '<span title="'+photoCount+' photo'+(photoCount!==1?'s':'')+'" style="font-size:11px;color:var(--muted)">🖼'+photoCount+'</span>' : '')
      +   '</div>'
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
  crmDocFormOpen     = false;
  crmComposeOpen     = (c.correspondence||[]).length > 0;

  var col  = crmSeasonColor(c.season);
  var init = ((c.firstName||'').charAt(0)+(c.lastName||'').charAt(0)).toUpperCase() || '?';

  // ── STATS (computed before render) ───────────────────
  var totalRev   = (c.payments||[]).filter(function(p){ return p.status==='paid'; }).reduce(function(s,p){ return s+p.amount; },0);
  var sessCount  = (c.sessions||[]).length;
  var lastMsg    = (c.correspondence||[]).slice().sort(function(a,b){ return (b.sentAt||'').localeCompare(a.sentAt||''); })[0];
  var lastContact = lastMsg ? crmFmtDateShort((lastMsg.sentAt||'').split('T')[0]) : '—';

  // ── LEFT: AVATAR + QUICK ACTIONS + CONTACT ───────────
  var avatarInner = c.photoBase64
    ? '<img src="'+c.photoBase64+'" style="width:100%;height:100%;object-fit:cover">'
    : '<span style="font-family:\'Fraunces\',serif;font-size:28px;font-weight:600;color:white">'+init+'</span>';

  var quickActions = curUser==='latisha'
    ? '<div style="display:flex;gap:6px;justify-content:center;margin-top:12px">'
    +   '<button onclick="crmExpandCompose(\'email\')" title="Send email" style="flex:1;font-size:11px;padding:6px 4px;border:1px solid var(--sand);border-radius:8px;background:white;cursor:pointer;color:var(--deep)">✉ Email</button>'
    +   '<button onclick="crmNewBookingModal(\''+c.id+'\')" title="Book appointment" style="flex:1;font-size:11px;padding:6px 4px;border:1px solid var(--sand);border-radius:8px;background:white;cursor:pointer;color:var(--deep)">📅 Book</button>'
    +   '<button onclick="openCRMPaymentModal(\''+c.id+'\')" title="Add payment" style="flex:1;font-size:11px;padding:6px 4px;border:1px solid var(--sand);border-radius:8px;background:white;cursor:pointer;color:var(--deep)">$ Pay</button>'
    + '</div>'
    : '';

  var avatarSection =
    '<div style="text-align:center;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid var(--sand)">'
    + '<div style="position:relative;width:72px;margin:0 auto 10px">'
    +   '<div style="width:72px;height:72px;border-radius:50%;background:'+col+';display:flex;align-items:center;justify-content:center;overflow:hidden">'+avatarInner+'</div>'
    +   (curUser==='latisha'
        ? '<label title="Change profile photo" style="position:absolute;bottom:0;right:-4px;cursor:pointer;background:white;border:1px solid var(--sand);border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,.12)">'
        +   '📷<input type="file" accept="image/*" style="display:none" onchange="crmUploadPhoto(event,\''+c.id+'\')">'
        + '</label>'
        : '')
    + '</div>'
    + '<div style="font-family:\'Fraunces\',serif;font-size:18px;font-weight:600;color:var(--deep);margin-bottom:6px">'+esc(c.firstName+' '+c.lastName)+'</div>'
    + (c.season
        ? '<span style="font-size:11px;font-weight:600;color:white;background:'+col+';border-radius:8px;padding:3px 12px">'+esc(c.season)+'</span>'
        : '<span style="font-size:11px;color:var(--muted);background:var(--warm);border:1px solid var(--sand);border-radius:8px;padding:3px 12px">Awaiting analysis</span>')
    + quickActions
    + '</div>';

  // Contact — phone as tel link
  var contactSection =
    crmSectionHd('Contact')
    + '<div style="display:flex;flex-direction:column;gap:9px;margin-bottom:18px">'
    + (c.email
      ? '<div><span style="font-size:10px;color:var(--muted);display:block">Email</span>'
      +   '<a href="mailto:'+esc(c.email)+'" style="font-size:12px;color:var(--deep);text-decoration:none;word-break:break-all">'+esc(c.email)+'</a></div>'
      : '')
    + (c.phone
      ? '<div><span style="font-size:10px;color:var(--muted);display:block">Phone</span>'
      +   '<a href="tel:'+esc(c.phone.replace(/\s/g,''))+'" style="font-size:12px;color:var(--deep);text-decoration:none">'+esc(c.phone)+'</a></div>'
      : '')
    + '<div><span style="font-size:10px;color:var(--muted);display:block">Source</span><span style="font-size:12px;color:var(--deep)">'+cap(c.source||'—')+'</span></div>'
    + '<div><span style="font-size:10px;color:var(--muted);display:block">Client since</span><span style="font-size:12px;color:var(--deep)">'+crmFmtDate(c.createdAt)+'</span></div>'
    + '</div>';

  // Tags — with inline add
  var tagHtml = (c.tags&&c.tags.length)
    ? c.tags.map(function(t){ return '<span onclick="closeCRMProfile();crmTagFilter=\''+t.replace(/'/g,"\\'")+'\';" title="Filter by: '+esc(t)+'" style="font-size:11px;background:#EDE9FE;color:#5B21B6;border-radius:8px;padding:3px 9px;display:inline-block;margin:2px;cursor:pointer">'+esc(t)+'</span>'; }).join('')
    : '';
  var tagsSection = crmSectionHd('Tags')
    + '<div style="margin-bottom:18px">'
    + (tagHtml || '<span style="color:var(--muted);font-size:12px">No tags</span>')
    + (curUser==='latisha'
      ? '<button onclick="crmQuickAddTag(\''+c.id+'\')" style="font-size:11px;background:none;border:1px dashed var(--sand);border-radius:8px;padding:2px 9px;cursor:pointer;color:var(--muted);margin:2px;display:inline-block">+ tag</button>'
      : '')
    + '</div>';

  // Season section — better empty state
  var sisterHtml = (c.sisterSeasons&&c.sisterSeasons.length)
    ? c.sisterSeasons.map(function(s){ return '<span style="font-size:11px;background:var(--warm);border-radius:8px;padding:2px 8px;border:1px solid var(--sand);display:inline-block;margin:2px">'+esc(s)+'</span>'; }).join('')
    : '<span style="color:var(--muted);font-size:12px">None recorded</span>';

  var seasonSection = c.season
    ? '<div style="background:var(--warm);border-radius:10px;padding:12px;margin-bottom:18px;border:1px solid var(--sand)">'
      + crmSectionHd('Season Result')
      + '<div style="margin-bottom:10px"><span style="font-size:10px;color:var(--muted);display:block;margin-bottom:4px">Sister Seasons</span>'+sisterHtml+'</div>'
      + '<div style="margin-bottom:'+(c.seasonNotes?'10':'0')+'px"><span style="font-size:10px;color:var(--muted);display:block;margin-bottom:5px">Contrast Level</span>'
      +   crmContrastDisplay(c.contrastLevel||'', col)
      + '</div>'
      + (c.seasonNotes ? '<div style="font-size:11px;color:var(--brown);line-height:1.55;padding-top:10px;border-top:1px solid var(--sand)">'+esc(c.seasonNotes)+'</div>' : '')
      + '</div>'
    : (curUser==='latisha'
        ? '<div style="background:var(--warm);border-radius:10px;padding:12px;margin-bottom:18px;border:1px dashed var(--sand);text-align:center">'
        +   '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">No season recorded yet</div>'
        +   '<button onclick="openCRMNewModal(\''+c.id+'\')" style="font-size:11px;padding:4px 12px;border:1px solid var(--sand);border-radius:7px;background:white;cursor:pointer;color:var(--brown)">Add season result</button>'
        + '</div>'
        : '');

  var notesSection =
    crmSectionHd('Internal Notes')
    + (curUser==='latisha'
      ? '<textarea class="fi" style="width:100%;font-size:12px;resize:vertical;box-sizing:border-box;min-height:80px" placeholder="Private notes…" oninput="crmSaveNote(\''+c.id+'\',this.value)">'+esc(c.notes||'')+'</textarea>'
      : '<div style="font-size:12px;color:var(--brown)">'+esc(c.notes||'—')+'</div>');

  // Photo gallery
  var photos = c.photos || [];
  var photoSection =
    '<div style="margin-top:18px;padding-top:18px;border-top:1px solid var(--sand)">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    + crmSectionHd('Photos'+(photos.length?' ('+photos.length+')':''))
    + (curUser==='latisha'
      ? '<label style="font-size:11px;color:var(--accent);cursor:pointer;border:1px solid var(--sand);border-radius:7px;padding:2px 9px;white-space:nowrap;background:white">'
      +   '+ Add<input type="file" accept="image/*" style="display:none" onchange="crmAddPhoto(event,\''+c.id+'\')">'
      + '</label>'
      : '')
    + '</div>'
    + (photos.length
      ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
        + photos.map(function(ph) {
            return '<div style="position:relative;border-radius:8px;overflow:hidden;aspect-ratio:1;background:var(--warm)">'
              + '<img src="'+ph.base64+'" style="width:100%;height:100%;object-fit:cover" title="'+esc(ph.name)+'">'
              + (curUser==='latisha'
                ? '<button onclick="crmDeletePhoto(\''+c.id+'\',\''+ph.id+'\')" title="Remove" style="position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.5);border:none;color:white;font-size:11px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center">×</button>'
                : '')
              + '</div>';
          }).join('')
        + '</div>'
      : '<div style="font-size:12px;color:var(--muted);text-align:center;padding:10px 0">No photos yet.</div>')
    + '</div>';

  var leftCol = avatarSection + contactSection + tagsSection + seasonSection + notesSection + photoSection;

  // ── CENTER: MESSAGE THREAD + COMPOSE ─────────────────
  var msgs = (c.correspondence||[]).slice();

  // Build thread with date separators
  var threadHtml = '';
  if (msgs.length) {
    var lastDateLabel = '';
    var CH_ICON = { email:'✉', sms:'💬' };
    msgs.forEach(function(m) {
      var dateLabel = (m.sentAt||'').split('T')[0];
      if (dateLabel && dateLabel !== lastDateLabel) {
        threadHtml += '<div style="text-align:center;margin:12px 0 16px">'
          + '<span style="font-size:10px;color:var(--muted);background:var(--warm);border:1px solid var(--sand);border-radius:20px;padding:2px 12px">'+crmFmtDate(dateLabel)+'</span>'
          + '</div>';
        lastDateLabel = dateLabel;
      }
      var outbound = m.direction !== 'inbound';
      threadHtml += '<div style="margin-bottom:16px;display:flex;flex-direction:column;align-items:'+(outbound?'flex-end':'flex-start')+'">'
        + '<div style="font-size:10px;color:var(--muted);margin-bottom:4px">'
        +   (CH_ICON[m.channel]||'✉')+' '+(outbound?'You':'Client')
        + '</div>'
        + '<div style="max-width:82%;background:'+(outbound?col:'white')+';color:'+(outbound?'white':'var(--deep)')+';'
        +   'border:1px solid '+(outbound?'transparent':'var(--sand)')+';'
        +   'border-radius:'+(outbound?'14px 14px 4px 14px':'14px 14px 14px 4px')+';padding:10px 14px">'
        +   (m.subject ? '<div style="font-size:11px;font-weight:700;margin-bottom:5px;opacity:.85">'+esc(m.subject)+'</div>' : '')
        +   '<div style="font-size:12px;line-height:1.65;white-space:pre-wrap">'+esc(m.body||'')+'</div>'
        + '</div>'
        + '</div>';
    });
  } else {
    threadHtml = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:160px;gap:8px">'
      + '<div style="font-size:28px;opacity:.3">✉</div>'
      + '<div style="font-size:13px;color:var(--muted)">No messages yet</div>'
      + (curUser==='latisha' ? '<button onclick="crmExpandCompose(\'email\')" style="margin-top:4px;font-size:12px;padding:6px 16px;border:1px solid var(--sand);border-radius:8px;background:white;cursor:pointer;color:var(--deep)">Write first message</button>' : '')
      + '</div>';
  }

  var apiOk = !!localStorage.getItem('yszn_api_key');

  // Compose area: collapsed placeholder or full UI
  var composePlaceholder = curUser==='latisha' && !crmComposeOpen
    ? '<div id="crm-compose-placeholder" onclick="crmExpandCompose(\'email\')" '
    +   'style="padding:10px 16px;border-top:1px solid var(--sand);background:#FDFBF8;cursor:text;flex-shrink:0;display:flex;align-items:center;gap:8px">'
    +   '<div style="width:28px;height:28px;border-radius:50%;background:'+col+';display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;color:white">'+init+'</div>'
    +   '<div style="flex:1;font-size:13px;color:var(--muted);padding:7px 12px;background:white;border:1px solid var(--sand);border-radius:20px">Write a message to '+esc(c.firstName)+'…</div>'
    + '</div>'
    : '';

  var composeFull = curUser==='latisha'
    ? '<div id="crm-compose-full" style="padding:12px 16px;border-top:1px solid var(--sand);background:#FDFBF8;flex-shrink:0;'+(crmComposeOpen?'':'display:none')+'">'
    + (!apiOk
      ? '<div style="padding:6px 10px;background:#FEF3C7;border-radius:7px;font-size:11px;color:#92400E;margin-bottom:8px;display:flex;align-items:center;gap:6px">'
      +   '⚠ API key needed to send. '
      +   '<button onclick="openCRMApiConfig()" style="background:none;border:none;color:#D97706;text-decoration:underline;cursor:pointer;font-size:11px;padding:0">Configure →</button>'
      + '</div>'
      : '')
    + '<div style="display:flex;gap:8px;margin-bottom:8px">'
    +   '<select class="fsel" id="crm-compose-channel" onchange="crmComposeToggleUI(this.value)" style="font-size:12px;flex-shrink:0">'
    +   '<option value="email">✉ Email</option><option value="sms">💬 SMS</option>'
    +   '</select>'
    +   '<input class="fi" id="crm-compose-to" value="'+esc(c.email||'')+'" placeholder="To" style="flex:1;font-size:12px">'
    +   '<button onclick="crmCollapseCompose()" style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;padding:0 4px;flex-shrink:0" title="Close">×</button>'
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
    : '';

  // Log reply button (only when there are messages or compose is open)
  var logReplyBtn = curUser==='latisha' && msgs.length
    ? '<div style="text-align:center;padding:8px 0;border-top:1px solid var(--warm)">'
    +   '<button onclick="crmLogReply(\''+c.id+'\')" style="font-size:11px;color:var(--muted);background:none;border:none;cursor:pointer;text-decoration:underline">+ Log a reply received</button>'
    + '</div>'
    : '';

  var centerCol =
    '<div id="crm-thread" style="flex:1;overflow-y:auto;padding:20px 20px 0">'+threadHtml+'</div>'
    + logReplyBtn
    + composePlaceholder
    + composeFull;

  // ── RIGHT: STATS + PAYMENTS + SESSIONS + APPOINTMENTS + DOCUMENTS ──
  var payments  = c.payments || [];
  var totalPaid = payments.filter(function(p){ return p.status==='paid'; }).reduce(function(s,p){ return s+p.amount; },0);
  var totalPend = payments.filter(function(p){ return p.status==='pending'||p.status==='overdue'; }).reduce(function(s,p){ return s+p.amount; },0);
  var bothZero  = totalPaid === 0 && totalPend === 0;
  var S = { paid:'background:#D1FAE5;color:#065F46', pending:'background:#FEF3C7;color:#92400E', overdue:'background:#FEE2E2;color:#991B1B', refunded:'background:#EDE9FE;color:#5B21B6' };

  var statCards =
    '<div style="display:flex;gap:8px;margin-bottom:18px">'
    + '<div style="flex:1;background:'+(bothZero?'var(--warm)':'#D1FAE5')+';border-radius:8px;padding:9px 11px;border:1px solid '+(bothZero?'var(--sand)':'#6EE7B7')+'">'
    +   '<div style="font-size:15px;font-weight:700;color:'+(bothZero?'var(--muted)':'#065F46')+';font-family:\'Fraunces\',serif">$'+totalPaid.toFixed(0)+'</div>'
    +   '<div style="font-size:10px;color:'+(bothZero?'var(--muted)':'#065F46')+';opacity:.8;margin-top:1px">Total Paid</div>'
    + '</div>'
    + '<div style="flex:1;background:'+(totalPend>0?'#FEF3C7':'var(--warm)')+';border-radius:8px;padding:9px 11px;border:1px solid '+(totalPend>0?'#FCD34D':'var(--sand)')+'">'
    +   '<div style="font-size:15px;font-weight:700;color:'+(totalPend>0?'#92400E':'var(--muted)')+';font-family:\'Fraunces\',serif">$'+totalPend.toFixed(0)+'</div>'
    +   '<div style="font-size:10px;color:'+(totalPend>0?'#92400E':'var(--muted)')+';opacity:.8;margin-top:1px">Outstanding</div>'
    + '</div>'
    + '</div>';

  var payList = payments.length
    ? payments.slice().reverse().map(function(p) {
        var ss = S[p.status]||S.pending;
        return '<div style="display:flex;align-items:flex-start;gap:8px;padding:9px 0;border-bottom:1px solid var(--warm)">'
          + '<div style="flex:1;min-width:0">'
          +   '<div style="font-size:13px;font-weight:600;color:var(--deep)">$'+p.amount.toFixed(2)+' <span style="font-size:10px;font-weight:400;color:var(--muted)">AUD</span></div>'
          +   '<div style="font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(p.description||p.type||'—')+'</div>'
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

  // Documents
  var docs    = c.documents || [];
  var docIcons = { pdf:'📄', image:'🖼', link:'🔗', other:'📎' };
  var docList = docs.length
    ? docs.map(function(d) {
        return '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--warm)">'
          + '<span style="font-size:16px;flex-shrink:0">'+(docIcons[d.type]||'📎')+'</span>'
          + '<div style="flex:1;min-width:0">'
          +   '<a href="'+esc(d.url)+'" target="_blank" rel="noopener" style="font-size:12px;color:var(--deep);text-decoration:none;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(d.name)+'">'+esc(d.name)+'</a>'
          +   '<div style="font-size:10px;color:var(--muted)">'+crmFmtDate(d.addedAt)+'</div>'
          + '</div>'
          + (curUser==='latisha'
            ? '<button onclick="crmDeleteDocument(\''+c.id+'\',\''+d.id+'\')" style="border:none;background:none;color:var(--muted);font-size:14px;cursor:pointer;flex-shrink:0;padding:0 2px">×</button>'
            : '')
          + '</div>';
      }).join('')
    : '<div style="font-size:12px;color:var(--muted);padding:8px 0;text-align:center">No documents yet.</div>';

  var docsSection =
    '<div style="margin-bottom:8px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
    + crmSectionHd('Documents'+(docs.length?' ('+docs.length+')':''))
    + (curUser==='latisha' ? '<button onclick="crmToggleDocForm()" class="btn btns" style="font-size:11px">+ Add</button>' : '')
    + '</div>'
    + docList
    + '<div id="crm-doc-form" style="display:none;margin-top:8px;background:var(--warm);border-radius:8px;padding:10px;border:1px solid var(--sand)">'
    + '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">'
    +   '<input class="fi" id="crm-doc-name" placeholder="Document name" style="font-size:12px">'
    +   '<input class="fi" id="crm-doc-url" placeholder="Paste link (Google Drive, Dropbox…)" style="font-size:12px">'
    +   '<select class="fsel" id="crm-doc-type" style="font-size:12px">'
    +     '<option value="pdf">PDF</option><option value="image">Image</option><option value="link">Link</option><option value="other">Other</option>'
    +   '</select>'
    + '</div>'
    + '<div style="display:flex;gap:6px">'
    +   '<button onclick="crmAddDocument(\''+c.id+'\')" class="btn btnp" style="font-size:12px;flex:1">Save</button>'
    +   '<button onclick="crmToggleDocForm()" class="btn btns" style="font-size:12px">Cancel</button>'
    + '</div>'
    + '</div>'
    + '</div>';

  var rightCol =
    statCards
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
    + crmSectionHd('Transactions')
    + (curUser==='latisha' ? '<button onclick="openCRMPaymentModal(\''+c.id+'\')" class="btn btns" style="font-size:11px">+ Add</button>' : '')
    + '</div>'
    + '<div style="margin-bottom:22px">'+payList+'</div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
    + crmSectionHd('Sessions')
    + (curUser==='latisha' ? '<button onclick="openAddSessionModal(\''+c.id+'\')" class="btn btns" style="font-size:11px">+ Add</button>' : '')
    + '</div>'
    + '<div style="margin-bottom:22px">'+sessList+'</div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
    + crmSectionHd('Appointments')
    + (curUser==='latisha' ? '<button onclick="crmNewBookingModal(\''+c.id+'\')" class="btn btns" style="font-size:11px">+ Book</button>' : '')
    + '</div>'
    + '<div id="crm-appt-section" style="margin-bottom:22px"><div style="font-size:12px;color:var(--muted);text-align:center;padding:10px 0">Loading…</div></div>'
    + docsSection;

  // ── Assemble ──────────────────────────────────────────
  // Stats strip below breadcrumb
  var statsStrip =
    '<div style="display:flex;gap:0;margin-bottom:14px;background:white;border:1px solid var(--sand);border-radius:10px;overflow:hidden">'
    + [
        { label:'Revenue', val: totalRev > 0 ? '$'+totalRev.toFixed(0) : '—' },
        { label:'Sessions', val: sessCount > 0 ? String(sessCount) : '—' },
        { label:'Last contact', val: lastContact }
      ].map(function(s, i, arr) {
        return '<div style="flex:1;padding:9px 12px;'+(i<arr.length-1?'border-right:1px solid var(--sand)':'')+';text-align:center">'
          + '<div style="font-size:10px;color:var(--muted);letter-spacing:.5px;text-transform:uppercase;margin-bottom:2px">'+s.label+'</div>'
          + '<div style="font-size:15px;font-weight:600;color:var(--deep);font-family:\'Fraunces\',serif">'+s.val+'</div>'
          + '</div>';
      }).join('')
    + '</div>';

  el.innerHTML =
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">'
    + '<button onclick="closeCRMProfile()" style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);background:none;border:none;cursor:pointer;padding:5px 0;flex-shrink:0">← Clients</button>'
    + '<div style="height:16px;width:1px;background:var(--sand);flex-shrink:0"></div>'
    + '<div style="font-family:\'Fraunces\',serif;font-size:20px;color:var(--deep);font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(c.firstName+' '+c.lastName)+'</div>'
    + (c.season ? '<span style="font-size:11px;font-weight:600;color:white;background:'+col+';border-radius:8px;padding:3px 11px;flex-shrink:0">'+esc(c.season)+'</span>' : '')
    + (curUser==='latisha' ? '<button onclick="openCRMNewModal(\''+c.id+'\')" class="btn btns" style="font-size:12px;flex-shrink:0">✎ Edit</button>' : '')
    + '</div>'
    + statsStrip
    + '<div style="display:flex;border:1px solid var(--sand);border-radius:14px;overflow:hidden;background:white;height:calc(100vh - 290px);min-height:480px">'
    + '<div style="width:250px;flex-shrink:0;border-right:1px solid var(--sand);padding:20px;overflow-y:auto;background:#FDFBF8">'+leftCol+'</div>'
    + '<div style="flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden">'+centerCol+'</div>'
    + '<div style="width:280px;flex-shrink:0;border-left:1px solid var(--sand);padding:20px;overflow-y:auto;background:#FDFBF8">'+rightCol+'</div>'
    + '</div>';

  crmLoadAppointments(id);
}

function closeCRMProfile() {
  crmOpenProfileId   = null;
  crmComposeClientId = null;
  crmComposeOpen     = false;
  renderCRMPage();
}

function crmSaveNote(id, val) {
  var c = crmClients.find(function(x){ return x.id===id; });
  if (c) { c.notes = val; saveData(); }
}

// ── Compose expand / collapse ─────────────────────────
function crmExpandCompose(channel) {
  crmComposeOpen = true;
  var placeholder = document.getElementById('crm-compose-placeholder');
  var full        = document.getElementById('crm-compose-full');
  if (placeholder) placeholder.style.display = 'none';
  if (full)        full.style.display = 'block';
  if (channel) {
    var sel = document.getElementById('crm-compose-channel');
    if (sel) { sel.value = channel; crmComposeToggleUI(channel); }
  }
  setTimeout(function() {
    var b = document.getElementById('crm-compose-body');
    if (b) b.focus();
  }, 60);
}

function crmCollapseCompose() {
  crmComposeOpen = false;
  var placeholder = document.getElementById('crm-compose-placeholder');
  var full        = document.getElementById('crm-compose-full');
  if (placeholder) placeholder.style.display = 'flex';
  if (full)        full.style.display = 'none';
}

// ── Log inbound reply ─────────────────────────────────
function crmLogReply(clientId) {
  var old = document.getElementById('crm-log-reply-modal');
  if (old) old.remove();
  var modal = document.createElement('div');
  modal.id = 'crm-log-reply-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(28,23,18,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.onclick = function(e){ if(e.target===modal) modal.remove(); };
  modal.innerHTML =
    '<div style="background:white;border-radius:16px;padding:28px;width:400px;max-width:92vw">'
    + '<div style="font-family:\'Fraunces\',serif;font-size:20px;color:var(--deep);margin-bottom:16px">Log a received reply</div>'
    + '<div class="fg" style="margin-bottom:10px"><label class="fl">Channel</label>'
    +   '<select class="fsel" id="lr-channel" style="font-size:13px"><option value="email">Email</option><option value="sms">SMS</option></select></div>'
    + '<div class="fg" style="margin-bottom:10px"><label class="fl">Subject (optional)</label>'
    +   '<input class="fi" id="lr-subject" placeholder="Re: Your Colour Analysis" style="font-size:13px"></div>'
    + '<div class="fg" style="margin-bottom:16px"><label class="fl">Message</label>'
    +   '<textarea class="fi" id="lr-body" rows="4" placeholder="What did the client say?" style="font-size:13px;resize:none"></textarea></div>'
    + '<div style="display:flex;gap:10px;justify-content:flex-end">'
    +   '<button onclick="document.getElementById(\'crm-log-reply-modal\').remove()" class="btn btns">Cancel</button>'
    +   '<button onclick="crmSaveLogReply(\''+clientId+'\')" class="btn btnp">Save</button>'
    + '</div></div>';
  document.body.appendChild(modal);
  setTimeout(function(){ var b=document.getElementById('lr-body'); if(b) b.focus(); }, 60);
}

function crmSaveLogReply(clientId) {
  var channel = (document.getElementById('lr-channel')||{}).value || 'email';
  var subject = ((document.getElementById('lr-subject')||{}).value||'').trim();
  var body    = ((document.getElementById('lr-body')||{}).value||'').trim();
  if (!body) return;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c) return;
  if (!c.correspondence) c.correspondence = [];
  c.correspondence.push({ id:'msg'+Date.now(), channel:channel, direction:'inbound', subject:subject, body:body, status:'received', sentAt:new Date().toISOString() });
  saveData();
  var m = document.getElementById('crm-log-reply-modal');
  if (m) m.remove();
  openCRMProfile(clientId);
}

// ── Quick add tag ─────────────────────────────────────
function crmQuickAddTag(clientId) {
  var tag = prompt('Add tag:');
  if (!tag) return;
  tag = tag.trim().toLowerCase();
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c||!tag) return;
  if (!c.tags) c.tags = [];
  if (c.tags.indexOf(tag) === -1) c.tags.push(tag);
  saveData(); openCRMProfile(clientId);
}

// ── Photo handlers ────────────────────────────────────
function crmUploadPhoto(event, clientId) {
  var file = event.target.files[0];
  if (!file) return;
  crmResizeImage(file, 400, 400, function(dataUrl) {
    var c = crmClients.find(function(x){ return x.id===clientId; });
    if (!c) return;
    c.photoBase64 = dataUrl;
    saveData(); openCRMProfile(clientId);
  });
}

function crmAddPhoto(event, clientId) {
  var file = event.target.files[0];
  if (!file) return;
  crmResizeImage(file, 900, 900, function(dataUrl) {
    var c = crmClients.find(function(x){ return x.id===clientId; });
    if (!c) return;
    if (!c.photos) c.photos = [];
    c.photos.push({ id:'ph'+Date.now(), name:file.name, base64:dataUrl, addedAt:todayISO() });
    saveData(); openCRMProfile(clientId);
  });
}

function crmDeletePhoto(clientId, photoId) {
  if (!confirm('Remove this photo?')) return;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c||!c.photos) return;
  c.photos = c.photos.filter(function(p){ return p.id!==photoId; });
  saveData(); openCRMProfile(clientId);
}

// ── Document handlers ─────────────────────────────────
function crmToggleDocForm() {
  var f = document.getElementById('crm-doc-form');
  if (!f) return;
  crmDocFormOpen = !crmDocFormOpen;
  f.style.display = crmDocFormOpen ? 'block' : 'none';
  if (crmDocFormOpen) { var n = document.getElementById('crm-doc-name'); if (n) n.focus(); }
}

function crmAddDocument(clientId) {
  var nameEl = document.getElementById('crm-doc-name');
  var urlEl  = document.getElementById('crm-doc-url');
  var typeEl = document.getElementById('crm-doc-type');
  var name   = nameEl ? nameEl.value.trim() : '';
  var url    = urlEl  ? urlEl.value.trim()  : '';
  if (!name) { if (nameEl) nameEl.focus(); return; }
  if (!url)  { if (urlEl)  urlEl.focus();  return; }
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c) return;
  if (!c.documents) c.documents = [];
  c.documents.push({ id:'doc'+Date.now(), name:name, url:url, type:typeEl?typeEl.value:'other', addedAt:todayISO() });
  saveData(); openCRMProfile(clientId);
}

function crmDeleteDocument(clientId, docId) {
  if (!confirm('Remove this document link?')) return;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c||!c.documents) return;
  c.documents = c.documents.filter(function(d){ return d.id!==docId; });
  saveData(); openCRMProfile(clientId);
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
    crmComposeOpen = false;
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
  saveData(); openCRMProfile(crmPaymentClientId);
}

function crmMarkPaid(clientId, payId) {
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c||!c.payments) return;
  c.payments = c.payments.map(function(p){ return p.id===payId ? Object.assign({},p,{status:'paid'}) : p; });
  saveData(); openCRMProfile(clientId);
}

function crmDeletePayment(clientId, payId) {
  if (!confirm('Remove this payment?')) return;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c||!c.payments) return;
  c.payments = c.payments.filter(function(p){ return p.id!==payId; });
  saveData(); openCRMProfile(clientId);
}

// ════════════════════════════════════════════════════════
// NEW / EDIT CLIENT MODAL
// ════════════════════════════════════════════════════════

function openCRMNewModal(id) {
  if (curUser !== 'latisha') return;
  var c = id ? crmClients.find(function(x){ return x.id===id; }) : null;
  crmEditingId = id || null;
  document.getElementById('crm-m-heading').textContent  = c ? 'Edit Client' : 'New Client';
  document.getElementById('crm-m-fname').value          = c ? c.firstName||''                    : '';
  document.getElementById('crm-m-lname').value          = c ? c.lastName||''                     : '';
  document.getElementById('crm-m-email').value          = c ? c.email||''                        : '';
  document.getElementById('crm-m-phone').value          = c ? c.phone||''                        : '';
  document.getElementById('crm-m-season').value         = c ? c.season||''                       : '';
  document.getElementById('crm-m-sisters').value        = c ? (c.sisterSeasons||[]).join(', ')   : '';
  document.getElementById('crm-m-season-notes').value   = c ? c.seasonNotes||''                  : '';
  document.getElementById('crm-m-contrast').value       = c ? c.contrastLevel||''                : '';
  document.getElementById('crm-m-tags').value           = c ? (c.tags||[]).join(', ')            : '';
  document.getElementById('crm-m-source').value         = c ? c.source||'online'                 : 'online';
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
    contrastLevel:  document.getElementById('crm-m-contrast').value,
    tags:           tags,
    source:         document.getElementById('crm-m-source').value,
    seasonNotes:    document.getElementById('crm-m-season-notes').value.trim(),
    notes:          exist ? (exist.notes||'')           : '',
    photoBase64:    exist ? (exist.photoBase64||'')     : '',
    photos:         exist ? (exist.photos||[])          : [],
    documents:      exist ? (exist.documents||[])       : [],
    sessions:       exist ? (exist.sessions||[])        : [],
    payments:       exist ? (exist.payments||[])        : [],
    correspondence: exist ? (exist.correspondence||[])  : [],
    createdAt:      exist ? (exist.createdAt||todayISO()) : todayISO()
  };
  if (crmEditingId) {
    crmClients = crmClients.map(function(c){ return c.id===crmEditingId ? obj : c; });
  } else {
    crmClients.push(obj);
  }
  closeCRMModal();
  saveData(); renderCRMPage();
  if (crmOpenProfileId && crmOpenProfileId === crmEditingId) openCRMProfile(crmEditingId);
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
  saveData(); openCRMProfile(crmSessionClientId);
}

function crmDeleteSession(clientId, sessId) {
  if (!confirm('Remove this session?')) return;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c||!c.sessions) return;
  c.sessions = c.sessions.filter(function(s){ return s.id!==sessId; });
  saveData(); openCRMProfile(clientId);
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
      email:email, phone:'', season:season, sisterSeasons:[], contrastLevel:'',
      tags:['online ca'].concat(season?[season.toLowerCase()]:[]),
      source:'online', seasonNotes:notes, notes:'', photoBase64:'', photos:[], documents:[],
      sessions: season ? [{id:'ss'+Date.now()+'i'+imported,date:todayISO(),type:'Online CA',season:season,notes:notes,reportUrl:''}] : [],
      payments:[], correspondence:[], createdAt:todayISO()
    });
    imported++;
  });
  saveData(); renderCRMPage();
  alert(imported+' client'+(imported!==1?'s':'')+' imported.');
}

// ════════════════════════════════════════════════════════
// APPOINTMENTS (in_person_bookings via Supabase)
// ════════════════════════════════════════════════════════

var APPT_STATUS_STYLE = {
  pending:  'background:#FEF3C7;color:#92400E',
  uploaded: 'background:#DBEAFE;color:#1E40AF',
  analysed: 'background:#EDE9FE;color:#5B21B6',
  complete: 'background:#D1FAE5;color:#065F46'
};

async function crmLoadAppointments(clientId) {
  var sEl = document.getElementById('crm-appt-section');
  if (!sEl) return;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c) return;

  var db = getSupa();
  if (!db) {
    sEl.innerHTML = '<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px 0">Supabase not connected.</div>';
    return;
  }

  var fullName = (c.firstName+' '+c.lastName).trim();
  var result;
  if (c.email) {
    result = await db.from('in_person_bookings').select('*')
      .eq('client_email', c.email.toLowerCase())
      .order('appointment_date', { ascending: false });
    if (!result.error && (!result.data || !result.data.length)) {
      result = await db.from('in_person_bookings').select('*')
        .ilike('client_name', '%'+fullName+'%')
        .order('appointment_date', { ascending: false });
    }
  } else {
    result = await db.from('in_person_bookings').select('*')
      .ilike('client_name', '%'+fullName+'%')
      .order('appointment_date', { ascending: false });
  }

  if (result.error) {
    sEl.innerHTML = '<div style="font-size:12px;color:#EF4444;padding:8px 0">Failed to load appointments.</div>';
    return;
  }

  var rows = result.data || [];
  if (!rows.length) {
    sEl.innerHTML = '<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px 0">No appointments yet.</div>';
    return;
  }

  var now      = new Date();
  var upcoming = rows.filter(function(b){ return b.appointment_date && new Date(b.appointment_date) >= now; }).reverse();
  var past     = rows.filter(function(b){ return !b.appointment_date || new Date(b.appointment_date) < now; });

  function renderAppt(b, isPast) {
    var ss  = APPT_STATUS_STYLE[b.status] || APPT_STATUS_STYLE.pending;
    var d   = b.appointment_date ? new Date(b.appointment_date) : null;
    var dateStr = d ? d.toLocaleDateString('en-AU', {weekday:'short',day:'numeric',month:'short',year:'numeric'}) : '—';
    var timeStr = d && b.appointment_date && b.appointment_date.indexOf('T') > -1
      ? d.toLocaleTimeString('en-AU', {hour:'2-digit',minute:'2-digit'})
      : '';
    return '<div style="padding:9px 0;border-bottom:1px solid var(--warm);'+(isPast?'opacity:.6':'')+'">'
      + '<div style="display:flex;align-items:flex-start;gap:8px">'
      +   '<div style="flex:1;min-width:0">'
      +     '<div style="font-size:12px;font-weight:600;color:var(--deep);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+dateStr+(timeStr?' · '+timeStr:'')+'</div>'
      +     (b.notes ? '<div style="font-size:11px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(b.notes)+'">'+esc(b.notes)+'</div>' : '')
      +   '</div>'
      +   '<span style="font-size:10px;font-weight:700;border-radius:5px;padding:2px 7px;flex-shrink:0;'+ss+'">'+b.status.toUpperCase()+'</span>'
      + '</div>'
      + (curUser==='latisha'
        ? '<div style="display:flex;gap:5px;margin-top:6px">'
        +   '<button onclick="crmOpenApptEditModal(\''+b.id+'\',\''+clientId+'\')" style="font-size:10px;padding:2px 8px;border:1px solid var(--sand);border-radius:5px;background:white;color:var(--muted);cursor:pointer">Edit</button>'
        +   '<button onclick="crmDeleteAppt(\''+b.id+'\',\''+clientId+'\')" style="font-size:10px;padding:2px 8px;border:1px solid #FEE2E2;border-radius:5px;background:#FEF2F2;color:#EF4444;cursor:pointer">Delete</button>'
        + '</div>'
        : '')
      + '</div>';
  }

  var html = '';
  if (upcoming.length) {
    html += '<div style="font-size:10px;color:var(--accent);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Upcoming</div>'
      + '<div style="border-left:3px solid var(--accent);padding-left:10px;margin-bottom:14px">'
      + upcoming.map(function(b){ return renderAppt(b, false); }).join('')
      + '</div>';
  }
  if (past.length) {
    html += '<div style="font-size:10px;color:var(--muted);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Past</div>'
      + past.map(function(b){ return renderAppt(b, true); }).join('');
  }

  sEl.innerHTML = html;
}

// Appointment edit — proper modal (no cramped inline form)
function crmOpenApptEditModal(bookingId, clientId) {
  var old = document.getElementById('crm-appt-edit-modal');
  if (old) old.remove();

  var apptRow = document.querySelector('#appt-row-'+bookingId);

  var modal = document.createElement('div');
  modal.id = 'crm-appt-edit-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(28,23,18,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.onclick = function(e){ if(e.target===modal) modal.remove(); };
  modal.innerHTML =
    '<div style="background:white;border-radius:16px;padding:28px;width:420px;max-width:92vw">'
    + '<div style="font-family:\'Fraunces\',serif;font-size:20px;color:var(--deep);margin-bottom:18px">Edit Appointment</div>'
    + '<div class="fg" style="margin-bottom:12px"><label class="fl">Date &amp; Time</label>'
    +   '<input type="datetime-local" id="ae-date" class="fi" style="font-size:13px"></div>'
    + '<div class="fg" style="margin-bottom:12px"><label class="fl">Status</label>'
    +   '<select id="ae-status" class="fsel" style="font-size:13px">'
    +     ['pending','uploaded','analysed','complete'].map(function(s){ return '<option value="'+s+'">'+s.charAt(0).toUpperCase()+s.slice(1)+'</option>'; }).join('')
    +   '</select></div>'
    + '<div class="fg" style="margin-bottom:18px"><label class="fl">Notes</label>'
    +   '<textarea id="ae-notes" class="fi" rows="3" style="font-size:13px;resize:none" placeholder="e.g. Gold package — bring all swatches"></textarea></div>'
    + '<div id="ae-err" style="color:#EF4444;font-size:12px;min-height:16px;margin-bottom:8px"></div>'
    + '<div style="display:flex;gap:10px;justify-content:flex-end">'
    +   '<button onclick="document.getElementById(\'crm-appt-edit-modal\').remove()" class="btn btns">Cancel</button>'
    +   '<button onclick="crmSaveApptEdit(\''+bookingId+'\',\''+clientId+'\')" class="btn btnp" id="ae-save-btn">Save changes</button>'
    + '</div></div>';

  document.body.appendChild(modal);

  // Fetch current values from Supabase then fill form
  (async function() {
    var db = getSupa(); if (!db) return;
    var { data } = await db.from('in_person_bookings').select('*').eq('id', bookingId).single();
    if (!data) return;
    var dateEl   = document.getElementById('ae-date');
    var statusEl = document.getElementById('ae-status');
    var notesEl  = document.getElementById('ae-notes');
    if (dateEl && data.appointment_date) dateEl.value = data.appointment_date.replace(' ','T').slice(0,16);
    if (statusEl && data.status) statusEl.value = data.status;
    if (notesEl) notesEl.value = data.notes || '';
  })();
}

async function crmSaveApptEdit(bookingId, clientId) {
  var db = getSupa(); if (!db) return;
  var dateEl   = document.getElementById('ae-date');
  var statusEl = document.getElementById('ae-status');
  var notesEl  = document.getElementById('ae-notes');
  var errEl    = document.getElementById('ae-err');
  var btn      = document.getElementById('ae-save-btn');

  var dateVal = dateEl ? dateEl.value : '';
  if (!dateVal) { if (errEl) errEl.textContent = 'Date is required.'; return; }

  if (btn) { btn.disabled=true; btn.textContent='Saving…'; }

  var { error } = await db.from('in_person_bookings').update({
    appointment_date: dateVal,
    status:           statusEl ? statusEl.value : 'pending',
    notes:            notesEl  ? notesEl.value.trim() : '',
    updated_at:       new Date().toISOString()
  }).eq('id', bookingId);

  if (error) {
    if (errEl) errEl.textContent = 'Save failed: '+error.message;
    if (btn) { btn.disabled=false; btn.textContent='Save changes'; }
    return;
  }

  var m = document.getElementById('crm-appt-edit-modal');
  if (m) m.remove();
  crmLoadAppointments(clientId);
}

async function crmDeleteAppt(bookingId, clientId) {
  if (!confirm('Delete this appointment? This cannot be undone.')) return;
  var db = getSupa(); if (!db) return;
  await db.from('in_person_bookings').delete().eq('id', bookingId);
  crmLoadAppointments(clientId);
}

// New appointment modal
function crmNewBookingModal(clientId) {
  if (curUser !== 'latisha') return;
  var c = crmClients.find(function(x){ return x.id===clientId; });
  if (!c) return;

  var old = document.getElementById('crm-appt-new-modal');
  if (old) old.remove();

  var now = new Date();
  var localISO = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);

  var modal = document.createElement('div');
  modal.id = 'crm-appt-new-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(28,23,18,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.onclick = function(e) { if (e.target===modal) modal.remove(); };
  modal.innerHTML =
    '<div style="background:white;border-radius:16px;padding:28px;width:420px;max-width:92vw">'
    + '<div style="font-family:\'Fraunces\',serif;font-size:22px;color:var(--deep);margin-bottom:18px">Book Appointment</div>'
    + '<div class="fg" style="margin-bottom:12px"><label class="fl">Client</label>'
    +   '<div style="font-size:13px;color:var(--deep);padding:9px 12px;border:1px solid var(--sand);border-radius:8px;background:#FDFBF8">'+esc((c.firstName+' '+c.lastName).trim())+(c.email?' <span style="color:var(--muted);font-size:11px">· '+esc(c.email)+'</span>':'')+'</div></div>'
    + '<div class="fg" style="margin-bottom:12px"><label class="fl">Date &amp; Time</label>'
    +   '<input type="datetime-local" id="crm-appt-dt" value="'+localISO+'" class="fi" style="font-size:13px"></div>'
    + '<div class="fg" style="margin-bottom:12px"><label class="fl">Status</label>'
    +   '<select id="crm-appt-st" class="fsel" style="font-size:13px">'
    +     '<option value="pending">Pending</option><option value="uploaded">Uploaded</option><option value="analysed">Analysed</option><option value="complete">Complete</option>'
    +   '</select></div>'
    + '<div class="fg" style="margin-bottom:18px"><label class="fl">Notes <span style="font-weight:400;color:var(--muted)">(optional)</span></label>'
    +   '<textarea class="fi" id="crm-appt-nt" rows="2" placeholder="e.g. Gold package — bring swatches" style="font-size:13px;resize:none"></textarea></div>'
    + '<div id="crm-appt-new-err" style="color:#EF4444;font-size:12px;min-height:18px;margin-bottom:8px"></div>'
    + '<div style="display:flex;gap:10px;justify-content:flex-end">'
    +   '<button onclick="document.getElementById(\'crm-appt-new-modal\').remove()" class="btn btns">Cancel</button>'
    +   '<button onclick="crmSaveNewAppt(\''+clientId+'\')" class="btn btnp" id="crm-appt-save-btn">Book</button>'
    + '</div></div>';
  document.body.appendChild(modal);
  setTimeout(function(){ var d=document.getElementById('crm-appt-dt'); if(d) d.focus(); }, 80);
}

async function crmSaveNewAppt(clientId) {
  var c       = crmClients.find(function(x){ return x.id===clientId; });
  if (!c) return;
  var dateEl  = document.getElementById('crm-appt-dt');
  var statEl  = document.getElementById('crm-appt-st');
  var notesEl = document.getElementById('crm-appt-nt');
  var errEl   = document.getElementById('crm-appt-new-err');
  var btn     = document.getElementById('crm-appt-save-btn');

  var dateVal = dateEl ? dateEl.value : '';
  if (!dateVal) { if (errEl) errEl.textContent='Please select a date and time.'; return; }

  var db = getSupa();
  if (!db) { if (errEl) errEl.textContent='Supabase not configured.'; return; }

  if (btn) { btn.disabled=true; btn.textContent='Booking…'; }

  var { error } = await db.from('in_person_bookings').insert({
    client_name:      (c.firstName+' '+c.lastName).trim(),
    client_email:     (c.email||'').toLowerCase(),
    appointment_date: dateVal,
    status:           statEl ? statEl.value : 'pending',
    notes:            notesEl ? notesEl.value.trim() : '',
    created_at:       new Date().toISOString(),
    updated_at:       new Date().toISOString()
  });

  if (error) {
    if (errEl) errEl.textContent = 'Failed: '+error.message;
    if (btn) { btn.disabled=false; btn.textContent='Book'; }
    return;
  }

  var m = document.getElementById('crm-appt-new-modal');
  if (m) m.remove();
  crmLoadAppointments(clientId);
}
