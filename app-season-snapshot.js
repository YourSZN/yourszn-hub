// ══ SEASON SNAPSHOT ══
// Single season view, 4×3 grid, navigate with arrows

var ocaSnapshotCurrent = 'Light Summer';
var ocaSnapshotPhoto   = null; // overrides ocaPhoto if set

function ocaSnapshotNav(dir) {
  var keys = Object.keys(OCA_SEASONS);
  var idx  = keys.indexOf(ocaSnapshotCurrent);
  idx = (idx + dir + keys.length) % keys.length;
  ocaSnapshotCurrent = keys[idx];
  renderOca();
}

function renderOcaSnapshot() {
  var photo    = ocaSnapshotPhoto || (typeof ocaPhoto !== 'undefined' ? ocaPhoto : null);
  var keys     = Object.keys(OCA_SEASONS);
  var idx      = keys.indexOf(ocaSnapshotCurrent);
  var total    = keys.length;

  // Arrow navigation header
  var nav = '<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:24px">'
    + '<button onclick="ocaSnapshotNav(-1)" style="width:40px;height:40px;border-radius:50%;border:1px solid var(--sand);background:white;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:var(--deep);flex-shrink:0">&#8592;</button>'
    + '<div style="text-align:center">'
    +   '<div style="font-size:18px;font-weight:700;color:var(--deep)">' + ocaSnapshotCurrent + '</div>'
    +   '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + (idx + 1) + ' of ' + total + '</div>'
    + '</div>'
    + '<button onclick="ocaSnapshotNav(1)" style="width:40px;height:40px;border-radius:50%;border:1px solid var(--sand);background:white;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:var(--deep);flex-shrink:0">&#8594;</button>'
    + '</div>';

  if (!photo) {
    return nav + snapshotEmptyGrid(ocaSnapshotCurrent);
  }

  return nav + snapshotSeasonGrid(ocaSnapshotCurrent, photo);
}

function snapshotSeasonGrid(seasonName, photo) {
  var season = OCA_SEASONS[seasonName];
  if (!season) return '<div style="color:red;padding:20px">Season not found: ' + seasonName + '</div>';

  var swatches = (season.swatches || []).concat(season.neutrals || []).slice(0, 12);

  var cells = swatches.map(function(sw) {
    return '<div style="position:relative;border-radius:10px;overflow:hidden;background:' + sw.hex + ';aspect-ratio:3/4">'
      + '<img src="' + photo + '" style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);height:80%;width:auto;object-position:center top">'
      + '<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.5));padding:6px 6px 5px;text-align:center">'
      +   '<span style="font-size:9px;font-weight:600;color:rgba(255,255,255,.95);letter-spacing:.3px;line-height:1">' + sw.name + '</span>'
      + '</div>'
      + '</div>';
  }).join('');

  return '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">' + cells + '</div>';
}

function snapshotEmptyGrid(seasonName) {
  var season = OCA_SEASONS[seasonName];
  if (!season) return '';
  var swatches = (season.swatches || []).concat(season.neutrals || []).slice(0, 12);
  var cells = swatches.map(function(sw) {
    return '<div style="border-radius:10px;background:' + sw.hex + ';aspect-ratio:3/4;position:relative">'
      + '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">'
      +   '<span style="font-size:20px;opacity:.4">&#128247;</span>'
      + '</div>'
      + '<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.45));padding:6px 6px 5px;text-align:center">'
      +   '<span style="font-size:9px;font-weight:600;color:rgba(255,255,255,.9);letter-spacing:.3px">' + sw.name + '</span>'
      + '</div>'
      + '</div>';
  }).join('');
  return '<div>'
    + '<div style="text-align:center;padding:16px 0 20px;font-size:12px;color:var(--muted)">Upload a client photo above to see their face on each colour</div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">' + cells + '</div>'
    + '</div>';
}
