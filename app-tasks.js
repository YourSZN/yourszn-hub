// ════════════════════════════════════════════════════════════════
// TASK COMPLETION, HIDING & NOTIFICATIONS
// ════════════════════════════════════════════════════════════════

// Called when staff clicks ✓ Done — marks status=done, prompts to hide
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
  var taskId = document.getElementById('hm-task-id').value;
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
  .filter(function(id){ return hiddenTasks[id] && tasks.find(function(t){ return t.id===id && t.assignedTo===curUser; }); })
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
  saveData();
}

function setGoalStatus(id, status) {
    var g = goals.find(function(x){ return x.id===id; }); if (!g) return;
    g.status = status; saveData(); renderGoals();
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
  closeGoalModal(); saveData(); renderGoals();
}

function deleteGoal() {
  var id = parseInt(document.getElementById('gm-id').value);
  if (!id || !confirm('Delete this goal?')) return;
  goals = goals.filter(function(g){ return g.id!==id; });
  closeGoalModal(); saveData(); renderGoals();
}


