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

function getWeekStart(off) {
  var d = new Date(); var day = d.getDay(); var diff = (day===0)?-6:1-day;
  d.setDate(d.getDate()+diff+(off*7)); d.setHours(0,0,0,0); return d;
}
function fmtDate(d){return d.toLocaleDateString('en-AU',{day:'numeric',month:'short'});}
function weekLabel(off) {
  var s=getWeekStart(off); var e=new Date(s); e.setDate(s.getDate()+6);
  if(off===0) return 'This Week — '+fmtDate(s)+' to '+fmtDate(e);
  if(off===-1) return 'Last Week — '+fmtDate(s)+' to '+fmtDate(e);
  if(off===1) return 'Next Week — '+fmtDate(s)+' to '+fmtDate(e);
  return fmtDate(s)+' to '+fmtDate(e);
}
function tasksForWeek(off) {
  var ws=getWeekStart(off).getTime(); var we=ws+7*24*60*60*1000;
  return tasks.filter(function(t){
    if(t.freq==='daily'||t.freq==='weekly') return true;
    if(!t.due) return off===0;
    var dt=new Date(t.due).getTime(); return dt>=ws&&dt<we;
  });
}
function applyFilt(list,f){
  if(f==='all') return list;
  return list.filter(function(t){return t.freq===f||t.category===f||t.assignedTo===f;});
}
function statusLabel(s){return {n:'Not Started','not-started':'Not Started','in-progress':'In Progress','blocked':'Blocked','done':'Done'}[s]||'Not Started';}
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):'';}

// ══════════════════════════════════════════════════════════════
// TASK SYSTEM
// ══════════════════════════════════════════════════════════════

var taskWeekOff = 0;
var staffTaskWeekOff = 0;
var openTaskCards = {};   // uid -> bool for owner accordion
var hiddenTasks = {};     // taskId -> {by, completedDate, staffNotes}
var taskNotifs = [];      // {id, taskId, forUser, type:'assigned'|'completed', seen:false}
var hiddenBoxOpen = {};   // uid -> bool
var editingTaskId = null;
var editingStaffTaskId = null;

// ── Week helpers ──
function changeTaskWeek(d){ taskWeekOff+=d; renderTaskBoard(); }
function changeStaffTaskWeek(d){ staffTaskWeekOff+=d; renderTaskBoard(); }

function renderTaskBoard() {
  if (curUser === 'latisha') {
    renderOwnerTasks();
  } else {
    renderStaffTasks();
  }
}

// ══════════════════════════════════════════════════════════════
// OWNER VIEW — accordion per person
// ══════════════════════════════════════════════════════════════
function renderOwnerTasks() {
  var ov = document.getElementById('tasks-owner-view');
  var sv = document.getElementById('tasks-staff-view');
  if (!ov) return;
  ov.style.display='block'; if(sv) sv.style.display='none';
  var lbl = document.getElementById('task-week-label');
  if (lbl) lbl.textContent = weekLabel(taskWeekOff);
  var grid = document.getElementById('tasks-owner-cards');
  if (!grid) return;
  grid.innerHTML = '';
  ['latisha','salma','lemari'].forEach(function(uid){
    grid.appendChild(buildOwnerPersonCard(uid));
  });
  renderHiddenBox();
  renderCompletedBanner();
}

