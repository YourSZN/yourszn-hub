// ═══════════════════════════════════════════════════
// PLAN — Goals, Client Avatars, Customer Flow, Workflows
// (owner-only tab)
// ═══════════════════════════════════════════════════

var clientAvatars = [];          // up to 3 persona objects, indexed by slot
var customerFlow  = [];          // [{id, title, desc, link}] ordered stages

var planActiveTab = 'goals';
var _goalEditId  = null;
var _flowEditId  = null;

function setPlanTab(tab) {
  planActiveTab = tab;
  ['goals','avatar','flow','workflow'].forEach(function(t) {
    var sec = document.getElementById('plan-sec-' + t);
    if (sec) sec.style.display = (t === tab) ? 'block' : 'none';
    var btn = document.getElementById('plan-tab-' + t);
    if (btn) btn.classList.toggle('on', t === tab);
  });
}

function renderPlanPage() {
  var pg = document.getElementById('pg-plan');
  if (!pg) return;
  renderGoals();
  renderAvatars();
  renderFlowSection();
  renderWorkflowsPage();
  setPlanTab(planActiveTab);
}

// ══════════════════════════════════════
// GOALS
// ══════════════════════════════════════

function openGoalModal(id, horizon) {
  _goalEditId = id;
  var g = id ? goals.find(function(x){ return x.id === id; }) : null;
  document.getElementById('goalm-heading').textContent = g ? 'Edit Goal' : 'New Goal';
  document.getElementById('goalm-horizon').value  = g ? (g.horizon || horizon) : horizon;
  document.getElementById('goalm-title').value    = g ? (g.title || '') : '';
  document.getElementById('goalm-target').value   = g && g.target   !== undefined ? g.target  : '';
  document.getElementById('goalm-current').value  = g && g.current !== undefined ? g.current : '';
  document.getElementById('goalm-unit').value     = g ? (g.unit || '') : '';
  document.getElementById('goalm-deadline').value = g ? (g.deadline || '') : '';
  document.getElementById('goalm-notes').value    = g ? (g.notes || g.desc || '') : '';
  document.getElementById('goalm-del').style.display = g ? 'inline-block' : 'none';
  document.getElementById('goalm-err').textContent = '';
  document.getElementById('goal-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('goalm-title').focus(); }, 80);
}
function closeGoalModal() {
  document.getElementById('goal-modal').style.display = 'none';
}
function saveGoalModal() {
  var title = document.getElementById('goalm-title').value.trim();
  if (!title) { document.getElementById('goalm-err').textContent = 'Title is required.'; return; }
  var obj = {
    id:       _goalEditId || (goalIdSeq++),
    horizon:  document.getElementById('goalm-horizon').value,
    title:    title,
    target:   Number(document.getElementById('goalm-target').value)  || 0,
    current:  Number(document.getElementById('goalm-current').value) || 0,
    unit:     document.getElementById('goalm-unit').value.trim(),
    deadline: document.getElementById('goalm-deadline').value,
    notes:    document.getElementById('goalm-notes').value.trim()
  };
  if (_goalEditId) {
    var i = goals.findIndex(function(x){ return x.id === _goalEditId; });
    if (i > -1) goals[i] = obj; else goals.push(obj);
  } else {
    goals.push(obj);
  }
  closeGoalModal(); saveData(); renderGoals();
}
function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  goals = goals.filter(function(x){ return x.id !== id; });
  saveData(); renderGoals();
}

function _goalCard(g, horizon) {
  var pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
  var deadlineLbl = g.deadline ? new Date(g.deadline + 'T00:00:00').toLocaleDateString('en-AU', {day:'numeric', month:'short', year:'numeric'}) : '';
  var notes = g.notes || g.desc || '';
  return '<div class="sopcard">'
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">'
    +   '<div class="soptit" style="margin-bottom:0">' + esc(g.title) + '</div>'
    +   '<div style="display:flex;gap:6px;flex-shrink:0">'
    +     '<button class="fin-row-edit" onclick="openGoalModal(' + g.id + ',\'' + horizon + '\')">Edit</button>'
    +     '<button class="fin-row-edit" onclick="deleteGoal(' + g.id + ')" style="color:#EF4444">Del</button>'
    +   '</div>'
    + '</div>'
    + (g.target ? (
        '<div style="background:var(--warm);border-radius:20px;height:8px;overflow:hidden;margin-bottom:6px">'
        + '<div style="background:var(--charcoal);height:100%;width:' + pct + '%;border-radius:20px"></div>'
        + '</div>'
        + '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">' + esc(String(g.current)) + ' / ' + esc(String(g.target)) + ' ' + esc(g.unit || '') + ' &mdash; ' + pct + '%</div>'
      ) : '')
    + (deadlineLbl ? '<div style="font-size:11px;color:var(--muted);margin-bottom:6px">&#128197; Due ' + deadlineLbl + '</div>' : '')
    + (notes ? '<div class="sopdesc" style="margin-bottom:0">' + esc(notes) + '</div>' : '')
    + '</div>';
}

