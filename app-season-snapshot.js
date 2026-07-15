// ══ SEASON SNAPSHOT ══
// One season at a time, 4×3 grid of client face on each season colour

var ocaSnapshotA      = 'Light Summer';
var ocaSnapshotB      = 'Soft Autumn';
var ocaSnapshotActive = 'A';          // which season is on display
var ocaSnapshotPhoto  = null;         // overrides ocaPhoto if set

function ocaSnapshotSetSeason(slot, val) {
  if (slot === 'A') ocaSnapshotA = val;
  else              ocaSnapshotB = val;
  ocaSnapshotActive = slot;
  renderOca();
}

function ocaSnapshotSetActive(slot) {
  ocaSnapshotActive = slot;
  renderOca();
}

function ocaSnapshotLoadPhoto(input) {
  var file = input.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) { ocaSnapshotPhoto = e.target.result; renderOca(); };
  reader.readAsDataURL(file);
}

function ocaSnapshotClearPhoto() {
  ocaSnapshotPhoto = null;
  renderOca();
}

function renderOcaSnapshot() {
  var photo = ocaSnapshotPhoto || (typeof ocaPhoto !== 'undefined' ? ocaPhoto : null);
  var seasonKeys = Object.keys(OCA_SEASONS);

  function mkSelect(slot, current) {
    var opts = seasonKeys.map(function(k) {
      return '<option value="' + k + '"' + (k === current ? ' selected' : '') + '>' + k + '</option>';
    }).join('');
    var isActive = ocaSnapshotActive === slot;
    return '<div>'
      + '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Season ' + slot + '</div>'
      + '<div style="display:flex;gap:8px;align-items:center">'
      + '<select onchange="ocaSnapshotSetSeason(\'' + slot + '\',this.value)" style="flex:1;padding:10px 12px;border:1px solid var(--sand);border-radius:10px;font-size:13px;font-weight:600;background:white;color:var(--deep)">'
      + opts + '</select>'
      + '<button onclick="ocaSnapshotSetActive(\'' + slot + '\')" style="padding:9px 14px;border-radius:10px;border:none;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;white-space:nowrap;background:' + (isActive ? 'var(--deep)' : 'var(--warm)') + ';color:' + (isActive ? 'white' : 'var(--deep)') + '">View</button>'
      + '</div>'
      + '</div>';
  }

  var controls = '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end;margin-bottom:20px">'
    + mkSelect('A', ocaSnapshotA)
    + mkSelect('B', ocaSnapshotB)
    + '<div>'
    +   '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Client photo</div>'
    +   '<label style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;background:white;border:1px solid var(--sand);border-radius:10px;cursor:pointer;font-size:12px;font-weight:600;color:var(--deep);white-space:nowrap">'
    +     '&#128247; ' + (photo ? 'Change photo' : 'Upload photo')
    +     '<input type="file" accept="image/*" onchange="ocaSnapshotLoadPhoto(this)" style="display:none">'
    +   '</label>'
    +   (photo ? ' <button onclick="ocaSnapshotClearPhoto()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;vertical-align:middle;padding:0 4px" title="Remove photo">✕</button>' : '')
    + '</div>'
    + '</div>';

  var activeSeason = ocaSnapshotActive === 'A' ? ocaSnapshotA : ocaSnapshotB;

  if (!photo) {
    return controls + snapshotEmptyGrid(activeSeason);
  }

  return controls + snapshotSeasonGrid(activeSeason, photo);
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

  return '<div>'
    + '<div style="font-size:15px;font-weight:700;color:var(--deep);margin-bottom:14px;letter-spacing:.3px">' + seasonName + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">' + cells + '</div>'
    + '</div>';
}

function snapshotEmptyGrid(seasonName) {
  var season = OCA_SEASONS[seasonName];
  if (!season) return '';
  var swatches = (season.swatches || []).concat(season.neutrals || []).slice(0, 12);
  var cells = swatches.map(function(sw) {
    return '<div style="border-radius:10px;background:' + sw.hex + ';aspect-ratio:3/4;position:relative">'
      + '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">'
      +   '<span style="font-size:20px;opacity:.5">&#128247;</span>'
      + '</div>'
      + '<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.45));padding:6px 6px 5px;text-align:center">'
      +   '<span style="font-size:9px;font-weight:600;color:rgba(255,255,255,.9);letter-spacing:.3px">' + sw.name + '</span>'
      + '</div>'
      + '</div>';
  }).join('');
  return '<div>'
    + '<div style="font-size:15px;font-weight:700;color:var(--deep);margin-bottom:14px;letter-spacing:.3px">' + seasonName + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">' + cells + '</div>'
    + '</div>';
}
