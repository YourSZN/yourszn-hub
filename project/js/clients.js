// Clients — client table and management

function clearClients() {
  if (!confirm('Clear all 30 slots?')) return;
  for (var ci=0;ci<30;ci++) cRows[ci]={name:'',day:'',date:'',type:'',con:'',atts:[],inv:'',notes:''};
  renderClients();
}

function clearClientRow(i) {
  cRows[i] = {name:'',day:'',date:'',type:'',con:'',atts:[],inv:'',notes:''};
  renderClients();
}
function renderClients() {
  var tb = document.getElementById('ctbody'); if (!tb) return;
  tb.innerHTML = '';
  for (var ci=0;ci<30;ci++) tb.appendChild(makeClientRow(ci));
  updCSummary();
  renderClientContrast();
}

// ── CLIENT PAGE CONTRAST WIDGET ──
var clientContrastTags = {
  skin: { label:'SKIN', val:5, x:0, y:0,   col:'#E05555' },
  hair: { label:'HAIR', val:3, x:0, y:40,  col:'#5578E0' },
  eyes: { label:'EYES', val:7, x:0, y:80,  col:'#42A85F' }
};
var clientContrastDragKey = null, clientContrastDragOX = 0, clientContrastDragOY = 0;
var clientContrastPhoto = null;

function cctLoadPhoto(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    clientContrastPhoto = ev.target.result;
    renderClientContrast();
  };
  reader.readAsDataURL(file);
}
function cctClearPhoto() {
  clientContrastPhoto = null;
  var inp = document.getElementById('cct-photo-input');
  if (inp) inp.value = '';
  renderClientContrast();
}

function renderClientContrast() {
  var preview = document.getElementById('client-contrast-preview');
  var controls = document.getElementById('client-contrast-controls');
  if (!preview || !controls) return;

  // Photo — use this widget's own uploaded photo
  var photoHtml = clientContrastPhoto
    ? '<img src="'+clientContrastPhoto+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;filter:grayscale(100%);display:block;">'
    : '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted);gap:8px"><div style=\'font-size:32px\'>&#128247;</div><div style=\'font-size:13px\'>Upload a photo above</div></div>';

  var clip = 'polygon(0% 0%, 100% 0%, 100% 20%, 75% 20%, 75% 80%, 100% 80%, 100% 100%, 0% 100%)';
  var greyVals = typeof GREY_VALS !== 'undefined' ? GREY_VALS : [
    {bg:'#111'},{bg:'#222'},{bg:'#333'},{bg:'#444'},{bg:'#555'},
    {bg:'#777'},{bg:'#888'},{bg:'#999'},{bg:'#bbb'},{bg:'#ddd'}
  ];

  // Build tag HTML
  var tagHtml = Object.keys(clientContrastTags).map(function(key) {
    var t = clientContrastTags[key];
    var greyBg = greyVals[t.val - 1].bg;
    var numCol = t.val > 6 ? '#333' : '#fff';
    return '<div id="cct-tag-'+key+'" style="position:absolute;left:'+t.x+'px;top:'+t.y+'px;z-index:10;cursor:move;user-select:none;touch-action:none;display:flex;align-items:center;gap:5px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.35))"'
      +' onmousedown="cctDragStart(event,\''+key+'\')" ontouchstart="cctTouchStart(event,\''+key+'\')">'
      +'<span style="font-size:8px;font-weight:800;color:'+t.col+';letter-spacing:1.5px;text-transform:uppercase;text-shadow:0 1px 3px rgba(0,0,0,0.6);white-space:nowrap;flex-shrink:0">'+t.label+'</span>'
      +'<div id="cct-swatch-'+key+'" style="position:relative;width:80px;height:36px;border-radius:6px 0 0 6px;background:'+greyBg+';clip-path:'+clip+'">'
      +'<div id="cct-num-'+key+'" style="position:absolute;top:50%;left:35%;transform:translate(-50%,-50%);font-size:10px;font-weight:800;color:'+numCol+';pointer-events:none">'+t.val+'</div>'
      +'</div></div>';
  }).join('');

  preview.innerHTML = photoHtml + tagHtml;

  // Build slider controls
  controls.innerHTML = Object.keys(clientContrastTags).map(function(key) {
    var t = clientContrastTags[key];
    var greyBg = greyVals[t.val - 1].bg;
    return '<div style="background:white;border:1px solid var(--sand);border-radius:10px;padding:14px 16px;margin-bottom:10px">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
      +'<div style="width:14px;height:14px;border-radius:50%;background:'+t.col+';flex-shrink:0"></div>'
      +'<div style="font-size:12px;font-weight:600;color:var(--deep)">'+t.label+'</div>'
      +'<div id="cct-ctrl-swatch-'+key+'" style="margin-left:auto;width:32px;height:20px;border-radius:4px;background:'+greyBg+';border:1px solid var(--sand)"></div>'
      +'<div id="cct-ctrl-num-'+key+'" style="font-size:12px;font-weight:700;color:var(--deep);min-width:16px;text-align:right">'+t.val+'</div>'
      +'</div>'
      +'<input type="range" min="1" max="10" value="'+t.val+'" style="width:100%;accent-color:'+t.col+';cursor:pointer" oninput="cctSetVal(\''+key+'\',this.value)">'
      +'<div style="display:flex;justify-content:space-between;margin-top:3px">'
      +'<span style="font-size:9px;color:var(--muted)">Dark 1</span>'
      +'<span style="font-size:9px;color:var(--muted)">Light 10</span>'
      +'</div></div>';
  }).join('');

  cctUpdateResult();
}

