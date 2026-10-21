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
var vtRecDraftPhotos = [];   // photo URLs for the form currently open
var vtRecUploading = 0;

var VT_REC_PRICES = ['', '$', '$$', '$$$', '$$$$'];
var VT_REC_BOOKING = ['', 'Walk-ins welcome', 'Booking recommended', 'Booking essential'];

function vtRecEdit(id) {
  var r = (vtRecs || []).filter(function(x){ return x.id === id; })[0];
  vtRecDraftPhotos = r ? (Array.isArray(r.photos) && r.photos.length ? r.photos.slice() : (r.image_url ? [r.image_url] : [])) : [];
  vtRecEditing = id; renderVietnamTour();
  setTimeout(function(){ var n = document.getElementById('vtrec-name'); if (n) n.focus(); }, 30);
}

// Keeps whatever has been typed when the form re-renders (e.g. after a photo uploads).
function _vtRecReadForm() {
  var g = function(id){ var el = document.getElementById(id); return el ? el.value : undefined; };
  if (g('vtrec-name') === undefined) return null;
  return { category: g('vtrec-cat'), name: g('vtrec-name'), description: g('vtrec-desc'), maps_url: g('vtrec-map'),
    popular: g('vtrec-popular'), price_range: g('vtrec-price'), walk_time: g('vtrec-walk'), hours: g('vtrec-hours'),
    booking: g('vtrec-booking'), tip: g('vtrec-tip'), menu_url: g('vtrec-menu') };
}

function _vtRecRerenderForm() {
  var vals = _vtRecReadForm();
  renderVietnamTour();
  if (!vals) return;
  var set = function(id, v){ var el = document.getElementById(id); if (el && v !== undefined) el.value = v; };
  set('vtrec-cat', vals.category); set('vtrec-name', vals.name); set('vtrec-desc', vals.description); set('vtrec-map', vals.maps_url);
  set('vtrec-popular', vals.popular); set('vtrec-price', vals.price_range); set('vtrec-walk', vals.walk_time); set('vtrec-hours', vals.hours);
  set('vtrec-booking', vals.booking); set('vtrec-tip', vals.tip); set('vtrec-menu', vals.menu_url);
}

function vtRecCancel() { vtRecEditing = null; vtRecDraftPhotos = []; renderVietnamTour(); }

function _vtRecOpts(list, cur, labels) {
  return list.map(function(v, i){ return '<option value="'+esc(v)+'"'+((cur||'')===v?' selected':'')+'>'+esc(labels ? labels[i] : (v || '—'))+'</option>'; }).join('');
}

function _vtRecPhotosEditor() {
  var thumbs = vtRecDraftPhotos.map(function(u, i) {
    return '<div style="position:relative;width:96px;height:72px;border-radius:8px;overflow:hidden;flex-shrink:0;border:'+(i===0?'2px solid var(--charcoal)':'1px solid var(--sand)')+'">'
      + '<img src="'+esc(u)+'" style="width:100%;height:100%;object-fit:cover">'
      + (i===0 ? '<span style="position:absolute;left:4px;top:4px;background:var(--charcoal);color:#fff;font-size:9px;padding:1px 5px;border-radius:4px">COVER</span>' : '')
      + '<div style="position:absolute;right:2px;bottom:2px;display:flex;gap:2px">'
      +   (i>0 ? '<button type="button" class="fin-row-edit" style="padding:0 5px;background:#fff" title="Move left" onclick="vtRecPhotoMove('+i+',-1)">&#8592;</button>' : '')
      +   (i<vtRecDraftPhotos.length-1 ? '<button type="button" class="fin-row-edit" style="padding:0 5px;background:#fff" title="Move right" onclick="vtRecPhotoMove('+i+',1)">&#8594;</button>' : '')
      +   '<button type="button" class="fin-row-edit" style="padding:0 5px;background:#fff;color:#EF4444" title="Remove" onclick="vtRecPhotoRemove('+i+')">&#10005;</button>'
      + '</div></div>';
  }).join('');
  if (vtRecUploading) thumbs += '<div style="width:96px;height:72px;border-radius:8px;border:1px dashed var(--sand);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--muted)">Uploading…</div>';
  return '<div class="sm-field"><label class="sm-lbl">Photos <span style="text-transform:none;font-weight:400">(first one is the cover; clients swipe through the rest)</span></label>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + thumbs
    + '<input type="file" id="vtrec-files" accept="image/*" multiple style="display:none" onchange="vtRecPhotoUpload(this)">'
    + '<button type="button" class="fin-row-edit" style="height:72px;width:96px" onclick="document.getElementById(\'vtrec-files\').click()">+ Add photos</button>'
    + '</div></div>';
}

