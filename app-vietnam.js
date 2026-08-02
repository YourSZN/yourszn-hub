// ══ Vietnam Tour — Clients (Interested / Booked) + per-client Onboarding ══

var vtClientSubTab   = 'booked';   // 'interested' | 'booked'
var vtExpandedClient = null;       // e.g. 'booked-0' — which client card is expanded

// status a client was left on under the old single-dropdown system → how many
// leading template steps to treat as already done when first migrating them.
var VT_STATUS_STEP_MAP = {
  'Booked':           2,
  'Colour Analysis':  2,
  'First Meeting':    3,
  'Second Meeting':   4,
  'Final Payment':    5,
  'Complete':         6
};

var VT_DEFAULT_INT_TEMPLATE = [
  {id:'oi1', text:'Send info pack', notes:''},
  {id:'oi2', text:'Answer questions / consult call', notes:''},
  {id:'oi3', text:'Confirm deposit & convert to booked', notes:''}
];

// vtData is loaded wholesale from the cloud, so fields added to the default seed after a
// user's first save (like this template) never arrive on existing data — backfill it here.
function _vtEnsureTemplates() {
  var changed = false;
  if (!vtData.intOnboardingTemplate) { vtData.intOnboardingTemplate = VT_DEFAULT_INT_TEMPLATE.map(function(s){ return Object.assign({}, s); }); changed = true; }
  if (!vtData.onboardingSop) { vtData.onboardingSop = []; changed = true; }
  return changed;
}

function vtSetClientSubTab(tab) {
  vtClientSubTab = tab;
  vtExpandedClient = null;
  renderVietnamTour();
}

function vtToggleClientExpand(key) {
  vtExpandedClient = (vtExpandedClient === key) ? null : key;
  renderVietnamTour();
}

function _vtCloneTemplate(template) {
  return (template || []).map(function(s, i) {
    return { id: 'st' + Date.now() + '_' + i, text: s.text, notes: s.notes || '', done: false };
  });
}

// Lazily seeds client.onboarding from the right template the first time a client is
// rendered. Booked clients migrate their old status-dropdown value into completed steps
// so existing progress (e.g. Naomi already at "Second Meeting") isn't lost.
function vtEnsureOnboarding(list) {
  var arr = list === 'booked' ? (vtData.bookedClients || []) : (vtData.intClients || []);
  var template = list === 'booked' ? vtData.onboardingSop : vtData.intOnboardingTemplate;
  var changed = false;
  arr.forEach(function(c) {
    if (!c.onboarding) {
      c.onboarding = _vtCloneTemplate(template);
      if (list === 'booked' && c.status && VT_STATUS_STEP_MAP[c.status]) {
        var doneCount = VT_STATUS_STEP_MAP[c.status];
        for (var i = 0; i < doneCount && i < c.onboarding.length; i++) c.onboarding[i].done = true;
      }
      changed = true;
    }
  });
  return changed;
}

function vtClientStepToggle(list, idx, stepId) {
  var arr = list === 'booked' ? (vtData.bookedClients || []) : (vtData.intClients || []);
  var c = arr[idx]; if (!c || !c.onboarding) return;
  var step = c.onboarding.find(function(s){ return s.id === stepId; });
  if (step) step.done = !step.done;
  vtSave(); renderVietnamTour();
}