function cctSetVal(key, val) {
  val = parseInt(val);
  clientContrastTags[key].val = val;
  var greyVals = typeof GREY_VALS !== 'undefined' ? GREY_VALS : [
    {bg:'#111'},{bg:'#222'},{bg:'#333'},{bg:'#444'},{bg:'#555'},
    {bg:'#777'},{bg:'#888'},{bg:'#999'},{bg:'#bbb'},{bg:'#ddd'}
  ];
  var greyBg = greyVals[val - 1].bg;
  var numCol = val > 6 ? '#333' : '#fff';
  var sw = document.getElementById('cct-swatch-'+key);
  var nm = document.getElementById('cct-num-'+key);
  var csw = document.getElementById('cct-ctrl-swatch-'+key);
  var cnm = document.getElementById('cct-ctrl-num-'+key);
  if (sw) sw.style.background = greyBg;
  if (nm) { nm.textContent = val; nm.style.color = numCol; }
  if (csw) csw.style.background = greyBg;
  if (cnm) cnm.textContent = val;
  cctUpdateResult();
}

function cctUpdateResult() {
  var vals = Object.keys(clientContrastTags).map(function(k){ return clientContrastTags[k].val; });
  var range = Math.max.apply(null,vals) - Math.min.apply(null,vals);
  var label = range <= 3 ? 'Low Contrast' : range <= 6 ? 'Medium Contrast' : 'High Contrast';
  var t = clientContrastTags;
  var el = document.getElementById('client-contrast-result');
  if (el) el.innerHTML = 'Skin: '+t.skin.val+' · Hair: '+t.hair.val+' · Eyes: '+t.eyes.val+'<br>Range: '+Math.min.apply(null,vals)+'–'+Math.max.apply(null,vals)+' ('+range+' steps) — <strong>'+label+'</strong>';
}