function vtRecPhotoMove(i, dir) {
  var j = i + dir; if (j < 0 || j >= vtRecDraftPhotos.length) return;
  var t = vtRecDraftPhotos[i]; vtRecDraftPhotos[i] = vtRecDraftPhotos[j]; vtRecDraftPhotos[j] = t;
  _vtRecRerenderForm();
}
function vtRecPhotoRemove(i) { vtRecDraftPhotos.splice(i, 1); _vtRecRerenderForm(); }

// Shrinks to max 1600px JPEG before upload so tiles load quickly on phones.
function _vtRecShrink(file) {
  return new Promise(function(resolve, reject) {
    var img = new Image(); var url = URL.createObjectURL(file);
    img.onload = function() {
      var max = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
    };
    img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('Couldn\'t read that image (HEIC photos need converting to JPG first).')); };
    img.src = url;
  });
}

function vtRecPhotoUpload(input) {
  var files = Array.prototype.slice.call(input.files || []); input.value = '';
  files.forEach(function(file) {
    vtRecUploading++; _vtRecRerenderForm();
    _vtRecShrink(file).then(function(b64) {
      return vtStaffApiCall('upload_rec_photo', { content_type: 'image/jpeg', file_base64: b64 });
    }).then(function(data) {
      if (data && data.ok && data.url) vtRecDraftPhotos.push(data.url);
      else alert((data && data.error) || 'Photo upload failed.');
    }).catch(function(e) { alert(e.message || 'Photo upload failed.'); })
      .then(function() { vtRecUploading--; _vtRecRerenderForm(); });
  });
}

function vtRecMenuUpload(input) {
  var file = input.files && input.files[0]; input.value = '';
  if (!file) return;
  var btn = document.getElementById('vtrec-menubtn');
  var done = function(url, msg) {
    if (btn) btn.textContent = 'Upload menu';
    if (url) { var m = document.getElementById('vtrec-menu'); if (m) m.value = url; }
    else alert(msg || 'Menu upload failed.');
  };
  if (btn) btn.textContent = 'Uploading…';
  var send = function(type, b64) {
    return vtStaffApiCall('upload_rec_photo', { content_type: type, file_base64: b64 })
      .then(function(d) { done(d && d.ok && d.url, d && d.error); });
  };
  if (file.type === 'application/pdf') {
    if (file.size > 4 * 1024 * 1024) return done(null, 'PDF must be under 4MB.');
    var reader = new FileReader();
    reader.onload = function() { send('application/pdf', reader.result.split(',')[1]); };
    reader.readAsDataURL(file);
  } else {
    _vtRecShrink(file).then(function(b64) { return send('image/jpeg', b64); }).catch(function(e) { done(null, e.message); });
  }
}

