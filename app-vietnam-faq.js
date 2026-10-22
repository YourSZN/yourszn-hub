// ══ Vietnam Tour — FAQ editor (staff) ══
// Shared FAQ shown on every client's trip dashboard (clients.yourszn.com.au → FAQ).
// Stored in vietnam_faqs; read/written only via /api/vietnam-staff-info.

var VT_FAQ_CATS = [
  { id: 'trip',     lbl: 'Your trip' },
  { id: 'before',   lbl: 'Before you go' },
  { id: 'around',   lbl: 'Getting around' },
  { id: 'money',    lbl: 'Money' },
  { id: 'safety',   lbl: 'Health & safety' },
  { id: 'everyday', lbl: 'Everyday life' }
];

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
    + '<div class="sm-field"><label class="sm-lbl">Heading</label><select class="sm-inp" id="vtfaq-cat"><option value="">More questions</option>'
    +   VT_FAQ_CATS.map(function(c) { return '<option value="'+c.id+'"'+(f.category===c.id?' selected':'')+'>'+esc(c.lbl)+'</option>'; }).join('') + '</select></div>'
    + '<div class="sm-field"><label class="sm-lbl">Answer</label>'
    +   '<textarea class="sm-inp" id="vtfaq-a" rows="12" style="resize:vertical;line-height:1.5">'+esc(f.answer||'')+'</textarea>'
    +   '<div style="font-size:11px;color:var(--muted);margin-top:4px">Formatting: leave a blank line for a new paragraph · start a line with <b>- </b> for a bullet or <b>1. </b> for a numbered list · wrap words in <b>**double stars**</b> to make them bold.</div>'
    + '</div>'
    + '<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin:4px 0 12px;cursor:pointer"><input type="checkbox" id="vtfaq-pub"'+(f.published===false?'':' checked')+'> Visible to clients <span style="color:var(--muted);font-size:11px">(untick to keep it as a draft)</span></label>'
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
  var payload = { icon: document.getElementById('vtfaq-icon').value.trim(), question: q, answer: document.getElementById('vtfaq-a').value, published: document.getElementById('vtfaq-pub').checked, category: document.getElementById('vtfaq-cat').value };
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
  var drafts = vtFaqs.filter(function(f) { return f.published === false; }).length;
  var html = '<div style="font-size:13px;color:var(--muted);margin-bottom:16px">Every tour client sees these on their dashboard under FAQ, in this order. Drafts are hidden from clients until you publish them.'
    + (drafts ? ' <b style="color:#92400E">'+drafts+' draft'+(drafts>1?'s':'')+' waiting for review.</b>' : '') + '</div>';
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
      +   '<div style="font-weight:600;font-size:14px">'+esc(f.question)+(f.published===false?' <span style="background:#FEF3C7;color:#92400E;font-size:10px;font-weight:700;letter-spacing:.5px;padding:2px 7px;border-radius:10px;vertical-align:middle">DRAFT</span>':'')+'</div>'
      +   '<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-top:2px">'+esc((VT_FAQ_CATS.filter(function(c){return c.id===f.category;})[0]||{lbl:'More questions'}).lbl)+'</div>'
      +   '<div style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.5">'+esc(preview)+'</div>'
      + '</div>'
      + '<div style="display:flex;gap:4px;flex-shrink:0">'
      +   (f.published===false ? '<button class="fin-row-edit" onclick="vtFaqPublish(\''+f.id+'\')">Publish</button>' : '')
      +   '<button class="fin-row-edit" title="Move up" '+(i===0?'disabled style="opacity:.3"':'')+' onclick="vtFaqMove(\''+f.id+'\',-1)">&#8593;</button>'
      +   '<button class="fin-row-edit" title="Move down" '+(i===vtFaqs.length-1?'disabled style="opacity:.3"':'')+' onclick="vtFaqMove(\''+f.id+'\',1)">&#8595;</button>'
      +   '<button class="fin-row-edit" title="Edit" onclick="vtFaqEdit(\''+f.id+'\')">&#9998;</button>'
      +   '<button class="fin-row-edit" title="Delete" style="color:#EF4444" onclick="vtFaqDelete(\''+f.id+'\')">&#10005;</button>'
      + '</div></div>';
  });
  return html;
}

function vtFaqPublish(id) {
  var f = (vtFaqs || []).filter(function(x) { return x.id === id; })[0]; if (!f) return;
  if (/\[[^\]]*(add|confirm)[^\]]*\]/i.test(f.answer || '') && !confirm('This answer still has [placeholders] to fill in. Publish anyway?')) return;
  vtStaffApiCall('save_faq', { id: f.id, icon: f.icon, question: f.question, answer: f.answer, published: true, category: f.category }).then(function(data) {
    if (data && data.ok) { vtFaqs = vtFaqs.map(function(x) { return x.id === id ? data.faq : x; }); renderVietnamTour(); }
    else alert('Couldn\'t publish — try again.');
  });
}
