// ══════════════════════════════════════════════════════════════════
// MEDIAPIPE AUTO-CONTRAST ANALYSIS
// ──────────────────────────────────────────────────────────────────
// Privacy: client photos never leave the device at any point.
//   - Model file is self-hosted at /mediapipe/face_landmarker.task
//   - All face detection runs in WebAssembly, client-side only
//   - JS/WASM runtime loads from jsDelivr CDN (library only — no
//     image data is ever sent externally)
// ══════════════════════════════════════════════════════════════════

var _mpFaceLandmarker  = null;
var _mpInitPromise     = null;

var MP_MODEL_URL = '/mediapipe/face_landmarker.task';
var MP_WASM_URL  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm/';
var MP_LIB_URL   = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs';

// Luminance values matching GREY_VALS (#111 → #E8E8E8, shades 1–10)
var MP_GREY_LUMS = [17, 34, 56, 80, 104, 132, 158, 184, 208, 232];

function mpLumToShade(lum) {
  var best = 0, minD = Infinity;
  for (var i = 0; i < MP_GREY_LUMS.length; i++) {
    var d = Math.abs(lum - MP_GREY_LUMS[i]);
    if (d < minD) { minD = d; best = i; }
  }
  return best + 1;
}

// Lazy-load MediaPipe — only downloads when first needed
function mpEnsureLoaded() {
  if (_mpFaceLandmarker) return Promise.resolve(_mpFaceLandmarker);
  if (_mpInitPromise)    return _mpInitPromise;

  _mpInitPromise = import(MP_LIB_URL).then(function(mod) {
    var FaceLandmarker  = mod.FaceLandmarker;
    var FilesetResolver = mod.FilesetResolver;
    return FilesetResolver.forVisionTasks(MP_WASM_URL).then(function(vision) {
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: window.location.origin + MP_MODEL_URL,
          delegate: 'CPU'
        },
        runningMode: 'IMAGE',
        numFaces: 1
      });
    });
  }).then(function(lm) {
    _mpFaceLandmarker = lm;
    return lm;
  }).catch(function(e) {
    _mpInitPromise = null;
    throw e;
  });

  return _mpInitPromise;
}

// Convert normalised landmark coords → container pixel position
// Accounts for object-fit:cover; object-position:center top
function mpNormToContainer(nx, ny, imgW, imgH, ctnW, ctnH) {
  var imgAspect = imgW / imgH;
  var ctnAspect = ctnW / ctnH;
  var scale, offX, offY;

  if (imgAspect > ctnAspect) {
    // Wider image — fill height, crop sides equally
    scale = ctnH / imgH;
    offX  = (ctnW - imgW * scale) / 2;
    offY  = 0;
  } else {
    // Taller image (portrait) — fill width, crop bottom (top-aligned)
    scale = ctnW / imgW;
    offX  = 0;
    offY  = 0;
  }

  return {
    x: Math.round(nx * imgW * scale + offX),
    y: Math.round(ny * imgH * scale + offY)
  };
}

