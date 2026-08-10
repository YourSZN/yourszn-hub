// ══ OCA REPORT BUILDER — real PDF template + client photo swap (pdf-lib) ══
// Replaces the old HTML/print-based report. Generates a real downloadable PDF
// by taking the studio-designed template PDF and swapping in the client's
// photos + name + skin-tone tick, using pdf-lib in the browser (no backend).

var OCA_REPORT_BUCKET = 'oca-report-assets';
var OCA_REPORT_TEMPLATE_PATH = 'template_light_summer.pdf';
var OCA_REPORT_TICK_PATH = 'tick_badge.png';

// Every place the client's background-removed cutout appears is an image
// object of exactly this pixel size, reused many times per page.
var OCA_R2_CUTOUT_DIMS = { w: 410, h: 547 };

// Other client-specific photo slots, identified by their exact pixel size
// in the template (each used once or twice, never recoloured).
var OCA_R2_PHOTO_SLOTS = {
  cover: { w: 2084, h: 3124 },
  face:  { w: 1024, h: 1366 },
  hair:  { w: 150,  h: 72   },
  eyes:  { w: 134,  h: 82   },
  skin:  { w: 134,  h: 98   },
};

// "Insert name here" placeholder text on the cover page (PDF points, top-left origin).
var OCA_R2_NAME_BOX = { x0: 130.6, y0: 690.1, x1: 492.4, y1: 748.9, size: 46 };

// Skin Tones grid (page 4, 0-indexed page 3): 3 rows x 5 cols. bg = the cell's
// own flat background colour (sampled from the template), used to blank out
// the tick before drawing a new one, so only the analyst's chosen cell shows a tick.
var OCA_R2_SKIN_GRID = [
  {"row":"cool","col":0,"x0":43.1,"y0":416.7,"x1":142.3,"y1":548.8,"bg":"#efc7cc"},
  {"row":"neutral","col":0,"x0":43.1,"y0":543.4,"x1":142.3,"y1":675.5,"bg":"#f5d6cb"},
  {"row":"warm","col":0,"x0":45.7,"y0":670.8,"x1":144.9,"y1":802.9,"bg":"#ecdac7"},
  {"row":"cool","col":1,"x0":149.2,"y0":418.6,"x1":248.4,"y1":550.7,"bg":"#b3827e"},
  {"row":"neutral","col":1,"x0":149.2,"y0":545.4,"x1":248.4,"y1":677.5,"bg":"#f1cfc3"},
  {"row":"warm","col":1,"x0":151.8,"y0":672.8,"x1":250.9,"y1":804.9,"bg":"#cca782"},
  {"row":"cool","col":2,"x0":258.2,"y0":416.3,"x1":357.4,"y1":548.4,"bg":"#725357"},
  {"row":"neutral","col":2,"x0":258.2,"y0":543.0,"x1":357.4,"y1":675.1,"bg":"#b58169"},
  {"row":"warm","col":2,"x0":260.8,"y0":670.5,"x1":360.0,"y1":802.6,"bg":"#a26f53"},
  {"row":"cool","col":3,"x0":365.2,"y0":416.7,"x1":464.4,"y1":548.8,"bg":"#5b4145"},
  {"row":"neutral","col":3,"x0":365.2,"y0":543.5,"x1":464.4,"y1":675.6,"bg":"#916753"},
  {"row":"warm","col":3,"x0":367.8,"y0":670.9,"x1":467.0,"y1":803.0,"bg":"#804a25"},
  {"row":"cool","col":4,"x0":472.2,"y0":416.3,"x1":571.3,"y1":548.4,"bg":"#4d373a"},
  {"row":"neutral","col":4,"x0":472.2,"y0":543.0,"x1":571.3,"y1":675.1,"bg":"#66493c"},
  {"row":"warm","col":4,"x0":474.7,"y0":670.5,"x1":573.9,"y1":802.6,"bg":"#64381a"},
];
var OCA_R2_SKIN_PAGE_INDEX = 3; // 0-indexed page 4

// ── Report state ──
var ocaReport = {
  clientName: '',
  date: new Date().toISOString().split('T')[0],
  primarySeason: 'Light Summer',
  sisterA: 'True Summer',
  sisterB: 'Light Spring',
  skinToneRow: 'neutral',
  skinToneCol: 1,
  notes: '',
  // dataURLs (uploaded by analyst; fall back to the cutout if not provided)
  photoCutout: null,
  photoCover: null,
  photoFace: null,
  photoHair: null,
  photoEyes: null,
  photoSkin: null,
};

