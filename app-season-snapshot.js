// ══ SEASON SNAPSHOT ══
// Side-by-side 4×4 grid of client face on each season colour

var ocaSnapshotA = 'Light Summer';
var ocaSnapshotB = 'Soft Autumn';
var ocaSnapshotPhoto = null; // overrides ocaPhoto if set

function ocaSnapshotSetSeason(slot, val) {
  if (slot === 'A') ocaSnapshotA = val;
  else              ocaSnapshotB = val;
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

  // ── Season selectors ──
  function mkSelect(slot, current) {
    var opts = seasonKeys.map(function(k) {
      return '<option value="' + k + '"' + (k === current ? ' selected' : '') + '>' + k + '</option>';
    }).join('');
    return '<div>'
      + '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Season ' + slot + '</div>'
      + '<select onchange="ocaSnapshotSetSeason(\'' + slot + '\',this.value)" style="width:100%;padding:10px 12px;border:1px solid var(--sand);border-radius:10px;font-size:13px;font-weight:600;background:white;color:var(--deep)">'
      + opts + '</select></div>';
  }

  var controls = '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end;margin-bottom:24px">'
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

  // ── Tip banner ──
  var tip = !photo
    ? '<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:10px;padding:12px 16px;font-size:12px;color:#92400E;margin-bottom:20px">'
      + '&#128247; Upload a client headshot to see their face on each season colour. For the cleanest result, use a photo with a plain or removed background.'
      + '</div>'
    : '';

  if (!photo) {
    return controls + tip + snapshotEmptyGrids(ocaSnapshotA, ocaSnapshotB);
  }

  return controls
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px">'
    + snapshotSeasonGrid(ocaSnapshotA, photo)
    + snapshotSeasonGrid(ocaSnapshotB, photo)
    + '</div>';
}

function snapshotSeasonGrid(seasonName, photo) {
  var season = OCA_SEASONS[seasonName];
  if (!season) return '<div style="color:red;padding:20px">Season not found: ' + seasonName + '</div>';

  var swatches = (season.swatches || []).concat(season.neutrals || []).slice(0, 16);

  var cells = swatches.map(function(sw) {
    return '<div style="position:relative;border-radius:8px;overflow:hidden;background:' + sw.hex + ';aspect-ratio:1">'
      + '<img src="' + photo + '" style="width:100%;height:100%;object-fit:cover;display:block">'
      + '<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.45));padding:4px 5px 3px;text-align:center">'
      +   '<span style="font-size:8px;font-weight:600;color:rgba(255,255,255,.92);letter-spacing:.3px;line-height:1">' + sw.name + '</span>'
      + '</div>'
      + '</div>';
  }).join('');

  return '<div>'
    + '<div style="font-size:15px;font-weight:700;color:var(--deep);margin-bottom:12px;letter-spacing:.3px">' + seasonName + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">' + cells + '</div>'
    + '</div>';
}

function snapshotEmptyGrids(nameA, nameB) {
  function emptyGrid(seasonName) {
    var season = OCA_SEASONS[seasonName];
    if (!season) return '';
    var swatches = (season.swatches || []).concat(season.neutrals || []).slice(0, 16);
    var cells = swatches.map(function(sw) {
      return '<div style="border-radius:8px;background:' + sw.hex + ';aspect-ratio:1;position:relative">'
        + '<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.4));padding:4px 5px 3px;text-align:center">'
        +   '<span style="font-size:8px;font-weight:600;color:rgba(255,255,255,.9);letter-spacing:.3px">' + sw.name + '</span>'
        + '</div>'
        + '</div>';
    }).join('');
    return '<div>'
      + '<div style="font-size:15px;font-weight:700;color:var(--deep);margin-bottom:12px;letter-spacing:.3px">' + seasonName + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">' + cells + '</div>'
      + '</div>';
  }

  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px">'
    + emptyGrid(nameA)
    + emptyGrid(nameB)
    + '</div>';
}
