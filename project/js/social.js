// Social — social media planning and tracking

function setSmTab(tab) {
  smTabActive = tab;
  document.getElementById('sm-sec-planner').style.display = (tab==='planner') ? 'block' : 'none';
  document.getElementById('sm-sec-ideas').style.display   = (tab==='ideas')   ? 'block' : 'none';
  document.querySelectorAll('[id^="sm-tab-"]').forEach(function(b){ b.classList.remove('on'); });
  var tb = document.getElementById('sm-tab-'+tab); if(tb) tb.classList.add('on');
  if (tab==='ideas') renderIdeas();
}

// ── Content Ideas ──
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

function getWS(off) {
  var now = new Date(), day = now.getDay(), diff = now.getDate() - (day===0?6:day-1);
  var mon = new Date(now.setDate(diff)); mon.setHours(0,0,0,0);
  mon.setDate(mon.getDate() + (off||0)*7); return mon;
}
function smWeekLbl(off) {
  var ws = getWS(off), we = new Date(ws); we.setDate(ws.getDate()+6);
  return fmtDate(ws) + ' – ' + fmtDate(we);
}

function renderSocialPage() {
  renderSchedulePlanner();
  renderMetaSchedule();
  renderVideoTracker();
  renderMetaRotation();
  renderCelebList();
  renderAdStatusPills();
}

// ── Stories ──
function renderStoriesPlanner() {
  var el = document.getElementById('stories-grid'); if (!el) return;
  var lbl = document.getElementById('stories-week-lbl'); if (lbl) lbl.textContent = smWeekLbl(storiesWeekOff);
  var ws = getWS(storiesWeekOff);
  var html = '<div class="week-grid">';
  for (var d=0; d<7; d++) {
    var dt = new Date(ws); dt.setDate(ws.getDate()+d);
    var key = storiesWeekOff+'_'+d;
    var slot = storiesData[key] || {};
    html += '<div class="day-col">'
      +'<div class="day-hd"><div class="day-name">'+DAYS[d]+'</div><div class="day-date">'+fmtDate(dt)+'</div></div>'
      +'<div class="slot-cell" onclick="openSlotModal('+d+',\'stories\')">'
      +(slot.img ? '<img src="'+esc(slot.img)+'">' : '')
      +(slot.posttype ? '<div class="slot-type">'+esc(slot.posttype)+'</div>' : '')
      +(slot.topic ? '<div class="slot-topic">'+esc(slot.topic)+'</div>' : '')
      +(slot.status ? '<div style="margin-top:4px"><span class="slot-status-dot '+slot.status+'"></span><span style="font-size:10px;color:var(--muted)">'+cap(slot.status)+'</span></div>' : '')
      +(!slot.topic && !slot.posttype ? '<div class="slot-add">+ Add</div>' : '')
      +'</div></div>';
  }
  html += '</div>';
  el.innerHTML = html;
}
function changeStoriesWeek(d) { storiesWeekOff += d; renderStoriesPlanner(); }

// ── META Schedule ──
function renderMetaSchedule() {
  var body = document.getElementById('meta-sched-body'); if (!body) return;
  body.innerHTML = '';
  var rows = ['STORY','AM POST','PM POST'];
  var rowBorderColor = {STORY:'#7C3AED', 'AM POST':'#C49A8A', 'PM POST':'#7A8C6E'};
  var rowBgColor     = {STORY:'rgba(237,233,254,.35)', 'AM POST':'rgba(254,243,199,.45)', 'PM POST':'rgba(219,234,254,.45)'};
  var staffColors    = {Lemari:'#7A8C6E', Salma:'#C49A8A', Latisha:'#C4956A'};

  rows.forEach(function(rowLabel) {
    var tr = document.createElement('tr');
    var th = document.createElement('th');
    th.textContent = rowLabel;
    th.style.cssText = 'color:white;background:'+rowBorderColor[rowLabel]+';writing-mode:vertical-lr;text-align:center;padding:8px 5px;font-size:9px;font-weight:700;letter-spacing:1.5px;width:32px;white-space:nowrap';
    tr.appendChild(th);

    for (var d = 0; d < 7; d++) {
      var td = document.createElement('td');
      var key = 'mrc:'+rowLabel+':'+d;
      var slot = metaSchedData[key] || {};
      td.style.cssText = 'cursor:pointer;padding:0;vertical-align:top;width:120px;height:160px;position:relative;border:1px solid var(--sand);overflow:hidden;background:'+(slot.thumb ? '#1a1a1a' : rowBgColor[rowLabel]);
      td.dataset.key = key;
      td.onclick = function() { openMrcModal(this.dataset.key); };

      var inner = '';
      if (slot.thumb) {
        inner += '<img src="'+slot.thumb+'" style="width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0">';
        inner += '<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.4) 0%,transparent 45%,transparent 55%,rgba(0,0,0,.55) 100%)"></div>';
      }
      if (slot.contentType) {
        inner += '<div style="position:absolute;top:7px;left:7px;font-size:9px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;background:rgba(255,255,255,.93);color:var(--charcoal);padding:3px 8px;border-radius:10px;max-width:calc(100% - 14px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:2">'+slot.contentType+'</div>';
      }
      if (slot.staff) {
        var sc = staffColors[slot.staff] || '#C9B99A';
        inner += '<div style="position:absolute;top:'+(slot.contentType?'30px':'7px')+';right:7px;font-size:9px;font-weight:700;background:'+sc+';color:white;padding:3px 8px;border-radius:10px;white-space:nowrap;z-index:2">'+slot.staff+'</div>';
      }
      if (slot.canvaWip || slot.canvaDone) {
        inner += '<div style="position:absolute;bottom:7px;left:7px;right:7px;display:flex;gap:4px;flex-wrap:wrap;z-index:2">';
        if (slot.canvaWip)  inner += '<a href="'+slot.canvaWip+'"  target="_blank" onclick="event.stopPropagation()" style="font-size:9px;font-weight:700;background:#EDE9FE;color:#6D28D9;padding:3px 7px;border-radius:8px;text-decoration:none">WIP</a>';
        if (slot.canvaDone) inner += '<a href="'+slot.canvaDone+'" target="_blank" onclick="event.stopPropagation()" style="font-size:9px;font-weight:700;background:#D1FAE5;color:#065F46;padding:3px 7px;border-radius:8px;text-decoration:none">Final</a>';
        inner += '</div>';
      }
      if (!slot.thumb && !slot.contentType && !slot.staff) {
        inner += '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--tan);font-size:24px;opacity:.5">+</div>';
      }
      td.innerHTML = inner;
      tr.appendChild(td);
    }
    body.appendChild(tr);
  });
}

function openSchedImgModal(time, dayIdx) {
  schedImgKey = time+'_'+dayIdx;
  var inp = document.getElementById('sched-img-url'); if (inp) inp.value = schedImages[schedImgKey]||'';
  var m = document.getElementById('sched-img-modal'); if (m) m.style.display = 'flex';
}
function closeSchedImgModal() { var m = document.getElementById('sched-img-modal'); if (m) m.style.display='none'; }
function saveSchedImgUrl() {
  var url = document.getElementById('sched-img-url').value.trim();
  if (schedImgKey) schedImages[schedImgKey] = url;
  closeSchedImgModal(); renderMetaSchedule();
}
function handleSchedImgUpload(input) {
  if (!input.files||!input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) { if (schedImgKey) schedImages[schedImgKey]=e.target.result; closeSchedImgModal(); renderMetaSchedule(); };
  reader.readAsDataURL(input.files[0]);
}

// ── Posts ──
// ── Combined Schedule Planner ──
var plannerWeekOff = 0;
var plannerTab = 'meta'; // 'meta' or 'tiktok'

function setPlannerTab(t) {
  plannerTab = t;
  document.querySelectorAll('.planner-tab').forEach(function(b){b.classList.remove('on');});
  var tb = document.getElementById('planner-tab-'+t);
  if(tb) tb.classList.add('on');
  renderSchedulePlanner();
}

function changePlannerWeek(d) { plannerWeekOff += d; renderSchedulePlanner(); }

