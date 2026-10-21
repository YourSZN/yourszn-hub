/* ═══════════ Map tab: illustrated "mud map" of Hội An ═══════════
   Pins come from recsData (lat/lng set in the staff portal). The map art is
   drawn from rough real coordinates, so pins land in about the right place;
   each pin links out to Google Maps for real navigation.
   Uses page globals: recsData, REC_CATS, recEsc, recSafeUrl, recPhotos,
   setTab, setRecFilter, recVisible. */

var VM = {
  LAT0: 15.862, LAT1: 15.924, LNG0: 108.308, LNG1: 108.402,
  W: 1000, H: 684, PAD: 420,
  HOME: { lat: 15.8820, lng: 108.3410, name: 'SIP Boutique Hoi An',
          addr: '14 Tuệ Tĩnh, Cẩm Châu', maps: 'https://www.google.com/maps/search/?api=1&query=SIP+Boutique+Villa+%26+Apartment+Hoi+An' },
  COLORS: { food: '#9A6250', cafe: '#8C7550', bar: '#1C1712', activity: '#5F7253', sightseeing: '#8C6E38',
            spa: '#6F8A86', shopping: '#A0707E', beach: '#4F7A8C', daytrip: '#6B5B4F' },
  s: 1, tx: 0, ty: 0, fitS: 1, filter: 'all', sel: null, inited: false,
  ptrs: {}, drag: null
};

function vmProj(lat, lng) {
  return { x: (lng - VM.LNG0) / (VM.LNG1 - VM.LNG0) * VM.W, y: (VM.LAT1 - lat) / (VM.LAT1 - VM.LAT0) * VM.H };
}
function vmInBounds(r) { return r.lat >= VM.LAT0 && r.lat <= VM.LAT1 && r.lng >= VM.LNG0 && r.lng <= VM.LNG1; }
function vmHasPin(r) { return r && typeof r.lat === 'number' && typeof r.lng === 'number'; }
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

/* ── Drawing helpers ── */
function vmPts(list) { return list.map(function(p) { return vmProj(p[0], p[1]); }); }
// Smooth curve through points (Catmull-Rom → cubic Bézier)
function vmCurve(pts, closed) {
  var n = pts.length, d = 'M' + pts[0].x.toFixed(1) + ',' + pts[0].y.toFixed(1);
  var get = function(i) { return closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]; };
  for (var i = 0; i < (closed ? n : n - 1); i++) {
    var p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    d += ' C' + (p1.x + (p2.x - p0.x) / 6).toFixed(1) + ',' + (p1.y + (p2.y - p0.y) / 6).toFixed(1)
      + ' ' + (p2.x - (p3.x - p1.x) / 6).toFixed(1) + ',' + (p2.y - (p3.y - p1.y) / 6).toFixed(1)
      + ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1);
  }
  return d + (closed ? 'Z' : '');
}
// A river as a filled band whose width grows downstream
function vmRiver(center, w0, w1) {
  var pts = vmPts(center), n = pts.length, L = [], Rr = [];
  for (var i = 0; i < n; i++) {
    var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var w = (w0 + (w1 - w0) * Math.pow(i / (n - 1), 1.6)) / 2;
    L.push({ x: pts[i].x - dy / len * w, y: pts[i].y + dx / len * w });
    Rr.push({ x: pts[i].x + dy / len * w, y: pts[i].y - dx / len * w });
  }
  return vmCurve(L, false) + ' L' + vmCurve(Rr.reverse(), false).slice(1) + 'Z';
}

