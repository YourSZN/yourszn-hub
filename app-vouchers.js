// ══════════════════════════════════════════════════
// GIFT VOUCHER CREATOR
// ══════════════════════════════════════════════════
var VOUCHER_BG_B64 = "https://charming-starlight-37db1e.netlify.app/voucher_bg.jpg";
var VOUCHER_LOGO_B64 = null;
var voucherBgImage = "https://charming-starlight-37db1e.netlify.app/voucher_bg.jpg";
var voucherCounter = parseInt(localStorage.getItem('yszn_voucher_counter') || '59', 10);
var voucherRegistry = [];

function renderVoucherTab() {
  var el = document.getElementById('voucher-page-content'); if (!el) return;

  // Auto-fill today's date
  var today = new Date();
  var dd = String(today.getDate()).padStart(2,'0');
  var mm = String(today.getMonth()+1).padStart(2,'0');
  var yy = String(today.getFullYear()).slice(-2);
  var dateStr = dd + '.' + mm + '.' + yy;

  var nextNum = voucherCounter + 1;

  el.innerHTML = '<div style="display:grid;grid-template-columns:380px 1fr;gap:28px;align-items:start">'

    // ── LEFT: FORM ──
    + '<div>'
    + '<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:16px">Voucher Details</div>'


    // To / From / Message
    + '<div style="background:white;border:1px solid var(--sand);border-radius:12px;padding:16px;margin-bottom:14px">'
    + '<div style="font-size:11px;font-weight:600;color:var(--deep);margin-bottom:12px">Personalisation</div>'
    + '<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">To</label>'
    + '<input id="v-to" class="fi" placeholder="e.g. Lyn" oninput="voucherPreview()" style="width:100%;box-sizing:border-box"></div>'
    + '<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">Message</label>'
    + '<textarea id="v-msg" class="fi" rows="4" placeholder="e.g. Happy 40th Lyn! Enjoy your birthday cake..." oninput="voucherPreview()" style="width:100%;box-sizing:border-box;resize:vertical"></textarea></div>'
    + '<div><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">From</label>'
    + '<input id="v-from" class="fi" placeholder="e.g. Thuy, Nhu and Minori (and husbands)" oninput="voucherPreview()" style="width:100%;box-sizing:border-box"></div>'
    + '</div>'

    // Voucher meta
    + '<div style="background:white;border:1px solid var(--sand);border-radius:12px;padding:16px;margin-bottom:14px">'
    + '<div style="font-size:11px;font-weight:600;color:var(--deep);margin-bottom:12px">Voucher Info</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    + '<div><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">Voucher Number</label>'
    + '<input id="v-num" class="fi" value="'+nextNum+'" oninput="voucherPreview()" style="width:100%;box-sizing:border-box"></div>'
    + '<div><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">Date</label>'
    + '<input id="v-date" class="fi" value="'+dateStr+'" oninput="voucherPreview()" style="width:100%;box-sizing:border-box"></div>'
    + '</div>'
    + '<div><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">Voucher Code</label>'
    + '<input id="v-code" class="fi" placeholder="e.g. LYN1P" oninput="voucherPreview()" style="width:100%;box-sizing:border-box"></div>'
    + '</div>'

    // Title line
    + '<div style="background:white;border:1px solid var(--sand);border-radius:12px;padding:16px;margin-bottom:20px">'
    + '<div style="font-size:11px;font-weight:600;color:var(--deep);margin-bottom:8px">Voucher Title</div>'
    + '<input id="v-title" class="fi" value="1:1 Premium Colour Analysis" oninput="voucherPreview()" style="width:100%;box-sizing:border-box">'
    + '</div>'

    // Download button
    + '<button onclick="voucherDownload()" style="width:100%;background:var(--deep);color:#fff;border:none;border-radius:10px;padding:13px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:.3px">&#11015; Download &amp; Register Voucher</button>'
    + '</div>'

    // ── RIGHT: LIVE PREVIEW ──
    + '<div>'
    + '<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:16px">Live Preview</div>'
    + '<div id="voucher-preview-wrap" style="width:100%;max-width:680px">'
    + '<canvas id="voucher-canvas" style="width:100%;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.12)"></canvas>'
    + '</div>'
    + '</div>'
    + '</div>'

    // ── REGISTRY ──
    + '<div style="margin-top:40px">'
    + '<div style="font-family:\'Fraunces\',serif;font-size:22px;color:var(--deep);margin-bottom:16px">Issued Vouchers</div>'
    + '<div id="voucher-registry"></div>'
    + '</div>';

  voucherPreview();
  renderVoucherRegistry();
}
var voucherBgImage = "https://raw.githubusercontent.com/YourSZN/yourszn-hub/main/voucher_bg.jpg";
function voucherLoadBg(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    voucherBgImage = ev.target.result;
    var st = document.getElementById('voucher-bg-status');
    if (st) st.textContent = '✓ Image loaded: ' + file.name;
    voucherPreview();
  };
  reader.readAsDataURL(file);
}

