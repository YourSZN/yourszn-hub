// Dashboard — owner and staff hub pages

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

function atypeColor(v) {
  if (!v||v==='—') return '';
  if (v.indexOf('Premium')>-1) return 'color:#7C3AED;font-weight:500';
  if (v.indexOf('Call')>-1) return 'color:#059669;font-weight:500';
  return 'color:#C4956A;font-weight:500';
}
function buildDashHTML(uid) {
  var data=getData(uid);
  var isSelf=(uid===curUser);
  var p='pd'+uid;  // prefix for element IDs

  // ── Progress bar ──
  var mt=tasksForWeek(0).filter(function(t){return t.assignedTo===uid;});
  var tot=mt.length;
  var dn=mt.filter(function(t){return t.status==='done';}).length;
  var ip=mt.filter(function(t){return t.status==='in-progress'||t.status==='waiting';}).length;
  var ns=tot-dn-ip;
  var pct=tot>0?Math.round(dn/tot*100):0;
  var pw=function(n){return tot>0?(n/tot*100).toFixed(1)+'%':'0%';};
  var progressH=
    '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">'+
    '<span style="font-weight:500;color:var(--deep)">'+pct+'% complete this week</span>'+
    '<span style="color:var(--muted)">'+dn+' of '+tot+' tasks done</span></div>'+
    '<div class="tp-track" style="height:12px;border-radius:8px">'+
    (dn>0?'<div class="tp-seg-green" style="width:'+pw(dn)+'"></div>':'')+
    (ip>0?'<div class="tp-seg-orange" style="width:'+pw(ip)+'"></div>':'')+
    (ns>0?'<div class="tp-seg-red" style="width:'+pw(ns)+'"></div>':'')+
    '</div>'+
    '<div class="tp-legend" style="margin-top:8px">'+
    '<div class="tp-leg"><div class="tp-dot" style="background:#22C55E"></div>Done ('+dn+')</div>'+
    '<div class="tp-leg"><div class="tp-dot" style="background:#F97316"></div>In Progress ('+ip+')</div>'+
    '<div class="tp-leg"><div class="tp-dot" style="background:#EF4444"></div>Not Started ('+ns+')</div></div>';

  // ── Recurring tasks with day chips ──
  var DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var recur=tasksForWeek(0).filter(function(t){return t.assignedTo===uid&&(t.freq==='daily'||t.freq==='weekly');});
  var recurH='';
  if(!recur.length){
    recurH='<div style="color:var(--muted);font-size:13px;padding:6px 0">No recurring tasks this week.</div>';
  } else {
    recur.forEach(function(t){
      var days=data.recurDays[t.id]||[];
      var chips=DAYS.map(function(d){
        var on=days.indexOf(d)>-1;
        return '<span class="day-chip'+(on?' done':'')+'" data-uid="'+uid+'" data-tid="'+t.id+'" data-day="'+d+'">'+d+'</span>';
      }).join('');
      recurH+='<div class="rtask-row">'+
        '<div class="rtask-title">'+esc(t.title)+'</div>'+
        '<div class="rtask-days">'+chips+'</div>'+
        '</div>';
    });
  }

  // ── Priority To-Dos (checkable) ──
  var pendingTodos=data.todos.filter(function(x){return !x.done;}).length;
  var todosH='';
  if(!data.todos.length){
    todosH='<div style="color:var(--muted);font-size:13px;padding:6px 0">No to-dos yet.</div>';
  } else {
    data.todos.forEach(function(item,idx){
      todosH+='<div class="staff-todo-item" onclick="togTodo(\''+uid+'\','+idx+')">'+
        '<div class="stck'+(item.done?' done':'')+'"></div>'+
        '<div class="stck-txt'+(item.done?' done':'')+'">'+esc(item.text)+'</div>'+
        '</div>';
    });
  }
  var todoBadge=pendingTodos>0?'<span style="background:var(--accent);color:white;border-radius:10px;padding:1px 6px;font-size:9px;margin-left:6px;vertical-align:middle">'+pendingTodos+'</span>':'';

  // ── Personal Goals (checkable) ──
  var goalsH='';
  if(!data.goals.length){
    goalsH='<div style="color:var(--muted);font-size:13px;padding:6px 0">No goals yet.</div>';
  } else {
    data.goals.forEach(function(g,idx){
      goalsH+='<div class="sgoal-item" onclick="togGoal(\''+uid+'\','+idx+')">'+
        '<div class="sgoal-ck'+(g.done?' done':'')+'"></div>'+
        '<div class="sgoal-txt'+(g.done?' done':'')+'">'+esc(g.text)+'</div>'+
        '</div>';
    });
  }

  // ── Notes to Self ──
  var diaryH=isSelf
    ?'<textarea class="fi" id="'+p+'diary" rows="5" placeholder="Private diary… only you can see this." style="resize:vertical;width:100%;font-size:12px" oninput="saveDiary(\''+uid+'\')">'+esc(data.diary||'')+'</textarea>'+
      '<div style="font-size:10px;color:var(--muted);margin-top:4px">Auto-saved · private <span id="'+p+'dsaved" style="color:var(--green)"></span></div>'
    :'<div style="font-size:12px;color:var(--muted);font-style:italic;padding:6px 0">Private</div>';

  // ── Add inputs (self only) ──
  var todoAddH=isSelf
    ?'<div style="display:flex;gap:6px;margin-top:8px">'+
      '<input class="fi" id="'+p+'todoinp" placeholder="Add to-do…" style="flex:1;font-size:12px" onkeydown="if(event.key===\'Enter\')addTodo(\''+uid+'\')">'+
      '<button class="btn btnp" style="font-size:11px;padding:5px 10px" onclick="addTodo(\''+uid+'\')">Add</button></div>':''
  var goalAddH=isSelf
    ?'<div style="display:flex;gap:6px;margin-top:8px">'+
      '<input class="fi" id="'+p+'goalinp" placeholder="Add goal…" style="flex:1;font-size:12px" onkeydown="if(event.key===\'Enter\')addGoal(\''+uid+'\')">'+
      '<button class="btn btnp" style="font-size:11px;padding:5px 10px" onclick="addGoal(\''+uid+'\')">Add</button></div>':''

  var secHd=function(t){ return '<div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);margin-bottom:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--warm)">'+t+'</div>'; };

  return '<div id="'+p+'dash" style="padding:4px 0">'+
    secHd('Task Progress — This Week')+progressH+
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:4px">'+
      '<div>'+
        secHd('Weekly Recurring Tasks')+
        '<div id="'+p+'recur">'+recurH+'</div>'+
      '</div>'+
      '<div>'+
        secHd('Priority To-Dos '+todoBadge)+
        '<div id="'+p+'todos">'+todosH+'</div>'+
        todoAddH+
      '</div>'+
      '<div>'+
        secHd('Personal Work Goals')+
        '<div id="'+p+'goals">'+goalsH+'</div>'+
        goalAddH+
        secHd('Notes to Self')+
        diaryH+
      '</div>'+
    '</div>'+
    '</div>';
}

