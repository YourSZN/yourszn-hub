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
var vtRecDraftMenu = [];     // menu page photo URLs
var vtRecUploading = 0;

var VT_REC_PRICES = ['', '$', '$$', '$$$', '$$$$'];
var VT_REC_BOOKING = ['', 'Walk-ins welcome', 'Booking recommended', 'Booking essential'];

function vtRecEdit(id) {
  var r = (vtRecs || []).filter(function(x){ return x.id === id; })[0];
  vtRecDraftPhotos = r ? (Array.isArray(r.photos) && r.photos.length ? r.photos.slice() : (r.image_url ? [r.image_url] : [])) : [];
  vtRecDraftMenu = r && Array.isArray(r.menu_photos) ? r.menu_photos.slice() : [];
  vtRecEditing = id; renderVietnamTour();
  setTimeout(function(){ var n = document.getElementById('vtrec-name'); if (n) n.focus(); }, 30);
}

// Keeps whatever has been typed when the form re-renders (e.g. after a photo uploads).
function _vtRecReadForm() {
  var g = function(id){ var el = document.getElementById(id); return el ? el.value : undefined; };
  if (g('vtrec-name') === undefined) return null;
  return { category: g('vtrec-cat'), name: g('vtrec-name'), description: g('vtrec-desc'), maps_url: g('vtrec-map'),
    popular: g('vtrec-popular'), price_range: g('vtrec-price'), walk_time: g('vtrec-walk'), hours: g('vtrec-hours'),
    booking: g('vtrec-booking'), tip: g('vtrec-tip'), menu_url: g('vtrec-menu'), pin: g('vtrec-pin') };
}

function _vtRecRerenderForm() {
  var vals = _vtRecReadForm();
  renderVietnamTour();
  if (!vals) return;
  var set = function(id, v){ var el = document.getElementById(id); if (el && v !== undefined) el.value = v; };
  set('vtrec-cat', vals.category); set('vtrec-name', vals.name); set('vtrec-desc', vals.description); set('vtrec-map', vals.maps_url);
  set('vtrec-popular', vals.popular); set('vtrec-price', vals.price_range); set('vtrec-walk', vals.walk_time); set('vtrec-hours', vals.hours);
  set('vtrec-booking', vals.booking); set('vtrec-tip', vals.tip); set('vtrec-menu', vals.menu_url); set('vtrec-pin', vals.pin);
}

function vtRecCancel() { vtRecEditing = null; vtRecDraftPhotos = []; vtRecDraftMenu = []; renderVietnamTour(); }

function _vtRecOpts(list, cur, labels) {
  return list.map(function(v, i){ return '<option value="'+esc(v)+'"'+((cur||'')===v?' selected':'')+'>'+esc(labels ? labels[i] : (v || '—'))+'</option>'; }).join('');
}

// Two photo strips share this code: kind 'photos' (tile gallery) and 'menu' (menu pages).
function _vtRecArr(kind) { return kind === 'menu' ? vtRecDraftMenu : vtRecDraftPhotos; }