function renderSchedulePlanner() {
  var grid = document.getElementById('planner-grid'); if (!grid) return;
  var lbl  = document.getElementById('planner-week-lbl');
  var today = new Date(); today.setHours(0,0,0,0);
  var mon   = new Date(today); mon.setDate(today.getDate() - ((today.getDay()+6)%7) + plannerWeekOff*7);
  var sun   = new Date(mon); sun.setDate(mon.getDate()+6);
  var MN    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var fmtD  = function(d){ return d.getDate()+' '+MN[d.getMonth()]; };
  var fmt12 = function(t){ if(!t) return ''; var p=t.split(':'); var h=parseInt(p[0],10); return (h%12||12)+':'+(p[1]||'00')+(h<12?' AM':' PM'); };
  var lkey  = function(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  if (lbl) lbl.textContent = fmtD(mon) + ' \u2013 ' + fmtD(sun);
  var DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  var ROWS = [{key:'stories',label:'STORIES'},{key:'am',label:'AM POST'},{key:'pm',label:'PM POST'}];
  var isMeta = (plannerTab === 'meta');
  // Build grid using DOM (avoids all base64/quote escaping issues)
  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:grid;grid-template-columns:28px repeat(7,minmax(130px,1fr));gap:8px;';
  // Header row
  wrap.appendChild(document.createElement('div'));
  for (var c=0; c<7; c++) {
    var d = new Date(mon); d.setDate(mon.getDate()+c);
    var hd = document.createElement('div');
    hd.style.cssText = 'text-align:center;padding-bottom:8px;';
    hd.innerHTML = '<div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted)">'+DAYS[c]+'</div>'
      + '<div style="font-size:11px;color:var(--charcoal);margin-top:2px">'+fmtD(d)+'</div>';
    wrap.appendChild(hd);
  }
  // Data rows
  for (var r=0; r<ROWS.length; r++) {
    var rl = document.createElement('div');
    rl.className = 'planner-row-label';
    rl.textContent = ROWS[r].label;
    wrap.appendChild(rl);
    for (var c=0; c<7; c++) {
      var d = new Date(mon); d.setDate(mon.getDate()+c);
      var dKey    = lkey(d);
      var slotKey = plannerTab + ':' + ROWS[r].key + ':' + dKey;
      var slot    = (socialSlots||{})[slotKey];
      var cell    = document.createElement('div');
      cell.dataset.key = slotKey;
      cell.onclick = function(){ openSlotModal(this.dataset.key); };
      // Platform badge
      var badge = document.createElement('span');
      badge.className = isMeta ? 'planner-platform-badge' : 'planner-platform-badge tt';
      badge.textContent = isMeta ? 'IG' : 'TT';
      if (slot && slot.thumb && slot.thumb.length > 10) {
        // ── Thumbnail cell ──
        cell.className = 'planner-cell planner-cell-filled';
        cell.style.cssText = 'min-height:140px;position:relative;overflow:hidden;padding:0;';
        cell.style.backgroundSize     = 'cover';
        cell.style.backgroundPosition = 'center top';
        cell.style.backgroundImage    = 'url(' + JSON.stringify(slot.thumb) + ')';
        cell.appendChild(badge);
        // Title overlay
        var nOv = document.createElement('div');
        nOv.style.cssText = 'position:absolute;bottom:'+(slot.time?'24':'6')+'px;left:6px;right:6px;'
          +'color:#fff;font-size:10px;font-weight:600;text-shadow:0 1px 4px rgba(0,0,0,.9);'
          +'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        nOv.textContent = slot.title || '';
        cell.appendChild(nOv);
        // Time overlay
        if (slot.time) {
          var tOv = document.createElement('div');
          tOv.style.cssText = 'position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,.65);'
            +'color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:5px;';
          tOv.textContent = fmt12(slot.time);
          cell.appendChild(tOv);
        }
      } else if (slot && slot.title) {
        // ── Title-only cell ──
        cell.className = 'planner-cell planner-cell-filled';
        cell.style.cssText = 'padding:12px;min-height:140px;position:relative;';
        cell.appendChild(badge);
        var ttl = document.createElement('div');
        ttl.style.cssText = 'font-size:12px;color:var(--charcoal);margin-top:28px;text-align:center;font-weight:500;';
        ttl.textContent = slot.title;
        cell.appendChild(ttl);
        if (slot.time) {
          var tLbl = document.createElement('div');
          tLbl.style.cssText = 'font-size:10px;color:var(--muted);margin-top:4px;text-align:center;';
          tLbl.textContent = fmt12(slot.time);
          cell.appendChild(tLbl);
        }
      } else {
        // ── Empty cell ──
        cell.className = 'planner-cell';
        cell.appendChild(badge);
        var add = document.createElement('div');
        add.className = 'planner-add';
        add.innerHTML = '<div class="planner-add-icon">+</div><div class="planner-add-lbl">ADD</div>';
        cell.appendChild(add);
      }
      wrap.appendChild(cell);
    }
  }
  grid.innerHTML = '';
  grid.appendChild(wrap);
}

function openSlotModal(key) {
  var slot = (socialSlots||{})[key];
  var parts = key ? key.split(':') : [];
  var rowKey = parts[1]||'';
  var dateStr = parts[2]||'';
  var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var d = dateStr ? new Date(dateStr+'T12:00:00') : null;
  var dayLabel = d ? days[d.getDay() === 0 ? 6 : d.getDay()-1] + ' ' + d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] : '';
  var rowLabel = {stories:'Stories', am:'AM Post', pm:'PM Post'}[rowKey] || rowKey;

  // If this slot is linked to a video, show video details
  if (slot && slot.vidId) {
    var v = vidData.find(function(x){ return x.id === slot.vidId; });
    if (v) { openPlannerVidModal(key, v, slot, dayLabel, rowLabel); return; }
  }
  // Otherwise open the manual slot editor
  openManualSlotModal(key, slot, dayLabel, rowLabel);
}

var socialSlots = {};
var currentSlotKey = null;

function renderPostsPlanner() {
  var el = document.getElementById('posts-grid'); if (!el) return;
  var lbl = document.getElementById('posts-week-lbl'); if (lbl) lbl.textContent = smWeekLbl(postsWeekOff);
  var ws = getWS(postsWeekOff);
  var html = '<div class="week-grid">';
  for (var d=0; d<7; d++) {
    var dt = new Date(ws); dt.setDate(ws.getDate()+d);
    var key = postsWeekOff+'_'+d;
    var slot = postsData[key] || {};
    html += '<div class="day-col">'
      +'<div class="day-hd"><div class="day-name">'+DAYS[d]+'</div><div class="day-date">'+fmtDate(dt)+'</div></div>'
      +'<div class="slot-cell" onclick="openSlotModal('+d+',\'posts\')">'
      +(slot.img ? '<img src="'+esc(slot.img)+'">' : '')
      +(slot.assign ? '<div class="slot-assigned">'+cap(slot.assign)+'</div>' : '')
      +(slot.posttype ? '<div class="slot-type">'+esc(slot.posttype)+'</div>' : '')
      +(slot.topic ? '<div class="slot-topic">'+esc(slot.topic)+'</div>' : '')
      +(slot.status ? '<div style="margin-top:4px"><span class="slot-status-dot '+slot.status+'"></span><span style="font-size:10px;color:var(--muted)">'+cap(slot.status)+'</span></div>' : '')
      +(!slot.topic && !slot.assign ? '<div class="slot-add">+ Add</div>' : '')
      +'</div></div>';
  }
  html += '</div>';
  el.innerHTML = html;
}
function changePostsWeek(d) { postsWeekOff += d; renderPostsPlanner(); }

// ── Content Calendar ──
function renderContentCalendar() {
  var el = document.getElementById('cc-grid'); if (!el) return;
  var lbl = document.getElementById('cc-week-lbl'); if (lbl) lbl.textContent = smWeekLbl(ccWeekOff);
  var ws = getWS(ccWeekOff);
  var html = '<table class="cc-tbl"><thead><tr><th class="cc-day">Day</th>'
    + PILLARS.map(function(p){ return '<th>'+p+'</th>'; }).join('') + '</tr></thead><tbody>';
  for (var d=0; d<7; d++) {
    var dt = new Date(ws); dt.setDate(ws.getDate()+d);
    var key = ccWeekOff+'_'+d;
    var slot = postsData[key] || {};
    html += '<tr onclick="openSlotModal('+d+',\'posts\')" style="cursor:pointer"><td class="cc-day">'+DAYS[d]+' '+fmtDate(dt)+'</td>'
      + PILLARS.map(function(p){ return '<td>'+(slot.pillar===p?'<span class="cc-dot"></span>':'')+'</td>'; }).join('')
      + '</tr>';
  }
  html += '</tbody></table>';
  el.innerHTML = html;
}
function changeCCWeek(d) { ccWeekOff += d; renderContentCalendar(); }