function vmSVG() {
  var coast = [[15.962, 108.3020], [15.945, 108.3170], [15.924, 108.3335], [15.914, 108.3418], [15.905, 108.3522], [15.895, 108.3690], [15.887, 108.3860], [15.880, 108.3975], [15.876, 108.402], [15.866, 108.4140], [15.850, 108.4300], [15.835, 108.4450]];
  var cp = vmPts(coast), far = VM.W + VM.PAD + 50, top = -VM.PAD - 50, bot = VM.H + VM.PAD + 50;
  var sea = vmCurve(cp, false) + ' L' + cp[cp.length - 1].x.toFixed(0) + ',' + bot + ' L' + far + ',' + bot + ' L' + far + ',' + top + ' L' + cp[0].x.toFixed(0) + ',' + top + ' Z';
  var beachLine = vmCurve(vmPts([[15.962, 108.3013], [15.945, 108.3163], [15.924, 108.3328], [15.914, 108.3410], [15.905, 108.3514], [15.895, 108.3682], [15.887, 108.3851], [15.880, 108.3966], [15.876, 108.4012], [15.866, 108.4132], [15.850, 108.4292], [15.835, 108.4442]]), false);

  var river = vmRiver([[15.8722, 108.270], [15.8738, 108.285], [15.8745, 108.300], [15.8752, 108.312], [15.8758, 108.3205], [15.8760, 108.3260], [15.8754, 108.3330],
    [15.8737, 108.3440], [15.8726, 108.3560], [15.8736, 108.3665], [15.8757, 108.3785], [15.8776, 108.3900], [15.8785, 108.4050], [15.8790, 108.4200]], 12, 56);
  var channelAnHoi = vmRiver([[15.8752, 108.3175], [15.8737, 108.3230], [15.8732, 108.3280], [15.8740, 108.3335]], 4, 5);
  var creeks = [
    [[15.8770, 108.3640], [15.8795, 108.3700], [15.8815, 108.3760], [15.8812, 108.3830]],
    [[15.8762, 108.3720], [15.8790, 108.3745], [15.8830, 108.3735], [15.8850, 108.3770]],
    [[15.8745, 108.3500], [15.8775, 108.3530], [15.8795, 108.3580]]
  ].map(function(c) { return '<path d="' + vmCurve(vmPts(c), false) + '" fill="none" stroke="#A9C1C2" stroke-width="2.4" stroke-linecap="round"/>'; }).join('');

  var blob = function(list) { return vmCurve(vmPts(list), true); };
  var oldTown = blob([[15.8805, 108.3238], [15.8812, 108.3290], [15.8808, 108.3345], [15.8786, 108.3352], [15.8768, 108.3335], [15.8763, 108.3280], [15.8766, 108.3240]]);
  var anHoi = blob([[15.8752, 108.3195], [15.8744, 108.3285], [15.8748, 108.3330], [15.8738, 108.3335], [15.8728, 108.3270], [15.8735, 108.3200]]);
  var fields = [
    [[15.9105, 108.3270], [15.9090, 108.3355], [15.9000, 108.3345], [15.8925, 108.3330], [15.8930, 108.3245], [15.9020, 108.3225]],
    [[15.8930, 108.3395], [15.8960, 108.3500], [15.8905, 108.3640], [15.8865, 108.3560], [15.8870, 108.3440]],
    [[15.9180, 108.3150], [15.9205, 108.3260], [15.9130, 108.3290], [15.9120, 108.3180]],
    [[15.8710, 108.3100], [15.8705, 108.3200], [15.8665, 108.3230], [15.8650, 108.3120]],
    [[15.8700, 108.3390], [15.8695, 108.3540], [15.8650, 108.3560], [15.8640, 108.3400]],
    [[15.8995, 108.2850], [15.9010, 108.2990], [15.8920, 108.3020], [15.8900, 108.2880]],
    [[15.9230, 108.2900], [15.9260, 108.3050], [15.9180, 108.3070], [15.9160, 108.2930]],
    [[15.8640, 108.2850], [15.8650, 108.3000], [15.8580, 108.3020], [15.8560, 108.2880]],
    [[15.8600, 108.3650], [15.8610, 108.3850], [15.8540, 108.3870], [15.8530, 108.3680]],
    [[15.8580, 108.3200], [15.8590, 108.3360], [15.8520, 108.3380], [15.8510, 108.3220]]
  ].map(function(f) { return '<path d="' + blob(f) + '" fill="url(#vm-field)" stroke="#9AAB88" stroke-width="1.4" stroke-dasharray="5 4"/>'; }).join('');
  var palms = blob([[15.8800, 108.3665], [15.8848, 108.3712], [15.8858, 108.3800], [15.8820, 108.3840], [15.8780, 108.3800], [15.8768, 108.3720]]);

  var road = function(list, w) {
    var d = vmCurve(vmPts(list), false);
    return '<path d="' + d + '" fill="none" stroke="#E9DDCB" stroke-width="' + (w + 3) + '" stroke-linecap="round"/>'
      + '<path d="' + d + '" fill="none" stroke="#B9A385" stroke-width="' + w + '" stroke-linecap="round" stroke-dasharray="1 0"/>';
  };
  var roads = road([[15.9240, 108.3268], [15.9135, 108.3368], [15.9060, 108.3355], [15.8960, 108.3328], [15.8860, 108.3305], [15.8795, 108.3285]], 2.6)
    + road([[15.8795, 108.3335], [15.8806, 108.3420], [15.8830, 108.3550], [15.8868, 108.3700], [15.8902, 108.3830]], 2.6)
    + road([[15.9135, 108.3390], [15.9040, 108.3490], [15.8945, 108.3660], [15.8890, 108.3800], [15.8840, 108.3920]], 2)
    + road([[15.8795, 108.3080], [15.8800, 108.3170], [15.8805, 108.3240]], 2);

  var street = function(list) { return '<path d="' + vmCurve(vmPts(list), false) + '" fill="none" stroke="#B48A66" stroke-width="1.3" stroke-linecap="round" opacity=".75"/>'; };
  var streets = street([[15.8775, 108.3250], [15.8778, 108.3290], [15.8776, 108.3340]])          // Trần Phú
    + street([[15.8769, 108.3255], [15.8770, 108.3295], [15.8768, 108.3335]])                     // Nguyễn Thái Học
    + street([[15.8788, 108.3245], [15.8792, 108.3300], [15.8790, 108.3345]])                     // Phan Châu Trinh
    + street([[15.8803, 108.3270], [15.8768, 108.3272]]) + street([[15.8806, 108.3300], [15.8768, 108.3302]])
    + street([[15.8803, 108.3325], [15.8770, 108.3323]]);
  // the bridge across to An Hội + the Japanese Bridge tick
  var b1 = vmProj(15.8760, 108.3283), b2 = vmProj(15.8745, 108.3283);

  var P = VM.PAD, vw = VM.W + 2 * P, vh = VM.H + 2 * P;
  return '<svg viewBox="' + (-P) + ' ' + (-P) + ' ' + vw + ' ' + vh + '" width="' + vw + '" height="' + vh + '" xmlns="http://www.w3.org/2000/svg" style="display:block;position:absolute;left:' + (-P) + 'px;top:' + (-P) + 'px">'
    + '<defs>'
    +   '<filter id="vm-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="4"/></filter>'
    +   '<pattern id="vm-field" width="14" height="10" patternUnits="userSpaceOnUse"><path d="M1 8 l3 -4 M6 8 l3 -4 M11 8 l2 -3" stroke="#93A47F" stroke-width="1" fill="none" stroke-linecap="round"/></pattern>'
    +   '<pattern id="vm-waves" width="46" height="26" patternUnits="userSpaceOnUse"><path d="M4 13 q5 -6 10 0 t10 0" stroke="#9FB6B5" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M27 24 q4 -5 8 0" stroke="#9FB6B5" stroke-width="1" fill="none" stroke-linecap="round"/></pattern>'
    +   '<pattern id="vm-town" width="11" height="9" patternUnits="userSpaceOnUse"><rect x="1.5" y="1.5" width="4" height="3" rx=".8" fill="#C99A72" opacity=".35"/></pattern>'
    +   '<pattern id="vm-palm" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M8 9 l-4 -3 M8 9 l4 -3 M8 9 l-3 3 M8 9 l3 3 M8 9 v-5" stroke="#6F8A5E" stroke-width="1.1" fill="none" stroke-linecap="round"/></pattern>'
    + '</defs>'
    + '<rect x="' + (-P) + '" y="' + (-P) + '" width="' + vw + '" height="' + vh + '" fill="#F4EDE3"/>'
    + '<g filter="url(#vm-rough)">'
    +   fields
    +   '<path d="' + palms + '" fill="#DCE3CF" stroke="#8FA67F" stroke-width="1.4"/><path d="' + palms + '" fill="url(#vm-palm)"/>'
    +   roads
    +   '<path d="' + sea + '" fill="#D2DEDC"/><path d="' + sea + '" fill="url(#vm-waves)"/>'
    +   '<path d="' + beachLine + '" fill="none" stroke="#E7D5B4" stroke-width="9" stroke-linecap="round" opacity=".9"/>'
    +   '<path d="' + vmCurve(cp, false) + '" fill="none" stroke="#7E9A99" stroke-width="1.6"/>'
    +   '<path d="' + river + '" fill="#C3D4D3" stroke="#7E9A99" stroke-width="1.4"/>'
    +   '<path d="' + channelAnHoi + '" fill="#C3D4D3" stroke="#7E9A99" stroke-width="1"/>'
    +   creeks
    +   '<path d="' + anHoi + '" fill="#EDE2D2" stroke="#B9A385" stroke-width="1"/><path d="' + anHoi + '" fill="url(#vm-town)" opacity=".7"/>'
    +   '<path d="' + oldTown + '" fill="#EFDCC6" stroke="#B48A66" stroke-width="1.6"/><path d="' + oldTown + '" fill="url(#vm-town)"/>' + streets
    +   '<line x1="' + b1.x + '" y1="' + b1.y + '" x2="' + b2.x + '" y2="' + b2.y + '" stroke="#8C7550" stroke-width="2.4"/>'
    + '</g>'
    + '</svg>';
}

