// ══ Vietnam Tour — Recommendations editor (staff) ══
// One shared list every tour client sees on their dashboard (clients.yourszn.com.au
// → Recommendations). Stored in vietnam_recommendations with client_id = null and
// read/written only through /api/vietnam-staff-info using the staff session token.

var VT_REC_CATS = [
  { id: 'food',        lbl: 'Restaurants', icon: '🍜' },
  { id: 'cafe',        lbl: 'Cafes',       icon: '☕' },
  { id: 'bar',         lbl: 'Bars',        icon: '🍸' },
  { id: 'activity',    lbl: 'Activities',  icon: '🎡' },
  { id: 'sightseeing', lbl: 'Sightseeing', icon: '🏯' },
  { id: 'spa',         lbl: 'Spas',        icon: '💆' },
  { id: 'shopping',    lbl: 'Shopping',    icon: '🛍️' },
  { id: 'beach',       lbl: 'Beaches',     icon: '🏖️' },
  { id: 'daytrip',     lbl: 'Day Trips',   icon: '🚐' }
];

var vtRecs = null;          // null = not loaded yet
var vtRecsError = '';
var vtRecCat = 'food';
var vtRecEditing = null;    // rec id being edited, or 'new'

function vtRecsLoad() {
  vtRecsError = '';
  vtStaffApiCall('list_recs').then(function(data) {
    if (data && data.ok && Array.isArray(data.recs)) { vtRecs = data.recs; }
    else { vtRecs = []; vtRecsError = (data && data.error) || 'Couldn\'t load recommendations — try logging in again.'; }
    renderVietnamTour();
  });
}

function vtRecSetCat(cat) { vtRecCat = cat; vtRecEditing = null; renderVietnamTour(); }
function vtRecEdit(id) { vtRecEditing = id; renderVietnamTour(); setTimeout(function(){ var n = document.getElementById('vtrec-name'); if (n) n.focus(); }, 30); }
function vtRecCancel() { vtRecEditing = null; renderVietnamTour(); }

function _vtRecForm(r) {
  r = r || { category: vtRecCat };
  var catOpts = VT_REC_CATS.map(function(c) {
    return '<option value="'+c.id+'"'+(r.category===c.id?' selected':'')+'>'+c.lbl+'</option>';
  }).join('');
  return '<div class="card" style="padding:16px;margin-bottom:12px;border:1.5px solid var(--charcoal)">'
    + '<div style="display:grid;grid-template-columns:2fr 1fr;gap:10px">'
    +   '<div class="sm-field"><label class="sm-lbl">Name</label><input class="sm-inp" id="vtrec-name" value="'+esc(r.name||'')+'" placeholder="e.g. Morning Glory Restaurant"></div>'
    +   '<div class="sm-field"><label class="sm-lbl">Category</label><select class="sm-inp" id="vtrec-cat">'+catOpts+'</select></div>'
    + '</div>'
    + '<div class="sm-field"><label class="sm-lbl">Description</label><textarea class="sm-inp" rows="3" id="vtrec-desc" style="resize:vertical" placeholder="Why you love it, what to order, best time to go…">'+esc(r.description||'')+'</textarea></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +   '<div class="sm-field"><label class="sm-lbl">Google Maps link</label><input class="sm-inp" id="vtrec-map" value="'+esc(r.maps_url||'')+'" placeholder="https://maps.app.goo.gl/…"></div>'
    +   '<div class="sm-field"><label class="sm-lbl">Photo link (optional)</label><input class="sm-inp" id="vtrec-img" value="'+esc(r.image_url||'')+'" placeholder="https://…"></div>'
    + '</div>'
    + '<div id="vtrec-err" style="color:#B91C1C;font-size:12px;margin-bottom:8px;display:none"></div>'
    + '<div style="display:flex;gap:8px">'
    +   '<button class="btn btnp" style="font-size:12px" id="vtrec-save" onclick="vtRecSave(\''+(r.id||'')+'\')">'+(r.id?'Save Changes':'Add Recommendation')+'</button>'
    +   '<button class="btn" style="font-size:12px" onclick="vtRecCancel()">Cancel</button>'
    + '</div></div>';
}

