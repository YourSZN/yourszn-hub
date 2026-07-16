// ═══════════════════════════════════════════════════
// SOCIAL MEDIA SECTION
// ═══════════════════════════════════════════════════

var socialPosts = [];

var SM_STAGES = [
  {key:'idea',      label:'Idea',      color:'#6366F1'},
  {key:'scripted',  label:'Scripted',  color:'#F59E0B'},
  {key:'filmed',    label:'Filmed',    color:'#3B82F6'},
  {key:'edited',    label:'Edited',    color:'#8B5CF6'},
  {key:'g2g',       label:'G2G',       color:'#10B981'},
  {key:'scheduled', label:'Scheduled', color:'#059669'},
  {key:'posted',    label:'Posted',    color:'#6B7280'},
];

var SM_PILLARS = [
  'Personal Expertise & Opinions',
  'Colour Education',
  'Shopping By Season',
  'Client Sessions',
  'Static Posts'
];

var SM_PILLAR_COLORS = {
  'Personal Expertise & Opinions': '#EF4444',
  'Colour Education':               '#3B82F6',
  'Shopping By Season':             '#22C55E',
  'Client Sessions':                '#8B5CF6',
  'Static Posts':                   '#F97316'
};

var SM_CONTENT_TYPES = ['Quick Chat', 'Reel', 'Carousel', 'Quick Comparisons', 'Review/Overlays', 'Celebrity Analysis', 'Consultation'];
var SM_PLAN_ACTIONS  = ['Save', 'Follow', 'Comment', 'Share', 'Shop / Buy', 'DM Me', 'Book a Session', 'Visit Link in Bio', 'Sign Up', 'Try It'];

var smActiveTab      = 'pipeline';
var smCalMonth       = new Date().getMonth();
var smCalYear        = new Date().getFullYear();
var smIdeaBankFilter = 'All';
var _smEditId        = null;
var _smDraftComments = [];
var smMentions       = {latisha:[], lemari:[]};
var smStrategyNotes  = '';
var smAnalyticsLog   = []; // [{id, weekEnding, tt:{views,followers,likes,bestPost}, ig:{reach,followers,likes,bestPost}, notes}]

// ── Weekly Content Plan ──────────────────────────────────────
var smWeekPlan    = {};  // { weekKey: { mon: {...}, tue: {...}, ... } }
var smPlanWeekOff = 0;   // 0 = this week, -1 = last week, +1 = next week

var SM_PLAN_DAYS = ['mon','tue','wed','thu','fri','sat','sun'];

// Default pillar per day — user can override per week
var SM_PLAN_DEFAULTS = {
  mon: { pillar:'Personal Expertise & Opinions', format:'' },
  tue: { pillar:'Colour Education',               format:'' },
  wed: { pillar:'Client Sessions',                format:'' },
  thu: { pillar:'Shopping By Season',             format:'' },
  fri: { pillar:'Static Posts',                   format:'Carousel' },
  sat: { pillar:'Personal Expertise & Opinions',  format:'' },
  sun: { pillar:'Static Posts',                   format:'Carousel' }
};

function smPlanWeekKey(off) {
  var now = new Date();
  var day = now.getDay();
  var monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + ((off||0) * 7));
  return monday.toISOString().slice(0, 10);
}

function smPlanGetDay(wk, dayKey) {
  var def   = SM_PLAN_DEFAULTS[dayKey] || {};
  var saved = (smWeekPlan[wk] && smWeekPlan[wk][dayKey]) || {};
  return {
    posting:      saved.posting      !== undefined ? saved.posting      : 'no',
    pillar:       saved.pillar       !== undefined ? saved.pillar       : (def.pillar  || ''),
    format:       saved.format       !== undefined ? saved.format       : (def.format  || ''),
    difficulty:   saved.difficulty   || '',
    viewerAction: saved.viewerAction || '',
    notes:        saved.notes        || '',
    link:         saved.link         || ''
  };
}

function smSavePlan(wk, dayKey, field, val) {
  if (!smWeekPlan[wk])         smWeekPlan[wk] = {};
  if (!smWeekPlan[wk][dayKey]) smWeekPlan[wk][dayKey] = {};
  smWeekPlan[wk][dayKey][field] = val;
  saveData();
}

function smSelectPillar(wk, dayKey, pillarIdx) {
  smSavePlan(wk, dayKey, 'pillar', pillarIdx >= 0 ? SM_PILLARS[pillarIdx] : '');
  renderSocialPage();
}

function smTogglePillarDD(id) {
  document.querySelectorAll('.sm-pillar-dd').forEach(function(el) {
    if (el.id !== id) el.style.display = 'none';
  });
  var el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'block' ? 'none' : 'block';
}

function smToggleAction(wk, dayKey, actionIdx) {
  var action  = SM_PLAN_ACTIONS[actionIdx];
  var current = (smWeekPlan[wk] && smWeekPlan[wk][dayKey] && smWeekPlan[wk][dayKey].viewerAction) || '';
  var list    = current ? current.split(',') : [];
  var idx     = list.indexOf(action);
  if (idx > -1) list.splice(idx, 1); else list.push(action);
  smSavePlan(wk, dayKey, 'viewerAction', list.join(','));
  renderSocialPage();
}