// ── Photo upload handling ──
function ocaR2HandlePhoto(field, inputEl) {
  var file = inputEl.files && inputEl.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function() {
    ocaReport[field] = reader.result;
    renderOca();
  };
  reader.readAsDataURL(file);
}

function ocaR2SelectSkinCell(row, col) {
  ocaReport.skinToneRow = row;
  ocaReport.skinToneCol = col;
  renderOca();
}

// ── UI ──
function _ocaR2PhotoSlot(field, label, hint) {
  var val = ocaReport[field];
  return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px">'
    + '<label style="width:84px;height:84px;border-radius:10px;border:1.5px dashed var(--sand);overflow:hidden;cursor:pointer;position:relative;background:' + (val ? '#000' : '#FAF6F1') + ';display:flex;align-items:center;justify-content:center">'
    + (val ? '<img src="' + val + '" style="width:100%;height:100%;object-fit:contain">' : '<span style="font-size:20px;color:var(--muted)">+</span>')
    + '<input type="file" accept="image/*" onchange="ocaR2HandlePhoto(\'' + field + '\',this)" style="position:absolute;inset:0;opacity:0;cursor:pointer">'
    + '</label>'
    + '<div style="font-size:10px;font-weight:700;color:var(--deep)">' + label + '</div>'
    + (hint ? '<div style="font-size:9px;color:var(--muted);text-align:center;max-width:90px;line-height:1.4">' + hint + '</div>' : '')
    + '</div>';
}

