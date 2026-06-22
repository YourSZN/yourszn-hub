// Core app — data persistence and navigation

function launchApp() {
  loadData();
  var u = USERS[curUser];
  var ls = document.getElementById('login-screen');
  ls.classList.add('hide');
  setTimeout(function(){ ls.style.display='none'; }, 500);
  document.getElementById('app').style.display = 'flex';
  document.getElementById('uname-display').textContent = u.name + ' · ' + u.role;
  var d = new Date();
  var h = d.getHours();
  // Only update dash-date / dash-greet for Latisha (staff don't see that page)
  if (curUser === 'latisha') {
    document.getElementById('dash-date').textContent = d.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    document.getElementById('dash-greet').textContent = 'Good ' + (h<12?'morning':h<17?'afternoon':'evening') + ', ' + u.name;
  }
  buildNav(u.pages);
  updateTaskBadge();
  commsNavBadge();
  showPage(u.pages[0]);
  renderClients();
  renderSops();
  renderAudit();
  renderBrands();
  renderWatchlist();
  renderTaskBoard();
  renderToursPage();
  renderSocialPage();
  renderAdCreativePage();
  renderGoals();
  renderFinances();
  if (curUser === 'latisha') {
    renderStaffPage();
    renderDashTaskProgress();
  } else {
    renderMyHub();
  }
}

function buildNav(allowed) {
  var nav = document.getElementById('snav');
  nav.innerHTML = '';
  var lastSec = null;
  NAV.forEach(function(item) {
    if (allowed.indexOf(item.id) === -1) return;
    if (item.sec && item.sec !== lastSec) {
      var lbl = document.createElement('div');
      lbl.className = 'nsec'; lbl.textContent = item.sec;
      nav.appendChild(lbl); lastSec = item.sec;
    }
    var btn = document.createElement('div');
    btn.className = 'nitem'; btn.id = 'n-'+item.id;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'+item.icon+'</svg>'+item.lbl;
    if (item.id==='comms') {
      var bdg = document.createElement('span');
      bdg.id = 'n-comms-badge';
      bdg.style.cssText = 'display:none;background:var(--deep);color:#F9F5F0;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:700;margin-left:auto;min-width:18px;text-align:center;';
      bdg.textContent = '0';
      btn.appendChild(bdg);
    }
    btn.onclick = (function(id){ return function(){ showPage(id); }; })(item.id);
    nav.appendChild(btn);
  });
}
function showPage(id) {
  if (id==='vietnam') renderVietnamTour();
  if (id==='sops') { renderSops(); renderPasswords(); }
  if (id==='vouchers') renderVoucherTab();
  if (id==='online') renderOca();
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('on'); });
  document.querySelectorAll('.nitem').forEach(function(n){ n.classList.remove('on'); });
  var pg = document.getElementById('pg-'+id);
  var ni = document.getElementById('n-'+id);
  if (pg) pg.classList.add('on');
  if (ni) ni.classList.add('on');
  if (id === 'comms')  { renderCommsPage(); }
  if (id === 'social') { renderSocialPage(); }
  if (id === 'adcreative') { renderAdCreativePage(); }
  if (id === 'tasks') {
    // Render banners so user SEES them — don't mark seen yet
    renderNewTaskBanner();
    renderCompletedBanner();
  }
}
function doLogout() {
  curUser = selUid = null; pin = '';
  document.getElementById('app').style.display = 'none';
  var ls = document.getElementById('login-screen');
  ls.style.display = 'flex'; ls.classList.remove('hide');
  document.getElementById('step-pin').style.display = 'none';
  document.getElementById('step-user').style.display = 'block';
  updDots();
}
document.addEventListener('keydown', function(e) {
  if (!selUid) return;
  if (e.key >= '0' && e.key <= '9') pk(e.key);
  if (e.key === 'Backspace') pdel();
});

// ── Dashboard legacy task toggles ──
function togTask(item) {
  var c = item.querySelector('.tck'), t = item.querySelector('.ttx');
  if (!c||!t) return;
  c.classList.toggle('done'); t.classList.toggle('done');
  var u = document.querySelectorAll('#dash-todos .tck:not(.done)').length;
  var b = document.getElementById('todo-ct'); if(b) b.textContent = u;
}

