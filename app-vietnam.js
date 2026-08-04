// ══ Vietnam Tour — Clients (Interested / Booked) + per-client Onboarding ══

var vtClientSubTab   = 'booked';   // 'interested' | 'booked'
var vtExpandedClient = null;       // e.g. 'booked-0' — which client card is expanded
var vtClientDetailTab   = {};      // key -> 'checklist' | 'info' | 'lookbook'
var vtClientInfoCache    = {};     // portalId -> { info, documents }
var vtClientLookbookCache = {};    // email (lowercased) -> { client, items } | { notFound: true }

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
  // Only push to the portal record if this client has already been synced there
  // (i.e. saved at least once via the Add/Edit modal) — avoids creating a
  // duplicate/incomplete record from a checklist tick alone.
  if (c.portalId) syncVtClientToPortal(c, list);
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

  return '<div class="tour-doc-row" style="flex-wrap:wrap;flex-direction:column;align-items:stretch'+(isOpen?';box-shadow:0 0 0 2px var(--charcoal) inset':'')+'">'
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
    +   '<span style="font-size:11px;color:var(--charcoal);font-weight:600;flex-shrink:0;margin-left:8px">View Details &#8594;</span>'
    + '</div>'
    + '</div>';
}

function vtStepsHtml(list, idx, c) {
  var steps = c.onboarding || [];
  return steps.map(function(s) {
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
}

function vtFindExpandedClient() {
  if (!vtExpandedClient) return null;
  var i = vtExpandedClient.lastIndexOf('-');
  var list = vtExpandedClient.slice(0, i);
  var idx = parseInt(vtExpandedClient.slice(i + 1), 10);
  var arr = list === 'booked' ? (vtData.bookedClients || []) : (vtData.intClients || []);
  var c = arr[idx];
  return c ? { list: list, idx: idx, c: c } : null;
}

function vtCloseClientDetailModal() {
  vtExpandedClient = null;
  renderVietnamTour();
}

function vtSetClientDetailTab(key, tab) {
  vtClientDetailTab[key] = tab;
  renderVietnamTour();
}

function vtClientDetailModalHtml() {
  var found = vtFindExpandedClient();
  if (!found) return '';
  var list = found.list, idx = found.idx, c = found.c;
  var key = list + '-' + idx;
  var activeDetailTab = vtClientDetailTab[key] || 'checklist';

  var tabBtn = function(tabId, label) {
    return '<button class="vt-tab'+(activeDetailTab===tabId?' on':'')+'" onclick="vtSetClientDetailTab(\''+key+'\',\''+tabId+'\')">'+label+'</button>';
  };
  var tabsBar = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">'
    + tabBtn('checklist','Checklist') + tabBtn('info','Contract & Info') + tabBtn('lookbook','Lookbook')
    + '</div>';
  var body = activeDetailTab === 'checklist' ? vtStepsHtml(list, idx, c)
    : activeDetailTab === 'info' ? vtRenderClientInfoTab(c, key)
    : vtRenderClientLookbookTab(c, key);

  return '<div style="position:fixed;inset:0;background:rgba(28,23,18,.55);z-index:600;display:flex;align-items:center;justify-content:center;padding:20px" onclick="vtCloseClientDetailModal()">'
    + '<div class="sm-modal" style="max-width:760px;width:100%;max-height:88vh;overflow-y:auto" onclick="event.stopPropagation()">'
    +   '<button onclick="vtCloseClientDetailModal()" class="sm-modal-x">&#215;</button>'
    +   '<div class="sm-modal-title">'+esc(c.name)+(c.partner?' &amp; '+esc(c.partner):'')+'</div>'
    +   tabsBar
    +   body
    + '</div>'
    + '</div>';
}

/* ── Contract & Info (backed by vietnam_client_personal_info / vietnam_client_documents,
   reached via the same staff API + real session token used by staff-vietnam.html) ── */

function vtStaffApiCall(action, extra) {
  var db = getSupa();
  if (!db) return Promise.resolve(null);
  return db.auth.getSession().then(function(res) {
    var session = res && res.data && res.data.session;
    if (!session) return null;
    return fetch('/api/vietnam-staff-info', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ staff_token: session.access_token, action: action }, extra || {}))
    }).then(function(r) { return r.json(); });
  });
}