function buildOwnerPersonCard(uid) {
  var u = USERS[uid];
  var col = UCOLORS[uid]||'#9E8B7A';
  var init = UINIT[uid]||'?';
  var isOpen = !!openTaskCards[uid];
  var myTasks = tasksForWeek(taskWeekOff).filter(function(t){ return t.assignedTo===uid; });
  var tot=myTasks.length, dn=myTasks.filter(function(t){return t.status==='done';}).length;

  var wrap = document.createElement('div'); wrap.className='tpcard'; wrap.id='tpcard-'+uid;
  wrap.innerHTML =
    '<div class="tpcard-hd" onclick="toggleTaskCard(\''+uid+'\')">'+
      '<div class="uav-sm" style="background:'+col+';width:34px;height:34px;font-size:14px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:white;font-family:\'Cormorant Garamond\',serif;flex-shrink:0">'+init+'</div>'+
      '<div>'+
        '<div style="font-family:\'Cormorant Garamond\',serif;font-size:18px;color:var(--deep)">'+u.name+'</div>'+
        '<div style="font-size:11px;color:var(--muted)">'+tot+' task'+(tot!==1?'s':'')+' this week · '+dn+' done</div>'+
      '</div>'+
      '<div class="tpcard-exp'+(isOpen?' open':'')+'" id="tpexp-'+uid+'">&#x25BE;</div>'+
    '</div>'+
    '<div class="tpcard-body'+(isOpen?' open':'')+'" id="tpbody-'+uid+'">'+(isOpen ? buildTaskTablesHTML(uid, taskWeekOff, false) : '')+'</div>';

  if (isOpen) setTimeout(function(){ bindTableChips(uid); }, 0);
  return wrap;
}

function toggleTaskCard(uid) {
  openTaskCards[uid] = !openTaskCards[uid];
  var body = document.getElementById('tpbody-'+uid);
  var exp  = document.getElementById('tpexp-'+uid);
  if (!body) return;
  if (openTaskCards[uid]) {
    body.classList.add('open');
    body.innerHTML = buildTaskTablesHTML(uid, taskWeekOff, false);
    setTimeout(function(){ bindTableChips(uid); }, 0);
  } else {
    body.classList.remove('open');
    body.innerHTML = '';
  }
  if (exp) exp.classList.toggle('open', openTaskCards[uid]);
}

// ══════════════════════════════════════════════════════════════
// STAFF VIEW — own tasks only
// ══════════════════════════════════════════════════════════════
function renderStaffTasks() {
  var ov = document.getElementById('tasks-owner-view');
  var sv = document.getElementById('tasks-staff-view');
  if (!sv) return;
  if(ov) ov.style.display='none'; sv.style.display='block';
  var lbl = document.getElementById('staff-task-week-label');
  if (lbl) lbl.textContent = weekLabel(staffTaskWeekOff);
  var cont = document.getElementById('tasks-staff-tables');
  if (!cont) return;
  cont.innerHTML = buildTaskTablesHTML(curUser, staffTaskWeekOff, true);
  setTimeout(function(){ bindTableChips(curUser); }, 0);
  renderHiddenBox();
  renderNewTaskBanner();
}

