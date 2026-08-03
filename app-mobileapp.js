// ═══════════════════════════════════════════════════
// APP — V2/V3 Ideas, Feedback, Brands Chart, Checklist
// (for the client-facing mobile app product)
// ═══════════════════════════════════════════════════

var appData = {
  ideas: [],
  feedback: [],
  checklist: {
    weekly: [
      {id:'w1', text:'Run the link audit', done:false},
      {id:'w2', text:'Style at least 40 looks (~5 hrs of work)', done:false},
      {id:'w3', text:'Check the mobile app and ensure all working well', done:false}
    ],
    monthly: [
      {id:'m1', text:'Check for gaps (e.g. not enough purple in all seasons, not enough shoes in autumn)', done:false}
    ]
  },
  lastWeeklyReset: '',
  lastMonthlyReset: ''
};

var appActiveTab    = 'ideas';     // ideas | feedback | brands | checklist
var appFeedbackTab  = 'positive';  // positive | negative
var appChecklistTab = 'weekly';    // weekly | monthly

var editingAppIdeaId    = null;
var editingFeedbackId   = null;
var editingAppStepId    = null;

function _appEnsureShape() {
  if (!appData.ideas) appData.ideas = [];
  if (!appData.feedback) appData.feedback = [];
  if (!appData.checklist) appData.checklist = { weekly: [], monthly: [] };
  if (!appData.checklist.weekly) appData.checklist.weekly = [];
  if (!appData.checklist.monthly) appData.checklist.monthly = [];
}

function appSetTab(tab) {
  appActiveTab = tab;
  renderAppPage();
}
function appSetFeedbackTab(tab) {
  appFeedbackTab = tab;
  renderAppPage();
}
function appSetChecklistTab(tab) {
  appChecklistTab = tab;
  renderAppPage();
}

function renderAppPage() {
  var el = document.getElementById('pg-app'); if (!el) return;
  _appEnsureShape();
  appCheckResets();

  ['ideas','feedback','brands','checklist'].forEach(function(t) {
    var sec = document.getElementById('app-sec-' + t);
    if (sec) sec.style.display = (t === appActiveTab) ? 'block' : 'none';
    var btn = document.getElementById('app-tab-' + t);
    if (btn) btn.classList.toggle('on', t === appActiveTab);
  });

  renderAppIdeas();
  renderAppFeedback();
  renderAppBrandsChartTab();
  renderAppChecklist();
}

// ══════════════════════════════════════
// V2/V3 IDEAS
// ══════════════════════════════════════

