// Tasks — task management for owner and staff

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
  var allWeekTasks = tasksForWeek(weekOff).filter(function(t){ return t.assignedTo===uid && !hiddenTasks[t.id]; });
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
        '<td onclick="event.stopPropagation()"><button class="task-done-btn" onclick="promptCompleteTask('+t.id+')">Hide ✓</button></td>';
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
        '<td onclick="event.stopPropagation()"><button class="task-done-btn" onclick="promptCompleteTask('+t.id+')">Hide ✓</button></td>';
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
        '<td onclick="event.stopPropagation()"><button class="task-done-btn" onclick="promptCompleteTask('+t.id+')">Hide ✓</button></td>';
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
  document.getElementById('mt-assign').value = 'latisha';
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

function saveTask() {
  var title = document.getElementById('mt-title').value.trim();
  if (!title) { alert('Please enter a task title.'); return; }
  var freq = document.getElementById('mt-freq').value;
  var weekDate = freq==='one-off' ? document.getElementById('mt-weekdate').value : '';
  var obj = {
    id: editingTaskId || (taskIdSeq++),
    title: title,
    assignedTo: document.getElementById('mt-assign').value,
    category: document.getElementById('mt-cat').value,
    freq: freq,
    due: document.getElementById('mt-due').value,
    weekDate: weekDate,
    priority: document.getElementById('mt-priority').value,
    hrsAllowed: parseFloat(document.getElementById('mt-hrs').value)||0,
    hrsTaken: 0,
    status: document.getElementById('mt-status').value,
    desc: document.getElementById('mt-desc').value,
    videoUrl: document.getElementById('mt-video').value,
    fileUrl: document.getElementById('mt-file').value,
    notes: document.getElementById('mt-notes').value,
    staffNotes: ''
  };
  if (editingTaskId) {
    var existing = tasks.find(function(x){ return x.id===editingTaskId; });
    if (existing) { obj.hrsTaken=existing.hrsTaken; obj.staffNotes=existing.staffNotes||''; }
    tasks = tasks.map(function(t){ return t.id===editingTaskId ? obj : t; });
  } else {
    tasks.push(obj);
    // Notify the assigned person (if not latisha assigning to herself)
    if (obj.assignedTo !== 'latisha') {
      taskNotifs.push({ id: Date.now(), taskId: obj.id, forUser: obj.assignedTo, type:'assigned', seen:false });
      updateTaskBadge();
    }
  }
  closeTaskModal();
  renderTaskBoard();
  renderDashTaskProgress();
}

