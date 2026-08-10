// ══ OCA REPORT BUILDER — real PDF template + client photo swap (pdf-lib) ══
// Takes the studio-designed report PDF and swaps in the client's photos, name,
// and hand-placed ticks using pdf-lib + pdf.js in the browser — no backend, no
// redesign, pixel-perfect fidelity to the real template.
//
// Interaction model: upload photos, then click directly on the rendered pages
// below to place a tick (green checkmark) anywhere, or switch to Erase mode to
// paint over the template's original default tick with the surrounding colour
// (sampled live from the current render, so it always matches). Clicking an
// existing tick/erase spot again removes it.

var OCA_REPORT_BUCKET = 'oca-report-assets';
var OCA_REPORT_TEMPLATE_PATH = 'template_light_summer.pdf';
var OCA_REPORT_TICK_PATH = 'tick_badge.png';
var OCA_REPORT_NAME_PATCH_PATH = 'name_patch.png';

// Every place the client's background-removed cutout appears is an image
// object of one of these two pixel sizes (the template embeds the same photo
// at two different resolutions depending on the cell's on-page size), reused
// many times per page.
var OCA_R2_CUTOUT_DIMS = { w: 410, h: 547 };
var OCA_R2_CUTOUT_DIMS_LARGE = { w: 615, h: 820 };

// Other client-specific photo slots, identified by their exact pixel size
// in the template (each used once or twice, never recoloured).
// NOTE: the big cover background photo (2084x3124) is a fixed design asset —
// never swapped. The client's cover photo instead goes into a smaller
// placeholder box (1438x560) sitting on top of it.
var OCA_R2_PHOTO_SLOTS = {
  coverPlaceholder: { w: 1438, h: 560  }, // client's cover photo — the placeholder box, not the background
  face:             { w: 1024, h: 1366 },
  contrastBlush:    { w: 820,  h: 1093 }, // shared by Contrast + Blush pages
  hair:             { w: 150,  h: 72   },
  eyes:             { w: 134,  h: 82   },
  skin:             { w: 134,  h: 98   },
};

// "Insert name here" placeholder text on the cover page (PDF points, top-left origin).
var OCA_R2_NAME_BOX = { x0: 130.6, y0: 690.1, x1: 492.4, y1: 748.9, size: 46 };
// The patch image covers this same region (with padding) — extracted directly from the
// template's own background photo so it blends seamlessly, no flat-colour guessing.
var OCA_R2_NAME_PATCH_BOX = { x0: 100.6, y0: 670.1, x1: 522.4, y1: 768.9 };

var OCA_R2_TICK_SIZE = 22;
var OCA_R2_RENDER_SCALE = 1.3;
var OCA_R2_CLICK_HIT_RADIUS = 18; // pdf points — clicking within this of an existing mark toggles it off

// ── Report state ──
var ocaReport = {
  clientName: '',
  date: new Date().toISOString().split('T')[0],
  tickMode: 'place', // 'place' | 'erase'
  // dataURLs (uploaded by analyst; fall back to the cutout if not provided)
  photoCutout: null,
  photoCover: null,
  photoFace: null,
  photoHair: null,
  photoEyes: null,
  photoSkin: null,
  // analyst-placed marks, in PDF-point space (bottom-left origin), per page (0-indexed)
  customTicks: [],   // [{page, x, y}]
  erasePatches: [],  // [{page, x, y, color}]
};

// ── Background removal (client-side, MediaPipe selfie segmenter) ──
// Only the cutout and face slots get recoloured onto solid swatches in the
// report, so only those two need a transparent background — cover/hair/eyes/
// skin are used as flat rectangular crops and stay as uploaded.
var OCA_R2_BG_REMOVE_FIELDS = { photoCutout: true, photoFace: true };

var _ocaR2Segmenter = null;
var _ocaR2SegmenterPromise = null;

function ocaR2EnsureSegmenter() {
  if (_ocaR2Segmenter) return Promise.resolve(_ocaR2Segmenter);
  if (_ocaR2SegmenterPromise) return _ocaR2SegmenterPromise;
  _ocaR2SegmenterPromise = import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs')
    .then(function(vision) {
      return vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      ).then(function(fileset) {
        return vision.ImageSegmenter.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
          },
          runningMode: 'IMAGE',
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        });
      });
    })
    .then(function(segmenter) {
      _ocaR2Segmenter = segmenter;
      return segmenter;
    })
    .catch(function(e) {
      _ocaR2SegmenterPromise = null;
      console.warn('[OCA Report] Background removal model failed to load:', e);
      throw e;
    });
  return _ocaR2SegmenterPromise;
}