// ── Slot Modal ──
function openLegacySlotModal(dayIdx, type) {
  slotEditDay = dayIdx; slotEditType = type;
  var ws = getWS(type==='stories' ? storiesWeekOff : postsWeekOff);
  var dt = new Date(ws); dt.setDate(ws.getDate()+dayIdx);
  var store = type==='stories' ? storiesData : postsData;
  var weekOff = type==='stories' ? storiesWeekOff : postsWeekOff;
  var slot = store[weekOff+'_'+dayIdx] || {};
  var title = document.getElementById('slot-modal-title');
  if (title) title.textContent = DAYS[dayIdx]+' '+fmtDate(dt)+' — '+(type==='stories'?'Story':'Post');
  document.getElementById('slot-assign').value = slot.assign||'';
  document.getElementById('slot-posttype').value = slot.posttype||'Reel';
  document.getElementById('slot-pillar').value = slot.pillar||PILLARS[0];
  document.getElementById('slot-topic').value = slot.topic||'';
  document.getElementById('slot-caption').value = slot.caption||'';
  document.getElementById('slot-cta').value = slot.cta||'';
  document.getElementById('slot-canva').value = slot.canva||'';
  document.getElementById('slot-status').value = slot.status||'idea';
  document.getElementById('slot-img-url').value = slot.img||'';
  var prev = document.getElementById('slot-img-preview');
  var prevImg = document.getElementById('slot-img-preview-img');
  if (slot.img && prev && prevImg) { prev.style.display='block'; prevImg.src=slot.img; }
  else if (prev) { prev.style.display='none'; }
  var m = document.getElementById('slot-modal'); if (m) m.style.display='flex';
}
function closeSlotModal() { var m = document.getElementById('slot-modal'); if (m) m.style.display='none'; }
function saveSlot() {
  var store = slotEditType==='stories' ? storiesData : postsData;
  var weekOff = slotEditType==='stories' ? storiesWeekOff : postsWeekOff;
  var key = weekOff+'_'+slotEditDay;
  var prevImg = document.getElementById('slot-img-preview-img');
  var imgUrl = document.getElementById('slot-img-url').value.trim();
  var finalImg = imgUrl || (prevImg && prevImg.src && prevImg.src !== window.location.href ? prevImg.src : '');
  store[key] = {
    assign: document.getElementById('slot-assign').value,
    posttype: document.getElementById('slot-posttype').value,
    pillar: document.getElementById('slot-pillar').value,
    topic: document.getElementById('slot-topic').value,
    caption: document.getElementById('slot-caption').value,
    cta: document.getElementById('slot-cta').value,
    canva: document.getElementById('slot-canva').value,
    status: document.getElementById('slot-status').value,
    img: finalImg
  };
  closeSlotModal();
  if (slotEditType==='stories') renderStoriesPlanner();
  else { renderPostsPlanner(); renderContentCalendar(); }
}
function handleSlotImgUpload(input) {
  if (!input.files||!input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var prev = document.getElementById('slot-img-preview');
    var prevImg = document.getElementById('slot-img-preview-img');
    if (prev) prev.style.display='block'; if (prevImg) prevImg.src=e.target.result;
    document.getElementById('slot-img-url').value='';
  };
  reader.readAsDataURL(input.files[0]);
}


function togglePlatDate(p) {
  var cb = document.getElementById('vm-plat-'+p);
  var dt = document.getElementById('vm-date-'+p);
  var tm = document.getElementById('vm-time-'+p);
  var show = cb && cb.checked;
  if (dt) { dt.style.display = show ? 'block' : 'none'; if (!show) dt.value = ''; }
  if (tm) { tm.style.display = show ? 'block' : 'none'; if (!show) tm.value = ''; }
}

function syncPlatStatus() {
  // If any platform date is set, auto-set status to scheduled
  var hasDate = ['ig','tt','pi','yt'].some(function(p){
    var cb = document.getElementById('vm-plat-'+p);
    var dt = document.getElementById('vm-date-'+p);
    return cb&&cb.checked&&dt&&dt.value;
  });
  if (hasDate) {
    var sel = document.getElementById('vm-pub-status');
    if (sel && sel.value === 'editing') sel.value = 'scheduled';
  }
}

// ── Video Tracker ──
function renderVideoTracker() {
  var catLabels = {client:'Client', founder:'Founder', trend:'Trend', bts:'Behind the Scenes', educational:'Educational', celeb:'Celeb'};
  var el = document.getElementById('vid-list'); if (!el) return;
  var allowed = ['client','founder','trend','bts','educational'];
  var list = vidData.filter(function(v){ return allowed.indexOf(v.vidCat) > -1; });
  if (vidFilter !== 'all') list = list.filter(function(v){ return v.vidCat === vidFilter; });
  // Platform filter
  if (vidPlatFilter === 'tt')   list = list.filter(function(v){ return v.platforms && v.platforms.tt; });
  if (vidPlatFilter === 'ig')   list = list.filter(function(v){ return v.platforms && v.platforms.ig; });
  if (vidPlatFilter === 'yt')   list = list.filter(function(v){ return v.platforms && v.platforms.yt; });
  if (vidPlatFilter === 'none') list = list.filter(function(v){ return !v.platforms || (!v.platforms.ig && !v.platforms.tt && !v.platforms.yt && !v.platforms.pi); });
  if (!list.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:40px 0">No videos match this filter.</div>';
    return;
  }
  el.innerHTML = ''; list.forEach(function(v){ el.appendChild(buildVidCard(v)); });
}

function filterVids(f, btn) {
  vidFilter = f;
  document.querySelectorAll('#pg-social .sm-pill').forEach(function(b){ b.classList.remove('on'); });
  if (btn) btn.classList.add('on');
  renderVideoTracker();
}
function filterVidPlat(f, btn) {
  vidPlatFilter = f;
  document.querySelectorAll('#vid-plat-filters .sm-pill').forEach(function(b){ b.classList.remove('on'); });
  if (btn) btn.classList.add('on');
  renderVideoTracker();
}

function buildVidCard(v) {
  var catLabels = {client:'👤 Client', founder:'✨ Founder', trend:'📈 Trend', bts:'🎬 BTS', educational:'📚 Educational', celeb:'⭐ Celeb'};
  var catCls    = 'vid-cat-' + (v.vidCat || 'client');
  var catLbl    = catLabels[v.vidCat] || v.vidCat || 'Client';
  // Platform posted badges
  var platBadges = '';
  if (v.platforms) {
    var platList = [{p:'ig',e:'📸',l:'Instagram'},{p:'tt',e:'🎵',l:'TikTok'},{p:'yt',e:'▶️',l:'YouTube'},{p:'pi',e:'📌',l:'Pinterest'}];
    platList.forEach(function(pl) {
      if (v.platforms[pl.p]) platBadges += '<span style="font-size:10px;background:var(--warm);border-radius:8px;padding:2px 7px;margin-right:4px">' + pl.e + ' ' + pl.l + ' · ' + v.platforms[pl.p] + '</span>';
    });
  }
  var isOpen = !!expandedVids[v.id];
  var div = document.createElement('div'); div.className = 'vid-card';
  div.innerHTML =
    '<div class="vid-card-hd" onclick="toggleVidExpand(\''+v.id+'\')">'+
      '<div class="vid-thumb-wrap">'+(v.thumb?'<img src="'+esc(v.thumb)+'" onerror="this.parentElement.textContent=\'🎬\'">':'🎬')+'</div>'+
      '<div class="vid-info">'+
        '<div class="vid-title">'+esc(v.client||'Untitled')+(v.part?' · '+esc(v.part):'')+'</div>'+
        '<div class="vid-meta">'+
          '<span class="vid-badge '+catCls+'">'+catLbl+'</span>'+
          '<span class="vid-badge">'+esc(v.type||'Reel')+'</span>'+
          '<span class="vid-editor">'+cap(v.editor||'lemari')+'</span>'+
          '<span class="vid-status '+(v.pubStatus||'editing')+'">'+cap(v.pubStatus||'editing')+'</span>'+
        '</div>'+
        (platBadges ? '<div style="margin-top:5px">'+platBadges+'</div>' : '')+
        (v.datePublished?'<div style="font-size:10px;color:var(--muted);margin-top:3px">Published '+v.datePublished+'</div>':
         v.dateScheduled ?'<div style="font-size:10px;color:var(--muted);margin-top:3px">Scheduled '+v.dateScheduled+'</div>':'')
      +'</div>'+
      '<div class="vid-expand'+(isOpen?' open':'')+'">▾</div>'+
    '</div>'+
    '<div class="vid-body'+(isOpen?' open':'')+'">'+
      (v.caption?'<div class="vid-detail-row"><div class="vid-detail-field"><div class="vid-detail-lbl">Caption</div><div class="vid-detail-val">'+esc(v.caption)+'</div></div></div>':'')+
      (v.notes?'<div class="vid-notes-box">'+esc(v.notes)+'</div>':'')+
      (v.platforms&&(v.platforms.ig||v.platforms.tt||v.platforms.pi||v.platforms.yt)
        ?'<div style="margin-top:12px"><div style="font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Scheduled On</div>'+
          '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
          [{p:'ig',e:'📸',l:'Instagram'},{p:'tt',e:'🎵',l:'TikTok'},{p:'pi',e:'📌',l:'Pinterest'},{p:'yt',e:'▶️',l:'YouTube'}]
            .map(function(pl){return v.platforms[pl.p]?'<div style="background:var(--warm);border-radius:8px;padding:6px 10px;font-size:12px">'+pl.e+' <strong>'+pl.l+'</strong> · '+v.platforms[pl.p]+'</div>':'';}).join('')+
          '</div></div>':'')+
      (v.driveLink?'<a href="'+esc(v.driveLink)+'" target="_blank" class="btn btns" style="font-size:12px;display:inline-block;margin-top:10px;text-decoration:none">📁 Open</a>':'')+
      '<div style="margin-top:12px"><button class="btn btns" style="font-size:12px" onclick="openVidModal(\''+v.id+'\')">Edit</button></div>'+
    '</div>';
  return div;
}