function openAppIdeaModal(id) {
  editingAppIdeaId = id;
  var idea = id ? appData.ideas.find(function(x){ return x.id === id; }) : null;
  document.getElementById('appideam-heading').textContent = idea ? 'Edit Idea' : 'New Idea';
  document.getElementById('appideam-title').value   = idea ? idea.title : '';
  document.getElementById('appideam-version').value = idea ? (idea.version || 'v2') : 'v2';
  document.getElementById('appideam-status').value  = idea ? (idea.status || 'backlog') : 'backlog';
  document.getElementById('appideam-desc').value    = idea ? (idea.desc || '') : '';
  document.getElementById('appideam-del').style.display = idea ? 'inline-block' : 'none';
  document.getElementById('appideam-err').textContent = '';
  document.getElementById('app-idea-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('appideam-title').focus(); }, 80);
}
function closeAppIdeaModal() { document.getElementById('app-idea-modal').style.display = 'none'; }
function saveAppIdeaModal() {
  var title = document.getElementById('appideam-title').value.trim();
  var err = document.getElementById('appideam-err');
  if (!title) { err.textContent = 'Title is required.'; return; }
  var obj = {
    id: editingAppIdeaId || Date.now(),
    title: title,
    version: document.getElementById('appideam-version').value,
    status: document.getElementById('appideam-status').value,
    desc: document.getElementById('appideam-desc').value.trim()
  };
  if (editingAppIdeaId) {
    var i = appData.ideas.findIndex(function(x){ return x.id === editingAppIdeaId; });
    if (i > -1) appData.ideas[i] = obj;
  } else {
    appData.ideas.push(obj);
  }
  closeAppIdeaModal(); saveData(); renderAppIdeas();
}
function deleteAppIdea(id) {
  if (!confirm('Delete this idea?')) return;
  appData.ideas = appData.ideas.filter(function(x){ return x.id !== id; });
  saveData(); renderAppIdeas();
}

var APP_IDEA_STATUS_COLORS = { backlog:'#9CA3AF', planned:'#3B82F6', 'in-progress':'#F59E0B', shipped:'#10B981' };
var APP_IDEA_STATUS_LABELS = { backlog:'Backlog', planned:'Planned', 'in-progress':'In Progress', shipped:'Shipped' };
var APP_IDEA_VERSION_COLORS = { v2:'#8B5CF6', v3:'#EC4899', someday:'#9CA3AF' };

function _appIdeaCard(idea) {
  var vCol = APP_IDEA_VERSION_COLORS[idea.version] || '#9CA3AF';
  var sCol = APP_IDEA_STATUS_COLORS[idea.status] || '#9CA3AF';
  var sLbl = APP_IDEA_STATUS_LABELS[idea.status] || idea.status;
  return '<div class="sopcard">'
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">'
    +   '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
    +     '<span style="font-size:10px;font-weight:700;color:white;background:'+vCol+';padding:2px 8px;border-radius:6px;text-transform:uppercase">'+esc(idea.version)+'</span>'
    +     '<span style="font-size:10px;font-weight:700;color:white;background:'+sCol+';padding:2px 8px;border-radius:6px">'+esc(sLbl)+'</span>'
    +   '</div>'
    +   '<div style="display:flex;gap:6px;flex-shrink:0">'
    +     '<button class="fin-row-edit" onclick="openAppIdeaModal('+idea.id+')">Edit</button>'
    +     '<button class="fin-row-edit" onclick="deleteAppIdea('+idea.id+')" style="color:#EF4444">Del</button>'
    +   '</div>'
    + '</div>'
    + '<div class="soptit">'+esc(idea.title)+'</div>'
    + (idea.desc ? '<div class="sopdesc" style="margin-bottom:0">'+esc(idea.desc)+'</div>' : '')
    + '</div>';
}

function renderAppIdeas() {
  var el = document.getElementById('app-ideas-content'); if (!el) return;
  if (!appData.ideas.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:40px 0;text-align:center">No ideas yet — click + Add Idea to start the backlog.</div>';
    return;
  }
  el.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">'
    + appData.ideas.map(_appIdeaCard).join('')
    + '</div>';
}

// ══════════════════════════════════════
// FEEDBACK (Positive / Negative)
// ══════════════════════════════════════

function openFeedbackModal(id) {
  editingFeedbackId = id;
  var f = id ? appData.feedback.find(function(x){ return x.id === id; }) : null;
  document.getElementById('fbm-heading').textContent = f ? 'Edit Feedback' : 'New ' + (cap(appFeedbackTab)) + ' Feedback';
  document.getElementById('fbm-sentiment').value = f ? f.sentiment : appFeedbackTab;
  document.getElementById('fbm-text').value   = f ? (f.text || '')   : '';
  document.getElementById('fbm-source').value = f ? (f.source || '') : '';
  document.getElementById('fbm-date').value   = f ? (f.date || '')   : new Date().toISOString().slice(0,10);
  document.getElementById('fbm-del').style.display = f ? 'inline-block' : 'none';
  document.getElementById('fbm-err').textContent = '';
  document.getElementById('feedback-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('fbm-text').focus(); }, 80);
}
function closeFeedbackModal() { document.getElementById('feedback-modal').style.display = 'none'; }
function saveFeedbackModal() {
  var text = document.getElementById('fbm-text').value.trim();
  var err = document.getElementById('fbm-err');
  if (!text) { err.textContent = 'Feedback text is required.'; return; }
  var obj = {
    id: editingFeedbackId || Date.now(),
    sentiment: document.getElementById('fbm-sentiment').value,
    text: text,
    source: document.getElementById('fbm-source').value.trim(),
    date: document.getElementById('fbm-date').value
  };
  if (editingFeedbackId) {
    var i = appData.feedback.findIndex(function(x){ return x.id === editingFeedbackId; });
    if (i > -1) appData.feedback[i] = obj;
  } else {
    appData.feedback.push(obj);
  }
  closeFeedbackModal(); saveData(); renderAppFeedback();
}
function deleteFeedback(id) {
  if (!confirm('Delete this feedback entry?')) return;
  appData.feedback = appData.feedback.filter(function(x){ return x.id !== id; });
  saveData(); renderAppFeedback();
}

function _appFeedbackRow(f) {
  return '<div class="fin-row" style="align-items:flex-start">'
    + '<div class="fin-row-name">'
    +   esc(f.text)
    +   '<div style="font-size:10px;color:var(--muted);margin-top:3px">'+(f.source?esc(f.source)+' &middot; ':'')+esc(f.date||'')+'</div>'
    + '</div>'
    + '<button class="fin-row-edit" onclick="openFeedbackModal('+f.id+')">Edit</button>'
    + '<button class="fin-row-edit" onclick="deleteFeedback('+f.id+')" style="color:#EF4444">Del</button>'
    + '</div>';
}

function renderAppFeedback() {
  var el = document.getElementById('app-feedback-content'); if (!el) return;
  ['positive','negative'].forEach(function(t) {
    var btn = document.getElementById('app-fb-tab-' + t);
    if (btn) btn.classList.toggle('on', t === appFeedbackTab);
  });
  var list = appData.feedback.filter(function(f){ return f.sentiment === appFeedbackTab; })
    .sort(function(a,b){ return (b.date||'') > (a.date||'') ? 1 : -1; });
  var addBtn = document.getElementById('app-fb-add-btn');
  if (addBtn) addBtn.textContent = '+ Add ' + cap(appFeedbackTab) + ' Feedback';
  if (!list.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px 0;text-align:center">No '+appFeedbackTab+' feedback logged yet.</div>';
    return;
  }
  el.innerHTML = '<div class="fin-cat-block"><div class="fin-cat-body" style="padding-top:8px">'+list.map(_appFeedbackRow).join('')+'</div></div>';
}

// ══════════════════════════════════════
// BRANDS CHART (placeholder — data source TBC)
// ══════════════════════════════════════

function renderAppBrandsChartTab() {
  var el = document.getElementById('app-brands-content'); if (!el) return;
  el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:60px 20px;text-align:center;border:1px dashed var(--sand);border-radius:12px">'
    + 'Brands Chart — coming soon.<br><span style="font-size:12px">This will show brand data once it\'s connected.</span>'
    + '</div>';
}

// ══════════════════════════════════════
// CHECKLIST (Weekly / Monthly, auto-reset)
// ══════════════════════════════════════

function _appWeekStartISO(d) {
  d = d || new Date();
  var day = d.getDay();
  var monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (day===0?6:day-1));
  return monday.toISOString().slice(0,10);
}
function _appMonthStartISO(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-01';
}
function appCheckResets() {
  var changed = false;
  var wk = _appWeekStartISO();
  if (appData.lastWeeklyReset !== wk) {
    appData.checklist.weekly.forEach(function(s){ s.done = false; });
    appData.lastWeeklyReset = wk;
    changed = true;
  }
  var mo = _appMonthStartISO();
  if (appData.lastMonthlyReset !== mo) {
    appData.checklist.monthly.forEach(function(s){ s.done = false; });
    appData.lastMonthlyReset = mo;
    changed = true;
  }
  if (changed) saveData();
}

function appChecklistToggle(period, id) {
  var arr = appData.checklist[period] || [];
  var step = arr.find(function(s){ return s.id === id; });
  if (step) step.done = !step.done;
  saveData(); renderAppChecklist();
}

function openAppStepModal(period, id) {
  editingAppStepId = id;
  var arr = appData.checklist[period] || [];
  var step = id ? arr.find(function(x){ return x.id === id; }) : null;
  document.getElementById('appstepm-heading').textContent = (step ? 'Edit' : 'New') + ' ' + cap(period) + ' Step';
  document.getElementById('appstepm-period').value = period;
  document.getElementById('appstepm-text').value = step ? step.text : '';
  document.getElementById('appstepm-del').style.display = step ? 'inline-block' : 'none';
  document.getElementById('appstepm-err').textContent = '';
  document.getElementById('appstep-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('appstepm-text').focus(); }, 80);
}
function closeAppStepModal() { document.getElementById('appstep-modal').style.display = 'none'; }
function saveAppStepModal() {
  var text = document.getElementById('appstepm-text').value.trim();
  var err = document.getElementById('appstepm-err');
  if (!text) { err.textContent = 'Step text is required.'; return; }
  var period = document.getElementById('appstepm-period').value;
  var arr = appData.checklist[period];
  if (editingAppStepId) {
    var i = arr.findIndex(function(x){ return x.id === editingAppStepId; });
    if (i > -1) arr[i].text = text;
  } else {
    arr.push({ id: 'st'+Date.now(), text: text, done: false });
  }
  closeAppStepModal(); saveData(); renderAppChecklist();
}
function deleteAppStep() {
  if (!editingAppStepId || !confirm('Delete this checklist step?')) return;
  var period = document.getElementById('appstepm-period').value;
  appData.checklist[period] = appData.checklist[period].filter(function(x){ return x.id !== editingAppStepId; });
  closeAppStepModal(); saveData(); renderAppChecklist();
}

function renderAppChecklist() {
  var el = document.getElementById('app-checklist-content'); if (!el) return;
  ['weekly','monthly'].forEach(function(t) {
    var btn = document.getElementById('app-cl-tab-' + t);
    if (btn) btn.classList.toggle('on', t === appChecklistTab);
  });
  var addBtn = document.getElementById('app-cl-add-btn');
  if (addBtn) addBtn.setAttribute('onclick', "openAppStepModal('"+appChecklistTab+"',null)");

  var steps = appData.checklist[appChecklistTab] || [];
  var doneCount = steps.filter(function(s){ return s.done; }).length;

  var summary = '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">'
    + (appChecklistTab === 'weekly' ? 'Resets every Monday' : 'Resets on the 1st of the month')
    + ' &middot; ' + doneCount + ' / ' + steps.length + ' done'
    + '</div>';

  var rows = steps.map(function(s) {
    return '<div class="titem" style="padding:10px 0;border-bottom:1px solid var(--sand)">'
      + '<div style="display:flex;align-items:center;gap:10px;width:100%">'
      +   '<div class="tck'+(s.done?' done':'')+'" onclick="appChecklistToggle(\''+appChecklistTab+'\',\''+s.id+'\')" style="cursor:pointer"></div>'
      +   '<div class="ttx'+(s.done?' done':'')+'" style="flex:1">'+esc(s.text)+'</div>'
      +   '<button class="fin-row-edit" onclick="openAppStepModal(\''+appChecklistTab+'\',\''+s.id+'\')">Edit</button>'
      + '</div>'
      + '</div>';
  }).join('') || '<div style="color:var(--muted);font-size:13px;padding:12px 0">No steps yet — click + Add Step.</div>';

  el.innerHTML = summary + rows;
}
