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
var OCA_REPORT_TICK_PATH = 'tick_badge.png';

// Lipstick/blush swatch images are shared across every season (same 4 files) — only the
// per-season page layout (template file, page indices, box positions) differs below.
var OCA_R2_LIPSTICK = {
  left:  { path: 'lipstick_left.png',  w: 65.2, h: 58.5 },
  right: { path: 'lipstick_right.png', w: 59.2, h: 59.2 },
};
var OCA_R2_BLUSH = {
  left:  { path: 'blush left.png',  w: 56, h: 61 },
  right: { path: 'blush right.png', w: 56, h: 48 },
};

var OCA_R2_TICK_SIZE = 22;
var OCA_R2_RENDER_SCALE = 1.3;
var OCA_R2_CLICK_HIT_RADIUS = 18; // pdf points — clicking within this of an existing mark toggles it off
var OCA_R2_SWATCH_DRAG_RADIUS = 26; // pdf points — how close a click needs to be to grab a swatch

// ── Per-season template layout ──
// Every season is built from the same shared Canva master (same page order, same photo-
// slot pixel sizes, same box positions, same cover photo) — confirmed by inspecting Light
// Summer, Soft Summer, Light Spring and True Summer's actual PDFs page-by-page (identical
// image dimensions and identical PyMuPDF-measured text/box coordinates across all four).
// So every season below shares one layout, overriding only what's genuinely season-
// specific (which template file, its label). If a future season's Canva file turns out to
// be laid out differently, override the specific field(s) that differ in that season's
// entry — everything here is just a starting default, not an assumption to defend.
var OCA_R2_SHARED_LAYOUT = {
  namePatchPath: 'name_patch.png', // same cover photo across every season, so one patch works for all
  // Every place the client's background-removed cutout appears is an image object of
  // one of these two pixel sizes (the template embeds the same photo at two different
  // resolutions depending on the cell's on-page size), reused many times per page.
  cutoutDims: { w: 410, h: 547 },
  cutoutDimsLarge: { w: 615, h: 820 },
  // Other client-specific photo slots, identified by their exact pixel size in the
  // template (each used once or twice, never recoloured). NOTE: the big cover
  // background photo (2084x3124) is a fixed design asset — never swapped.
  photoSlots: {
    face:          { w: 1024, h: 1366 }, // season-intro page
    featuresBlush: { w: 820,  h: 1093 }, // Features + Blush pages — colour
    hair:          { w: 150,  h: 72   },
    eyes:          { w: 134,  h: 82   },
    skin:          { w: 134,  h: 98   },
  },
  // 0-indexed page numbers for the two pages that share the 820x1093 box size.
  featuresBlushPages: [2, 18],
  // Cover photo and Contrast photo aren't swapped into an existing template image (the
  // template leaves that area blank) — instead the uploaded photo is drawn straight
  // onto the page, contain-fit and centred with no padding colour, inside these fixed
  // boxes (PDF points, top-left origin, clipped to the page).
  coverBox: { x0: 0, y0: 267.11, x1: 595.5, y1: 617.82 },
  contrastPageIndex: 4,
  contrastBox: { x0: 128, y0: 495, x1: 468, y1: 812 },
  // "Insert name here" placeholder text on the cover page (PDF points, top-left origin).
  nameBox: { x0: 130.6, y0: 690.1, x1: 492.4, y1: 748.9, size: 46 },
  // The patch image covers this same region (with padding) — extracted directly from
  // the template's own background photo so it blends seamlessly, no flat-colour guessing.
  namePatchBox: { x0: 100.6, y0: 670.1, x1: 522.4, y1: 768.9 },
  // Lipstick/Blush pages — no baked-in colour marks on either (lips or cheeks), so
  // there's nothing to erase; each swatch is just drawn directly at wherever the
  // analyst drags it to (defaulting to roughly the right spot already).
  lipstickPageIndex: 19,
  lipstick: {
    left:  { defaultX: 195.8, defaultYTop: 753.65 },
    right: { defaultX: 419.4, defaultYTop: 753.1 },
  },
  blushPageIndex: 18,
  blush: {
    left:  { defaultX: 275.9, defaultYTop: 621.1 },
    right: { defaultX: 332.9, defaultYTop: 620.6 },
  },
  // On these pages, the template's own small-cutout placeholder box is measurably larger
  // than the coloured square it's meant to sit inside (confirmed via direct PDF geometry
  // inspection, not assumption — the photo placeholder and its decorative square backdrop
  // were sized independently in the source Canva file), so a plain cover-fit swap makes
  // the photo spill outside the square on every cell. Each group's frac is the square's
  // position as a fraction of the oversized box (fx0,fy0 = top-left, fx1,fy1 = bottom-
  // right; PyMuPDF top-left-origin convention, same as the rest of this file), measured
  // per page (median across every cell on that page) and confirmed identical across
  // seasons. Deliberately excludes page 5 ("Cool vs Warm") — its per-cell variance is too
  // high (~10% spread) for one page-level fraction to fit every cell cleanly; that page
  // keeps the plain cover-fit behaviour rather than risk an inconsistent-looking fix.
  squareContainGroups: [
    { pages: [3],      frac: { fx0: -0.0535, fy0: 0.0484, fx1: 1.025,  fy1: 0.9023 } },
    { pages: [8, 9],   frac: { fx0: 0.0686,  fy0: 0.1113, fx1: 0.9609, fy1: 0.7879 } },
    { pages: [14, 15], frac: { fx0: 0.0727,  fy0: 0.1121, fx1: 0.965,  fy1: 0.7887 } },
  ],
};

