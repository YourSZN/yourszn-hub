// ══ Vietnam Onboarding SOP tab ══
var _vtObEditId = null;
function renderVtOnboarding() {
  var items = vtData.onboardingSop || [];
  var html = '<div class="card"><div class="ch" style="display:flex;align-items:center;justify-content:space-between">'
    + '<div class="ct">Client Onboarding Process</div>'
    + '<button class="btn btnp" style="font-size:12px;padding:6px 14px" onclick="openVtObModal(null)">+ Add Step</button>'
    + '</div><div class="cb">'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:12px">Track the order of steps for onboarding each Vietnam client. Click to mark complete.</div>';
  if (!items.length) {
    html += '<div style="color:var(--muted);font-size:13px;padding:8px 0">No steps yet.</div>';
  } else {
    items.forEach(function(item, idx) {
      html += '<div class="titem'+(item.done?' done':'')+'" style="padding:10px 0;border-bottom:1px solid var(--sand)">'
        + '<div style="display:flex;align-items:center;gap:8px;width:100%">'
        +   '<div style="font-size:12px;font-weight:700;color:var(--muted);min-width:22px;text-align:center">'+(idx+1)+'</div>'
        +   '<div class="tck" onclick="vtObToggle(\''+item.id+'\')">'+(item.done?'<svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="2" fill="none"/></svg>':'')+'</div>'
        +   '<div style="flex:1;min-width:0">'
        +     '<div class="ttx">'+esc(item.text)+'</div>'
        +     (item.notes?'<div style="font-size:11px;color:var(--muted);margin-top:2px">'+esc(item.notes)+'</div>':'')
        +   '</div>'
        +   '<button class="fin-row-edit" onclick="openVtObModal(\''+item.id+'\')">Edit</button>'
        +   (idx>0?'<button class="fin-row-edit" style="opacity:.5" onclick="vtObMove(\''+item.id+'\',-1)">↑</button>':'')
        +   (idx<items.length-1?'<button class="fin-row-edit" style="opacity:.5" onclick="vtObMove(\''+item.id+'\',1)">↓</button>':'')
        + '</div>'
        + '</div>';
    });
  }
  html += '</div></div>';
  return html;
}
function vtObToggle(id) {
  var item = (vtData.onboardingSop||[]).find(function(x){return x.id===id;});
  if (item) item.done = !item.done;
  vtSave(); renderVietnamTour();
}
function vtObMove(id, dir) {
  var arr = vtData.onboardingSop||[];
  var idx = arr.findIndex(function(x){return x.id===id;});
  var newIdx = idx+dir;
  if (newIdx<0||newIdx>=arr.length) return;
  var tmp=arr[idx]; arr[idx]=arr[newIdx]; arr[newIdx]=tmp;
  vtSave(); renderVietnamTour();
}
function openVtObModal(id) {
  _vtObEditId = id;
  var item = id ? (vtData.onboardingSop||[]).find(function(x){return x.id===id;}) : null;
  document.getElementById('vtob-heading').textContent = item ? 'Edit Step' : 'Add Step';
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
  if (!vtData.onboardingSop) vtData.onboardingSop=[];
  var obj = {id:_vtObEditId||'ob'+Date.now(), text:text, notes:document.getElementById('vtob-notes').value.trim(), done:false};
  if (_vtObEditId) {
    var idx = vtData.onboardingSop.findIndex(function(x){return x.id===_vtObEditId;});
    if (idx>-1) { obj.done=vtData.onboardingSop[idx].done; vtData.onboardingSop[idx]=obj; }
  } else { vtData.onboardingSop.push(obj); }
  closeVtObModal(); vtSave(); renderVietnamTour();
}
function deleteVtObStep(id) {
  vtData.onboardingSop = (vtData.onboardingSop||[]).filter(function(x){return x.id!==id;});
  closeVtObModal(); vtSave(); renderVietnamTour();
}

// ══ Vietnam client status update ══
function vtUpdateClientStatus(list, idx, status) {
  var arr = list==='booked' ? (vtData.bookedClients||[]) : (vtData.intClients||[]);
  if (arr[idx]) arr[idx].status = status;
  vtSave();
  // Re-render just the status badge colour without full re-render to avoid focus loss
  renderVietnamTour();
}