// Sample average luminance from a patch around (nx, ny) on the original image
function mpSampleLum(ctx, imgW, imgH, nx, ny, radius) {
  var px = Math.round(nx * imgW);
  var py = Math.round(ny * imgH);
  var r  = radius || 10;
  var x0 = Math.max(0, px - r),  y0 = Math.max(0, py - r);
  var x1 = Math.min(imgW, px + r), y1 = Math.min(imgH, py + r);
  if (x1 <= x0 || y1 <= y0) return 128;

  var data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
  var total = 0;
  for (var i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / (data.length / 4);
}

// Tag pointer is at the RIGHT end of the swatch:
//   label (~35px) + gap (5px) + swatch (80px) = ~120px from tag's left edge
//   Tag height = 36px, so vertical centre = 18px from top
var MP_PTR_X = 120;
var MP_PTR_Y = 18;

// ──────────────────────────────────────────────────────────────────
// Main API
// Analyse a photo and return tag positions + shade values.
//   dataUrl     — base64 image data URL (stays on device)
//   containerEl — the photo preview DOM element (for sizing)
// Returns { hair, skin, eyes } each with { x, y, val }
//         or null if no face detected / on error
// ──────────────────────────────────────────────────────────────────
function mpAnalyzeContrast(dataUrl, containerEl) {
  return mpEnsureLoaded().then(function(landmarker) {
    return new Promise(function(resolve, reject) {
      var img = new Image();
      img.onload  = function() { resolve(img); };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }).then(function(img) {
    var landmarker = _mpFaceLandmarker;

    var canvas  = document.createElement('canvas');
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    var result = landmarker.detect(img);
    if (!result.faceLandmarks || !result.faceLandmarks.length) return null;

    var lm   = result.faceLandmarks[0];
    var imgW = img.naturalWidth;
    var imgH = img.naturalHeight;
    var ctnW = containerEl.offsetWidth;
    var ctnH = containerEl.offsetHeight;

    // Key landmarks
    var forehead   = lm[10];   // top of forehead
    var chin       = lm[152];  // chin
    var leftCheek  = lm[234];  // left cheek (subject's right = screen left)
    var leftIris   = lm[468];  // left iris centre
    var rightIris  = lm[473];  // right iris centre

    var faceH = chin.y - forehead.y;

    // Sample regions
    var hairNorm = { x: forehead.x, y: Math.max(0.01, forehead.y - faceH * 0.4) };
    var skinNorm = { x: leftCheek.x, y: leftCheek.y };
    var eyesNorm = { x: (leftIris.x + rightIris.x) / 2, y: (leftIris.y + rightIris.y) / 2 };

    var hairLum = mpSampleLum(ctx, imgW, imgH, hairNorm.x, hairNorm.y, 14);
    var skinLum = mpSampleLum(ctx, imgW, imgH, skinNorm.x, skinNorm.y, 14);
    var eyesLum = mpSampleLum(ctx, imgW, imgH, eyesNorm.x, eyesNorm.y, 6);

    // Convert to container pixel coords then offset for tag pointer
    function tagPos(norm) {
      var pt = mpNormToContainer(norm.x, norm.y, imgW, imgH, ctnW, ctnH);
      return {
        x: Math.max(0, pt.x - MP_PTR_X),
        y: Math.max(0, pt.y - MP_PTR_Y)
      };
    }

    var hp = tagPos(hairNorm);
    var sp = tagPos(skinNorm);
    var ep = tagPos(eyesNorm);

    return {
      hair: { x: hp.x, y: hp.y, val: mpLumToShade(hairLum) },
      skin: { x: sp.x, y: sp.y, val: mpLumToShade(skinLum) },
      eyes: { x: ep.x, y: ep.y, val: mpLumToShade(eyesLum) }
    };
  }).catch(function(e) {
    console.warn('[MediaPipe] Analysis failed:', e);
    return null;
  });
}

// Loading overlay shown on the container while analysis runs
function mpShowLoading(containerEl) {
  if (!containerEl || containerEl.querySelector('#mp-loading')) return;
  var d = document.createElement('div');
  d.id = 'mp-loading';
  d.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.28);z-index:20;border-radius:8px;pointer-events:none';
  d.innerHTML = '<div style="background:white;border-radius:8px;padding:10px 18px;font-size:12px;font-weight:600;color:#333;box-shadow:0 2px 12px rgba(0,0,0,0.15)">Detecting features…</div>';
  containerEl.appendChild(d);
}

function mpHideLoading(containerEl) {
  var el = containerEl ? containerEl.querySelector('#mp-loading') : null;
  if (el) el.remove();
}

// Pre-warm: start loading MediaPipe in the background so the first
// auto-detect is faster. Call when the OCA page is opened.
function mpPreWarm() {
  mpEnsureLoaded().catch(function() {});
}