function renderGoals() {
  ['3month','6month','longterm'].forEach(function(horizon) {
    var el = document.getElementById('goals-list-' + horizon);
    if (!el) return;
    var list = (goals || []).filter(function(g) {
      return g.horizon === horizon || (!g.horizon && horizon === 'longterm');
    });
    if (!list.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:13px">No goals yet.</div>';
      return;
    }
    el.innerHTML = list.map(function(g){ return _goalCard(g, horizon); }).join('');
  });
}

// ══════════════════════════════════════
// AVATAR
// ══════════════════════════════════════

function openAvatarModal(slot) {
  var a = clientAvatars[slot] || {};
  document.getElementById('avatarm-heading').textContent = 'Client Avatar ' + (slot + 1);
  document.getElementById('avatarm-slot').value       = slot;
  document.getElementById('avatarm-name').value       = a.name       || '';
  document.getElementById('avatarm-demo').value       = a.demo       || '';
  document.getElementById('avatarm-lifestyle').value  = a.lifestyle  || '';
  document.getElementById('avatarm-pains').value      = a.pains      || '';
  document.getElementById('avatarm-goals').value      = a.goals      || '';
  document.getElementById('avatarm-hangouts').value   = a.hangouts   || '';
  document.getElementById('avatarm-triggers').value   = a.triggers   || '';
  document.getElementById('avatarm-notes').value      = a.notes      || '';
  document.getElementById('avatarm-clear').style.display = a.name ? 'inline-block' : 'none';
  document.getElementById('avatar-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('avatarm-name').focus(); }, 80);
}
function closeAvatarModal() {
  document.getElementById('avatar-modal').style.display = 'none';
}
function saveAvatarModal() {
  var slot = Number(document.getElementById('avatarm-slot').value);
  clientAvatars[slot] = {
    name:      document.getElementById('avatarm-name').value.trim(),
    demo:      document.getElementById('avatarm-demo').value.trim(),
    lifestyle: document.getElementById('avatarm-lifestyle').value.trim(),
    pains:     document.getElementById('avatarm-pains').value.trim(),
    goals:     document.getElementById('avatarm-goals').value.trim(),
    hangouts:  document.getElementById('avatarm-hangouts').value.trim(),
    triggers:  document.getElementById('avatarm-triggers').value.trim(),
    notes:     document.getElementById('avatarm-notes').value.trim()
  };
  closeAvatarModal(); saveData(); renderAvatars();
}
function clearAvatar(slot) {
  if (!confirm('Clear this avatar?')) return;
  clientAvatars[slot] = null;
  saveData(); renderAvatars();
}

function renderAvatars() {
  var grid = document.getElementById('avatar-grid');
  if (!grid) return;
  var html = '';
  for (var i = 0; i < 3; i++) {
    var a = clientAvatars[i];
    if (a && a.name) {
      html += '<div class="sopcard">'
        + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">'
        +   '<div><div class="sopcat">Avatar ' + (i + 1) + '</div><div class="soptit">' + esc(a.name) + '</div></div>'
        +   '<button class="fin-row-edit" onclick="openAvatarModal(' + i + ')">Edit</button>'
        + '</div>'
        + (a.demo      ? '<div class="sopdesc"><strong>Who:</strong> ' + esc(a.demo) + (a.lifestyle ? ' — ' + esc(a.lifestyle) : '') + '</div>' : '')
        + (a.pains     ? '<div class="sopdesc"><strong>Pain points:</strong> ' + esc(a.pains) + '</div>' : '')
        + (a.goals     ? '<div class="sopdesc"><strong>Goals:</strong> ' + esc(a.goals) + '</div>' : '')
        + (a.hangouts  ? '<div class="sopdesc"><strong>Hangs out:</strong> ' + esc(a.hangouts) + '</div>' : '')
        + (a.triggers  ? '<div class="sopdesc"><strong>Books when:</strong> ' + esc(a.triggers) + '</div>' : '')
        + (a.notes     ? '<div class="sopdesc">' + esc(a.notes) + '</div>' : '')
        + '</div>';
    } else {
      html += '<div class="sopcard" style="display:flex;align-items:center;justify-content:center;min-height:160px;border-style:dashed">'
        + '<button class="btn btnp" onclick="openAvatarModal(' + i + ')">+ Add Avatar ' + (i + 1) + '</button>'
        + '</div>';
    }
  }
  grid.innerHTML = html;
}

// ══════════════════════════════════════
// FLOW — customer journey
// ══════════════════════════════════════

function openFlowModal(id) {
  _flowEditId = id;
  var s = id ? customerFlow.find(function(x){ return x.id === id; }) : null;
  document.getElementById('flowm-heading').textContent = s ? 'Edit Stage' : 'New Stage';
  document.getElementById('flowm-title').value = s ? (s.title || '') : '';
  document.getElementById('flowm-desc').value  = s ? (s.desc  || '') : '';
  document.getElementById('flowm-link').value  = s ? (s.link  || '') : '';
  document.getElementById('flowm-del').style.display = s ? 'inline-block' : 'none';
  document.getElementById('flowm-err').textContent = '';
  document.getElementById('flow-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('flowm-title').focus(); }, 80);
}
function closeFlowModal() {
  document.getElementById('flow-modal').style.display = 'none';
}
function saveFlowModal() {
  var title = document.getElementById('flowm-title').value.trim();
  if (!title) { document.getElementById('flowm-err').textContent = 'Stage title is required.'; return; }
  var obj = {
    id:    _flowEditId || Date.now(),
    title: title,
    desc:  document.getElementById('flowm-desc').value.trim(),
    link:  document.getElementById('flowm-link').value.trim()
  };
  if (_flowEditId) {
    var i = customerFlow.findIndex(function(x){ return x.id === _flowEditId; });
    if (i > -1) customerFlow[i] = obj;
  } else {
    customerFlow.push(obj);
  }
  closeFlowModal(); saveData(); renderFlowSection();
}
function deleteFlowStage(id) {
  if (!confirm('Delete this stage?')) return;
  customerFlow = customerFlow.filter(function(x){ return x.id !== id; });
  saveData(); renderFlowSection();
}
function moveFlowStage(id, dir) {
  var i = customerFlow.findIndex(function(x){ return x.id === id; });
  if (i === -1) return;
  var j = i + dir;
  if (j < 0 || j >= customerFlow.length) return;
  var tmp = customerFlow[i]; customerFlow[i] = customerFlow[j]; customerFlow[j] = tmp;
  saveData(); renderFlowSection();
}

function renderFlowSection() {
  var wrap  = document.getElementById('flow-stages');
  var empty = document.getElementById('flow-empty');
  if (!wrap) return;
  if (!customerFlow.length) { wrap.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  wrap.innerHTML = customerFlow.map(function(s, idx) {
    var isFirst = idx === 0, isLast = idx === customerFlow.length - 1;
    return '<div style="display:flex;align-items:stretch;gap:0">'
      + '<div style="display:flex;flex-direction:column;align-items:center;margin-right:14px;flex-shrink:0">'
      +   '<div style="width:30px;height:30px;border-radius:50%;background:var(--charcoal);color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">' + (idx + 1) + '</div>'
      +   (isLast ? '' : '<div style="flex:1;width:2px;background:var(--sand);min-height:24px"></div>')
      + '</div>'
      + '<div class="sopcard" style="flex:1;margin-bottom:16px">'
      +   '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px">'
      +     '<div class="soptit" style="margin-bottom:0">' + esc(s.title) + '</div>'
      +     '<div style="display:flex;gap:6px;flex-shrink:0">'
      +       '<button class="fin-row-edit" onclick="moveFlowStage(' + s.id + ',-1)" ' + (isFirst ? 'disabled style="opacity:.3"' : '') + '>&#8593;</button>'
      +       '<button class="fin-row-edit" onclick="moveFlowStage(' + s.id + ',1)" '  + (isLast  ? 'disabled style="opacity:.3"' : '') + '>&#8595;</button>'
      +       '<button class="fin-row-edit" onclick="openFlowModal(' + s.id + ')">Edit</button>'
      +       '<button class="fin-row-edit" onclick="deleteFlowStage(' + s.id + ')" style="color:#EF4444">Del</button>'
      +     '</div>'
      +   '</div>'
      +   (s.desc ? '<div class="sopdesc">' + esc(s.desc) + '</div>' : '')
      +   (s.link ? '<a href="' + esc(s.link) + '" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent);word-break:break-all">' + esc(s.link) + '</a>' : '')
      + '</div>'
      + '</div>';
  }).join('');
}