function toggleVidExpand(id) { expandedVids[id]=!expandedVids[id]; renderVideoTracker(); }
function openVidModal(id) {
  var v = id ? vidData.find(function(x){return x.id===id;}) : null;
  // Reset platform filter so new video is always visible after saving
  if (!id) {
    vidPlatFilter = 'all'; vidFilter = 'all';
    document.querySelectorAll('#vid-plat-filters .sm-pill').forEach(function(b){ b.classList.remove('on'); });
    var allPlatBtn = document.querySelector('#vid-plat-filters .sm-pill');
    if (allPlatBtn) allPlatBtn.classList.add('on');
    document.querySelectorAll('#pg-social .sm-pill:not(#vid-plat-filters .sm-pill)').forEach(function(b,i){ b.classList.toggle('on', i===0); });
  }
  document.getElementById('vm-id').value = id||'';
  document.getElementById('vm-vid-cat').value = v?v.vidCat||'client':'client';
  document.querySelectorAll('input[name="vm-cat-r"]').forEach(function(r){ r.checked=(r.value===(v?v.vidCat||'client':'client')); });
  // Restore slot selections
  ['ig','tt'].forEach(function(p) {
    var sl = document.getElementById('vm-slot-'+p);
    if (sl) sl.value = (v && v.slots && v.slots[p]) ? v.slots[p] : 'am';
  });
  document.getElementById('vm-client').value = v?v.client||'':'';
  document.getElementById('vm-type').value = v?v.type||'Reel':'Reel';
  document.getElementById('vm-part').value = v?v.part||'':'';
  document.getElementById('vm-editor').value = v?v.editor||'lemari':'lemari';
  document.getElementById('vm-caption').value = v?v.caption||'':'';
  document.getElementById('vm-cta').value = v?v.cta||'':'';
  document.getElementById('vm-hashtags').value = v?v.hashtags||'':'';
  document.getElementById('vm-pub-status').value = v?v.pubStatus||'editing':'editing';
  document.getElementById('vm-link').value = v?v.driveLink||'':'';
  document.getElementById('vm-date-completed').value = v?v.dateCompleted||'':'';
  document.getElementById('vm-date-published').value = v?v.datePublished||'':'';
  // Platform schedules
  ['ig','tt','pi','yt'].forEach(function(p) {
    var cb  = document.getElementById('vm-plat-'+p);
    var dt  = document.getElementById('vm-date-'+p);
    var tm  = document.getElementById('vm-time-'+p);
    var val  = v && v.platforms ? (v.platforms[p] || '') : '';
    var tval = v && v.times     ? (v.times[p]     || '') : '';
    if (cb) cb.checked = !!val;
    if (dt) { dt.value = val;  dt.style.display = val ? 'block' : 'none'; }
    if (tm) { tm.value = tval; tm.style.display = val ? 'block' : 'none'; }
  });
  document.getElementById('vm-notes').value = v?v.notes||'':'';
  document.getElementById('vm-thumb').value = v?v.thumb||'':'';
  var tp = document.getElementById('vm-thumb-preview');
  if (tp) { tp.src=v?v.thumb||'':''; tp.style.display=(v&&v.thumb)?'block':'none'; }
  var m = document.getElementById('vid-modal'); if (m) m.style.display='flex';
}
function closeVidModal() { var m = document.getElementById('vid-modal'); if (m) m.style.display='none'; }
function timeToSlot(t) {
  if (!t) return 'am';
  var h = parseInt(t.split(':')[0], 10);
  return h < 12 ? 'am' : 'pm';
}

function saveVid() {
  var id = document.getElementById('vm-id').value || ('v'+Date.now());
  var tp = document.getElementById('vm-thumb-preview');
  var thumbUrl = document.getElementById('vm-thumb').value.trim() ||
    (tp && tp.src && tp.src !== window.location.href ? tp.src : '');
  var igTime = document.getElementById('vm-time-ig') ? document.getElementById('vm-time-ig').value : '';
  var ttTime = document.getElementById('vm-time-tt') ? document.getElementById('vm-time-tt').value : '';
  var obj = {
    id: id,
    vidCat:        document.getElementById('vm-vid-cat').value,
    client:        document.getElementById('vm-client').value,
    type:          document.getElementById('vm-type').value,
    part:          document.getElementById('vm-part').value,
    editor:        document.getElementById('vm-editor').value,
    caption:       document.getElementById('vm-caption').value,
    cta:           document.getElementById('vm-cta').value,
    hashtags:      document.getElementById('vm-hashtags').value,
    pubStatus:     document.getElementById('vm-pub-status').value,
    driveLink:     document.getElementById('vm-link').value,
    dateCompleted: document.getElementById('vm-date-completed').value,
    datePublished: document.getElementById('vm-date-published').value,
    notes:         document.getElementById('vm-notes').value,
    thumb:         thumbUrl,
    platforms: {
      ig: document.getElementById('vm-plat-ig').checked ? document.getElementById('vm-date-ig').value : '',
      tt: document.getElementById('vm-plat-tt').checked ? document.getElementById('vm-date-tt').value : '',
      pi: document.getElementById('vm-plat-pi').checked ? document.getElementById('vm-date-pi').value : '',
      yt: document.getElementById('vm-plat-yt').checked ? document.getElementById('vm-date-yt').value : ''
    },
    times: { ig: igTime, tt: ttTime },
    slots: { ig: timeToSlot(igTime), tt: timeToSlot(ttTime) }
  };
  var idx = vidData.findIndex(function(x){ return x.id === id; });
  if (idx > -1) vidData[idx] = obj; else vidData.push(obj);
  dropVidIntoPlanner(obj);
  closeVidModal();
  renderVideoTracker();
  renderSchedulePlanner();
}

function dropVidIntoPlanner(v) {
  if (!v.platforms) return;
  var platTab = {ig:'meta', tt:'tiktok'};
  // Remove all previous planner entries for this video
  Object.keys(socialSlots).forEach(function(k) {
    if (socialSlots[k] && socialSlots[k].vidId === v.id) delete socialSlots[k];
  });
  var firstDate = null; var firstTab = null;
  ['ig','tt'].forEach(function(p) {
    var dateStr = v.platforms[p]; if (!dateStr) return;
    var tab  = platTab[p];
    var time = v.times && v.times[p] ? v.times[p] : '';
    var row  = timeToSlot(time); // derives 'am' or 'pm' from time
    var slotKey = tab + ':' + row + ':' + dateStr;
    // If slot already taken by a different video, use the other row
    if (socialSlots[slotKey] && socialSlots[slotKey].vidId && socialSlots[slotKey].vidId !== v.id) {
      row = (row === 'am') ? 'pm' : 'am';
      slotKey = tab + ':' + row + ':' + dateStr;
    }
    socialSlots[slotKey] = {
      title:    (v.client || 'Video') + (v.part ? ' · ' + v.part : ''),
      thumb:    (v.thumb && v.thumb.length > 10) ? v.thumb : null,
      vidId:    v.id,
      platform: p,
      time:     time,
      status:   'scheduled'
    };
    if (!firstDate) { firstDate = dateStr; firstTab = tab; }
  });
  // Navigate planner to the week + tab of the first scheduled date
  if (firstDate) {
    var target = new Date(firstDate + 'T12:00:00');
    var today  = new Date(); today.setHours(0,0,0,0);
    var mon    = new Date(today); mon.setDate(today.getDate() - ((today.getDay()+6)%7));
    plannerWeekOff = Math.round((target - mon) / (7*24*60*60*1000));
    plannerTab = firstTab;
    document.querySelectorAll('.planner-tab').forEach(function(b){ b.classList.remove('on'); });
    var tb = document.getElementById('planner-tab-' + firstTab);
    if (tb) tb.classList.add('on');
  }
  saveData();
  renderSchedulePlanner();
}

