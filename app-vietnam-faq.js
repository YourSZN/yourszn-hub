// ══ Vietnam Tour — FAQ editor (staff) ══
// Shared FAQ shown on every client's trip dashboard (clients.yourszn.com.au → FAQ).
// Stored in vietnam_faqs; read/written only via /api/vietnam-staff-info.

var vtFaqs = null;          // null = not loaded yet
var vtFaqError = '';
var vtFaqEditing = null;    // faq id, or 'new'

function vtFaqLoad() {
  vtFaqError = '';
  vtStaffApiCall('list_faqs').then(function(data) {
    if (data && data.ok && Array.isArray(data.faqs)) vtFaqs = data.faqs;
    else { vtFaqs = []; vtFaqError = (data && data.error) || 'Couldn\'t load the FAQ — try logging in again.'; }
    renderVietnamTour();
  });
}

function vtFaqEdit(id) {
  vtFaqEditing = id; renderVietnamTour();
  setTimeout(function() {
    var el = document.getElementById(id === 'new' ? 'vtfaq-q' : 'vtfaq-a');
    if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); }
  }, 30);
}
function vtFaqCancel() { vtFaqEditing = null; renderVietnamTour(); }

function _vtFaqForm(f) {
  f = f || {};
  return '<div class="card" style="padding:16px;margin-bottom:12px;border:1.5px solid var(--charcoal)">'
    + '<div style="display:grid;grid-template-columns:80px 1fr;gap:10px">'
    +   '<div class="sm-field"><label class="sm-lbl">Emoji</label><input class="sm-inp" id="vtfaq-icon" value="'+esc(f.icon||'')+'" style="text-align:center;font-size:18px"></div>'
    +   '<div class="sm-field"><label class="sm-lbl">Question</label><input class="sm-inp" id="vtfaq-q" value="'+esc(f.question||'')+'" placeholder="e.g. What should I wear to fittings?"></div>'
    + '</div>'
    + '<div class="sm-field"><label class="sm-lbl">Answer</label>'
    +   '<textarea class="sm-inp" id="vtfaq-a" rows="12" style="resize:vertical;line-height:1.5">'+esc(f.answer||'')+'</textarea>'
    +   '<div style="font-size:11px;color:var(--muted);margin-top:4px">Formatting: leave a blank line for a new paragraph · start a line with <b>- </b> for a bullet or <b>1. </b> for a numbered list · wrap words in <b>**double stars**</b> to make them bold.</div>'
    + '</div>'
    + '<div id="vtfaq-err" style="color:#B91C1C;font-size:12px;margin-bottom:8px;display:none"></div>'
    + '<div style="display:flex;gap:8px">'
    +   '<button class="btn btnp" style="font-size:12px" id="vtfaq-save" onclick="vtFaqSave(\''+(f.id||'')+'\')">'+(f.id?'Save Changes':'Add Question')+'</button>'
    +   '<button class="btn" style="font-size:12px" onclick="vtFaqCancel()">Cancel</button>'
    + '</div></div>';
}

function vtFaqSave(id) {
  var q = document.getElementById('vtfaq-q').value.trim();
  var err = document.getElementById('vtfaq-err');
  if (!q) { err.textContent = 'Add a question.'; err.style.display = 'block'; return; }
  var payload = { icon: document.getElementById('vtfaq-icon').value.trim(), question: q, answer: document.getElementById('vtfaq-a').value };
  if (id) payload.id = id; else payload.sort_order = (vtFaqs || []).length;
  var btn = document.getElementById('vtfaq-save');
  btn.disabled = true; btn.textContent = 'Saving…';
  vtStaffApiCall('save_faq', payload).then(function(data) {
    if (!data || !data.ok) {
      btn.disabled = false; btn.textContent = id ? 'Save Changes' : 'Add Question';
      err.textContent = (data && data.error) || 'Couldn\'t save — try again.'; err.style.display = 'block'; return;
    }
    if (id) vtFaqs = vtFaqs.map(function(f) { return f.id === id ? data.faq : f; });
    else vtFaqs.push(data.faq);
    vtFaqEditing = null;
    renderVietnamTour();
  });
}