function _vtRecStrip(kind) {
  var arr = _vtRecArr(kind), isMenu = kind === 'menu';
  var thumbs = arr.map(function(u, i) {
    return '<div style="position:relative;width:'+(isMenu?72:96)+'px;height:'+(isMenu?96:72)+'px;border-radius:8px;overflow:hidden;flex-shrink:0;border:'+(i===0&&!isMenu?'2px solid var(--charcoal)':'1px solid var(--sand)')+'">'
      + '<img src="'+esc(u)+'" style="width:100%;height:100%;object-fit:cover">'
      + (i===0 && !isMenu ? '<span style="position:absolute;left:4px;top:4px;background:var(--charcoal);color:#fff;font-size:9px;padding:1px 5px;border-radius:4px">COVER</span>' : '')
      + (isMenu ? '<span style="position:absolute;left:4px;top:4px;background:var(--charcoal);color:#fff;font-size:9px;padding:1px 5px;border-radius:4px">'+(i+1)+'</span>' : '')
      + '<div style="position:absolute;right:2px;bottom:2px;display:flex;gap:2px">'
      +   (i>0 ? '<button type="button" class="fin-row-edit" style="padding:0 5px;background:#fff" title="Move left" onclick="vtRecPhotoMove(\''+kind+'\','+i+',-1)">&#8592;</button>' : '')
      +   (i<arr.length-1 ? '<button type="button" class="fin-row-edit" style="padding:0 5px;background:#fff" title="Move right" onclick="vtRecPhotoMove(\''+kind+'\','+i+',1)">&#8594;</button>' : '')
      +   '<button type="button" class="fin-row-edit" style="padding:0 5px;background:#fff;color:#EF4444" title="Remove" onclick="vtRecPhotoRemove(\''+kind+'\','+i+')">&#10005;</button>'
      + '</div></div>';
  }).join('');
  var busy = vtRecUploadingKind[kind];
  if (busy) thumbs += '<div style="width:96px;height:72px;border-radius:8px;border:1px dashed var(--sand);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--muted);text-align:center">'+esc(busy)+'</div>';
  var label = isMenu
    ? 'Menu pages <span style="text-transform:none;font-weight:400">(add photos of each page, or upload a PDF and each page becomes a photo)</span>'
    : 'Photos <span style="text-transform:none;font-weight:400">(first one is the cover; clients swipe through the rest)</span>';
  return '<div class="sm-field"><label class="sm-lbl">'+label+'</label>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + thumbs
    + '<input type="file" id="vtrec-files-'+kind+'" accept="'+(isMenu?'image/*,application/pdf':'image/*')+'" multiple style="display:none" onchange="vtRecPhotoUpload(this,\''+kind+'\')">'
    + '<button type="button" class="fin-row-edit" style="height:72px;width:96px" onclick="document.getElementById(\'vtrec-files-'+kind+'\').click()">+ Add '+(isMenu?'menu pages':'photos')+'</button>'
    + '</div></div>';
}
function _vtRecPhotosEditor() { return _vtRecStrip('photos'); }

function vtRecPhotoMove(kind, i, dir) {
  var arr = _vtRecArr(kind), j = i + dir; if (j < 0 || j >= arr.length) return;
  var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  _vtRecRerenderForm();
}
function vtRecPhotoRemove(kind, i) { _vtRecArr(kind).splice(i, 1); _vtRecRerenderForm(); }

function _vtRecCanvasB64(c) { return c.toDataURL('image/jpeg', 0.82).split(',')[1]; }

// Shrinks to max 1600px JPEG before upload so tiles load quickly on phones.
function _vtRecShrink(file) {
  return new Promise(function(resolve, reject) {
    var img = new Image(); var url = URL.createObjectURL(file);
    img.onload = function() {
      var max = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(_vtRecCanvasB64(c));
    };
    img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('Couldn\'t read that image (HEIC photos need converting to JPG first).')); };
    img.src = url;
  });
}

// Renders every page of a PDF menu to a JPEG (max 1600px tall/wide) using pdf.js,
// which the portal already loads for the colour reports.
function _vtRecPdfPages(file) {
  if (typeof pdfjsLib === 'undefined') return Promise.reject(new Error('PDF reader didn\'t load — refresh and try again.'));
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  return file.arrayBuffer().then(function(buf) { return pdfjsLib.getDocument({ data: buf }).promise; }).then(function(pdf) {
    var n = Math.min(pdf.numPages, 20), out = [], chain = Promise.resolve();
    for (var p = 1; p <= n; p++) (function(pn) {
      chain = chain.then(function() { return pdf.getPage(pn); }).then(function(page) {
        var v = page.getViewport({ scale: 1 }), k = 1600 / Math.max(v.width, v.height);
        var vp = page.getViewport({ scale: k });
        var c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function() { out.push(_vtRecCanvasB64(c)); });
      });
    })(p);
    return chain.then(function() { return out; });
  });
}

var vtRecUploadingKind = {};   // kind -> status text while uploading