function deleteVid() {
  var id = document.getElementById('vm-id').value;
  if (!id||!confirm('Delete this video?')) return;
  vidData = vidData.filter(function(v){return v.id!==id;});
  closeVidModal(); renderVideoTracker();
}
function handleVmThumbUpload(input) {
  if (!input.files||!input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var tp = document.getElementById('vm-thumb-preview'); if (tp){tp.src=e.target.result;tp.style.display='block';}
    document.getElementById('vm-thumb').value='';
  };
  reader.readAsDataURL(input.files[0]);
}
function openLightbox(src) { var lb=document.getElementById('lightbox'); var img=document.getElementById('lightbox-img'); if(!lb||!img)return; img.src=src; lb.style.display='flex'; }
function closeLightbox() { var lb=document.getElementById('lightbox'); if(lb) lb.style.display='none'; }

// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════
//  AD CREATIVE
// ════════════════════════════════════════════════════════
var adData = [];
var adTypeFilter = 'all';
var adStatusFilter = 'all';
var adExpanded = {};
var editingAdId = null;

function renderAdCreativePage() {
  renderAdTiles();
  renderAdStatusPills();
  renderAdList();
}

function renderAdTiles() {
  var defs = [
    { type:'Static',   icon:'&#128444;&#65039;', color:'#EEF2FF', border:'#C7D2FE' },
    { type:'Video',    icon:'&#127916;',          color:'#FEF3C7', border:'#FDE68A' },
    { type:'Carousel', icon:'&#128288;',          color:'#D1FAE5', border:'#A7F3D0' }
  ];
  var statuses = ['all','backlog','ready','active','paused','completed'];
  var el = document.getElementById('ad-tiles'); if (!el) return;
  var h = '';
  defs.forEach(function(t) {
    var subset = adStatusFilter === 'all'
      ? adData.filter(function(a){ return a.adType === t.type; })
      : adData.filter(function(a){ return a.adType === t.type && a.status === adStatusFilter; });
    var total  = adData.filter(function(a){ return a.adType === t.type; }).length;
    var active = adData.filter(function(a){ return a.adType === t.type && a.status === 'active'; }).length;
    var on = adTypeFilter === t.type.toLowerCase();
    h += '<div onclick="setAdTypeFilter(\'' + t.type.toLowerCase() + '\')"'
      + ' style="flex:1;min-width:140px;background:' + (on ? t.border : t.color) + ';border:2px solid ' + t.border + ';'
      + 'border-radius:14px;padding:18px 20px;cursor:pointer;transition:all .15s;user-select:none">'
      + '<div style="font-size:26px;margin-bottom:8px">' + t.icon + '</div>'
      + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;color:var(--deep);margin-bottom:6px">' + t.type + '</div>'
      + '<div style="display:flex;gap:12px">'
      + '<span style="font-size:12px;color:var(--muted)"><strong style="color:var(--charcoal)">' + total + '</strong> total</span>'
      + '<span style="font-size:12px;color:var(--muted)"><strong style="color:#065F46">' + active + '</strong> active</span>'
      + '</div>'
      + '</div>';
  });
  h += '<div onclick="setAdTypeFilter(\'all\')"'
    + ' style="flex:none;display:flex;align-items:center;justify-content:center;padding:18px 20px;'
    + 'background:' + (adTypeFilter === 'all' ? 'var(--sand)' : 'white') + ';'
    + 'border:2px solid var(--sand);border-radius:14px;cursor:pointer;font-size:12px;font-weight:700;'
    + 'color:var(--muted);letter-spacing:.5px;text-transform:uppercase;user-select:none">All</div>';
  el.innerHTML = h;
}

function renderAdStatusPills() {
  var el = document.getElementById('ad-status-pills'); if (!el) return;
  var opts = [
    { v:'all',       l:'All' },
    { v:'backlog',   l:'Backlog' },
    { v:'ready',     l:'Ready' },
    { v:'active',    l:'Active' },
    { v:'paused',    l:'Paused' },
    { v:'completed', l:'Completed' }
  ];
  el.innerHTML = opts.map(function(o) {
    var on = adStatusFilter === o.v;
    return '<button class="sm-pill' + (on ? ' on' : '') + '" onclick="setAdStatusFilter(\'' + o.v + '\')">' + o.l + '</button>';
  }).join('');
}

function setAdTypeFilter(f) { adTypeFilter = f; renderAdTiles(); renderAdStatusPills(); renderAdList(); }
function setAdStatusFilter(f) { adStatusFilter = f; renderAdTiles(); renderAdStatusPills(); renderAdList(); }

function renderAdList() {
  var el = document.getElementById('ad-list'); if (!el) return;
  var list = adData.filter(function(a) {
    var typeOk   = adTypeFilter === 'all' || a.adType.toLowerCase() === adTypeFilter;
    var statusOk = adStatusFilter === 'all' || a.status === adStatusFilter;
    return typeOk && statusOk;
  });
  if (!list.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:50px 0">No ads here yet.</div>';
    return;
  }
  el.innerHTML = '';
  list.forEach(function(a) { el.appendChild(buildAdCard(a)); });
}