function _vtRecForm(r) {
  r = r || { category: vtRecCat };
  var catOpts = VT_REC_CATS.map(function(c) {
    return '<option value="'+c.id+'"'+(r.category===c.id?' selected':'')+'>'+c.lbl+'</option>';
  }).join('');
  var row = function(cols, inner){ return '<div style="display:grid;grid-template-columns:'+cols+';gap:10px">'+inner+'</div>'; };
  var inp = function(id, lbl, val, ph){ return '<div class="sm-field"><label class="sm-lbl">'+lbl+'</label><input class="sm-inp" id="'+id+'" value="'+esc(val||'')+'" placeholder="'+esc(ph||'')+'"></div>'; };
  return '<div class="card" style="padding:16px;margin-bottom:12px;border:1.5px solid var(--charcoal)">'
    + row('2fr 1fr', inp('vtrec-name','Name',r.name,'e.g. Morning Glory Restaurant')
        + '<div class="sm-field"><label class="sm-lbl">Category</label><select class="sm-inp" id="vtrec-cat">'+catOpts+'</select></div>')
    + _vtRecPhotosEditor()
    + '<div class="sm-field"><label class="sm-lbl">Description</label><textarea class="sm-inp" rows="2" id="vtrec-desc" style="resize:vertical" placeholder="What it is and why you love it">'+esc(r.description||'')+'</textarea></div>'
    + inp('vtrec-popular','What\'s popular',r.popular,'e.g. Cao lầu, white rose dumplings, mango smoothie')
    + row('1fr 1.4fr 1.6fr',
        '<div class="sm-field"><label class="sm-lbl">Price range</label><select class="sm-inp" id="vtrec-price">'+_vtRecOpts(VT_REC_PRICES, r.price_range, ['—','$ Budget','$$ Moderate','$$$ Upmarket','$$$$ Splurge'])+'</select></div>'
        + inp('vtrec-walk','Distance from SIP Boutique',r.walk_time,'e.g. 8 min walk / 15 min by Grab')
        + inp('vtrec-hours','Opening hours',r.hours,'e.g. 8am–10pm daily'))
    + row('1fr 2fr',
        '<div class="sm-field"><label class="sm-lbl">Booking</label><select class="sm-inp" id="vtrec-booking">'+_vtRecOpts(VT_REC_BOOKING, r.booking, ['—'].concat(VT_REC_BOOKING.slice(1)))+'</select></div>'
        + inp('vtrec-map','Google Maps link',r.maps_url,'https://maps.app.goo.gl/…'))
    + '<div class="sm-field"><label class="sm-lbl">Menu <span style="text-transform:none;font-weight:400">(paste the restaurant\'s menu link, or upload a PDF / photo of it)</span></label>'
    +   '<div style="display:flex;gap:8px"><input class="sm-inp" id="vtrec-menu" style="flex:1" value="'+esc(r.menu_url||'')+'" placeholder="https://…">'
    +   '<input type="file" id="vtrec-menufile" accept="application/pdf,image/*" style="display:none" onchange="vtRecMenuUpload(this)">'
    +   '<button type="button" class="fin-row-edit" id="vtrec-menubtn" style="white-space:nowrap" onclick="document.getElementById(\'vtrec-menufile\').click()">Upload menu</button></div></div>'
    + inp('vtrec-tip','Latisha\'s tip',r.tip,'e.g. Go before 6pm to skip the queue')
    + '<div id="vtrec-err" style="color:#B91C1C;font-size:12px;margin-bottom:8px;display:none"></div>'
    + '<div style="display:flex;gap:8px">'
    +   '<button class="btn btnp" style="font-size:12px" id="vtrec-save" onclick="vtRecSave(\''+(r.id||'')+'\')">'+(r.id?'Save Changes':'Add Recommendation')+'</button>'
    +   '<button class="btn" style="font-size:12px" onclick="vtRecCancel()">Cancel</button>'
    + '</div></div>';
}

function vtRecSave(id) {
  var f = _vtRecReadForm();
  var err = document.getElementById('vtrec-err');
  var bad = function(msg) { err.textContent = msg; err.style.display = 'block'; };
  f.name = (f.name || '').trim(); f.maps_url = (f.maps_url || '').trim();
  if (!f.name) return bad('Add a name.');
  if (vtRecUploading) return bad('Wait for the photos to finish uploading.');
  if (f.maps_url && !/^https?:\/\//i.test(f.maps_url)) return bad('The Maps link should start with https://');
  if (f.menu_url && !/^https:\/\//i.test(f.menu_url.trim())) return bad('The menu link should start with https://');

  var payload = {
    category: f.category, name: f.name, description: (f.description||'').trim(), maps_url: f.maps_url,
    photos: vtRecDraftPhotos.slice(), image_url: vtRecDraftPhotos[0] || '',
    popular: (f.popular||'').trim(), price_range: f.price_range, walk_time: (f.walk_time||'').trim(),
    hours: (f.hours||'').trim(), booking: f.booking, tip: (f.tip||'').trim(), menu_url: (f.menu_url||'').trim()
  };
  if (id) payload.id = id;
  else payload.sort_order = (vtRecs || []).filter(function(r){ return r.category === f.category; }).length;

  var btn = document.getElementById('vtrec-save');
  btn.disabled = true; btn.textContent = 'Saving…';
  vtStaffApiCall('save_rec', payload).then(function(data) {
    if (!data || !data.ok) { btn.disabled = false; btn.textContent = id ? 'Save Changes' : 'Add Recommendation'; return bad((data && data.error) || 'Couldn\'t save — try again.'); }
    var saved = data.rec;
    if (id) vtRecs = vtRecs.map(function(r){ return r.id === id ? saved : r; });
    else vtRecs.push(saved);
    vtRecCat = saved.category;
    vtRecEditing = null; vtRecDraftPhotos = [];
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
      + ((r.photos && r.photos[0]) || r.image_url ? '<img src="'+esc((r.photos && r.photos[0]) || r.image_url)+'" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0">'
                     : '<div style="font-size:22px;width:56px;text-align:center;flex-shrink:0">'+cat.icon+'</div>')
      + '<div style="flex:1;min-width:0">'
      +   '<div style="font-weight:600;font-size:14px">'+esc(r.name)+'</div>'
      +   '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+[r.price_range, r.walk_time, (r.photos||[]).length ? (r.photos.length+' photo'+(r.photos.length>1?'s':'')) : 'No photos'].filter(Boolean).map(esc).join(' · ')+'</div>'
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