function vtRecPhotoUpload(input, kind) {
  kind = kind || 'photos';
  var files = Array.prototype.slice.call(input.files || []); input.value = '';
  var arr = _vtRecArr(kind);
  var setBusy = function(t) { vtRecUploadingKind[kind] = t; vtRecUploading = Object.keys(vtRecUploadingKind).filter(function(k){ return vtRecUploadingKind[k]; }).length; _vtRecRerenderForm(); };
  var chain = Promise.resolve();
  files.forEach(function(file) {
    chain = chain.then(function() {
      var isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      setBusy(isPdf ? 'Reading PDF…' : 'Uploading…');
      return (isPdf ? _vtRecPdfPages(file) : _vtRecShrink(file).then(function(b){ return [b]; })).then(function(list) {
        var c2 = Promise.resolve();
        list.forEach(function(b64, i) {
          c2 = c2.then(function() {
            if (list.length > 1) setBusy('Uploading ' + (i + 1) + ' of ' + list.length + '…');
            return vtStaffApiCall('upload_rec_photo', { content_type: 'image/jpeg', file_base64: b64 }).then(function(data) {
              if (data && data.ok && data.url) arr.push(data.url);
              else throw new Error((data && data.error) || 'Upload failed.');
            });
          });
        });
        return c2;
      });
    }).catch(function(e) { alert(e.message || 'Upload failed.'); });
  });
  chain.then(function() { setBusy(''); });
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
    + '<div class="sm-field"><label class="sm-lbl">Map pin <span style="text-transform:none;font-weight:400">(latitude, longitude — puts this place on the clients\' Map tab)</span></label>'
    +   '<div style="display:flex;gap:8px"><input class="sm-inp" style="flex:1" id="vtrec-pin" value="'+esc(r.lat!=null&&r.lng!=null ? r.lat+', '+r.lng : '')+'" placeholder="e.g. 15.87704, 108.32604" onchange="vtPinSyncFromInput()">'
    +   '<button type="button" class="btn" style="font-size:12px;white-space:nowrap" onclick="vtPinToggle()" id="vtpin-btn">📍 Pick on map</button></div>'
    +   '<div id="vtpin-box" style="display:none;margin-top:8px">'
    +     '<div style="display:flex;gap:8px;margin-bottom:6px"><input class="sm-inp" style="flex:1" id="vtpin-q" placeholder="Search a place or address in Hội An…" onkeydown="if(event.key===\'Enter\'){event.preventDefault();vtPinSearch();}">'
    +     '<button type="button" class="btn" style="font-size:12px" onclick="vtPinSearch()">Search</button></div>'
    +     '<div id="vtpin-results" style="font-size:12px"></div>'
    +     '<div id="vtpin-map" style="height:340px;border-radius:10px;border:1px solid var(--sand,#ddd);overflow:hidden"></div>'
    +     '<div style="font-size:11px;color:var(--muted);margin-top:4px">Click the exact spot on the map (or drag the pin) — the numbers above fill in automatically. ★ is SIP Boutique. Then Save.</div>'
    +   '</div>'
    +   '<div style="font-size:11px;color:var(--muted);margin-top:4px">Or in Google Maps, right-click the spot and click the numbers at the top of the menu to copy them, then paste here. Leave blank to keep it off the map.</div></div>'
    + _vtRecStrip('menu')
    + '<div class="sm-field"><label class="sm-lbl">Online menu link <span style="text-transform:none;font-weight:400">(optional — only if there are no menu pages above; opens in a new tab)</span></label><input class="sm-inp" id="vtrec-menu" value="'+esc(r.menu_url||'')+'" placeholder="https://…"></div>'
    + inp('vtrec-tip','Latisha\'s tip',r.tip,'e.g. Go before 6pm to skip the queue')
    + '<div id="vtrec-err" style="color:#B91C1C;font-size:12px;margin-bottom:8px;display:none"></div>'
    + '<div style="display:flex;gap:8px">'
    +   '<button class="btn btnp" style="font-size:12px" id="vtrec-save" onclick="vtRecSave(\''+(r.id||'')+'\')">'+(r.id?'Save Changes':'Add Recommendation')+'</button>'
    +   '<button class="btn" style="font-size:12px" onclick="vtRecCancel()">Cancel</button>'
    + '</div></div>';
}