// Bind day-chip clicks after HTML is in DOM
function bindDash(uid) {
  document.querySelectorAll('[data-uid="'+uid+'"].day-chip').forEach(function(chip){
    chip.onclick=function(){
      var tid=parseInt(chip.getAttribute('data-tid'));
      var day=chip.getAttribute('data-day');
      var data=getData(uid);
      if(!data.recurDays[tid]) data.recurDays[tid]=[];
      var arr=data.recurDays[tid];
      var i=arr.indexOf(day);
      if(i>-1) arr.splice(i,1); else arr.push(day);
      chip.classList.toggle('done', arr.indexOf(day)>-1);
    };
  });
}

// ──────────────────────────────────────────────
// ACTIONS  (todo / goal / diary)
// ──────────────────────────────────────────────
function togTodo(uid,idx){
  var d=getData(uid); if(!d.todos[idx]) return;
  d.todos[idx].done=!d.todos[idx].done;
  redrawDash(uid);
}
function addTodo(uid){
  var p='pd'+uid;
  var inp=document.getElementById(p+'todoinp'); if(!inp||!inp.value.trim()) return;
  getData(uid).todos.push({text:inp.value.trim(),done:false}); inp.value='';
  redrawDash(uid);
}
function togGoal(uid,idx){
  var d=getData(uid); if(!d.goals[idx]) return;
  d.goals[idx].done=!d.goals[idx].done;
  redrawDash(uid);
}
function addGoal(uid){
  var p='pd'+uid;
  var inp=document.getElementById(p+'goalinp'); if(!inp||!inp.value.trim()) return;
  getData(uid).goals.push({text:inp.value.trim(),done:false}); inp.value='';
  redrawDash(uid);
}
var diaryTimers={};
function saveDiary(uid){
  if(diaryTimers[uid]) clearTimeout(diaryTimers[uid]);
  diaryTimers[uid]=setTimeout(function(){
    var p='pd'+uid;
    var ta=document.getElementById(p+'diary'); if(ta) getData(uid).diary=ta.value;
    var lbl=document.getElementById(p+'dsaved');
    if(lbl){lbl.textContent='Saved';setTimeout(function(){lbl.textContent='';},2000);}
  },800);
}
function autoSaveDiary(){ saveDiary(curUser); }

// Redraw the dash content in whichever container is currently showing it
function redrawDash(uid){
  // Owner accordion
  var body=document.getElementById('smbody-'+uid);
  if(body&&body.classList.contains('open')){ body.innerHTML=buildDashHTML(uid); bindDash(uid); }
  // Staff personal view
  var myDash=document.getElementById('staff-my-dash');
  if(myDash&&curUser===uid){ myDash.innerHTML=buildDashHTML(uid); bindDash(uid); }
  // Latisha's main dashboard progress card
  renderDashTaskProgress();
  // Update owner accordion header mini-bar
  var card=document.getElementById('scard-'+uid);
  if(card&&(!body||!body.classList.contains('open'))){
    var newCard=makeStaffCard(uid,true);
    card.replaceWith(newCard);
  }
}

