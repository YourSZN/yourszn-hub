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
var _smDraftComments = [];
var smMentions       = {latisha:[], lemari:[]};
var smStrategyNotes  = '';

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

  return '<div id="sm-post-modal" style="display:none;position:fixed;inset:0;background:rgba(28,23,18,.55);z-index:600;align-items:center;justify-content:center;overflow-y:auto;padding:24px 16px">'
    + '<div style="background:white;border-radius:16px;padding:28px 32px;max-width:1000px;width:100%;position:relative">'
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
    driveLink:         document.getElementById('sm-f-drive').value.trim(),
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

// ══ IDEA BANK SEEDS ══

var SM_SEED_IDEAS = [
  // ── Content ideas ──
  { id:'seed_1',  pillar:'Colour Education',               title:'Brands that do colour analysis right',             concept:'As a professional colour analyst it tickles my brain in the best way when brands dress their models in their season… [brand] is a great example of that… continue with examples of specific brands + models.' },
  { id:'seed_2',  pillar:'Client Sessions',                title:"My client's style before/after colour analysis",    concept:'Get past clients to send before styled/outfit pics and after. Show side-by-side transformation.' },
  { id:'seed_3',  pillar:'Personal Expertise & Opinions',  title:'Why copying celebrity outfits rarely works',        concept:"If you've gone on Pinterest and tried to replicate a celebrity's outfit because you have the same features as them and it just hasn't worked… explain why features alone don't account for season." },
  { id:'seed_4',  pillar:'Personal Expertise & Opinions',  title:'Shopping right after your colour analysis may be harder before it gets easier',  concept:'Walk through the transition period — then plug the app at the end: "this is why I\'ve made it easier for you…"' },
  { id:'seed_5',  pillar:'Shopping By Season',             title:"Where I'd be shopping my [season] staples right now", concept:'Series format — swap out [season] each video. Show specific pieces from specific stores.' },
  { id:'seed_6',  pillar:'Colour Education',               title:"If you're a big black wearer… navy may actually suit you better", concept:'Show examples of who this applies to. Can extend to lipstick shades, sunglasses shades etc. Simple specific change, profound outcome.' },
  { id:'seed_7',  pillar:'Personal Expertise & Opinions',  title:'If you buy clothes because they look good on the model…', concept:"How often have you returned them? If you shop without taking the model's features into account and just think the outfit is fire because of them… explain why this fails." },
  { id:'seed_8',  pillar:'Colour Education',               title:'Problems olive skin girls know too well',           concept:'Relatable hook for olive-toned people. Frustrations, mismatch moments, and the colour analysis solution.' },
  { id:'seed_9',  pillar:'Colour Education',               title:'Problems cool-toned brunettes know too well',       concept:'Relatable hook for cool-toned brunettes. Same structure as olive skin post.' },
  { id:'seed_10', pillar:'Colour Education',               title:'White tee and jeans is the cool girl vibe… but could I convince you to try off-white?', concept:'Talk about who suits beige instead of white and what that does for someone chasing the clean/model-off-duty aesthetic. Show examples.' },
  { id:'seed_11', pillar:'Colour Education',               title:'Your [undertone] matters more than the trend',      concept:'Series! Swap [undertone] for another word. Break down current trends/patterns — e.g. zebra print is all the rage right now, who does it work for and who does it not work for?' },
  { id:'seed_12', pillar:'Colour Education',               title:'If you want your teeth to look whiter, your makeup should reflect your season', concept:'Catchy hook — test grabs like this. Explain the link between season and which shades brighten vs dull the smile.' },
  { id:'seed_13', pillar:'Client Sessions',                title:'What [colour] do you think my client looks best in?', concept:'Screenshot colour swatches. Eliminate until you get to the end and explain as you go. Interactive/poll format.' },
  { id:'seed_14', pillar:'Shopping By Season',             title:'How to tell if a colour is warm or cool when shopping online', concept:'Practical guide — what to look for in product photos, descriptions and swatches when you can\'t see it in person.' },
  { id:'seed_15', pillar:'Personal Expertise & Opinions',  title:'Colour analysis can save you money',               concept:"You'll stop buying those tops you said 'I'll wear them for an event' about but never reach for because deep down you know you wouldn't always wear them." },
  // ── Compilations ──
  { id:'seed_16', pillar:'Client Sessions',                title:'My face when the client picks the exact colours I knew they\'d hate', concept:'Compilation — clips of bad reactions, max 3 secs each.' },
  { id:'seed_17', pillar:'Client Sessions',                title:"I'll never get over watching a client discover their season", concept:'Compilation — clips of positive reactions, max 3 secs each.' },
  { id:'seed_18', pillar:'Client Sessions',                title:"Me figuring out how I'm going to break it to my clients when they don't see that these are their worst colours", concept:'Compilation — clips of the opposite reactions you expected them to have, max 3 secs each.' },
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
        contentType: '', assignedTo: '', concept: seed.concept,
        textOnScreen: '', caption: '', driveLink: '',
        comments: [], createdAt: seedTs, lastModified: seedTs
      });
      added = true;
    }
  });
  // Patch any already-seeded ideas that still have a very recent timestamp
  var patched = false;
  socialPosts.forEach(function(p) {
    if (p.id && p.id.indexOf('seed_') === 0 && (now - p.lastModified) < 3600 * 1000) {
      p.lastModified = seedTs;
      p.createdAt    = seedTs;
      patched = true;
    }
  });
  if (added || patched) saveData();
}

// ── Legacy stubs (keep these so old save/load refs don't break) ──
var smTabActive = 'planner';
var ideaFilter  = 'All';
var ideaList    = [];
function setSmTab() {}
function renderIdeas() {}