// Accepts "15.877, 108.326", or a full Google Maps link that has the coordinates in it.
function vtRecParsePin(txt) {
  txt = String(txt || '').trim(); if (!txt) return null;
  var m = txt.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || txt.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
       || txt.match(/(?:^|[=\s(])(-?\d{1,2}\.\d{3,})\s*[,\s]\s*(-?\d{2,3}\.\d{3,})/);
  if (!m) return null;
  var la = parseFloat(m[1]), ln = parseFloat(m[2]);
  return (la > 8 && la < 24 && ln > 102 && ln < 110) ? [Math.round(la*1e6)/1e6, Math.round(ln*1e6)/1e6] : null;
}

/* ── Pin picker: small real map inside the editor ── */
var vtPin = { map: null, marker: null };
var VT_HOME_PIN = [15.887945, 108.328487];   // SIP Boutique — keep in step with vietnam-map.js

function vtPinToggle() {
  var box = document.getElementById('vtpin-box'); if (!box) return;
  var open = box.style.display === 'none';
  box.style.display = open ? 'block' : 'none';
  document.getElementById('vtpin-btn').textContent = open ? 'Hide map' : '📍 Pick on map';
  if (open) vtPinInit();
}

function vtPinInit() {
  var el = document.getElementById('vtpin-map');
  if (!el || typeof L === 'undefined') { if (el) el.innerHTML = '<div style="padding:20px;font-size:12px">Map couldn\'t load — refresh and try again.</div>'; return; }
  if (vtPin.map && vtPin.map.getContainer() === el) { vtPin.map.invalidateSize(); return; }
  if (vtPin.map) { try { vtPin.map.remove(); } catch (e) {} }
  vtPin.marker = null;
  vtPin.map = L.map(el, { maxZoom: 19 });
  ysAddTiles(vtPin.map);
  L.marker(VT_HOME_PIN, { interactive: false, icon: L.divIcon({ className: '', iconSize: [24, 24], iconAnchor: [12, 12],
    html: '<div style="width:24px;height:24px;border-radius:50%;background:#1C1712;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid #fff">★</div>' }) }).addTo(vtPin.map);
  vtPin.map.on('click', function(e) { vtPinSet(e.latlng.lat, e.latlng.lng); });
  var cur = vtRecParsePin((document.getElementById('vtrec-pin') || {}).value);
  if (cur) { vtPinSet(cur[0], cur[1], true); vtPin.map.setView(cur, 17); }
  else vtPin.map.setView([15.8775, 108.3300], 15);
  var q = document.getElementById('vtpin-q'), nm = document.getElementById('vtrec-name');
  if (q && !q.value && nm && nm.value) q.value = nm.value;
}

function vtPinSet(lat, lng, quiet) {
  lat = Math.round(lat * 1e6) / 1e6; lng = Math.round(lng * 1e6) / 1e6;
  if (!vtPin.marker) {
    vtPin.marker = L.marker([lat, lng], { draggable: true }).addTo(vtPin.map);
    vtPin.marker.on('dragend', function() { var p = vtPin.marker.getLatLng(); vtPinSet(p.lat, p.lng); });
  } else vtPin.marker.setLatLng([lat, lng]);
  if (!quiet) { var inp = document.getElementById('vtrec-pin'); if (inp) inp.value = lat + ', ' + lng; }
}

function vtPinSyncFromInput() {
  if (!vtPin.map) return;
  var cur = vtRecParsePin((document.getElementById('vtrec-pin') || {}).value);
  if (cur) { vtPinSet(cur[0], cur[1], true); vtPin.map.setView(cur, Math.max(vtPin.map.getZoom(), 16)); }
}

// Address/place search via OpenStreetMap's free geocoder, biased to the Hội An area.
function vtPinSearch() {
  var q = (document.getElementById('vtpin-q').value || '').trim(), out = document.getElementById('vtpin-results');
  if (!q) return;
  out.innerHTML = '<div style="padding:4px 0;color:var(--muted)">Searching…</div>';
  var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=vn&viewbox=108.24,15.97,108.45,15.80&bounded=1&q=' + encodeURIComponent(q);
  fetch(url, { headers: { 'Accept-Language': 'en' } }).then(function(r) { return r.json(); }).then(function(list) {
    if (!list || !list.length) { out.innerHTML = '<div style="padding:4px 0;color:var(--muted)">No match in Hội An — try the street address, or just click the spot on the map.</div>'; return; }
    window._vtPinHits = list;
    out.innerHTML = list.map(function(h, i) {
      return '<div onclick="vtPinPick(' + i + ')" style="padding:6px 8px;margin-bottom:4px;border:1px solid var(--sand,#ddd);border-radius:8px;cursor:pointer;background:#fff">' + esc(h.display_name) + '</div>';
    }).join('');
  }).catch(function() { out.innerHTML = '<div style="padding:4px 0;color:#B91C1C">Search didn\'t work — click the spot on the map instead.</div>'; });
}

function vtPinPick(i) {
  var h = (window._vtPinHits || [])[i]; if (!h) return;
  var lat = parseFloat(h.lat), lng = parseFloat(h.lon);
  vtPinSet(lat, lng); vtPin.map.setView([lat, lng], 18);
  document.getElementById('vtpin-results').innerHTML = '<div style="padding:4px 0;color:var(--muted)">Pinned. Zoom in and drag the pin if it\'s not quite on the door.</div>';
}

function vtRecSave(id) {
  var f = _vtRecReadForm();
  var err = document.getElementById('vtrec-err');
  var bad = function(msg) { err.textContent = msg; err.style.display = 'block'; };
  f.name = (f.name || '').trim(); f.maps_url = (f.maps_url || '').trim();
  if (!f.name) return bad('Add a name.');
  if (vtRecUploading) return bad('Wait for the uploads to finish.');
  if (f.maps_url && !/^https?:\/\//i.test(f.maps_url)) return bad('The Maps link should start with https://');
  if (f.menu_url && !/^https:\/\//i.test(f.menu_url.trim())) return bad('The menu link should start with https://');
  var pin = vtRecParsePin(f.pin) || (!(f.pin||'').trim() ? vtRecParsePin(f.maps_url) : null);
  if ((f.pin||'').trim() && !pin) return bad('The map pin should look like 15.87704, 108.32604');

  var payload = {
    category: f.category, name: f.name, description: (f.description||'').trim(), maps_url: f.maps_url,
    photos: vtRecDraftPhotos.slice(), image_url: vtRecDraftPhotos[0] || '',
    popular: (f.popular||'').trim(), price_range: f.price_range, walk_time: (f.walk_time||'').trim(),
    hours: (f.hours||'').trim(), booking: f.booking, tip: (f.tip||'').trim(), menu_url: (f.menu_url||'').trim(), menu_photos: vtRecDraftMenu.slice(),
    lat: pin ? pin[0] : null, lng: pin ? pin[1] : null
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
    vtRecEditing = null; vtRecDraftPhotos = []; vtRecDraftMenu = [];
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
      +   '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+[r.price_range, r.walk_time, (r.photos||[]).length ? (r.photos.length+' photo'+(r.photos.length>1?'s':'')) : 'No photos', (r.menu_photos||[]).length ? 'Menu: '+r.menu_photos.length+' page'+(r.menu_photos.length>1?'s':'') : (r.menu_url ? 'Menu link' : '')].filter(Boolean).map(esc).join(' · ')+'</div>'
      +   (r.description ? '<div style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.5">'+esc(r.description)+'</div>' : '')
      +   (r.maps_url ? '<a href="'+esc(r.maps_url)+'" target="_blank" rel="noopener" style="font-size:11px">Map ↗</a>' : '<div style="font-size:11px;color:#B45309;margin-top:3px">No map link</div>')
      +   (r.lat!=null && r.lng!=null ? '' : '<div style="font-size:11px;color:#B45309;margin-top:3px">Not on map</div>')
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

// Free, key-less street tiles. If a provider fails to load (blocked, down or rate
// limited), the map quietly switches to the next one so it never sits blank.
var YS_TILE_PROVIDERS = [
  { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', opts: { maxZoom: 19, attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors' } },
  { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', opts: { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' } },
  { url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', opts: { subdomains: 'abc', maxZoom: 19, attribution: '&copy; OpenStreetMap contributors, tiles by OSM France' } }
];
function ysAddTiles(map, i) {
  i = i || 0;
  var p = YS_TILE_PROVIDERS[i]; if (!p) return null;
  var ok = 0, bad = 0, switched = false;
  var layer = L.tileLayer(p.url, Object.assign({ className: 'vm-tiles' }, p.opts));
  layer.on('tileload', function() { ok++; });
  layer.on('tileerror', function() {
    bad++;
    if (!switched && ok === 0 && bad >= 3 && YS_TILE_PROVIDERS[i + 1]) {
      switched = true; map.removeLayer(layer); ysAddTiles(map, i + 1);
    }
  });
  layer.addTo(map);
  if (layer.bringToBack) layer.bringToBack();
  return layer;
}