// ── Clients ──
var ATYPES = ['—','1:1 Standard','1:2 Standard','1:3 Standard','1:4 Standard','1:1 Premium','1:2 Premium','1:3 Premium','1:4 Premium','Call Out'];
var CDAYS_OPT = ['—','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
var CONS = ['—','Low','Low/Med','Med','Med/High','High'];
var INVS = ['—','Yes','No','Voucher'];
var cRows = [];
for (var ci=0;ci<30;ci++) cRows.push({name:'',day:'',date:'',type:'',con:'',atts:[],inv:'',notes:''});
var dragFrom = null;

function getData(uid) {
  if (!staffData[uid]) staffData[uid]={todos:[],goals:[],diary:'',recurDays:{}};
  return staffData[uid];
}
function getMyData() { return getData(curUser); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ──────────────────────────────────────────────
// PAGE ROUTER
// ──────────────────────────────────────────────
function exportData() {
  var payload = JSON.stringify({
    _v:'yszn_v1', _date: new Date().toISOString(),
    cRows:cRows, tours:tours, tasks:tasks, taskNotifs:taskNotifs,
    vidData:vidData, adData:adData, goals:goals,
    bizIncome:bizIncome, bizExpenses:bizExpenses, personalExpenses:personalExpenses,
    sopList:sopList, brands:brands, watchlist:watchlist,
    socialSlots:socialSlots, metaSlots:metaSlots, metaSchedData:metaSchedData, celebData:celebData,
    groupMsgs:groupMsgs, dmMsgs:dmMsgs, auditD:auditD, commsUnread:commsUnread, vtData:vtData, pwList:pwList, mktData:mktData, ideaList:ideaList, creatorsList:creatorsList
  }, null, 2);
  var blob = new Blob([payload], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'yourszn-data-' + new Date().toISOString().slice(0,10) + '.json';
  a.click(); URL.revokeObjectURL(a.href);
}

function importData(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var d = JSON.parse(e.target.result);
      if (d.cRows)             cRows             = d.cRows;
      if (d.tours)             tours             = d.tours;
      if (d.tasks)             tasks             = d.tasks;
      if (d.taskNotifs)        taskNotifs        = d.taskNotifs;
      if (d.vidData)           vidData           = d.vidData;
      if (d.adData)            adData            = d.adData;
      if (d.goals)             goals             = d.goals;
      if (d.bizIncome)         bizIncome         = d.bizIncome;
      if (d.bizExpenses)       bizExpenses       = d.bizExpenses;
      if (d.personalExpenses)  personalExpenses  = d.personalExpenses;
      if (d.sopList)           sopList           = d.sopList;
      if (d.brands)            brands            = d.brands;
      if (d.watchlist)         watchlist         = d.watchlist;
      if (d.socialSlots)       socialSlots       = d.socialSlots;
      if (d.metaSlots)         metaSlots         = d.metaSlots;
      if (d.metaSchedData)     metaSchedData     = d.metaSchedData;
      if (d.celebData)         celebData         = d.celebData;
      if (d.groupMsgs)         groupMsgs         = d.groupMsgs;
      if (d.dmMsgs)            dmMsgs            = d.dmMsgs;
      if (d.auditD)            auditD            = d.auditD;
      if (d.commsUnread)       commsUnread       = d.commsUnread;
      saveData();
      renderClients(); renderSops(); renderAudit(); renderBrands(); renderWatchlist();
      renderTaskBoard(); renderToursPage(); renderSocialPage(); renderAdCreativePage();
      renderGoals(); renderFinances();
      if (curUser==='latisha') { renderStaffPage(); renderDashTaskProgress(); } else { renderMyHub(); }
      alert('Data imported successfully!');
    } catch(err) { alert('Import failed: ' + err.message); }
  };
  reader.readAsText(file);
}


function saveData() {
  try {
    var strip = function(o) { if (!o) return o; var c = Object.assign({}, o); delete c.thumb; return c; };
    // Main payload without thumbnails (keeps well under 5MB)
    localStorage.setItem('yszn_v1', JSON.stringify({
      cRows:cRows, tours:tours, tasks:tasks, taskNotifs:taskNotifs,
      vidData: vidData.map(strip), adData:adData, goals:goals,
      bizIncome:bizIncome, bizExpenses:bizExpenses, personalExpenses:personalExpenses,
      sopList:sopList, brands:brands, watchlist:watchlist,
      socialSlots: (function(){ var o={}; Object.keys(socialSlots).forEach(function(k){ o[k]=strip(socialSlots[k]); }); return o; })(),
      metaSlots:metaSlots,
      metaSchedData: (function(){ var o={}; Object.keys(metaSchedData).forEach(function(k){ o[k]=strip(metaSchedData[k]); }); return o; })(),
      celebData: celebData.map(function(c){ var cc=strip(c); if(cc.videos) cc.videos=cc.videos.map(strip); return cc; }),
      groupMsgs:groupMsgs, dmMsgs:dmMsgs, auditD:auditD, commsUnread:commsUnread
    }));
    // Thumbnails stored separately, keyed by entity id
    var thumbs = {};
    vidData.forEach(function(v){ if (v.thumb && v.thumb.length>10) thumbs['v:'+v.id] = v.thumb; });
    celebData.forEach(function(c){ if (c.videos) c.videos.forEach(function(v){ if (v.thumb && v.thumb.length>10) thumbs['cv:'+v.id]=v.thumb; }); });
    Object.keys(socialSlots).forEach(function(k){ if (socialSlots[k] && socialSlots[k].thumb && socialSlots[k].thumb.length>10) thumbs['sl:'+k]=socialSlots[k].thumb; });
    Object.keys(metaSchedData).forEach(function(k){ if (metaSchedData[k] && metaSchedData[k].thumb && metaSchedData[k].thumb.length>10) thumbs['mrc:'+k]=metaSchedData[k].thumb; });
    try {
      localStorage.setItem('yszn_thumbs', JSON.stringify(thumbs));
    } catch(e2) {
      // If combined thumbs still too large, store each individually
      Object.keys(thumbs).forEach(function(tk){
        try { localStorage.setItem('yszn_t_'+tk.replace(/[^a-zA-Z0-9_]/g,'_'), thumbs[tk]); } catch(e3){}
      });
    }
  } catch(e) { console.warn('saveData error:', e); }
}

function loadData() {
  try {
    var raw = localStorage.getItem('yszn_v1'); if (!raw) return;
    var d = JSON.parse(raw);
    if (d.cRows)             cRows             = d.cRows;
    if (d.tours)             tours             = d.tours;
    if (d.tasks)             tasks             = d.tasks;
    if (d.taskNotifs)        taskNotifs        = d.taskNotifs;
    if (d.vidData)           vidData           = d.vidData;
    if (d.adData)            adData            = d.adData;
    if (d.goals)             goals             = d.goals;
    if (d.bizIncome)         bizIncome         = d.bizIncome;
    if (d.bizExpenses)       bizExpenses       = d.bizExpenses;
    if (d.personalExpenses)  personalExpenses  = d.personalExpenses;
    if (d.sopList)           sopList           = d.sopList;
    if (d.brands)            brands            = d.brands;
    if (d.watchlist)         watchlist         = d.watchlist;
    if (d.socialSlots)       socialSlots       = d.socialSlots;
    if (d.metaSlots)         metaSlots         = d.metaSlots;
    if (d.metaSchedData)     metaSchedData     = d.metaSchedData;
    if (d.celebData)         celebData         = d.celebData;
    if (d.groupMsgs)         groupMsgs         = d.groupMsgs;
    if (d.dmMsgs)            dmMsgs            = d.dmMsgs;
    if (d.auditD)            auditD            = d.auditD;
    if (d.commsUnread)       commsUnread       = d.commsUnread;
    // Restore thumbnails from separate storage
    var thumbs = {};
    try { var tr=localStorage.getItem('yszn_thumbs'); if(tr) thumbs=JSON.parse(tr); } catch(e2){}
    // Also pick up any individually stored thumbs
    for (var i=0; i<localStorage.length; i++) {
      var tk=localStorage.key(i);
      if (tk && tk.indexOf('yszn_t_')===0) thumbs[tk.slice(7)] = localStorage.getItem(tk);
    }
    vidData.forEach(function(v){ if (thumbs['v:'+v.id]) v.thumb=thumbs['v:'+v.id]; });
    celebData.forEach(function(c){ if(c.videos) c.videos.forEach(function(v){ if(thumbs['cv:'+v.id]) v.thumb=thumbs['cv:'+v.id]; }); });
    Object.keys(socialSlots).forEach(function(k){ if(thumbs['sl:'+k]) socialSlots[k].thumb=thumbs['sl:'+k]; });
    Object.keys(metaSchedData).forEach(function(k){ if(thumbs['mrc:'+k]) metaSchedData[k].thumb=thumbs['mrc:'+k]; });
  } catch(e) { console.warn('loadData error:', e); }
}

// ── META Rotation Schedule cell editing ──