function ocaR2DefineSeason(label, templatePath, overrides) {
  var season = Object.assign({}, OCA_R2_SHARED_LAYOUT, overrides || {});
  season.label = label;
  season.templatePath = templatePath;
  return season;
}

var OCA_R2_SEASONS = {
  light_summer:  ocaR2DefineSeason('Light Summer',  'template_light_summer_compressed.pdf'),
  soft_summer:   ocaR2DefineSeason('Soft Summer',   'template_soft_summer_compressed_FIXED.pdf'),
  light_spring:  ocaR2DefineSeason('Light Spring',  'template_light_spring_compressed.pdf'),
  true_summer:   ocaR2DefineSeason('True Summer',   'template_true_summer_compressed.pdf'),
  bright_spring: ocaR2DefineSeason('Bright Spring', 'template_bright_spring_compressed_REPLACEMENT.pdf'),
  soft_autumn:   ocaR2DefineSeason('Soft Autumn',   'template_soft_autumn_compressed.pdf'),
  true_spring:   ocaR2DefineSeason('True Spring',   'template_true_spring_compressed (1).pdf'),
  true_autumn:   ocaR2DefineSeason('True Autumn',   'template_true_autumn_compressed.pdf'),
  dark_autumn:   ocaR2DefineSeason('Dark Autumn',   'template_dark_autumn_compressed.pdf'),
  bright_winter: ocaR2DefineSeason('Bright Winter', 'template_bright_winter_compressed.pdf'),
  dark_winter:   ocaR2DefineSeason('Dark Winter',   'template_dark_winter_compressed.pdf'),
  true_winter:   ocaR2DefineSeason('True Winter',   'template_true_winter_compressed.pdf'),
};
var OCA_R2_DEFAULT_SEASON = 'light_summer';

function ocaR2ActiveSeason() {
  return OCA_R2_SEASONS[ocaReport.season] || OCA_R2_SEASONS[OCA_R2_DEFAULT_SEASON];
}

// Builds OCA_R2_SWATCH_GROUPS-shaped config for the active season: page index -> config +
// the ocaReport state-field prefix used to store per-side dragged positions (e.g.
// 'lipstick' -> lipstickLeft/lipstickRight). Merges the shared path/w/h from
// OCA_R2_LIPSTICK/OCA_R2_BLUSH with the active season's default positions.
function ocaR2GetSwatchGroups() {
  var season = ocaR2ActiveSeason();
  function merged(shared, seasonCfg) {
    var out = {};
    for (var side in shared) {
      out[side] = { path: shared[side].path, w: shared[side].w, h: shared[side].h,
        defaultX: seasonCfg[side].defaultX, defaultYTop: seasonCfg[side].defaultYTop };
    }
    return out;
  }
  var groups = {};
  groups[season.lipstickPageIndex] = { statePrefix: 'lipstick', config: merged(OCA_R2_LIPSTICK, season.lipstick) };
  groups[season.blushPageIndex] = { statePrefix: 'blush', config: merged(OCA_R2_BLUSH, season.blush) };
  return groups;
}

