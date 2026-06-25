// ══════════════════════════════════════════════════════════════════
// AUTO-CONTRAST FACE ANALYSIS  (face-api.js — no SharedArrayBuffer)
// ──────────────────────────────────────────────────────────────────
// Works in all browsers including Safari. No special server headers.
// Privacy: client photos NEVER leave the device.
//   - Model weights load from jsDelivr CDN (~270KB, not image data)
//   - All face detection runs locally in the browser via TensorFlow.js
// ══════════════════════════════════════════════════════════════════

var _faModule     = null;
var _faInitPromise = null;

var FA_LIB    = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.esm.js';
var FA_MODELS = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/';

// Luminance thresholds matching GREY_VALS (#111 → #E8E8E8, shades 1–10)
var MP_GREY_LUMS = [17, 34, 56, 80, 104, 132, 158, 184, 208, 232];

function mpLumToShade(lum) {
  var best = 0, minD = Infinity;
  for (var i = 0; i < MP_GREY_LUMS.length; i++) {
    var d = Math.abs(lum - MP_GREY_LUMS[i]);
    if (d < minD) { minD = d; best = i; }
  }
  return best + 1;
}

// Lazy-load face-api.js + models (only on first use)
function mpEnsureLoaded() {
  if (_faModule) return Promise.resolve(_faModule);
  if (_faInitPromise) return _faInitPromise;

  _faInitPromise = import(FA_LIB).then(function(mod) {
    var fa = mod.default || mod;
    return Promise.all([
      fa.nets.tinyFaceDetector.loadFromUri(FA_MODELS),
      fa.nets.faceLandmark68TinyNet.loadFromUri(FA_MODELS)
    ]).then(function() {
      _faModule = fa;
      return fa;
    });
  }).catch(function(e) {
    _faInitPromise = null;
    console.warn('[AutoContrast] Failed to load face detection:', e);
    throw e;
  });

  return _faInitPromise;
}

// Convert image-pixel coords → container pixel coords
// Accounts for object-fit:cover; object-position:center top
function mpNormToContainer(nx, ny, imgW, imgH, ctnW, ctnH) {
  var imgAspect = imgW / imgH;
  var ctnAspect = ctnW / ctnH;
  var scale, offX, offY;
  if (imgAspect > ctnAspect) {
    scale = ctnH / imgH;
    offX  = (ctnW - imgW * scale) / 2;
    offY  = 0;
  } else {
    scale = ctnW / imgW;
    offX  = 0;
    offY  = 0;
  }
  return {
    x: Math.round(nx * imgW * scale + offX),
    y: Math.round(ny * imgH * scale + offY)
  };
}

