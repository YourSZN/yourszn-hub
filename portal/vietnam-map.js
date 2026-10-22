/* ═══════════ Map tab: real street map of Hội An ═══════════
   Leaflet (vendored in /vendor/leaflet) with CARTO "Voyager" tiles built from
   OpenStreetMap data, warmed slightly to match the dashboard. Pins come from
   recsData (lat/lng set in the staff portal); each opens in Google Maps.
   Uses page globals: recsData, REC_CATS, recEsc, recSafeUrl, recPhotos,
   setTab, setRecFilter, recVisible. */

var VM = {
  // Anything inside this box is drawn on the map; further out goes to "Further afield".
  NEAR: { lat0: 15.80, lat1: 15.97, lng0: 108.24, lng1: 108.45 },
  HOME: { lat: 15.8820, lng: 108.3410, name: 'SIP Boutique Hoi An',
          addr: '14 Tuệ Tĩnh, Cẩm Châu', maps: 'https://www.google.com/maps/search/?api=1&query=SIP+Boutique+Villa+%26+Apartment+Hoi+An' },
  COLORS: { food: '#9A6250', cafe: '#8C7550', bar: '#1C1712', activity: '#5F7253', sightseeing: '#8C6E38',
            spa: '#6F8A86', shopping: '#A0707E', beach: '#4F7A8C', daytrip: '#6B5B4F' },
  VIEWS: { town: [[15.8745, 108.3225], [15.8815, 108.3440]], area: [[15.865, 108.318], [15.918, 108.392]] },
  map: null, layer: null, homeMarker: null, filter: 'all', sel: null, view: 'town'
};

function vmHasPin(r) { return r && typeof r.lat === 'number' && typeof r.lng === 'number'; }
function vmNear(r) { var b = VM.NEAR; return r.lat >= b.lat0 && r.lat <= b.lat1 && r.lng >= b.lng0 && r.lng <= b.lng1; }
function vmCat(id) { return (REC_CATS || []).filter(function(c) { return c.id === id; })[0] || { id: id, lbl: '', icon: '📍' }; }
function vmKm(a, b) {
  var R = 6371, toR = Math.PI / 180, dLa = (b.lat - a.lat) * toR, dLn = (b.lng - a.lng) * toR;
  var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLn / 2) * Math.sin(dLn / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
function vmDir(a, b) {
  var ang = Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180 / Math.PI;
  return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(((ang + 360) % 360) / 45) % 8];
}
function vmPinned() { return (recsData || []).filter(vmHasPin); }
function vmShown(r) { return VM.filter === 'all' || r.category === VM.filter; }
function vmMapsLink(r) { return recSafeUrl(r.maps_url) || ('https://www.google.com/maps/search/?api=1&query=' + r.lat + ',' + r.lng); }

/* ── Panel ── */
function vtMapPanelHTML() {
  return '<div class="vm-head"><div class="vm-title">Hội An map</div>'
    + '<div class="vm-sub">Everything we recommend, on a real street map. Tap a pin for details — every place opens in Google Maps for directions.</div></div>'
    + '<div class="vm-filters" id="vm-filters"></div>'
    + '<div class="vm-wrap" id="vm-wrap">'
    +   '<div id="vm-leaflet" class="vm-leaflet"></div>'
    +   '<div class="vm-views"><button type="button" id="vm-v-town" onclick="vmView(\'town\')">Old Town</button><button type="button" id="vm-v-area" onclick="vmView(\'area\')">Whole area</button></div>'
    +   '<div class="vm-card" id="vm-card"></div>'
    + '</div>'
    + '<div id="vm-far"></div>';
}

function vmCatsPresent() {
  var pinned = vmPinned();
  return (REC_CATS || []).filter(function(c) { return pinned.some(function(r) { return r.category === c.id; }); });
}

function vmRenderFilters() {
  var el = document.getElementById('vm-filters'); if (!el) return;
  var cats = vmCatsPresent();
  if (VM.filter !== 'all' && !cats.some(function(c) { return c.id === VM.filter; })) VM.filter = 'all';
  el.innerHTML = '<button class="rec-subtab' + (VM.filter === 'all' ? ' on' : '') + '" onclick="vmSetFilter(\'all\')">All</button>'
    + cats.map(function(c) {
      return '<button class="rec-subtab' + (VM.filter === c.id ? ' on' : '') + '" onclick="vmSetFilter(\'' + c.id + '\')">'
        + '<span class="vm-dot" style="background:' + (VM.COLORS[c.id] || '#5E5248') + '"></span>' + c.lbl + '</button>';
    }).join('');
}