function vtRecSave(id) {
  var name = document.getElementById('vtrec-name').value.trim();
  var cat = document.getElementById('vtrec-cat').value;
  var map = document.getElementById('vtrec-map').value.trim();
  var img = document.getElementById('vtrec-img').value.trim();
  var err = document.getElementById('vtrec-err');
  var bad = function(msg) { err.textContent = msg; err.style.display = 'block'; };
  if (!name) return bad('Add a name.');
  if (map && !/^https?:\/\//i.test(map)) return bad('The Maps link should start with https://');
  if (img && !/^https?:\/\//i.test(img)) return bad('The photo link should start with https://');

  var payload = { category: cat, name: name, description: document.getElementById('vtrec-desc').value.trim(), maps_url: map, image_url: img };
  if (id) payload.id = id;
  else payload.sort_order = (vtRecs || []).filter(function(r){ return r.category === cat; }).length;

  var btn = document.getElementById('vtrec-save');
  btn.disabled = true; btn.textContent = 'Saving…';
  vtStaffApiCall('save_rec', payload).then(function(data) {
    if (!data || !data.ok) { btn.disabled = false; btn.textContent = id ? 'Save Changes' : 'Add Recommendation'; return bad((data && data.error) || 'Couldn\'t save — try again.'); }
    var saved = data.rec;
    if (id) vtRecs = vtRecs.map(function(r){ return r.id === id ? saved : r; });
    else vtRecs.push(saved);
    vtRecCat = saved.category;
    vtRecEditing = null;
    renderVietnamTour();
  });
}

function vtRecDelete(id) {
  var r = (vtRecs || []).filter(function(x){ return x.id === id; })[0];
  if (!r || !confirm('Delete "' + r.name + '"? Clients will no longer see it.')) return;
  vtStaffApiCall('delete_rec', { id: id }).then(function(data) {
    if (data && data.ok) { vtRecs = vtRecs.filter(function(x){ return x.id !== id; }); renderVietnamTour(); }
    else alert('Couldn\'t delete — try again.');
  });
}

function vtRecMove(id, dir) {
  var list = vtRecs.filter(function(r){ return r.category === vtRecCat; });
  var i = list.findIndex(function(r){ return r.id === id; });
  var j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
  list.forEach(function(r, k){ r.sort_order = k; });
  vtRecs.sort(function(a, b){ return (a.sort_order||0) - (b.sort_order||0); });
  renderVietnamTour();
  vtStaffApiCall('reorder_recs', { ids: list.map(function(r){ return r.id; }) });
}

function renderVtRecsTab() {
  if (vtRecs === null) { vtRecsLoad(); return '<div style="color:var(--muted);font-size:13px">Loading recommendations…</div>'; }

  var intro = '<div style="font-size:13px;color:var(--muted);margin-bottom:16px">Every tour client sees these on their dashboard under Recommendations. Categories with nothing in them stay hidden from clients.</div>';
  if (vtRecsError) intro += '<div style="color:#B91C1C;font-size:12px;margin-bottom:12px">'+esc(vtRecsError)+' <button class="fin-row-edit" onclick="vtRecs=null;renderVietnamTour()">Retry</button></div>';

  var subtabs = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">' + VT_REC_CATS.map(function(c) {
    var n = vtRecs.filter(function(r){ return r.category === c.id; }).length;
    return '<button class="vt-tab'+(vtRecCat===c.id?' on':'')+'" onclick="vtRecSetCat(\''+c.id+'\')">'+c.lbl+' <span style="opacity:.6">'+n+'</span></button>';
  }).join('') + '</div>';

  var cat = VT_REC_CATS.filter(function(c){ return c.id === vtRecCat; })[0];
  var list = vtRecs.filter(function(r){ return r.category === vtRecCat; });
  var html = '';
  if (vtRecEditing === 'new') html += _vtRecForm(null);
  else html += '<button class="btn btnp" style="font-size:12px;margin-bottom:14px" onclick="vtRecEdit(\'new\')">+ Add to '+cat.lbl+'</button>';

  if (list.length === 0 && vtRecEditing !== 'new') {
    html += '<div style="color:var(--muted);font-size:13px;padding:10px 0">No '+cat.lbl.toLowerCase()+' yet.</div>';
  }
  list.forEach(function(r, i) {
    if (vtRecEditing === r.id) { html += _vtRecForm(r); return; }
    html += '<div class="card" style="padding:14px 16px;margin-bottom:10px;display:flex;gap:14px;align-items:flex-start">'
      + (r.image_url ? '<img src="'+esc(r.image_url)+'" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0">'
                     : '<div style="font-size:22px;width:56px;text-align:center;flex-shrink:0">'+cat.icon+'</div>')
      + '<div style="flex:1;min-width:0">'
      +   '<div style="font-weight:600;font-size:14px">'+esc(r.name)+'</div>'
      +   (r.description ? '<div style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.5">'+esc(r.description)+'</div>' : '')
      +   (r.maps_url ? '<a href="'+esc(r.maps_url)+'" target="_blank" rel="noopener" style="font-size:11px">Map ↗</a>' : '<div style="font-size:11px;color:#B45309;margin-top:3px">No map link</div>')
      + '</div>'
      + '<div style="display:flex;gap:4px;flex-shrink:0">'
      +   '<button class="fin-row-edit" title="Move up" '+(i===0?'disabled style="opacity:.3"':'')+' onclick="vtRecMove(\''+r.id+'\',-1)">&#8593;</button>'
      +   '<button class="fin-row-edit" title="Move down" '+(i===list.length-1?'disabled style="opacity:.3"':'')+' onclick="vtRecMove(\''+r.id+'\',1)">&#8595;</button>'
      +   '<button class="fin-row-edit" title="Edit" onclick="vtRecEdit(\''+r.id+'\')">&#9998;</button>'
      +   '<button class="fin-row-edit" title="Delete" style="color:#EF4444" onclick="vtRecDelete(\''+r.id+'\')">&#10005;</button>'
      + '</div></div>';
  });

  return intro + subtabs + html;
}