// ──────────────────────────────────────────────
// STAFF PERSONAL VIEW  — team section (restricted)
// ──────────────────────────────────────────────
function renderTeamSection(){
  var grid=document.getElementById('staff-team-cards'); if(!grid) return;
  grid.innerHTML='';
  ['salma','lemari'].forEach(function(uid){
    if(uid===curUser) return;
    var u=USERS[uid];
    if(grantedAccess[curUser]){
      // Full view (read-only — can see their dashboard, not edit it)
      grid.appendChild(makeStaffCard(uid,false));
    } else {
      var div=document.createElement('div'); div.className='team-locked-card';
      div.innerHTML=
        '<div class="smcard-av2" style="background:'+(UCOLORS[uid]||'#9E8B7A')+';width:40px;height:40px;font-size:16px;flex-shrink:0">'+UINIT[uid]+'</div>'+
        '<div style="flex:1">'+
          '<div style="font-family:\'Cormorant Garamond\',serif;font-size:18px;color:var(--deep)">'+u.name+'</div>'+
          '<div style="font-size:11px;color:var(--muted)">'+u.role+'</div>'+
          '<div style="font-size:12px;color:var(--muted);font-style:italic;margin-top:3px">Tasks are private · request access to view</div>'+
        '</div>'+
        '<div style="font-size:22px;color:var(--tan)">&#128274;</div>';
      grid.appendChild(div);
    }
  });
}

// ──────────────────────────────────────────────
// ACCESS REQUESTS
// ──────────────────────────────────────────────
function renderAccessRequests(){
  var list=document.getElementById('access-req-list');
  var badge=document.getElementById('access-req-count');
  if(!list) return;
  var pending=accessRequests.filter(function(r){return !r.resolved;});
  if(badge) badge.textContent=pending.length;
  if(!pending.length){list.innerHTML='<div style="color:var(--muted);font-size:13px;padding:8px 0">No pending requests.</div>';return;}
  list.innerHTML='';
  pending.forEach(function(r){
    var row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--warm);font-size:13px;';
    row.innerHTML='<div style="flex:1"><strong>'+USERS[r.from].name+'</strong> has requested team access.<br>'+
      '<span style="font-size:11px;color:var(--muted)">'+r.ts+'</span></div>'+
      '<button class="btn btnp" style="font-size:11px;padding:5px 12px" onclick="approveAccess('+r.id+',\''+r.from+'\')">Approve</button>'+
      '<button class="btn btns" style="font-size:11px;padding:5px 12px" onclick="denyAccess('+r.id+')">Deny</button>';
    list.appendChild(row);
  });
}
function requestStaffAccess(){
  if(curUser==='latisha') return;
  var already=accessRequests.find(function(r){return r.from===curUser&&!r.resolved;});
  if(already){alert('Your request is already pending. Latisha will review it.');return;}
  var ts=new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'})+' '+new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'});
  accessRequests.push({id:Date.now(),from:curUser,ts:ts,resolved:false});
  alert('Request sent to Latisha.');
}
function approveAccess(id,uid){
  var r=accessRequests.find(function(x){return x.id===id;}); if(r) r.resolved=true;
  grantedAccess[uid]=true;
  renderAccessRequests(); renderOwnerCards();
}
function denyAccess(id){
  var r=accessRequests.find(function(x){return x.id===id;}); if(r) r.resolved=true;
  renderAccessRequests();
}

// ──────────────────────────────────────────────
// LATISHA DASHBOARD  — team progress bars
// ──────────────────────────────────────────────
function renderDashTaskProgress(){
  var el=document.getElementById('dash-task-progress'); if(!el) return;
  var wt=tasksForWeek(0); var html='';
  ['salma','lemari'].forEach(function(uid){
    var u=USERS[uid]; var mt=wt.filter(function(t){return t.assignedTo===uid;});
    var tot=mt.length;
    if(!tot){html+='<div class="tp-row"><div class="tp-label"><span class="tp-name">'+u.name+'</span><span class="tp-counts">No tasks this week</span></div><div class="tp-track"></div></div>';return;}
    var dn=mt.filter(function(t){return t.status==='done';}).length;
    var ip=mt.filter(function(t){return t.status==='in-progress'||t.status==='waiting';}).length;
    var ns=tot-dn-ip;
    var pw=function(n){return (n/tot*100).toFixed(1)+'%';};
    html+='<div class="tp-row"><div class="tp-label"><span class="tp-name">'+u.name+'</span><span class="tp-counts">'+dn+'/'+tot+' done</span></div>'+
      '<div class="tp-track">'+(dn>0?'<div class="tp-seg-green" style="width:'+pw(dn)+'"></div>':'')+
      (ip>0?'<div class="tp-seg-orange" style="width:'+pw(ip)+'"></div>':'')+
      (ns>0?'<div class="tp-seg-red" style="width:'+pw(ns)+'"></div>':'')+'</div></div>';
  });
  var all=wt.filter(function(t){return t.assignedTo!=='latisha';}); var tot2=all.length;
  if(tot2>0){
    var dn2=all.filter(function(t){return t.status==='done';}).length;
    var ip2=all.filter(function(t){return t.status==='in-progress'||t.status==='waiting';}).length;
    var ns2=tot2-dn2-ip2;
    var pw2=function(n){return (n/tot2*100).toFixed(1)+'%';};
    html+='<div style="border-top:1px solid var(--warm);padding-top:12px;margin-top:4px">'+
      '<div class="tp-row"><div class="tp-label"><span style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted)">Overall Team</span><span class="tp-counts">'+dn2+'/'+tot2+'</span></div>'+
      '<div class="tp-track" style="height:14px">'+(dn2>0?'<div class="tp-seg-green" style="width:'+pw2(dn2)+'"></div>':'')+
      (ip2>0?'<div class="tp-seg-orange" style="width:'+pw2(ip2)+'"></div>':'')+
      (ns2>0?'<div class="tp-seg-red" style="width:'+pw2(ns2)+'"></div>':'')+'</div></div></div>';
  }
  html+='<div class="tp-legend"><div class="tp-leg"><div class="tp-dot" style="background:#22C55E"></div>Done</div>'+
    '<div class="tp-leg"><div class="tp-dot" style="background:#F97316"></div>In Progress</div>'+
    '<div class="tp-leg"><div class="tp-dot" style="background:#EF4444"></div>Not Started</div></div>';
  el.innerHTML=html;
  var upd=document.getElementById('dash-task-updated');
  if(upd) upd.textContent='Updated '+new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'});
}