function vtFaqDelete(id) {
  var f = (vtFaqs || []).filter(function(x) { return x.id === id; })[0];
  if (!f || !confirm('Delete "' + f.question + '"? Clients will no longer see it.')) return;
  vtStaffApiCall('delete_faq', { id: id }).then(function(data) {
    if (data && data.ok) { vtFaqs = vtFaqs.filter(function(x) { return x.id !== id; }); renderVietnamTour(); }
    else alert('Couldn\'t delete — try again.');
  });
}

function vtFaqMove(id, dir) {
  var i = vtFaqs.findIndex(function(f) { return f.id === id; }), j = i + dir;
  if (i < 0 || j < 0 || j >= vtFaqs.length) return;
  var t = vtFaqs[i]; vtFaqs[i] = vtFaqs[j]; vtFaqs[j] = t;
  vtFaqs.forEach(function(f, k) { f.sort_order = k; });
  renderVietnamTour();
  vtStaffApiCall('reorder_faqs', { ids: vtFaqs.map(function(f) { return f.id; }) });
}

function renderVtFaqTab() {
  if (vtFaqs === null) { vtFaqLoad(); return '<div style="color:var(--muted);font-size:13px">Loading FAQ…</div>'; }
  var html = '<div style="font-size:13px;color:var(--muted);margin-bottom:16px">Every tour client sees these on their dashboard under FAQ, in this order.</div>';
  if (vtFaqError) html += '<div style="color:#B91C1C;font-size:12px;margin-bottom:12px">'+esc(vtFaqError)+' <button class="fin-row-edit" onclick="vtFaqs=null;renderVietnamTour()">Retry</button></div>';
  if (vtFaqEditing === 'new') html += _vtFaqForm(null);
  else html += '<button class="btn btnp" style="font-size:12px;margin-bottom:14px" onclick="vtFaqEdit(\'new\')">+ Add Question</button>';
  if (!vtFaqs.length && vtFaqEditing !== 'new') html += '<div style="color:var(--muted);font-size:13px;padding:10px 0">No questions yet.</div>';

  vtFaqs.forEach(function(f, i) {
    if (vtFaqEditing === f.id) { html += _vtFaqForm(f); return; }
    var preview = String(f.answer || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    if (preview.length > 160) preview = preview.slice(0, 160) + '…';
    html += '<div class="card" style="padding:14px 16px;margin-bottom:10px;display:flex;gap:14px;align-items:flex-start">'
      + '<div style="font-size:20px;width:28px;text-align:center;flex-shrink:0">'+esc(f.icon||'❓')+'</div>'
      + '<div style="flex:1;min-width:0;cursor:pointer" onclick="vtFaqEdit(\''+f.id+'\')">'
      +   '<div style="font-weight:600;font-size:14px">'+esc(f.question)+'</div>'
      +   '<div style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.5">'+esc(preview)+'</div>'
      + '</div>'
      + '<div style="display:flex;gap:4px;flex-shrink:0">'
      +   '<button class="fin-row-edit" title="Move up" '+(i===0?'disabled style="opacity:.3"':'')+' onclick="vtFaqMove(\''+f.id+'\',-1)">&#8593;</button>'
      +   '<button class="fin-row-edit" title="Move down" '+(i===vtFaqs.length-1?'disabled style="opacity:.3"':'')+' onclick="vtFaqMove(\''+f.id+'\',1)">&#8595;</button>'
      +   '<button class="fin-row-edit" title="Edit" onclick="vtFaqEdit(\''+f.id+'\')">&#9998;</button>'
      +   '<button class="fin-row-edit" title="Delete" style="color:#EF4444" onclick="vtFaqDelete(\''+f.id+'\')">&#10005;</button>'
      + '</div></div>';
  });
  return html;
}