function vtFetchClientInfo(portalId) {
  vtStaffApiCall('get_client_info', { client_id: portalId }).then(function(data) {
    if (data && data.ok) {
      vtClientInfoCache[portalId] = { info: data.info, documents: data.documents };
      renderVietnamTour();
    }
  });
}

function vtRenderClientInfoTab(c, key) {
  if (!c.portalId) {
    return '<div style="color:var(--muted);font-size:12px;padding:6px 0">This client hasn\'t synced to the portal yet — edit and save them again to enable this.</div>';
  }
  var cache = vtClientInfoCache[c.portalId];
  if (!cache) {
    vtFetchClientInfo(c.portalId);
    return '<div style="color:var(--muted);font-size:12px;padding:6px 0">Loading…</div>';
  }
  var info = cache.info || {};
  var docs = cache.documents || [];
  var contract = docs.filter(function(d){ return d.doc_type === 'contract'; })[0];
  var uploads = docs.filter(function(d){ return d.doc_type === 'client_upload'; });

  var html = '<div style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Uploaded Contract</div>';
  if (contract) {
    html += '<div class="tour-doc-row"><span style="font-size:12px">&#128196; '+esc(contract.file_name)+'</span>'
      + (contract.url ? ' <a href="'+contract.url+'" target="_blank" style="font-size:11px" onclick="event.stopPropagation()">Download</a>' : '')
      + ' <button class="fin-row-edit" onclick="event.stopPropagation();vtDeleteClientDoc(\''+c.portalId+'\',\''+contract.id+'\')">Remove</button></div>';
  } else {
    html += '<div style="font-size:12px;color:var(--muted);margin-bottom:6px">No contract uploaded.</div>';
  }
  html += '<input type="file" id="vtinfo-contract-'+key+'" style="display:none" onchange="event.stopPropagation();vtUploadClientContract(\''+c.portalId+'\',this)">'
    + '<button class="fin-row-edit" onclick="event.stopPropagation();document.getElementById(\'vtinfo-contract-'+key+'\').click()">'+(contract?'Replace Contract':'+ Upload Contract')+'</button>';

  html += '<div style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">Personal Details</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px" onclick="event.stopPropagation()">'
    + '<div class="sm-field"><label class="sm-lbl">Passport Number</label><input class="sm-inp" id="vtinfo-passport-'+key+'" value="'+esc(info.passport_number||'')+'"></div>'
    + '<div class="sm-field"><label class="sm-lbl">Passport Expiry</label><input class="sm-inp" type="date" id="vtinfo-expiry-'+key+'" value="'+esc(info.passport_expiry||'')+'"></div>'
    + '<div class="sm-field"><label class="sm-lbl">Emergency Contact Name</label><input class="sm-inp" id="vtinfo-ecname-'+key+'" value="'+esc(info.emergency_contact_name||'')+'"></div>'
    + '<div class="sm-field"><label class="sm-lbl">Emergency Contact Phone</label><input class="sm-inp" id="vtinfo-ecphone-'+key+'" value="'+esc(info.emergency_contact_phone||'')+'"></div>'
    + '</div>'
    + '<div class="sm-field" onclick="event.stopPropagation()"><label class="sm-lbl">Dietary Needs</label><textarea class="sm-inp" rows="2" id="vtinfo-dietary-'+key+'" style="resize:vertical">'+esc(info.dietary_needs||'')+'</textarea></div>'
    + '<div class="sm-field" onclick="event.stopPropagation()"><label class="sm-lbl">Allergies</label><textarea class="sm-inp" rows="2" id="vtinfo-allergies-'+key+'" style="resize:vertical">'+esc(info.allergies||'')+'</textarea></div>'
    + '<div class="sm-field" onclick="event.stopPropagation()"><label class="sm-lbl">Notes</label><textarea class="sm-inp" rows="2" id="vtinfo-notes-'+key+'" style="resize:vertical">'+esc(info.notes||'')+'</textarea></div>'
    + '<button class="btn btnp" style="font-size:12px" id="vtinfo-save-'+key+'" onclick="event.stopPropagation();vtSaveClientInfo(\''+c.portalId+'\',\''+key+'\')">Save Details</button>';

  html += '<div style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">Client-Uploaded Documents</div>';
  if (uploads.length === 0) html += '<div style="font-size:12px;color:var(--muted)">None yet.</div>';
  uploads.forEach(function(d) {
    html += '<div class="tour-doc-row"><span style="font-size:12px">&#128206; '+esc(d.file_name)+'</span>'
      + (d.url ? ' <a href="'+d.url+'" target="_blank" style="font-size:11px" onclick="event.stopPropagation()">View</a>' : '')
      + ' <button class="fin-row-edit" onclick="event.stopPropagation();vtDeleteClientDoc(\''+c.portalId+'\',\''+d.id+'\')">Remove</button></div>';
  });

  return html;
}