// ══════════════════════════════════════════════════════════════
// SHARED TABLE BUILDER  (used for both owner accordion + staff view)
// ══════════════════════════════════════════════════════════════
var DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function buildTaskTablesHTML(uid, weekOff, isStaff) {
  var data = getData(uid) || {recurDays:{}};
  var allWeekTasks = tasksForWeek(weekOff).filter(function(t){ 
  return (t.assignedTo||t.assigned_to)===uid && !hiddenTasks[t.id]; 
});
  var daily  = allWeekTasks.filter(function(t){ return t.freq==='daily'; });
  var weekly = allWeekTasks.filter(function(t){ return t.freq==='weekly'; });
  var oneoff = allWeekTasks.filter(function(t){ return t.freq==='one-off'; });
  var wLabel = weekLabel(weekOff);
  var html = '<div style="padding-top:8px">';

  // ── DAILY TABLE ──
  html += buildTable('Daily Tasks',
    daily.length ? daily : null,
    ['','Task','Category','Priority','Status','Hours Allowed','Hours Taken','Notes',''],
    function(t) {
      return '<td><span class="prio-dot prio-'+(t.priority||'green')+'"></span></td>'+
        '<td style="font-weight:500">'+esc(t.title)+'</td>'+
        '<td><span style="font-size:11px;color:var(--muted)">'+esc(t.category||'')+'</span></td>'+
        '<td><span style="font-size:11px;color:var(--muted);text-transform:capitalize">'+(t.priority||'')+'</span></td>'+
        '<td><span class="st-badge st-'+(t.status||'not-started')+'">'+statusLabel(t.status)+'</span></td>'+
        '<td style="color:var(--muted);font-size:12px">'+(t.hrsAllowed?t.hrsAllowed+'h':'—')+'</td>'+
        '<td style="color:var(--muted);font-size:12px">'+(t.hrsTaken?t.hrsTaken+'h':'—')+'</td>'+
        '<td style="font-size:11px;color:var(--muted);max-width:140px">'+(esc(t.staffNotes||t.notes||''))+'</td>'+
        '<td onclick="event.stopPropagation()"><button class="task-done-btn" onclick="promptCompleteTask(\''+t.id+'\')">Hide ✓</button></td>';
    },
    uid, isStaff, 'No daily tasks this week.');

  // ── WEEKLY TABLE ──
  html += buildTable('Weekly Tasks',
    weekly.length ? weekly : null,
    ['','Task','Category','Priority','Status','Hours Allowed','Hours Taken','Notes',''],
    function(t) {
      return '<td><span class="prio-dot prio-'+(t.priority||'green')+'"></span></td>'+
        '<td style="font-weight:500">'+esc(t.title)+'</td>'+
        '<td><span style="font-size:11px;color:var(--muted)">'+esc(t.category||'')+'</span></td>'+
        '<td><span style="font-size:11px;color:var(--muted);text-transform:capitalize">'+(t.priority||'')+'</span></td>'+
        '<td><span class="st-badge st-'+(t.status||'not-started')+'">'+statusLabel(t.status)+'</span></td>'+
        '<td style="color:var(--muted);font-size:12px">'+(t.hrsAllowed?t.hrsAllowed+'h':'—')+'</td>'+
        '<td style="color:var(--muted);font-size:12px">'+(t.hrsTaken?t.hrsTaken+'h':'—')+'</td>'+
        '<td style="font-size:11px;color:var(--muted);max-width:140px">'+(esc(t.staffNotes||t.notes||''))+'</td>'+
        '<td onclick="event.stopPropagation()"><button class="task-done-btn" onclick="promptCompleteTask(\''+t.id+'\')">Hide ✓</button></td>';
    },
    uid, isStaff, 'No weekly tasks this week.');

  // ── ONE-OFF TABLE ──
  html += buildTable(wLabel,
    oneoff.length ? oneoff : null,
    ['','Task','Category','Priority','Status','Hours Allowed','Hours Taken','Notes',''],
    function(t) {
      return '<td><span class="prio-dot prio-'+(t.priority||'green')+'"></span></td>'+
        '<td style="font-weight:500">'+esc(t.title)+'</td>'+
        '<td><span style="font-size:11px;color:var(--muted)">'+esc(t.category||'')+'</span></td>'+
        '<td><span style="font-size:11px;color:var(--muted);text-transform:capitalize">'+(t.priority||'')+'</span></td>'+
        '<td><span class="st-badge st-'+(t.status||'not-started')+'">'+statusLabel(t.status)+'</span></td>'+
        '<td style="color:var(--muted);font-size:12px">'+(t.hrsAllowed?t.hrsAllowed+'h':'—')+'</td>'+
        '<td style="color:var(--muted);font-size:12px">'+(t.hrsTaken?t.hrsTaken+'h':'—')+'</td>'+
        '<td style="font-size:11px;color:var(--muted);max-width:160px">'+(esc(t.staffNotes||t.notes||''))+'</td>'+
        '<td onclick="event.stopPropagation()"><button class="task-done-btn" onclick="promptCompleteTask(\''+t.id+'\')">Hide ✓</button></td>';
    },
    uid, isStaff, 'No one-off tasks for this week.');

  if (!isStaff) {
    html += '<button class="btn btnp" style="margin-top:4px" onclick="openNewTaskModal()">+ New Task</button>';
  }
  html += '</div>';
  return html;
}