function cctDragStart(e, key) {
  e.preventDefault();
  clientContrastDragKey = key;
  var el = document.getElementById('cct-tag-'+key);
  var prev = document.getElementById('client-contrast-preview');
  if (!el || !prev) return;
  var pr = prev.getBoundingClientRect();
  clientContrastDragOX = e.clientX - pr.left - clientContrastTags[key].x;
  clientContrastDragOY = e.clientY - pr.top - clientContrastTags[key].y;
  document.addEventListener('mousemove', cctDragMove);
  document.addEventListener('mouseup', cctDragEnd);
}
function cctDragMove(e) {
  if (!clientContrastDragKey) return;
  var prev = document.getElementById('client-contrast-preview');
  if (!prev) return;
  var pr = prev.getBoundingClientRect();
  var nx = e.clientX - pr.left - clientContrastDragOX;
  var ny = e.clientY - pr.top - clientContrastDragOY;
  clientContrastTags[clientContrastDragKey].x = nx;
  clientContrastTags[clientContrastDragKey].y = ny;
  var el = document.getElementById('cct-tag-'+clientContrastDragKey);
  if (el) { el.style.left = nx+'px'; el.style.top = ny+'px'; }
}
function cctDragEnd() {
  clientContrastDragKey = null;
  document.removeEventListener('mousemove', cctDragMove);
  document.removeEventListener('mouseup', cctDragEnd);
}
function cctTouchStart(e, key) {
  var touch = e.touches[0];
  clientContrastDragKey = key;
  var prev = document.getElementById('client-contrast-preview');
  if (!prev) return;
  var pr = prev.getBoundingClientRect();
  clientContrastDragOX = touch.clientX - pr.left - clientContrastTags[key].x;
  clientContrastDragOY = touch.clientY - pr.top - clientContrastTags[key].y;
  document.addEventListener('touchmove', cctTouchMove, {passive:false});
  document.addEventListener('touchend', cctDragEnd);
}
function cctTouchMove(e) {
  e.preventDefault();
  if (!clientContrastDragKey) return;
  var touch = e.touches[0];
  var prev = document.getElementById('client-contrast-preview');
  if (!prev) return;
  var pr = prev.getBoundingClientRect();
  var nx = touch.clientX - pr.left - clientContrastDragOX;
  var ny = touch.clientY - pr.top - clientContrastDragOY;
  clientContrastTags[clientContrastDragKey].x = nx;
  clientContrastTags[clientContrastDragKey].y = ny;
  var el = document.getElementById('cct-tag-'+clientContrastDragKey);
  if (el) { el.style.left = nx+'px'; el.style.top = ny+'px'; }
}
function makeClientRow(i) {
  var d = cRows[i];
  var tr = document.createElement('tr');
  tr.setAttribute('draggable','true');
  (function(idx,row){
    row.addEventListener('dragstart',function(){dragFrom=idx;row.classList.add('dragging');});
    row.addEventListener('dragend',function(){row.classList.remove('dragging');});
    row.addEventListener('dragover',function(e){e.preventDefault();row.classList.add('dragover');});
    row.addEventListener('dragleave',function(){row.classList.remove('dragover');});
    row.addEventListener('drop',function(e){
      e.preventDefault();row.classList.remove('dragover');
      if(dragFrom===null||dragFrom===idx)return;
      var m=cRows.splice(dragFrom,1)[0];cRows.splice(idx,0,m);dragFrom=null;renderClients();
    });
  })(i,tr);
  var dayOpts = CDAYS_OPT.map(function(v){return '<option'+(v===(d.day||'—')?' selected':'')+'>'+v+'</option>';}).join('');
  var typeOpts = ATYPES.map(function(v){return '<option'+(v===(d.type||'—')?' selected':'')+' style="'+atypeColor(v)+'">'+v+'</option>';}).join('');
  var conOpts = CONS.map(function(v){return '<option'+(v===(d.con||'—')?' selected':'')+'>'+v+'</option>';}).join('');
  var invOpts = INVS.map(function(v){return '<option'+(v===(d.inv||'—')?' selected':'')+'>'+v+'</option>';}).join('');
  tr.innerHTML =
    '<td><span class="drag-h" title="Drag to reorder">&#8942;</span></td>'+
    '<td style="text-align:center;color:var(--muted);font-size:11px">'+(i+1)+'</td>'+
    '<td><input class="ci" placeholder="Name" value="'+(d.name||'')+'" onchange="cf('+i+',\'name\',this.value)"></td>'+
    '<td><select class="csel" onchange="cf('+i+',\'day\',this.value)">'+dayOpts+'</select></td>'+
    '<td><input class="ci" type="date" value="'+(d.date||'')+'" onchange="cf('+i+',\'date\',this.value)" style="min-width:115px"></td>'+
    '<td><select class="csel" style="'+atypeColor(d.type||'')+'" onchange="cfType('+i+',this)">'+typeOpts+'</select></td>'+
    '<td><select class="csel" onchange="cf('+i+',\'con\',this.value)">'+conOpts+'</select></td>'+
    '<td><div id="aw-'+i+'"></div><button class="addatt" onclick="addAtt('+i+')">+ Add attendee</button></td>'+
    '<td><select class="csel" onchange="cf('+i+',\'inv\',this.value)">'+invOpts+'</select></td>'+
    '<td><input class="ci" placeholder="Notes..." value="'+(d.notes||'')+'" onchange="cf('+i+',\'notes\',this.value)"></td>'+
    '<td><button class="client-clear-btn" onclick="clearClientRow('+i+')" title="Clear row">&#10005;</button></td>';
  var wrap = tr.querySelector('#aw-'+i);
  (d.atts||[]).forEach(function(a,ai){wrap.appendChild(mkAttRow(i,ai,a.name,a.con));});
  return tr;
}
function cfType(i,sel){cRows[i].type=sel.value;sel.style=atypeColor(sel.value);updCSummary();}
function cf(i,f,v){cRows[i][f]=v;updCSummary();}
function addAtt(i){cRows[i].atts.push({name:'',con:'—'});renderClients();}
function mkAttRow(ri,ai,name,con){
  var div=document.createElement('div');div.className='attrow';
  var cOpts=CONS.map(function(c){return '<option'+(c===(con||'—')?' selected':'')+'>'+c+'</option>';}).join('');
  div.innerHTML='<input class="ci" placeholder="Name" value="'+(name||'')+'" style="min-width:75px" onchange="sa('+ri+','+ai+',\'name\',this.value)"><select class="csel" onchange="sa('+ri+','+ai+',\'con\',this.value)">'+cOpts+'</select><button class="rematt" onclick="remAtt('+ri+','+ai+')">x</button>';
  return div;
}
function sa(ri,ai,f,v){if(cRows[ri].atts[ai])cRows[ri].atts[ai][f]=v;}
function remAtt(ri,ai){cRows[ri].atts.splice(ai,1);renderClients();}
function updCSummary(){
  var t=0,inv=0,v=0,p=0;
  cRows.forEach(function(r){
    if(r.name&&r.name.trim()){t++;if(r.inv==='Yes')inv++;else if(r.inv==='Voucher')v++;else if(r.inv==='No')p++;}
  });
  function s(id,n){var el=document.getElementById(id);if(el)el.textContent=n;}
  s('cs-tot',t);s('cs-inv',inv);s('cs-vou',v);s('cs-pen',p);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TASK SYSTEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var tasks = [
  {id:1,title:'Finalise corporate pricing structure',assignedTo:'latisha',category:'Admin',freq:'one-off',due:'',priority:'red',hrsAllowed:2,hrsTaken:0,status:'not-started',desc:'Research competitor rates and set final corporate package pricing.',videoUrl:'',fileUrl:'',notes:''},
  {id:2,title:'Build ManyChat COLOUR funnel',assignedTo:'latisha',category:'Marketing',freq:'one-off',due:'',priority:'orange',hrsAllowed:4,hrsTaken:0,status:'in-progress',desc:'Set up the comment trigger, DM sequence and booking link.',videoUrl:'',fileUrl:'',notes:''},
  {id:3,title:'Edit and schedule reels — 2 weeks',assignedTo:'lemari',category:'Content',freq:'weekly',due:'Friday',priority:'orange',hrsAllowed:8,hrsTaken:0,status:'not-started',desc:'Edit all raw footage from filming days. Schedule 3-5 reels per week across IG and TikTok.',videoUrl:'',fileUrl:'',notes:''},
  {id:4,title:'Client inbox — respond to all enquiries',assignedTo:'salma',category:'Customer Support',freq:'daily',due:'',priority:'red',hrsAllowed:1,hrsTaken:0,status:'not-started',desc:'Check and reply to all new enquiries in the client inbox. Escalate anything urgent to Latisha.',videoUrl:'',fileUrl:'',notes:''},
  {id:5,title:'Collect Vietnam client deposit data',assignedTo:'salma',category:'Admin',freq:'one-off',due:'',priority:'orange',hrsAllowed:3,hrsTaken:0,status:'not-started',desc:'Follow up all clients who have expressed interest and log deposit status.',videoUrl:'',fileUrl:'',notes:''},
  {id:6,title:'Check and update social media links',assignedTo:'salma',category:'Links',freq:'weekly',due:'Monday',priority:'green',hrsAllowed:0.5,hrsTaken:0,status:'not-started',desc:'Verify all bio links, Linktree and website buttons are working and pointing to current offers.',videoUrl:'',fileUrl:'',notes:''}
];
var taskIdSeq = 10;
var taskWeekOff = 0;
var taskFilt = 'all';
var staffWeekOff = 0;
var staffFilt = 'all';
var editingTaskId = null;
var editingStaffTaskId = null;

var UCOLORS = {latisha:'#C4956A',salma:'#C49A8A',lemari:'#7A8C6E'};
var UINIT = {latisha:'L',salma:'S',lemari:'L'};