function vmSetFilter(f) {
  VM.filter = f; VM.sel = null;
  vmRenderFilters(); vmRenderPins(); vmRenderFar(); vmRenderCard();
  // Zoom to fit what's showing when a category is picked
  if (f !== 'all' && VM.map) {
    var pts = vmPinned().filter(function(r) { return vmNear(r) && vmShown(r); }).map(function(r) { return [r.lat, r.lng]; });
    if (pts.length) { pts.push([VM.HOME.lat, VM.HOME.lng]); VM.map.fitBounds(pts, { padding: [50, 50], maxZoom: 17 }); VM.view = null; vmViewBtns(); }
  }
}

/* ── Pins ── */
function vmPinIcon(r, on) {
  var cat = vmCat(r.category);
  return L.divIcon({
    className: 'vm-pin-wrap',
    html: '<div class="vm-pin' + (on ? ' on' : '') + '" style="--c:' + (VM.COLORS[r.category] || '#5E5248') + '">'
      + '<span class="vm-pin-head"><span>' + cat.icon + '</span></span>'
      + '<span class="vm-pin-name">' + recEsc(r.name) + '</span></div>',
    iconSize: [30, 30], iconAnchor: [15, 36]
  });
}

function vmRenderPins() {
  if (!VM.map) return;
  VM.layer.clearLayers();
  vmPinned().forEach(function(r) {
    if (!vmNear(r) || !vmShown(r)) return;
    var i = recsData.indexOf(r);
    var m = L.marker([r.lat, r.lng], { icon: vmPinIcon(r, VM.sel === i), riseOnHover: true, zIndexOffset: VM.sel === i ? 1000 : 0, keyboard: true, title: r.name });
    m.on('click', function() { vmSelect(i); });
    m.addTo(VM.layer);
  });
  vmDeclutterSoon();
}

// Run after the browser has laid the markers out (and after zoom animations).
function vmDeclutterSoon() {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function() { requestAnimationFrame(vmDeclutter); });
  else setTimeout(vmDeclutter, 30);
}

// Hide pin names that would overlap another pin or name (tap the pin to see it).
function vmDeclutter() {
  var wrap = document.getElementById('vm-leaflet'); if (!wrap) return;
  var placed = [];
  var hit = function(r) { return placed.some(function(p) { return !(r.right < p.left || r.left > p.right || r.bottom < p.top || r.top > p.bottom); }); };
  var add = function(r) { placed.push({ left: r.left - 2, right: r.right + 2, top: r.top - 1, bottom: r.bottom + 1 }); };
  wrap.querySelectorAll('.vm-pin-head, .vm-home-ico').forEach(function(el) { add(el.getBoundingClientRect()); });
  var names = Array.prototype.slice.call(wrap.querySelectorAll('.vm-home-name, .vm-pin.on .vm-pin-name'))
    .concat(Array.prototype.slice.call(wrap.querySelectorAll('.vm-pin:not(.on) .vm-pin-name')));
  names.forEach(function(el) {
    el.style.visibility = '';
    var r = el.getBoundingClientRect();
    if (hit(r)) el.style.visibility = 'hidden'; else add(r);
  });
}

/* ── Selected place card ── */
function vmSelect(i) {
  VM.sel = (VM.sel === i || i === null || i === undefined) ? null : i;
  vmRenderPins(); vmRenderCard();
}

