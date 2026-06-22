// Staff — team management page

function renderStaffPage() {
  var ov=document.getElementById('staff-owner-view');
  var pv=document.getElementById('staff-personal-view');
  if(!ov||!pv) return;
  if(curUser==='latisha'){
    ov.style.display='block'; pv.style.display='none';
    renderOwnerCards();
    renderAccessRequests();
  } else {
    ov.style.display='none'; pv.style.display='block';
    var nm=document.getElementById('staff-dash-name');
    if(nm) nm.textContent=USERS[curUser].name+"'s Dashboard";
    // Render own full dashboard
    var myDash=document.getElementById('staff-my-dash');
    if(myDash){ myDash.innerHTML=buildDashHTML(curUser); bindDash(curUser); }
    // Render team section (locked or open based on access)
    renderTeamSection();
  }
}

// ──────────────────────────────────────────────
// OWNER VIEW  — accordion cards for each staff member
// ──────────────────────────────────────────────
function renderOwnerCards() {
  var grid=document.getElementById('staff-member-cards'); if(!grid) return;
  grid.innerHTML='';
  ['salma','lemari'].forEach(function(uid){ grid.appendChild(makeStaffCard(uid,true)); });
}

function makeStaffCard(uid, showTaskBtn) {
  var u=USERS[uid], col=UCOLORS[uid]||'#9E8B7A', init=UINIT[uid]||'?';
  var isOpen=!!openCards[uid];

  // Mini progress bar for header
  var wt=tasksForWeek(0).filter(function(t){return t.assignedTo===uid;});
  var wtTot=wt.length;
  var wtDn=wt.filter(function(t){return t.status==='done';}).length;
  var wtIp=wt.filter(function(t){return t.status==='in-progress'||t.status==='waiting';}).length;
  var wtNs=wtTot-wtDn-wtIp;
  var pw=function(n){return wtTot>0?(n/wtTot*100).toFixed(1)+'%':'0%';};
  var miniBar=wtTot>0
    ?'<div class="tp-track" style="height:6px;border-radius:3px;margin-top:4px">'+
      (wtDn>0?'<div class="tp-seg-green" style="width:'+pw(wtDn)+'"></div>':'')+
      (wtIp>0?'<div class="tp-seg-orange" style="width:'+pw(wtIp)+'"></div>':'')+
      (wtNs>0?'<div class="tp-seg-red" style="width:'+pw(wtNs)+'"></div>':'')+
      '</div><div style="font-size:10px;color:var(--muted);margin-top:3px">'+wtDn+'/'+wtTot+' tasks this week</div>'
    :'<div style="font-size:11px;color:var(--muted);margin-top:4px">No tasks this week</div>';

  var wrap=document.createElement('div'); wrap.className='smcard-full'; wrap.id='scard-'+uid;
  wrap.innerHTML=
    '<div class="smcard-header" onclick="toggleCard(\''+uid+'\')">'+
      '<div class="smcard-av2" style="background:'+col+'">'+init+'</div>'+
      '<div class="smcard-info">'+
        '<div class="smcard-nm">'+u.name+'</div>'+
        '<div class="smcard-rl">'+u.role+'</div>'+
      '</div>'+
      '<div class="smcard-prog">'+miniBar+'</div>'+
      (showTaskBtn?'<button class="btn btns" style="font-size:11px;padding:5px 12px;white-space:nowrap;flex-shrink:0" onclick="event.stopPropagation();viewStaffTasks(\''+uid+'\')">View Tasks</button>':'')+
      '<div class="smcard-expand'+(isOpen?' open':'')+'" id="smexp-'+uid+'">&#x25BE;</div>'+
    '</div>'+
    '<div class="smcard-body'+(isOpen?' open':'')+'" id="smbody-'+uid+'">'+(isOpen?buildDashHTML(uid):'')+'</div>';

  if(isOpen) setTimeout(function(){bindDash(uid);},0);
  return wrap;
}

function toggleCard(uid) {
  openCards[uid]=!openCards[uid];
  var body=document.getElementById('smbody-'+uid);
  var arrow=document.getElementById('smexp-'+uid);
  if(!body) return;
  if(openCards[uid]){
    body.classList.add('open');
    body.innerHTML=buildDashHTML(uid);
    setTimeout(function(){bindDash(uid);},0);
  } else {
    body.classList.remove('open');
    body.innerHTML='';
  }
  if(arrow) arrow.classList.toggle('open',openCards[uid]);
}

function viewStaffTasks(uid) {
  taskFilt=uid;
  document.querySelectorAll('#task-filters .fpill').forEach(function(p){p.classList.remove('on');});
  var pill=document.querySelector('#task-filters .fpill[onclick*="\''+uid+'\'"]');
  if(pill) pill.classList.add('on');
  showPage('tasks'); renderTaskBoard();
}

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