function buildAdCard(a) {
  var isOpen = !!adExpanded[a.id];

  // Status colours
  var stBg  = { backlog:'#F3F4F6', ready:'#FEF3C7', active:'#D1FAE5', paused:'#DBEAFE', completed:'#E0E7FF' }[a.status] || '#F3F4F6';
  var stCol = { backlog:'#6B7280', ready:'#92400E', active:'#065F46', paused:'#1E40AF', completed:'#3730A3' }[a.status] || '#6B7280';
  // Type colours
  var tyBg  = { Static:'#EEF2FF', Video:'#FEF3C7', Carousel:'#D1FAE5' }[a.adType] || '#F3F4F6';
  var tyCol = { Static:'#3730A3', Video:'#92400E', Carousel:'#065F46' }[a.adType] || '#6B7280';
  // Performance colours
  var perfMap = { great:['#D1FAE5','#065F46','&#128293; Great'], good:['#E0E7FF','#3730A3','&#128077; Good'], average:['#FEF3C7','#92400E','&#128528; Average'], poor:['#FEE2E2','#B91C1C','&#128201; Poor'] };
  var perf = a.perfRating ? perfMap[a.perfRating] : null;

  // Creative thumbnail
  var thumbInner = a.creative
    ? '<img src="' + esc(a.creative) + '" style="width:100%;height:100%;object-fit:cover">'
    : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px;color:#BCC0C4">'
      + ({ Static:'&#128444;&#65039;', Video:'&#127916;', Carousel:'&#128288;' }[a.adType] || '&#127916;')
      + '</div>';

  // Stat chips for tile row
  var statChips = '';
  if (a.ctr)         statChips += '<span class="ad-stat-chip">CTR ' + a.ctr + '%</span>';
  if (a.roas)        statChips += '<span class="ad-stat-chip">ROAS ' + a.roas + 'x</span>';
  if (a.cpc)         statChips += '<span class="ad-stat-chip">CPC $' + a.cpc + '</span>';
  if (a.spend)       statChips += '<span class="ad-stat-chip">Spend $' + a.spend + '</span>';
  if (a.reach)       statChips += '<span class="ad-stat-chip">Reach ' + a.reach + '</span>';
  if (a.conversions) statChips += '<span class="ad-stat-chip">Conv. ' + a.conversions + '</span>';

  // Stats panel (expanded)
  var hasStats = a.ctr || a.roas || a.cpc || a.spend || a.reach || a.conversions;
  var statsPanel = '';
  if (hasStats) {
    statsPanel = '<div style="background:var(--warm);border-radius:12px;padding:14px 16px">'
      + '<div style="font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);margin-bottom:12px">&#128202; Performance Stats</div>'
      + '<div style="display:flex;gap:16px;flex-wrap:wrap">';
    [['CTR','ctr','%'],['ROAS','roas','x'],['CPC','cpc','$',true],['Spend','spend','$',true],['Reach','reach',''],['Conversions','conversions','']].forEach(function(s) {
      if (!a[s[1]] && a[s[1]] !== 0) return;
      statsPanel += '<div style="text-align:center;min-width:54px">'
        + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:3px">' + s[0] + '</div>'
        + '<div style="font-size:17px;font-weight:700;color:var(--charcoal)">' + (s[3] ? '$' : '') + a[s[1]] + (s[2] !== '$' ? s[2] : '') + '</div>'
        + '</div>';
    });
    statsPanel += '</div></div>';
  }

  var creativeHtml = a.creative
    ? '<img src="' + esc(a.creative) + '" style="width:100%;height:100%;object-fit:cover">'
    : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:32px;color:#BCC0C4;background:#F0F2F5">&#127916;</div>';

  var card = document.createElement('div');
  card.className = 'ad-card';
  card.innerHTML =

    // ── TILE ROW (always visible) ──
    '<div class="ad-card-hd" onclick="toggleAdExpand(\'' + a.id + '\')">'

    // Thumbnail
    + '<div style="width:62px;height:62px;border-radius:10px;overflow:hidden;background:#F0F2F5;flex-shrink:0">' + thumbInner + '</div>'

    // Info block
    + '<div style="flex:1;min-width:0;padding:2px 0">'
    +   '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:6px">'
    +     '<span style="font-size:14px;font-weight:600;color:var(--charcoal)">' + esc(a.name || 'Untitled Ad') + '</span>'
    +     '<span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:8px;background:' + tyBg + ';color:' + tyCol + '">' + esc(a.adType) + '</span>'
    +     '<span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:8px;background:' + stBg + ';color:' + stCol + '">' + cap(a.status) + '</span>'
    +     (perf ? '<span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:8px;background:' + perf[0] + ';color:' + perf[1] + '">' + perf[2] + '</span>' : '')
    +   '</div>'
    +   (statChips
        ? '<div style="display:flex;gap:6px;flex-wrap:wrap">' + statChips + '</div>'
        : '<div style="font-size:12px;color:var(--muted);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">'
          + esc((a.primaryText || '—').substring(0, 80) + (a.primaryText && a.primaryText.length > 80 ? '…' : ''))
          + '</div>')
    + '</div>'

    // Expand arrow + Mark Used
    + '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">'
    +   (a.status === 'backlog' || a.status === 'ready'
        ? '<button class="fin-row-edit" style="background:#D1FAE5;color:#065F46;border-color:#A7F3D0;white-space:nowrap;font-size:11px" onclick="event.stopPropagation();markAdUsed(\'' + a.id + '\')">Mark Used</button>'
        : '')
    +   '<div class="vid-expand' + (isOpen ? ' open' : '') + '">&#9662;</div>'
    + '</div>'
    + '</div>'

    // ── ACCORDION BODY ──
    + '<div class="vid-body' + (isOpen ? ' open' : '') + '" style="padding:0">'
    +   '<div style="display:flex;gap:28px;padding:20px 24px 24px;flex-wrap:wrap;align-items:flex-start">'

    // Left: Meta ad preview
    +   '<div style="flex:none;width:270px">'
    +     '<div style="background:white;border:1px solid #E4E6EB;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">'
    +       '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px">'
    +         '<div style="width:38px;height:38px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;flex-shrink:0">Y</div>'
    +         '<div><div style="font-weight:700;color:#1C1E21;font-size:13px">Your Szn</div><div style="font-size:11px;color:#65676B">Sponsored &nbsp;&middot;&nbsp; &#127758;</div></div>'
    +         '<div style="margin-left:auto;color:#65676B;font-size:18px;letter-spacing:2px">&#8943;</div>'
    +       '</div>'
    +       '<div style="padding:0 14px 10px;color:#1C1E21;line-height:1.45;font-size:13px">'
    +         esc((a.primaryText || 'Your primary text will appear here\u2026').substring(0, 140))
    +         (a.primaryText && a.primaryText.length > 100 ? '<span style="color:#65676B"> &hellip;See more</span>' : '')
    +       '</div>'
    +       '<div style="width:100%;height:210px;background:#F0F2F5;overflow:hidden">' + creativeHtml + '</div>'
    +       '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#F0F2F5;border-top:1px solid #E4E6EB">'
    +         '<div style="flex:1;min-width:0">'
    +           '<div style="font-size:10px;color:#65676B;text-transform:uppercase;letter-spacing:.4px;margin-bottom:1px">yourszn.com.au</div>'
    +           '<div style="font-weight:700;color:#1C1E21;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">' + esc(a.headline || 'Your Headline Here') + '</div>'
    +           (a.description ? '<div style="font-size:11px;color:#65676B;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">' + esc(a.description) + '</div>' : '')
    +         '</div>'
    +         '<button style="flex-shrink:0;background:#E4E6EB;border:none;border-radius:6px;padding:7px 14px;font-size:13px;font-weight:600;color:#1C1E21;cursor:default;white-space:nowrap">' + esc(a.cta || 'Book Now') + '</button>'
    +       '</div>'
    +     '</div>'
    +   '</div>'

    // Right: copy + stats
    +   '<div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:14px">'
    +     (a.primaryText ? '<div><div class="ad-detail-lbl">Primary Text</div><div class="ad-detail-val">' + esc(a.primaryText) + '</div></div>' : '')
    +     (a.headline    ? '<div><div class="ad-detail-lbl">Headline</div><div class="ad-detail-val">' + esc(a.headline) + '</div></div>' : '')
    +     (a.description ? '<div><div class="ad-detail-lbl">Description</div><div class="ad-detail-val">' + esc(a.description) + '</div></div>' : '')
    +     (a.cta         ? '<div><div class="ad-detail-lbl">CTA</div><div class="ad-detail-val">' + esc(a.cta) + '</div></div>' : '')
    +     (a.targeting   ? '<div><div class="ad-detail-lbl">Audience / Targeting</div><div class="ad-detail-val">' + esc(a.targeting) + '</div></div>' : '')
    +     statsPanel
    +     (a.notes ? '<div style="background:var(--warm);border-radius:10px;padding:12px"><div class="ad-detail-lbl" style="margin-bottom:5px">Notes</div><div class="ad-detail-val">' + esc(a.notes) + '</div></div>' : '')
    +     '<div><button class="btn btns" style="font-size:12px" onclick="openAdModal(\'' + a.id + '\')">Edit</button></div>'
    +   '</div>'
    + '</div>'
    + '</div>';

  return card;
}

function toggleAdExpand(id) { adExpanded[id] = !adExpanded[id]; renderAdList(); }

function markAdUsed(id) {
  var a = adData.find(function(x) { return x.id === id; }); if (!a) return;
  a.status = 'active'; renderAdCreativePage();
}

function openAdModal(id) {
  var a = id ? adData.find(function(x) { return x.id === id; }) : null;
  editingAdId = id || null;
  document.getElementById('adm-heading').textContent  = a ? 'Edit Ad' : 'New Ad';
  document.getElementById('adm-name').value           = a ? a.name || '' : '';
  document.getElementById('adm-type').value           = a ? a.adType || 'Static' : 'Static';
  document.getElementById('adm-status').value         = a ? a.status || 'backlog' : 'backlog';
  document.getElementById('adm-perf').value           = a ? a.perfRating || '' : '';
  document.getElementById('adm-primary').value        = a ? a.primaryText || '' : '';
  document.getElementById('adm-headline').value       = a ? a.headline || '' : '';
  document.getElementById('adm-desc').value           = a ? a.description || '' : '';
  document.getElementById('adm-cta').value            = a ? a.cta || 'Book Now' : 'Book Now';
  document.getElementById('adm-targeting').value      = a ? a.targeting || '' : '';
  document.getElementById('adm-ctr').value            = a ? a.ctr || '' : '';
  document.getElementById('adm-roas').value           = a ? a.roas || '' : '';
  document.getElementById('adm-cpc').value            = a ? a.cpc || '' : '';
  document.getElementById('adm-spend').value          = a ? a.spend || '' : '';
  document.getElementById('adm-reach').value          = a ? a.reach || '' : '';
  document.getElementById('adm-conv').value           = a ? a.conversions || '' : '';
  document.getElementById('adm-notes').value          = a ? a.notes || '' : '';
  document.getElementById('adm-creative-url').value   = a ? a.creative || '' : '';
  var prev = document.getElementById('adm-creative-prev');
  if (prev) { prev.src = a ? a.creative || '' : ''; prev.style.display = (a && a.creative) ? 'block' : 'none'; }
  document.getElementById('adm-del').style.display    = a ? 'inline-block' : 'none';
  document.getElementById('adm-err').textContent      = '';
  document.getElementById('ad-modal').style.display   = 'flex';
}
function closeAdModal() { document.getElementById('ad-modal').style.display = 'none'; }
function saveAd() {
  var name = document.getElementById('adm-name').value.trim();
  if (!name) { document.getElementById('adm-err').textContent = 'Ad name is required.'; return; }
  var prev = document.getElementById('adm-creative-prev');
  var creative = document.getElementById('adm-creative-url').value.trim() || (prev && prev.src && prev.src !== window.location.href ? prev.src : '');
  var obj = {
    id: editingAdId || ('a' + Date.now()),
    name: name, adType: document.getElementById('adm-type').value,
    status: document.getElementById('adm-status').value,
    perfRating: document.getElementById('adm-perf').value,
    primaryText: document.getElementById('adm-primary').value,
    headline: document.getElementById('adm-headline').value,
    description: document.getElementById('adm-desc').value,
    cta: document.getElementById('adm-cta').value,
    targeting: document.getElementById('adm-targeting').value,
    ctr: document.getElementById('adm-ctr').value,
    roas: document.getElementById('adm-roas').value,
    cpc: document.getElementById('adm-cpc').value,
    spend: document.getElementById('adm-spend').value,
    reach: document.getElementById('adm-reach').value,
    conversions: document.getElementById('adm-conv').value,
    notes: document.getElementById('adm-notes').value,
    creative: creative
  };
  var idx = adData.findIndex(function(x) { return x.id === obj.id; });
  if (idx > -1) adData[idx] = obj; else adData.push(obj);
  closeAdModal(); renderAdCreativePage();
}
function deleteAd() {
  if (!editingAdId || !confirm('Delete this ad?')) return;
  adData = adData.filter(function(a) { return a.id !== editingAdId; });
  closeAdModal(); renderAdCreativePage();
}
function handleAdCreativeUpload(input) {
  if (!input.files || !input.files[0]) return;
  var r = new FileReader();
  r.onload = function(e) {
    document.getElementById('adm-creative-url').value = '';
    var prev = document.getElementById('adm-creative-prev');
    if (prev) { prev.src = e.target.result; prev.style.display = 'block'; }
  };
  r.readAsDataURL(input.files[0]);
}