function vmRenderCard() {
  var el = document.getElementById('vm-card'); if (!el) return;
  if (VM.sel === null || VM.sel === undefined) { el.classList.remove('open'); el.innerHTML = ''; return; }
  var close = '<button type="button" class="vm-card-x" onclick="vmSelect(null)" aria-label="Close">&times;</button>';
  if (VM.sel === 'home') {
    el.innerHTML = close + '<div class="vm-card-body"><div class="vm-card-cat">Your hotel</div><div class="vm-card-name">' + VM.HOME.name + '</div>'
      + '<div class="vm-card-info">' + VM.HOME.addr + ' — home base for the tour. Distances on every recommendation are measured from here.</div>'
      + '<div class="vm-card-acts"><a class="rec-map" href="' + VM.HOME.maps + '" target="_blank" rel="noopener">Open in Google Maps ↗</a></div></div>';
    el.classList.add('open'); return;
  }
  var r = (recsData || [])[VM.sel]; if (!r) { el.classList.remove('open'); return; }
  var cat = vmCat(r.category), ph = recPhotos(r)[0];
  var chips = [r.price_range, r.walk_time].filter(Boolean).map(function(c) { return '<span class="rec-chip">' + recEsc(c) + '</span>'; }).join('');
  el.innerHTML = close
    + (ph ? '<div class="vm-card-img" style="background-image:url(\'' + ph.replace(/'/g, '%27') + '\')"></div>' : '<div class="vm-card-img vm-card-noimg">' + cat.icon + '</div>')
    + '<div class="vm-card-body"><div class="vm-card-cat" style="color:' + (VM.COLORS[r.category] || '') + '">' + cat.lbl + '</div>'
    + '<div class="vm-card-name">' + recEsc(r.name) + '</div>'
    + (chips ? '<div class="rec-chips" style="margin:6px 0">' + chips + '</div>' : '')
    + (r.description ? '<div class="vm-card-info">' + recEsc(r.description).slice(0, 160) + (r.description.length > 160 ? '…' : '') + '</div>' : '')
    + '<div class="vm-card-acts"><a class="rec-map" href="' + vmMapsLink(r) + '" target="_blank" rel="noopener">Open in Google Maps ↗</a>'
    + '<button type="button" class="vm-more" onclick="vmOpenDetails(' + VM.sel + ')">Full details →</button></div></div>';
  el.classList.add('open');
}

function vmOpenDetails(i) {
  var r = (recsData || [])[i]; if (!r) return;
  setTab('recs');
  setRecFilter(r.category);
  var k = (recVisible || []).indexOf(r);
  var t = document.querySelectorAll('#panel-recs .rec-tile')[k];
  if (t) {
    t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    t.classList.add('vm-flash'); setTimeout(function() { t.classList.remove('vm-flash'); }, 1800);
  } else window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Places beyond the map ── */
function vmRenderFar() {
  var el = document.getElementById('vm-far'); if (!el) return;
  var far = vmPinned().filter(function(r) { return !vmNear(r) && vmShown(r); });
  if (!far.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<div class="vm-far-title">Further afield</div><div class="vm-far-list">'
    + far.map(function(r) {
      var cat = vmCat(r.category), km = Math.round(vmKm(VM.HOME, r));
      return '<a class="vm-far-item" href="' + vmMapsLink(r) + '" target="_blank" rel="noopener">'
        + '<span class="vm-far-ico" style="background:' + (VM.COLORS[r.category] || '#5E5248') + '">' + cat.icon + '</span>'
        + '<span class="vm-far-txt"><b>' + recEsc(r.name) + '</b><span>About ' + km + ' km ' + vmDir(VM.HOME, r) + (r.walk_time ? ' · ' + recEsc(r.walk_time) : '') + '</span></span>'
        + '<span class="vm-far-go">Maps ↗</span></a>';
    }).join('') + '</div>';
}

/* ── Views ── */
function vmViewBtns() {
  var t = document.getElementById('vm-v-town'), a = document.getElementById('vm-v-area');
  if (t && a) { t.classList.toggle('on', VM.view === 'town'); a.classList.toggle('on', VM.view === 'area'); }
}

function vmView(v) {
  VM.view = v;
  if (VM.map) VM.map.fitBounds(VM.VIEWS[v], { padding: [10, 10] });
  vmViewBtns();
}

function vmInitMap() {
  var el = document.getElementById('vm-leaflet');
  if (!el || typeof L === 'undefined') {
    if (el) el.innerHTML = '<div class="empty" style="padding:40px">The map couldn’t load. Please refresh the page.</div>';
    return false;
  }
  VM.map = L.map(el, { zoomControl: false, attributionControl: true, minZoom: 11, maxZoom: 19, scrollWheelZoom: true });
  L.control.zoom({ position: 'topright' }).addTo(VM.map);
  L.control.scale({ position: 'bottomleft', imperial: false }).addTo(VM.map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, className: 'vm-tiles',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  }).addTo(VM.map);
  VM.layer = L.layerGroup().addTo(VM.map);
  VM.homeMarker = L.marker([VM.HOME.lat, VM.HOME.lng], {
    zIndexOffset: 2000, title: VM.HOME.name,
    icon: L.divIcon({ className: 'vm-pin-wrap', iconSize: [34, 34], iconAnchor: [17, 17],
      html: '<div class="vm-home"><span class="vm-home-ico">★</span><span class="vm-home-name">SIP Boutique · home</span></div>' })
  }).addTo(VM.map);
  VM.homeMarker.on('click', function() { VM.sel = VM.sel === 'home' ? null : 'home'; vmRenderPins(); vmRenderCard(); });
  VM.map.on('zoomend moveend', vmDeclutterSoon);
  VM.map.on('dragstart', function() { if (VM.view) { VM.view = null; vmViewBtns(); } });
  return true;
}

// Called when the Map tab opens (the map needs to be visible to measure itself).
function vtMapShow() {
  if (!document.getElementById('vm-wrap')) return;
  vmRenderFilters(); vmRenderFar();
  if (!VM.map) {
    if (!vmInitMap()) return;
    vmRenderPins();
    vmView('town');
  } else {
    VM.map.invalidateSize();
    vmRenderPins();
  }
}
