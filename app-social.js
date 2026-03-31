// ══ Social Media tab toggle ══
var smTabActive = 'planner';
var ideaFilter  = 'All';
var ideaList    = [];

function setSmTab(tab) {
  smTabActive = tab;
  document.getElementById('sm-sec-planner').style.display = (tab==='planner') ? 'block' : 'none';
  document.getElementById('sm-sec-ideas').style.display   = (tab==='ideas')   ? 'block' : 'none';
  document.querySelectorAll('[id^="sm-tab-"]').forEach(function(b){ b.classList.remove('on'); });
  var tb = document.getElementById('sm-tab-'+tab); if(tb) tb.classList.add('on');
  if (tab==='ideas') renderIdeas();
}

// ── Content Ideas ──
var _ideaEditId = null;
function openIdeaModal(id) {
  _ideaEditId = id;
  var idea = id ? ideaList.find(function(x){return x.id===id;}) : null;
  var modal = document.getElementById('idea-modal');
  if (!modal) return;
  document.getElementById('ideam-heading').textContent = idea ? 'Edit Idea' : 'New Content Idea';
  document.getElementById('ideam-title').value    = idea ? (idea.title||'')    : '';
  document.getElementById('ideam-platform').value = idea ? (idea.platform||'Instagram') : 'Instagram';
  document.getElementById('ideam-format').value   = idea ? (idea.format||'')   : '';
  document.getElementById('ideam-notes').value    = idea ? (idea.notes||'')    : '';
  document.getElementById('ideam-del').style.display = idea ? 'inline-block' : 'none';
  document.getElementById('ideam-err').textContent = '';
  modal.style.display = 'flex';
  setTimeout(function(){ document.getElementById('ideam-title').focus(); }, 80);
}
function closeIdeaModal() { document.getElementById('idea-modal').style.display = 'none'; }
function saveIdeaModal() {
  var title = document.getElementById('ideam-title').value.trim();
  if (!title) { document.getElementById('ideam-err').textContent = 'Idea title required.'; return; }
  var obj = { id:_ideaEditId||Date.now(), title:title,
    platform: document.getElementById('ideam-platform').value,
    format:   document.getElementById('ideam-format').value.trim(),
    notes:    document.getElementById('ideam-notes').value.trim() };
  if (_ideaEditId) {
    var idx = ideaList.findIndex(function(x){return x.id===_ideaEditId;});
    if (idx>-1) ideaList[idx]=obj;
  } else { ideaList.push(obj); }
  closeIdeaModal(); saveData(); renderIdeas();
}
function deleteIdea(id) {
  if (!confirm('Delete idea?')) return;
  ideaList = ideaList.filter(function(x){return x.id!==id;});
  saveData(); renderIdeas();
}
function filterIdeas(plat, el) {
  ideaFilter = plat;
  document.querySelectorAll('#idea-filters .fpill').forEach(function(p){p.classList.remove('on');});
  el.classList.add('on'); renderIdeas();
}
function renderIdeas() {
  var grid  = document.getElementById('ideas-grid');
  var empty = document.getElementById('ideas-empty');
  if (!grid) return;
  var list = ideaFilter==='All' ? ideaList : ideaList.filter(function(x){return x.platform===ideaFilter;});
  if (!list.length) { grid.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display = 'none';
  var platCols = {Instagram:'#E1306C',TikTok:'#010101',LinkedIn:'#0A66C2',YouTube:'#FF0000',Blog:'#F59E0B',Other:'#6366F1'};
  grid.innerHTML = list.map(function(idea){
    var col = platCols[idea.platform]||'var(--rose)';
    return '<div class="sopcard">'
      + '<div style="display:flex;align-items:flex-start;gap:8px">'
      +   '<div style="flex:1;min-width:0">'
      +     '<div style="font-size:10px;font-weight:700;letter-spacing:1px;color:'+col+';margin-bottom:4px">'+esc(idea.platform)+(idea.format?' · '+esc(idea.format):'')+'</div>'
      +     '<div style="font-size:15px;font-weight:600;color:var(--charcoal)">'+esc(idea.title)+'</div>'
      +     (idea.notes?'<div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5">'+esc(idea.notes)+'</div>':'')
      +   '</div>'
      +   '<div style="display:flex;gap:4px;flex-shrink:0">'
      +     '<button class="fin-row-edit" onclick="openIdeaModal('+idea.id+')">Edit</button>'
      +     '<button class="fin-row-edit" onclick="deleteIdea('+idea.id+')" style="color:#EF4444">Del</button>'
      +   '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

// ══ Marketing tabs ══
var mktTab = 'website';
var creatorsList = [];
var _creatorEditId = null;

var mktData = {
  website:  { lists:[] },
  blog:     { lists:[] },
  creators: { lists:[] },
  linkedin: { lists:[] },
  gbp:      { lists:[] }
};

function setMktTab(tab) {
  mktTab = tab;
  document.querySelectorAll('[id^="mkt-tab-"]').forEach(function(b){b.classList.remove('on');});
  var tb = document.getElementById('mkt-tab-'+tab); if(tb) tb.classList.add('on');
  if (tab === 'creators') renderCreators();
  else renderMarketing();
}

var _mktListEditId = null, _mktItemEditId = null, _mktListCtx = null;


// ══ Creators tracker ══
var CREATOR_STATUSES = ['To Contact','Contacted','In Negotiation','Content Received','Complete','Pass'];
var CREATOR_STATUS_COLS = {
  'To Contact':      '#6366F1',
  'Contacted':       '#F59E0B',
  'In Negotiation':  '#3B82F6',
  'Content Received':'#8B5CF6',
  'Complete':        '#10B981',
  'Pass':            '#6B7280'
};

function renderCreators() {
  var el = document.getElementById('mkt-content'); if (!el) return;
  var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'
    + '<div style="font-size:13px;color:var(--muted)">Track creators, UGC & collab outreach</div>'
    + '<button class="btn btnp" onclick="openCreatorModal(null)">+ Add Creator</button>'
    + '</div>';

  if (!creatorsList.length) {
    html += '<div style="text-align:center;padding:60px;color:var(--muted)">No creators yet — click + Add Creator.</div>';
    el.innerHTML = html; return;
  }

  html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'
    + '<thead><tr style="border-bottom:2px solid var(--sand);text-align:left">'
    + '<th style="padding:8px 4px;width:48px"></th>'
    + '<th style="padding:8px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700">Handle / Name</th>'
    + '<th style="padding:8px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700">Priority</th>'
    + '<th style="padding:8px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700">Base</th>'
    + '<th style="padding:8px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700">Age</th>'
    + '<th style="padding:8px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700">What for</th>'
    + '<th style="padding:8px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700">Status</th>'
    + '<th style="padding:8px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700">Notes</th>'
    + '<th style="padding:8px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700">Content Ideas</th>'
    + '<th style="padding:8px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700">Video</th>'
    + '<th style="padding:8px 4px;width:60px"></th>'
    + '</tr></thead><tbody>';

  creatorsList.forEach(function(c) {
    var stCol = CREATOR_STATUS_COLS[c.status] || '#6B7280';
    var pri = parseInt(c.priority)||0;
    var priDots = '';
    for(var d=1;d<=5;d++) priDots += '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:2px;background:'+(d<=pri?'#EF4444':'var(--sand)')+'"></span>';
    html += '<tr style="border-bottom:1px solid var(--sand);vertical-align:top" onmouseover="this.style.background=\'var(--warm)\'" onmouseout="this.style.background=\'\'">'
      + '<td style="padding:8px 8px;width:48px;vertical-align:middle">'
      + (c.photo ? '<img src="'+c.photo+'" style="width:40px;height:40px;border-radius:50%;object-fit:cover;display:block">' : '<div style="width:40px;height:40px;border-radius:50%;background:var(--sand);display:flex;align-items:center;justify-content:center;font-size:16px">&#128100;</div>')
      + '</td>'
      + '<td style="padding:10px 12px;font-weight:600;color:var(--charcoal);max-width:160px">'
      +   esc(c.handle||'')
      +   (c.profileUrl ? ' <a href="'+esc(c.profileUrl)+'" target="_blank" style="font-size:10px;color:var(--rose);font-weight:400">↗</a>' : '')
      +   (c.name && c.name!==c.handle ? '<div style="font-size:11px;color:var(--muted);font-weight:400">'+esc(c.name)+'</div>' : '')
      + '</td>'
      + '<td style="padding:10px 12px;white-space:nowrap">'+priDots+'</td>'
      + '<td style="padding:10px 12px;color:var(--charcoal)">'+esc(c.base||'—')+'</td>'
      + '<td style="padding:10px 12px;color:var(--charcoal)">'+esc(c.age||'—')+'</td>'
      + '<td style="padding:10px 12px;color:var(--charcoal);max-width:140px">'+esc(c.whatFor||'—')+'</td>'
      + '<td style="padding:10px 12px"><span style="font-size:10px;font-weight:700;letter-spacing:.4px;color:#fff;background:'+stCol+';padding:3px 10px;border-radius:12px;white-space:nowrap">'+esc(c.status||'To Contact')+'</span></td>'
      + '<td style="padding:10px 12px;color:var(--muted);max-width:160px;font-size:12px">'+esc(c.notes||'—')+'</td>'
      + '<td style="padding:10px 12px;color:var(--muted);max-width:180px;font-size:12px">'+esc(c.contentIdeas||'—')+'</td>'
      + '<td style="padding:10px 12px">'+(c.videoUrl?'<a href="'+esc(c.videoUrl)+'" target="_blank" style="font-size:11px;color:var(--rose);font-weight:600;text-decoration:none">▶ View</a>':'—')+'</td>'
      + '<td style="padding:10px 4px;white-space:nowrap">'
      +   '<button class="fin-row-edit" onclick="openCreatorModal(\''+c.id+'\')">Edit</button>'
      +   '<button class="fin-row-edit" onclick="deleteCreator(\''+c.id+'\')" style="color:#EF4444">Del</button>'
      + '</td>'
      + '</tr>';
  });

  html += '</tbody></table></div>';
  el.innerHTML = html;
}


var _crmPhotoData = null;  // holds base64 of current photo

function crmPhotoChange(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    _crmPhotoData = e.target.result;
    var prev = document.getElementById('crm-photo-preview');
    var plac = document.getElementById('crm-photo-placeholder');
    prev.src = _crmPhotoData; prev.style.display='block';
    if(plac) plac.style.display='none';
    var clr = document.getElementById('crm-photo-clear'); if(clr) clr.style.display='inline-block';
  };
  reader.readAsDataURL(file);
}
function crmPhotoClear() {
  _crmPhotoData = '';
  var prev = document.getElementById('crm-photo-preview');
  var plac = document.getElementById('crm-photo-placeholder');
  prev.style.display='none'; prev.src='';
  if(plac) plac.style.display='flex';
  var fi = document.getElementById('crm-photo-file'); if(fi) fi.value='';
  var clr = document.getElementById('crm-photo-clear'); if(clr) clr.style.display='none';
}

function openCreatorModal(id) {
  _creatorEditId = id;
  var c = id ? creatorsList.find(function(x){return x.id===id;}) : null;
  document.getElementById('crm-heading').textContent = c ? 'Edit Creator' : 'Add Creator';
  document.getElementById('crm-handle').value       = c ? (c.handle||'')       : '';
  document.getElementById('crm-name').value         = c ? (c.name||'')         : '';
  document.getElementById('crm-profileUrl').value   = c ? (c.profileUrl||'')   : '';
  document.getElementById('crm-priority').value     = c ? (c.priority||'3')    : '3';
  document.getElementById('crm-base').value         = c ? (c.base||'')         : '';
  document.getElementById('crm-age').value          = c ? (c.age||'')          : '';
  document.getElementById('crm-whatFor').value      = c ? (c.whatFor||'')      : '';
  document.getElementById('crm-status').value       = c ? (c.status||'To Contact') : 'To Contact';
  document.getElementById('crm-notes').value        = c ? (c.notes||'')        : '';
  document.getElementById('crm-contentIdeas').value = c ? (c.contentIdeas||'') : '';
  document.getElementById('crm-videoUrl').value     = c ? (c.videoUrl||'')     : '';
  document.getElementById('crm-del').style.display  = c ? 'inline-block' : 'none';
  document.getElementById('crm-err').textContent    = '';
  // photo
  _crmPhotoData = c ? (c.photo||'') : '';
  var prev = document.getElementById('crm-photo-preview');
  var plac = document.getElementById('crm-photo-placeholder');
  var clr  = document.getElementById('crm-photo-clear');
  if (_crmPhotoData) {
    prev.src = _crmPhotoData; prev.style.display='block';
    if(plac) plac.style.display='none';
    if(clr)  clr.style.display='inline-block';
  } else {
    prev.src=''; prev.style.display='none';
    if(plac) plac.style.display='flex';
    if(clr)  clr.style.display='none';
  }
  var fi = document.getElementById('crm-photo-file');
  if(fi) fi.value='';
  document.getElementById('creator-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('crm-handle').focus(); }, 80);
}

function closeCreatorModal() { document.getElementById('creator-modal').style.display='none'; }
function saveCreatorModal() {
  var handle = document.getElementById('crm-handle').value.trim();
  if (!handle) { document.getElementById('crm-err').textContent='Handle is required.'; return; }
  var obj = {
    id:           _creatorEditId || 'cr'+Date.now(),
    handle:       handle,
    name:         document.getElementById('crm-name').value.trim(),
    profileUrl:   document.getElementById('crm-profileUrl').value.trim(),
    priority:     document.getElementById('crm-priority').value,
    base:         document.getElementById('crm-base').value.trim(),
    age:          document.getElementById('crm-age').value.trim(),
    whatFor:      document.getElementById('crm-whatFor').value.trim(),
    status:       document.getElementById('crm-status').value,
    notes:        document.getElementById('crm-notes').value.trim(),
    contentIdeas: document.getElementById('crm-contentIdeas').value.trim(),
    videoUrl:     document.getElementById('crm-videoUrl').value.trim(),
    photo:        _crmPhotoData || (c ? (c.photo||'') : '')
  };
  if (_creatorEditId) {
    var idx = creatorsList.findIndex(function(x){return x.id===_creatorEditId;});
    if (idx>-1) creatorsList[idx]=obj;
  } else { creatorsList.push(obj); }
  closeCreatorModal(); saveData(); renderCreators();
}
function deleteCreator(id) {
  if (!confirm('Delete this creator?')) return;
  creatorsList = creatorsList.filter(function(x){return x.id!==id;});
  saveData(); renderCreators();
}


// ══════════════════════════════════════════════════
// GIFT VOUCHER CREATOR
// ══════════════════════════════════════════════════
var VOUCHER_BG_B64 = "https://charming-starlight-37db1e.netlify.app/voucher_bg.jpg";
var VOUCHER_LOGO_B64 = null;
var voucherBgImage = "https://charming-starlight-37db1e.netlify.app/voucher_bg.jpg";
var voucherCounter = parseInt(localStorage.getItem('yszn_voucher_counter') || '59', 10);

function renderVoucherTab() {
  var el = document.getElementById('voucher-page-content'); if (!el) return;

  // Auto-fill today's date
  var today = new Date();
  var dd = String(today.getDate()).padStart(2,'0');
  var mm = String(today.getMonth()+1).padStart(2,'0');
  var yy = String(today.getFullYear()).slice(-2);
  var dateStr = dd + '.' + mm + '.' + yy;

  var nextNum = voucherCounter + 1;

  el.innerHTML = '<div style="display:grid;grid-template-columns:380px 1fr;gap:28px;align-items:start">'

    // ── LEFT: FORM ──
    + '<div>'
    + '<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:16px">Voucher Details</div>'


    // To / From / Message
    + '<div style="background:white;border:1px solid var(--sand);border-radius:12px;padding:16px;margin-bottom:14px">'
    + '<div style="font-size:11px;font-weight:600;color:var(--deep);margin-bottom:12px">Personalisation</div>'
    + '<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">To</label>'
    + '<input id="v-to" class="fi" placeholder="e.g. Lyn" oninput="voucherPreview()" style="width:100%;box-sizing:border-box"></div>'
    + '<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">Message</label>'
    + '<textarea id="v-msg" class="fi" rows="4" placeholder="e.g. Happy 40th Lyn! Enjoy your birthday cake..." oninput="voucherPreview()" style="width:100%;box-sizing:border-box;resize:vertical"></textarea></div>'
    + '<div><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">From</label>'
    + '<input id="v-from" class="fi" placeholder="e.g. Thuy, Nhu and Minori (and husbands)" oninput="voucherPreview()" style="width:100%;box-sizing:border-box"></div>'
    + '</div>'

    // Voucher meta
    + '<div style="background:white;border:1px solid var(--sand);border-radius:12px;padding:16px;margin-bottom:14px">'
    + '<div style="font-size:11px;font-weight:600;color:var(--deep);margin-bottom:12px">Voucher Info</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    + '<div><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">Voucher Number</label>'
    + '<input id="v-num" class="fi" value="'+nextNum+'" oninput="voucherPreview()" style="width:100%;box-sizing:border-box"></div>'
    + '<div><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">Date</label>'
    + '<input id="v-date" class="fi" value="'+dateStr+'" oninput="voucherPreview()" style="width:100%;box-sizing:border-box"></div>'
    + '</div>'
    + '<div><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">Voucher Code</label>'
    + '<input id="v-code" class="fi" placeholder="e.g. LYN1P" oninput="voucherPreview()" style="width:100%;box-sizing:border-box"></div>'
    + '</div>'

    // Title line
    + '<div style="background:white;border:1px solid var(--sand);border-radius:12px;padding:16px;margin-bottom:20px">'
    + '<div style="font-size:11px;font-weight:600;color:var(--deep);margin-bottom:8px">Voucher Title</div>'
    + '<input id="v-title" class="fi" value="1:1 Premium Colour Analysis" oninput="voucherPreview()" style="width:100%;box-sizing:border-box">'
    + '</div>'

    // Download button
    + '<button onclick="voucherDownload()" style="width:100%;background:var(--deep);color:#fff;border:none;border-radius:10px;padding:13px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:.3px">&#11015; Download Voucher (PNG)</button>'
    + '</div>'

    // ── RIGHT: LIVE PREVIEW ──
    + '<div>'
    + '<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:16px">Live Preview</div>'
    + '<div id="voucher-preview-wrap" style="width:100%;max-width:680px">'
    + '<canvas id="voucher-canvas" style="width:100%;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.12)"></canvas>'
    + '</div>'
    + '</div>'
    + '</div>';

  voucherPreview();
}
var voucherBgImage = "https://raw.githubusercontent.com/YourSZN/yourszn-hub/main/voucher_bg.jpg";
function voucherLoadBg(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    voucherBgImage = ev.target.result;
    var st = document.getElementById('voucher-bg-status');
    if (st) st.textContent = '✓ Image loaded: ' + file.name;
    voucherPreview();
  };
  reader.readAsDataURL(file);
}

function voucherClearBg() {
  voucherBgImage = null;
  var inp = document.getElementById('voucher-bg-input');
  if (inp) inp.value = '';
  var st = document.getElementById('voucher-bg-status');
  if (st) st.textContent = 'No image uploaded — voucher will use a plain background';
  voucherPreview();
}

function vg(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

function voucherPreview() {
  var canvas = document.getElementById('voucher-canvas'); if (!canvas) return;
  // High-res canvas: 2× for crisp download
  var W = 2600, H = 1840;
  canvas.width = W; canvas.height = H;
  canvas.style.width = '100%';
  var ctx = canvas.getContext('2d');

  // Load Google Fonts into the canvas via FontFace API
  var fontsReady = Promise.all([
    document.fonts.load('300 1px "Cormorant Garamond"'),
    document.fonts.load('italic 300 1px "Cormorant Garamond"'),
    document.fonts.load('italic 500 1px "Cormorant Garamond"'),
    document.fonts.load('500 1px "Cormorant Garamond"'),
  ]);

  function draw(bgImg, logoImg) {
    ctx.clearRect(0,0,W,H);

    // ── Background ──
    if (bgImg) {
      var iw = bgImg.naturalWidth, ih = bgImg.naturalHeight;
      var scale = Math.max(W/iw, H/ih);
      var dw = iw*scale, dh = ih*scale;
      ctx.drawImage(bgImg, (W-dw)/2, (H-dh)/2, dw, dh);
   
    } else {
      ctx.fillStyle = '#F7F3EE';
      ctx.fillRect(0,0,W,H);
    }

    // ── Helpers ──
    var RX = W * 0.52;   // right-column x start
    var RW = W - RX - 50; // right-column width

    function pill(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x+r, y);
      ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
      ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
      ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
      ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
      ctx.closePath();
    }

    // ── Top-left: Your SZN logo image ──
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      var logoH = 220;
      var logoW = Math.round(logoImg.naturalWidth * (logoH / logoImg.naturalHeight));
      ctx.drawImage(logoImg, 54, 30, logoW, logoH);
    }

    // ── GIFT VOUCHER heading ──
    ctx.save();
    ctx.fillStyle = '#1C1C1C';
    // Spaced-out display heading — Cormorant Garamond bold-ish
    ctx.font = '500 148px "Cormorant Garamond", Georgia, serif';
    ctx.letterSpacing = '11px';
    ctx.fillText('GIFT VOUCHER', RX, 220);
    ctx.restore();

    // ── Subtitle: voucher title ──
    ctx.save();
    ctx.fillStyle = '#2a2a2a';
    ctx.font = 'italic 500 66px "Times New Roman", serif';
    ctx.fillText(vg('v-title') || '1:1 Premium Colour Analysis', RX, 320);
    ctx.restore();

    // ── To pill ──
    var toText = 'To: ' + (vg('v-to') || '');
    ctx.font = 'italic 500 52px "Times New Roman", serif';
    var toMeasure = ctx.measureText(toText).width;
    var toPillW = Math.min(Math.max(toMeasure + 80, 340), RW);
    var toPillH = 104;
    var toY = 420;
    ctx.save();
    pill(RX, toY, toPillW, toPillH, toPillH/2);
    ctx.fillStyle = 'rgba(255,255,255,0.70)';
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#1C1C1C';
    ctx.font = 'italic 500 52px "Times New Roman", serif';
    ctx.fillText(toText, RX + 40, toY + 68);
    ctx.restore();

    // ── Message pill ──
 var msgLines = wrapText(ctx, vg('v-msg') || '', 'italic 500 52px "Times New Roman", serif', RW - 80);
var msgMeasure = ctx.measureText(vg('v-msg') || '').width;
var msgPillW = Math.min(Math.max(msgMeasure + 80, 340), RW);
var msgPillH = 52 + msgLines.length * 66;
var msgY = toY + toPillH + 36;
ctx.save();
pill(RX, msgY, msgPillW, msgPillH, 28);
ctx.fillStyle = 'rgba(255,255,255,0.62)';
ctx.fill();
ctx.restore();
ctx.save();
ctx.font = 'italic 500 52px "Times New Roman", serif';
ctx.fillStyle = '#1C1C1C';
msgLines.forEach(function(line, i) {
    ctx.fillText(line, RX + 40, msgY + 56 + i*66);
});
ctx.restore();

    // ── From pill ──
    var fromText = 'From: ' + (vg('v-from') || '');
 var fromLines = wrapText(ctx, fromText, 'italic 500 52px "Times New Roman", serif', RW - 80);
var fromMeasure = ctx.measureText(fromText).width;
var fromPillW = Math.min(Math.max(fromMeasure + 80, 340), RW);
var fromPillH = 48 + fromLines.length * 72;
var fromY = msgY + msgPillH + 36;
ctx.save();
pill(RX, fromY, fromPillW, fromPillH, 28);
ctx.fillStyle = 'rgba(255,255,255,0.62)';
ctx.fill();
ctx.restore();
    ctx.save();
    ctx.font = 'italic 500 52px "Times New Roman", serif';
    ctx.fillStyle = '#1C1C1C';
    fromLines.forEach(function(line, i) {
      ctx.fillText(line, RX + 40, fromY + 58 + i*72);
    });
    ctx.restore();

    // ── Booking footer (bottom right) ──
    var code = vg('v-code');
    var footL1 = 'To book please visit website www.yourszn.com.au';
    var footL2 = code ? 'and use code: ' + code + ' at checkout' : '';
    ctx.save();
    ctx.font = '500 34px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = '#1C1C1C';
    ctx.textAlign = 'right';
    ctx.fillText(footL1, W - 72, H - (footL2 ? 84 : 52));
    if (footL2) ctx.fillText(footL2, W - 72, H - 40);
    ctx.restore();

    // ── Bottom-left: No. + date ──
    var num = vg('v-num');
    var date = vg('v-date');
    ctx.save();
    ctx.font = '300 36px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = '#1C1C1C';
    ctx.fillText('No.' + num, 64, H - 80);
    ctx.fillText('(' + date + ')', 64, H - 36);
    ctx.restore();
  }

fontsReady.then(function() {
    var logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.src = VOUCHER_LOGO_B64;
    function doRender(bgImg) {
        if (logo.complete && logo.naturalWidth > 0) {
            draw(bgImg, logo);
        } else {
            logo.onload = function() { draw(bgImg, logo); };
            logo.onerror = function() { draw(bgImg, null); };
        }
    }
    if (voucherBgImage) {
        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function() { doRender(img); };
        img.src = voucherBgImage;
    } else {
        doRender(null);
    }
});
}
function wrapText(ctx, text, font, maxW) {
  ctx.font = font;
  var words = text.split(' ');
  var lines = [], cur = '';
  words.forEach(function(w) {
    var test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else { cur = test; }
  });
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function voucherDownload() {
  var canvas = document.getElementById('voucher-canvas'); if (!canvas) return;
  var num = vg('v-num') || 'voucher';
  var toName = vg('v-to').replace(/\s+/g,'_') || 'voucher';
  var link = document.createElement('a');
  link.download = 'YourSZN_Voucher_' + num + '_' + toName + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  // Increment counter and pre-populate next voucher number
  voucherCounter = parseInt(vg('v-num'), 10) || voucherCounter;
  voucherCounter++;
  localStorage.setItem('yszn_voucher_counter', voucherCounter);
  var numInput = document.getElementById('v-num');
  if (numInput) {
    numInput.value = voucherCounter;
    voucherPreview();
  }
}

function renderMarketing() {
  if (mktTab === 'creators') { renderCreators(); return; }
  var el = document.getElementById('mkt-content'); if (!el) return;
  var tabLabels = {website:'Website Tasks',blog:'Blog',creators:'Creators',linkedin:'LinkedIn',gbp:'Google Business Profile'};
  var data = mktData[mktTab] || {lists:[]};
  var lists = data.lists || [];

  var html = '<div style="display:flex;justify-content:flex-end;margin-bottom:16px">'
    + '<button class="btn btnp" onclick="openMktListModal(null)">+ New List</button>'
    + '</div>';

  if (!lists.length) {
    html += '<div style="text-align:center;padding:60px;color:var(--muted)">No lists yet — click + New List to get started.</div>';
  } else {
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px">';
    lists.forEach(function(lst) {
      var items = lst.items || [];
      var done  = items.filter(function(x){return x.done;}).length;
      html += '<div class="card">'
        + '<div class="ch" style="display:flex;align-items:center;justify-content:space-between">'
        +   '<div>'
        +     '<div class="ct">'+esc(lst.title)+'</div>'
        +     (items.length ? '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+done+' / '+items.length+' done</div>' : '')
        +   '</div>'
        +   '<div style="display:flex;gap:6px">'
        +     '<button class="fin-row-edit" onclick="openMktListModal(\''+lst.id+'\')">Edit</button>'
        +     '<button class="fin-row-edit" onclick="deleteMktList(\''+lst.id+'\')" style="color:#EF4444">Del</button>'
        +     '<button class="fin-row-edit" onclick="openMktItemModal(\''+lst.id+'\',null)">+ Item</button>'
        +   '</div>'
        + '</div>'
        + '<div class="cb">';
      if (!items.length) {
        html += '<div style="color:var(--muted);font-size:13px;padding:8px 0">No items yet.</div>';
      } else {
        items.forEach(function(item) {
          html += '<div class="titem'+(item.done?' done':'')+'">'
            + '<div class="tck" onclick="mktToggle(\''+lst.id+'\',\''+item.id+'\')">'+(item.done?'<svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="2" fill="none"/></svg>':'')+'</div>'
            + '<div style="flex:1;min-width:0"><div class="ttx">'+esc(item.text)+'</div>'+(item.notes?'<div style="font-size:11px;color:var(--muted);margin-top:2px;padding-left:0">'+esc(item.notes)+'</div>':'')+'</div>'
            + '<button class="fin-row-edit" style="font-size:10px;opacity:.6" onclick="openMktItemModal(\''+lst.id+'\',\''+item.id+'\')">&#9998;</button>'
            + '<button class="fin-row-edit" style="font-size:10px;color:#EF4444;opacity:.6" onclick="deleteMktItem(\''+lst.id+'\',\''+item.id+'\')">&#10005;</button>'
            + '</div>';
        });
      }
      html += '</div></div>';
    });
    html += '</div>';
  }
  el.innerHTML = html;
}

function openMktListModal(id) {
  _mktListEditId = id;
  var data = mktData[mktTab]||{lists:[]};
  var lst  = id ? (data.lists||[]).find(function(x){return x.id===id;}) : null;
  document.getElementById('mktlm-heading').textContent = lst ? 'Edit List' : 'New List';
  document.getElementById('mktlm-title').value = lst ? (lst.title||'') : '';
  document.getElementById('mktlm-del').style.display = lst ? 'inline-block' : 'none';
  document.getElementById('mktlm-err').textContent = '';
  document.getElementById('mkt-list-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('mktlm-title').focus(); },80);
}
function closeMktListModal() { document.getElementById('mkt-list-modal').style.display='none'; }
function saveMktList() {
  var title = document.getElementById('mktlm-title').value.trim();
  if (!title) { document.getElementById('mktlm-err').textContent='Title required.'; return; }
  if (!mktData[mktTab]) mktData[mktTab]={lists:[]};
  if (!mktData[mktTab].lists) mktData[mktTab].lists=[];
  var lists = mktData[mktTab].lists;
  if (_mktListEditId) {
    var idx = lists.findIndex(function(x){return x.id===_mktListEditId;});
    if (idx>-1) lists[idx].title = title;
  } else {
    lists.push({id:'ml'+Date.now(), title:title, items:[]});
  }
  closeMktListModal(); saveData(); renderMarketing();
}
function deleteMktList(listId) {
  if (!confirm('Delete this list?')) return;
  var d = mktData[mktTab]; if(!d) return;
  d.lists = (d.lists||[]).filter(function(x){return x.id!==listId;});
  saveData(); renderMarketing();
}

function openMktItemModal(listId, itemId) {
  _mktListCtx    = listId;
  _mktItemEditId = itemId;
  var d    = mktData[mktTab]||{lists:[]};
  var lst  = (d.lists||[]).find(function(x){return x.id===listId;});
  var item = itemId ? (lst&&lst.items||[]).find(function(x){return x.id===itemId;}) : null;
  document.getElementById('mktim-heading').textContent = item ? 'Edit Item' : 'Add Item';
  document.getElementById('mktim-text').value  = item ? (item.text||'')  : '';
  document.getElementById('mktim-notes').value = item ? (item.notes||'') : '';
  document.getElementById('mktim-del').style.display = item ? 'inline-block' : 'none';
  document.getElementById('mktim-err').textContent = '';
  document.getElementById('mkt-item-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('mktim-text').focus(); },80);
}
function closeMktItemModal() { document.getElementById('mkt-item-modal').style.display='none'; }
function saveMktItem() {
  var text = document.getElementById('mktim-text').value.trim();
  if (!text) { document.getElementById('mktim-err').textContent='Item text required.'; return; }
  var d   = mktData[mktTab]||{lists:[]};
  var lst = (d.lists||[]).find(function(x){return x.id===_mktListCtx;});
  if (!lst) return;
  if (!lst.items) lst.items=[];
  var obj = {id:_mktItemEditId||'mi'+Date.now(), text:text, notes:document.getElementById('mktim-notes').value.trim(), done:false};
  if (_mktItemEditId) {
    var idx = lst.items.findIndex(function(x){return x.id===_mktItemEditId;});
    if (idx>-1) { obj.done = lst.items[idx].done; lst.items[idx]=obj; }
  } else { lst.items.push(obj); }
  closeMktItemModal(); saveData(); renderMarketing();
}
function deleteMktItem(listId, itemId) {
  var d   = mktData[mktTab]||{lists:[]};
  var lst = (d.lists||[]).find(function(x){return x.id===listId;});
  if (!lst) return;
  lst.items = (lst.items||[]).filter(function(x){return x.id!==itemId;});
  saveData(); renderMarketing();
}
function mktToggle(listId, itemId) {
  var d   = mktData[mktTab]||{lists:[]};
  var lst = (d.lists||[]).find(function(x){return x.id===listId;});
  if (!lst) return;
  var item = (lst.items||[]).find(function(x){return x.id===itemId;});
  if (item) item.done = !item.done;
  saveData(); renderMarketing();
}

// ══ Vietnam Onboarding SOP tab ══
var _vtObEditId = null;
function renderVtOnboarding() {
  var items = vtData.onboardingSop || [];
  var html = '<div class="card"><div class="ch" style="display:flex;align-items:center;justify-content:space-between">'
    + '<div class="ct">Client Onboarding Process</div>'
    + '<button class="btn btnp" style="font-size:12px;padding:6px 14px" onclick="openVtObModal(null)">+ Add Step</button>'
    + '</div><div class="cb">'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:12px">Track the order of steps for onboarding each Vietnam client. Click to mark complete.</div>';
  if (!items.length) {
    html += '<div style="color:var(--muted);font-size:13px;padding:8px 0">No steps yet.</div>';
  } else {
    items.forEach(function(item, idx) {
      html += '<div class="titem'+(item.done?' done':'')+'" style="padding:10px 0;border-bottom:1px solid var(--sand)">'
        + '<div style="display:flex;align-items:center;gap:8px;width:100%">'
        +   '<div style="font-size:12px;font-weight:700;color:var(--muted);min-width:22px;text-align:center">'+(idx+1)+'</div>'
        +   '<div class="tck" onclick="vtObToggle(\''+item.id+'\')">'+(item.done?'<svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="2" fill="none"/></svg>':'')+'</div>'
        +   '<div style="flex:1;min-width:0">'
        +     '<div class="ttx">'+esc(item.text)+'</div>'
        +     (item.notes?'<div style="font-size:11px;color:var(--muted);margin-top:2px">'+esc(item.notes)+'</div>':'')
        +   '</div>'
        +   '<button class="fin-row-edit" onclick="openVtObModal(\''+item.id+'\')">Edit</button>'
        +   (idx>0?'<button class="fin-row-edit" style="opacity:.5" onclick="vtObMove(\''+item.id+'\',-1)">↑</button>':'')
        +   (idx<items.length-1?'<button class="fin-row-edit" style="opacity:.5" onclick="vtObMove(\''+item.id+'\',1)">↓</button>':'')
        + '</div>'
        + '</div>';
    });
  }
  html += '</div></div>';
  return html;
}
function vtObToggle(id) {
  var item = (vtData.onboardingSop||[]).find(function(x){return x.id===id;});
  if (item) item.done = !item.done;
  vtSave(); renderVietnamTour();
}
function vtObMove(id, dir) {
  var arr = vtData.onboardingSop||[];
  var idx = arr.findIndex(function(x){return x.id===id;});
  var newIdx = idx+dir;
  if (newIdx<0||newIdx>=arr.length) return;
  var tmp=arr[idx]; arr[idx]=arr[newIdx]; arr[newIdx]=tmp;
  vtSave(); renderVietnamTour();
}
function openVtObModal(id) {
  _vtObEditId = id;
  var item = id ? (vtData.onboardingSop||[]).find(function(x){return x.id===id;}) : null;
  document.getElementById('vtob-heading').textContent = item ? 'Edit Step' : 'Add Step';
  document.getElementById('vtob-text').value  = item ? (item.text||'')  : '';
  document.getElementById('vtob-notes').value = item ? (item.notes||'') : '';
  document.getElementById('vtob-del').style.display = item ? 'inline-block' : 'none';
  document.getElementById('vtob-err').textContent = '';
  document.getElementById('vtob-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('vtob-text').focus(); },80);
}
function closeVtObModal() { document.getElementById('vtob-modal').style.display='none'; }
function saveVtObModal() {
  var text = document.getElementById('vtob-text').value.trim();
  if (!text) { document.getElementById('vtob-err').textContent='Step text required.'; return; }
  if (!vtData.onboardingSop) vtData.onboardingSop=[];
  var obj = {id:_vtObEditId||'ob'+Date.now(), text:text, notes:document.getElementById('vtob-notes').value.trim(), done:false};
  if (_vtObEditId) {
    var idx = vtData.onboardingSop.findIndex(function(x){return x.id===_vtObEditId;});
    if (idx>-1) { obj.done=vtData.onboardingSop[idx].done; vtData.onboardingSop[idx]=obj; }
  } else { vtData.onboardingSop.push(obj); }
  closeVtObModal(); vtSave(); renderVietnamTour();
}
function deleteVtObStep(id) {
  vtData.onboardingSop = (vtData.onboardingSop||[]).filter(function(x){return x.id!==id;});
  closeVtObModal(); vtSave(); renderVietnamTour();
}

// ══ Vietnam client status update ══
function vtUpdateClientStatus(list, idx, status) {
  var arr = list==='booked' ? (vtData.bookedClients||[]) : (vtData.intClients||[]);
  if (arr[idx]) arr[idx].status = status;
  vtSave();
  // Re-render just the status badge colour without full re-render to avoid focus loss
  renderVietnamTour();
}


