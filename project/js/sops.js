// SOPs — standard operating procedures

function togSopForm(){ openSopModal(null); }

function addSop(){ openSopModal(null); }

function delSop(id){ if(!confirm('Delete?'))return; sopList=sopList.filter(function(s){return s.id!==id;}); renderSops(); }
function filtSops(cat,el){ sopFilt=cat; document.querySelectorAll('#sop-filters .fpill').forEach(function(p){p.classList.remove('on');}); el.classList.add('on'); renderSops(); }
function togRev(id){ sopRev[id]=!sopRev[id]; renderSops(); }
function cpClip(txt,btn){ navigator.clipboard.writeText(txt).then(function(){ var o=btn.textContent; btn.textContent='Copied!'; setTimeout(function(){btn.textContent=o;},1500); }); }

// ══ SOP section tab toggle ══
function setSopSection(tab) {
  document.getElementById('sop-sec-sops').style.display      = (tab === 'sops')      ? 'block' : 'none';
  document.getElementById('sop-sec-passwords').style.display = (tab === 'passwords') ? 'block' : 'none';
  document.querySelectorAll('[id^="sop-tab-"]').forEach(function(b){ b.classList.remove('on'); });
  var tb = document.getElementById('sop-tab-' + tab);
  if (tb) tb.classList.add('on');
  if (tab === 'passwords') renderPasswords();
}