function renderStaffDashboard(){ renderStaffPage(); }


// ── Staff task modal ──
function openStaffModal(id) {
  var t=tasks.find(function(x){return x.id===id;}); if(!t) return;
  editingStaffTaskId=id;
  document.getElementById('smodal-id').value=id;
  document.getElementById('smodal-title').textContent=t.title;
  document.getElementById('smodal-cat').textContent=(t.category||'')+' \u00b7 '+cap(t.freq||'');
  var prioColors={red:'#EF4444',orange:'#F97316',green:'#22C55E'};
  var prioLabels={red:'High Priority',orange:'Medium Priority',green:'Low Priority'};
  var prioBadge=document.getElementById('smodal-prio-badge');
  if(prioBadge){ prioBadge.textContent=prioLabels[t.priority||'green']||''; prioBadge.style.color=prioColors[t.priority||'green']||'#22C55E'; }
  document.getElementById('smodal-desc').textContent=t.desc||'No instructions provided.';
  var links='';
  if(t.videoUrl) links+='<a href="'+t.videoUrl+'" target="_blank" class="btn btns" style="font-size:12px">&#9654; Training Video</a>';
  if(t.fileUrl) links+='<a href="'+t.fileUrl+'" target="_blank" class="btn btns" style="font-size:12px">&#128206; File / Resource</a>';
  document.getElementById('smodal-links').innerHTML=links;
  document.getElementById('smodal-status').value=t.status||'not-started';
  document.getElementById('smodal-hrs').value=t.hrsTaken||'';
  document.getElementById('smodal-notes').value=t.staffNotes||'';
  document.getElementById('staff-modal').style.display='flex';
}
function closeStaffModal(){document.getElementById('staff-modal').style.display='none';}
function saveStaffTask() {
  var t=tasks.find(function(x){return x.id===editingStaffTaskId;}); if(!t) return;
  t.status=document.getElementById('smodal-status').value;
  t.hrsTaken=parseFloat(document.getElementById('smodal-hrs').value)||0;
  t.staffNotes=document.getElementById('smodal-notes').value;
  closeStaffModal();
  renderStaffDashboard();
  if(curUser==='latisha') renderDashTaskProgress();
}
function requestTaskDeletion() {
  var t=tasks.find(function(x){return x.id===editingStaffTaskId;}); if(!t) return;
  t.status='blocked';
  t.staffNotes=(t.staffNotes?t.staffNotes+'\n':'')+'[Removal requested by '+USERS[curUser].name+']';
  alert('Removal request sent to Latisha.');
  closeStaffModal(); renderStaffDashboard();
}


// ══════════════════════════════════════════════════════════════
// MY HUB  — staff personal dashboard page (Salma & Lemari)
// ══════════════════════════════════════════════════════════════
var myhubDiaryTimer = null;

function renderMyHub() {
  var uid = curUser;
  var data = getData(uid);
  var d = new Date();
  var h = d.getHours();

  // Greeting + date
  var greet = document.getElementById('myhub-greet');
  if (greet) greet.textContent = 'Good ' + (h<12?'morning':h<17?'afternoon':'evening') + ', ' + USERS[uid].name;
  var dt = document.getElementById('myhub-date');
  if (dt) dt.textContent = d.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  // Stat cards
  var myTasks = tasksForWeek(0).filter(function(t){ return t.assignedTo===uid; });
  var tot = myTasks.length;
  var dn  = myTasks.filter(function(t){ return t.status==='done'; }).length;
  var ip  = myTasks.filter(function(t){ return t.status==='in-progress'||t.status==='waiting'; }).length;
  var ns  = tot - dn - ip;
  function setEl(id, v){ var el=document.getElementById(id); if(el) el.textContent=v; }
  setEl('myhub-total', tot);
  setEl('myhub-done',  dn);
  setEl('myhub-ip',    ip);
  setEl('myhub-ns',    ns);

  // Progress bar
  var prog = document.getElementById('myhub-progress');
  if (prog) {
    var pct = tot>0 ? Math.round(dn/tot*100) : 0;
    var pw = function(n){ return tot>0 ? (n/tot*100).toFixed(1)+'%' : '0%'; };
    prog.innerHTML =
      '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">'+
      '<span style="font-weight:500;color:var(--deep)">'+pct+'% complete</span>'+
      '<span style="color:var(--muted)">'+dn+' of '+tot+' tasks done this week</span></div>'+
      '<div class="tp-track" style="height:14px;border-radius:8px">'+
      (dn>0?'<div class="tp-seg-green" style="width:'+pw(dn)+'"></div>':'')+
      (ip>0?'<div class="tp-seg-orange" style="width:'+pw(ip)+'"></div>':'')+
      (ns>0?'<div class="tp-seg-red" style="width:'+pw(ns)+'"></div>':'')+
      '</div>'+
      '<div class="tp-legend" style="margin-top:10px">'+
      '<div class="tp-leg"><div class="tp-dot" style="background:#22C55E"></div>Complete ('+dn+')</div>'+
      '<div class="tp-leg"><div class="tp-dot" style="background:#F97316"></div>In Progress ('+ip+')</div>'+
      '<div class="tp-leg"><div class="tp-dot" style="background:#EF4444"></div>Not Started ('+ns+')</div></div>';
  }

  // Priority To-Dos
  renderMyhubTodos();

  // Recurring tasks with day chips
  renderMyhubRecur();

  // Goals
  renderMyhubGoals();

  // Diary
  var diary = document.getElementById('myhub-diary');
  if (diary) diary.value = data.diary || '';

  // Team
  renderMyhubTeam();
}

