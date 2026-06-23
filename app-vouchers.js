// ══════════════════════════════════════════════════
// GIFT VOUCHER CREATOR
// ══════════════════════════════════════════════════
var VOUCHER_BG_B64 = "https://charming-starlight-37db1e.netlify.app/voucher_bg.jpg";
var VOUCHER_LOGO_B64 = null;
var voucherBgImage = "https://charming-starlight-37db1e.netlify.app/voucher_bg.jpg";
var voucherCounter = parseInt(localStorage.getItem('yszn_voucher_counter') || '59', 10);

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
    + '<button onclick="voucherDownload()" style="width:100%;background:var(--deep);color:#fff;border:none;border-radius:10px;padding:13px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:.3px">&#11015; Download Voucher (PNG)</button>'
    + '</div>'

    // ── RIGHT: LIVE PREVIEW ──
    + '<div>'
    + '<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:16px">Live Preview</div>'
    + '<div id="voucher-preview-wrap" style="width:100%;max-width:680px">'
    + '<canvas id="voucher-canvas" style="width:100%;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.12)"></canvas>'
    + '</div>'
    + '</div>'
    + '</div>';

  voucherPreview();
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
    document.fonts.load('300 1px "Cormorant Garamond"'),
    document.fonts.load('italic 300 1px "Cormorant Garamond"'),
    document.fonts.load('italic 500 1px "Cormorant Garamond"'),
    document.fonts.load('500 1px "Cormorant Garamond"'),
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
    // Spaced-out display heading — Cormorant Garamond bold-ish
    ctx.font = '500 148px "Cormorant Garamond", Georgia, serif';
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
    ctx.font = '500 34px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = '#1C1C1C';
    ctx.textAlign = 'right';
    ctx.fillText(footL1, W - 72, H - (footL2 ? 84 : 52));
    if (footL2) ctx.fillText(footL2, W - 72, H - 40);
    ctx.restore();

    // ── Bottom-left: No. + date ──
    var num = vg('v-num');
    var date = vg('v-date');
    ctx.save();
    ctx.font = '300 36px "Cormorant Garamond", Georgia, serif';
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