function voucherClearBg() {
  voucherBgImage = null;
  var inp = document.getElementById('voucher-bg-input');
  if (inp) inp.value = '';
  var st = document.getElementById('voucher-bg-status');
  if (st) st.textContent = 'No image uploaded — voucher will use a plain background';
  voucherPreview();
}

function vg(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

function voucherPreview() {
  var canvas = document.getElementById('voucher-canvas'); if (!canvas) return;
  // High-res canvas: 2× for crisp download
  var W = 2600, H = 1840;
  canvas.width = W; canvas.height = H;
  canvas.style.width = '100%';
  var ctx = canvas.getContext('2d');

  // Load Google Fonts into the canvas via FontFace API
  var fontsReady = Promise.all([
    document.fonts.load('300 1px "Fraunces"'),
    document.fonts.load('italic 300 1px "Fraunces"'),
    document.fonts.load('italic 500 1px "Fraunces"'),
    document.fonts.load('500 1px "Fraunces"'),
  ]);

  function draw(bgImg, logoImg) {
    ctx.clearRect(0,0,W,H);

    // ── Background ──
    if (bgImg) {
      var iw = bgImg.naturalWidth, ih = bgImg.naturalHeight;
      var scale = Math.max(W/iw, H/ih);
      var dw = iw*scale, dh = ih*scale;
      ctx.drawImage(bgImg, (W-dw)/2, (H-dh)/2, dw, dh);
   
    } else {
      ctx.fillStyle = '#F7F3EE';
      ctx.fillRect(0,0,W,H);
    }

    // ── Helpers ──
    var RX = W * 0.52;   // right-column x start
    var RW = W - RX - 50; // right-column width

    function pill(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x+r, y);
      ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
      ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
      ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
      ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
      ctx.closePath();
    }

    // ── Top-left: Your SZN logo image ──
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      var logoH = 220;
      var logoW = Math.round(logoImg.naturalWidth * (logoH / logoImg.naturalHeight));
      ctx.drawImage(logoImg, 54, 30, logoW, logoH);
    }

    // ── GIFT VOUCHER heading ──
    ctx.save();
    ctx.fillStyle = '#1C1C1C';
    // Spaced-out display heading — Fraunces bold-ish
    ctx.font = '500 148px "Fraunces", Georgia, serif';
    ctx.letterSpacing = '11px';
    ctx.fillText('GIFT VOUCHER', RX, 220);
    ctx.restore();

    // ── Subtitle: voucher title ──
    ctx.save();
    ctx.fillStyle = '#2a2a2a';
    ctx.font = 'italic 500 66px "Times New Roman", serif';
    ctx.fillText(vg('v-title') || '1:1 Premium Colour Analysis', RX, 320);
    ctx.restore();

    // ── To pill ──
    var toText = 'To: ' + (vg('v-to') || '');
    ctx.font = 'italic 500 52px "Times New Roman", serif';
    var toMeasure = ctx.measureText(toText).width;
    var toPillW = Math.min(Math.max(toMeasure + 80, 340), RW);
    var toPillH = 104;
    var toY = 420;
    ctx.save();
    pill(RX, toY, toPillW, toPillH, toPillH/2);
    ctx.fillStyle = 'rgba(255,255,255,0.70)';
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#1C1C1C';
    ctx.font = 'italic 500 52px "Times New Roman", serif';
    ctx.fillText(toText, RX + 40, toY + 68);
    ctx.restore();

    // ── Message pill ──
 var msgLines = wrapText(ctx, vg('v-msg') || '', 'italic 500 52px "Times New Roman", serif', RW - 80);
var msgMeasure = ctx.measureText(vg('v-msg') || '').width;
var msgPillW = Math.min(Math.max(msgMeasure + 80, 340), RW);
var msgPillH = 52 + msgLines.length * 66;
var msgY = toY + toPillH + 36;
ctx.save();
pill(RX, msgY, msgPillW, msgPillH, 28);
ctx.fillStyle = 'rgba(255,255,255,0.62)';
ctx.fill();
ctx.restore();
ctx.save();
ctx.font = 'italic 500 52px "Times New Roman", serif';
ctx.fillStyle = '#1C1C1C';
msgLines.forEach(function(line, i) {
    ctx.fillText(line, RX + 40, msgY + 56 + i*66);
});
ctx.restore();

    // ── From pill ──
    var fromText = 'From: ' + (vg('v-from') || '');
 var fromLines = wrapText(ctx, fromText, 'italic 500 52px "Times New Roman", serif', RW - 80);
var fromMeasure = ctx.measureText(fromText).width;
var fromPillW = Math.min(Math.max(fromMeasure + 80, 340), RW);
var fromPillH = 48 + fromLines.length * 72;
var fromY = msgY + msgPillH + 36;
ctx.save();
pill(RX, fromY, fromPillW, fromPillH, 28);
ctx.fillStyle = 'rgba(255,255,255,0.62)';
ctx.fill();
ctx.restore();
    ctx.save();
    ctx.font = 'italic 500 52px "Times New Roman", serif';
    ctx.fillStyle = '#1C1C1C';
    fromLines.forEach(function(line, i) {
      ctx.fillText(line, RX + 40, fromY + 58 + i*72);
    });
    ctx.restore();

    // ── Booking footer (bottom right) ──
    var code = vg('v-code');
    var footL1 = 'To book please visit website www.yourszn.com.au';
    var footL2 = code ? 'and use code: ' + code + ' at checkout' : '';
    ctx.save();
    ctx.font = '500 34px "Fraunces", Georgia, serif';
    ctx.fillStyle = '#1C1C1C';
    ctx.textAlign = 'right';
    ctx.fillText(footL1, W - 72, H - (footL2 ? 84 : 52));
    if (footL2) ctx.fillText(footL2, W - 72, H - 40);
    ctx.restore();

    // ── Bottom-left: No. + date ──
    var num = vg('v-num');
    var date = vg('v-date');
    ctx.save();
    ctx.font = '300 36px "Fraunces", Georgia, serif';
    ctx.fillStyle = '#1C1C1C';
    ctx.fillText('No.' + num, 64, H - 80);
    ctx.fillText('(' + date + ')', 64, H - 36);
    ctx.restore();
  }