// If the upload already has real transparency (the analyst supplied a
// properly background-removed cutout), running it through segmentation again
// would just re-guess at edges we already know precisely — softening hair
// strands and other fine detail for no reason. Detect that case by sampling
// for alpha values that aren't fully 0 or 255 (a flat opaque photo has none).
function ocaR2HasRealAlpha(img) {
  var canvas = document.createElement('canvas');
  var w = canvas.width = Math.min(img.naturalWidth, 200);
  var h = canvas.height = Math.min(img.naturalHeight, 200);
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  var data = ctx.getImageData(0, 0, w, h).data;
  var sawOpaque = false, sawTransparent = false;
  for (var i = 3; i < data.length; i += 4) {
    if (data[i] < 10) sawTransparent = true;
    else if (data[i] > 245) sawOpaque = true;
    else return true; // a soft/antialiased edge pixel — definitely real alpha
  }
  return sawTransparent && sawOpaque;
}

// Runs the uploaded photo through the segmenter and returns a transparent
// PNG data URL (foreground opaque, background alpha-faded out). Falls back
// to the original photo, unchanged, if the model fails to load — or if it
// already has real transparency (see ocaR2HasRealAlpha above).
function ocaR2RemoveBackground(dataUrl) {
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() {
      if (ocaR2HasRealAlpha(img)) { resolve(dataUrl); return; }
      ocaR2EnsureSegmenter().then(function(segmenter) {
        var canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        var srcData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        var result = segmenter.segment(img);
        var confMask = result.confidenceMasks[0]; // float 0..1 = P(person)
        var maskData = confMask.getAsFloat32Array();
        var mw = confMask.width, mh = confMask.height;

        for (var y = 0; y < canvas.height; y++) {
          for (var x = 0; x < canvas.width; x++) {
            var mx = Math.floor((x / canvas.width) * mw);
            var my = Math.floor((y / canvas.height) * mh);
            var conf = maskData[my * mw + mx];
            var idx = (y * canvas.width + x) * 4 + 3;
            srcData.data[idx] = Math.round(Math.min(1, conf * 1.15) * 255);
          }
        }
        ctx.putImageData(srcData, 0, 0);
        confMask.close();
        result.close && result.close();
        resolve(canvas.toDataURL('image/png'));
      }).catch(function() {
        resolve(dataUrl); // model unavailable — keep the original photo rather than block upload
      });
    };
    img.onerror = function() { resolve(dataUrl); };
    img.src = dataUrl;
  });
}

// ── Photo upload handling ──
function ocaR2HandlePhoto(field, inputEl) {
  var file = inputEl.files && inputEl.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function() {
    var rawDataUrl = reader.result;
    if (OCA_R2_BG_REMOVE_FIELDS[field]) {
      ocaR2SetStatus('Removing background…');
      ocaR2RemoveBackground(rawDataUrl).then(function(cutDataUrl) {
        ocaReport[field] = cutDataUrl;
        ocaR2SetStatus('');
        ocaR2InvalidateBase();
        renderOca();
        ocaR2RenderPreview();
      });
    } else {
      ocaReport[field] = rawDataUrl;
      ocaR2InvalidateBase();
      renderOca();
      ocaR2RenderPreview();
    }
  };
  reader.readAsDataURL(file);
}

var _ocaR2NameDebounce = null;
function ocaR2OnNameOrDateChange() {
  ocaR2InvalidateBase();
  clearTimeout(_ocaR2NameDebounce);
  _ocaR2NameDebounce = setTimeout(function() { ocaR2RenderPreview(); }, 700);
}

function ocaR2SetTickMode(mode) {
  ocaReport.tickMode = mode;
  renderOca();
}

// ── UI ──
function _ocaR2PhotoSlot(field, label, hint) {
  var val = ocaReport[field];
  return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px">'
    + '<label style="width:76px;height:76px;border-radius:10px;border:1.5px dashed var(--sand);overflow:hidden;cursor:pointer;position:relative;background:' + (val ? '#000' : '#FAF6F1') + ';display:flex;align-items:center;justify-content:center">'
    + (val ? '<img src="' + val + '" style="width:100%;height:100%;object-fit:contain">' : '<span style="font-size:20px;color:var(--muted)">+</span>')
    + '<input type="file" accept="image/*" onchange="ocaR2HandlePhoto(\'' + field + '\',this)" style="position:absolute;inset:0;opacity:0;cursor:pointer">'
    + '</label>'
    + '<div style="font-size:10px;font-weight:700;color:var(--deep)">' + label + '</div>'
    + (hint ? '<div style="font-size:9px;color:var(--muted);text-align:center;max-width:84px;line-height:1.35">' + hint + '</div>' : '')
    + '</div>';
}