function buildTable(title, rows, headers, rowFn, uid, isStaff, emptyMsg) {
  var clickAttr = isStaff ? '' : '';  // rows handle click via JS
  var h = '<div class="ttable-wrap">'+
    '<div class="ttable-hd">'+
      '<div><div class="ttable-title">'+title+'</div></div>'+
      '<span class="ttable-count">'+(rows?rows.length:0)+'</span>'+
    '</div>'+
    '<div style="overflow-x:auto"><table class="ttbl">'+
    '<thead><tr>'+headers.map(function(h){return '<th>'+h+'</th>';}).join('')+'</tr></thead>'+
    '<tbody>';
  if (!rows || !rows.length) {
    h += '<tr><td colspan="'+headers.length+'" style="color:var(--muted);text-align:center;padding:20px">'+emptyMsg+'</td></tr>';
  } else {
    rows.forEach(function(t){
      var fn = isStaff ? 'openStaffTaskModal' : 'openTaskModal';
      // Highlight row yellow if this task has an unseen 'assigned' notif for current user
      var isNew = taskNotifs.some(function(n){ return n.taskId===t.id && n.forUser===curUser && n.type==='assigned' && !n.seen; });
      var rowStyle = isNew ? ' class="task-row-new"' : '';
      h += '<tr'+rowStyle+' onclick="'+fn+'('+t.id+')">'+rowFn(t)+'</tr>';
    });
  }
  h += '</tbody></table></div></div>';
  return h;
}

// Bind day-chip clicks in tables (called after HTML insert)
function bindTableChips(uid) {
  var data = getData(uid);
  if (!data) return;
  document.querySelectorAll('[data-uid="'+uid+'"].dc-chip').forEach(function(chip){
    chip.onclick = function(e){
      e.stopPropagation();
      var tid = parseInt(chip.getAttribute('data-tid'));
      var day = chip.getAttribute('data-day');
      if (!data.recurDays[tid]) data.recurDays[tid] = [];
      var arr = data.recurDays[tid];
      var i = arr.indexOf(day);
      if (i>-1) arr.splice(i,1); else arr.push(day);
      chip.classList.toggle('done', arr.indexOf(day)>-1);
    };
  });
}

// ══════════════════════════════════════════════════════════════
// OWNER TASK MODAL  (full edit, Latisha only)
// ══════════════════════════════════════════════════════════════
function toggleWeekPicker() {
  var freq = document.getElementById('mt-freq').value;
  var wrap = document.getElementById('mt-weekpicker-wrap');
  if (wrap) wrap.style.display = (freq==='one-off') ? 'block' : 'none';
}

function openNewTaskModal() {
  editingTaskId = null;
  document.getElementById('modal-title').textContent = 'New Task';
  document.getElementById('modal-task-id').value = '';
  document.getElementById('mt-title').value = '';
  document.getElementById('mt-assign').value = (curUser === 'latisha') ? 'latisha' : curUser;
   var assignEl = document.getElementById('mt-assign');
   if (assignEl && assignEl.parentElement) {
     assignEl.parentElement.style.display = (curUser === 'latisha') ? '' : 'none';
   }
  document.getElementById('mt-cat').value = 'Admin';
  document.getElementById('mt-freq').value = 'weekly';
  document.getElementById('mt-due').value = '';
  document.getElementById('mt-weekdate').value = '';
  document.getElementById('mt-priority').value = 'orange';
  document.getElementById('mt-hrs').value = '';
  document.getElementById('mt-status').value = 'not-started';
  document.getElementById('mt-desc').value = '';
  document.getElementById('mt-video').value = '';
  document.getElementById('mt-file').value = '';
  document.getElementById('mt-notes').value = '';
  document.getElementById('modal-del-btn').style.display = 'none';
  document.getElementById('mt-weekpicker-wrap').style.display = 'none';
  document.getElementById('task-modal').style.display = 'flex';
}