function smRenderPlan() {
  var wk      = smPlanWeekKey(smPlanWeekOff);
  var monday  = new Date(wk + 'T00:00:00');
  var sunday  = new Date(monday); sunday.setDate(monday.getDate() + 6);
  var fmtDate = function(d) { return d.toLocaleDateString('en-AU', { day:'numeric', month:'short' }); };
  var weekLabel = fmtDate(monday) + ' – ' + fmtDate(sunday);

  var formats = [''].concat(SM_CONTENT_TYPES);

  var sel = function(wk, d, field, opts, extraStyle) {
    return '<select style="width:100%;border:1px solid var(--sand);border-radius:6px;padding:6px 8px;font-size:12px;background:white;color:var(--charcoal);cursor:pointer;' + (extraStyle||'') + '" onchange="smSavePlan(\'' + wk + '\',\'' + d + '\',\'' + field + '\',this.value)">' + opts + '</select>';
  };
  var pillarDD = function(wk, d, currentPillar) {
    var col     = SM_PILLAR_COLORS[currentPillar] || '';
    var ddId    = 'sm-pd-' + d;
    var trigger = col
      ? '<div onclick="smTogglePillarDD(\'' + ddId + '\')" style="padding:6px 10px;border-radius:6px;background:' + col + ';color:white;font-size:12px;font-weight:700;cursor:pointer;user-select:none">' + esc(currentPillar) + ' &#9662;</div>'
      : '<div onclick="smTogglePillarDD(\'' + ddId + '\')" style="padding:6px 10px;border-radius:6px;background:white;border:1px solid var(--sand);color:var(--muted);font-size:12px;cursor:pointer;user-select:none">— Select — &#9662;</div>';
    var items = SM_PILLARS.map(function(p, pi) {
      var c = SM_PILLAR_COLORS[p] || '#9CA3AF';
      return '<div onclick="smSelectPillar(\'' + wk + '\',\'' + d + '\',' + pi + ')" style="padding:6px 10px;cursor:pointer;border-radius:4px;margin:2px 0;background:' + c + ';color:white;font-size:12px;font-weight:600">' + esc(p) + '</div>';
    }).join('');
    var clearItem = '<div onclick="smSelectPillar(\'' + wk + '\',\'' + d + '\',-1)" style="padding:5px 10px;cursor:pointer;color:var(--muted);font-size:11px;border-top:1px solid var(--sand);margin-top:4px">Clear</div>';
    return '<div style="position:relative">'
      + trigger
      + '<div id="' + ddId + '" class="sm-pillar-dd" style="display:none;position:absolute;top:calc(100% + 4px);left:0;z-index:200;background:white;border:1px solid var(--sand);border-radius:8px;padding:6px;min-width:200px;box-shadow:0 4px 16px rgba(0,0,0,.12)">'
      + items + clearItem
      + '</div>'
      + '</div>';
  };

  // Week navigation
  var html = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">'
    + '<button onclick="smPlanWeekOff--;renderSocialPage()" style="background:none;border:1px solid var(--sand);border-radius:8px;padding:7px 16px;cursor:pointer;font-size:13px;color:var(--charcoal)">&#8592; Prev</button>'
    + '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:20px;font-weight:500;color:var(--charcoal);flex:1;text-align:center">' + weekLabel + '</div>'
    + '<button onclick="smPlanWeekOff++;renderSocialPage()" style="background:none;border:1px solid var(--sand);border-radius:8px;padding:7px 16px;cursor:pointer;font-size:13px;color:var(--charcoal)">Next &#8594;</button>'
    + (smPlanWeekOff !== 0 ? '<button onclick="smPlanWeekOff=0;renderSocialPage()" style="background:var(--charcoal);color:white;border:none;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:12px;font-weight:600">This Week</button>' : '')
    + '</div>';

  // Table
  html += '<div style="overflow-x:auto;border-radius:12px;border:1px solid var(--sand)">'
    + '<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:780px;table-layout:fixed">'
    + '<colgroup>'
    + '<col style="width:52px">'
    + '<col style="width:190px">'
    + '<col style="width:130px">'
    + '<col style="width:160px">'
    + '<col>'
    + '</colgroup>'
    + '<thead><tr style="background:var(--warm)">'
    + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:var(--charcoal);border-bottom:2px solid #EF4444;white-space:nowrap">day</th>'
    + '<th style="padding:10px 8px;text-align:left;font-size:11px;font-weight:700;color:var(--charcoal);border-bottom:2px solid #EF4444">pillar</th>'
    + '<th style="padding:10px 8px;text-align:left;font-size:11px;font-weight:700;color:var(--charcoal);border-bottom:2px solid #EF4444">format</th>'
    + '<th style="padding:10px 8px;text-align:left;font-size:11px;font-weight:700;color:var(--charcoal);border-bottom:2px solid #EF4444">action i hope<br><span style="font-weight:400;color:var(--muted)">viewer takes</span></th>'
    + '<th style="padding:10px 8px;text-align:left;font-size:11px;font-weight:700;color:var(--charcoal);border-bottom:2px solid #EF4444">notes <span style="font-weight:400;color:var(--muted)">(hook / post ideas)</span></th>'
    + '</tr></thead><tbody>';

  SM_PLAN_DAYS.forEach(function(d, idx) {
    var data      = smPlanGetDay(wk, d);
    var isLast    = idx === SM_PLAN_DAYS.length - 1;
    var border    = isLast ? '' : 'border-bottom:1px solid var(--sand)';
    var pillarCol = SM_PILLAR_COLORS[data.pillar] || '';
    var accentBorder = pillarCol ? 'border-left:4px solid ' + pillarCol + ';' : 'border-left:4px solid transparent;';

    // Viewer actions: dropdown to add + pills to remove
    var selectedActions = data.viewerAction ? data.viewerAction.split(',').filter(Boolean) : [];
    var unselectedActions = SM_PLAN_ACTIONS.filter(function(a) { return selectedActions.indexOf(a) === -1; });
    var actionPills = selectedActions.map(function(a) {
      var ai = SM_PLAN_ACTIONS.indexOf(a);
      return '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;background:var(--charcoal);color:white;font-size:11px;font-weight:500">'
        + esc(a)
        + '<button onclick="smToggleAction(\'' + wk + '\',\'' + d + '\',' + ai + ')" style="background:none;border:none;color:white;cursor:pointer;font-size:12px;line-height:1;padding:0;margin:0;opacity:0.7" title="Remove">&times;</button>'
        + '</span>';
    }).join('');
    var addActionOpts = [''].concat(unselectedActions).map(function(a) {
      return '<option value="' + esc(a) + '">' + (a || '+ Add action…') + '</option>';
    }).join('');
    var actionCell = (actionPills ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:' + (unselectedActions.length ? '6px' : '0') + '">' + actionPills + '</div>' : '')
      + (unselectedActions.length ? '<select style="width:100%;border:1px solid var(--sand);border-radius:6px;padding:5px 8px;font-size:12px;background:white;color:var(--muted);cursor:pointer" onchange="var ai=SM_PLAN_ACTIONS.indexOf(this.value);if(ai>-1)smToggleAction(\'' + wk + '\',\'' + d + '\',ai);this.selectedIndex=0">' + addActionOpts + '</select>' : '');

    var fOpts = formats.map(function(f) { return '<option value="' + esc(f) + '"' + (data.format === f ? ' selected' : '') + '>' + (f || '— Select —') + '</option>'; }).join('');

    html += '<tr style="background:white;' + accentBorder + border + '">'
      + '<td style="padding:10px 12px;font-weight:700;color:var(--charcoal);font-size:13px;white-space:nowrap;vertical-align:top">' + d + '</td>'
      + '<td style="padding:6px 8px;vertical-align:top">' + pillarDD(wk, d, data.pillar) + '</td>'
      + '<td style="padding:6px 8px;vertical-align:top">' + sel(wk, d, 'format', fOpts) + '</td>'
      + '<td style="padding:6px 8px;vertical-align:top">' + actionCell + '</td>'
      + '<td style="padding:6px 8px;vertical-align:top">'
        + '<textarea placeholder="Hook idea, caption notes…" '
        + 'style="width:100%;border:1px solid var(--sand);border-radius:6px;padding:8px;font-size:12px;background:white;color:var(--charcoal);min-height:80px;resize:vertical;outline:none;font-family:inherit;line-height:1.5;box-sizing:border-box" '
        + 'onchange="smSavePlan(\'' + wk + '\',\'' + d + '\',\'notes\',this.value)">' + esc(data.notes) + '</textarea>'
        + '<div style="display:flex;align-items:center;gap:6px;margin-top:5px">'
        +   '<span style="font-size:13px;flex-shrink:0">🔗</span>'
        +   '<input type="url" placeholder="Paste video or post link…" value="' + esc(data.link) + '" '
        +     'style="flex:1;border:1px solid var(--sand);border-radius:6px;padding:5px 8px;font-size:11px;color:var(--charcoal);background:white;outline:none;min-width:0" '
        +     'onchange="smSavePlan(\'' + wk + '\',\'' + d + '\',\'link\',this.value.trim())">'
        +   (data.link ? '<a href="' + esc(data.link) + '" target="_blank" rel="noopener" style="flex-shrink:0;font-size:11px;color:var(--rose);font-weight:600;text-decoration:none;white-space:nowrap">Open ↗</a>' : '')
        + '</div>'
        + '</td>'
      + '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

// ── Was post modified in last 48h? ──
function smRecentlyEdited(post) {
  if (!post.lastModified) return false;
  return (Date.now() - post.lastModified) < 48 * 3600 * 1000;
}

function smRelTime(ts) {
  var diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 60) return diff + 'm ago';
  var h = Math.floor(diff / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

// ── Main page render ──
function renderSocialPage() {
  smSeedIdeas();
  var el = document.getElementById('social-page-content'); if (!el) return;

  var tabs = [
    {key:'plan',      label:'Plan'},
    {key:'pipeline',  label:'Pipeline'},
    {key:'calendar',  label:'Calendar'},
    {key:'ideas',     label:'Idea Bank'},
    {key:'strategy',  label:'Posting Strategy'},
    {key:'analytics', label:'Analytics'},
  ];

  var tabHtml = '<div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap">'
    + tabs.map(function(t) {
        return '<button class="clients-subtab' + (smActiveTab === t.key ? ' on' : '') + '" onclick="smSetTab(\'' + t.key + '\')">' + t.label + '</button>';
      }).join('')
    + '</div>';

  var contentHtml = '';
  if      (smActiveTab === 'plan')      contentHtml = smRenderPlan();
  else if (smActiveTab === 'pipeline')  contentHtml = smRenderPipeline();
  else if (smActiveTab === 'calendar')  contentHtml = smRenderCalendar();
  else if (smActiveTab === 'ideas')     contentHtml = smRenderIdeaBank();
  else if (smActiveTab === 'strategy')  contentHtml = smRenderStrategy();
  else if (smActiveTab === 'analytics') contentHtml = smRenderAnalytics();

  el.innerHTML = tabHtml + contentHtml;

  // Render modal into its own root outside .main so position:fixed works correctly
  var modalRoot = document.getElementById('sm-modal-root');
  if (modalRoot && !document.getElementById('sm-post-modal')) {
    modalRoot.innerHTML = smPostModal();
  }
  var modal = document.getElementById('sm-post-modal');
  if (modal) modal.onclick = function(e) { if (e.target === modal) smCloseModal(); };
}

function smSetTab(tab) {
  smActiveTab = tab;
  renderSocialPage();
  window.scrollTo(0, 0);
}

// ══ PIPELINE ══

function smRenderPipeline() {
  var totalUpdated = socialPosts.filter(smRecentlyEdited).length;
  var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">';

  if (totalUpdated > 0) {
    html += '<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:600;color:#92400E">'
      + '&#9888; ' + totalUpdated + ' post' + (totalUpdated > 1 ? 's' : '') + ' updated in the last 48h</div>';
  } else {
    html += '<div></div>';
  }

  html += '<button class="btn btnp" onclick="smOpenModal(null)">+ New Post</button>'
    + '</div>';

  html += '<div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:16px;align-items:flex-start">';

  SM_STAGES.forEach(function(stage) {
    var posts = socialPosts.filter(function(p) { return p.stage === stage.key; });

    html += '<div style="flex:0 0 210px;min-width:210px;background:var(--warm);border-radius:12px;padding:12px">';

    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
      + '<div style="display:flex;align-items:center;gap:7px">'
      +   '<div style="width:9px;height:9px;border-radius:50%;background:' + stage.color + '"></div>'
      +   '<div style="font-size:12px;font-weight:700;color:var(--charcoal);letter-spacing:.3px">' + stage.label + '</div>'
      + '</div>'
      + '<div style="font-size:11px;color:var(--muted);font-weight:600">' + posts.length + '</div>'
      + '</div>';

    html += '<button onclick="smOpenModal(null,\'' + stage.key + '\')" style="width:100%;background:rgba(255,255,255,.55);border:1.5px dashed var(--sand);border-radius:8px;padding:6px;font-size:11px;color:var(--muted);cursor:pointer;margin-bottom:8px;transition:background .15s" onmouseover="this.style.background=\'rgba(255,255,255,.9)\'" onmouseout="this.style.background=\'rgba(255,255,255,.55)\'">+ Add</button>';

    posts.forEach(function(post) {
      var isNew = smRecentlyEdited(post);

      var platTags = (post.platform || []).map(function(p) {
        var col = p === 'TikTok' ? '#010101' : '#E1306C';
        return '<span style="font-size:9px;font-weight:700;color:white;background:' + col + ';padding:2px 6px;border-radius:6px">' + p + '</span>';
      }).join('');

      var pillarCol = post.pillar ? (SM_PILLAR_COLORS[post.pillar] || '#ccc') : null;
      var pillarDot = pillarCol ? '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + pillarCol + ';margin-right:4px;flex-shrink:0"></span>' : '';

      var assignBadge = post.assignedTo
        ? '<span style="font-size:9px;font-weight:700;background:var(--sand);color:var(--charcoal);padding:2px 7px;border-radius:6px">' + post.assignedTo + '</span>'
        : '';

      var dateLine = (stage.key === 'scheduled' || stage.key === 'posted') && post.scheduledDate
        ? '<div style="font-size:10px;color:var(--muted);margin-top:5px">&#128197; ' + smFmtDate(post.scheduledDate) + '</div>'
        : '';

      var updBadge = isNew
        ? '<div style="margin-bottom:6px"><span style="font-size:9px;font-weight:700;background:#FEF3C7;color:#92400E;padding:2px 7px;border-radius:6px;border:1px solid #F59E0B">Updated ' + smRelTime(post.lastModified) + '</span></div>'
        : '';

      var commentCount = (post.comments || []).length;
      var commentBadge = commentCount
        ? '<span style="font-size:9px;color:var(--muted);display:flex;align-items:center;gap:3px">&#128172; ' + commentCount + '</span>'
        : '';

      var pipelineAccent = pillarCol ? 'inset 4px 0 0 ' + pillarCol : 'none';
      html += '<div onclick="smOpenModal(\'' + post.id + '\')" style="background:' + (isNew ? '#FFFBEB' : 'white') + ';border:' + (isNew ? '2px solid #F59E0B' : '1px solid var(--sand)') + ';border-radius:10px;padding:10px;padding-left:12px;margin-bottom:8px;cursor:pointer;box-shadow:' + pipelineAccent + ';transition:filter .15s" onmouseover="this.style.filter=\'brightness(.97)\'" onmouseout="this.style.filter=\'none\'">'
        + '<div style="font-size:13px;font-weight:600;color:var(--charcoal);margin-bottom:6px;line-height:1.35">' + esc(post.title) + '</div>'
        + updBadge
        + (platTags ? '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px">' + platTags + '</div>' : '')
        + '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px">'
        +   (pillarDot ? '<div style="display:flex;align-items:center;min-width:0"><span>' + pillarDot + '</span><span style="font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (post.pillar ? post.pillar.split(' ')[0] : '') + '</span></div>' : '<div></div>')
        +   '<div style="display:flex;align-items:center;gap:4px">'
        +     smContentTypeIcon(post.contentType)
        +     (post.script ? smScriptIcon() : '')
        +     commentBadge + assignBadge
        +   '</div>'
        + '</div>'
        + dateLine
        + '</div>';
    });

    html += '</div>'; // end column
  });

  html += '</div>'; // end kanban
  return html;
}

// ══ CALENDAR ══

function smRenderCalendar() {
  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  var firstDay = new Date(smCalYear, smCalMonth, 1);
  var lastDay  = new Date(smCalYear, smCalMonth + 1, 0);
  var startDow = firstDay.getDay();
  var totalDays = lastDay.getDate();

  var byDate = {};
  socialPosts.forEach(function(p) {
    if (!p.scheduledDate) return;
    var parts = p.scheduledDate.split('-');
    if (parseInt(parts[0]) !== smCalYear || parseInt(parts[1]) - 1 !== smCalMonth) return;
    var d = parseInt(parts[2]);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(p);
  });

  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'
    + '<button onclick="smCalPrev()" style="background:none;border:1px solid var(--sand);border-radius:8px;padding:7px 14px;cursor:pointer;font-size:13px;color:var(--charcoal)">&#8592;</button>'
    + '<div style="font-size:17px;font-weight:700;color:var(--deep)">' + monthNames[smCalMonth] + ' ' + smCalYear + '</div>'
    + '<button onclick="smCalNext()" style="background:none;border:1px solid var(--sand);border-radius:8px;padding:7px 14px;cursor:pointer;font-size:13px;color:var(--charcoal)">&#8594;</button>'
    + '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:3px">'
    + dayNames.map(function(d) {
        return '<div style="text-align:center;font-size:10px;font-weight:700;color:var(--muted);letter-spacing:.8px;padding:6px 0">' + d + '</div>';
      }).join('')
    + '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">';

  for (var i = 0; i < startDow; i++) {
    html += '<div style="min-height:80px;background:var(--warm);border-radius:8px;opacity:.3"></div>';
  }

  for (var d = 1; d <= totalDays; d++) {
    var dateStr = smCalYear + '-' + String(smCalMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var isToday = dateStr === todayStr;
    var dayPosts = byDate[d] || [];

    html += '<div style="min-height:80px;background:' + (isToday ? '#EDE9FE' : 'white') + ';border:1px solid ' + (isToday ? '#A78BFA' : 'var(--sand)') + ';border-radius:8px;padding:6px;cursor:pointer" onclick="smOpenModal(null,\'idea\',\'' + dateStr + '\')">'
      + '<div style="font-size:11px;font-weight:' + (isToday ? '700' : '500') + ';color:' + (isToday ? '#7C3AED' : 'var(--charcoal)') + ';margin-bottom:4px">' + d + '</div>';

    dayPosts.forEach(function(post) {
      var stageObj = SM_STAGES.find(function(s) { return s.key === post.stage; });
      var col = stageObj ? stageObj.color : '#6B7280';
      var platIcon = post.platform && post.platform.indexOf('TikTok') !== -1 ? '&#9654; ' : '';
      html += '<div onclick="event.stopPropagation();smOpenModal(\'' + post.id + '\')" title="' + esc(post.title) + ' — ' + (stageObj ? stageObj.label : '') + '" style="font-size:9px;font-weight:600;background:' + col + ';color:white;border-radius:4px;padding:2px 5px;margin-bottom:2px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'
        + platIcon + esc(post.title)
        + '</div>';
    });

    html += '</div>';
  }

  html += '</div>';

  html += '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid var(--sand)">';
  SM_STAGES.forEach(function(s) {
    html += '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)">'
      + '<div style="width:9px;height:9px;border-radius:50%;background:' + s.color + '"></div>' + s.label + '</div>';
  });
  html += '</div>';

  return html;
}

function smCalPrev() {
  smCalMonth--;
  if (smCalMonth < 0) { smCalMonth = 11; smCalYear--; }
  renderSocialPage();
}
function smCalNext() {
  smCalMonth++;
  if (smCalMonth > 11) { smCalMonth = 0; smCalYear++; }
  renderSocialPage();
}

// ══ IDEA BANK ══

function smRenderIdeaBank() {
  var ideas = socialPosts.filter(function(p) { return p.stage === 'idea'; });

  var pills = ['All'].concat(SM_PILLARS);
  var html = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;align-items:center">'
    + '<button class="btn btnp" onclick="smOpenModal(null,\'idea\')" style="font-size:12px;padding:6px 14px">+ New Idea</button>'
    + '<div style="width:1px;height:22px;background:var(--sand)"></div>'
    + pills.map(function(p) {
        return '<button onclick="smSetIdeaFilter(\'' + p + '\')" class="clients-subtab' + (smIdeaBankFilter === p ? ' on' : '') + '" style="font-size:11px">' + p + '</button>';
      }).join('')
    + '</div>';

  var filtered = smIdeaBankFilter === 'All' ? ideas : ideas.filter(function(p) { return p.pillar === smIdeaBankFilter; });

  if (!filtered.length) {
    html += '<div style="text-align:center;padding:60px;color:var(--muted);font-size:14px">No ideas yet — click + New Idea to add your first one.</div>';
    return html;
  }

  if (smIdeaBankFilter === 'All') {
    SM_PILLARS.forEach(function(pillar) {
      var group = filtered.filter(function(p) { return p.pillar === pillar; });
      if (group.length) html += smIdeaGroup(pillar, group);
    });
    var noPillar = filtered.filter(function(p) { return !p.pillar; });
    if (noPillar.length) html += smIdeaGroup('Uncategorised', noPillar);
  } else {
    html += smIdeaGroup(smIdeaBankFilter, filtered);
  }

  return html;
}

function smIdeaGroup(pillar, posts) {
  var col = SM_PILLAR_COLORS[pillar] || '#9CA3AF';
  var html = '<div style="margin-bottom:28px">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'
    +   '<div style="width:3px;height:20px;background:' + col + ';border-radius:2px"></div>'
    +   '<div style="font-size:13px;font-weight:700;color:var(--charcoal)">' + pillar + '</div>'
    +   '<div style="font-size:11px;color:var(--muted);background:var(--warm);border-radius:10px;padding:2px 8px">' + posts.length + '</div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">';

  posts.forEach(function(post) {
    var isNew     = smRecentlyEdited(post);
    var pillarCol = SM_PILLAR_COLORS[post.pillar] || '#9CA3AF';
    var platTags  = (post.platform || []).map(function(p) {
      var c = p === 'TikTok' ? '#010101' : '#E1306C';
      return '<span style="font-size:9px;font-weight:700;color:white;background:' + c + ';padding:2px 6px;border-radius:6px">' + p + '</span>';
    }).join('');

    var bg        = isNew ? '#FFFBEB' : 'white';
    var cardBorder= isNew ? '2px solid #F59E0B' : '1px solid var(--sand)';
    var accentShadow = 'inset 4px 0 0 ' + pillarCol;

    html += '<div onclick="smOpenModal(\'' + post.id + '\')" style="background:' + bg + ';border:' + cardBorder + ';border-radius:10px;padding:12px;padding-left:14px;cursor:pointer;box-shadow:' + accentShadow + ';transition:filter .15s" onmouseover="this.style.filter=\'brightness(.97)\'" onmouseout="this.style.filter=\'none\'">'
      + '<div style="font-size:13px;font-weight:600;color:var(--charcoal);margin-bottom:5px;line-height:1.35">' + esc(post.title) + '</div>'
      + (post.concept ? '<div style="font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5">' + esc(post.concept.slice(0, 100)) + (post.concept.length > 100 ? '…' : '') + '</div>' : '')
      + '<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">'
      +   platTags
      +   smContentTypeIcon(post.contentType)
      +   (post.script ? smScriptIcon() : '')
      +   (post.assignedTo ? '<span style="font-size:9px;font-weight:700;background:var(--sand);color:var(--charcoal);padding:2px 7px;border-radius:6px">' + post.assignedTo + '</span>' : '')
      +   (isNew ? '<span style="font-size:9px;font-weight:700;background:#FEF3C7;color:#92400E;padding:2px 7px;border-radius:6px;border:1px solid #F59E0B">Updated ' + smRelTime(post.lastModified) + '</span>' : '')
      + '</div>'
      + '</div>';
  });

  html += '</div></div>';
  return html;
}

function smSetIdeaFilter(f) {
  smIdeaBankFilter = f;
  renderSocialPage();
}

// ══ POSTING STRATEGY ══

function smRenderStrategy() {
  var tiktokSched = [
    ['Monday',    'Personal Expertise & Opinions'],
    ['Tuesday',   'Colour Education'],
    ['Wednesday', 'Client Session (long)'],
    ['Thursday',  'Shopping By Season (series)'],
    ['Friday',    'Client Session (snippet)'],
    ['Saturday',  'Personal Expertise & Opinions (or Celebrity Analysis)'],
    ['Sunday',    'Client Session (long)'],
  ];
  var igSched = [
    ['Monday',    'Personal Expertise & Opinions'],
    ['Tuesday',   'Colour Education'],
    ['Wednesday', 'Client Session (long)'],
    ['Thursday',  'Shopping By Season (series)'],
    ['Friday',    'Carousel'],
    ['Saturday',  'Personal Expertise & Opinions (or Celebrity Analysis)'],
    ['Sunday',    'Carousel'],
  ];

  return '<div class="g2" style="margin-bottom:16px">'
    + smStrategyCard('TikTok', '1x per day', tiktokSched)
    + smStrategyCard('Instagram Feed', 'Daily posts', igSched)
    + '</div>'
    + smStrategyPillars()
    + smStrategyGuide()
    + smStrategyNotepad();
}

function smStrategyGuide() {
  function section(title, accent, body) {
    return '<div style="border-left:3px solid ' + accent + ';padding-left:16px;margin-bottom:24px">'
      + '<div style="font-size:13px;font-weight:700;color:' + accent + ';letter-spacing:.4px;text-transform:uppercase;margin-bottom:10px">' + title + '</div>'
      + body
      + '</div>';
  }
  function bullets(items) {
    return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px">'
      + items.map(function(i){ return '<li style="font-size:13px;color:var(--charcoal);line-height:1.55">' + i + '</li>'; }).join('')
      + '</ul>';
  }
  function concepts(items) {
    return '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:10px">'
      + items.map(function(i){ return '<span style="font-size:12px;background:var(--warm);border:1px solid var(--sand);border-radius:20px;padding:4px 12px;color:var(--charcoal);font-style:italic">' + i + '</span>'; }).join('')
      + '</div>';
  }
  function label(t) { return '<div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;margin-top:12px">' + t + '</div>'; }

  var goal = '<div style="background:var(--warm);border-radius:10px;padding:14px 16px;font-size:13px;color:var(--charcoal);line-height:1.6;margin-bottom:24px">'
    + '<strong>The goal</strong> is not to teach colour analysis theory for the sake of it. The goal is to make people feel seen in their shopping struggles, makeup struggles and style frustrations — <em>then</em> position colour analysis, online/in-person and the app as the solution.'
    + '</div>';

  var shopping = section('Shopping Struggles', '#C4956A',
    '<div style="font-size:13px;color:var(--charcoal);line-height:1.6;margin-bottom:10px">Think about the problems people face <strong>before</strong> they know their season.</div>' +
    label('Hook examples') +
    bullets([
      'Why does this colour look amazing on her but terrible on me?',
      'Why does online shopping feel so hit and miss?',
      'If you keep buying clothes but never have anything to wear… look at the palette in your wardrobe. Is it matched to your season? If not, you probably just don\'t realise what clothes you\'ll be excited to wear again and again and again…',
      'If you ever think "Why do I feel like I need makeup to look put together?"',
    ]) +
    label('Concept examples') +
    concepts(['"You don\'t hate green. You just haven\'t found your green."', '"Why expensive wardrobes aren\'t always expensive…"', '"The reason your wardrobe feels boring..."', '"How I would shop at [brand] if I was a Soft Autumn."', '"My cart from [brand] if I was a Winter."']) +
    '<div style="background:#FFF9F0;border:1px solid #C4956A33;border-radius:8px;padding:11px 14px;margin-top:12px;font-size:12px;color:var(--charcoal);line-height:1.6">'
      + '<strong>Natural app integration:</strong> You can always plug it at the end of videos — <em>"and if you haven\'t already, go and check out our Your SZN app."</em> The app removes the guesswork by showing clothing already categorised into your season.'
      + '</div>'
  );

  var makeup = section('Makeup & Beauty', '#C49A8A',
    '<div style="font-size:13px;color:var(--charcoal);line-height:1.6;margin-bottom:8px">Think about frustrations people experience with makeup, fake tan, hair colour and jewellery. What would people think/say/hear everyday?!</div>' +
    label('Examples') +
    bullets([
      'Foundation never looks quite right.',
      'Fake tan feels too harsh.',
      'Certain lip colours make teeth look yellow/skin look dull.',
      'Gold or silver jewellery confusion / OR… how to mix metals to best suit your season (e.g. earrings — wear the one that is in your season in the first hole, then swap the 2nd).',
      'Hair colours that overpower features.',
    ]) +
    label('Concept examples') +
    concepts(['"If you\'re cool toned like me, your fake tan may be fighting your season."', '"Not everyone suits bleach blonde hair and let me show you why"', '"The lipstick mistake I see every season make."', '"Why some brunettes are Summers and some are Winters."'])
  );

  var celeb = section('Celebrity & Pop Culture', '#7A8C6E',
    '<div style="font-size:13px;color:var(--charcoal);line-height:1.6;margin-bottom:8px">This content performs because people already have an opinion.</div>' +
    label('Examples') +
    bullets(['Celebrity colour season breakdowns.', 'Met Gala looks.', 'Red carpet looks.', 'Trending colours.', 'Viral fashion moments.']) +
    label('Concept examples') +
    concepts(['"Amanda Seyfried is a great example of why colour analysis isn\'t just warm vs cool."', '"Who actually suits Tiffany Blue?"', '"Celebrities who glow in their natural colouring."', '"The colour season behind this viral trend."'])
  );

  var edu = section('Education Through Observation', '#6366F1',
    '<div style="font-size:13px;color:var(--charcoal);line-height:1.6;margin-bottom:8px">Teach through examples, not theory. Help people recognise themselves in the content.</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
      + '<div style="background:#FEF2F2;border-radius:8px;padding:10px 12px"><div style="font-size:10px;font-weight:700;color:#EF4444;margin-bottom:5px">AVOID</div><div style="font-size:12px;color:var(--charcoal)">"What is a Soft Autumn?"</div></div>'
      + '<div style="background:#F0FDF4;border-radius:8px;padding:10px 12px"><div style="font-size:10px;font-weight:700;color:#10B981;margin-bottom:5px">INSTEAD</div><div style="font-size:12px;color:var(--charcoal)">"You\'re probably a Soft Autumn if..."</div></div>'
    + '</div>' +
    label('More examples') +
    bullets(['You\'re probably a Light Summer if…', 'Signs you\'re dressing against your season.', 'Why black isn\'t everyone\'s neutral.', 'What people often get wrong about colour analysis.'])
  );

  var app = section('App Showcase', '#059669',
    '<div style="font-size:13px;color:var(--charcoal);line-height:1.6;margin-bottom:8px">The app should feel like a solution, not an ad. Always plug it at the end: <em>"and if you haven\'t already, go check out the Your SZN app."</em></div>' +
    concepts(['"What I would buy from [brand] if I was a Spring."', '"Shopping for your season just got easier."', '"Tiffany Blue in every season."', '"How to find occasion wear for your season."', '"My favourite Winter finds this week."'])
  );

  var client = section('Client Transformation', '#8B5CF6',
    label('Examples') +
    bullets(['Before and after colour analysis.', 'Client reactions.', 'Common things clients say after being analysed.', 'The surprising things people learn.']) +
    concepts(['"The compliment every client gets after their analysis."', '"The thing clients wish they\'d known sooner."'])
  );

  var captions = '<div style="margin-bottom:24px">'
    + '<div style="font-size:13px;font-weight:700;color:var(--charcoal);margin-bottom:12px">Caption Structure</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">'
    + [
        ['Observation', 'Tiffany Teal is everywhere right now. But what does that colour look like in your season?', '#C4956A'],
        ['Reframe',     'It\'s not about buying a whole new wardrobe. It\'s about making better wardrobe decisions.', '#7A8C6E'],
        ['Myth Bust',   'Colour analysis isn\'t about obsessing over microscopic differences. It\'s about understanding the overall harmony a colour creates with you.', '#6366F1'],
        ['Problem + Solution', '"If you\'ve ever said \'I can\'t wear green\' — this might explain why."', '#059669'],
      ].map(function(c) {
        return '<div style="background:var(--warm);border-radius:10px;padding:12px">'
          + '<div style="font-size:10px;font-weight:700;color:' + c[2] + ';margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px">' + c[0] + '</div>'
          + '<div style="font-size:12px;color:var(--charcoal);line-height:1.5;font-style:italic">"' + c[1] + '"</div>'
          + '</div>';
      }).join('')
    + '</div>'
    + '<div style="font-size:12px;color:var(--charcoal);line-height:1.6;margin-top:10px">Captions should be short, clear and easy to understand. They should sound like a smart friend sharing an insight rather than a textbook.</div>'
    + '</div>';

  var tone = '<div style="margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div style="background:var(--warm);border-radius:10px;padding:14px">'
    +   '<div style="font-size:11px;font-weight:700;color:#10B981;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Aim for</div>'
    +   bullets(['Knowledgeable', 'Relatable', 'Observant', 'Trend-aware', 'Opinionated but respectful of people\'s interests', 'Friendly'])
    + '</div>'
    + '<div style="background:var(--warm);border-radius:10px;padding:14px">'
    +   '<div style="font-size:11px;font-weight:700;color:#EF4444;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Avoid</div>'
    +   bullets(['Corporate language', 'Over-explaining', 'Technical jargon without context', 'Generic AI-sounding advice'])
    + '</div>'
    + '</div>'
    + '<div style="background:#FFF9F0;border:1px solid #C4956A33;border-radius:10px;padding:12px 14px;font-size:12px;color:var(--charcoal);line-height:1.6">'
    + '✦ <strong>Pro tip:</strong> Add random inner thoughts or few-word context bites (like this!!!) to make it feel less AI-like. The content should feel like someone who understands fashion, beauty and colour psychology and is always one step ahead.'
    + '</div>';

  var hashtags = '<div style="background:var(--warm);border-radius:10px;padding:16px;margin-bottom:24px">'
    + '<div style="font-size:13px;font-weight:700;color:var(--charcoal);margin-bottom:12px">Hashtag Strategy</div>'
    + '<div style="font-size:12px;color:var(--charcoal);margin-bottom:10px">Always include: <span style="font-weight:700;color:#C4956A">#yourszn</span></div>'
    + '<div style="font-size:12px;color:var(--charcoal);margin-bottom:8px">Rotate: <span style="color:var(--muted)">#colouranalysis · #coloranalysis · #colouranalysistok · #coloranalyst</span></div>'
    + '<div style="font-size:12px;color:var(--charcoal);margin-bottom:6px">Then add 1–2 topic-specific tags:</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:6px">'
    + ['#faketan','#selftan','#patterns','#personalstyle','#shoppingtips','#wardrobetips','#celebritystyle','#redcarpetfashion'].map(function(h){
        return '<span style="font-size:11px;background:white;border:1px solid var(--sand);border-radius:12px;padding:3px 10px;color:var(--charcoal)">' + h + '</span>';
      }).join('')
    + '</div>'
    + '<div style="font-size:11px;color:var(--muted);margin-top:8px">The caption and video topic/CC\'s should do most of the work!</div>'
    + '</div>';

  return '<div class="card" style="margin-bottom:16px">'
    + '<div class="ch"><div class="ct">Content Strategy Guide</div><div style="font-size:11px;color:var(--muted)">From Tyla</div></div>'
    + '<div class="cb">'
    + goal
    + shopping
    + makeup
    + celeb
    + edu
    + app
    + client
    + captions
    + '<div style="font-size:13px;font-weight:700;color:var(--charcoal);margin-bottom:12px">Tone of Voice</div>'
    + tone
    + '<div style="height:24px"></div>'
    + hashtags
    + '</div></div>';
}

function smStrategyNotepad() {
  return '<div class="card" style="margin-bottom:16px">'
    + '<div class="ch"><div class="ct">Team Notes</div><div style="font-size:11px;color:var(--muted)">Saves automatically</div></div>'
    + '<div class="cb">'
    + '<textarea id="sm-strategy-notes" class="fi" rows="8" placeholder="Add running notes, ideas, reminders for the team…" style="resize:vertical;font-size:13px;line-height:1.6" oninput="smSaveStrategyNotes(this.value)">' + esc(smStrategyNotes) + '</textarea>'
    + '</div></div>';
}

function smSaveStrategyNotes(val) {
  smStrategyNotes = val;
  saveData();
}

function smStrategyCard(platform, subtitle, schedule) {
  var platCol = platform === 'TikTok' ? '#010101' : '#E1306C';
  return '<div class="card">'
    + '<div class="ch">'
    +   '<div style="display:flex;align-items:center;gap:8px">'
    +     '<div style="font-size:10px;font-weight:700;color:white;background:' + platCol + ';padding:3px 9px;border-radius:8px">' + platform + '</div>'
    +     '<div class="ct" style="font-size:13px">' + subtitle + '</div>'
    +   '</div>'
    + '</div>'
    + '<div class="cb">'
    + schedule.map(function(row) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--warm)">'
          + '<div style="font-size:12px;font-weight:600;color:var(--charcoal);min-width:90px">' + row[0] + '</div>'
          + '<div style="font-size:12px;color:var(--muted)">' + row[1] + '</div>'
          + '</div>';
      }).join('')
    + '</div></div>';
}

function smStrategyPillars() {
  return '<div class="card">'
    + '<div class="ch"><div class="ct">Content Pillars</div></div>'
    + '<div class="cb" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">'
    + SM_PILLARS.map(function(p) {
        var col   = SM_PILLAR_COLORS[p];
        var count = socialPosts.filter(function(sp) { return sp.pillar === p; }).length;
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--warm);border-radius:8px">'
          + '<div style="width:12px;height:12px;border-radius:50%;background:' + col + ';flex-shrink:0"></div>'
          + '<div><div style="font-size:12px;font-weight:600;color:var(--charcoal)">' + p + '</div>'
          + '<div style="font-size:11px;color:var(--muted)">' + count + ' post' + (count !== 1 ? 's' : '') + '</div></div>'
          + '</div>';
      }).join('')
    + '</div></div>';
}

// ══ POST MODAL ══

function smLbl(text) {
  return '<label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.8px;text-transform:uppercase">' + text + '</label>';
}
var SM_FI = 'class="fi" style="width:100%;box-sizing:border-box"';
var SM_TA = function(id, rows, placeholder, extra) {
  return '<textarea id="' + id + '" class="fi" rows="' + rows + '" placeholder="' + placeholder + '" style="width:100%;box-sizing:border-box;resize:vertical' + (extra ? ';' + extra : '') + '"></textarea>';
};
var SM_SEL = function(id, extra) {
  return '<select id="' + id + '" class="fi" style="width:100%;box-sizing:border-box"' + (extra || '') + '>';
};
var SM_IN = function(id, type, placeholder) {
  return '<input id="' + id + '" type="' + (type||'text') + '" class="fi" placeholder="' + placeholder + '" style="width:100%;box-sizing:border-box">';
};

function smPostModal() {
  // Left col: Title, Stage, Platform, Pillar+Type, Assigned To, Text on Screen
  var leftCol = ''
    + '<div>' + smLbl('Title *') + SM_IN('sm-f-title', 'text', 'Post title…') + '</div>'

    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +   '<div>' + smLbl('Stage') + SM_SEL('sm-f-stage', ' onchange="smStageChange()"')
    +     SM_STAGES.map(function(s){ return '<option value="'+s.key+'">'+s.label+'</option>'; }).join('')
    +   '</select></div>'
    +   '<div id="sm-date-wrap" style="display:none">' + smLbl('Scheduled Date') + SM_IN('sm-f-date','date','') + '</div>'
    + '</div>'

    + '<div>' + smLbl('Platform')
    +   '<div style="display:flex;gap:16px;padding-top:3px">'
    +   ['TikTok','Instagram'].map(function(p){
          return '<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;user-select:none">'
            + '<input type="checkbox" id="sm-f-plat-'+p.toLowerCase()+'" value="'+p+'" style="width:15px;height:15px;cursor:pointer"> '+p+'</label>';
        }).join('')
    +   '</div></div>'

    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +   '<div>' + smLbl('Pillar') + SM_SEL('sm-f-pillar') + '<option value="">— Select pillar —</option>'
    +     SM_PILLARS.map(function(p){ return '<option value="'+p+'">'+p+'</option>'; }).join('')
    +   '</select></div>'
    +   '<div>' + smLbl('Content Type') + SM_SEL('sm-f-ctype') + '<option value="">— Select type —</option>'
    +     SM_CONTENT_TYPES.map(function(t){ return '<option value="'+t+'">'+t+'</option>'; }).join('')
    +   '</select></div>'
    + '</div>'

    + '<div>' + smLbl('Assigned To') + SM_SEL('sm-f-assign') + '<option value="">— Unassigned —</option>'
    +   ['Latisha','Lemari'].map(function(n){ return '<option value="'+n+'">'+n+'</option>'; }).join('')
    + '</select></div>'

    + '<div>' + smLbl('Text on Screen') + SM_TA('sm-f-tos', 4, 'On-screen text…') + '</div>';

  // Right col: Caption, Drive Link, Inspiration Links
  var rightCol = ''
    + '<div>' + smLbl('Caption') + SM_TA('sm-f-caption', 6, 'Caption + hashtags…') + '</div>'

    + '<div>' + smLbl('Google Drive Link') + SM_IN('sm-f-drive','text','drive.google.com/…') + '</div>'

    + '<div>' + smLbl('Inspiration Links')
    +   '<div id="sm-inspo-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px"></div>'
    +   '<div style="display:flex;gap:6px">'
    +     '<input id="sm-inspo-label" class="fi" placeholder="Label (optional)" style="flex:1;min-width:0;box-sizing:border-box;font-size:12px">'
    +     '<input id="sm-inspo-url"   class="fi" placeholder="Paste URL…"       style="flex:2;min-width:0;box-sizing:border-box;font-size:12px">'
    +     '<button onclick="smAddInspoLink()" class="btn btnp" style="padding:7px 12px;font-size:12px;white-space:nowrap;flex-shrink:0">+ Add</button>'
    +   '</div></div>';

  // Full-width bottom: Concept then Comments
  var conceptRow = '<div>' + smLbl('Concept') + SM_TA('sm-f-concept', 5, "What's the idea…") + '</div>';

  var commentsRow = '<div id="sm-comments-section">'
    +   '<div style="font-size:10px;font-weight:700;color:var(--muted);letter-spacing:.8px;text-transform:uppercase;margin-bottom:10px">Comments</div>'
    +   '<div id="sm-comments-list" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px;max-height:180px;overflow-y:auto"></div>'
    +   '<div style="position:relative">'
    +     '<textarea id="sm-comment-input" class="fi" rows="2" placeholder="Leave a comment… type @ to tag someone" style="resize:none;padding-right:70px" oninput="smCommentInput(this)" onkeydown="smCommentKey(event)"></textarea>'
    +     '<button onclick="smAddComment()" class="btn btnp" style="position:absolute;bottom:8px;right:8px;padding:5px 12px;font-size:11px">Post</button>'
    +   '</div>'
    +   '<div id="sm-mention-dropdown" style="display:none;position:absolute;background:white;border:1px solid var(--sand);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:700;min-width:160px;overflow:hidden"></div>'
    + '</div>';

  return '<div id="sm-post-modal" style="display:none;position:fixed;inset:0;background:rgba(28,23,18,.55);z-index:600;overflow-y:auto;padding:40px 16px">'
    + '<div style="background:white;border-radius:16px;padding:28px 32px;max-width:1000px;width:100%;position:relative;margin:0 auto">'
    + '<button onclick="smCloseModal()" style="position:absolute;top:14px;right:18px;background:none;border:none;font-size:24px;cursor:pointer;color:var(--muted);line-height:1">&#215;</button>'
    + '<div id="sm-modal-heading" style="font-size:18px;font-weight:700;color:var(--deep);margin-bottom:22px">New Post</div>'

    + '<div style="display:flex;flex-direction:column;gap:20px">'

    // Two columns: left narrow (metadata), right wider (caption/links)
    +   '<div style="display:grid;grid-template-columns:5fr 6fr;gap:28px;align-items:start">'
    +     '<div style="display:flex;flex-direction:column;gap:14px">' + leftCol + '</div>'
    +     '<div style="display:flex;flex-direction:column;gap:14px">' + rightCol + '</div>'
    +   '</div>'

    // Full-width: Concept
    +   '<div style="border-top:1px solid var(--warm);padding-top:18px">' + conceptRow + '</div>'

    // Full-width: Script
    +   '<div style="border-top:1px solid var(--warm);padding-top:18px">'
    +     smLbl('Script')
    +     SM_TA('sm-f-script', 6, 'Write or paste the script here…')
    +   '</div>'

    // Full-width: Comments
    +   '<div style="border-top:1px solid var(--warm);padding-top:18px">' + commentsRow + '</div>'

    + '</div>'

    + '<div id="sm-f-err" style="color:#EF4444;font-size:12px;display:none;margin-top:12px"></div>'
    + '<div style="display:flex;gap:8px;justify-content:space-between;margin-top:22px;padding-top:16px;border-top:1px solid var(--warm)">'
    +   '<button id="sm-f-del" onclick="smDeletePost()" style="display:none;background:none;border:1px solid #EF4444;color:#EF4444;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;font-weight:600">Delete</button>'
    +   '<div style="display:flex;gap:8px;margin-left:auto">'
    +     '<button onclick="smCloseModal()" style="background:none;border:1px solid var(--sand);border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;color:var(--charcoal)">Cancel</button>'
    +     '<button onclick="smSavePost()" class="btn btnp" style="padding:8px 22px">Save</button>'
    +   '</div>'
    + '</div>'
    + '</div></div>';
}

function smStageChange() {
  var stage = document.getElementById('sm-f-stage');
  var wrap  = document.getElementById('sm-date-wrap');
  if (!stage || !wrap) return;
  wrap.style.display = (stage.value === 'scheduled' || stage.value === 'posted') ? 'block' : 'none';
}

function smOpenModal(id, defaultStage, defaultDate) {
  _smEditId = id;
  var post  = id ? socialPosts.find(function(p) { return p.id === id; }) : null;

  var modal = document.getElementById('sm-post-modal');
  if (!modal) { renderSocialPage(); modal = document.getElementById('sm-post-modal'); }

  document.getElementById('sm-modal-heading').textContent = post ? 'Edit Post' : 'New Post';
  document.getElementById('sm-f-title').value   = post ? (post.title || '')        : '';
  document.getElementById('sm-f-stage').value   = post ? (post.stage || 'idea')    : (defaultStage || 'idea');
  document.getElementById('sm-f-date').value    = post ? (post.scheduledDate || '') : (defaultDate || '');
  document.getElementById('sm-f-pillar').value  = post ? (post.pillar || '')        : '';
  document.getElementById('sm-f-ctype').value   = post ? (post.contentType || '')   : '';
  document.getElementById('sm-f-assign').value  = post ? (post.assignedTo || '')    : '';
  document.getElementById('sm-f-concept').value = post ? (post.concept || '')       : '';
  document.getElementById('sm-f-tos').value     = post ? (post.textOnScreen || '')  : '';
  document.getElementById('sm-f-caption').value = post ? (post.caption || '')       : '';
  document.getElementById('sm-f-drive').value   = post ? (post.driveLink || '')     : '';
  document.getElementById('sm-f-script').value  = post ? (post.script || '')        : '';

  smRenderInspoLinks(post ? (post.inspirationLinks || []) : []);

  ['TikTok', 'Instagram'].forEach(function(p) {
    var cb = document.getElementById('sm-f-plat-' + p.toLowerCase());
    if (cb) cb.checked = post ? (post.platform || []).indexOf(p) !== -1 : false;
  });

  smStageChange();

  document.getElementById('sm-f-del').style.display = post ? 'inline-block' : 'none';
  var errEl = document.getElementById('sm-f-err');
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

  // Reset drafts and render comments (always visible in right column)
  _smDraftComments = [];
  smRenderComments(post ? post.id : null);

  modal.style.display = 'block';
  setTimeout(function() { var t = document.getElementById('sm-f-title'); if (t) t.focus(); }, 80);
}

function smCloseModal() {
  var modal = document.getElementById('sm-post-modal');
  if (modal) modal.style.display = 'none';
}

function smSavePost() {
  var title = document.getElementById('sm-f-title').value.trim();
  if (!title) {
    var errEl = document.getElementById('sm-f-err');
    errEl.textContent = 'Title is required.'; errEl.style.display = 'block'; return;
  }

  var platforms = [];
  ['TikTok', 'Instagram'].forEach(function(p) {
    var cb = document.getElementById('sm-f-plat-' + p.toLowerCase());
    if (cb && cb.checked) platforms.push(p);
  });

  var now = Date.now();
  var existing = _smEditId ? socialPosts.find(function(p) { return p.id === _smEditId; }) : null;

  var obj = {
    id:           _smEditId || ('sp' + now),
    title:        title,
    stage:        document.getElementById('sm-f-stage').value,
    scheduledDate: document.getElementById('sm-f-date').value || null,
    platform:     platforms,
    pillar:       document.getElementById('sm-f-pillar').value,
    contentType:  document.getElementById('sm-f-ctype').value,
    assignedTo:   document.getElementById('sm-f-assign').value,
    concept:      document.getElementById('sm-f-concept').value.trim(),
    textOnScreen: document.getElementById('sm-f-tos').value.trim(),
    caption:      document.getElementById('sm-f-caption').value.trim(),
    driveLink:         document.getElementById('sm-f-drive').value.trim(),
    script:            document.getElementById('sm-f-script').value.trim(),
    inspirationLinks:  smGetInspoLinks(),
    comments:          existing ? (existing.comments || []) : _smDraftComments.slice(),
    createdAt:    existing ? (existing.createdAt || now) : now,
    lastModified: now
  };

  if (_smEditId) {
    var idx = socialPosts.findIndex(function(p) { return p.id === _smEditId; });
    if (idx > -1) socialPosts[idx] = obj;
  } else {
    socialPosts.push(obj);
  }

  // Jump calendar to the scheduled month if a date was set
  if (obj.scheduledDate && (smActiveTab === 'calendar' || smActiveTab === 'pipeline')) {
    var parts = obj.scheduledDate.split('-');
    smCalYear  = parseInt(parts[0]);
    smCalMonth = parseInt(parts[1]) - 1;
  }

  smCloseModal();
  saveData();
  renderSocialPage();
}

function smDeletePost() {
  if (!_smEditId) return;
  if (!confirm('Delete this post?')) return;
  socialPosts = socialPosts.filter(function(p) { return p.id !== _smEditId; });
  smCloseModal();
  saveData();
  renderSocialPage();
}

// ══ INSPIRATION LINKS ══

var _smInspoLinks = [];

function smRenderInspoLinks(links) {
  _smInspoLinks = links ? links.slice() : [];
  var el = document.getElementById('sm-inspo-list'); if (!el) return;
  if (!_smInspoLinks.length) { el.innerHTML = ''; return; }
  el.innerHTML = _smInspoLinks.map(function(lnk, i) {
    var display = lnk.label || lnk.url;
    return '<div style="display:flex;align-items:center;gap:6px;background:var(--warm);border-radius:8px;padding:6px 10px">'
      + '<a href="' + esc(lnk.url) + '" target="_blank" rel="noopener" style="font-size:12px;color:#6366F1;text-decoration:none;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(lnk.url) + '">&#128279; ' + esc(display) + '</a>'
      + '<button onclick="smRemoveInspoLink(' + i + ')" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--muted);flex-shrink:0;padding:0 2px">&#10005;</button>'
      + '</div>';
  }).join('');
}

function smAddInspoLink() {
  var urlEl   = document.getElementById('sm-inspo-url');
  var labelEl = document.getElementById('sm-inspo-label');
  var url = urlEl ? urlEl.value.trim() : '';
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  _smInspoLinks.push({ label: labelEl ? labelEl.value.trim() : '', url: url });
  if (urlEl)   urlEl.value   = '';
  if (labelEl) labelEl.value = '';
  smRenderInspoLinks(_smInspoLinks);
}

function smRemoveInspoLink(i) {
  _smInspoLinks.splice(i, 1);
  smRenderInspoLinks(_smInspoLinks);
}

function smGetInspoLinks() {
  return _smInspoLinks.slice();
}

// ══ COMMENTS ══

var SM_VIDEO_TYPES = ['Quick Chat', 'Reel', 'Quick Comparisons', 'Review/Overlays', 'Celebrity Analysis', 'Consultation'];

function smContentTypeIcon(contentType) {
  if (!contentType) return '';
  var isVideo = SM_VIDEO_TYPES.indexOf(contentType) !== -1;
  var icon = isVideo
    ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M8 5v14l11-7z"/></svg>'
    : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';
  var label = isVideo ? 'Video' : 'Static';
  var col   = isVideo ? '#6366F1' : '#F97316';
  return '<span style="display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;color:' + col + ';background:' + col + '18;border-radius:5px;padding:2px 6px">' + icon + label + '</span>';
}

function smScriptIcon() {
  return '<span title="Script added" style="display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;color:#059669;background:#05996918;border-radius:5px;padding:2px 6px">'
    + '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
    + 'Script</span>';
}

var SM_STAFF = ['Latisha', 'Lemari'];
var SM_STAFF_COLORS = {Latisha:'#C4956A', Lemari:'#7A8C6E'};

function smRenderComments(postId) {
  var listEl = document.getElementById('sm-comments-list'); if (!listEl) return;
  var comments;
  if (postId) {
    var post = socialPosts.find(function(p) { return p.id === postId; });
    comments = post ? (post.comments || []) : [];
  } else {
    comments = _smDraftComments;
  }

  if (!comments.length) {
    listEl.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:4px 0">No comments yet — be the first to leave one.</div>';
    return;
  }

  listEl.innerHTML = comments.map(function(c) {
    var initials = c.author ? c.author.slice(0, 1).toUpperCase() : '?';
    var col = SM_STAFF_COLORS[c.author] || '#9CA3AF';
    return '<div style="display:flex;gap:10px;align-items:flex-start">'
      + '<div style="width:28px;height:28px;border-radius:50%;background:' + col + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;flex-shrink:0">' + initials + '</div>'
      + '<div style="flex:1;min-width:0">'
      +   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">'
      +     '<span style="font-size:12px;font-weight:700;color:var(--charcoal)">' + esc(c.author || '') + '</span>'
      +     '<span style="font-size:10px;color:var(--muted)">' + smRelTime(c.createdAt) + '</span>'
      +     (c.author === smCurrentUser() ? '<button onclick="smDeleteComment(\'' + postId + '\',\'' + c.id + '\')" style="background:none;border:none;font-size:10px;color:var(--muted);cursor:pointer;padding:0;margin-left:auto">&#10005;</button>' : '')
      +   '</div>'
      +   '<div style="font-size:13px;color:var(--charcoal);line-height:1.5;background:var(--warm);border-radius:8px;padding:8px 10px">' + smFormatMentions(esc(c.text)) + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

function smCurrentUser() {
  if (typeof curUser === 'undefined') return '';
  return curUser ? curUser.charAt(0).toUpperCase() + curUser.slice(1) : '';
}

function smFormatMentions(html) {
  return html.replace(/@(Latisha|Lemari)/g, function(match, name) {
    var col = SM_STAFF_COLORS[name] || '#9CA3AF';
    return '<span style="font-weight:700;color:' + col + ';background:' + col + '18;border-radius:4px;padding:1px 4px">@' + name + '</span>';
  });
}

function smAddComment() {
  var input = document.getElementById('sm-comment-input'); if (!input) return;
  var text  = input.value.trim(); if (!text) return;

  var now    = Date.now();
  var author = smCurrentUser();
  var comment = { id: 'c' + now, author: author, text: text, createdAt: now };

  if (_smEditId) {
    // Editing an existing saved post
    var post = socialPosts.find(function(p) { return p.id === _smEditId; });
    if (!post) return;
    if (!post.comments) post.comments = [];
    post.comments.push(comment);

    SM_STAFF.forEach(function(name) {
      if (text.indexOf('@' + name) !== -1 && name !== author) {
        var uid = name.toLowerCase();
        if (!smMentions[uid]) smMentions[uid] = [];
        smMentions[uid].push({ postId: _smEditId, commentId: comment.id, from: author, text: text, ts: now, seen: false });
      }
    });

    saveData();
    smUpdateNavBadge();
  } else {
    // New post not saved yet — buffer in draft
    _smDraftComments.push(comment);
  }

  input.value = '';
  smHideMentionDropdown();
  smRenderComments(_smEditId || null);
}

function smDeleteComment(postId, commentId) {
  var post = socialPosts.find(function(p) { return p.id === postId; });
  if (!post) return;
  post.comments = (post.comments || []).filter(function(c) { return c.id !== commentId; });
  saveData();
  smRenderComments(postId);
}

// ── @mention autocomplete ──

var _smMentionQuery = '';

function smCommentInput(textarea) {
  var val = textarea.value;
  var pos = textarea.selectionStart;
  var before = val.slice(0, pos);
  var atMatch = before.match(/@(\w*)$/);

  if (atMatch) {
    _smMentionQuery = atMatch[1].toLowerCase();
    var matches = SM_STAFF.filter(function(n) { return n.toLowerCase().startsWith(_smMentionQuery); });
    if (matches.length) { smShowMentionDropdown(matches, textarea); return; }
  }
  smHideMentionDropdown();
}

function smCommentKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    var dd = document.getElementById('sm-mention-dropdown');
    if (dd && dd.style.display !== 'none') { e.preventDefault(); return; }
    e.preventDefault();
    smAddComment();
  }
  if (e.key === 'Escape') smHideMentionDropdown();
}

function smShowMentionDropdown(names, textarea) {
  var dd = document.getElementById('sm-mention-dropdown'); if (!dd) return;
  var rect = textarea.getBoundingClientRect();
  dd.style.cssText = 'display:block;position:fixed;left:' + rect.left + 'px;top:' + (rect.top - (names.length * 40 + 8)) + 'px;background:white;border:1px solid var(--sand);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:700;min-width:160px;overflow:hidden';
  dd.innerHTML = names.map(function(n) {
    var col = SM_STAFF_COLORS[n] || '#9CA3AF';
    return '<div onclick="smInsertMention(\'' + n + '\')" style="display:flex;align-items:center;gap:8px;padding:9px 14px;cursor:pointer;font-size:13px;font-weight:600;color:var(--charcoal)" onmouseover="this.style.background=\'var(--warm)\'" onmouseout="this.style.background=\'\'">'
      + '<div style="width:22px;height:22px;border-radius:50%;background:' + col + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white">' + n.charAt(0) + '</div>'
      + '@' + n
      + '</div>';
  }).join('');
}

function smHideMentionDropdown() {
  var dd = document.getElementById('sm-mention-dropdown');
  if (dd) dd.style.display = 'none';
}

function smInsertMention(name) {
  var input = document.getElementById('sm-comment-input'); if (!input) return;
  var val   = input.value;
  var pos   = input.selectionStart;
  var before = val.slice(0, pos);
  var after  = val.slice(pos);
  var replaced = before.replace(/@\w*$/, '@' + name + ' ');
  input.value = replaced + after;
  input.focus();
  var newPos = replaced.length;
  input.setSelectionRange(newPos, newPos);
  smHideMentionDropdown();
}

// ── Mention nav badge ──

function smUpdateNavBadge() {
  var uid  = typeof curUser !== 'undefined' ? curUser : '';
  var unseen = uid && smMentions[uid] ? smMentions[uid].filter(function(m) { return !m.seen; }).length : 0;
  var navItem = document.getElementById('n-social'); if (!navItem) return;
  var existing = navItem.querySelector('.sm-mention-badge');
  if (unseen > 0) {
    if (!existing) {
      existing = document.createElement('span');
      existing.className = 'sm-mention-badge';
      existing.style.cssText = 'background:#E1306C;color:#fff;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:700;margin-left:auto;min-width:18px;text-align:center';
      navItem.appendChild(existing);
    }
    existing.textContent = unseen;
  } else if (existing) {
    existing.remove();
  }
}

// ── Date format helper ──
function smFmtDate(dateStr) {
  if (!dateStr) return '';
  var parts  = dateStr.split('-');
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1];
}

// ══ ANALYTICS ══

function smRenderAnalytics() {
  var log = (smAnalyticsLog || []).slice().sort(function(a,b){ return a.weekEnding < b.weekEnding ? 1 : -1; });
  var recent = log.slice(0, 8).reverse(); // oldest→newest for charts

  // ── Summary cards ──
  var ttViewsTotal = 0, ttFollowersTotal = 0, igReachTotal = 0, igFollowersTotal = 0;
  recent.forEach(function(e){
    ttViewsTotal    += (e.tt && e.tt.views)     ? parseInt(e.tt.views)     || 0 : 0;
    ttFollowersTotal+= (e.tt && e.tt.followers) ? parseInt(e.tt.followers) || 0 : 0;
    igReachTotal    += (e.ig && e.ig.reach)     ? parseInt(e.ig.reach)     || 0 : 0;
    igFollowersTotal+= (e.ig && e.ig.followers) ? parseInt(e.ig.followers) || 0 : 0;
  });

  function fmtNum(n) { return n >= 1000 ? (n/1000).toFixed(1) + 'k' : String(n); }

  var cards = [
    { label:'TikTok Views',        value: log.length ? fmtNum(ttViewsTotal)     : '—', sub:'last ' + recent.length + ' weeks', col:'#6366F1' },
    { label:'TikTok New Followers',value: log.length ? (ttFollowersTotal >= 0 ? '+' : '') + fmtNum(ttFollowersTotal) : '—', sub:'last ' + recent.length + ' weeks', col:'#6366F1' },
    { label:'Instagram Reach',     value: log.length ? fmtNum(igReachTotal)     : '—', sub:'last ' + recent.length + ' weeks', col:'#E1306C' },
    { label:'IG New Followers',    value: log.length ? (igFollowersTotal >= 0 ? '+' : '') + fmtNum(igFollowersTotal) : '—', sub:'last ' + recent.length + ' weeks', col:'#E1306C' },
  ];

  var cardHtml = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px">'
    + cards.map(function(c){
        return '<div style="background:white;border:1px solid var(--sand);border-radius:12px;padding:16px 18px;border-top:3px solid ' + c.col + '">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">' + c.label + '</div>'
          + '<div style="font-size:26px;font-weight:700;color:var(--deep);line-height:1">' + c.value + '</div>'
          + '<div style="font-size:11px;color:var(--muted);margin-top:4px">' + c.sub + '</div>'
          + '</div>';
      }).join('')
    + '</div>';

  // ── Bar charts ──
  function barChart(entries, valueFn, color, label) {
    if (!entries.length) return '<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px">No data yet</div>';
    var vals = entries.map(function(e){ return parseInt(valueFn(e)) || 0; });
    var maxV = Math.max.apply(null, vals) || 1;
    return '<div style="display:flex;align-items:flex-end;gap:6px;height:100px;padding-bottom:22px;position:relative">'
      + entries.map(function(e, i){
          var h = Math.max(4, Math.round((vals[i] / maxV) * 84));
          var lbl = e.weekEnding ? e.weekEnding.slice(5).replace('-','/') : '';
          return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">'
            + '<div title="' + vals[i] + '" style="width:100%;background:' + color + ';border-radius:4px 4px 0 0;height:' + h + 'px;opacity:.85;transition:opacity .15s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.85"></div>'
            + '<div style="font-size:9px;color:var(--muted);white-space:nowrap">' + lbl + '</div>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  var chartsHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px">'
    + '<div style="background:white;border:1px solid var(--sand);border-radius:12px;padding:18px 20px">'
    +   '<div style="font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#6366F1;margin-bottom:14px">TikTok Views</div>'
    +   barChart(recent, function(e){ return e.tt ? e.tt.views : 0; }, '#6366F1', 'Views')
    + '</div>'
    + '<div style="background:white;border:1px solid var(--sand);border-radius:12px;padding:18px 20px">'
    +   '<div style="font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#E1306C;margin-bottom:14px">Instagram Reach</div>'
    +   barChart(recent, function(e){ return e.ig ? e.ig.reach : 0; }, '#E1306C', 'Reach')
    + '</div>'
    + '</div>';

  // ── Log table ──
  var tableHtml = '';
  if (log.length) {
    tableHtml = '<div style="background:white;border:1px solid var(--sand);border-radius:12px;overflow:hidden;margin-bottom:24px">'
      + '<table style="width:100%;border-collapse:collapse">'
      + '<thead><tr style="background:var(--warm)">'
      + '<th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:.7px;text-transform:uppercase;color:var(--muted)">Week ending</th>'
      + '<th style="padding:10px 14px;text-align:right;color:#6366F1;font-size:10px;letter-spacing:.7px;text-transform:uppercase">TT Views</th>'
      + '<th style="padding:10px 14px;text-align:right;color:#6366F1;font-size:10px;letter-spacing:.7px;text-transform:uppercase">TT +Followers</th>'
      + '<th style="padding:10px 14px;text-align:right;color:#E1306C;font-size:10px;letter-spacing:.7px;text-transform:uppercase">IG Reach</th>'
      + '<th style="padding:10px 14px;text-align:right;color:#E1306C;font-size:10px;letter-spacing:.7px;text-transform:uppercase">IG +Followers</th>'
      + '<th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:.7px;text-transform:uppercase;color:var(--muted)">Best post</th>'
      + '<th style="padding:10px 14px;width:32px"></th>'
      + '</tr></thead><tbody>'
      + log.map(function(e, i){
          var bg = i % 2 === 0 ? 'white' : 'var(--warm)';
          var best = (e.tt && e.tt.bestPost) ? e.tt.bestPost : (e.ig && e.ig.bestPost) ? e.ig.bestPost : '—';
          return '<tr style="background:' + bg + '">'
            + '<td style="padding:10px 14px;font-size:12px;font-weight:600;color:var(--deep)">' + (e.weekEnding || '—') + '</td>'
            + '<td style="padding:10px 14px;text-align:right;font-size:13px;color:#6366F1;font-weight:600">' + fmtNum(parseInt((e.tt && e.tt.views) || 0)) + '</td>'
            + '<td style="padding:10px 14px;text-align:right;font-size:13px;color:#6366F1">' + (parseInt((e.tt && e.tt.followers) || 0) >= 0 ? '+' : '') + (parseInt((e.tt && e.tt.followers) || 0)) + '</td>'
            + '<td style="padding:10px 14px;text-align:right;font-size:13px;color:#E1306C;font-weight:600">' + fmtNum(parseInt((e.ig && e.ig.reach) || 0)) + '</td>'
            + '<td style="padding:10px 14px;text-align:right;font-size:13px;color:#E1306C">' + (parseInt((e.ig && e.ig.followers) || 0) >= 0 ? '+' : '') + (parseInt((e.ig && e.ig.followers) || 0)) + '</td>'
            + '<td style="padding:10px 14px;font-size:11px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(best.slice(0,60)) + '</td>'
            + '<td style="padding:10px 8px;text-align:center"><button onclick="smDeleteAnalyticsEntry(\'' + e.id + '\')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:2px 4px" title="Delete">✕</button></td>'
            + '</tr>';
        }).join('')
      + '</tbody></table></div>';
  } else {
    tableHtml = '<div style="background:white;border:1px solid var(--sand);border-radius:12px;padding:40px;text-align:center;color:var(--muted);font-size:13px;margin-bottom:24px">No entries yet — log your first week above.</div>';
  }

  // ── Entry form ──
  var today = new Date(); var dd = String(today.getDate()).padStart(2,'0'); var mm = String(today.getMonth()+1).padStart(2,'0'); var yyyy = today.getFullYear();
  var todayStr = yyyy + '-' + mm + '-' + dd;

  var formHtml = '<div id="sm-analytics-form" style="background:white;border:1px solid var(--sand);border-radius:12px;padding:22px 24px;margin-bottom:24px">'
    + '<div style="font-size:14px;font-weight:700;color:var(--deep);margin-bottom:18px">Log this week</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">'

    // TikTok column
    + '<div>'
    + '<div style="font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:#6366F1;margin-bottom:12px;display:flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="#6366F1"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z"/></svg> TikTok</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    + '<div><label style="font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Views this week</label>' + SM_IN('sm-al-tt-views','number','e.g. 4200') + '</div>'
    + '<div><label style="font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">New followers</label>' + SM_IN('sm-al-tt-followers','number','e.g. 38') + '</div>'
    + '<div><label style="font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Likes this week</label>' + SM_IN('sm-al-tt-likes','number','e.g. 210') + '</div>'
    + '<div><label style="font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Best post title</label>' + SM_IN('sm-al-tt-best','text','Which post performed best?') + '</div>'
    + '</div></div>'

    // Instagram column
    + '<div>'
    + '<div style="font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:#E1306C;margin-bottom:12px;display:flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E1306C" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#E1306C" stroke="none"/></svg> Instagram</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    + '<div><label style="font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Reach this week</label>' + SM_IN('sm-al-ig-reach','number','e.g. 1800') + '</div>'
    + '<div><label style="font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">New followers</label>' + SM_IN('sm-al-ig-followers','number','e.g. 12') + '</div>'
    + '<div><label style="font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Likes this week</label>' + SM_IN('sm-al-ig-likes','number','e.g. 95') + '</div>'
    + '<div><label style="font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Best post title</label>' + SM_IN('sm-al-ig-best','text','Which post performed best?') + '</div>'
    + '</div></div>'
    + '</div>'

    // Week ending + notes + save
    + '<div style="display:grid;grid-template-columns:180px 1fr auto;gap:12px;align-items:end;margin-top:4px">'
    + '<div><label style="font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Week ending</label>' + SM_IN('sm-al-week','date','') + '</div>'
    + '<div><label style="font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Notes / wins / observations</label>' + SM_IN('sm-al-notes','text','e.g. Reel about colour blocking went viral…') + '</div>'
    + '<button class="btn btnp" onclick="smSaveAnalyticsEntry()" style="white-space:nowrap;padding:9px 20px">Save Entry</button>'
    + '</div>'
    + '</div>';

  // Set default week ending to next Sunday
  setTimeout(function(){
    var w = document.getElementById('sm-al-week');
    if (w && !w.value) {
      var d = new Date(); var day = d.getDay(); var diff = day === 0 ? 0 : 7 - day;
      d.setDate(d.getDate() + diff);
      w.value = d.toISOString().slice(0,10);
    }
  }, 50);

  return formHtml + cardHtml + chartsHtml + tableHtml;
}

function smSaveAnalyticsEntry() {
  var weekEnding = (document.getElementById('sm-al-week') || {}).value || '';
  if (!weekEnding) { alert('Please set a week ending date.'); return; }
  var entry = {
    id: 'al_' + Date.now(),
    weekEnding: weekEnding,
    tt: {
      views:     parseInt(document.getElementById('sm-al-tt-views').value)     || 0,
      followers: parseInt(document.getElementById('sm-al-tt-followers').value) || 0,
      likes:     parseInt(document.getElementById('sm-al-tt-likes').value)     || 0,
      bestPost:  document.getElementById('sm-al-tt-best').value.trim(),
    },
    ig: {
      reach:     parseInt(document.getElementById('sm-al-ig-reach').value)     || 0,
      followers: parseInt(document.getElementById('sm-al-ig-followers').value) || 0,
      likes:     parseInt(document.getElementById('sm-al-ig-likes').value)     || 0,
      bestPost:  document.getElementById('sm-al-ig-best').value.trim(),
    },
    notes: document.getElementById('sm-al-notes').value.trim(),
  };
  smAnalyticsLog.push(entry);
  saveData();
  renderSocialPage();
}

function smDeleteAnalyticsEntry(id) {
  if (!confirm('Delete this entry?')) return;
  smAnalyticsLog = smAnalyticsLog.filter(function(e){ return e.id !== id; });
  saveData();
  renderSocialPage();
}

// ══ IDEA BANK SEEDS ══

var SM_SEED_IDEAS = [
  // ── Content ideas ──
  { id:'seed_1',  pillar:'Colour Education',               contentType:'Carousel',  title:'Brands that do colour analysis right',             concept:'As a professional colour analyst it tickles my brain in the best way when brands dress their models in their season… [brand] is a great example of that… continue with examples of specific brands + models.' },
  { id:'seed_2',  pillar:'Client Sessions',                contentType:'Carousel',  title:"My client's style before/after colour analysis",    concept:'Get past clients to send before styled/outfit pics and after. Show side-by-side transformation.' },
  { id:'seed_3',  pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'Why copying celebrity outfits rarely works',        concept:"If you've gone on Pinterest and tried to replicate a celebrity's outfit because you have the same features as them and it just hasn't worked… explain why features alone don't account for season." },
  { id:'seed_4',  pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'Shopping right after your colour analysis may be harder before it gets easier',  concept:'Walk through the transition period — then plug the app at the end: "this is why I\'ve made it easier for you…"' },
  { id:'seed_5',  pillar:'Shopping By Season',             contentType:'Reel',      title:"Where I'd be shopping my [season] staples right now", concept:'Series format — swap out [season] each video. Show specific pieces from specific stores.' },
  { id:'seed_6',  pillar:'Colour Education',               contentType:'Reel',      title:"If you're a big black wearer… navy may actually suit you better", concept:'Show examples of who this applies to. Can extend to lipstick shades, sunglasses shades etc. Simple specific change, profound outcome.' },
  { id:'seed_7',  pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'If you buy clothes because they look good on the model…', concept:"How often have you returned them? If you shop without taking the model's features into account and just think the outfit is fire because of them… explain why this fails." },
  { id:'seed_8',  pillar:'Colour Education',               contentType:'Quick Chat', title:'Problems olive skin girls know too well',           concept:'Relatable hook for olive-toned people. Frustrations, mismatch moments, and the colour analysis solution.' },
  { id:'seed_9',  pillar:'Colour Education',               contentType:'Quick Chat', title:'Problems cool-toned brunettes know too well',       concept:'Relatable hook for cool-toned brunettes. Same structure as olive skin post.' },
  { id:'seed_10', pillar:'Colour Education',               contentType:'Reel',      title:'White tee and jeans is the cool girl vibe… but could I convince you to try off-white?', concept:'Talk about who suits beige instead of white and what that does for someone chasing the clean/model-off-duty aesthetic. Show examples.' },
  { id:'seed_11', pillar:'Colour Education',               contentType:'Reel',      title:'Your [undertone] matters more than the trend',      concept:'Series! Swap [undertone] for another word. Break down current trends/patterns — e.g. zebra print is all the rage right now, who does it work for and who does it not work for?' },
  { id:'seed_12', pillar:'Colour Education',               contentType:'Quick Chat', title:'If you want your teeth to look whiter, your makeup should reflect your season', concept:'Catchy hook — test grabs like this. Explain the link between season and which shades brighten vs dull the smile.' },
  { id:'seed_13', pillar:'Client Sessions',                contentType:'Carousel',  title:'What [colour] do you think my client looks best in?', concept:'Screenshot colour swatches. Eliminate until you get to the end and explain as you go. Interactive/poll format.' },
  { id:'seed_14', pillar:'Shopping By Season',             contentType:'Carousel',  title:'How to tell if a colour is warm or cool when shopping online', concept:'Practical guide — what to look for in product photos, descriptions and swatches when you can\'t see it in person.' },
  { id:'seed_15', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'Colour analysis can save you money',               concept:"You'll stop buying those tops you said 'I'll wear them for an event' about but never reach for because deep down you know you wouldn't always wear them." },
  // ── Compilations ──
  { id:'seed_16', pillar:'Client Sessions',                contentType:'Reel',      title:'My face when the client picks the exact colours I knew they\'d hate', concept:'Compilation — clips of bad reactions, max 3 secs each.' },
  { id:'seed_17', pillar:'Client Sessions',                contentType:'Reel',      title:"I'll never get over watching a client discover their season", concept:'Compilation — clips of positive reactions, max 3 secs each.' },
  { id:'seed_18', pillar:'Client Sessions',                contentType:'Reel',      title:"Me figuring out how I'm going to break it to my clients when they don't see that these are their worst colours", concept:'Compilation — clips of the opposite reactions you expected them to have, max 3 secs each.' },
  // ── Tyla batch 2 ──
  { id:'seed_19', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'If I had $300 to spend at [Brand] as a Soft Autumn',                    concept:'Walk through a specific budget shop at a brand (swap out the brand each time). Show exactly which pieces and why they work for that season.' },
  { id:'seed_20', pillar:'Colour Education',               contentType:'Quick Chat', title:'The reason "wrong" colours make you look tired',                         concept:'Colour reflects back onto the skin. Green undertones can emphasise redness, yellow can exaggerate sallowness, grey can drain warmth… elaborate with examples.' },
  { id:'seed_21', pillar:'Shopping By Season',             contentType:'Reel',       title:'Shopping for a light summer palette in winter — [3] stores doing it right now', concept:'Shopping for a light summer palette isn\'t easy during the winter months… but there are [3] stores doing it well right now: list them out.' },
  { id:'seed_22', pillar:'Static Posts',                   contentType:'Reel',       title:'"This look" — recreating a seasonal inspo look as a chatty 30-45 sec video', concept:'Summer colour palettes can be tricky to shop for when winter shopping comes around, but I\'m making that easier for you… show the pinterest inspo (pic overlay), then the look you\'ve put together (overlay on top, like on IG). Say where the pieces are from first, THEN go into the value-based notes of your caption. Can end on: "i\'ve just opened more virtual online colour analysis spots if you\'d like to know your season!"' },
  { id:'seed_23', pillar:'Shopping By Season',             contentType:'Reel',       title:'MECCA haul — blush & eyeshadow palettes by season',                     concept:'MECCA: Blush and eyeshadow palettes. This would be major — break down which shades work for which seasons.' },
  { id:'seed_24', pillar:'Client Sessions',                contentType:'Reel',       title:'Compilation of clients\' BEST reactions',                               concept:'Compilation — one clip of a best/most positive client reaction per client. Max 3 secs each.' },
  { id:'seed_25', pillar:'Static Posts',                   contentType:'Carousel',   title:'"You\'re probably a light summer if…" series',                          concept:'"You\'re probably a light summer if…" series — can be done for each season, maybe one a week. Static carousel format.' },
  { id:'seed_26', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'The difference between "that colour is pretty" and "that colour SUUUITS YOU"', concept:'Explain the difference between objectively liking a colour vs it actually suiting your season. This could also be used as text on screen for a client if you\'re showing the difference.' },
  { id:'seed_27', pillar:'Colour Education',               contentType:'Quick Chat', title:'Online colour analysis — why your phone can pick up what your eyes can\'t', concept:'If you\'ve been hesitant on online colour analysis, your phone/camera can actually pick up colour inconsistencies that your eyes adapt to in real life. It can work surprisingly well with the right lighting/photos, and if you have a comprehensive follow-up like mine. Maybe insert screenshot.' },
  { id:'seed_28', pillar:'Shopping By Season',             contentType:'Reel',       title:'Shopping my season at [Store] — gym clothes, Portmans new arrivals, new releases', concept:'Series format — swap out the store and category each time. Specific picks: gym clothes, Portmans brand-specific new arrivals, new releases.' },
  { id:'seed_29', pillar:'Client Sessions',                contentType:'Reel',       title:'Compilation of clients\' WORST reactions',                              concept:'Compilation — one clip of a client\'s worst/most unexpected reaction per client. Max 3 secs each.' },
  { id:'seed_30', pillar:'Static Posts',                   contentType:'Quick Chat', title:'Hot takes: colour analyst edition',                                     concept:'Share unpopular opinions or surprising insights from a colour analyst\'s perspective. Punchy, opinionated format.' },
  { id:'seed_31', pillar:'Shopping By Season',             contentType:'Reel',       title:'I analysed the new [Brand] collection so you don\'t have to',           concept:'New collection review — break down which pieces work for which seasons so your audience doesn\'t have to do the work. Swap out [Brand] each time.' },
  { id:'seed_32', pillar:'Client Sessions',                contentType:'Reel',       title:'One-off client clips',                                                  concept:'One-off standout clips from client sessions — interesting moments, reactions, or discoveries that don\'t fit a compilation.' },
  { id:'seed_33', pillar:'Client Sessions',                contentType:'Reel',       title:'Short before/afters',                                                   concept:'Short before/after clips from client sessions showing the colour transformation. Quick and punchy.' },
  // ── Carousel ideas batch ──
  // Personal Expertise & Opinions
  { id:'seed_34', pillar:'Personal Expertise & Opinions',  contentType:'Reel',       title:'Season-based club content (green screen inspired by the clubs I created)', concept:'Film a video/green screen inspired by the season-based clubs you created. Show the concept and why it works.' },
  { id:'seed_35', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'What nobody warns you about dealing with [specific problem] clients',       concept:'Some people just want confirmation that the colours they like suit them — in reality, often they are wrong. Share what it\'s really like to navigate that.' },
  { id:'seed_36', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'AI colour analysis vs virtual/online colour analysis — what\'s the difference?', concept:'Break down the difference between AI-generated colour analysis and a real virtual/online session. What each can and can\'t do.' },
  { id:'seed_37', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'"Why does this outfit make her look tired, but this one makes her glow?" Celebrity edition', concept:'Celebrity edition — can be shoot, edited, and scheduled in advance. Pick a celeb and contrast two outfits to show the colour theory at play.' },
  { id:'seed_38', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'Comments and opinions on a trending celeb look of the week',               concept:'React to a specific trending celeb look in real-time (e.g. Selena Gomez\'s look in London). Should be shot, edited and posted within that week.' },
  { id:'seed_39', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'"What I would advise [celeb]\'s stylist"',                                 concept:'Pick a celebrity and advise their stylist — what season they are, what\'s working, what isn\'t, and what would suit them better.' },
  { id:'seed_40', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'"Look younger with these tips" — a colour analyst take',                   concept:'Colour analyst perspective on the tips that actually work for looking younger. Tie it back to season and which shades are ageing vs brightening.' },
  { id:'seed_41', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'Hair theory and colour theory — more effective when you know your season',  concept:'How hair colour theory and seasonal colour theory overlap. Why knowing your season makes hair decisions easier and more effective.' },
  { id:'seed_42', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'Dressing up will change your life <last minute>',                          concept:'The impact of dressing intentionally vs grabbing whatever fits. Last-minute angle — what knowing your season does when you\'re getting ready fast.' },
  { id:'seed_43', pillar:'Personal Expertise & Opinions',  contentType:'Carousel',   title:'Colour and patterns combo each season',                                     concept:'Show which pattern styles and colour combinations work best for each season. Visual carousel format.' },
  { id:'seed_44', pillar:'Personal Expertise & Opinions',  contentType:'Carousel',   title:'Colour combos for each season',                                             concept:'A breakdown of the best colour pairings for each season — what works and why. Visual carousel.' },
  { id:'seed_45', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'If you told me 3 years ago I\'d be wearing pastel yellow… I wouldn\'t have believed you', concept:'Personal story of evolving into your season palette. Relatable for people who haven\'t embraced their colours yet.' },
  { id:'seed_46', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'"My fave look" celebrity edition',                                          concept:'Share your personal favourite celebrity look and break down WHY it works from a colour analysis perspective. Use inspo images.' },
  { id:'seed_47', pillar:'Personal Expertise & Opinions',  contentType:'Carousel',   title:'Colour pairings — inspo',                                                   concept:'Colour pairing inspo post — show combinations that work beautifully together and which seasons they suit.' },
  { id:'seed_48', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'Why I stopped buying clothes I never wear',                                  concept:'Personal story — the shift that happens when you know your season and shop intentionally. Relatable hook.' },
  { id:'seed_49', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'Things I do differently now that I know my colours',                        concept:'Before vs after knowing your season — specific habits that changed. Relatable and actionable.' },
  { id:'seed_50', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'Honest question… how many unworn pieces do you have in your wardrobe?',      concept:'Hook with a question. Lead into how knowing your season solves the unworn-clothes problem.' },
  { id:'seed_51', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'The moment I realised I\'d been shopping for the wrong person',              concept:'Personal realisation story — shopping for who you want to be vs who you actually are. Season analysis as the turning point.' },
  { id:'seed_52', pillar:'Personal Expertise & Opinions',  contentType:'Quick Chat', title:'What changed when I stopped buying what I liked and started buying what suited me', concept:'The mindset shift from "do I like this?" to "does this suit me?" and how colour analysis made that click.' },
  // Colour Education
  { id:'seed_53', pillar:'Colour Education',               contentType:'Carousel',   title:'Patterns for the seasons — 3 steps: Colour, Contrast, Style',               concept:'Educational carousel breaking down how to approach patterns for your season in 3 steps: picking the right colour, applying contrast correctly, and styling it.' },
  { id:'seed_54', pillar:'Colour Education',               contentType:'Quick Chat', title:'If you\'re a winter still wearing dark colours top to toe — you need to apply contrast', concept:'If you\'re a winter and wearing dark colours head to toe, YOU NEED TO BE APPLYING CONTRAST. Explain why and show examples.' },
  { id:'seed_55', pillar:'Colour Education',               contentType:'Quick Chat', title:'Do you like it? Do you wear it? — if you have to guess, you probably haven\'t', concept:'"Do you like it? Do you wear it? If you have to guess... chances are you haven\'t worn it for months or even ever." The colour analysis solution.' },
  { id:'seed_56', pillar:'Colour Education',               contentType:'Quick Chat', title:'"Colour blocking is boring" — rebuttal',                                    concept:'Push back on the idea that colour blocking is boring. Show how seasonal colour blocking is actually stunning and easy to do.' },
  { id:'seed_57', pillar:'Colour Education',               contentType:'Carousel',   title:'Intensifiers & enhancers — what they are and how to use them',               concept:'Educational post explaining colour intensifiers and enhancers — what they do to your look and how to apply the concept to your season.' },
  { id:'seed_58', pillar:'Colour Education',               contentType:'Carousel',   title:'Monochromatic colours — how to do it for your season',                       concept:'Educational breakdown of monochromatic dressing by season. How to nail a tonal look without looking washed out.' },
  { id:'seed_59', pillar:'Colour Education',               contentType:'Carousel',   title:'What is colour value?',                                                      concept:'Educational explainer on colour value (lightness/darkness scale) and why it matters for your season.' },
  { id:'seed_60', pillar:'Colour Education',               contentType:'Carousel',   title:'What is colour chroma?',                                                     concept:'Educational explainer on chroma (saturation/intensity) and how it affects which colours suit your season.' },
  { id:'seed_61', pillar:'Colour Education',               contentType:'Carousel',   title:'What is colour temperature?',                                                concept:'Educational explainer on warm vs cool colour temperature and how it relates to seasonal colour analysis.' },
  { id:'seed_62', pillar:'Colour Education',               contentType:'Carousel',   title:'What is a tint?',                                                            concept:'Educational explainer on tints (colours mixed with white) and which seasons they suit.' },
  { id:'seed_63', pillar:'Colour Education',               contentType:'Quick Chat', title:'What is contrast and how do you find yours?',                                 concept:'Explain colour contrast in seasonal analysis — high vs low contrast, and how to identify your natural contrast level to dress accordingly.' },
  { id:'seed_64', pillar:'Colour Education',               contentType:'Carousel',   title:'What is shade?',                                                             concept:'Educational explainer on shades (colours mixed with black) and which seasons can wear them without looking drained.' },
  { id:'seed_65', pillar:'Colour Education',               contentType:'Carousel',   title:'What is tone?',                                                              concept:'Educational explainer on tones (colours mixed with grey) and how they apply to muted/soft seasonal palettes.' },
  // Shopping By Season
  { id:'seed_66', pillar:'Shopping By Season',             contentType:'Reel',       title:'Colour combos I like for each season (with green screen)',                   concept:'Use green screen to show colour combo swatches for each season. Visual and shareable format.' },
  { id:'seed_67', pillar:'Shopping By Season',             contentType:'Quick Chat', title:'Imagine if you could shop for your season without searching for hours',       concept:'Hook: "Imagine if you could shop for your season, without having to search for hours finding the right colours" — then mention the app as the solution.' },
  { id:'seed_68', pillar:'Shopping By Season',             contentType:'Reel',       title:'Window shop with me by season / Shop with me as a Light Summer',             concept:'Series format — window shopping or in-store shopping as a specific season. Show the picks and why they work. Swap out season each time.' },
  { id:'seed_69', pillar:'Shopping By Season',             contentType:'Reel',       title:'Light summer clothes/makeup haul',                                           concept:'Haul-style video for light summer palette — clothes and makeup. Show the pieces, explain why they work for the season.' },
  { id:'seed_70', pillar:'Shopping By Season',             contentType:'Reel',       title:'Do this with light summer stuff — from makeup to outfits to accessories',    concept:'Show how to style light summer season across all categories: makeup, outfits, accessories. Use inspo as a reference.' },
  // Static Posts / Carousels
  { id:'seed_71', pillar:'Static Posts',                   contentType:'Reel',       title:'Recreate this Pinterest look with me — for each season',                    concept:'Series — pick a Pinterest look and recreate it for a specific season. Show the inspo, your take, and why it works. Can repeat for each season.' },
  { id:'seed_72', pillar:'Static Posts',                   contentType:'Carousel',   title:'Colour edits — e.g. Yellows for each season',                               concept:'Static carousel showing how the same colour (e.g. yellow) looks different across seasons — from pale lemon for lights to deep ochre for darks.' },
  { id:'seed_73', pillar:'Static Posts',                   contentType:'Carousel',   title:'"Know your prints" each season',                                             concept:'A guide to which print styles (floral, geometric, animal print etc.) suit each season and why — based on scale, contrast, and colour.' },
  { id:'seed_74', pillar:'Static Posts',                   contentType:'Carousel',   title:'Building a wardrobe that actually works each season',                        concept:'Practical carousel guide — the capsule wardrobe approach for each season. What to invest in, what to avoid, and how to build intentionally.' },
  { id:'seed_75', pillar:'Static Posts',                   contentType:'Carousel',   title:'Signs you have a cool/warm undertone',                                       concept:'Visual guide to identifying cool vs warm undertones — the signs to look for in skin, hair, and eye colour. Clear and shareable.' },
];

function smSeedIdeas() {
  var existingIds = socialPosts.map(function(p){ return p.id; });
  var added = false;
  var now = Date.now();
  var seedTs = now - (7 * 24 * 3600 * 1000); // 1 week ago — not "recently edited"
  SM_SEED_IDEAS.forEach(function(seed) {
    if (existingIds.indexOf(seed.id) === -1) {
      socialPosts.push({
        id: seed.id, title: seed.title, stage: 'idea',
        scheduledDate: null, platform: [], pillar: seed.pillar,
        contentType: seed.contentType || '', assignedTo: '', concept: seed.concept,
        textOnScreen: '', caption: '', driveLink: '',
        comments: [], createdAt: seedTs, lastModified: seedTs
      });
      added = true;
    }
  });
  // Patch already-saved seeds: fix recent timestamps and backfill missing contentType
  var patched = false;
  socialPosts.forEach(function(p) {
    if (!p.id || p.id.indexOf('seed_') !== 0) return;
    var def = null;
    for (var i = 0; i < SM_SEED_IDEAS.length; i++) { if (SM_SEED_IDEAS[i].id === p.id) { def = SM_SEED_IDEAS[i]; break; } }
    if ((now - p.lastModified) < 3600 * 1000) { p.lastModified = seedTs; p.createdAt = seedTs; patched = true; }
    if (def && !p.contentType) { p.contentType = def.contentType || ''; patched = true; }
  });
  if (added || patched) saveData();
}

// ── Legacy stubs (keep these so old save/load refs don't break) ──
var smTabActive = 'planner';
var ideaFilter  = 'All';
var ideaList    = [];
function setSmTab() {}
function renderIdeas() {}