function renderMyhubTodos() {
  var uid = curUser;
  var data = getData(uid);
  var el = document.getElementById('myhub-todos'); if(!el) return;
  var badge = document.getElementById('myhub-todo-badge');
  var pending = data.todos.filter(function(t){ return !t.done; }).length;
  if (badge) badge.textContent = pending || '';
  if (!data.todos.length) {
    el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:6px 0">No to-dos yet. Add one below.</div>';
    return;
  }
  el.innerHTML = '';
  data.todos.forEach(function(item, idx) {
    var div = document.createElement('div');
    div.className = 'slist-item';
    div.onclick = function(){ item.done=!item.done; renderMyhubTodos(); };
    var tag = item.tag ? ('<span class="slist-tag stag-'+(item.tag==='Urgent'?'urgent':'soon')+'">'+item.tag+'</span>') : '';
    div.innerHTML =
      '<div class="slist-circle'+(item.done?' done':'')+'"></div>'+
      '<div class="slist-text'+(item.done?' done':'')+'">'+esc(item.text)+'</div>'+
      tag+
      '<button onclick="event.stopPropagation();myhubDelTodo('+idx+')" style="background:none;border:none;cursor:pointer;color:#C4A882;font-size:16px;padding:0 4px;flex-shrink:0">&#215;</button>';
    el.appendChild(div);
  });
}
function myhubAddTodo() {
  var inp = document.getElementById('myhub-todo-inp'); if(!inp||!inp.value.trim()) return;
  getData(curUser).todos.push({text:inp.value.trim(), done:false}); inp.value='';
  renderMyhubTodos();
}
function myhubDelTodo(idx) {
  getData(curUser).todos.splice(idx,1); renderMyhubTodos();
}

function renderMyhubRecur() {
  var uid = curUser;
  var data = getData(uid);
  var el = document.getElementById('myhub-recur'); if(!el) return;
  var DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var recur = tasksForWeek(0).filter(function(t){ return t.assignedTo===uid && (t.freq==='daily'||t.freq==='weekly'); });
  if (!recur.length) {
    el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:6px 0">No recurring tasks this week.</div>';
    return;
  }
  el.innerHTML = '';
  recur.forEach(function(t) {
    var days = data.recurDays[t.id] || [];
    var row = document.createElement('div'); row.className='rtask-row';
    var chips = DAYS.map(function(d){
      var on = days.indexOf(d) > -1;
      return '<span class="day-chip'+(on?' done':'')+'" data-uid="'+uid+'" data-tid="'+t.id+'" data-day="'+d+'">'+d+'</span>';
    }).join('');
    row.innerHTML =
      '<div class="rtask-title">'+esc(t.title)+
      ' <span class="tcard-status st-'+(t.status||'not-started')+'" style="font-size:9px;vertical-align:middle">'+statusLabel(t.status)+'</span></div>'+
      '<div class="rtask-days" id="mhrd-'+t.id+'">'+chips+'</div>';
    el.appendChild(row);
  });
  // Bind chip clicks
  el.querySelectorAll('.day-chip').forEach(function(chip){
    chip.onclick = function(){
      var tid = parseInt(chip.getAttribute('data-tid'));
      var day = chip.getAttribute('data-day');
      var arr = data.recurDays[tid] || (data.recurDays[tid]=[]);
      var i = arr.indexOf(day);
      if (i>-1) arr.splice(i,1); else arr.push(day);
      chip.classList.toggle('done', arr.indexOf(day)>-1);
    };
  });
}

function renderMyhubGoals() {
  var uid = curUser;
  var data = getData(uid);
  var el = document.getElementById('myhub-goals'); if(!el) return;
  if (!data.goals.length) {
    el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:6px 0">No goals yet. Add one below.</div>';
    return;
  }
  el.innerHTML = '';
  data.goals.forEach(function(g, idx){
    var div = document.createElement('div'); div.className='slist-item';
    div.onclick = function(){ g.done=!g.done; renderMyhubGoals(); };
    div.innerHTML =
      '<div class="slist-circle'+(g.done?' done':'')+'"></div>'+
      '<div class="slist-text'+(g.done?' done':'')+'">'+esc(g.text)+'</div>'+
      '<span class="slist-tag stag-goal">Goal</span>'+
      '<button onclick="event.stopPropagation();myhubDelGoal('+idx+')" style="background:none;border:none;cursor:pointer;color:#C4A882;font-size:16px;padding:0 4px;flex-shrink:0">&#215;</button>';
    el.appendChild(div);
  });
}
function myhubAddGoal() {
  var inp = document.getElementById('myhub-goal-inp'); if(!inp||!inp.value.trim()) return;
  getData(curUser).goals.push({text:inp.value.trim(), done:false}); inp.value='';
  renderMyhubGoals();
}
function myhubDelGoal(idx){
  getData(curUser).goals.splice(idx,1); renderMyhubGoals();
}