var groupMsgs = [], dmMsgs = {}, activeDmUser = null;
var commsUnread = { group: {}, dm: {} };
// commsUnread.group[user] = count of unseen group msgs
// commsUnread.dm[key][user] = count of unseen DMs

function changeMetaWeek(d) { metaWeekOff += d; renderMetaRotation(); }

function renderMetaRotation() {
  var grid = document.getElementById('meta-rotation-grid'); if (!grid) return;
  var lbl = document.getElementById('meta-week-lbl');
  var today = new Date(); today.setHours(0,0,0,0);
  var dow = today.getDay(); if (dow===0) dow=7;
  var mon = new Date(today); mon.setDate(today.getDate() - (dow-1) + metaWeekOff*7);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var fmtD = function(d) { return d.getDate()+' '+months[d.getMonth()]; };
  var sun = new Date(mon); sun.setDate(mon.getDate()+6);
  if (lbl) lbl.textContent = fmtD(mon)+' \u2013 '+fmtD(sun);
  var days = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  var out = '<div style="display:grid;grid-template-columns:60px repeat(7,1fr);gap:1px;border:1px solid var(--sand);border-radius:12px;overflow:hidden;background:var(--sand)">';
  out += '<div style="background:var(--charcoal);padding:10px 8px"></div>';
  for (var c=0; c<7; c++) {
    var d = new Date(mon); d.setDate(mon.getDate()+c);
    out += '<div style="background:var(--charcoal);color:var(--cream);padding:10px 8px;text-align:center"><div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">'+days[c]+'</div><div style="font-size:11px;margin-top:2px;opacity:.7">'+fmtD(d)+'</div></div>';
  }
  for (var r=0; r<META_ROWS.length; r++) {
    var row = META_ROWS[r];
    out += '<div style="background:var(--warm);padding:10px 8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);writing-mode:vertical-rl;transform:rotate(180deg)">'+row.label+'</div>';
    for (var c=0; c<7; c++) {
      var d = new Date(mon); d.setDate(mon.getDate()+c);
      var slotKey = row.key+':'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      var slot = metaSlots[slotKey];
      out += '<div style="background:white;padding:10px;cursor:pointer;min-height:90px;position:relative;transition:background .15s" data-key="'+slotKey+'" onclick="openMetaSlot(this.dataset.key)" onmouseenter="this.style.background=\'var(--warm)\'" onmouseleave="this.style.background=\'white\'">';
      if (slot && slot.subject) {
        if (slot.assign) out += '<div style="width:20px;height:20px;border-radius:50%;background:'+(ASSIGN_COLORS[slot.assign]||'#C9B99A')+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;margin-bottom:5px">'+slot.assign+'</div>';
        if (slot.vidtype) out += '<div style="font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">'+slot.vidtype+'</div>';
        out += '<div style="font-size:11px;color:var(--charcoal);line-height:1.4;margin-bottom:5px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">'+slot.subject+(slot.part?' \u2014 '+slot.part:'')+'</div>';
        if (slot.status) out += '<span style="font-size:9px;font-weight:700;text-transform:uppercase;padding:2px 7px;border-radius:8px;'+( META_STATUS_STYLES[slot.status]||'')+'">'+( META_STATUS_LABELS[slot.status]||'')+'</span>';
        if (slot.canva) out += '<div style="font-size:10px;margin-top:4px">\u{1F3A8} <a href="'+slot.canva+'" target="_blank" onclick="event.stopPropagation()" style="color:var(--accent);text-decoration:none">Canva</a></div>';
        if (slot.drive) out += '<div style="font-size:10px;margin-top:2px">\u{1F4C2} <a href="'+slot.drive+'" target="_blank" onclick="event.stopPropagation()" style="color:var(--muted);text-decoration:none">Drive</a></div>';
      } else {
        out += '<div style="display:flex;align-items:center;justify-content:center;height:50px;color:var(--tan);font-size:20px">+</div>';
      }
      out += '</div>';
    }
  }
  out += '</div>';
  grid.innerHTML = out;
}

function openMetaSlot(key) {
  var slot = metaSlots[key] || {};
  var parts = key.split(':');
  var rowObj = META_ROWS.find(function(r){return r.key===parts[0];});
  var d = new Date(parts[1]);
  var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var dayLbl = (rowObj?rowObj.label:'') + ' \u2014 ' + dayNames[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()];
  document.getElementById('msm-view-mode').style.display = 'block';
  document.getElementById('msm-edit-mode').style.display = 'none';
  document.getElementById('msm-day-lbl').textContent = dayLbl;
  document.getElementById('msm-title-view').innerHTML = slot.subject ? (slot.subject + (slot.part?' \u2014 '+slot.part:'')) : 'Empty slot \u2014 click Edit to add';
  var badge = document.getElementById('msm-assign-badge');
  badge.textContent = slot.assign || '';
  badge.style.background = ASSIGN_COLORS[slot.assign||''];
  var statusHtml = '';
  if (slot.cat) statusHtml += '<span style="font-size:10px;font-weight:600;text-transform:uppercase;padding:3px 10px;border-radius:10px;background:var(--warm);color:var(--muted);margin-right:6px">'+(slot.cat==='celeb'?'\u2B50 Celeb':'\u{1F464} Client')+'</span>';
  if (slot.vidtype) statusHtml += '<span style="font-size:10px;font-weight:600;text-transform:uppercase;padding:3px 10px;border-radius:10px;background:var(--sand);color:var(--charcoal);margin-right:6px">'+slot.vidtype+'</span>';
  if (slot.status) statusHtml += '<span style="font-size:10px;font-weight:700;text-transform:uppercase;padding:3px 10px;border-radius:10px;'+(META_STATUS_STYLES[slot.status]||'')+'">'+( META_STATUS_LABELS[slot.status]||'')+'</span>';
  document.getElementById('msm-status-view').innerHTML = statusHtml;
  var linksHtml = '';
  if (slot.canva) linksHtml += '<a href="'+slot.canva+'" target="_blank" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--charcoal);background:var(--warm);padding:7px 14px;border-radius:8px;border:1px solid var(--sand);text-decoration:none;margin-right:8px;margin-bottom:8px">\u{1F3A8} Canva File</a>';
  if (slot.drive) linksHtml += '<a href="'+slot.drive+'" target="_blank" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:white;background:var(--charcoal);padding:7px 14px;border-radius:8px;text-decoration:none;margin-bottom:8px">\u{1F4C2} Google Drive</a>';
  document.getElementById('msm-links-view').innerHTML = linksHtml;
  var notesHtml = '';
  if (slot.editor) notesHtml += '<div style="margin-bottom:6px"><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted)">Editor: </span>'+slot.editor+'</div>';
  if (slot.caption) notesHtml += '<div style="margin-bottom:6px"><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted)">Caption</span><div style="margin-top:4px;white-space:pre-wrap;font-size:13px">'+slot.caption+'</div></div>';
  if (slot.cta) notesHtml += '<div style="margin-bottom:6px"><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted)">CTA: </span>'+slot.cta+'</div>';
  if (slot.hashtags) notesHtml += '<div style="margin-bottom:6px;font-size:12px;color:var(--accent)">'+slot.hashtags+'</div>';
  if (slot.dateCompleted) notesHtml += '<div style="font-size:11px;color:var(--muted)">Completed: '+slot.dateCompleted+'</div>';
  if (slot.datePublished) notesHtml += '<div style="font-size:11px;color:var(--muted)">Published: '+slot.datePublished+'</div>';
  document.getElementById('msm-notes-view').innerHTML = notesHtml;
  document.getElementById('meta-slot-modal').style.display = 'flex';
}