function renderOcaReport() {
  var r = ocaReport;

  var html = '<div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">';

  // Header — name/date, kept as quick text fields since typing beats click+prompt for plain data entry.
  html += '<div style="padding:14px 20px;background:var(--deep);display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap">'
    + '<div style="flex:1;min-width:180px"><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:5px">Client Name</div>'
    + '<input value="' + r.clientName.replace(/"/g,'&quot;') + '" oninput="ocaReport.clientName=this.value;ocaR2OnNameOrDateChange()" placeholder="Jane Smith" '
    + 'style="width:100%;padding:8px 10px;border:1px solid rgba(255,255,255,.2);border-radius:7px;font-size:13px;font-family:inherit;background:rgba(255,255,255,.1);color:white;outline:none"></div>'
    + '<div style="width:160px"><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:5px">Date</div>'
    + '<input type="date" value="' + r.date + '" oninput="ocaReport.date=this.value" '
    + 'style="width:100%;padding:8px 10px;border:1px solid rgba(255,255,255,.2);border-radius:7px;font-size:13px;font-family:inherit;background:rgba(255,255,255,.1);color:white;outline:none"></div>'
    + '</div>';

  html += '<div style="padding:16px 20px">';
  html += '<div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Client Photos</div>'
    + '<div style="display:flex;gap:12px;flex-wrap:wrap">'
    + _ocaR2PhotoSlot('photoCutout', 'Cutout', 'Background auto-removed — used on every colour page')
    + _ocaR2PhotoSlot('photoCover', 'Cover', 'Fills the photo box on the cover — the background photo is fixed and never changes')
    + _ocaR2PhotoSlot('photoFace', 'Face', 'Background auto-removed')
    + _ocaR2PhotoSlot('photoHair', 'Hair', 'Close-up crop')
    + _ocaR2PhotoSlot('photoEyes', 'Eyes', 'Close-up crop')
    + _ocaR2PhotoSlot('photoSkin', 'Skin', 'Close-up crop')
    + '</div>';
  html += '</div>';

  html += '<div style="padding:12px 20px;border-top:1px solid var(--sand);display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
    + '<button onclick="ocaR2RenderPreview()" id="oca-r2-preview-btn" style="background:var(--deep);color:white;border:none;padding:10px 20px;font-size:12.5px;font-weight:600;border-radius:9px;cursor:pointer">Build Preview</button>'
    + '<div style="width:1px;height:22px;background:var(--sand);margin:0 4px"></div>'
    + '<div style="display:flex;border:1.5px solid var(--sand);border-radius:9px;overflow:hidden">'
    + '<button onclick="ocaR2SetTickMode(\'place\')" style="padding:9px 16px;font-size:12px;font-weight:600;border:none;cursor:pointer;background:' + (r.tickMode==='place'?'var(--deep)':'white') + ';color:' + (r.tickMode==='place'?'white':'var(--deep)') + '">&#10003; Place Tick</button>'
    + '<button onclick="ocaR2SetTickMode(\'erase\')" style="padding:9px 16px;font-size:12px;font-weight:600;border:none;cursor:pointer;background:' + (r.tickMode==='erase'?'#B04A3C':'white') + ';color:' + (r.tickMode==='erase'?'white':'var(--deep)') + '">&#10005; Erase</button>'
    + '</div>'
    + '<div style="font-size:11px;color:var(--muted)">Click any page below to ' + (r.tickMode==='erase' ? 'paint over a default tick' : 'place a tick') + '. Click a mark again to remove it.</div>'
    + '<div id="oca-r2-status" style="font-size:11px;color:var(--muted);margin-left:auto"></div>'
    + '<button onclick="ocaR2GeneratePdf()" id="oca-r2-btn" style="background:var(--deep);color:white;border:none;padding:10px 20px;font-size:12.5px;font-weight:600;border-radius:9px;cursor:pointer">&#11015; Download PDF</button>'
    + '</div>';

  html += '</div>'; // card

  html += '<div id="oca-r2-preview" style="display:flex;flex-direction:column;align-items:center;gap:16px;background:#EDE7DF;padding:24px;border-radius:14px">'
    + '<div style="font-size:12px;color:var(--muted)">Upload the cutout photo above, then click "Build Preview" to see every page.</div>'
    + '</div>';

  return html;
}

// ── Storage / photo embedding ──
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
  var img = await new Promise(function(resolve, reject) {
    var el = new Image();
    el.onload = function(){ resolve(el); };
    el.onerror = reject;
    el.src = dataUrl;
  });
  // Normalise everything to PNG via canvas so embedPng always works (handles JPEG/HEIC-derived uploads too).
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

// ── Base PDF (template + photos + name), cached so tick edits don't re-fetch/re-embed ──
var _ocaR2BaseBytes = null;

function ocaR2InvalidateBase() {
  _ocaR2BaseBytes = null;
}

async function ocaR2BuildBaseBytes() {
  var r = ocaReport;
  var templateBytes = await ocaR2FetchTemplateBytes();
  var pdfDoc = await PDFLib.PDFDocument.load(templateBytes, { updateMetadata: false });
  var rgb = PDFLib.rgb;

  ocaR2SetStatus('Embedding photos…');
  var cutoutImg = await ocaR2EmbedPhoto(pdfDoc, r.photoCutout);
  ocaR2SwapAllPages(pdfDoc, OCA_R2_CUTOUT_DIMS.w, OCA_R2_CUTOUT_DIMS.h, cutoutImg.ref);
  ocaR2SwapAllPages(pdfDoc, OCA_R2_CUTOUT_DIMS_LARGE.w, OCA_R2_CUTOUT_DIMS_LARGE.h, cutoutImg.ref);

  var slotMap = [
    ['photoCover', OCA_R2_PHOTO_SLOTS.coverPlaceholder], // cover's small photo box, NOT the background photo
    ['photoFace',  OCA_R2_PHOTO_SLOTS.face],
    ['photoFace',  OCA_R2_PHOTO_SLOTS.contrastBlush],    // Contrast + Blush pages — real face, not the silhouette cutout
    ['photoHair',  OCA_R2_PHOTO_SLOTS.hair],
    ['photoEyes',  OCA_R2_PHOTO_SLOTS.eyes],
    ['photoSkin',  OCA_R2_PHOTO_SLOTS.skin],
  ];
  for (var i = 0; i < slotMap.length; i++) {
    var field = slotMap[i][0], dims = slotMap[i][1];
    var dataUrl = r[field] || r.photoFace || r.photoCutout; // fall back chain if a specific shot wasn't provided
    var img = await ocaR2EmbedPhoto(pdfDoc, dataUrl);
    ocaR2SwapAllPages(pdfDoc, dims.w, dims.h, img.ref);
  }

  // Cover name overlay — patch over "Insert name here" with the real photo pixels from
  // that exact spot (extracted once from the template itself, no flat-colour guessing),
  // then draw the name on top in the same style. No box, matches the original look.
  // Note: PyMuPDF bboxes used throughout this file are top-left origin (y grows downward);
  // pdf-lib pages are bottom-left origin (y grows upward), so every y must be flipped
  // via (pageHeight - pymupdf_y) before drawing.
  ocaR2SetStatus('Adding name…');
  var coverPage = pdfDoc.getPages()[0];
  var coverH = coverPage.getHeight();
  var nb = OCA_R2_NAME_BOX;
  var patchBox = OCA_R2_NAME_PATCH_BOX;
  var patchBlob = await ocaR2DownloadFromStorage(OCA_REPORT_NAME_PATCH_PATH);
  var patchImg = await pdfDoc.embedPng(new Uint8Array(await patchBlob.arrayBuffer()));
  coverPage.drawImage(patchImg, {
    x: patchBox.x0, y: coverH - patchBox.y1,
    width: patchBox.x1 - patchBox.x0, height: patchBox.y1 - patchBox.y0,
  });
  var nameFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBoldItalic);
  var nameText = '“' + (r.clientName || 'Your Name') + '”';
  var nameWidth = nameFont.widthOfTextAtSize(nameText, nb.size);
  coverPage.drawText(nameText, {
    x: nb.x0 + ((nb.x1 - nb.x0) - nameWidth) / 2, y: coverH - nb.y1 + 6,
    size: nb.size, font: nameFont, color: rgb(0.94, 0.89, 0.76),
  });

  ocaR2SetStatus('');
  return await pdfDoc.save();
}