function openTaskModal(id) {
  var t = tasks.find(function(x){ return x.id===id; }); if (!t) return;
  editingTaskId = id;
  document.getElementById('modal-title').textContent = 'Edit Task';
  document.getElementById('modal-task-id').value = id;
  document.getElementById('mt-title').value = t.title||'';
  document.getElementById('mt-assign').value = t.assignedTo||'latisha';
  document.getElementById('mt-cat').value = t.category||'Admin';
  document.getElementById('mt-freq').value = t.freq||'weekly';
  document.getElementById('mt-due').value = t.due||'';
  document.getElementById('mt-weekdate').value = t.weekDate||'';
  document.getElementById('mt-priority').value = t.priority||'orange';
  document.getElementById('mt-hrs').value = t.hrsAllowed||'';
  document.getElementById('mt-status').value = t.status||'not-started';
  document.getElementById('mt-desc').value = t.desc||'';
  document.getElementById('mt-video').value = t.videoUrl||'';
  document.getElementById('mt-file').value = t.fileUrl||'';
  document.getElementById('mt-notes').value = t.notes||'';
  document.getElementById('modal-del-btn').style.display = 'inline-block';
  document.getElementById('mt-weekpicker-wrap').style.display = (t.freq==='one-off') ? 'block' : 'none';
  document.getElementById('task-modal').style.display = 'flex';
}

function closeTaskModal() { document.getElementById('task-modal').style.display='none'; }

async function saveTask() {
  var title = document.getElementById('mt-title').value.trim();
  if (!title) { alert('Please enter a task title.'); return; }
  var freq = document.getElementById('mt-freq').value;
  var weekDate = freq==='one-off' ? document.getElementById('mt-weekdate').value : '';
  var isTemplate = (freq==='daily' || freq==='weekly');
  var obj = {
    title: title,
assignedTo: document.getElementById('mt-assign').value.toLowerCase(),
    category: document.getElementById('mt-cat').value,
    freq: freq,
  due_date: document.getElementById('mt-due').value,
    week_date: weekDate,
    priority: document.getElementById('mt-priority').value,
    hrs_allowed: parseFloat(document.getElementById('mt-hrs').value)||0,
    hrs_taken: 0,
    status: document.getElementById('mt-status').value,
    description: document.getElementById('mt-desc').value,
    video_url: document.getElementById('mt-video').value,
    file_url: document.getElementById('mt-file').value,
    notes: document.getElementById('mt-notes').value,
    staff_notes: '',
    is_template: isTemplate
  };
  var db = getSupa();
  if (editingTaskId) {
    var existing = tasks.find(function(x){ return x.id===editingTaskId; });
    if (existing) { obj.hrs_taken=existing.hrs_taken; obj.staff_notes=existing.staffNotes||''; }
    tasks = tasks.map(function(t){ return t.id===editingTaskId ? Object.assign(t,obj) : t; });

  } else {
obj.id = crypto.randomUUID();
    tasks.push(obj);
    if (obj.assignedTo !== 'latisha') {
      taskNotifs.push({ id: Date.now(), taskId: obj.id, forUser: obj.assignedTo, type:'assigned', seen:false });
      updateTaskBadge();
    }

  }
  saveData();
  closeTaskModal();
  renderTaskBoard();
  renderDashTaskProgress();
}

async function deleteTask() {if (!editingTaskId && editingStaffTaskId) editingTaskId = editingStaffTaskId;
  if (!editingTaskId) return;
  if (!confirm('Delete this task permanently?')) return;
  var db = getSupa();
  if (db) await db.from('tasks').delete().eq('id', editingTaskId);
  tasks = tasks.filter(function(t){ return t.id!==editingTaskId; });
  saveData();
  closeTaskModal();
  renderTaskBoard();
  renderDashTaskProgress();
}

