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
  'Personal Expertise & Opinions': '#C49A8A',
  'Colour Education':               '#7A8C6E',
  'Shopping By Season':             '#C4956A',
  'Client Sessions':                '#6366F1',
  'Static Posts':                   '#9CA3AF'
};

var SM_CONTENT_TYPES = ['Quick Chat', 'Reel', 'Carousel', 'Quick Comparisons', 'Review/Overlays', 'Celebrity Analysis', 'Consultation'];

var smActiveTab      = 'pipeline';
var smCalMonth       = new Date().getMonth();
var smCalYear        = new Date().getFullYear();
var smIdeaBankFilter = 'All';
var _smEditId        = null;
var smMentions       = {latisha:[], lemari:[]};  // unseen mention notifications per user

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
  var el = document.getElementById('social-page-content'); if (!el) return;

  var tabs = [
    {key:'pipeline', label:'Pipeline'},
    {key:'calendar', label:'Calendar'},
    {key:'ideas',    label:'Idea Bank'},
    {key:'strategy', label:'Posting Strategy'},
  ];

  var tabHtml = '<div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap">'
    + tabs.map(function(t) {
        return '<button class="clients-subtab' + (smActiveTab === t.key ? ' on' : '') + '" onclick="smSetTab(\'' + t.key + '\')">' + t.label + '</button>';
      }).join('')
    + '</div>';

  var contentHtml = '';
  if      (smActiveTab === 'pipeline') contentHtml = smRenderPipeline();
  else if (smActiveTab === 'calendar') contentHtml = smRenderCalendar();
  else if (smActiveTab === 'ideas')    contentHtml = smRenderIdeaBank();
  else if (smActiveTab === 'strategy') contentHtml = smRenderStrategy();

  el.innerHTML = tabHtml + contentHtml + smPostModal();

  var modal = document.getElementById('sm-post-modal');
  if (modal) modal.onclick = function(e) { if (e.target === modal) smCloseModal(); };
}