var VM_LABELS = [
  { lat: 15.8826, lng: 108.3292, t: 'Old Town', c: 'big' },
  { lat: 15.8722, lng: 108.3262, t: 'An Hội', c: 'sm', z: 1.8 },
  { lat: 15.8712, lng: 108.3500, t: 'Thu Bồn River', c: 'water' },
  { lat: 15.9045, lng: 108.3280, t: 'Trà Quế veggie village', c: 'sm' },
  { lat: 15.8870, lng: 108.3770, t: 'Cẩm Thanh coconut forest', c: 'sm' },
  { lat: 15.9130, lng: 108.3770, t: 'East Sea', c: 'sea' },
  { lat: 15.8935, lng: 108.3890, t: 'Cửa Đại Beach', c: 'sm' },
  { lat: 15.9165, lng: 108.3330, t: 'An Bàng', c: 'sm' },
  { lat: 15.8885, lng: 108.3450, t: 'Cẩm Châu', c: 'sm', z: 1.5 },
  { lat: 15.9400, lng: 108.3060, t: 'to Đà Nẵng, 30 km ↑', c: 'xs' }
];

/* ── Panel ── */
function vmPinned() { return (recsData || []).filter(vmHasPin); }

function vtMapPanelHTML() {
  return '<div class="vm-head"><div><div class="vm-title">Hội An, roughly</div>'
    + '<div class="vm-sub">A hand-drawn map of everything we recommend. Tap a pin for details — every place opens in Google Maps for directions.</div></div></div>'
    + '<div class="vm-filters" id="vm-filters"></div>'
    + '<div class="vm-wrap" id="vm-wrap">'
    +   '<div class="vm-world" id="vm-world">' + vmSVG() + '</div>'
    +   '<div class="vm-overlay" id="vm-overlay"></div>'
    +   '<div class="vm-ctrls">'
    +     '<button type="button" onclick="vmZoomBy(1.5)" aria-label="Zoom in">+</button>'
    +     '<button type="button" onclick="vmZoomBy(1/1.5)" aria-label="Zoom out">&minus;</button>'
    +   '</div>'
    +   '<div class="vm-views"><button type="button" id="vm-v-town" onclick="vmView(\'town\')">Old Town</button><button type="button" id="vm-v-area" onclick="vmView(\'area\')">Whole area</button></div>'
    +   '<div class="vm-compass" aria-hidden="true"><span>N</span><svg viewBox="0 0 20 28" width="14" height="20"><path d="M10 1 L16 26 L10 20 L4 26 Z" fill="#5E5248"/><path d="M10 1 L10 20 L4 26 Z" fill="#B9A385"/></svg></div>'
    +   '<div class="vm-scale" id="vm-scale"></div>'
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

function vmSetFilter(f) { VM.filter = f; VM.sel = null; vmRenderFilters(); vmRenderOverlay(); vmRenderFar(); vmRenderCard(); }

function vmShown(r) { return VM.filter === 'all' || r.category === VM.filter; }

/* ── Overlay: labels + pins at constant size ── */
function vmRenderOverlay() {
  var ov = document.getElementById('vm-overlay'); if (!ov) return;
  var rel = VM.s / VM.fitS, html = '';
  VM_LABELS.forEach(function(l) {
    if (l.z && rel < l.z) return;
    var p = vmProj(l.lat, l.lng);
    html += '<div class="vm-lbl vm-lbl-' + l.c + '" style="left:' + (p.x * VM.s + VM.tx).toFixed(1) + 'px;top:' + (p.y * VM.s + VM.ty).toFixed(1) + 'px">' + l.t + '</div>';
  });
  var pins = vmPinned().map(function(r, i) { return { r: r, i: (recsData || []).indexOf(r) }; })
    .filter(function(o) { return vmInBounds(o.r) && vmShown(o.r); })
    .sort(function(a, b) { return b.r.lat - a.r.lat; });
  pins.forEach(function(o) {
    var r = o.r, p = vmProj(r.lat, r.lng), cat = vmCat(r.category), on = VM.sel === o.i;
    html += '<button type="button" class="vm-pin' + (on ? ' on' : '') + '" style="left:' + (p.x * VM.s + VM.tx).toFixed(1) + 'px;top:' + (p.y * VM.s + VM.ty).toFixed(1) + 'px;--c:' + (VM.COLORS[r.category] || '#5E5248') + '" onclick="vmSelect(' + o.i + ')" aria-label="' + recEsc(r.name) + '">'
      + '<span class="vm-pin-head"><span>' + cat.icon + '</span></span>'
      + '<span class="vm-pin-name">' + recEsc(r.name) + '</span>'
      + '</button>';
  });
  var h = vmProj(VM.HOME.lat, VM.HOME.lng);
  html += '<button type="button" class="vm-home' + (VM.sel === 'home' ? ' on' : '') + '" style="left:' + (h.x * VM.s + VM.tx).toFixed(1) + 'px;top:' + (h.y * VM.s + VM.ty).toFixed(1) + 'px" onclick="vmSelect(\'home\')" aria-label="SIP Boutique, your hotel">'
    + '<span class="vm-home-ico">★</span><span class="vm-home-name">SIP Boutique · home</span></button>';
  ov.innerHTML = html;
  vmDeclutter(ov);
  vmRenderScale();
  var t = document.getElementById('vm-v-town'), a = document.getElementById('vm-v-area');
  if (t && a) { t.classList.toggle('on', VM.view === 'town'); a.classList.toggle('on', VM.view === 'area'); }
}

// Hide pin names and area labels that would collide with something more important.
function vmDeclutter(ov) {
  var placed = [], hit = function(r) {
    return placed.some(function(p) { return !(r.right < p.left || r.left > p.right || r.bottom < p.top || r.top > p.bottom); });
  };
  var add = function(el) { var r = el.getBoundingClientRect(); placed.push({ left: r.left - 3, right: r.right + 3, top: r.top - 2, bottom: r.bottom + 2 }); };
  var tryShow = function(el) { var r = el.getBoundingClientRect(); if (hit(r)) el.style.visibility = 'hidden'; else add(el); };
  ov.querySelectorAll('.vm-home-ico, .vm-pin-head').forEach(add);
  var home = ov.querySelector('.vm-home-name'); if (home) add(home);
  var sel = ov.querySelector('.vm-pin.on .vm-pin-name'); if (sel) add(sel);
  ov.querySelectorAll('.vm-pin:not(.on) .vm-pin-name').forEach(tryShow);
  ov.querySelectorAll('.vm-lbl-big, .vm-lbl-sea, .vm-lbl-water').forEach(tryShow);
  ov.querySelectorAll('.vm-lbl-sm, .vm-lbl-xs').forEach(tryShow);
}

function vmRenderScale() {
  var el = document.getElementById('vm-scale'); if (!el) return;
  var unitsPerKm = VM.W / vmKm({ lat: 15.893, lng: VM.LNG0 }, { lat: 15.893, lng: VM.LNG1 });
  var pxPerKm = unitsPerKm * VM.s, opts = [0.1, 0.2, 0.25, 0.5, 1, 2, 3, 5], km = opts[0];
  opts.forEach(function(o) { if (o * pxPerKm <= 110) km = o; });
  el.innerHTML = '<div class="vm-scale-bar" style="width:' + Math.round(km * pxPerKm) + 'px"></div><span>' + (km < 1 ? Math.round(km * 1000) + ' m' : km + ' km') + '</span>';
}

/* ── Selected place card ── */
function vmSelect(i) {
  if (VM.drag && VM.drag.moved) return;
  VM.sel = VM.sel === i ? null : i;
  vmRenderOverlay(); vmRenderFar(); vmRenderCard();
}

function vmMapsLink(r) {
  return recSafeUrl(r.maps_url) || ('https://www.google.com/maps/search/?api=1&query=' + r.lat + ',' + r.lng);
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
  var tiles = document.querySelectorAll('#panel-recs .rec-tile');
  var t = tiles[k];
  if (t) {
    t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    t.classList.add('vm-flash'); setTimeout(function() { t.classList.remove('vm-flash'); }, 1800);
  } else window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Places beyond the map edge ── */
function vmRenderFar() {
  var el = document.getElementById('vm-far'); if (!el) return;
  var far = vmPinned().filter(function(r) { return !vmInBounds(r) && vmShown(r); });
  if (!far.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<div class="vm-far-title">Further afield</div><div class="vm-far-list">'
    + far.map(function(r) {
      var i = recsData.indexOf(r), cat = vmCat(r.category), km = Math.round(vmKm(VM.HOME, r));
      return '<a class="vm-far-item" href="' + vmMapsLink(r) + '" target="_blank" rel="noopener">'
        + '<span class="vm-far-ico" style="background:' + (VM.COLORS[r.category] || '#5E5248') + '">' + cat.icon + '</span>'
        + '<span class="vm-far-txt"><b>' + recEsc(r.name) + '</b><span>About ' + km + ' km ' + vmDir(VM.HOME, r) + (r.walk_time ? ' · ' + recEsc(r.walk_time) : '') + '</span></span>'
        + '<span class="vm-far-go">Maps ↗</span></a>';
    }).join('') + '</div>';
}

/* ── View / zoom / pan ── */
function vmSize() { var w = document.getElementById('vm-wrap'); return w ? { w: w.clientWidth, h: w.clientHeight } : { w: 0, h: 0 }; }

function vmApply() {
  var sz = vmSize(), sw = VM.W * VM.s, sh = VM.H * VM.s;
  VM.tx = sw <= sz.w ? (sz.w - sw) / 2 : Math.min(0, Math.max(sz.w - sw, VM.tx));
  VM.ty = sh <= sz.h ? (sz.h - sh) / 2 : Math.min(0, Math.max(sz.h - sh, VM.ty));
  var wd = document.getElementById('vm-world');
  if (wd) wd.style.transform = 'translate(' + VM.tx + 'px,' + VM.ty + 'px) scale(' + VM.s + ')';
  vmRenderOverlay();
}

function vmFitBox(lat0, lat1, lng0, lng1) {
  var sz = vmSize(), a = vmProj(lat1, lng0), b = vmProj(lat0, lng1);
  var s = Math.min(sz.w / (b.x - a.x), sz.h / (b.y - a.y));
  VM.s = Math.max(VM.fitS * 0.999, Math.min(VM.fitS * 9, s));
  VM.tx = sz.w / 2 - (a.x + b.x) / 2 * VM.s; VM.ty = sz.h / 2 - (a.y + b.y) / 2 * VM.s;
  vmApply();
}

function vmView(v) {
  VM.view = v;
  if (v === 'town') vmFitBox(15.8730, 15.8865, 108.3215, 108.3455);
  else vmFitBox(VM.LAT0, VM.LAT1, VM.LNG0, VM.LNG1);
}

function vmZoomAt(f, cx, cy) {
  var ns = Math.max(VM.fitS, Math.min(VM.fitS * 9, VM.s * f));
  f = ns / VM.s;
  VM.tx = cx - (cx - VM.tx) * f; VM.ty = cy - (cy - VM.ty) * f; VM.s = ns; VM.view = null;
  vmApply();
}
function vmZoomBy(f) { var sz = vmSize(); vmZoomAt(f, sz.w / 2, sz.h / 2); }

function vmBindGestures() {
  var wrap = document.getElementById('vm-wrap');
  var rel = function(e) { var b = wrap.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  wrap.addEventListener('wheel', function(e) {
    e.preventDefault(); var p = rel(e); vmZoomAt(Math.exp(-e.deltaY * 0.0018), p.x, p.y);
  }, { passive: false });
  wrap.addEventListener('pointerdown', function(e) {
    if (e.target.closest('.vm-ctrls, .vm-views, .vm-card')) return;
    VM.ptrs[e.pointerId] = rel(e);
    var ids = Object.keys(VM.ptrs);
    if (ids.length === 1) VM.drag = { x: VM.ptrs[ids[0]].x, y: VM.ptrs[ids[0]].y, tx: VM.tx, ty: VM.ty, moved: false };
    else if (ids.length === 2) {
      var a = VM.ptrs[ids[0]], b = VM.ptrs[ids[1]];
      VM.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: VM.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx: VM.tx, ty: VM.ty };
      if (VM.drag) VM.drag.moved = true;
    }
  });
  wrap.addEventListener('pointermove', function(e) {
    if (!VM.ptrs[e.pointerId]) return;
    VM.ptrs[e.pointerId] = rel(e);
    var ids = Object.keys(VM.ptrs);
    if (ids.length >= 2 && VM.pinch) {
      var a = VM.ptrs[ids[0]], b = VM.ptrs[ids[1]], P = VM.pinch;
      var ns = Math.max(VM.fitS, Math.min(VM.fitS * 9, P.s * Math.hypot(a.x - b.x, a.y - b.y) / (P.d || 1)));
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      VM.tx = mx - (P.mx - P.tx) * ns / P.s; VM.ty = my - (P.my - P.ty) * ns / P.s; VM.s = ns; VM.view = null;
      vmApply();
    } else if (VM.drag) {
      var p = VM.ptrs[ids[0]], dx = p.x - VM.drag.x, dy = p.y - VM.drag.y;
      if (!VM.drag.moved && Math.abs(dx) + Math.abs(dy) > 5) { VM.drag.moved = true; try { wrap.setPointerCapture(e.pointerId); } catch (x) {} }
      if (VM.drag.moved) { VM.tx = VM.drag.tx + dx; VM.ty = VM.drag.ty + dy; VM.view = null; vmApply(); }
    }
  });
  var up = function(e) {
    delete VM.ptrs[e.pointerId];
    var ids = Object.keys(VM.ptrs);
    if (ids.length < 2) VM.pinch = null;
    if (!ids.length) setTimeout(function() { VM.drag = null; }, 0);
    else if (ids.length === 1) VM.drag = { x: VM.ptrs[ids[0]].x, y: VM.ptrs[ids[0]].y, tx: VM.tx, ty: VM.ty, moved: true };
  };
  wrap.addEventListener('pointerup', up);
  wrap.addEventListener('pointercancel', up);
  window.addEventListener('resize', function() {
    if (!document.getElementById('vm-wrap') || !vmSize().w) return;
    vmComputeFit(); if (VM.view) vmView(VM.view); else vmApply();
  });
}

function vmComputeFit() { var sz = vmSize(); VM.fitS = Math.min(sz.w / VM.W, sz.h / VM.H); }

// Called when the Map tab opens (the map needs to be visible to measure itself).
function vtMapShow() {
  if (!document.getElementById('vm-wrap')) return;
  vmComputeFit();
  if (!VM.inited) {
    VM.inited = true;
    vmBindGestures();
    vmRenderFilters(); vmRenderFar();
    vmView('town');
  } else { vmRenderFilters(); vmRenderFar(); if (VM.view) vmView(VM.view); else vmApply(); }
}