// ══ SOP modal ══
function openSopModal(id) {
  _sopEditId = id;
  var s = id ? sopList.find(function(x){ return x.id === id; }) : null;
  document.getElementById('sopm-heading').textContent = s ? 'Edit SOP' : 'New SOP';
  document.getElementById('sopm-title').value  = s ? (s.title  || '') : '';
  document.getElementById('sopm-cat').value    = s ? (s.category || 'Admin') : 'Admin';
  document.getElementById('sopm-notes').value  = s ? (s.notes  || '') : '';
  document.getElementById('sopm-body').value   = s ? (s.body   || '') : '';
  document.getElementById('sopm-docurl').value = s ? (s.docurl || '') : '';
  document.getElementById('sopm-loom').value   = s ? (s.loom   || '') : '';
  document.getElementById('sopm-del').style.display = s ? 'inline-block' : 'none';
  document.getElementById('sopm-err').textContent = '';
  document.getElementById('sop-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('sopm-title').focus(); }, 80);
}
function closeSopModal() {
  document.getElementById('sop-modal').style.display = 'none';
}
function saveSopModal() {
  var title = document.getElementById('sopm-title').value.trim();
  if (!title) { document.getElementById('sopm-err').textContent = 'Title is required.'; return; }
  var obj = {
    id:       _sopEditId || Date.now(),
    title:    title,
    category: document.getElementById('sopm-cat').value,
    notes:    document.getElementById('sopm-notes').value.trim(),
    body:     document.getElementById('sopm-body').value.trim(),
    docurl:   document.getElementById('sopm-docurl').value.trim(),
    loom:     document.getElementById('sopm-loom').value.trim()
  };
  if (_sopEditId) {
    var i = sopList.findIndex(function(x){ return x.id === _sopEditId; });
    if (i > -1) sopList[i] = obj;
  } else {
    sopList.push(obj);
  }
  closeSopModal(); saveData(); renderSops();
}
function deleteSopItem(id) {
  if (!confirm('Delete this SOP?')) return;
  sopList = sopList.filter(function(x){ return x.id !== id; });
  delete sopExpanded[id];
  saveData(); renderSops();
}
function toggleSopExpand(id) {
  sopExpanded[id] = !sopExpanded[id];
  renderSops();
}

// ══ Password modal ══
function openPwModal(id) {
  _pwEditId = id;
  var p = id ? pwList.find(function(x){ return x.id === id; }) : null;
  document.getElementById('pwm-heading').textContent = p ? 'Edit Login' : 'Add Login';
  document.getElementById('pwm-title').value = p ? (p.title    || '') : '';
  document.getElementById('pwm-cat').value   = p ? (p.category || 'Admin') : 'Admin';
  document.getElementById('pwm-url').value   = p ? (p.url      || '') : '';
  document.getElementById('pwm-user').value  = p ? (p.user     || '') : '';
  document.getElementById('pwm-pw').value    = p ? (p.pw       || '') : '';
  document.getElementById('pwm-notes').value = p ? (p.notes    || '') : '';
  document.getElementById('pwm-del').style.display = p ? 'inline-block' : 'none';
  document.getElementById('pwm-err').textContent = '';
  document.getElementById('pw-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('pwm-title').focus(); }, 80);
}
function closePwModal() {
  document.getElementById('pw-modal').style.display = 'none';
}
function savePwModal() {
  var title = document.getElementById('pwm-title').value.trim();
  if (!title) { document.getElementById('pwm-err').textContent = 'Service name is required.'; return; }
  var obj = {
    id:       _pwEditId || Date.now(),
    title:    title,
    category: document.getElementById('pwm-cat').value,
    url:      document.getElementById('pwm-url').value.trim(),
    user:     document.getElementById('pwm-user').value.trim(),
    pw:       document.getElementById('pwm-pw').value,
    notes:    document.getElementById('pwm-notes').value.trim()
  };
  if (_pwEditId) {
    var i = pwList.findIndex(function(x){ return x.id === _pwEditId; });
    if (i > -1) pwList[i] = obj;
  } else {
    pwList.push(obj);
  }
  closePwModal(); saveData(); renderPasswords();
}
function deletePwItem(id) {
  if (!confirm('Delete this login?')) return;
  pwList = pwList.filter(function(x){ return x.id !== id; });
  delete pwRev[id];
  saveData(); renderPasswords();
}
function togglePwReveal(id) {
  pwRev[id] = !pwRev[id];
  renderPasswords();
}

// ══ Render SOPs ══
// old renderSops removed

// ══ Render Passwords ══
function renderPasswords() {
  var grid  = document.getElementById('pw-grid');
  var empty = document.getElementById('pw-empty');
  if (!grid) return;
  if (!pwList || !pwList.length) { grid.innerHTML = ''; if(empty) empty.style.display = 'block'; return; }
  if(empty) empty.style.display = 'none';
  grid.innerHTML = '';
  pwList.forEach(function(p) {
    var revealed = !!(pwRev && pwRev[p.id]);
    var div = document.createElement('div');
    div.className = 'sopcard';
    div.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:10px">'
      + '<div style="flex:1;min-width:0">'
      +   '<div class="sopcat">' + esc(p.category||'') + '</div>'
      +   '<div class="soptit">' + esc(p.title) + '</div>'
      +   (p.notes ? '<div class="sopdesc">' + esc(p.notes) + '</div>' : '')
      + '</div>'
      + '<div style="display:flex;gap:6px;flex-shrink:0">'
      +   '<button class="fin-row-edit" onclick="openPwModal(' + p.id + ')">Edit</button>'
      +   '<button class="fin-row-edit" onclick="deletePwItem(' + p.id + ')" style="color:#EF4444">Del</button>'
      + '</div>'
      + '</div>'
      + (p.url  ? '<div class="sopl"><a href="' + p.url + '" target="_blank" style="font-size:12px;color:var(--rose)">&#128279; ' + p.url.replace('https://','').slice(0,40) + '</a></div>' : '')
      + (p.user ? '<div class="sopl"><span style="font-size:12px;color:var(--charcoal);flex:1">&#128100; ' + esc(p.user) + '</span><button class="sopcopy" onclick="cpClip(\'' + esc(p.user) + '\',this)">Copy</button></div>' : '')
      + (p.pw   ? '<div class="soppw">'
                + '<span style="flex:1;font-family:monospace;letter-spacing:2px">' + (revealed ? esc(p.pw) : '&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;') + '</span>'
                + '<button class="soppwrev" onclick="togglePwReveal(' + p.id + ')">' + (revealed ? 'Hide' : 'Show') + '</button>'
                + '<button class="sopcopy" onclick="cpClip(\'' + esc(p.pw) + '\',this)">Copy</button>'
                + '</div>' : '');
    grid.appendChild(div);
  });
}

function renderSops() {
  var grid  = document.getElementById('sop-grid');
  var empty = document.getElementById('sop-empty');
  if (!grid) return;
  var list = (sopFilt === 'All') ? sopList : sopList.filter(function(s){ return s.category === sopFilt; });
  if (!list.length) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  grid.innerHTML = '';
  list.forEach(function(s) {
    var expanded = !!(sopExpanded && sopExpanded[s.id]);
    var div = document.createElement('div');
    div.className = 'sopcard';
    var links = '';
    if (s.docurl) links += '<a href="' + s.docurl + '" target="_blank" class="sop-lnk-btn">&#128196; Document</a>';
    if (s.loom)   links += '<a href="' + s.loom   + '" target="_blank" class="sop-lnk-btn sop-lnk-loom">&#127916; Loom</a>';
    var bodySection = '';
    if (s.body) {
      bodySection = '<button class="sop-expand-btn" onclick="toggleSopExpand(' + s.id + ')">'
        + (expanded ? '&#9652; Hide procedure' : '&#9662; View full procedure') + '</button>';
      if (expanded) {
        bodySection += '<div class="sop-body-txt">' + esc(s.body).replace(/\n/g, '<br>') + '</div>';
      }
    }
    div.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:10px">'
      + '<div style="flex:1;min-width:0">'
      +   '<div class="sopcat">' + esc(s.category) + '</div>'
      +   '<div class="soptit">' + esc(s.title) + '</div>'
      +   (s.notes ? '<div class="sopdesc">' + esc(s.notes) + '</div>' : '')
      + '</div>'
      + '<div style="display:flex;gap:6px;flex-shrink:0">'
      +   '<button class="fin-row-edit" onclick="openSopModal(' + s.id + ')">Edit</button>'
      +   '<button class="fin-row-edit" onclick="deleteSopItem(' + s.id + ')" style="color:#EF4444">Del</button>'
      + '</div>'
      + '</div>'
      + (links ? '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' + links + '</div>' : '')
      + bodySection;
    grid.appendChild(div);
  });
}

// ── Hue & Stripe Audit ──
var HS_SEASONS=[{name:'Spring',col:'#F59E0B'},{name:'Summer',col:'#60A5FA'},{name:'Autumn',col:'#B45309'},{name:'Winter',col:'#1D4ED8'}];
var HS_CATS=['Clothing','Accessories','Jewellery','Makeup'];
var auditD={};
function renderAudit(){
  var c=document.getElementById('audit-container'); if(!c)return; c.innerHTML='';
  HS_SEASONS.forEach(function(s){
    var block=document.createElement('div'); block.className='asblock';
    var hdr='<div class="asbhead"><div class="asdot" style="background:'+s.col+'"></div><div class="astit">'+s.name+'</div></div>';
    var colhd='<div class="asrow" style="background:var(--warm)"><div class="aslab" style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--muted)">Category</div><div class="ascell"><div class="ascellhd">Last Audited</div></div><div class="ascell"><div class="ascellhd">Notes</div></div><div class="ascell"><div class="ascellhd">Status</div></div></div>';
    block.innerHTML=hdr+colhd;
    HS_CATS.forEach(function(cat){
      var key=s.name+'-'+cat, sv=auditD[key]||{date:'',notes:'',status:'To Audit'};
      var row=document.createElement('div'); row.className='asrow';
      var statOpts=['To Audit','In Progress','Fully Audited','Needs Update'].map(function(o){return '<option'+(o===(sv.status||'To Audit')?' selected':'')+'>'+o+'</option>';}).join('');
      row.innerHTML='<div class="aslab">'+cat+'</div><div class="ascell"><input class="adate" type="date" value="'+(sv.date||'')+'" onchange="saveAudit(\''+key+'\',\'date\',this.value)"></div><div class="ascell"><textarea class="anote" rows="2" placeholder="Notes…" onchange="saveAudit(\''+key+'\',\'notes\',this.value)">'+(sv.notes||'')+'</textarea></div><div class="ascell"><select class="csel" style="width:100%" onchange="saveAudit(\''+key+'\',\'status\',this.value)">'+statOpts+'</select></div>';
      block.appendChild(row);
    });
    c.appendChild(block);
  });
}
function saveAudit(k,f,v){ if(!auditD[k])auditD[k]={date:'',notes:'',status:'To Audit'}; auditD[k][f]=v; }

// ── Hue & Stripe Brands ──
var SCOLS={'Spring':'#F59E0B','True Spring':'#F59E0B','Warm Spring':'#FB923C','Light Spring':'#FDE68A','Summer':'#60A5FA','True Summer':'#60A5FA','Cool Summer':'#A78BFA','Light Summer':'#BAE6FD','Autumn':'#92400E','True Autumn':'#B45309','Warm Autumn':'#D97706','Deep Autumn':'#78350F','Winter':'#1E40AF','True Winter':'#1D4ED8','Cool Winter':'#6366F1','Deep Winter':'#1E3A5F'};
var TCLS={'Clothing':'bt-cl','Jewellery':'bt-je','Makeup':'bt-mk','Accessories':'bt-ac','Shoes':'bt-sh','Bags':'bt-bg','Gym':'bt-misc','Formal':'bt-misc','Suiting':'bt-misc','Casual':'bt-misc','Swim':'bt-misc','All':'bt-misc','Animal Cruelty Free':'bt-cf','Clean Beauty':'bt-cb','Both':'bt-bo'};
var brands=[
  {id:1,name:'Witchery',url:'https://witchery.com.au',cats:['Clothing'],tags:['Casual','Formal'],season:'True Autumn',notes:'Consistently strong for Deep/True Autumn.',date:'2025-01-01'},
  {id:2,name:'Country Road',url:'https://countryroad.com.au',cats:['Clothing'],tags:['Casual','All'],season:'',notes:'Neutral basics, linen separates.',date:'2025-02-01'},
  {id:3,name:'Zara',url:'https://zara.com',cats:['Clothing'],tags:['Casual','Formal'],season:'',notes:'Structured blazers, tailored trousers.',date:'2025-03-01'},
  {id:4,name:'Danessa Myricks Beauty',url:'https://danessamyricksbeauty.com/collections/shop-all',cats:['Makeup'],tags:['Animal Cruelty Free'],season:'',notes:'',date:'2025-01-01'},
  {id:5,name:'Tarte Cosmetics',url:'https://tartecosmetics.com/',cats:['Makeup'],tags:['Animal Cruelty Free'],season:'',notes:'',date:'2025-01-01'},
  {id:6,name:'Huda Beauty',url:'https://www.sephora.com.au/brands/huda-beauty?q=HUDA+BEAUTY',cats:['Makeup'],tags:['Animal Cruelty Free'],season:'',notes:'',date:'2025-01-01'},
  {id:7,name:'One/Size',url:'https://www.sephora.com.au/brands/one-size',cats:['Makeup'],tags:['Animal Cruelty Free'],season:'',notes:'',date:'2025-01-01'},
  {id:8,name:'Urban Decay',url:'https://www.urbandecay.com/',cats:['Makeup'],tags:['Animal Cruelty Free'],season:'',notes:'',date:'2025-01-01'},
  {id:9,name:'Nudestix',url:'https://www.sephora.com.au/brands/nudestix',cats:['Makeup'],tags:['Both'],season:'',notes:'',date:'2025-01-01'},
  {id:10,name:'Hung Vango',url:'https://hungvanngobeauty.com/collections/shop-all',cats:['Makeup'],tags:['Animal Cruelty Free'],season:'',notes:'',date:'2025-01-01'},
  {id:11,name:'Milk Makeup',url:'https://milkmakeup.com/collections/makeup',cats:['Makeup'],tags:['Both'],season:'',notes:'',date:'2025-01-01'},
  {id:12,name:'Haus Labs',url:'https://www.hauslabs.com/collections/shop-all',cats:['Makeup'],tags:['Animal Cruelty Free'],season:'',notes:'',date:'2025-01-01'},
  {id:13,name:'Tower 28',url:'https://www.tower28beauty.com/',cats:['Makeup'],tags:['Animal Cruelty Free'],season:'',notes:'',date:'2025-01-01'},
  {id:14,name:'Violette FR',url:'https://www.violettefr.com/',cats:['Makeup'],tags:['Animal Cruelty Free'],season:'',notes:'',date:'2025-01-01'},
  {id:15,name:'Westman Atelier',url:'https://www.westman-atelier.com/en-au/collections/makeup',cats:['Makeup'],tags:['Animal Cruelty Free'],season:'',notes:'',date:'2025-01-01'},
  {id:16,name:'Kosas',url:'https://kosas.com/',cats:['Makeup'],tags:['Animal Cruelty Free'],season:'',notes:'',date:'2025-01-01'},
  {id:17,name:'Sephora Collection',url:'https://www.sephora.com.au/brands/sephora-collection',cats:['Makeup'],tags:['Clean Beauty'],season:'',notes:'',date:'2025-01-01'},
  {id:18,name:'Lawless',url:'https://lawlessbeauty.com/',cats:['Makeup'],tags:['Both'],season:'',notes:'',date:'2025-01-01'},
  {id:19,name:'Saie Beauty',url:'https://saiehello.com/collections/all-products',cats:['Makeup'],tags:['Both'],season:'',notes:'',date:'2025-01-01'}
];
var bFilt='All', editBId=null;
function setBF(f,el){ bFilt=f; document.querySelectorAll('#bfpills .fpill').forEach(function(p){p.classList.remove('on');}); el.classList.add('on'); renderBrands(); }
function renderBrands(){
  var grid=document.getElementById('brand-grid'), empty=document.getElementById('brand-empty'); if(!grid)return;
  var srch=(document.getElementById('brand-search')?document.getElementById('brand-search').value:'').toLowerCase();
  var f=brands.filter(function(b){
    var all=(b.cats||[]).concat(b.tags||[]);
    var mf=bFilt==='All'||all.indexOf(bFilt)>-1;
    var ms=!srch||b.name.toLowerCase().indexOf(srch)>-1||all.some(function(t){return t.toLowerCase().indexOf(srch)>-1;});
    return mf&&ms;
  });
  grid.innerHTML=''; if(!f.length){empty.style.display='block';return;} empty.style.display='none';
  f.forEach(function(b){
    var col=SCOLS[b.season]||null;
    var all=(b.cats||[]).concat(b.tags||[]);
    var thtml=all.map(function(t){return '<span class="btag '+(TCLS[t]||'')+'">'+t+'</span>';}).join('');
    var card=document.createElement('div'); card.className='bcard';
    card.innerHTML='<div class="bcardtop"><div class="bname">'+b.name+'</div><button class="bedit" onclick="editBrand('+b.id+')">Edit</button></div>'+(col?'<span class="bsbadge" style="background:'+col+'">'+b.season+'</span>':'')+'<div class="btags">'+thtml+'</div>'+(b.url?'<a class="burl" href="'+b.url+'" target="_blank">🔗 '+b.url.replace('https://','').slice(0,44)+'</a>':'')+(b.notes?'<div class="bnotes">'+b.notes+'</div>':'')+(b.date?'<div class="bdate">Added: '+new Date(b.date).toLocaleDateString('en-AU',{month:'short',year:'numeric'})+'</div>':'');
    grid.appendChild(card);
  });
}
function editBrand(id){
  var b=brands.find(function(x){return x.id===id;}); if(!b)return;
  editBId=id;
  document.getElementById('b-editid').value=id;
  document.getElementById('bform-title').textContent='Edit Brand';
  document.getElementById('b-name').value=b.name||'';
  document.getElementById('b-url').value=b.url||'';
  document.getElementById('b-season').value=b.season||'';
  document.getElementById('b-notes').value=b.notes||'';
  document.getElementById('b-date').value=b.date||'';
  document.querySelectorAll('#b-cats input').forEach(function(cb){cb.checked=(b.cats||[]).indexOf(cb.value)>-1;cb.parentElement.classList.toggle('on',cb.checked);});
  document.querySelectorAll('#b-ctags input').forEach(function(cb){cb.checked=(b.tags||[]).indexOf(cb.value)>-1;cb.parentElement.classList.toggle('on',cb.checked);});
  document.querySelectorAll('#b-mtags input').forEach(function(cb){cb.checked=(b.tags||[]).indexOf(cb.value)>-1;cb.parentElement.classList.toggle('on',cb.checked);});
  showHsTab('add-brand');
}
function saveBrand(){
  var name=document.getElementById('b-name').value.trim(); if(!name){alert('Please enter a brand name.');return;}
  var cats=[].slice.call(document.querySelectorAll('#b-cats input:checked')).map(function(c){return c.value;});
  var tags=[].slice.call(document.querySelectorAll('#b-ctags input:checked')).concat([].slice.call(document.querySelectorAll('#b-mtags input:checked'))).map(function(c){return c.value;});
  var obj={name:name,url:document.getElementById('b-url').value.trim(),cats:cats,tags:tags,season:document.getElementById('b-season').value,notes:document.getElementById('b-notes').value.trim(),date:document.getElementById('b-date').value||new Date().toISOString().slice(0,10)};
  if(editBId){var idx=brands.findIndex(function(x){return x.id===editBId;});if(idx>-1)brands[idx]=Object.assign({},brands[idx],obj);editBId=null;}
  else brands.push(Object.assign({id:Date.now()},obj));
  document.getElementById('b-name').value='';document.getElementById('b-url').value='';document.getElementById('b-notes').value='';document.getElementById('b-date').value='';
  document.getElementById('bform-title').textContent='Add Brand';document.getElementById('b-editid').value='';
  document.querySelectorAll('#hs-add-brand input[type=checkbox]').forEach(function(cb){cb.checked=false;cb.parentElement.classList.remove('on');});
  renderBrands(); showHsTab('brands');
}

// ── Watchlist ──
var watchlist=[];
function togWatchForm(){ var f=document.getElementById('watch-form'); f.style.display=f.style.display==='flex'?'none':'flex'; }
function saveWatch(){
  var name=document.getElementById('wname').value.trim(); if(!name)return;
  watchlist.push({id:Date.now(),name:name,note:document.getElementById('wnote').value.trim()});
  document.getElementById('wname').value='';document.getElementById('wnote').value='';
  document.getElementById('watch-form').style.display='none';
  renderWatchlist();
  if(document.getElementById('task-board')) renderTaskBoard();
  if(document.getElementById('staff-board')) renderStaffBoard();
}
function delWatch(id){ watchlist=watchlist.filter(function(w){return w.id!==id;}); renderWatchlist(); }
function promWatch(id){
  var w=watchlist.find(function(x){return x.id===id;}); if(!w)return;
  document.getElementById('b-name').value=w.name;
  document.getElementById('b-notes').value=w.note||'';
  document.getElementById('bform-title').textContent='Add Brand'; editBId=null;
  showHsTab('add-brand');
}
function renderWatchlist(){
  var c=document.getElementById('watch-list'),empty=document.getElementById('watch-empty'); if(!c)return;
  c.innerHTML=''; if(!watchlist.length){empty.style.display='block';return;} empty.style.display='none';
  watchlist.forEach(function(w){
    var div=document.createElement('div'); div.className='witem';
    div.innerHTML='<div class="wname">'+w.name+'</div><div class="wnote">'+(w.note||'—')+'</div><button class="wprom" onclick="promWatch('+w.id+')">→ Add to Library</button><button class="wdel" onclick="delWatch('+w.id+')">×</button>';
    c.appendChild(div);
  });
}

// ── Hue & Stripe tab switching ──
function showHsTab(tab){
  var map={'audit':0,'brands':1,'watchlist':2,'add-brand':3};
  document.querySelectorAll('.hstab').forEach(function(t,i){t.classList.toggle('on',i===map[tab]);});
  document.querySelectorAll('.hspanel').forEach(function(p){p.classList.remove('on');});
  var ids={'audit':'hs-audit','brands':'hs-brands','watchlist':'hs-watchlist','add-brand':'hs-add-brand'};
  var panel=document.getElementById(ids[tab]); if(panel)panel.classList.add('on');
}

// ── Tag checkbox interactivity ──
document.addEventListener('change', function(e){
  if (e.target && e.target.type==='checkbox' && e.target.closest('.tcb')) {
    e.target.closest('.tcb').classList.toggle('on', e.target.checked);
  }
});


// ════════════════════════════════════════════════════════
// TOURS
// ════════════════════════════════════════════════════════
var tourTaskIdSeq = 100;
var editingTourId = null;
var tours = [
  { id:'t1', city:'Cairns', state:'QLD', status:'upcoming',
    travelDateStart:'2026-03-05', travelDateEnd:'2026-03-10',
    clientDateStart:'2026-03-06', clientDateEnd:'2026-03-09',
    flights:[
      {id:'f1',airline:'Qantas',flightNo:'QF123',dep:'BNE 06:00',arr:'CNS 09:15',cost:320},
      {id:'f2',airline:'Qantas',flightNo:'QF124',dep:'CNS 17:00',arr:'BNE 20:10',cost:310}
    ],
    accommodation:{name:'Crystalbrook Riley',address:'131-141 The Esplanade, Cairns',checkin:'2026-03-05',checkout:'2026-03-10',cost:890},
    bookings:{standard:8,premium:3,standardRate:349,premiumRate:445},
    activeTab:'flights',
    isOpen:false,
    tasks:[
      {id:'tt1',text:'Book flights',status:'done',notes:''},
      {id:'tt2',text:'Book hotel',status:'done',notes:''},
      {id:'tt3',text:'Confirm venue',status:'todo',notes:''},
      {id:'tt4',text:'Send reminder emails to clients',status:'todo',notes:''},
      {id:'tt5',text:'Pack drapes and kit',status:'todo',notes:''}
    ]
  }
];