function smSetTab(tab) {
  smActiveTab = tab;
  renderSocialPage();
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

      html += '<div onclick="smOpenModal(\'' + post.id + '\')" style="background:' + (isNew ? '#FFFBEB' : 'white') + ';border:' + (isNew ? '2px solid #F59E0B' : '1px solid var(--sand)') + ';border-radius:10px;padding:10px;margin-bottom:8px;cursor:pointer;transition:box-shadow .15s" onmouseover="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,.1)\'" onmouseout="this.style.boxShadow=\'none\'">'
        + '<div style="font-size:13px;font-weight:600;color:var(--charcoal);margin-bottom:6px;line-height:1.35">' + esc(post.title) + '</div>'
        + updBadge
        + (platTags ? '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px">' + platTags + '</div>' : '')
        + '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px">'
        +   (pillarDot ? '<div style="display:flex;align-items:center;min-width:0"><span>' + pillarDot + '</span><span style="font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (post.pillar ? post.pillar.split(' ')[0] : '') + '</span></div>' : '<div></div>')
        +   '<div style="display:flex;align-items:center;gap:6px">' + commentBadge + assignBadge + '</div>'
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
    var isNew = smRecentlyEdited(post);
    var platTags = (post.platform || []).map(function(p) {
      var c = p === 'TikTok' ? '#010101' : '#E1306C';
      return '<span style="font-size:9px;font-weight:700;color:white;background:' + c + ';padding:2px 6px;border-radius:6px">' + p + '</span>';
    }).join('');

    html += '<div onclick="smOpenModal(\'' + post.id + '\')" style="background:' + (isNew ? '#FFFBEB' : 'white') + ';border:' + (isNew ? '2px solid #F59E0B' : '1px solid var(--sand)') + ';border-radius:10px;padding:12px;cursor:pointer;transition:box-shadow .15s" onmouseover="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,.1)\'" onmouseout="this.style.boxShadow=\'none\'">'
      + '<div style="font-size:13px;font-weight:600;color:var(--charcoal);margin-bottom:5px;line-height:1.35">' + esc(post.title) + '</div>'
      + (post.concept ? '<div style="font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5">' + esc(post.concept.slice(0, 100)) + (post.concept.length > 100 ? '…' : '') + '</div>' : '')
      + '<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">'
      +   platTags
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
    + smStrategyPillars();
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

function smPostModal() {
  return '<div id="sm-post-modal" style="display:none;position:fixed;inset:0;background:rgba(28,23,18,.55);z-index:600;align-items:center;justify-content:center;overflow-y:auto;padding:20px">'
    + '<div style="background:white;border-radius:16px;padding:28px;max-width:560px;width:100%;position:relative;max-height:90vh;overflow-y:auto">'
    + '<button onclick="smCloseModal()" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--muted);line-height:1">&#215;</button>'
    + '<div id="sm-modal-heading" style="font-size:18px;font-weight:700;color:var(--deep);margin-bottom:22px">New Post</div>'

    + '<div style="display:flex;flex-direction:column;gap:14px">'

    + '<div><label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.8px;text-transform:uppercase">Title *</label>'
    + '<input id="sm-f-title" class="fi" placeholder="Post title…"></div>'

    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + '<div><label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.8px;text-transform:uppercase">Stage</label>'
    + '<select id="sm-f-stage" class="fi" onchange="smStageChange()">'
    + SM_STAGES.map(function(s) { return '<option value="' + s.key + '">' + s.label + '</option>'; }).join('')
    + '</select></div>'
    + '<div id="sm-date-wrap" style="display:none"><label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.8px;text-transform:uppercase">Scheduled Date</label>'
    + '<input id="sm-f-date" type="date" class="fi"></div>'
    + '</div>'

    + '<div><label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:8px;letter-spacing:.8px;text-transform:uppercase">Platform</label>'
    + '<div style="display:flex;gap:16px">'
    + ['TikTok', 'Instagram'].map(function(p) {
        return '<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;user-select:none">'
          + '<input type="checkbox" id="sm-f-plat-' + p.toLowerCase() + '" value="' + p + '" style="width:15px;height:15px;cursor:pointer"> ' + p + '</label>';
      }).join('')
    + '</div></div>'

    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + '<div><label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.8px;text-transform:uppercase">Pillar</label>'
    + '<select id="sm-f-pillar" class="fi"><option value="">— Select pillar —</option>'
    + SM_PILLARS.map(function(p) { return '<option value="' + p + '">' + p + '</option>'; }).join('')
    + '</select></div>'
    + '<div><label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.8px;text-transform:uppercase">Content Type</label>'
    + '<select id="sm-f-ctype" class="fi"><option value="">— Select type —</option>'
    + SM_CONTENT_TYPES.map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('')
    + '</select></div>'
    + '</div>'

    + '<div><label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.8px;text-transform:uppercase">Assigned To</label>'
    + '<select id="sm-f-assign" class="fi"><option value="">— Unassigned —</option>'
    + ['Latisha', 'Lemari'].map(function(n) { return '<option value="' + n + '">' + n + '</option>'; }).join('')
    + '</select></div>'

    + '<div><label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.8px;text-transform:uppercase">Concept</label>'
    + '<textarea id="sm-f-concept" class="fi" rows="2" placeholder="What\'s the idea…" style="resize:vertical"></textarea></div>'

    + '<div><label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.8px;text-transform:uppercase">Text on Screen</label>'
    + '<textarea id="sm-f-tos" class="fi" rows="2" placeholder="On-screen text…" style="resize:vertical"></textarea></div>'

    + '<div><label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.8px;text-transform:uppercase">Caption</label>'
    + '<textarea id="sm-f-caption" class="fi" rows="3" placeholder="Caption + hashtags…" style="resize:vertical"></textarea></div>'

    + '<div><label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.8px;text-transform:uppercase">Google Drive Link</label>'
    + '<input id="sm-f-drive" class="fi" placeholder="drive.google.com/…"></div>'

    + '<div id="sm-f-err" style="color:#EF4444;font-size:12px;display:none"></div>'

    + '<div style="display:flex;gap:8px;justify-content:space-between;padding-top:4px">'
    + '<button id="sm-f-del" onclick="smDeletePost()" style="display:none;background:none;border:1px solid #EF4444;color:#EF4444;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;font-weight:600">Delete</button>'
    + '<div style="display:flex;gap:8px;margin-left:auto">'
    + '<button onclick="smCloseModal()" style="background:none;border:1px solid var(--sand);border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;color:var(--charcoal)">Cancel</button>'
    + '<button onclick="smSavePost()" class="btn btnp" style="padding:8px 22px">Save</button>'
    + '</div></div>'

    // ── Comments section (only shown when editing an existing post) ──
    + '<div id="sm-comments-section" style="display:none;border-top:1px solid var(--sand);margin-top:8px;padding-top:20px">'
    + '<div style="font-size:12px;font-weight:700;color:var(--charcoal);letter-spacing:.5px;text-transform:uppercase;margin-bottom:12px">Comments</div>'
    + '<div id="sm-comments-list" style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px"></div>'
    + '<div style="position:relative">'
    +   '<textarea id="sm-comment-input" class="fi" rows="2" placeholder="Leave a comment… type @ to tag someone" style="resize:none;padding-right:70px" oninput="smCommentInput(this)" onkeydown="smCommentKey(event)"></textarea>'
    +   '<button onclick="smAddComment()" class="btn btnp" style="position:absolute;bottom:8px;right:8px;padding:5px 12px;font-size:11px">Post</button>'
    + '</div>'
    + '<div id="sm-mention-dropdown" style="display:none;position:absolute;background:white;border:1px solid var(--sand);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:700;min-width:160px;overflow:hidden"></div>'
    + '</div>'

    + '</div></div></div>';
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

  ['TikTok', 'Instagram'].forEach(function(p) {
    var cb = document.getElementById('sm-f-plat-' + p.toLowerCase());
    if (cb) cb.checked = post ? (post.platform || []).indexOf(p) !== -1 : false;
  });

  smStageChange();

  document.getElementById('sm-f-del').style.display = post ? 'inline-block' : 'none';
  var errEl = document.getElementById('sm-f-err');
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

  // Show/hide comments section
  var commentsSec = document.getElementById('sm-comments-section');
  if (commentsSec) {
    commentsSec.style.display = post ? 'block' : 'none';
    if (post) smRenderComments(post.id);
  }

  modal.style.display = 'flex';
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
    driveLink:    document.getElementById('sm-f-drive').value.trim(),
    comments:     existing ? (existing.comments || []) : [],
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

// ══ COMMENTS ══

var SM_STAFF = ['Latisha', 'Lemari'];
var SM_STAFF_COLORS = {Latisha:'#C4956A', Lemari:'#7A8C6E'};

function smRenderComments(postId) {
  var listEl = document.getElementById('sm-comments-list'); if (!listEl) return;
  var post = socialPosts.find(function(p) { return p.id === postId; });
  var comments = post ? (post.comments || []) : [];

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

  var post = socialPosts.find(function(p) { return p.id === _smEditId; });
  if (!post) return;

  if (!post.comments) post.comments = [];
  var now = Date.now();
  var author = smCurrentUser();
  var comment = { id: 'c' + now, author: author, text: text, createdAt: now };
  post.comments.push(comment);

  // Store mention notifications for tagged users
  SM_STAFF.forEach(function(name) {
    if (text.indexOf('@' + name) !== -1 && name !== author) {
      var uid = name.toLowerCase();
      if (!smMentions[uid]) smMentions[uid] = [];
      smMentions[uid].push({ postId: _smEditId, commentId: comment.id, from: author, text: text, ts: now, seen: false });
    }
  });

  input.value = '';
  smHideMentionDropdown();
  saveData();
  smRenderComments(_smEditId);
  smUpdateNavBadge();
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

// ── Legacy stubs (keep these so old save/load refs don't break) ──
var smTabActive = 'planner';
var ideaFilter  = 'All';
var ideaList    = [];
function setSmTab() {}
function renderIdeas() {}