function vtSaveClientInfo(portalId, key) {
  var btn = document.getElementById('vtinfo-save-'+key);
  var payload = {
    client_id: portalId,
    passport_number: document.getElementById('vtinfo-passport-'+key).value.trim(),
    passport_expiry: document.getElementById('vtinfo-expiry-'+key).value || null,
    emergency_contact_name: document.getElementById('vtinfo-ecname-'+key).value.trim(),
    emergency_contact_phone: document.getElementById('vtinfo-ecphone-'+key).value.trim(),
    dietary_needs: document.getElementById('vtinfo-dietary-'+key).value.trim(),
    allergies: document.getElementById('vtinfo-allergies-'+key).value.trim(),
    notes: document.getElementById('vtinfo-notes-'+key).value.trim()
  };
  vtStaffApiCall('save_info', payload).then(function(data) {
    if (btn) { btn.textContent = (data && data.ok) ? 'Saved ✓' : 'Failed — try again'; setTimeout(function(){ if (btn) btn.textContent = 'Save Details'; }, 1800); }
    if (vtClientInfoCache[portalId]) vtClientInfoCache[portalId].info = Object.assign({}, vtClientInfoCache[portalId].info, payload);
  });
}

function vtUploadClientContract(portalId, input) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) { alert('File must be under 4MB'); input.value = ''; return; }
  var reader = new FileReader();
  reader.onload = function() {
    var base64 = reader.result.split(',')[1];
    vtStaffApiCall('upload_contract', { client_id: portalId, file_name: file.name, content_type: file.type, file_base64: base64 }).then(function(data) {
      if (data && data.ok) { vtClientInfoCache[portalId] = Object.assign({}, vtClientInfoCache[portalId], { documents: data.documents }); renderVietnamTour(); }
      else alert((data && data.error) || 'Upload failed.');
    });
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function vtDeleteClientDoc(portalId, docId) {
  if (!confirm('Remove this document?')) return;
  vtStaffApiCall('delete_document', { client_id: portalId, id: docId }).then(function(data) {
    if (data && data.documents) { vtClientInfoCache[portalId] = Object.assign({}, vtClientInfoCache[portalId], { documents: data.documents }); renderVietnamTour(); }
  });
}

/* ── Lookbook (read-only inline view of inspiration_* — those tables are still
   openly readable with the anon/publishable key, same as the client-facing
   moodboard, so no staff API round-trip needed here). Matched by email; does
   NOT auto-create an inspiration_clients row just from staff looking. ── */

function vtFetchClientLookbook(email) {
  var key = email.toLowerCase();
  var headers = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY };
  fetch(SUPA_URL + '/rest/v1/inspiration_clients?email=eq.' + encodeURIComponent(key) + '&select=*', { headers: headers })
    .then(function(r) { return r.json(); })
    .then(function(clients) {
      var lbClient = Array.isArray(clients) && clients[0];
      if (!lbClient) { vtClientLookbookCache[key] = { notFound: true }; renderVietnamTour(); return; }
      return fetch(SUPA_URL + '/rest/v1/inspiration_items?client_id=eq.' + lbClient.id + '&select=*,inspiration_photos(*),inspiration_item_colours(*)&order=sort_order.asc', { headers: headers })
        .then(function(r) { return r.json(); })
        .then(function(items) {
          vtClientLookbookCache[key] = { client: lbClient, items: items || [] };
          renderVietnamTour();
        });
    })
    .catch(function() { vtClientLookbookCache[key] = { error: true }; renderVietnamTour(); });
}