function renderOcaReport() {
  var r = ocaReport;

  var html = '<div style="display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start">';
  html += '<div class="card" style="padding:0;overflow:hidden">';

  // Header
  html += '<div style="padding:14px 20px;background:var(--deep)">'
    + '<div style="color:white;font-size:12px;font-weight:700;letter-spacing:.5px;margin-bottom:12px">Session Sheet</div>'
    + '<div style="display:grid;grid-template-columns:1fr 160px 1fr;gap:10px">'
    + '<div><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:5px">Client Name</div>'
    + '<input value="' + r.clientName.replace(/"/g,'&quot;') + '" oninput="ocaReport.clientName=this.value" placeholder="Jane Smith" '
    + 'style="width:100%;padding:8px 10px;border:1px solid rgba(255,255,255,.2);border-radius:7px;font-size:13px;font-family:inherit;background:rgba(255,255,255,.1);color:white;outline:none"></div>'
    + '<div><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:5px">Date</div>'
    + '<input type="date" value="' + r.date + '" oninput="ocaReport.date=this.value" '
    + 'style="width:100%;padding:8px 10px;border:1px solid rgba(255,255,255,.2);border-radius:7px;font-size:13px;font-family:inherit;background:rgba(255,255,255,.1);color:white;outline:none"></div>'
    + '<div><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:5px">Primary Season</div>'
    + '<div style="padding:8px 10px;border:1px solid rgba(255,255,255,.2);border-radius:7px;font-size:13px;background:rgba(255,255,255,.1);color:white">' + r.primarySeason + ' <span style="opacity:.6;font-size:11px">(template)</span></div></div>'
    + '</div></div>';

  html += '<div style="padding:18px 20px">';

  // Photos
  html += '<div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Client Photos</div>'
    + '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:22px">'
    + _ocaR2PhotoSlot('photoCutout', 'Cutout', 'Background removed — used on every colour page')
    + _ocaR2PhotoSlot('photoCover', 'Cover', 'Full body shot')
    + _ocaR2PhotoSlot('photoFace', 'Face', 'Straight-on face photo')
    + _ocaR2PhotoSlot('photoHair', 'Hair', 'Close-up crop')
    + _ocaR2PhotoSlot('photoEyes', 'Eyes', 'Close-up crop')
    + _ocaR2PhotoSlot('photoSkin', 'Skin', 'Close-up crop')
    + '</div>';

  // Skin tone picker
  html += '<div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Skin Tone — click the matching cell</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(5,44px);gap:4px;margin-bottom:6px">';
  var byColRow = {};
  OCA_R2_SKIN_GRID.forEach(function(c){ byColRow[c.col+'_'+c.row] = c; });
  ['cool','neutral','warm'].forEach(function(row){
    for (var col=0; col<5; col++) {
      var c = byColRow[col+'_'+row];
      var sel = (r.skinToneRow===row && r.skinToneCol===col);
      html += '<div onclick="ocaR2SelectSkinCell(\''+row+'\','+col+')" style="width:44px;height:44px;border-radius:5px;background:'+c.bg+';cursor:pointer;position:relative;' + (sel?'outline:2.5px solid var(--deep);outline-offset:1px':'') + '">'
        + (sel ? '<div style="position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:#2E8B57;color:white;font-size:9px;display:flex;align-items:center;justify-content:center">&#10003;</div>' : '')
        + '</div>';
    }
  });
  html += '</div>'
    + '<div style="display:flex;gap:6px;font-size:9px;color:var(--muted);margin-bottom:22px">'
    + '<span style="flex:1">Cool</span><span style="flex:1;text-align:center">&#8594; light to deep &#8594;</span><span style="flex:1;text-align:right">Warm/Neutral rows below</span></div>';

  html += '<div style="font-size:11px;color:var(--muted);background:#FBEEE8;border:1px solid #E3B49B;border-radius:8px;padding:10px 12px;margin-bottom:18px;line-height:1.6">'
    + '&#9888; <strong>V1 scope:</strong> Cool vs Warm, Sub-Seasons, and the other comparison pages currently keep this template\'s original tick placement (this Light Summer client\'s real result). Photos and name still update correctly on those pages. Custom tick placement for those pages is next.'
    + '</div>';

  html += '</div>'; // padding

  html += '<div style="padding:12px 20px;border-top:1px solid var(--sand);display:flex;align-items:center;gap:12px">'
    + '<div id="oca-r2-status" style="font-size:11px;color:var(--muted)"></div>'
    + '<button onclick="ocaR2GeneratePdf()" id="oca-r2-btn" style="margin-left:auto;background:var(--deep);color:white;border:none;padding:12px 26px;font-size:13px;font-weight:600;border-radius:10px;cursor:pointer;letter-spacing:.3px">&#11015; Download PDF</button>'
    + '</div>';

  html += '</div>'; // card

  // Right column — preview
  html += '<div style="position:sticky;top:20px;display:flex;flex-direction:column;gap:14px">';
  var previewPhoto = r.photoCutout || r.photoFace || r.photoCover;
  if (previewPhoto) {
    html += '<div class="card" style="padding:0;overflow:hidden">'
      + '<img src="' + previewPhoto + '" style="width:100%;height:200px;object-fit:cover;object-position:center top;display:block">'
      + '<div style="padding:10px 14px;background:var(--deep);color:white">'
      + '<div style="font-size:13px;font-weight:700">' + (r.clientName||'Client') + '</div>'
      + '<div style="font-size:11px;opacity:.65;margin-top:2px">' + r.primarySeason + '</div>'
      + '</div></div>';
  } else {
    html += '<div class="card" style="text-align:center;padding:20px;color:var(--muted)">'
      + '<div style="font-size:28px;margin-bottom:6px">&#128247;</div>'
      + '<div style="font-size:11px">Upload the cutout photo above to preview</div>'
      + '</div>';
  }
  html += '<div class="card">'
    + '<div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">How this works</div>'
    + '<div style="font-size:11.5px;line-height:1.7;color:var(--deep)">This uses your actual studio-designed report as a template. Uploading the cutout photo swaps it into every coloured page automatically — nothing else about the design changes.</div>'
    + '</div>';
  html += '</div></div>';

  return html;
}

// ── PDF generation ──
// Both storage objects are behind an "authenticated" RLS policy (same convention as the
// rest of the app's buckets), so this goes through the logged-in Supabase client rather
// than a plain fetch() — a raw fetch would only carry the publishable key, not the
// staff member's session, and would be rejected.
async function ocaR2DownloadFromStorage(path) {
  var db = getSupa();
  if (!db) throw new Error('Not connected to Supabase — please refresh and sign in again.');
  var res = await db.storage.from(OCA_REPORT_BUCKET).download(path);
  if (res.error) throw new Error('Could not load "' + path + '": ' + res.error.message);
  return res.data; // Blob
}

async function ocaR2FetchTemplateBytes() {
  var blob = await ocaR2DownloadFromStorage(OCA_REPORT_TEMPLATE_PATH);
  return await blob.arrayBuffer();
}

function ocaR2DataUrlToBytes(dataUrl) {
  var base64 = dataUrl.split(',')[1];
  var bin = atob(base64);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function ocaR2EmbedPhoto(pdfDoc, dataUrl) {
  var bytes = ocaR2DataUrlToBytes(dataUrl);
  // Normalise everything to PNG via canvas so embedPng always works (handles JPEG/HEIC-derived uploads too).
  var img = await new Promise(function(resolve, reject) {
    var el = new Image();
    el.onload = function(){ resolve(el); };
    el.onerror = reject;
    el.src = dataUrl;
  });
  var canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  var pngDataUrl = canvas.toDataURL('image/png');
  return await pdfDoc.embedPng(ocaR2DataUrlToBytes(pngDataUrl));
}

// Recursively walk a page's XObject resources (including nested Form XObjects,
// which is how the template's repeated grid-cell photos are structured) and
// swap any Image XObject matching the target pixel dimensions.
function ocaR2WalkAndSwap(pdfDoc, xobjDict, targetW, targetH, newImageRef, visited) {
  if (!xobjDict) return 0;
  var PDFName = PDFLib.PDFName;
  var entries = xobjDict.entries();
  var swapped = 0;
  for (var i = 0; i < entries.length; i++) {
    var name = entries[i][0], ref = entries[i][1];
    var refKey = ref.toString();
    var obj = pdfDoc.context.lookup(ref);
    if (!obj || !obj.dict) continue;
    var subtype = obj.dict.get(PDFName.of('Subtype'));
    var subtypeStr = subtype && subtype.toString();
    if (subtypeStr === '/Image') {
      var width = obj.dict.get(PDFName.of('Width'));
      var height = obj.dict.get(PDFName.of('Height'));
      var w = width && (width.numberValue !== undefined ? width.numberValue : width.value);
      var h = height && (height.numberValue !== undefined ? height.numberValue : height.value);
      if (w === targetW && h === targetH) {
        xobjDict.set(name, newImageRef);
        swapped++;
      }
    } else if (subtypeStr === '/Form') {
      if (visited.has(refKey)) continue;
      visited.add(refKey);
      var formResources = obj.dict.get(PDFName.of('Resources'));
      var formResDict = formResources ? pdfDoc.context.lookup(formResources) : null;
      if (formResDict) {
        var nestedXobj = formResDict.get(PDFName.of('XObject'));
        var nestedXobjDict = nestedXobj ? pdfDoc.context.lookup(nestedXobj) : null;
        swapped += ocaR2WalkAndSwap(pdfDoc, nestedXobjDict, targetW, targetH, newImageRef, visited);
      }
    }
  }
  return swapped;
}

function ocaR2SwapAllPages(pdfDoc, targetW, targetH, newImageRef) {
  var PDFName = PDFLib.PDFName;
  var pages = pdfDoc.getPages();
  var visited = new Set();
  var total = 0;
  for (var i = 0; i < pages.length; i++) {
    var resources = pages[i].node.Resources();
    if (!resources) continue;
    var xobjDict = resources.lookup(PDFName.of('XObject'));
    total += ocaR2WalkAndSwap(pdfDoc, xobjDict, targetW, targetH, newImageRef, visited);
  }
  return total;
}

function ocaR2SetStatus(msg) {
  var el = document.getElementById('oca-r2-status');
  if (el) el.textContent = msg;
}

async function ocaR2GeneratePdf() {
  var r = ocaReport;
  if (!r.photoCutout) { alert('Please upload the cutout photo first — it powers most of the report.'); return; }
  var btn = document.getElementById('oca-r2-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }

  try {
    ocaR2SetStatus('Loading template…');
    var templateBytes = await ocaR2FetchTemplateBytes();
    var pdfDoc = await PDFLib.PDFDocument.load(templateBytes, { updateMetadata: false });
    var PDFName = PDFLib.PDFName, rgb = PDFLib.rgb;

    ocaR2SetStatus('Embedding photos…');
    var cutoutImg = await ocaR2EmbedPhoto(pdfDoc, r.photoCutout);
    ocaR2SwapAllPages(pdfDoc, OCA_R2_CUTOUT_DIMS.w, OCA_R2_CUTOUT_DIMS.h, cutoutImg.ref);

    var slotMap = [
      ['photoCover', OCA_R2_PHOTO_SLOTS.cover],
      ['photoFace',  OCA_R2_PHOTO_SLOTS.face],
      ['photoHair',  OCA_R2_PHOTO_SLOTS.hair],
      ['photoEyes',  OCA_R2_PHOTO_SLOTS.eyes],
      ['photoSkin',  OCA_R2_PHOTO_SLOTS.skin],
    ];
    for (var i = 0; i < slotMap.length; i++) {
      var field = slotMap[i][0], dims = slotMap[i][1];
      var dataUrl = r[field] || r.photoCutout; // fall back to cutout if a specific shot wasn't provided
      var img = await ocaR2EmbedPhoto(pdfDoc, dataUrl);
      ocaR2SwapAllPages(pdfDoc, dims.w, dims.h, img.ref);
    }

    // Cover name overlay — cover the placeholder, draw the real name.
    // Note: PyMuPDF bboxes used throughout this file are top-left origin (y grows downward);
    // pdf-lib pages are bottom-left origin (y grows upward), so every y must be flipped
    // via (pageHeight - pymupdf_y) before drawing.
    ocaR2SetStatus('Adding name…');
    var coverPage = pdfDoc.getPages()[0];
    var coverH = coverPage.getHeight();
    var nb = OCA_R2_NAME_BOX;
    coverPage.drawRectangle({
      x: nb.x0 - 6, y: coverH - nb.y1 - 10, width: (nb.x1 - nb.x0) + 12, height: (nb.y1 - nb.y0) + 20,
      color: rgb(0.227, 0.137, 0.278), // matches the cover's dark purple panel
    });
    var nameFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBoldItalic);
    var nameText = '“' + (r.clientName || 'Your Name') + '”';
    var nameWidth = nameFont.widthOfTextAtSize(nameText, nb.size);
    coverPage.drawText(nameText, {
      x: nb.x0 + ((nb.x1 - nb.x0) - nameWidth) / 2, y: coverH - nb.y1 + 6,
      size: nb.size, font: nameFont, color: rgb(0.94, 0.89, 0.76),
    });

    // Skin tone tick — blank every candidate cell's corner with its own bg colour,
    // then draw one fresh tick at the analyst's chosen cell.
    ocaR2SetStatus('Placing skin tone tick…');
    var skinPage = pdfDoc.getPages()[OCA_R2_SKIN_PAGE_INDEX];
    var skinH = skinPage.getHeight();
    var tickBlob = await ocaR2DownloadFromStorage(OCA_REPORT_TICK_PATH);
    var tickImg = await pdfDoc.embedPng(new Uint8Array(await tickBlob.arrayBuffer()));
    var TICK_SIZE = 22;
    OCA_R2_SKIN_GRID.forEach(function(cell) {
      var bg = cell.bg;
      var rr = parseInt(bg.slice(1,3),16)/255, gg = parseInt(bg.slice(3,5),16)/255, bb = parseInt(bg.slice(5,7),16)/255;
      // Badge sits top-right of the cell; "top" in the rendered page = smaller pymupdf y = larger flipped y.
      skinPage.drawRectangle({
        x: cell.x1 - TICK_SIZE - 6, y: skinH - cell.y0 - TICK_SIZE - 10, width: TICK_SIZE + 10, height: TICK_SIZE + 10,
        color: rgb(rr, gg, bb),
      });
    });
    var chosen = OCA_R2_SKIN_GRID.find(function(c){ return c.row === r.skinToneRow && c.col === r.skinToneCol; });
    if (chosen) {
      skinPage.drawImage(tickImg, {
        x: chosen.x1 - TICK_SIZE - 2, y: skinH - chosen.y0 - TICK_SIZE - 8, width: TICK_SIZE, height: TICK_SIZE,
      });
    }

    ocaR2SetStatus('Finalising…');
    var outBytes = await pdfDoc.save();
    var blob = new Blob([outBytes], { type: 'application/pdf' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'Colour Analysis - ' + (r.clientName || 'Client') + '.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
    ocaR2SetStatus('Downloaded.');
  } catch (err) {
    console.error(err);
    ocaR2SetStatus('');
    alert('Could not generate the PDF: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⬇ Download PDF'; }
  }
}