async function ocaR2GetBaseBytes() {
  if (!_ocaR2BaseBytes) {
    _ocaR2BaseBytes = await ocaR2BuildBaseBytes();
  }
  return _ocaR2BaseBytes;
}

// Replays every analyst-placed erase patch + tick on top of the cached base.
// Rebuilding from `base` each time (rather than mutating one long-lived doc)
// keeps this idempotent — the customTicks/erasePatches arrays are always the
// single source of truth, so undo/redo-by-re-clicking works correctly.
async function ocaR2RebuildWithEdits() {
  var r = ocaReport;
  var baseBytes = await ocaR2GetBaseBytes();
  var pdfDoc = await PDFLib.PDFDocument.load(baseBytes, { updateMetadata: false });
  var rgb = PDFLib.rgb;
  var pages = pdfDoc.getPages();

  r.erasePatches.forEach(function(p) {
    var page = pages[p.page];
    if (!page) return;
    var rr = parseInt(p.color.slice(1,3),16)/255, gg = parseInt(p.color.slice(3,5),16)/255, bb = parseInt(p.color.slice(5,7),16)/255;
    page.drawRectangle({ x: p.x - 16, y: p.y - 16, width: 32, height: 32, color: rgb(rr,gg,bb) });
  });

  if (r.customTicks.length) {
    var tickBlob = await ocaR2DownloadFromStorage(OCA_REPORT_TICK_PATH);
    var tickImg = await pdfDoc.embedPng(new Uint8Array(await tickBlob.arrayBuffer()));
    r.customTicks.forEach(function(t) {
      var page = pages[t.page];
      if (!page) return;
      page.drawImage(tickImg, { x: t.x - OCA_R2_TICK_SIZE/2, y: t.y - OCA_R2_TICK_SIZE/2, width: OCA_R2_TICK_SIZE, height: OCA_R2_TICK_SIZE });
    });
  }

  return await pdfDoc.save();
}