function vtRenderClientLookbookTab(c, key) {
  if (!c.email) {
    return '<div style="color:var(--muted);font-size:12px;padding:6px 0">Add an email to unlock their Lookbook &amp; dashboard.</div>';
  }
  var cacheKey = c.email.toLowerCase();
  var cache = vtClientLookbookCache[cacheKey];
  if (!cache) {
    vtFetchClientLookbook(c.email);
    return '<div style="color:var(--muted);font-size:12px;padding:6px 0">Loading…</div>';
  }
  if (cache.error) return '<div style="color:var(--muted);font-size:12px;padding:6px 0">Couldn\'t load their Lookbook. Try again.</div>';
  if (cache.notFound || !cache.items || cache.items.length === 0) {
    return '<div style="color:var(--muted);font-size:12px;padding:6px 0">No Lookbook activity yet — nothing added on their end.</div>';
  }
  var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px">';
  cache.items.forEach(function(item) {
    var photos = item.inspiration_photos || [];
    var front = photos.filter(function(p){ return p.slot === 'front'; })[0] || photos[0];
    var thumbUrl = front ? 'https://ntqemlkwsymdxhaonfdv.supabase.co/storage/v1/object/public/inspiration-photos/' + front.storage_path : '';
    html += '<div style="border:1px solid var(--sand);border-radius:8px;overflow:hidden;background:white">'
      + '<div style="aspect-ratio:3/4;background:var(--warm);display:flex;align-items:center;justify-content:center;overflow:hidden">'
      + (thumbUrl ? '<img src="'+thumbUrl+'" style="width:100%;height:100%;object-fit:cover">' : '<span style="font-size:10px;color:var(--muted)">No photo</span>')
      + '</div>'
      + '<div style="font-size:10px;padding:4px 6px;color:var(--charcoal);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(item.category||'')+(item.quantity>1?' ×'+item.quantity:'')+'</div>'
      + '</div>';
  });
  html += '</div>'
    + '<div style="margin-top:10px"><a href="lookbook.html" target="_blank" style="font-size:11px;color:var(--charcoal);font-weight:600" onclick="event.stopPropagation()">Open full Lookbook Admin &#8594;</a></div>';
  return html;
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

  var subtabBar = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:18px">'
    + '<div style="display:flex;gap:8px">'
    +   '<button class="vt-tab'+(vtClientSubTab==='interested'?' on':'')+'" onclick="vtSetClientSubTab(\'interested\')">Interested ('+intList.length+')</button>'
    +   '<button class="vt-tab'+(vtClientSubTab==='booked'?' on':'')+'" onclick="vtSetClientSubTab(\'booked\')">Booked ('+bookedList.length+')</button>'
    + '</div>'
    + '<a href="staff-vietnam.html" class="fin-row-edit" style="text-decoration:none">Contracts &amp; Client Info &#8594;</a>'
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

  return subtabBar + panel + vtClientDetailModalHtml();
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