// ══════════════════════════════════════════════════════════════
// STAFF TASK MODAL  (status / hours / notes only)
// ══════════════════════════════════════════════════════════════
function openStaffTaskModal(id) {
  var t = tasks.find(function(x){ return x.id===id; }); if (!t) return;
  // Latisha uses full modal; staff use limited modal
  if (curUser === 'latisha') { openTaskModal(id); return; }
  editingStaffTaskId = id;
  document.getElementById('stm-id').value = id;
  document.getElementById('stm-title').textContent = t.title;
  document.getElementById('stm-cat').textContent = (t.category||'') + ' · ' + cap(t.freq||'');
  var pc = {red:'#EF4444',orange:'#F97316',green:'#22C55E'};
  var pl = {red:'High Priority',orange:'Medium Priority',green:'Low Priority'};
  var pb = document.getElementById('stm-prio');
  if (pb) { pb.textContent=pl[t.priority||'green']||''; pb.style.color=pc[t.priority||'green']||'#22C55E'; }
  document.getElementById('stm-desc').textContent = t.desc || 'No instructions provided.';
  var links = '';
  if (t.videoUrl) links += '<a href="'+t.videoUrl+'" target="_blank" class="btn btns" style="font-size:12px">&#9654; Training Video</a>';
  if (t.fileUrl)  links += '<a href="'+t.fileUrl+'"  target="_blank" class="btn btns" style="font-size:12px">&#128206; File / Resource</a>';
  document.getElementById('stm-links').innerHTML = links;
  document.getElementById('stm-status').value = t.status||'not-started';
  document.getElementById('stm-hrs').value = t.hrsTaken||'';
  document.getElementById('stm-notes').value = t.staffNotes||'';
  document.getElementById('staff-task-modal').style.display = 'flex';
}
function closeStaffTaskModal() { document.getElementById('staff-task-modal').style.display='none'; }
function saveStaffTaskUpdate() {
  var t = tasks.find(function(x){ return x.id===editingStaffTaskId; }); if (!t) return;
  t.status    = document.getElementById('stm-status').value;
  t.hrsTaken  = parseFloat(document.getElementById('stm-hrs').value)||0;
  t.staffNotes= document.getElementById('stm-notes').value;
  closeStaffTaskModal();
  renderTaskBoard();
  renderDashTaskProgress();
  renderMyHub();
}
function requestTaskRemoval() {
  var t = tasks.find(function(x){ return x.id===editingStaffTaskId; }); if (!t) return;
  t.status = 'blocked';
  t.staffNotes = (t.staffNotes?t.staffNotes+'\n':'')+'[Removal requested by '+USERS[curUser].name+']';
  alert('Removal request sent to Latisha.');
  closeStaffTaskModal(); renderTaskBoard();
}

// Legacy compatibility
function openStaffModal(id) { openStaffTaskModal(id); }
function closeStaffModal()  { closeStaffTaskModal(); }
function saveStaffTask()    { saveStaffTaskUpdate(); }
function requestTaskDeletion() { requestTaskRemoval(); }

// ── Updated tasksForWeek to support weekDate ──
function tasksForWeek(off) {
  var ws = getWeekStart(off).getTime();
  var we = ws + 7*24*60*60*1000;
  return tasks.filter(function(t){
    if (t.freq==='daily' || t.freq==='weekly') return true;
    // one-off: use weekDate (Monday of assigned week) if set
    if (t.freq==='one-off') {
      if (t.weekDate) {
        var wd = new Date(t.weekDate).getTime();
        return wd >= ws && wd < we;
      }
      return off === 0; // no date set → show current week
    }
    return false;
  });
}


// ── Staff page router ──

// ═══════════════════════════════════════════════════════
// STAFF PAGE SYSTEM
// ═══════════════════════════════════════════════════════

var grantedAccess = {};   // uid -> true when Latisha approves
var accessRequests = [];  // [{id,from,ts,resolved}]
var openCards = {};       // uid -> bool, accordion state

// ──────────────────────────────────────────────
// DATA STORE  (per staff member, persists in memory)
// ──────────────────────────────────────────────
var staffData = {
  salma:  { todos:[], goals:[], diary:'', recurDays:{} },
  lemari: { todos:[], goals:[], diary:'', recurDays:{} }
};
function getData(uid) {
  if (!staffData[uid]) staffData[uid]={todos:[],goals:[],diary:'',recurDays:{}};
  return staffData[uid];
}
function getMyData() { return getData(curUser); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ──────────────────────────────────────────────
// PAGE ROUTER
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// PERSONAL DASHBOARD HTML  (used in both owner accordion + staff self-view)
// ──────────────────────────────────────────────
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
function saveAudit(k,f,v){ if(!auditD[k])auditD[k]={date:'',notes:'',status:'To Audit'}; auditD[k][f]=v; saveData(); }

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