function deleteTask() {
  if (!editingTaskId) return;
  if (!confirm('Delete this task permanently?')) return;
  tasks = tasks.filter(function(t){ return t.id!==editingTaskId; });
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

function promptCompleteTask(taskId) {
  var t = tasks.find(function(x){ return x.id===taskId; }); if (!t) return;
  // Open the hide-confirm modal to collect status/hours/notes
  openHideModal(taskId);
}

function openHideModal(taskId) {
  var t = tasks.find(function(x){ return x.id===taskId; }); if (!t) return;
  document.getElementById('hm-task-id').value = taskId;
  document.getElementById('hm-title').textContent = t.title;
  document.getElementById('hm-status').value = t.status === 'done' ? 'done' : t.status || 'done';
  document.getElementById('hm-hrs').value = t.hrsTaken || '';
  document.getElementById('hm-notes').value = t.staffNotes || '';
  document.getElementById('hm-err').textContent = '';
  document.getElementById('hide-confirm-modal').style.display = 'flex';
}

function closeHideModal() {
  document.getElementById('hide-confirm-modal').style.display = 'none';
}

function confirmHideTask() {
  var taskId = parseInt(document.getElementById('hm-task-id').value);
  var status = document.getElementById('hm-status').value;
  var hrs = document.getElementById('hm-hrs').value.trim();
  var notes = document.getElementById('hm-notes').value.trim();
  var err = document.getElementById('hm-err');

  // Validate all three fields required
  if (!status || status === 'not-started') { err.textContent = 'Please update the status before hiding.'; return; }
  if (!hrs) { err.textContent = 'Please enter hours taken before hiding.'; return; }
  if (!notes) { err.textContent = 'Please add your completion notes before hiding.'; return; }

  // Save updates to the task
  var t = tasks.find(function(x){ return x.id===taskId; }); if (!t) return;
  t.status = status;
  t.hrsTaken = parseFloat(hrs) || 0;
  t.staffNotes = notes;

  closeHideModal();
  hideTask(taskId);
}

// Hides a task — sets completedDate to today, records who did it
function hideTask(taskId) {
  var t = tasks.find(function(x){ return x.id===taskId; });
  if (!t) return;
  t.status = 'done';
  var today = new Date().toLocaleDateString('en-AU', {day:'numeric', month:'short', year:'numeric'});
  hiddenTasks[taskId] = {
    by: curUser,
    completedDate: today,
    staffNotes: t.staffNotes || ''
  };
  fireCompletedNotif(taskId);
  renderTaskBoard();
  renderDashTaskProgress();
  renderHiddenBox();
}

// Unhide a task (person who hid it or Latisha)
function unhideTask(taskId) {
  var h = hiddenTasks[taskId];
  if (!h) return;
  if (curUser !== 'latisha' && h.by !== curUser) return;
  delete hiddenTasks[taskId];
  var t = tasks.find(function(x){ return x.id===taskId; });
  if (t) t.status = 'in-progress';
  renderTaskBoard();
  renderHiddenBox();
}

// Fire a "completed" notification for Latisha
function fireCompletedNotif(taskId) {
  taskNotifs.push({ id: Date.now(), taskId: taskId, forUser: 'latisha', type:'completed', seen:false });
  updateTaskBadge();
}

// ── NAV BADGE ──
function updateTaskBadge() {
  var navItem = document.getElementById('n-tasks');
  if (!navItem) return;

  var count = 0;
  if (curUser === 'latisha') {
    // Latisha sees count of newly completed tasks (unseen)
    count = taskNotifs.filter(function(n){ return n.forUser==='latisha' && n.type==='completed' && !n.seen; }).length;
  } else {
    // Staff see count of new tasks assigned to them (unseen)
    count = taskNotifs.filter(function(n){ return n.forUser===curUser && n.type==='assigned' && !n.seen; }).length;
  }

  var existing = navItem.querySelector('.task-nav-badge');
  if (count > 0) {
    if (!existing) {
      var badge = document.createElement('span');
      badge.className = 'task-nav-badge';
      navItem.appendChild(badge);
      existing = badge;
    }
    existing.textContent = '+' + count;
  } else {
    if (existing) existing.remove();
  }
}

// Clear badge when user opens task page
function clearTaskBadge() {
  // Mark all relevant notifs as seen
  if (curUser === 'latisha') {
    taskNotifs.forEach(function(n){ if (n.forUser==='latisha' && n.type==='completed') n.seen=true; });
  } else {
    taskNotifs.forEach(function(n){ if (n.forUser===curUser && n.type==='assigned') n.seen=true; });
  }
  updateTaskBadge();
  // Hide both banners
  var nb = document.getElementById('new-task-banner'); if (nb) nb.style.display='none';
  var cb = document.getElementById('completed-banner'); if (cb) cb.style.display='none';
  // Re-render task board so yellow row highlights clear
  renderTaskBoard();
}

// ── NEW TASK BANNER (shows at top of tasks page for staff) ──
function renderNewTaskBanner() {
  var el = document.getElementById('new-task-banner');
  if (!el) return;
  if (curUser === 'latisha') { el.style.display='none'; return; }

  var unseen = taskNotifs.filter(function(n){ return n.forUser===curUser && n.type==='assigned' && !n.seen; });
  if (!unseen.length) { el.style.display='none'; return; }

  var taskTitles = unseen.map(function(n){
    var t = tasks.find(function(x){ return x.id===n.taskId; });
    return t ? t.title : '';
  }).filter(Boolean);

  el.style.display = 'block';
  el.innerHTML = '<div class="ntb-inner">'
    + '<div class="ntb-icon">🔔</div>'
    + '<div>'
    + '<div class="ntb-title">You have ' + unseen.length + ' new task' + (unseen.length!==1?'s':'') + '!</div>'
    + '<div class="ntb-list">' + taskTitles.map(function(t){ return '• ' + esc(t); }).join('<br>') + '</div>'
    + '</div>'
    + '<button class="ntb-close" onclick="clearTaskBadge()">Got it ✓</button>'
    + '</div>';
}

// ── COMPLETED BANNER (shows at top of tasks page for Latisha) ──
function renderCompletedBanner() {
  var el = document.getElementById('completed-banner');
  if (!el) return;
  if (curUser !== 'latisha') { el.style.display='none'; return; }

  var unseen = taskNotifs.filter(function(n){ return n.forUser==='latisha' && n.type==='completed' && !n.seen; });
  if (!unseen.length) { el.style.display='none'; return; }

  var lines = unseen.map(function(n){
    var t = tasks.find(function(x){ return x.id===n.taskId; });
    var h = hiddenTasks[n.taskId];
    var who = h ? cap(h.by) : (t ? cap(t.assignedTo) : '');
    return t ? who + ' completed "' + t.title + '"' + (h ? ' on ' + h.completedDate : '') : '';
  }).filter(Boolean);

  el.style.display = 'block';
  el.innerHTML = '<div class="ntb-inner ntb-green">'
    + '<div class="ntb-icon">✅</div>'
    + '<div>'
    + '<div class="ntb-title">' + unseen.length + ' task' + (unseen.length!==1?'s':'') + ' completed!</div>'
    + '<div class="ntb-list">' + lines.map(function(l){ return '• ' + esc(l); }).join('<br>') + '</div>'
    + '</div>'
    + '<button class="ntb-close" onclick="clearTaskBadge()">Dismiss ✓</button>'
    + '</div>';
}

// ── HIDDEN TASKS BOX ──
function renderHiddenBox() {
  // Render for owner view
  renderHiddenBoxFor('owner');
  // Render for staff view
  renderHiddenBoxFor('staff');
}

function renderHiddenBoxFor(view) {
  var elId = view==='owner' ? 'hidden-box-owner' : 'hidden-box-staff';
  var el = document.getElementById(elId);
  if (!el) return;

  // Determine which hidden tasks to show
  var hiddenIds = Object.keys(hiddenTasks).map(Number);
  var myHidden;
  if (curUser === 'latisha') {
    myHidden = hiddenIds.map(function(id){ return tasks.find(function(t){ return t.id===id; }); }).filter(Boolean);
  } else {
    myHidden = hiddenIds
      .filter(function(id){ return hiddenTasks[id] && hiddenTasks[id].by===curUser; })
      .map(function(id){ return tasks.find(function(t){ return t.id===id; }); }).filter(Boolean);
  }

  if (!myHidden.length) { el.style.display='none'; return; }
  el.style.display = 'block';

  var isOpen = !!hiddenBoxOpen[view];

  // Category filter
  var cats = ['All'].concat(Array.from(new Set(myHidden.map(function(t){ return t.category||'Admin'; }))).sort());
  var activeCat = el._catFilter || 'All';

  var filtered = activeCat==='All' ? myHidden : myHidden.filter(function(t){ return (t.category||'Admin')===activeCat; });

  var html = '<div class="hidden-box-hd" onclick="toggleHiddenBox(\''+view+'\')">'
    + '<span>✅ Completed / Hidden (' + myHidden.length + ')</span>'
    + '<span class="hb-arrow' + (isOpen?' open':'') + '">▾</span>'
    + '</div>';

  if (isOpen) {
    html += '<div class="hidden-box-body">';

    // Category pills
    html += '<div class="hb-filters">'
      + cats.map(function(c){
        return '<button class="hb-pill' + (c===activeCat?' on':'') + '" onclick="setHiddenCat(\''+view+'\',\''+c+'\');event.stopPropagation()">' + c + '</button>';
      }).join('') + '</div>';

    // Task list
    if (!filtered.length) {
      html += '<div style="color:var(--muted);font-size:13px;padding:12px 0">No completed tasks in this category.</div>';
    } else {
      filtered.forEach(function(t) {
        var h = hiddenTasks[t.id];
        var canUnhide = curUser==='latisha' || (h && h.by===curUser);
        // Always use the live staffNotes from the task (updated via staff modal)
        var displayNotes = t.staffNotes || (h && h.staffNotes) || '';
        // Time display
        var timeStr = '';
        if (t.hrsAllowed || t.hrsTaken) {
          timeStr = (t.hrsTaken ? t.hrsTaken+'h taken' : '') + (t.hrsAllowed ? (t.hrsTaken?' / ':'')+t.hrsAllowed+'h allowed' : '');
        }
        html += '<div class="hb-row">'
          + '<div class="hb-main">'
          + '<div class="hb-title">' + esc(t.title) + '</div>'
          + '<div class="hb-meta">'
          + (h&&h.completedDate ? '<span class="hb-date">📅 ' + h.completedDate + '</span>' : '')
          + (curUser==='latisha' && h && h.by ? '<span class="hb-who">by ' + cap(h.by) + '</span>' : '')
          + '<span class="hb-cat">' + esc(t.category||'Admin') + '</span>'
          + (timeStr ? '<span class="hb-time">⏱ ' + timeStr + '</span>' : '')
          + '</div>'
          + (displayNotes ? '<div class="hb-notes">' + esc(displayNotes) + '</div>' : '')
          + '</div>'
          + (canUnhide ? '<button class="hb-restore" onclick="unhideTask('+t.id+');event.stopPropagation()">Restore</button>' : '')
          + '</div>';
      });
    }
    html += '</div>';
  }

  el.innerHTML = html;
}

function toggleHiddenBox(view) {
  hiddenBoxOpen[view] = !hiddenBoxOpen[view];
  renderHiddenBox();
}
function setHiddenCat(view, cat) {
  var elId = view==='owner' ? 'hidden-box-owner' : 'hidden-box-staff';
  var el = document.getElementById(elId);
  if (el) el._catFilter = cat;
  renderHiddenBoxFor(view);
}



// ════════════════════════════════════════════════════════════════
// GOALS
// ════════════════════════════════════════════════════════════════
var goalIdSeq = 10;
var goalFilter = 'active';
var goals = [
  { id:1, title:'$364K Yearly Revenue', cat:'Revenue', desc:'$7k × 52 weeks — consistent weekly bookings', target:364000, current:0, unit:'$ AUD', deadline:'2025-12-31', status:'active' },
  { id:2, title:'10,000 Instagram Followers', cat:'Social Media / Growth', desc:'3–5 reels per week, celeb colour breakdowns', target:10000, current:0, unit:'followers', deadline:'', status:'active' },
  { id:3, title:'10,000 TikTok Followers', cat:'Social Media / Growth', desc:'Celeb colour breakdowns performing well', target:10000, current:0, unit:'followers', deadline:'', status:'active' },
  { id:4, title:'$7,000 Weeks Consistently', cat:'Revenue', desc:'23 clients per week at standard rate', target:7000, current:0, unit:'$ / week', deadline:'', status:'active' }
];