// ── Preview rendering (pdf.js) + click-to-place ──
function ocaR2InitPdfJsWorker() {
  if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }
}

// Building the real PDF (network fetch + pdf-lib parse/embed/save of an 11MB+
// document) reliably takes 20-40+ seconds — that's fine as a one-off "Build
// Preview" / "Download PDF" action, but far too slow to redo on every click.
// So the interactive part never touches pdf-lib: each page's *clean* pdf.js
// render is cached once as ImageData, and every tick/erase click just restores
// that snapshot and redraws the current marks straight onto the canvas with
// plain 2D drawing — instant, no regeneration. pdf-lib only runs again when
// the analyst actually downloads, replaying the same customTicks/erasePatches
// state onto a fresh copy of the real document.
var _ocaR2CleanSnapshots = {}; // pageIndex -> ImageData

async function ocaR2RenderPreview() {
  var r = ocaReport;
  var container = document.getElementById('oca-r2-preview');
  if (!container) return;
  if (!r.photoCutout) {
    container.innerHTML = '<div style="font-size:12px;color:var(--muted)">Upload the cutout photo above, then click "Build Preview" to see every page.</div>';
    return;
  }
  ocaR2InitPdfJsWorker();
  var btn = document.getElementById('oca-r2-preview-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Building…'; }
  container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:12px">Building preview — this can take 20–40 seconds the first time…</div>';
  _ocaR2CleanSnapshots = {};

  try {
    var bytes = await ocaR2RebuildWithEdits();
    var pdfJsDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
    container.innerHTML = '';
    for (var i = 1; i <= pdfJsDoc.numPages; i++) {
      var page = await pdfJsDoc.getPage(i);
      var viewport = page.getViewport({ scale: OCA_R2_RENDER_SCALE });
      var canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      canvas.style.cssText = 'width:100%;max-width:520px;display:block;border-radius:6px;box-shadow:0 2px 14px rgba(0,0,0,.16);cursor:crosshair;background:white';
      canvas.dataset.pageIndex = String(i - 1);
      var ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      _ocaR2CleanSnapshots[i - 1] = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.addEventListener('click', ocaR2OnPageClick);

      var wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;max-width:520px';
      var label = document.createElement('div');
      label.style.cssText = 'font-size:10px;color:var(--muted);font-weight:700;letter-spacing:.5px';
      label.textContent = 'PAGE ' + i;
      wrap.appendChild(label);
      wrap.appendChild(canvas);
      container.appendChild(wrap);

      ocaR2RedrawPageMarks(i - 1); // in case customTicks/erasePatches already existed for this page
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div style="padding:20px;color:#B04A3C;font-size:12px;max-width:500px">Could not build preview: ' + err.message + '</div>';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Build Preview'; }
  }
}