function switchMetaToEdit() {
  var slot = metaSlots[currentMetaKey] || {};
  document.getElementById('msm-view-mode').style.display = 'none';
  document.getElementById('msm-edit-mode').style.display = 'block';
  var catClient = document.getElementById('msm-cat-client');
  var catCeleb  = document.getElementById('msm-cat-celeb');
  if (catClient) catClient.checked = slot.cat !== 'celeb';
  if (catCeleb)  catCeleb.checked  = slot.cat === 'celeb';
  document.getElementById('msm-subject').value        = slot.subject || '';
  document.getElementById('msm-vidtype').value        = slot.vidtype || 'Reel';
  document.getElementById('msm-part').value           = slot.part    || '';
  document.getElementById('msm-editor').value         = slot.editor  || '';
  document.getElementById('msm-caption').value        = slot.caption || '';
  document.getElementById('msm-cta').value            = slot.cta     || '';
  document.getElementById('msm-hashtags').value       = slot.hashtags|| '#colouranalysis #yourszn';
  document.getElementById('msm-status').value         = slot.status  || 'todo';
  document.getElementById('msm-assign').value         = slot.assign  || '';
  document.getElementById('msm-canva').value          = slot.canva   || '';
  document.getElementById('msm-drive').value          = slot.drive   || '';
  document.getElementById('msm-date-completed').value = slot.dateCompleted || '';
  document.getElementById('msm-date-published').value = slot.datePublished || '';
}

var currentMetaKey = null;
var _origOpenMetaSlot = openMetaSlot;
openMetaSlot = function(key) { currentMetaKey = key; _origOpenMetaSlot(key); };

function switchMetaToView() {
  document.getElementById('msm-edit-mode').style.display = 'none';
  document.getElementById('msm-view-mode').style.display = 'block';
}

function saveMetaSlot() {
  if (!currentMetaKey) return;
  var catCeleb = document.getElementById('msm-cat-celeb');
  metaSlots[currentMetaKey] = {
    cat:           catCeleb && catCeleb.checked ? 'celeb' : 'client',
    subject:       document.getElementById('msm-subject').value.trim(),
    vidtype:       document.getElementById('msm-vidtype').value,
    part:          document.getElementById('msm-part').value.trim(),
    editor:        document.getElementById('msm-editor').value,
    caption:       document.getElementById('msm-caption').value.trim(),
    cta:           document.getElementById('msm-cta').value.trim(),
    hashtags:      document.getElementById('msm-hashtags').value.trim(),
    status:        document.getElementById('msm-status').value,
    assign:        document.getElementById('msm-assign').value,
    canva:         document.getElementById('msm-canva').value.trim(),
    drive:         document.getElementById('msm-drive').value.trim(),
    dateCompleted: document.getElementById('msm-date-completed').value,
    datePublished: document.getElementById('msm-date-published').value
  };
  saveData(); closeMetaSlotModal(); renderMetaRotation();
}

function clearMetaSlot() {
  if (currentMetaKey) { delete metaSlots[currentMetaKey]; saveData(); }
  closeMetaSlotModal(); renderMetaRotation();
}

function closeMetaSlotModal() {
  document.getElementById('meta-slot-modal').style.display = 'none';
  currentMetaKey = null;
}

// ══ CELEB TRACKER ══
var celebData = [], celebEditId = null, celebTab = 'todo';

function filterAdStatus(s) {
  adStatusFilter = s;
  renderAdStatusPills();
  renderAdList();
}

function renderAdStatusPills() {
  var el = document.getElementById('ad-status-filters'); if (!el) return;
  var statuses = ['all','backlog','ready','active','paused','completed'];
  var labels   = ['All','Backlog','Ready','Active','Paused','Completed'];
  el.innerHTML = statuses.map(function(s,i){
    var on = adStatusFilter===s;
    return '<button onclick="filterAdStatus(\''+s+'\')" class="sm-pill'+(on?' on':'')+'" style="font-size:11px">'+labels[i]+'</button>';
  }).join('');
}

// ══ LOCALST0RAGE PERSISTENCE ══

function openPlannerVidModal(key, v, slot, dayLabel, rowLabel) {
  var catLabels = {client:'Client', founder:'Founder', trend:'Trend', bts:'Behind the Scenes', educational:'Educational', celeb:'Celeb'};
  var platEmoji = {ig:'📸', tt:'🎵', yt:'▶️', pi:'📌'};
  var m = document.getElementById('planner-vid-modal');
  if (!m) return;

  document.getElementById('pvm-day').textContent    = dayLabel + ' \u2014 ' + rowLabel;
  document.getElementById('pvm-title').textContent  = (v.client||'Untitled') + (v.part?' \u00b7 '+v.part:'');
  document.getElementById('pvm-type').textContent   = (v.type||'Reel') + (v.editor ? ' \u00b7 ' + v.editor.charAt(0).toUpperCase()+v.editor.slice(1) : '');
  document.getElementById('pvm-cat').textContent    = catLabels[v.vidCat] || v.vidCat || '';

  var statusEl = document.getElementById('pvm-status');
  statusEl.textContent = (v.pubStatus||'editing').charAt(0).toUpperCase()+(v.pubStatus||'editing').slice(1);
  statusEl.className = 'vid-status '+(v.pubStatus||'editing');

  var thumbEl = document.getElementById('pvm-thumb');
  if (v.thumb && v.thumb.length > 10) {
    thumbEl.src = v.thumb; thumbEl.style.display = 'block';
  } else { thumbEl.style.display = 'none'; }

  document.getElementById('pvm-caption').textContent  = v.caption  || '—';
  document.getElementById('pvm-cta').textContent      = v.cta      || '—';
  document.getElementById('pvm-hashtags').textContent = v.hashtags || '—';
  document.getElementById('pvm-notes').textContent    = v.notes    || '';

  // Platform schedule
  var platHtml = '';
  if (v.platforms) {
    [{p:'ig',e:'📸',l:'Instagram'},{p:'tt',e:'🎵',l:'TikTok'},{p:'yt',e:'▶️',l:'YouTube'},{p:'pi',e:'📌',l:'Pinterest'}].forEach(function(pl) {
      if (v.platforms[pl.p]) {
        var timeStr = v.times && v.times[pl.p] ? ' at ' + formatTime12(v.times[pl.p]) : '';
        platHtml += '<div style="background:var(--warm);border-radius:8px;padding:6px 12px;font-size:12px;margin-bottom:6px">'
          + pl.e + ' <strong>' + pl.l + '</strong> \u00b7 ' + v.platforms[pl.p] + timeStr + '</div>';
      }
    });
  }
  document.getElementById('pvm-platforms').innerHTML = platHtml || '<span style="color:var(--muted);font-size:12px">No platforms scheduled</span>';

  var linkEl = document.getElementById('pvm-link');
  if (v.driveLink) { linkEl.href = v.driveLink; linkEl.style.display = 'inline-flex'; }
  else { linkEl.style.display = 'none'; }

  document.getElementById('pvm-edit-btn').onclick = function() {
    closePlannerVidModal(); openVidModal(v.id);
  };

  m.style.display = 'flex';
  m._key = key;
}

function formatTime12(t) {
  if (!t) return '';
  var parts = t.split(':');
  var h = parseInt(parts[0],10);
  var m = parts[1]||'00';
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m + ' ' + ampm;
}

function closePlannerVidModal() {
  var m = document.getElementById('planner-vid-modal');
  if (m) m.style.display = 'none';
}

function openManualSlotModal(key, slot, dayLabel, rowLabel) {
  var parts = key ? key.split(':') : [];
  currentSlotKey = key;
  document.getElementById('slot-modal-title').textContent = (dayLabel||'') + (rowLabel ? ' \u2014 '+rowLabel : '');
  document.getElementById('slot-assign').value   = slot&&slot.assign   || '';
  document.getElementById('slot-posttype').value = slot&&slot.posttype || 'Reel';
  document.getElementById('slot-pillar').value   = slot&&slot.pillar   || '';
  document.getElementById('slot-topic').value    = slot&&slot.topic    || '';
  document.getElementById('slot-caption').value  = slot&&slot.caption  || '';
  document.getElementById('slot-cta').value      = slot&&slot.cta      || '';
  document.getElementById('slot-canva').value    = slot&&slot.canva    || '';
  document.getElementById('slot-status').value   = slot&&slot.status   || 'idea';
  document.getElementById('slot-img-url').value  = slot&&slot.img      || '';
  var prev = document.getElementById('slot-img-preview');
  var prevImg = document.getElementById('slot-img-preview-img');
  if (slot&&slot.img) { prevImg.src=slot.img; prev.style.display='block'; }
  else { prev.style.display='none'; }
  var m = document.getElementById('slot-modal');
  if (m) m.style.display = 'flex';
}

// ══════════════════════════════════════════════════
// REPORT GENERATOR