fontsReady.then(function() {
    var logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.src = VOUCHER_LOGO_B64;
    function doRender(bgImg) {
        if (logo.complete && logo.naturalWidth > 0) {
            draw(bgImg, logo);
        } else {
            logo.onload = function() { draw(bgImg, logo); };
            logo.onerror = function() { draw(bgImg, null); };
        }
    }
    if (voucherBgImage) {
        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function() { doRender(img); };
        img.src = voucherBgImage;
    } else {
        doRender(null);
    }
});
}
function wrapText(ctx, text, font, maxW) {
  ctx.font = font;
  var words = text.split(' ');
  var lines = [], cur = '';
  words.forEach(function(w) {
    var test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else { cur = test; }
  });
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function voucherDownload() {
  var canvas = document.getElementById('voucher-canvas'); if (!canvas) return;
  var num = vg('v-num') || 'voucher';
  var toName = vg('v-to').replace(/\s+/g,'_') || 'voucher';
  var link = document.createElement('a');
  link.download = 'YourSZN_Voucher_' + num + '_' + toName + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();

  // Save to registry
  voucherRegistry.push({
    id:       Date.now(),
    num:      vg('v-num'),
    to:       vg('v-to'),
    from:     vg('v-from'),
    message:  vg('v-msg'),
    title:    vg('v-title'),
    code:     vg('v-code'),
    date:     vg('v-date'),
    issuedAt: new Date().toISOString(),
    status:   'active'
  });
  saveData();
  renderVoucherRegistry();

  // Increment counter and pre-populate next voucher number
  voucherCounter = parseInt(vg('v-num'), 10) || voucherCounter;
  voucherCounter++;
  localStorage.setItem('yszn_voucher_counter', voucherCounter);
  var numInput = document.getElementById('v-num');
  if (numInput) {
    numInput.value = voucherCounter;
    voucherPreview();
  }
}

function voucherRedeem(id) {
  var v = voucherRegistry.find(function(x){ return x.id === id; });
  if (!v) return;
  v.status = 'redeemed';
  v.redeemedAt = new Date().toISOString();
  saveData();
  renderVoucherRegistry();
  // Offer to create CRM client
  if (confirm('Mark as redeemed. Add ' + (v.to || 'recipient') + ' as a CRM client?')) {
    voucherAddToCrm(v);
  }
}

function voucherAddToCrm(v) {
  if (typeof crmClients === 'undefined') return;
  var nameParts = (v.to || '').trim().split(' ');
  var firstName = nameParts[0] || v.to || '';
  var lastName = nameParts.slice(1).join(' ') || '';
  var newId = 'c' + (crmIdSeq++);
  var newClient = {
    id: newId,
    firstName: firstName,
    lastName: lastName,
    email: '', phone: '', source: 'Gift Voucher',
    createdAt: new Date().toISOString(),
    season: '', sisterSeasons: '', contrastLevel: '', seasonNotes: '',
    tags: ['Gift Voucher'],
    notes: 'Voucher #' + v.num + ' — ' + (v.title || '') + (v.code ? ' · Code: ' + v.code : ''),
    photoBase64: null, photos: [], documents: [], payments: [], sessions: [],
    correspondence: [], status: 'booked', ocaChecklist: {}, activityLog: [
      { date: new Date().toISOString(), user: 'System', note: 'Client added from gift voucher #' + v.num }
    ]
  };
  crmClients.push(newClient);
  saveData();
  if (typeof renderClients === 'function') renderClients();
  alert(firstName + ' added to CRM. Find them in the Clients section.');
}

function voucherMarkActive(id) {
  var v = voucherRegistry.find(function(x){ return x.id === id; });
  if (!v) return;
  v.status = 'active';
  delete v.redeemedAt;
  saveData();
  renderVoucherRegistry();
}

function voucherDeleteFromRegistry(id) {
  if (!confirm('Remove from registry?')) return;
  voucherRegistry = voucherRegistry.filter(function(x){ return x.id !== id; });
  saveData();
  renderVoucherRegistry();
}

function renderVoucherRegistry() {
  var el = document.getElementById('voucher-registry'); if (!el) return;
  if (!voucherRegistry.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--muted);text-align:center;padding:20px 0">No vouchers issued yet. Download a voucher above to start tracking.</div>';
    return;
  }
  // Sort: active first, then by issuedAt desc
  var sorted = voucherRegistry.slice().sort(function(a,b){
    if (a.status === b.status) return (b.issuedAt||'') > (a.issuedAt||'') ? 1 : -1;
    return a.status === 'active' ? -1 : 1;
  });
  var active = sorted.filter(function(v){ return v.status === 'active'; }).length;
  var redeemed = sorted.filter(function(v){ return v.status === 'redeemed'; }).length;

  var html = '<div style="display:flex;gap:16px;margin-bottom:16px">'
    + '<div style="padding:10px 16px;background:var(--warm);border-radius:10px;flex:1;text-align:center">'
    + '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:2px">Active</div>'
    + '<div style="font-family:\'Fraunces\',serif;font-size:28px;color:var(--deep)">' + active + '</div>'
    + '</div>'
    + '<div style="padding:10px 16px;background:var(--warm);border-radius:10px;flex:1;text-align:center">'
    + '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:2px">Redeemed</div>'
    + '<div style="font-family:\'Fraunces\',serif;font-size:28px;color:#10B981">' + redeemed + '</div>'
    + '</div>'
    + '<div style="padding:10px 16px;background:var(--warm);border-radius:10px;flex:1;text-align:center">'
    + '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:2px">Total</div>'
    + '<div style="font-family:\'Fraunces\',serif;font-size:28px;color:var(--deep)">' + sorted.length + '</div>'
    + '</div>'
    + '</div>';

  sorted.forEach(function(v) {
    var isActive = v.status === 'active';
    var issuedDate = v.issuedAt ? new Date(v.issuedAt).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' }) : v.date || '';
    html += '<div style="padding:14px 16px;border:1px solid ' + (isActive ? 'var(--sand)' : '#D1FAE5') + ';border-radius:12px;margin-bottom:8px;background:' + (isActive ? 'white' : '#F0FDF4') + '">'
      + '<div style="display:flex;align-items:flex-start;gap:12px">'
      + '<div style="flex:1;min-width:0">'
      + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">'
      + '<span style="font-size:10px;font-weight:700;letter-spacing:.5px;background:' + (isActive ? 'var(--rose)' : '#D1FAE5') + ';color:' + (isActive ? 'white' : '#065F46') + ';padding:2px 8px;border-radius:20px;text-transform:uppercase">' + (isActive ? 'Active' : 'Redeemed') + '</span>'
      + '<span style="font-size:11px;color:var(--muted)">#' + esc(v.num||'') + '</span>'
      + (v.code ? '<span style="font-size:11px;font-family:monospace;background:var(--warm);padding:1px 6px;border-radius:4px">' + esc(v.code) + '</span>' : '')
      + '</div>'
      + '<div style="font-size:14px;font-weight:600;color:var(--deep)">' + esc(v.to || '—') + '</div>'
      + '<div style="font-size:12px;color:var(--muted);margin-top:2px">' + esc(v.title||'') + (v.from ? ' · from ' + esc(v.from) : '') + '</div>'
      + '<div style="font-size:11px;color:var(--muted);margin-top:4px">Issued ' + esc(issuedDate) + (v.redeemedAt ? ' · Redeemed ' + new Date(v.redeemedAt).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}) : '') + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:6px;flex-shrink:0">'
      + (isActive ? '<button class="fin-row-edit" style="color:var(--rose);font-weight:600" onclick="voucherRedeem(' + v.id + ')">Redeem</button>' : '<button class="fin-row-edit" onclick="voucherMarkActive(' + v.id + ')">Reactivate</button>')
      + '<button class="fin-row-edit" style="color:#EF4444" onclick="voucherDeleteFromRegistry(' + v.id + ')">Del</button>'
      + '</div>'
      + '</div>'
      + '</div>';
  });
  el.innerHTML = html;
}