function ocaR2DrawTickMark(ctx, cx, cy, radiusPx) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
  ctx.fillStyle = '#2E8B57';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, radiusPx * 0.2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - radiusPx * 0.45, cy + radiusPx * 0.05);
  ctx.lineTo(cx - radiusPx * 0.1, cy + radiusPx * 0.38);
  ctx.lineTo(cx + radiusPx * 0.5, cy - radiusPx * 0.35);
  ctx.stroke();
  ctx.restore();
}

// Restores the clean (mark-free) snapshot for a page, then redraws every
// currently-active tick/erase mark for it. Pure canvas work — no pdf-lib.
function ocaR2RedrawPageMarks(pageIndex) {
  var canvas = document.querySelector('canvas[data-page-index="' + pageIndex + '"]');
  var clean = _ocaR2CleanSnapshots[pageIndex];
  if (!canvas || !clean) return;
  var ctx = canvas.getContext('2d');
  ctx.putImageData(clean, 0, 0);

  ocaReport.erasePatches.filter(function(p){ return p.page === pageIndex; }).forEach(function(p) {
    var cx = p.x * OCA_R2_RENDER_SCALE, cy = (canvas.height / OCA_R2_RENDER_SCALE - p.y) * OCA_R2_RENDER_SCALE;
    var half = 16 * OCA_R2_RENDER_SCALE;
    ctx.fillStyle = p.color;
    ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
  });
  ocaReport.customTicks.filter(function(t){ return t.page === pageIndex; }).forEach(function(t) {
    var cx = t.x * OCA_R2_RENDER_SCALE, cy = (canvas.height / OCA_R2_RENDER_SCALE - t.y) * OCA_R2_RENDER_SCALE;
    ocaR2DrawTickMark(ctx, cx, cy, (OCA_R2_TICK_SIZE / 2) * OCA_R2_RENDER_SCALE);
  });
}

function ocaR2OnPageClick(e) {
  var canvas = e.currentTarget;
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  var canvasX = (e.clientX - rect.left) * scaleX;
  var canvasY = (e.clientY - rect.top) * scaleY;
  var pageIndex = parseInt(canvas.dataset.pageIndex, 10);

  var pdfX = canvasX / OCA_R2_RENDER_SCALE;
  var pdfY = (canvas.height / OCA_R2_RENDER_SCALE) - (canvasY / OCA_R2_RENDER_SCALE); // flip to bottom-left origin

  var r = ocaReport;
  if (r.tickMode === 'erase') {
    var idx = r.erasePatches.findIndex(function(p){ return p.page === pageIndex && Math.hypot(p.x - pdfX, p.y - pdfY) < OCA_R2_CLICK_HIT_RADIUS; });
    if (idx >= 0) {
      r.erasePatches.splice(idx, 1);
    } else {
      // Sample from the clean snapshot (not the live, possibly mark-covered canvas)
      // so an erase patch's fill colour is never accidentally picked up from another mark.
      var clean = _ocaR2CleanSnapshots[pageIndex];
      var px = Math.max(0, Math.min(canvas.width - 1, Math.floor(canvasX)));
      var py = Math.max(0, Math.min(canvas.height - 1, Math.floor(canvasY)));
      var pixel = clean ? [
        clean.data[(py * clean.width + px) * 4],
        clean.data[(py * clean.width + px) * 4 + 1],
        clean.data[(py * clean.width + px) * 4 + 2],
      ] : [255, 255, 255];
      var hex = '#' + pixel.map(function(v){ return ('0' + v.toString(16)).slice(-2); }).join('');
      r.erasePatches.push({ page: pageIndex, x: pdfX, y: pdfY, color: hex });
    }
  } else {
    var idx2 = r.customTicks.findIndex(function(t){ return t.page === pageIndex && Math.hypot(t.x - pdfX, t.y - pdfY) < OCA_R2_CLICK_HIT_RADIUS; });
    if (idx2 >= 0) {
      r.customTicks.splice(idx2, 1);
    } else {
      r.customTicks.push({ page: pageIndex, x: pdfX, y: pdfY });
    }
  }

  ocaR2RedrawPageMarks(pageIndex);
}

// ── Download ──
async function ocaR2GeneratePdf() {
  var r = ocaReport;
  if (!r.photoCutout) { alert('Please upload the cutout photo first — it powers most of the report.'); return; }
  var btn = document.getElementById('oca-r2-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }

  try {
    ocaR2SetStatus('Generating…');
    var outBytes = await ocaR2RebuildWithEdits(); // same code path as the preview — guarantees WYSIWYG
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