// Sample average luminance from a patch around (imgPx, imgPy) on the canvas
function mpSampleLum(ctx, imgW, imgH, imgPx, imgPy, radius) {
  var r  = radius || 10;
  var x0 = Math.max(0, imgPx - r), y0 = Math.max(0, imgPy - r);
  var x1 = Math.min(imgW, imgPx + r), y1 = Math.min(imgH, imgPy + r);
  if (x1 <= x0 || y1 <= y0) return 128;
  var data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
  var total = 0;
  for (var i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / (data.length / 4);
}

// Tag pointer sits at the right edge of the swatch:
//   label (~35px) + gap (5px) + swatch (80px) = ~120px
//   Tag height = 36px → vertical centre at 18px
var MP_PTR_X = 120;
var MP_PTR_Y = 18;

// ──────────────────────────────────────────────────────────────────
// Main API — analyse a photo, return tag positions + shade values.
//   dataUrl     — base64 data URL (stays on device)
//   containerEl — the photo preview DOM element (for sizing)
// Returns { hair, skin, eyes } each { x, y, val } or null
// ──────────────────────────────────────────────────────────────────
function mpAnalyzeContrast(dataUrl, containerEl) {
  return mpEnsureLoaded().then(function(fa) {
    return new Promise(function(resolve, reject) {
      var img = new Image();
      img.onload  = function() { resolve(img); };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }).then(function(img) {
    var fa = _faModule;

    // Draw to canvas for pixel sampling
    var canvas  = document.createElement('canvas');
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    var imgW = img.naturalWidth;
    var imgH = img.naturalHeight;

    return fa.detectSingleFace(img, new fa.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
      .withFaceLandmarks(true)
      .then(function(result) {
        if (!result) { console.warn('[AutoContrast] No face detected'); return null; }

        var pts  = result.landmarks.positions; // {x,y} in image pixels
        var ctnW = containerEl.offsetWidth;
        var ctnH = containerEl.offsetHeight;

        // ── Landmark reference (68-pt model) ──
        // 0-16: jaw    17-21: L brow    22-26: R brow
        // 27-35: nose  36-41: L eye     42-47: R eye
        var box   = result.detection.box;
        var faceW = box.width;
        var faceH = box.height;
        var r     = Math.max(6, Math.round(faceW * 0.055)); // sample radius scales with face

        var browTopY = Math.min.apply(null, [17,18,19,20,21,22,23,24,25,26].map(function(i){ return pts[i].y; }));
        var browCtrX = (pts[19].x + pts[24].x) / 2;
        var lmFaceH  = pts[8].y - browTopY;

        // ── HAIR ────────────────────────────────────────────────────
        // Scan 8 candidate positions across the temporal + crown region.
        // Average the DARKEST THIRD — avoids bright highlights & light backgrounds.
        var hairCands = [
          [pts[17].x - faceW * 0.10, browTopY - lmFaceH * 0.04],   // L temple, brow level
          [pts[17].x - faceW * 0.07, browTopY - lmFaceH * 0.18],   // L temple, slightly up
          [pts[26].x + faceW * 0.10, browTopY - lmFaceH * 0.04],   // R temple, brow level
          [pts[26].x + faceW * 0.07, browTopY - lmFaceH * 0.18],   // R temple, slightly up
          [browCtrX - faceW * 0.18,  browTopY - lmFaceH * 0.28],   // upper-left
          [browCtrX + faceW * 0.18,  browTopY - lmFaceH * 0.28],   // upper-right
          [browCtrX,                  browTopY - lmFaceH * 0.32],   // crown centre
          [browCtrX,                  browTopY - lmFaceH * 0.50],   // crown high
        ].map(function(c) {
          var cx = Math.round(Math.max(0, Math.min(imgW - 1, c[0])));
          var cy = Math.round(Math.max(0, Math.min(imgH - 1, c[1])));
          return { x: cx, y: cy, lum: mpSampleLum(ctx, imgW, imgH, cx, cy, r) };
        }).sort(function(a, b) { return a.lum - b.lum; });

        // 25th-percentile — skips the 2 darkest outliers (shadows/clothing)
        // without rising all the way to mid-grey
        var p25 = Math.round(hairCands.length * 0.25);
        var hairLum = hairCands[p25].lum;
        var hairPx  = hairCands[p25].x;
        var hairPy  = hairCands[p25].y;

        // ── SKIN ─────────────────────────────────────────────────────
        // Three samples: both cheeks + nose bridge (evenly lit, avoids shadows).
        // Average all three so shadow-side cheek doesn't drag the reading down.
        var skinLPx = Math.round(pts[3].x  * 0.5 + pts[41].x * 0.5);
        var skinLPy = Math.round(pts[3].y  * 0.6 + pts[41].y * 0.4);
        var skinRPx = Math.round(pts[13].x * 0.5 + pts[45].x * 0.5);
        var skinRPy = Math.round(pts[13].y * 0.6 + pts[45].y * 0.4);
        var skinNPx = Math.round(pts[27].x); // nose bridge top (landmark 27)
        var skinNPy = Math.round((pts[27].y + pts[28].y) / 2);
        var skinLum = (mpSampleLum(ctx, imgW, imgH, skinLPx, skinLPy, r) +
                       mpSampleLum(ctx, imgW, imgH, skinRPx, skinRPy, r) +
                       mpSampleLum(ctx, imgW, imgH, skinNPx, skinNPy, r)) / 3;
        var skinPx  = Math.round((skinLPx + skinRPx) / 2);
        var skinPy  = Math.round((skinLPy + skinRPy) / 2);

        // ── EYES ─────────────────────────────────────────────────────
        // Centroid of each eye's landmarks. Tiny radius to focus on the iris.
        // Take the MINIMUM of centre + 4 nearby points (darkest = iris, not sclera).
        var irisR = Math.max(2, Math.round(faceW * 0.018));
        function scanEye(a, b) {
          var ex = pts.slice(a, b).reduce(function(s, p) { return s + p.x; }, 0) / (b - a);
          var ey = pts.slice(a, b).reduce(function(s, p) { return s + p.y; }, 0) / (b - a);
          var offsets = [[0,0],[irisR,0],[-irisR,0],[0,irisR],[0,-irisR]];
          var lums = offsets.map(function(o) {
            return mpSampleLum(ctx, imgW, imgH, Math.round(ex + o[0]), Math.round(ey + o[1]), irisR);
          });
          lums.sort(function(a, b) { return a - b; });
          return { x: ex, y: ey, lum: lums[1] }; // 2nd-darkest skips pupil black
        }
        var lEye   = scanEye(36, 42);
        var rEye   = scanEye(42, 48);
        var eyesLum = Math.min(lEye.lum, rEye.lum);
        var eyesPx  = Math.round(lEye.lum <= rEye.lum ? lEye.x : rEye.x);
        var eyesPy  = Math.round(lEye.lum <= rEye.lum ? lEye.y : rEye.y);

        console.log('[AutoContrast] lums — hair:', Math.round(hairLum), 'skin:', Math.round(skinLum), 'eyes:', Math.round(eyesLum));

        // Convert image-pixel positions → container positions → tag left/top
        function tagPos(ipx, ipy) {
          var ct = mpNormToContainer(ipx / imgW, ipy / imgH, imgW, imgH, ctnW, ctnH);
          return {
            x: Math.max(0, ct.x - MP_PTR_X),
            y: Math.max(0, ct.y - MP_PTR_Y)
          };
        }

        var hp = tagPos(hairPx, hairPy);
        var sp = tagPos(skinPx, skinPy);
        var ep = tagPos(eyesPx, eyesPy);

        return {
          hair: { x: hp.x, y: hp.y, val: mpLumToShade(hairLum) },
          skin: { x: sp.x, y: sp.y, val: mpLumToShade(skinLum) },
          eyes: { x: ep.x, y: ep.y, val: mpLumToShade(eyesLum) }
        };
      });
  }).catch(function(e) {
    console.warn('[AutoContrast] Analysis failed:', e);
    return null;
  });
}

// Loading overlay shown on the preview container
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

// Pre-warm: kick off model loading in the background
function mpPreWarm() {
  mpEnsureLoaded().catch(function() {});
}