function myhubSaveDiary() {
  if (myhubDiaryTimer) clearTimeout(myhubDiaryTimer);
  myhubDiaryTimer = setTimeout(function(){
    var ta = document.getElementById('myhub-diary'); if(!ta) return;
    getData(curUser).diary = ta.value;
    var lbl = document.getElementById('myhub-diary-saved');
    if (lbl){ lbl.textContent='Saved'; setTimeout(function(){ lbl.textContent=''; }, 2000); }
  }, 800);
}

function renderMyhubTeam() {
  var uid = curUser;
  var el = document.getElementById('myhub-team'); if(!el) return;
  el.innerHTML = '';
  var others = ['salma','lemari'].filter(function(id){ return id!==uid; });
  others.forEach(function(oid){
    var u = USERS[oid]; var col = UCOLORS[oid]||'#9E8B7A';
    var hasAccess = grantedAccess[uid];
    var wt = tasksForWeek(0).filter(function(t){ return t.assignedTo===oid; });
    var wtTot=wt.length, wtDn=wt.filter(function(t){return t.status==='done';}).length;
    var wtIp=wt.filter(function(t){return t.status==='in-progress'||t.status==='waiting';}).length;
    var wtNs=wtTot-wtDn-wtIp;
    var pw=function(n){return wtTot>0?(n/wtTot*100).toFixed(1)+'%':'0%';};

    var div = document.createElement('div');
    div.style.cssText='display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid var(--warm);';
    if (hasAccess) {
      var bar = wtTot>0
        ?'<div class="tp-track" style="height:6px;border-radius:3px;margin-top:6px;width:120px">'+
          (wtDn>0?'<div class="tp-seg-green" style="width:'+pw(wtDn)+'"></div>':'')+
          (wtIp>0?'<div class="tp-seg-orange" style="width:'+pw(wtIp)+'"></div>':'')+
          (wtNs>0?'<div class="tp-seg-red" style="width:'+pw(wtNs)+'"></div>':'')+
          '</div><div style="font-size:10px;color:var(--muted);margin-top:3px">'+wtDn+'/'+wtTot+' tasks this week</div>'
        :'<div style="font-size:11px;color:var(--muted);margin-top:4px">No tasks this week</div>';
      div.innerHTML=
        '<div style="width:40px;height:40px;border-radius:50%;background:'+col+';display:flex;align-items:center;justify-content:center;font-family:\'Cormorant Garamond\',serif;font-size:18px;color:white;flex-shrink:0">'+UINIT[oid]+'</div>'+
        '<div style="flex:1"><div style="font-family:\'Cormorant Garamond\',serif;font-size:17px;color:var(--deep)">'+u.name+'</div>'+
        '<div style="font-size:11px;color:var(--muted)">'+u.role+'</div>'+bar+'</div>';
    } else {
      div.innerHTML=
        '<div style="width:40px;height:40px;border-radius:50%;background:'+col+';display:flex;align-items:center;justify-content:center;font-family:\'Cormorant Garamond\',serif;font-size:18px;color:white;flex-shrink:0">'+UINIT[oid]+'</div>'+
        '<div style="flex:1"><div style="font-family:\'Cormorant Garamond\',serif;font-size:17px;color:var(--deep)">'+u.name+'</div>'+
        '<div style="font-size:11px;color:var(--muted)">'+u.role+'</div>'+
        '<div style="font-size:12px;color:var(--muted);font-style:italic;margin-top:3px">&#128274; Tasks private — request access above</div></div>';
    }
    el.appendChild(div);
  });
}

// ── SOPs ──
var pwList = [
  {id:1,title:'Squarespace',category:'Admin',url:'https://squarespace.com',user:'hello@yourszn.com.au',pw:'',notes:'Main website CMS'},
  {id:2,title:'Google Workspace',category:'Admin',url:'https://workspace.google.com',user:'hello@yourszn.com.au',pw:'',notes:'Email, Drive, Docs'},
  {id:3,title:'Meta Business Suite',category:'Social Media',url:'https://business.facebook.com',user:'hello@yourszn.com.au',pw:'',notes:'Instagram & Facebook ads'},
  {id:4,title:'Xero',category:'Finance',url:'https://xero.com',user:'hello@yourszn.com.au',pw:'',notes:'Invoicing & bookkeeping'},
  {id:5,title:'ManyChat',category:'Marketing',url:'https://manychat.com',user:'hello@yourszn.com.au',pw:'',notes:'IG DM automation'}
];
var sopExpanded = {};
var pwRev = {};
var sopEditId = null, _sopEditId = null;
var pwEditId  = null, _pwEditId  = null;