function _vtClientCard(list, c, idx) {
  var steps = c.onboarding || [];
  var doneCount = steps.filter(function(s){ return s.done; }).length;
  var total = steps.length;
  var pct = total > 0 ? Math.round(doneCount / total * 100) : 0;
  var nextStep = steps.find(function(s){ return !s.done; });
  var key = list + '-' + idx;
  var isOpen = vtExpandedClient === key;
  var isComplete = total > 0 && doneCount === total;

  var progressLine = total
    ? (isComplete
        ? '&#10003; All steps complete'
        : doneCount + ' / ' + total + ' steps' + (nextStep ? ' &middot; Next: ' + esc(nextStep.text) : ''))
    : 'No checklist steps yet';

  var stepsHtml = steps.map(function(s) {
    return '<div class="titem" style="padding:8px 0;border-bottom:1px solid var(--sand)">'
      + '<div style="display:flex;align-items:center;gap:10px;width:100%">'
      +   '<div class="tck'+(s.done?' done':'')+'" onclick="vtClientStepToggle(\''+list+'\','+idx+',\''+s.id+'\')" style="cursor:pointer"></div>'
      +   '<div style="flex:1;min-width:0">'
      +     '<div class="ttx'+(s.done?' done':'')+'">'+esc(s.text)+'</div>'
      +     (s.notes ? '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+esc(s.notes)+'</div>' : '')
      +   '</div>'
      + '</div>'
      + '</div>';
  }).join('') || '<div style="color:var(--muted);font-size:12px;padding:8px 0">No checklist steps yet — edit the template above to add some.</div>';

  return '<div class="tour-doc-row" style="flex-wrap:wrap;flex-direction:column;align-items:stretch">'
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;width:100%;gap:8px">'
    +   '<div style="flex:1;min-width:0">'
    +     '<div style="font-size:13px;font-weight:600;color:var(--charcoal)">'+esc(c.name)+(c.partner?' <span style="font-weight:400;color:var(--muted)">&amp; '+esc(c.partner)+'</span>':'')+'</div>'
    +     (c.package?'<span style="font-size:10px;background:var(--rose);color:#fff;padding:2px 8px;border-radius:10px;display:inline-block;margin-top:3px">'+esc(c.package)+'</span>':'')
    +     (c.contract?'&nbsp;<a href="'+esc(c.contract)+'" target="_blank" style="font-size:11px;color:var(--rose);font-weight:600;text-decoration:none">&#128196; Contract</a>':'')
    +     (c.notes?'<div style="font-size:11px;color:var(--muted);margin-top:3px">'+esc(c.notes)+'</div>':'')
    +   '</div>'
    +   '<div style="display:flex;gap:6px;flex-shrink:0">'
    +     '<button class="fin-row-edit" onclick="vtEditClient(\''+list+'\','+idx+')">Edit</button>'
    +     '<button class="fin-row-edit" onclick="vtDeleteClient(\''+list+'\','+idx+')" style="color:#EF4444">Del</button>'
    +   '</div>'
    + '</div>'
    + '<div onclick="vtToggleClientExpand(\''+key+'\')" style="width:100%;cursor:pointer;margin-top:8px;padding-top:8px;border-top:1px solid var(--sand);display:flex;align-items:center;justify-content:space-between">'
    +   '<div style="flex:1;min-width:0">'
    +     '<div style="font-size:12px;font-weight:600;color:'+(isComplete?'#10B981':'var(--charcoal)')+'">'+progressLine+'</div>'
    +     (total ? '<div style="background:var(--warm);border-radius:20px;height:5px;overflow:hidden;margin-top:5px;max-width:220px"><div style="background:'+(isComplete?'#10B981':'var(--charcoal)')+';height:100%;width:'+pct+'%;border-radius:20px"></div></div>' : '')
    +   '</div>'
    +   '<span style="font-size:11px;color:var(--muted);flex-shrink:0;margin-left:8px">'+(isOpen?'Hide &#9650;':'Show &#9660;')+'</span>'
    + '</div>'
    + (isOpen ? '<div style="width:100%;margin-top:8px">'+stepsHtml+'</div>' : '')
    + '</div>';
}

function renderVtClientsTab() {
  var templatesChanged = _vtEnsureTemplates();
  var bookedChanged = vtEnsureOnboarding('booked');
  var intChanged    = vtEnsureOnboarding('int');
  if (templatesChanged || bookedChanged || intChanged) vtSave();

  var bookedList = vtData.bookedClients || [];
  var intList    = vtData.intClients || [];
  var activeList = vtClientSubTab === 'booked' ? bookedList : intList;
  var listKey    = vtClientSubTab === 'booked' ? 'booked' : 'int';
  var templateKey = vtClientSubTab === 'booked' ? 'onboardingSop' : 'intOnboardingTemplate';
  var templateLabel = vtClientSubTab === 'booked' ? 'Booked Onboarding' : 'Interested Checklist';

  var subtabBar = '<div style="display:flex;gap:8px;margin-bottom:18px">'
    + '<button class="vt-tab'+(vtClientSubTab==='interested'?' on':'')+'" onclick="vtSetClientSubTab(\'interested\')">Interested ('+intList.length+')</button>'
    + '<button class="vt-tab'+(vtClientSubTab==='booked'?' on':'')+'" onclick="vtSetClientSubTab(\'booked\')">Booked ('+bookedList.length+')</button>'
    + '</div>';

  var rows = activeList.map(function(c, i) { return _vtClientCard(listKey, c, i); }).join('')
    || '<div style="color:var(--muted);font-size:13px;padding:10px 0">No '+(vtClientSubTab==='booked'?'booked':'interested')+' clients yet.</div>';

  var panel = '<div class="card"><div class="ch" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'
    + '<div class="ct">'+(vtClientSubTab==='booked'?'Booked Clients':'Interested Clients')+'</div>'
    + '<div style="display:flex;gap:8px">'
    +   '<button class="fin-row-edit" onclick="openVtObModal(\''+templateKey+'\',null)">Edit '+templateLabel+' Template</button>'
    +   '<button class="btn btnp" style="font-size:12px;padding:6px 14px" onclick="vtEditClient(\''+listKey+'\',null)">+ Add</button>'
    + '</div>'
    + '</div><div class="cb scrl">'+rows+'</div></div>';

  return subtabBar + panel;
}

// ── Onboarding template editor (shared modal, scoped by template key) ──
var _vtObTemplateKey = 'onboardingSop';
var _vtObEditId = null;

function openVtObModal(templateKey, id) {
  _vtObTemplateKey = templateKey;
  _vtObEditId = id;
  var template = vtData[templateKey] || [];
  var item = id ? template.find(function(x){ return x.id === id; }) : null;
  document.getElementById('vtob-heading').textContent = (item ? 'Edit Step — ' : 'Add Step — ') + (templateKey === 'onboardingSop' ? 'Booked Onboarding' : 'Interested Checklist');
  document.getElementById('vtob-text').value  = item ? (item.text||'')  : '';
  document.getElementById('vtob-notes').value = item ? (item.notes||'') : '';
  document.getElementById('vtob-del').style.display = item ? 'inline-block' : 'none';
  document.getElementById('vtob-err').textContent = '';
  document.getElementById('vtob-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('vtob-text').focus(); },80);
}
function closeVtObModal() { document.getElementById('vtob-modal').style.display='none'; }
function saveVtObModal() {
  var text = document.getElementById('vtob-text').value.trim();
  if (!text) { document.getElementById('vtob-err').textContent='Step text required.'; return; }
  if (!vtData[_vtObTemplateKey]) vtData[_vtObTemplateKey] = [];
  var template = vtData[_vtObTemplateKey];
  var obj = { id: _vtObEditId || 'st'+Date.now(), text: text, notes: document.getElementById('vtob-notes').value.trim() };
  if (_vtObEditId) {
    var idx = template.findIndex(function(x){return x.id===_vtObEditId;});
    if (idx>-1) template[idx] = obj;
  } else {
    template.push(obj);
  }
  closeVtObModal(); vtSave(); renderVietnamTour();
}
function deleteVtObStep(id) {
  var template = vtData[_vtObTemplateKey] || [];
  vtData[_vtObTemplateKey] = template.filter(function(x){return x.id!==id;});
  closeVtObModal(); vtSave(); renderVietnamTour();
}