// ── Report state ──
var ocaReport = {
  season: OCA_R2_DEFAULT_SEASON,
  clientName: '',
  date: new Date().toISOString().split('T')[0],
  tickMode: 'place', // 'place' | 'erase'
  // dataURLs (uploaded by analyst; fall back to the cutout if not provided)
  photoCutout: null,
  photoCover: null,
  photoFace: null,
  photoContrast: null,
  photoHair: null,
  photoEyes: null,
  photoSkin: null,
  // analyst-placed marks, in PDF-point space (bottom-left origin), per page (0-indexed)
  customTicks: [],   // [{page, x, y}]
  erasePatches: [],  // [{page, x, y, color}]
  // dragged lipstick/blush swatch centres, PDF-point space (bottom-left origin) — null =
  // use the template's original position until the analyst drags it somewhere else.
  lipstickLeft: null,
  lipstickRight: null,
  blushLeft: null,
  blushRight: null,
  contrastLevel: '', // 'Low' | 'Medium' | 'High' | 'Low/Medium' | 'Medium/High'
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

// Every page index/position in this file is specific to one season's PDF, so switching
// seasons clears any placed ticks/erase patches/dragged swatches — they'd point at the
// wrong page (or a page that doesn't exist) in a differently-laid-out template.
function ocaR2OnSeasonChange(season) {
  ocaReport.season = season;
  ocaReport.customTicks = [];
  ocaReport.erasePatches = [];
  ocaReport.lipstickLeft = null;
  ocaReport.lipstickRight = null;
  ocaReport.blushLeft = null;
  ocaReport.blushRight = null;
  ocaR2InvalidateBase();
  renderOca();
  ocaR2RenderPreview();
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

  // Season picker — swaps the whole template + page layout. Sits above name/date since
  // it determines everything else on this card.
  html += '<div style="padding:14px 20px 0;background:var(--deep)">'
    + '<div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:5px">Season</div>'
    + '<select onchange="ocaR2OnSeasonChange(this.value)" style="width:100%;max-width:260px;padding:8px 10px;border:1px solid rgba(255,255,255,.2);border-radius:7px;font-size:13px;font-family:inherit;background:rgba(255,255,255,.1);color:white;outline:none">'
    + Object.keys(OCA_R2_SEASONS).map(function(key) {
        return '<option value="' + key + '"' + (r.season === key ? ' selected' : '') + '>' + OCA_R2_SEASONS[key].label + '</option>';
      }).join('')
    + '</select></div>';

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
    + _ocaR2PhotoSlot('photoCover', 'Cover', 'Centred on the cover — the background photo is fixed and never changes')
    + _ocaR2PhotoSlot('photoFace', 'Face', 'Background auto-removed')
    + _ocaR2PhotoSlot('photoContrast', 'Contrast', 'Screenshot of the contrast breakdown, centred on the page')
    + _ocaR2PhotoSlot('photoHair', 'Hair', 'Close-up crop')
    + _ocaR2PhotoSlot('photoEyes', 'Eyes', 'Close-up crop')
    + _ocaR2PhotoSlot('photoSkin', 'Skin', 'Close-up crop')
    + '</div>';
  html += '</div>';

  html += '<div style="padding:0 20px 16px"><div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Contrast Level</div>'
    + '<select onchange="ocaReport.contrastLevel=this.value;ocaR2OnNameOrDateChange()" style="padding:8px 10px;border:1px solid var(--sand);border-radius:7px;font-size:13px;font-family:inherit;background:#FAF6F1;color:var(--deep);outline:none">'
    + ['', 'Low', 'Medium', 'High', 'Low/Medium', 'Medium/High'].map(function(opt) {
        return '<option value="' + opt + '"' + (r.contrastLevel === opt ? ' selected' : '') + '>' + (opt || 'Not set') + '</option>';
      }).join('')
    + '</select></div>';

  html += '<div style="padding:12px 20px;border-top:1px solid var(--sand);display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
    + '<button onclick="ocaR2RenderPreview()" id="oca-r2-preview-btn" style="background:var(--deep);color:white;border:none;padding:10px 20px;font-size:12.5px;font-weight:600;border-radius:9px;cursor:pointer">Build Preview</button>'
    + '<div style="width:1px;height:22px;background:var(--sand);margin:0 4px"></div>'
    + '<div style="display:flex;border:1.5px solid var(--sand);border-radius:9px;overflow:hidden">'
    + '<button onclick="ocaR2SetTickMode(\'place\')" style="padding:9px 16px;font-size:12px;font-weight:600;border:none;cursor:pointer;background:' + (r.tickMode==='place'?'var(--deep)':'white') + ';color:' + (r.tickMode==='place'?'white':'var(--deep)') + '">&#10003; Place Tick</button>'
    + '<button onclick="ocaR2SetTickMode(\'erase\')" style="padding:9px 16px;font-size:12px;font-weight:600;border:none;cursor:pointer;background:' + (r.tickMode==='erase'?'#B04A3C':'white') + ';color:' + (r.tickMode==='erase'?'white':'var(--deep)') + '">&#10005; Erase</button>'
    + '</div>'
    + '<div style="font-size:11px;color:var(--muted)">Click any page below to ' + (r.tickMode==='erase' ? 'paint over a default tick' : 'place a tick') + '. Click a mark again to remove it. On the Lipstick and Blush pages, drag the swatches into place.</div>'
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
// Templates get re-uploaded/overwritten in place fairly often while iterating on
// them, and the storage endpoint serves them with `cache-control: public,
// max-age=3600` — so the Supabase SDK's own `.download()` (a plain fetch under the
// hood) can silently keep serving an hour-old cached copy of an already-replaced
// file, even across page reloads, since that only clears the page's own cache, not
// fetch() responses cached against this URL. Bypassing the SDK here with a manual
// fetch — cache-busted and forced to skip the HTTP cache — guarantees we always get
// whatever is actually in the bucket right now.
async function ocaR2DownloadFromStorage(path) {
  var db = getSupa();
  if (!db) throw new Error('Not connected to Supabase — please refresh and sign in again.');
  var sessionRes = await db.auth.getSession();
  var token = sessionRes.data && sessionRes.data.session && sessionRes.data.session.access_token;
  if (!token) throw new Error('Not signed in — please refresh and sign in again.');
  var url = SUPA_URL + '/storage/v1/object/' + OCA_REPORT_BUCKET + '/' + encodeURIComponent(path) + '?_=' + Date.now();
  var res = await fetch(url, {
    cache: 'no-store',
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPA_KEY },
  });
  if (!res.ok) throw new Error('Could not load "' + path + '" (' + res.status + ')');
  return await res.blob();
}

async function ocaR2FetchTemplateBytes() {
  var blob = await ocaR2DownloadFromStorage(ocaR2ActiveSeason().templatePath);
  return await blob.arrayBuffer();
}

function ocaR2DataUrlToBytes(dataUrl) {
  var base64 = dataUrl.split(',')[1];
  var bin = atob(base64);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// pdf-lib's drawImage always stretches the whole embedded image to exactly fill the
// given width/height — it never crops or letterboxes on its own. Every slot in the
// template is a fixed aspect ratio, so without doing one of those first, an uploaded
// photo with a different aspect ratio comes out squished/stretched. targetAspect
// (width/height) is optional — when given:
//   fit: 'cover'   — center-crop to the box's ratio (like CSS object-fit: cover).
//                     Fills the box completely, but trims the top/bottom or sides.
//   fit: 'contain' — scale the whole photo to fit inside the box uncropped (like CSS
//                     object-fit: contain). If padColor is given, pads the rest with
//                     it; otherwise leaves the margin transparent (used for the cover/
//                     Contrast boxes, which are drawn straight onto the blank page —
//                     the page's own background shows through instead of a padded box).
// Builds the fitted canvas (cover-cropped or contain-padded) without embedding it —
// shared by ocaR2EmbedPhoto and by the lipstick cover-patch extraction, which needs to
// sample real pixels from the exact image that's about to go on the page.
async function ocaR2BuildFitCanvas(dataUrl, targetAspect, fit, padColor) {
  var img = await new Promise(function(resolve, reject) {
    var el = new Image();
    el.onload = function(){ resolve(el); };
    el.onerror = reject;
    el.src = dataUrl;
  });
  var sw = img.naturalWidth, sh = img.naturalHeight;
  var canvas = document.createElement('canvas');
  var ctx;

  if (targetAspect && fit === 'contain') {
    var srcAspect = sw / sh;
    var canvasW, canvasH;
    if (srcAspect > targetAspect) {
      // source is relatively wider than the box — its width becomes the constraint
      canvasW = sw; canvasH = sw / targetAspect;
    } else {
      canvasW = sh * targetAspect; canvasH = sh;
    }
    canvas.width = Math.round(canvasW); canvas.height = Math.round(canvasH);
    ctx = canvas.getContext('2d');
    if (padColor) {
      ctx.fillStyle = padColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, (canvas.width - sw) / 2, (canvas.height - sh) / 2, sw, sh);
  } else {
    var sx = 0, sy = 0;
    if (targetAspect) {
      var srcAspect2 = sw / sh;
      if (srcAspect2 > targetAspect) {
        // source is relatively wider than the box — crop left/right, keep full height
        var cropW = sh * targetAspect;
        sx = (sw - cropW) / 2;
        sw = cropW;
      } else if (srcAspect2 < targetAspect) {
        // source is relatively taller than the box — crop top/bottom, keep full width
        var cropH = sw / targetAspect;
        sy = (sh - cropH) / 2;
        sh = cropH;
      }
    }
    canvas.width = Math.round(sw); canvas.height = Math.round(sh);
    ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

// Builds a cutout canvas for pages where the template's own photo placeholder box is
// larger than the coloured square it's meant to sit inside (see squareContainGroups).
// Since the placeholder's own draw position/size can't be changed — only which image it
// references — this bakes the correct positioning into the image itself: a canvas the
// same shape as the oversized box, transparent everywhere except the square's own
// fractional region, where the whole photo is contain-fit (never cropped, just shrunk to
// fit). Once swapped in, the transparent margin reveals the coloured square drawn
// underneath instead of the photo spilling past its edges.
async function ocaR2BuildSquareContainedCanvas(dataUrl, boxDims, frac) {
  var img = await new Promise(function(resolve, reject) {
    var el = new Image();
    el.onload = function(){ resolve(el); };
    el.onerror = reject;
    el.src = dataUrl;
  });
  var sw = img.naturalWidth, sh = img.naturalHeight;
  var canvas = document.createElement('canvas');
  canvas.width = boxDims.w * 2; canvas.height = boxDims.h * 2; // 2x for a bit of headroom
  var ctx = canvas.getContext('2d');

  var sqX0 = frac.fx0 * canvas.width, sqY0 = frac.fy0 * canvas.height;
  var sqX1 = frac.fx1 * canvas.width, sqY1 = frac.fy1 * canvas.height;
  var sqW = sqX1 - sqX0, sqH = sqY1 - sqY0;
  var sqAspect = sqW / sqH;
  var srcAspect = sw / sh;
  var drawW, drawH;
  if (srcAspect > sqAspect) { drawW = sqW; drawH = sqW / srcAspect; }
  else { drawH = sqH; drawW = sqH * srcAspect; }
  ctx.drawImage(img, sqX0 + (sqW - drawW) / 2, sqY0 + (sqH - drawH) / 2, drawW, drawH);
  return canvas;
}

// pdf-lib's drawImage always stretches the whole embedded image to exactly fill the
// given width/height — it never crops or letterboxes on its own. Every slot in the
// template is a fixed aspect ratio, so without doing one of those first, an uploaded
// photo with a different aspect ratio comes out squished/stretched. targetAspect
// (width/height) is optional — when given:
//   fit: 'cover'   — center-crop to the box's ratio (like CSS object-fit: cover).
//                     Fills the box completely, but trims the top/bottom or sides.
//   fit: 'contain' — scale the whole photo to fit inside the box uncropped (like CSS
//                     object-fit: contain), padding the rest with padColor. Nothing
//                     gets cut off, but there's empty space on two sides.
async function ocaR2EmbedPhoto(pdfDoc, dataUrl, targetAspect, fit, padColor) {
  var canvas = await ocaR2BuildFitCanvas(dataUrl, targetAspect, fit, padColor);
  // Normalise everything to PNG via canvas so embedPng always works (handles JPEG/HEIC-derived uploads too).
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
  return ocaR2SwapOnPages(pdfDoc, null, targetW, targetH, newImageRef);
}

// pageIndices: null = every page; otherwise an array of 0-indexed page numbers to
// restrict the swap to. Needed where the same image pixel size is reused across
// pages that need genuinely different content (e.g. Contrast needs greyscale,
// Features/Blush need colour, but all three share one box size in the template).
function ocaR2SwapOnPages(pdfDoc, pageIndices, targetW, targetH, newImageRef) {
  var PDFName = PDFLib.PDFName;
  var pages = pdfDoc.getPages();
  var visited = new Set();
  var total = 0;
  for (var i = 0; i < pages.length; i++) {
    if (pageIndices && pageIndices.indexOf(i) === -1) continue;
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
  var season = ocaR2ActiveSeason();
  var templateBytes = await ocaR2FetchTemplateBytes();
  var pdfDoc = await PDFLib.PDFDocument.load(templateBytes, { updateMetadata: false });
  var rgb = PDFLib.rgb;

  // Every photo slot shows the whole uploaded photo uncropped (contain-fit, letterboxed
  // with white padding) rather than cropping to fill the box — cropping a face is worse
  // than a bit of empty space on the sides.
  ocaR2SetStatus('Embedding photos…');
  var cutoutAspect = season.cutoutDims.w / season.cutoutDims.h; // large cutout is the same ratio, shares this canvas
  var cutoutCanvas = await ocaR2BuildFitCanvas(r.photoCutout, cutoutAspect); // cover-fit, stays transparent — the per-cell colour has to show through around it
  var cutoutImg = await pdfDoc.embedPng(ocaR2DataUrlToBytes(cutoutCanvas.toDataURL('image/png')));
  var squareGroups = season.squareContainGroups || [];
  var squarePages = squareGroups.reduce(function(acc, g){ return acc.concat(g.pages); }, []);
  var normalPageIndices = null;
  if (squarePages.length) {
    var totalPages = pdfDoc.getPages().length;
    normalPageIndices = [];
    for (var pi = 0; pi < totalPages; pi++) {
      if (squarePages.indexOf(pi) === -1) normalPageIndices.push(pi);
    }
  }
  ocaR2SwapOnPages(pdfDoc, normalPageIndices, season.cutoutDims.w, season.cutoutDims.h, cutoutImg.ref);
  ocaR2SwapAllPages(pdfDoc, season.cutoutDimsLarge.w, season.cutoutDimsLarge.h, cutoutImg.ref);
  for (var gi = 0; gi < squareGroups.length; gi++) {
    var group = squareGroups[gi];
    var groupCanvas = await ocaR2BuildSquareContainedCanvas(r.photoCutout, season.cutoutDims, group.frac);
    var groupImg = await pdfDoc.embedPng(ocaR2DataUrlToBytes(groupCanvas.toDataURL('image/png')));
    ocaR2SwapOnPages(pdfDoc, group.pages, season.cutoutDims.w, season.cutoutDims.h, groupImg.ref);
  }

  // Cover and Contrast photos: the template just leaves this area blank now (no
  // placeholder image to swap into), so draw the uploaded photo straight onto the page —
  // contain-fit, no padding colour, so the page's own background/cream shows through any
  // gaps instead of a box.
  var coverBox = season.coverBox;
  var coverDataUrl = r.photoCover || r.photoFace || r.photoCutout;
  var coverImg = await ocaR2EmbedPhoto(pdfDoc, coverDataUrl, (coverBox.x1 - coverBox.x0) / (coverBox.y1 - coverBox.y0), 'contain');
  var coverPage0 = pdfDoc.getPages()[0];
  var coverPage0H = coverPage0.getHeight();
  coverPage0.drawImage(coverImg, {
    x: coverBox.x0, y: coverPage0H - coverBox.y1,
    width: coverBox.x1 - coverBox.x0, height: coverBox.y1 - coverBox.y0,
  });

  var contrastBox = season.contrastBox;
  var contrastSource = r.photoContrast || r.photoFace || r.photoCutout;
  var contrastImg = await ocaR2EmbedPhoto(pdfDoc, contrastSource, (contrastBox.x1 - contrastBox.x0) / (contrastBox.y1 - contrastBox.y0), 'contain');
  var contrastPage = pdfDoc.getPages()[season.contrastPageIndex];
  var contrastPageH = contrastPage.getHeight();
  contrastPage.drawImage(contrastImg, {
    x: contrastBox.x0, y: contrastPageH - contrastBox.y1,
    width: contrastBox.x1 - contrastBox.x0, height: contrastBox.y1 - contrastBox.y0,
  });
  if (r.contrastLevel) {
    var levelFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    var levelSize = 14;
    var levelText = 'Contrast Level: ' + r.contrastLevel;
    var levelWidth = levelFont.widthOfTextAtSize(levelText, levelSize);
    contrastPage.drawText(levelText, {
      x: contrastBox.x0 + ((contrastBox.x1 - contrastBox.x0) - levelWidth) / 2,
      y: contrastPageH - 488,
      size: levelSize, font: levelFont, color: rgb(0.1, 0.1, 0.1),
    });
  }

  // Season-intro page (the "face" slot) sits on a colourful rainbow-striped background,
  // same as the swatch-grid pages — it needs the transparent cover-fit cutout treatment,
  // not white padding, or the rainbow gets replaced by a hard-edged white box.
  var faceDims = season.photoSlots.face;
  var faceDataUrl = r.photoFace || r.photoCutout;
  var faceImg = await ocaR2EmbedPhoto(pdfDoc, faceDataUrl, faceDims.w / faceDims.h);
  ocaR2SwapOnPages(pdfDoc, null, faceDims.w, faceDims.h, faceImg.ref);

  var slotMap = [
    ['photoFace',  season.photoSlots.featuresBlush, season.featuresBlushPages], // Features + Blush — colour, plain background
    ['photoHair',  season.photoSlots.hair, null],
    ['photoEyes',  season.photoSlots.eyes, null],
    ['photoSkin',  season.photoSlots.skin, null],
  ];
  for (var i = 0; i < slotMap.length; i++) {
    var field = slotMap[i][0], dims = slotMap[i][1], pageIndices = slotMap[i][2];
    var dataUrl = r[field] || r.photoFace || r.photoCutout; // fall back chain if a specific shot wasn't provided
    var img = await ocaR2EmbedPhoto(pdfDoc, dataUrl, dims.w / dims.h, 'contain', '#ffffff');
    ocaR2SwapOnPages(pdfDoc, pageIndices, dims.w, dims.h, img.ref);
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
  var nb = season.nameBox;
  var patchBox = season.namePatchBox;
  var patchBlob = await ocaR2DownloadFromStorage(season.namePatchPath);
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

  // Lipstick/Blush swatches: the template has no baked-in colour marks anymore, so
  // there's nothing to erase here — ocaR2RebuildWithEdits (the cheap replay layer) draws
  // each swatch directly at its default or dragged position on every rebuild.

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

  // Lipstick + Blush — draw each swatch at its current (dragged or default) position.
  // Lives here rather than in the base build so dragging never has to pay the full
  // rebuild cost.
  var swatchGroups = ocaR2GetSwatchGroups();
  for (var groupPageIndex in swatchGroups) {
    var group = swatchGroups[groupPageIndex];
    var swatchPage = pages[groupPageIndex];
    if (!swatchPage) continue;
    var swatchPageH = swatchPage.getHeight();
    for (var side in group.config) {
      var cfg = group.config[side];
      var pos = r[group.statePrefix + side[0].toUpperCase() + side.slice(1)]; // bottom-origin {x,y} if dragged
      var cx = pos ? pos.x : cfg.defaultX;
      var cyBottom = pos ? pos.y : (swatchPageH - cfg.defaultYTop);
      var swatchBlob = await ocaR2DownloadFromStorage(cfg.path);
      var swatchImg = await pdfDoc.embedPng(new Uint8Array(await swatchBlob.arrayBuffer()));
      swatchPage.drawImage(swatchImg, { x: cx - cfg.w/2, y: cyBottom - cfg.h/2, width: cfg.w, height: cfg.h });
    }
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

// Photo uploads, name/date edits, and the Build Preview button can all trigger a rebuild,
// and each rebuild takes 20-40s — so it's very easy for a second request to start before
// the first one finishes (e.g. uploading two photos a few seconds apart). Without a guard,
// both would race to clear and repopulate the same container, interleaving their page
// elements and producing exactly the "pages are repeated/scrambled" symptom. This token
// makes every in-flight run check, before each DOM mutation, whether a newer run has since
// started — if so it just stops touching the DOM and lets the newer run own the result.
var _ocaR2PreviewGeneration = 0;

async function ocaR2RenderPreview() {
  var r = ocaReport;
  var myGeneration = ++_ocaR2PreviewGeneration;
  var container = document.getElementById('oca-r2-preview');
  if (!container) return;
  if (!r.photoCutout) {
    container.innerHTML = '<div style="font-size:12px;color:var(--muted)">Upload the cutout photo above, then click "Build Preview" to see every page.</div>';
    return;
  }
  ocaR2InitPdfJsWorker();
  ocaR2EnsureDocListeners();
  var btn = document.getElementById('oca-r2-preview-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Building…'; }
  container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:12px">Building preview — this can take 20–40 seconds the first time…</div>';

  try {
    await ocaR2PreloadSwatchImgs();
    // The snapshot must come from the bare base bytes, not ocaR2RebuildWithEdits() —
    // ocaR2RedrawPageMarks always redraws every tick/erase patch/lipstick swatch fresh on
    // top of it anyway, so if the snapshot already had a swatch baked in (at whatever
    // position was current when it was captured), dragging would leave that old baked-in
    // copy visible behind the new one — a frozen "permanent" swatch plus the real moveable one.
    var bytes = await ocaR2GetBaseBytes();
    if (myGeneration !== _ocaR2PreviewGeneration) return; // superseded while we were awaiting
    // pdf.js's worker takes ownership of (detaches) whatever buffer it's handed, so pass it
    // a copy — not the cached _ocaR2BaseBytes array itself, or the next Download click would
    // hand pdf-lib an emptied-out buffer and fail with "No PDF header found".
    var pdfJsDoc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    if (myGeneration !== _ocaR2PreviewGeneration) return;
    container.innerHTML = '';
    _ocaR2CleanSnapshots = {};
    for (var i = 1; i <= pdfJsDoc.numPages; i++) {
      var page = await pdfJsDoc.getPage(i);
      if (myGeneration !== _ocaR2PreviewGeneration) return; // bail mid-loop if superseded
      var viewport = page.getViewport({ scale: OCA_R2_RENDER_SCALE });
      var canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      canvas.style.cssText = 'width:100%;max-width:520px;display:block;border-radius:6px;box-shadow:0 2px 14px rgba(0,0,0,.16);cursor:crosshair;background:white';
      canvas.dataset.pageIndex = String(i - 1);
      var ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      if (myGeneration !== _ocaR2PreviewGeneration) return;
      _ocaR2CleanSnapshots[i - 1] = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.addEventListener('mousedown', ocaR2OnPageMouseDown);
      canvas.addEventListener('click', ocaR2OnPageClickGated);

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
    if (myGeneration !== _ocaR2PreviewGeneration) return; // a newer run's error/success supersedes this one
    console.error(err);
    container.innerHTML = '<div style="padding:20px;color:#B04A3C;font-size:12px;max-width:500px">Could not build preview: ' + err.message + '</div>';
  } finally {
    if (myGeneration === _ocaR2PreviewGeneration && btn) { btn.disabled = false; btn.textContent = 'Build Preview'; }
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

// Lipstick/Blush swatch images, preloaded once as real <img> elements so a drag can
// redraw them on the canvas instantly (no pdf-lib/pdf.js round-trip while the mouse moves).
var _ocaR2SwatchImgs = {}; // statePrefix -> side -> <img>
// Loads one group's images. Pulled into its own function (rather than inlined in a loop)
// so `group`/`bucket` are real per-call parameters/locals — with `var` in a shared loop
// body instead, every async onload below would fire after the loop finished and all end
// up writing into whichever group's bucket the loop landed on last.
function ocaR2PreloadSwatchGroup(group) {
  var bucket = _ocaR2SwatchImgs[group.statePrefix] || (_ocaR2SwatchImgs[group.statePrefix] = {});
  return Promise.all(Object.keys(group.config).map(function(side) {
    if (bucket[side]) return Promise.resolve();
    return ocaR2DownloadFromStorage(group.config[side].path).then(function(blob) {
      return new Promise(function(resolve) {
        var url = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function() { bucket[side] = img; resolve(); };
        img.src = url;
      });
    });
  }));
}
function ocaR2PreloadSwatchImgs() {
  var loads = [];
  var swatchGroups = ocaR2GetSwatchGroups();
  for (var pageIndex in swatchGroups) {
    loads.push(ocaR2PreloadSwatchGroup(swatchGroups[pageIndex]));
  }
  return Promise.all(loads);
}

var _ocaR2SwatchDrag = null; // { statePrefix, side, pageIndex } while actively dragging

// Restores the clean (mark-free) snapshot for a page, then redraws every currently-active
// tick/erase mark for it, plus any lipstick/blush swatches if this is one of those pages.
// Pure canvas work — no pdf-lib — so it's instant, safe to call on every drag frame.
function ocaR2RedrawPageMarks(pageIndex, liveDragPos) {
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

  var group = ocaR2GetSwatchGroups()[pageIndex];
  if (group) {
    var canvasH = canvas.height / OCA_R2_RENDER_SCALE;
    for (var side in group.config) {
      var cfg = group.config[side];
      var img = (_ocaR2SwatchImgs[group.statePrefix] || {})[side];
      if (!img) continue;
      var live = liveDragPos && liveDragPos.statePrefix === group.statePrefix && liveDragPos.side === side ? liveDragPos : null;
      var pos = live || ocaReport[group.statePrefix + side[0].toUpperCase() + side.slice(1)];
      var cx = (pos ? pos.x : cfg.defaultX) * OCA_R2_RENDER_SCALE;
      var cyBottom = pos ? pos.y : (canvasH - cfg.defaultYTop);
      var cy = (canvasH - cyBottom) * OCA_R2_RENDER_SCALE;
      var w = cfg.w * OCA_R2_RENDER_SCALE, h = cfg.h * OCA_R2_RENDER_SCALE;
      // The base rebuild has no baked-in marks at all anymore, so the clean snapshot is
      // already bare — no erase-paint needed here, just draw the swatch.
      ctx.drawImage(img, cx - w/2, cy - h/2, w, h);
    }
  }
}

function ocaR2PointInSwatch(pageIndex, pdfX, pdfY) {
  var group = ocaR2GetSwatchGroups()[pageIndex];
  if (!group) return null;
  for (var side in group.config) {
    var cfg = group.config[side];
    var pos = ocaReport[group.statePrefix + side[0].toUpperCase() + side.slice(1)];
    var cx = pos ? pos.x : cfg.defaultX;
    var cy = pos ? pos.y : null; // resolved against page height by the caller if null
    if (cy == null) {
      var canvas = document.querySelector('canvas[data-page-index="' + pageIndex + '"]');
      cy = canvas ? (canvas.height / OCA_R2_RENDER_SCALE - cfg.defaultYTop) : 0;
    }
    if (Math.hypot(cx - pdfX, cy - pdfY) < OCA_R2_SWATCH_DRAG_RADIUS) return { statePrefix: group.statePrefix, side: side };
  }
  return null;
}

function ocaR2CanvasToPdfPoint(canvas, clientX, clientY) {
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  var canvasX = (clientX - rect.left) * scaleX;
  var canvasY = (clientY - rect.top) * scaleY;
  return {
    canvasX: canvasX, canvasY: canvasY,
    pdfX: canvasX / OCA_R2_RENDER_SCALE,
    pdfY: (canvas.height / OCA_R2_RENDER_SCALE) - (canvasY / OCA_R2_RENDER_SCALE),
  };
}

// mousedown/mousemove/mouseup handle lipstick/blush dragging; move/up are attached once
// at the document level (not per-canvas) so a drag keeps tracking even if the cursor
// briefly leaves the canvas bounds. Plain clicks (tick/erase placement) are handled
// separately by each canvas's own 'click' listener, gated so a drag-release doesn't also
// register as one.
var _ocaR2JustDraggedPage = null;

function ocaR2OnPageMouseDown(e) {
  var canvas = e.currentTarget;
  var pageIndex = parseInt(canvas.dataset.pageIndex, 10);
  var pt = ocaR2CanvasToPdfPoint(canvas, e.clientX, e.clientY);
  var hit = ocaR2PointInSwatch(pageIndex, pt.pdfX, pt.pdfY);
  if (hit) {
    _ocaR2SwatchDrag = { statePrefix: hit.statePrefix, side: hit.side, pageIndex: pageIndex };
    e.preventDefault();
  }
}

function ocaR2OnDocumentMouseMove(e) {
  if (!_ocaR2SwatchDrag) return;
  var canvas = document.querySelector('canvas[data-page-index="' + _ocaR2SwatchDrag.pageIndex + '"]');
  if (!canvas) return;
  var pt = ocaR2CanvasToPdfPoint(canvas, e.clientX, e.clientY);
  ocaR2RedrawPageMarks(_ocaR2SwatchDrag.pageIndex, { statePrefix: _ocaR2SwatchDrag.statePrefix, side: _ocaR2SwatchDrag.side, x: pt.pdfX, y: pt.pdfY });
}

function ocaR2OnDocumentMouseUp(e) {
  if (!_ocaR2SwatchDrag) return;
  var canvas = document.querySelector('canvas[data-page-index="' + _ocaR2SwatchDrag.pageIndex + '"]');
  if (canvas) {
    var pt = ocaR2CanvasToPdfPoint(canvas, e.clientX, e.clientY);
    var side = _ocaR2SwatchDrag.side;
    ocaReport[_ocaR2SwatchDrag.statePrefix + side[0].toUpperCase() + side.slice(1)] = { x: pt.pdfX, y: pt.pdfY };
    ocaR2RedrawPageMarks(_ocaR2SwatchDrag.pageIndex);
  }
  _ocaR2JustDraggedPage = _ocaR2SwatchDrag.pageIndex;
  _ocaR2SwatchDrag = null;
}

var _ocaR2DocListenersAttached = false;
function ocaR2EnsureDocListeners() {
  if (_ocaR2DocListenersAttached) return;
  document.addEventListener('mousemove', ocaR2OnDocumentMouseMove);
  document.addEventListener('mouseup', ocaR2OnDocumentMouseUp);
  _ocaR2DocListenersAttached = true;
}

function ocaR2OnPageClickGated(e) {
  var pageIndex = parseInt(e.currentTarget.dataset.pageIndex, 10);
  if (_ocaR2JustDraggedPage === pageIndex) { _ocaR2JustDraggedPage = null; return; }
  ocaR2OnPageClick(e);
}

function ocaR2OnPageClick(e) {
  var canvas = e.currentTarget;
  var pageIndex = parseInt(canvas.dataset.pageIndex, 10);
  var pt = ocaR2CanvasToPdfPoint(canvas, e.clientX, e.clientY);
  var pdfX = pt.pdfX, pdfY = pt.pdfY;

  var r = ocaReport;
  if (r.tickMode === 'erase') {
    var idx = r.erasePatches.findIndex(function(p){ return p.page === pageIndex && Math.hypot(p.x - pdfX, p.y - pdfY) < OCA_R2_CLICK_HIT_RADIUS; });
    if (idx >= 0) {
      r.erasePatches.splice(idx, 1);
    } else {
      // Sample from the clean snapshot (not the live, possibly mark-covered canvas)
      // so an erase patch's fill colour is never accidentally picked up from another mark.
      var clean = _ocaR2CleanSnapshots[pageIndex];
      var px = Math.max(0, Math.min(canvas.width - 1, Math.floor(pt.canvasX)));
      var py = Math.max(0, Math.min(canvas.height - 1, Math.floor(pt.canvasY)));
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