var sopList = [
  {id:1,title:'Squarespace',category:'Admin',url:'https://squarespace.com',user:'hello@yourszn.com.au',pw:'',notes:'Main website CMS'},
  {id:2,title:'Google Workspace',category:'Admin',url:'https://workspace.google.com',user:'hello@yourszn.com.au',pw:'',notes:'Email, Drive, Docs'},
  {id:3,title:'Meta Business Suite',category:'Social Media',url:'https://business.facebook.com',user:'hello@yourszn.com.au',pw:'',notes:'Instagram & Facebook ads'},
  {id:4,title:'Xero',category:'Finance',url:'https://xero.com',user:'hello@yourszn.com.au',pw:'',notes:'Invoicing & bookkeeping'},
  {id:5,title:'ManyChat',category:'Marketing',url:'https://manychat.com',user:'hello@yourszn.com.au',pw:'',notes:'IG DM automation'}
];
var sopFilt='All', sopRev={};
function renderGoals() {
  var el = document.getElementById('goals-list'); if (!el) return;
  // Show/hide new goal button based on user
  var newBtn = document.getElementById('goals-new-btn');
  if (newBtn) newBtn.style.display = curUser==='latisha' ? '' : 'none';
  var list = goals.filter(function(g){
    // Salma & Lemari cannot see Revenue goals
    if (curUser !== 'latisha' && g.cat === 'Revenue') return false;
    if (goalFilter === 'all') return true;
    return g.status === goalFilter;
  });
  if (!list.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:40px 0;text-align:center">No ' + goalFilter + ' goals. Click "+ New Goal" to add one.</div>';
    return;
  }
  el.innerHTML = '';

  // Summary strip at top
  var active = goals.filter(function(g){ return g.status==='active'; }).length;
  var done   = goals.filter(function(g){ return g.status==='completed'; }).length;
  var avgPct = goals.filter(function(g){ return g.status==='active' && g.target>0; });
  var avg = avgPct.length ? Math.round(avgPct.reduce(function(s,g){ return s + Math.min(100, (g.current/g.target)*100); }, 0) / avgPct.length) : 0;
  el.innerHTML += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px">'
    + '<div class="sc" style="flex:1;min-width:120px"><div class="slb">Active Goals</div><div class="sv">'+active+'</div></div>'
    + '<div class="sc g" style="flex:1;min-width:120px"><div class="slb">Completed</div><div class="sv">'+done+'</div></div>'
    + '<div class="sc go" style="flex:1;min-width:120px"><div class="slb">Avg Progress</div><div class="sv">'+avg+'%</div></div>'
    + '</div>';

  list.forEach(function(g) {
    var pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
    var catKey = g.cat ? g.cat.split('/')[0].trim().split(' ')[0] : 'Business';
    var catClass = 'goal-cat-' + catKey;
    var unitLabel = g.unit ? g.unit : '';
    var fmtNum = function(n){ return n >= 1000 ? n.toLocaleString() : n; };

    var card = document.createElement('div');
    card.className = 'goal-card' + (g.status !== 'active' ? ' ' + g.status : '');
    card.innerHTML =
      '<span class="goal-cat-badge '+catClass+'">' + esc(g.cat) + '</span>'
      + '<div style="display:flex;align-items:flex-start;gap:12px">'
      +   '<div style="flex:1">'
      +     '<div class="goal-title">' + esc(g.title) + '</div>'
      +     (g.desc ? '<div class="goal-desc">' + esc(g.desc) + '</div>' : '')
      +   '</div>'
      +   '<span class="goal-status-badge goal-status-'+g.status+'">'+cap(g.status)+'</span>'
      + '</div>'
      + '<div class="goal-amounts">'
      +   '<span class="goal-current">' + (unitLabel.indexOf('$')>-1 ? '$' : '') + fmtNum(g.current) + '</span>'
      +   '<span class="goal-target"> of ' + (unitLabel.indexOf('$')>-1 ? '$' : '') + fmtNum(g.target) + (unitLabel && unitLabel.indexOf('$')===-1 ? ' ' + unitLabel : '') + '</span>'
      +   '<span class="goal-pct">' + pct + '%</span>'
      + '</div>'
      + '<div class="goal-bar-track"><div class="goal-bar-fill'+(pct>=100?' done':'')+'" style="width:'+pct+'%"></div></div>'
      // Progress input + slider
      + (curUser==='latisha' ? '<div class="goal-slider-wrap" onclick="event.stopPropagation()">'
      +   '<input type="range" class="goal-slider" min="0" max="'+g.target+'" value="'+g.current+'" '
      +     'oninput="liveGoalProgress('+g.id+',this.value)" '
      +     'onchange="saveGoalProgress('+g.id+',this.value)">' : '<div class="goal-slider-wrap"><div style="height:6px">');
      +   '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:3px"><span>0</span><span style="font-weight:600;color:var(--accent)" id="gp-lbl-'+g.id+'">'+pct+'% · '+(unitLabel.indexOf('$')>-1?'$':'')+fmtNum(g.current)+'</span><span>'+(unitLabel.indexOf('$')>-1?'$':'')+fmtNum(g.target)+'</span></div>'
      + '</div>'
      + '<div class="goal-meta">'
      +   (g.deadline ? '<span class="goal-deadline">📅 ' + g.deadline + '</span>' : '')
      + '</div>'
      + (curUser==='latisha' ? '<div class="goal-actions">'
      +   '<button class="btn btns" style="font-size:11px" onclick="openGoalModal('+g.id+')">Edit</button>'
      +   (g.status==='active' ? '<button class="btn" style="font-size:11px;background:#E0E7FF;color:#3730A3;border:none" onclick="setGoalStatus('+g.id+',\'completed\')">Mark Complete</button>' : '')
      +   (g.status!=='archived' ? '<button class="btn" style="font-size:11px;background:var(--warm);color:var(--muted);border:1px solid var(--sand)" onclick="setGoalStatus('+g.id+',\'archived\')">Archive</button>' : '')
      +   (g.status!=='active' ? '<button class="btn" style="font-size:11px;background:#D1FAE5;color:#065F46;border:none" onclick="setGoalStatus('+g.id+',\'active\')">Restore</button>' : '')
      + '</div>' : '');
    el.appendChild(card);
  });
}

function liveGoalProgress(id, val) {
  var g = goals.find(function(x){ return x.id===id; }); if (!g) return;
  var pct = g.target > 0 ? Math.min(100, Math.round((val / g.target) * 100)) : 0;
  var lbl = document.getElementById('gp-lbl-'+id);
  var unitLabel = g.unit || '';
  var fmtNum = function(n){ return parseFloat(n) >= 1000 ? parseFloat(n).toLocaleString() : parseFloat(n); };
  if (lbl) lbl.textContent = pct + '% · ' + (unitLabel.indexOf('$')>-1?'$':'') + fmtNum(val);
  // Update bar live
  var card = lbl && lbl.closest('.goal-card');
  if (card) {
    var fill = card.querySelector('.goal-bar-fill');
    if (fill) { fill.style.width = pct + '%'; fill.className = 'goal-bar-fill' + (pct>=100?' done':''); }
    var curEl = card.querySelector('.goal-current');
    if (curEl) curEl.textContent = (unitLabel.indexOf('$')>-1?'$':'') + fmtNum(val);
    var pctEl = card.querySelector('.goal-pct');
    if (pctEl) pctEl.textContent = pct + '%';
  }
}

function saveGoalProgress(id, val) {
  var g = goals.find(function(x){ return x.id===id; }); if (!g) return;
  g.current = parseFloat(val) || 0;
  if (g.current >= g.target && g.target > 0) g.status = 'completed';
}

function setGoalStatus(id, status) {
  var g = goals.find(function(x){ return x.id===id; }); if (!g) return;
  g.status = status; renderGoals();
}

function setGoalFilter(f, btn) {
  goalFilter = f;
  document.querySelectorAll('#pg-goals .btn').forEach(function(b){ b.classList.remove('on'); });
  if (btn) btn.classList.add('on');
  renderGoals();
}

function openGoalModal(id) {
  // Only Latisha can create/edit goals
  if (curUser !== 'latisha') return;
  var g = id ? goals.find(function(x){ return x.id===id; }) : null;
  document.getElementById('gm-heading').textContent = g ? 'Edit Goal' : 'New Goal';
  document.getElementById('gm-id').value = g ? g.id : '';
  document.getElementById('gm-title').value = g ? g.title : '';
  document.getElementById('gm-cat').value = g ? g.cat : 'Revenue';
  document.getElementById('gm-desc').value = g ? g.desc||'' : '';
  document.getElementById('gm-target').value = g ? g.target : '';
  document.getElementById('gm-unit').value = g ? g.unit||'' : '';
  document.getElementById('gm-current').value = g ? g.current : '';
  document.getElementById('gm-deadline').value = g ? g.deadline||'' : '';
  document.getElementById('gm-status').value = g ? g.status : 'active';
  document.getElementById('gm-err').textContent = '';
  document.getElementById('gm-del-btn').style.display = g ? 'inline-block' : 'none';
  document.getElementById('goal-modal').style.display = 'flex';
}
function closeGoalModal() { document.getElementById('goal-modal').style.display='none'; }

function saveGoal() {
  var title = document.getElementById('gm-title').value.trim();
  var target = document.getElementById('gm-target').value;
  var err = document.getElementById('gm-err');
  if (!title) { err.textContent = 'Please enter a goal title.'; return; }
  if (!target) { err.textContent = 'Please enter a target amount or value.'; return; }
  var id = document.getElementById('gm-id').value;
  var obj = {
    id: id ? parseInt(id) : goalIdSeq++,
    title: title,
    cat: document.getElementById('gm-cat').value,
    desc: document.getElementById('gm-desc').value.trim(),
    target: parseFloat(target) || 0,
    unit: document.getElementById('gm-unit').value.trim(),
    current: parseFloat(document.getElementById('gm-current').value) || 0,
    deadline: document.getElementById('gm-deadline').value,
    status: document.getElementById('gm-status').value
  };
  if (id) {
    goals = goals.map(function(g){ return g.id===parseInt(id) ? obj : g; });
  } else {
    goals.push(obj);
  }
  closeGoalModal(); renderGoals();
}

function deleteGoal() {
  var id = parseInt(document.getElementById('gm-id').value);
  if (!id || !confirm('Delete this goal?')) return;
  goals = goals.filter(function(g){ return g.id!==id; });
  closeGoalModal(); renderGoals();
}

