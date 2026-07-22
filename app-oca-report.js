// ══ OCA REPORT BUILDER ══

// ── Season defaults — auto-fill when primary season selected ──
var OCA_SEASON_DEFAULTS = {
  'Soft Autumn':   { skinTemp:'neutral', skinDepth:'medium', contrast:'low',         temperature:'warm', blush:'warm', clarity:'muted', sisterA:'True Autumn',   sisterB:'Soft Summer'   },
  'True Autumn':   { skinTemp:'warm',    skinDepth:'medium', contrast:'medium',      temperature:'warm', blush:'warm', clarity:'muted', sisterA:'Dark Autumn',   sisterB:'True Spring'   },
  'Dark Autumn':   { skinTemp:'warm',    skinDepth:'deep',   contrast:'high',        temperature:'warm', blush:'warm', clarity:'muted', sisterA:'True Autumn',   sisterB:'Dark Winter'   },
  'Light Spring':  { skinTemp:'warm',    skinDepth:'light',  contrast:'low',         temperature:'warm', blush:'warm', clarity:'clear', sisterA:'True Spring',   sisterB:'Light Summer'  },
  'True Spring':   { skinTemp:'warm',    skinDepth:'medium', contrast:'medium',      temperature:'warm', blush:'warm', clarity:'clear', sisterA:'Light Spring',  sisterB:'True Autumn'   },
  'Bright Spring': { skinTemp:'warm',    skinDepth:'medium', contrast:'medium-high', temperature:'warm', blush:'warm', clarity:'clear', sisterA:'True Spring',   sisterB:'Bright Winter' },
  'Light Summer':  { skinTemp:'cool',    skinDepth:'light',  contrast:'low-medium',  temperature:'cool', blush:'cool', clarity:'muted', sisterA:'True Summer',   sisterB:'Light Spring'  },
  'True Summer':   { skinTemp:'cool',    skinDepth:'medium', contrast:'medium',      temperature:'cool', blush:'cool', clarity:'muted', sisterA:'Soft Summer',   sisterB:'True Winter'   },
  'Soft Summer':   { skinTemp:'neutral', skinDepth:'medium', contrast:'low',         temperature:'cool', blush:'cool', clarity:'muted', sisterA:'True Summer',   sisterB:'Soft Autumn'   },
  'True Winter':   { skinTemp:'cool',    skinDepth:'medium', contrast:'high',        temperature:'cool', blush:'cool', clarity:'clear', sisterA:'Dark Winter',   sisterB:'True Summer'   },
  'Dark Winter':   { skinTemp:'cool',    skinDepth:'deep',   contrast:'high',        temperature:'cool', blush:'cool', clarity:'clear', sisterA:'True Winter',   sisterB:'Dark Autumn'   },
  'Bright Winter': { skinTemp:'cool',    skinDepth:'medium', contrast:'high',        temperature:'cool', blush:'cool', clarity:'clear', sisterA:'True Winter',   sisterB:'Bright Spring' },
};

// ── Pre-written note templates — editable by analyst ──
var _NOTE_SKIN_TEMP = {
  cool:    'Your skin carries a cool, blue or pink undertone — visible in the veins at your wrist (blue/purple) and in the overall clarity of your complexion. Cool-toned fabrics and makeup will harmonise beautifully with your natural colouring.',
  neutral: 'Your skin sits in the neutral zone, carrying a mix of cool and warm undertones. This gives you some flexibility, but you have a slight lean that informs your season placement.',
  warm:    'Your skin carries a warm, golden or peachy undertone — visible in the veins at your wrist (green) and in the warmth of your complexion. Warm-toned fabrics and makeup will complement your natural radiance.',
};
var _NOTE_CONTRAST = {
  'low':         'Your colouring shows low contrast — the difference between your hair, skin, and eyes is very soft and subtle. Heavy, high-contrast patterns can overpower your gentle features.',
  'low-medium':  'Your colouring shows low to medium contrast — the tones in your hair, skin, and eyes are close in value, creating a soft and harmonious appearance. Avoid stark contrasts in your outfits.',
  'medium':      'Your colouring shows medium contrast — a balanced difference between your lightest and darkest tones. You suit both subtle and more defined looks.',
  'medium-high': 'Your colouring shows medium to high contrast, with a noticeable difference between your hair, skin, and eyes. Bolder patterns and defined contrasts suit you well.',
  'high':        'Your colouring shows high contrast — a striking difference between your lightest and darkest tones. Bold contrasts come naturally to you and enhance your features.',
};
var _NOTE_TEMP = {
  cool: 'Cool tones brighten and clarify your complexion, making you look refreshed and radiant. Warm tones can add a yellowish or orange cast that clashes with your natural colouring.',
  warm: 'Warm tones complement and enhance your golden or peachy complexion beautifully. Cool tones can make your skin look ashy or washed out.',
};
var _NOTE_BLUSH = {
  cool: 'A cool rose-pink blush harmonises with your undertone and looks naturally flushed. A warm coral blush can create an unnatural warmth against your cool skin.',
  warm: 'A warm coral blush echoes your natural warmth and blends seamlessly. A cool pink blush can look unnatural or clash against your warm complexion.',
};
var _NOTE_CLARITY = {
  clear: 'Clear, bright, and saturated colours are your strength — they match the natural vibrancy in your colouring. Overly soft or muted tones can make you look washed out.',
  muted: 'Soft, dusty, and muted colours are your best match — they harmonise with your gentle colouring. Overly bright or saturated colours can look harsh and overwhelming on you.',
};

function ocaSeasonNoteDefaults(seasonName) {
  var d = OCA_SEASON_DEFAULTS[seasonName];
  if (!d) return {};
  var contrastDisplay = { 'low':'Low', 'low-medium':'Low to Medium', 'medium':'Medium', 'medium-high':'Medium to High', 'high':'High' };
  return {
    notesSkin:     (_NOTE_SKIN_TEMP[d.skinTemp] || '') + ' Depth: ' + d.skinDepth + '.',
    notesContrast: _NOTE_CONTRAST[d.contrast] || '',
    notesTemp:     _NOTE_TEMP[d.temperature] || '',
    notesBlush:    _NOTE_BLUSH[d.blush] || '',
    notesClarity:  _NOTE_CLARITY[d.clarity] || '',
    notesSeason:   seasonName + ' — ' + (OCA_SEASONS[seasonName] ? OCA_SEASONS[seasonName].desc : '') + '\nSister seasons: ' + d.sisterA + ' and ' + d.sisterB + '.',
  };
}

function ocaReportApplySeason(seasonName) {
  var d = OCA_SEASON_DEFAULTS[seasonName];
  if (!d) return;
  // Fill analysis fields
  ocaReport.skinTemp    = d.skinTemp;
  ocaReport.skinDepth   = d.skinDepth;
  ocaReport.contrast    = d.contrast;
  ocaReport.temperature = d.temperature;
  ocaReport.blush       = d.blush;
  ocaReport.clarity     = d.clarity;
  // Fill sisters only if not already set
  if (!ocaReport.sisterA) ocaReport.sisterA = d.sisterA;
  if (!ocaReport.sisterB) ocaReport.sisterB = d.sisterB;
  // Fill notes (always refresh from template — analyst will edit)
  var n = ocaSeasonNoteDefaults(seasonName);
  ocaReport.notesSkin     = n.notesSkin;
  ocaReport.notesContrast = n.notesContrast;
  ocaReport.notesTemp     = n.notesTemp;
  ocaReport.notesBlush    = n.notesBlush;
  ocaReport.notesClarity  = n.notesClarity;
  ocaReport.notesSeason   = n.notesSeason;
  renderOca();
}

// ── Report state ──
var ocaReport = {
  clientName: '',
  date: new Date().toISOString().split('T')[0],
  colourHair:  '#5C3A1E',
  colourEyes:  '#7FA8D0',
  colourSkin1: '#F4D5B8',
  colourSkin2: '#E5B898',
  colourLips:  '#C47880',
  notesFeatures: '',
  skinTemp:    'cool',
  skinDepth:   'medium',
  notesSkin:   '',
  contrast:      'low-medium',
  contrastScore: '',
  notesContrast: '',
  temperature:  'cool',
  notesTemp:    '',
  blush:        'cool',
  notesBlush:   '',
  clarity:      'muted',
  notesClarity: '',
  primarySeason: '',
  sisterA:       '',
  sisterB:       '',
  notesSeason:   '',
  notes: '',
};

// ── UI helpers ──
function _rRadio(field, options) {
  return '<div style="display:flex;gap:7px;flex-wrap:wrap">'
    + options.map(function(o) {
        var on = ocaReport[field] === o.val;
        return '<label style="display:flex;align-items:center;gap:6px;padding:7px 13px;border:1.5px solid '
          + (on ? 'var(--deep)' : 'var(--sand)') + ';border-radius:8px;cursor:pointer;font-size:12px;font-weight:'
          + (on ? '700' : '400') + ';background:' + (on ? 'var(--deep)' : 'white') + ';color:' + (on ? 'white' : 'var(--deep)') + ';white-space:nowrap;transition:all .15s">'
          + '<input type="radio" name="' + field + '" value="' + o.val + '"' + (on ? ' checked' : '')
          + ' onchange="ocaReport.' + field + '=this.value;renderOca()" style="display:none">'
          + (o.dot ? '<span style="width:10px;height:10px;border-radius:50%;background:' + o.dot + ';display:inline-block;flex-shrink:0"></span>' : '')
          + o.label + '</label>';
      }).join('')
    + '</div>';
}

function _rNotes(field, placeholder) {
  return '<textarea oninput="ocaReport.' + field + '=this.value" placeholder="' + placeholder + '" rows="2" '
    + 'style="width:100%;margin-top:10px;padding:10px 12px;border:1px solid var(--sand);border-radius:8px;font-size:12px;font-family:inherit;color:var(--deep);resize:none;outline:none;line-height:1.6;background:#FEFCFA">'
    + (ocaReport[field] || '') + '</textarea>';
}

function _rSeasonSelect(field, label, onChange) {
  var keys = Object.keys(OCA_SEASONS);
  var opts = '<option value="">— ' + label + ' —</option>'
    + keys.map(function(k) {
        return '<option value="' + k + '"' + (k === ocaReport[field] ? ' selected' : '') + '>' + k + '</option>';
      }).join('');
  var handler = onChange || ('ocaReport.' + field + '=this.value;renderOca()');
  return '<select onchange="' + handler + '" '
    + 'style="padding:9px 12px;border:1px solid var(--sand);border-radius:9px;font-size:13px;font-weight:600;background:white;color:var(--deep);width:100%">'
    + opts + '</select>';
}

function _rSection(num, title, body) {
  return '<div style="display:grid;grid-template-columns:32px 1fr;border-bottom:1px solid var(--sand)">'
    + '<div style="padding:16px 0;display:flex;flex-direction:column;align-items:center">'
    +   '<div style="width:22px;height:22px;border-radius:50%;background:var(--deep);color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + num + '</div>'
    +   '<div style="width:1px;flex:1;background:var(--sand);margin-top:7px"></div>'
    + '</div>'
    + '<div style="padding:14px 0 18px 14px">'
    +   '<div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">' + title + '</div>'
    +   body
    + '</div>'
    + '</div>';
}

// ── Main render ──
function renderOcaReport() {
  var r = ocaReport;
  var photo = (typeof ocaPhoto !== 'undefined' && ocaPhoto) ? ocaPhoto : null;

  var html = '<div style="display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start">';

  // ══ LEFT: Session Sheet ══
  html += '<div class="card" style="padding:0;overflow:hidden">';

  // Header row — client name, date, season selector (triggers auto-fill)
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
    + _rSeasonSelect('primarySeason', 'Select…', 'ocaReport.primarySeason=this.value;ocaReportApplySeason(this.value)')
      .replace('style="padding', 'style="background:rgba(255,255,255,.15);color:white;border-color:rgba(255,255,255,.2);padding')
    + '</div>'
    + '</div></div>';

  // Steps
  html += '<div style="padding:0 20px">';

  // ── Personal Features ──
  var featureSwatches = [
    { field:'colourHair',  label:'Hair'   },
    { field:'colourEyes',  label:'Eyes'   },
    { field:'colourSkin1', label:'Skin 1' },
    { field:'colourSkin2', label:'Skin 2' },
    { field:'colourLips',  label:'Lips'   },
  ];
  html += _rSection('★', 'Personal Features',
    '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:6px">'
    + featureSwatches.map(function(f) {
        return '<div style="display:flex;flex-direction:column;align-items:center;gap:5px">'
          + '<div style="width:38px;height:38px;border-radius:50%;overflow:hidden;border:2px solid var(--sand);position:relative;cursor:pointer">'
          + '<div style="width:100%;height:100%;background:' + r[f.field] + '"></div>'
          + '<input type="color" value="' + r[f.field] + '" '
          + 'onchange="ocaReport.' + f.field + '=this.value;renderOca()" '
          + 'style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%">'
          + '</div>'
          + '<div style="font-size:9px;color:var(--muted)">' + f.label + '</div>'
          + '</div>';
      }).join('')
    + '</div>'
    + _rNotes('notesFeatures', 'Notes on hair, eyes, and skin features — what you observed...')
  );

  // ── Step 1: Skin Tone ──
  html += _rSection('1', 'Skin Tone',
    '<div style="display:flex;gap:20px;flex-wrap:wrap">'
    + '<div><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:7px">Temperature</div>'
    + _rRadio('skinTemp', [
        { val:'cool',    label:'Cool',    dot:'#8BA8C0' },
        { val:'neutral', label:'Neutral', dot:'#C4A882' },
        { val:'warm',    label:'Warm',    dot:'#C4783C' },
      ]) + '</div>'
    + '<div><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:7px">Depth</div>'
    + _rRadio('skinDepth', [
        { val:'light',  label:'Light'  },
        { val:'medium', label:'Medium' },
        { val:'deep',   label:'Deep'   },
      ]) + '</div>'
    + '</div>'
    + _rNotes('notesSkin', 'Edit the auto-filled note or write your own observation...')
  );

  // ── Step 2: Contrast ──
  html += _rSection('2', 'Contrast',
    '<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">'
    + _rRadio('contrast', [
        { val:'low',         label:'Low'      },
        { val:'low-medium',  label:'Low–Med'  },
        { val:'medium',      label:'Medium'   },
        { val:'medium-high', label:'Med–High' },
        { val:'high',        label:'High'     },
      ])
    + '<div style="display:flex;align-items:center;gap:7px;margin-top:2px">'
    + '<div style="font-size:11px;color:var(--muted);white-space:nowrap">Shade diff:</div>'
    + '<input value="' + (r.contrastScore||'') + '" oninput="ocaReport.contrastScore=this.value" placeholder="e.g. 4" '
    + 'style="width:60px;padding:7px 9px;border:1px solid var(--sand);border-radius:7px;font-size:13px;font-family:inherit;color:var(--deep);outline:none">'
    + '</div></div>'
    + _rNotes('notesContrast', 'Edit the auto-filled note or add your own contrast observation...')
  );

  // ── Step 3: Temperature ──
  html += _rSection('3', 'Cool vs Warm',
    _rRadio('temperature', [
      { val:'cool', label:'Cool looks best', dot:'#6890B4' },
      { val:'warm', label:'Warm looks best', dot:'#C47038' },
    ])
    + _rNotes('notesTemp', 'e.g. how did the cool vs warm drapes compare on this client...')
  );

  // ── Step 4: Blush ──
  html += _rSection('4', 'Blush',
    _rRadio('blush', [
      { val:'cool', label:'Cool — Pink',  dot:'#E090A8' },
      { val:'warm', label:'Warm — Coral', dot:'#E08868' },
    ])
    + _rNotes('notesBlush', 'e.g. which blush tone sat more naturally on the skin...')
  );

  // ── Step 5: Clear vs Muted ──
  html += _rSection('5', 'Clear vs Muted',
    _rRadio('clarity', [
      { val:'clear', label:'Clear / Bright', dot:'#D84848' },
      { val:'muted', label:'Muted / Soft',   dot:'#A87860' },
    ])
    + _rNotes('notesClarity', 'e.g. how shiny vs matte metals looked, or clarity of drape colours...')
  );

  // ── Season Result ──
  html += _rSection('✓', 'Season Result',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:4px">'
    + '<div><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:5px">Primary Season</div>'
    + _rSeasonSelect('primarySeason', 'Primary', 'ocaReport.primarySeason=this.value;ocaReportApplySeason(this.value)') + '</div>'
    + '<div><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:5px">Sister Season 1</div>'
    + _rSeasonSelect('sisterA', 'Sister 1') + '</div>'
    + '<div><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:5px">Sister Season 2</div>'
    + _rSeasonSelect('sisterB', 'Sister 2') + '</div>'
    + '</div>'
    + _rNotes('notesSeason', 'Summary note about this client\'s season result and what it means for them...')
  );

  html += '</div>'; // end steps padding

  // General notes + print
  html += '<div style="padding:14px 20px;border-top:1px solid var(--sand)">'
    + '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:7px">Additional Notes (optional notes page in report)</div>'
    + '<textarea oninput="ocaReport.notes=this.value" placeholder="Any extra notes for the client — shopping tips, what to wear first, priorities for their wardrobe..." rows="3" '
    + 'style="width:100%;padding:10px 12px;border:1px solid var(--sand);border-radius:8px;font-size:12px;font-family:inherit;color:var(--deep);resize:none;outline:none;line-height:1.6">'
    + (r.notes||'') + '</textarea>'
    + '</div>';

  html += '<div style="padding:12px 20px;border-top:1px solid var(--sand);display:flex;align-items:center;gap:12px">'
    + (!photo ? '<div style="font-size:11px;color:var(--muted)">&#9888; Upload a client photo for the photo pages</div>' : '')
    + '<button onclick="ocaPrintReport()" style="margin-left:auto;background:var(--deep);color:white;border:none;padding:12px 26px;font-size:13px;font-weight:600;border-radius:10px;cursor:pointer;letter-spacing:.3px">&#128438; Preview &amp; Print PDF</button>'
    + '</div>';

  html += '</div>'; // end left card

  // ══ RIGHT: At a Glance ══
  html += '<div style="position:sticky;top:20px;display:flex;flex-direction:column;gap:14px">';

  // Client photo card
  if (photo) {
    html += '<div class="card" style="padding:0;overflow:hidden">'
      + '<img src="' + photo + '" style="width:100%;height:200px;object-fit:cover;object-position:center top;display:block">'
      + '<div style="padding:10px 14px;background:var(--deep);color:white">'
      + '<div style="font-size:13px;font-weight:700">' + (r.clientName||'Client') + '</div>'
      + '<div style="font-size:11px;opacity:.65;margin-top:2px">' + (r.primarySeason||'Season TBC') + '</div>'
      + '</div></div>';
  } else {
    html += '<div class="card" style="text-align:center;padding:20px;color:var(--muted)">'
      + '<div style="font-size:28px;margin-bottom:6px">&#128247;</div>'
      + '<div style="font-size:11px">Upload a client photo above</div>'
      + '</div>';
  }

  // Results summary
  var contrastLabel = { 'low':'Low','low-medium':'Low–Medium','medium':'Medium','medium-high':'Medium–High','high':'High' };
  html += '<div class="card">'
    + '<div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:12px">At a Glance</div>'
    + '<div style="display:grid;gap:0">'
    + [
        { label:'Skin Tone',   val: (r.skinTemp ? (r.skinTemp[0].toUpperCase()+r.skinTemp.slice(1)) + ' · ' + (r.skinDepth[0].toUpperCase()+r.skinDepth.slice(1)) : '—') },
        { label:'Contrast',    val: (contrastLabel[r.contrast]||r.contrast) + (r.contrastScore ? ' ('+r.contrastScore+')' : '') },
        { label:'Temperature', val: r.temperature ? r.temperature[0].toUpperCase()+r.temperature.slice(1) : '—' },
        { label:'Blush',       val: r.blush==='cool'?'Cool — Pink':r.blush==='warm'?'Warm — Coral':'—' },
        { label:'Clarity',     val: r.clarity==='clear'?'Clear / Bright':r.clarity==='muted'?'Muted / Soft':'—' },
      ].map(function(row) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:7px 0;border-bottom:1px solid var(--sand)">'
          + '<span style="color:var(--muted)">' + row.label + '</span>'
          + '<span style="font-weight:600;color:var(--deep)">' + row.val + '</span>'
          + '</div>';
      }).join('')
    + '</div>'
    + (r.primarySeason ? '<div style="margin-top:12px;padding:10px 12px;background:var(--warm);border-radius:8px;font-size:12px;font-weight:700;color:var(--deep);text-align:center">' + r.primarySeason + '</div>' : '')
    + (r.sisterA||r.sisterB ? '<div style="margin-top:8px;font-size:10px;color:var(--muted);text-align:center">Sisters: ' + [r.sisterA,r.sisterB].filter(Boolean).join(' · ') + '</div>' : '')
    + '</div>';

  // Season swatch preview
  if (r.primarySeason && OCA_SEASONS[r.primarySeason]) {
    var sw = (OCA_SEASONS[r.primarySeason].swatches||[]).slice(0,8);
    html += '<div class="card">'
      + '<div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">' + r.primarySeason + ' Palette</div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px">'
      + sw.map(function(s){ return '<div style="height:32px;border-radius:6px;background:'+s.hex+'" title="'+s.name+'"></div>'; }).join('')
      + '</div></div>';
  }

  // Personal features preview
  html += '<div class="card">'
    + '<div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Personal Features</div>'
    + '<div style="display:flex;gap:6px">'
    + [
        { label:'Hair',   field:'colourHair'  },
        { label:'Eyes',   field:'colourEyes'  },
        { label:'Skin 1', field:'colourSkin1' },
        { label:'Skin 2', field:'colourSkin2' },
        { label:'Lips',   field:'colourLips'  },
      ].map(function(f) {
        return '<div style="flex:1;text-align:center">'
          + '<div style="width:100%;aspect-ratio:1;border-radius:6px;background:' + r[f.field] + ';border:1px solid var(--sand);margin-bottom:4px"></div>'
          + '<div style="font-size:9px;color:var(--muted)">' + f.label + '</div>'
          + '</div>';
      }).join('')
    + '</div></div>';

  html += '</div>'; // end right col
  html += '</div>'; // end grid
  return html;
}

// ── Print / open report ──
function ocaPrintReport() {
  var html = ocaBuildReportHTML();
  var win = window.open('', '_blank');
  if (!win) { alert('Pop-up blocked — please allow pop-ups for this site and try again.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
}

function ocaBuildReportHTML(scrollMode) {
  var r = ocaReport;
  var photo = (typeof ocaPhoto !== 'undefined' && ocaPhoto) ? ocaPhoto : null;
  var season = r.primarySeason ? OCA_SEASONS[r.primarySeason] : null;
  var sisterAData = r.sisterA ? OCA_SEASONS[r.sisterA] : null;
  var sisterBData = r.sisterB ? OCA_SEASONS[r.sisterB] : null;
  var accent = season && season.swatches && season.swatches.length ? season.swatches[0].hex : '#C4705A';

  var dateStr = '';
  if (r.date) {
    try { dateStr = new Date(r.date+'T12:00').toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'}); }
    catch(e) { dateStr = r.date; }
  }

  function cap(s) { return s ? s[0].toUpperCase()+s.slice(1) : '—'; }

  // Photo cell on coloured background
  function photoCell(bg, selected, grayscale) {
    var outline = selected ? 'outline:3px solid #1C1712;outline-offset:-2px;' : '';
    var imgStyle = 'width:100%;height:100%;object-fit:cover;display:block;' + (grayscale?'filter:grayscale(100%)':'');
    var tick = selected
      ? '<div style="position:absolute;bottom:8px;right:8px;width:24px;height:24px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.2)">✓</div>'
      : '';
    return '<div style="position:relative;border-radius:10px;overflow:hidden;background:'+bg+';aspect-ratio:0.72;'+outline+'">'
      + (photo ? '<img src="'+photo+'" style="'+imgStyle+'">' : '<div style="height:160px;background:'+bg+'"></div>')
      + tick + '</div>';
  }

  // Page wrapper
  function rp(content, extraStyle) {
    return '<div class="rp" style="'+(extraStyle||'padding:54px 62px')+'">' + content + '</div>';
  }

  function pageTitle(step, title) {
    return '<div style="font-size:7px;letter-spacing:2.5px;text-transform:uppercase;color:#8C7C6C;margin-bottom:4px">'+step+'</div>'
      + '<div style="font-family:\'Playfair Display\',Georgia,serif;font-size:34px;font-weight:300;color:#1C1712;line-height:1.1;margin-bottom:8px">'+title+'</div>'
      + '<div style="width:38px;height:2px;background:'+accent+';margin-bottom:20px"></div>';
  }

  function bodyText(t) {
    return '<div style="font-size:10.5px;line-height:1.85;color:#3C3028;max-width:480px;margin-bottom:22px">'+t+'</div>';
  }

  function analystNote(note) {
    if (!note||!note.trim()) return '';
    return '<div style="margin-top:14px;padding:12px 14px;background:#F5F1EB;border-left:3px solid '+accent+';border-radius:0 8px 8px 0">'
      + '<div style="font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#8C7C6C;margin-bottom:4px">Analyst Note</div>'
      + '<div style="font-size:10.5px;line-height:1.75;color:#3C3028;white-space:pre-wrap">'+note.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>'
      + '</div>';
  }

  var pages = [];

  // ══ COVER ══
  var seasonIcons = [
    { emoji:'🌸', bg:'rgba(255,220,210,.88)' },
    { emoji:'🌤️', bg:'rgba(210,230,255,.88)' },
    { emoji:'🍂', bg:'rgba(255,210,160,.88)' },
    { emoji:'❄️', bg:'rgba(210,235,255,.88)' },
  ];
  var seasonIconsHtml = seasonIcons.map(function(s){
    return '<div style="width:24px;height:24px;border-radius:50%;background:'+s.bg+';display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.18)">'+s.emoji+'</div>';
  }).join('');

  pages.push(
    '<div class="rp" style="padding:0;overflow:hidden;position:relative">'
    // ── Photo section (top ~52%) ──
    + '<div style="position:relative;flex:0 0 52%;overflow:hidden">'
    + (photo
        ? '<img src="'+photo+'" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block">'
        : '<div style="width:100%;height:100%;background:linear-gradient(160deg,#9B7EC8 0%,#6B4A9A 40%,#3D2060 100%)"></div>')
    + '<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.08) 0%,rgba(0,0,0,.0) 50%,rgba(0,0,0,.22) 100%)"></div>'
    // Logo + season icons overlay top-left
    + '<div style="position:absolute;top:26px;left:30px">'
    +   '<div style="font-family:\'Playfair Display\',Georgia,serif;font-size:23px;font-style:italic;font-weight:600;color:white;letter-spacing:1px;text-shadow:0 2px 10px rgba(0,0,0,.35)">YourSZN</div>'
    +   '<div style="display:flex;gap:7px;margin-top:9px">'+seasonIconsHtml+'</div>'
    + '</div>'
    + '</div>'
    // ── Lower text section ──
    + '<div style="flex:1;background:#3A2347;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 40px;text-align:center">'
    +   '<div style="font-family:\'Jost\',\'Helvetica Neue\',sans-serif;font-size:26px;font-weight:700;letter-spacing:5px;color:#F0E4C2;text-transform:uppercase;line-height:1.25;margin-bottom:14px">ONLINE COLOUR ANALYSIS</div>'
    +   '<div style="width:44px;height:1px;background:rgba(240,228,194,.35);margin-bottom:14px"></div>'
    +   '<div style="font-family:\'Playfair Display\',Georgia,serif;font-size:21px;font-style:italic;color:#F0E4C2;opacity:.92">&ldquo;'+(r.clientName||'Your Name')+'&rdquo;</div>'
    + '</div>'
    + '</div>'
  );

  // ══ PERSONAL FEATURES ══
  var pfFeatures = [
    {label:'Hair',   hex:r.colourHair},
    {label:'Eyes',   hex:r.colourEyes},
    {label:'Skin 1', hex:r.colourSkin1},
    {label:'Skin 2', hex:r.colourSkin2},
    {label:'Lips',   hex:r.colourLips},
  ];
  function pfSwatch(f) {
    var bright = parseInt(f.hex.slice(1,3),16)*0.299 + parseInt(f.hex.slice(3,5),16)*0.587 + parseInt(f.hex.slice(5,7),16)*0.114;
    var txtCol = bright > 155 ? 'rgba(0,0,0,.7)' : 'rgba(255,255,255,.92)';
    return '<div style="background:'+f.hex+';border-radius:8px;padding:10px 16px;display:flex;align-items:center">'
      + '<span style="color:'+txtCol+';font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase">'+f.label+'</span>'
      + '</div>';
  }
  var pfCopy = '<strong>In colour analysis, we consider all your features to create a complete picture.</strong> Each feature is assessed carefully, and through a systematic process, we determine your season.'
    + '<br><br>Over the next few pages, you\'ll find a brief overview of how your season was identified, along with the colours that enhance your natural beauty and those that may detract from it.'
    + '<br><br>As you go through these slides, remember that &ldquo;brighter&rdquo; isn\'t always better. <strong>In colour analysis, the goal is harmony.</strong> We want the colours to complement you, not overpower you! The perfect colours allow you and the shade to shine together, without one dominating the other.'
    + '<br><br><div style="text-align:center"><em>Enjoy discovering your best colours!</em></div>';
  pages.push(rp(
    pageTitle('Overview', 'Your Personal Features')
    + '<div style="font-size:10.5px;line-height:1.85;color:#3C3028;margin-bottom:22px">'+pfCopy+'</div>'
    + '<div style="display:flex;gap:20px;flex:1;min-height:0">'
    +   '<div style="flex:1;min-width:0;overflow:hidden">'
    +   (photo
        ? '<img src="'+photo+'" style="width:100%;height:100%;object-fit:cover;object-position:center center;display:block">'
        : '<div style="width:100%;height:100%;min-height:280px;background:#E8E0D6;display:flex;align-items:center;justify-content:center;color:#8C7C6C;font-size:12px">Upload a client photo</div>')
    +   '</div>'
    +   '<div style="display:flex;flex-direction:column;justify-content:flex-start;gap:4px;flex-shrink:0;width:130px">'
    +   pfFeatures.map(pfSwatch).join('')
    +   '</div>'
    + '</div>'
  ));

  // ══ SKIN TONES ══
  var skinOpts = [
    {key:'cool',    hex:'#8BA8C0', label:'Cool'},
    {key:'neutral', hex:'#C4A882', label:'Neutral'},
    {key:'warm',    hex:'#C4783C', label:'Warm'},
  ];
  pages.push(rp(
    pageTitle('Step 1','Skin Tones')
    + bodyText('The first step of your colour analysis is to evaluate your skin overtone. I\'ve assessed your skin across cool, neutral, and warm tones. A tick has been placed in the frame that best represents your overall skin tone.')
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;max-width:420px;margin-bottom:6px">'
    + skinOpts.map(function(o){
        var sel=r.skinTemp===o.key;
        return '<div>'+photoCell(o.hex,sel,false)+'<div style="text-align:center;margin-top:5px;font-size:10.5px;font-weight:'+(sel?'700':'400')+';color:'+(sel?'#1C1712':'#8C7C6C')+'">'+o.label+'</div></div>';
      }).join('')
    + '</div>'
    + '<div style="font-size:10px;color:#8C7C6C;margin-bottom:4px">Result: <strong style="color:#1C1712">'+cap(r.skinTemp)+' · '+cap(r.skinDepth)+'</strong></div>'
    + analystNote(r.notesSkin)
  ));

  // ══ CONTRAST ══
  var contrastOpts = [
    {key:'low',    hex:'#B0A090', label:'Low'},
    {key:'medium', hex:'#706050', label:'Medium'},
    {key:'high',   hex:'#1C1410', label:'High'},
  ];
  var contrastKeyMap = {'low':'low','low-medium':'low','medium':'medium','medium-high':'high','high':'high'};
  var contrastFull = {'low':'Low','low-medium':'Low to Medium','medium':'medium','medium-high':'Medium to High','high':'High'};
  pages.push(rp(
    pageTitle('Step 2','Contrast')
    + bodyText('The second step is to assess your contrast level. Your image is converted to greyscale and we measure the difference between your lightest and darkest tones.<br><br>Low contrast: shade difference of 1–3 &nbsp;·&nbsp; Medium: 4–6 &nbsp;·&nbsp; High: 7–9')
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;max-width:420px;margin-bottom:6px">'
    + contrastOpts.map(function(o){
        var sel=contrastKeyMap[r.contrast]===o.key;
        return '<div>'+photoCell(o.hex,sel,true)+'<div style="text-align:center;margin-top:5px;font-size:10.5px;font-weight:'+(sel?'700':'400')+';color:'+(sel?'#1C1712':'#8C7C6C')+'">'+o.label+'</div></div>';
      }).join('')
    + '</div>'
    + '<div style="font-size:10px;color:#8C7C6C;margin-bottom:4px">Result: <strong style="color:#1C1712">'+(contrastFull[r.contrast]||cap(r.contrast))+(r.contrastScore?' (shade diff: '+r.contrastScore+')':'')+'</strong></div>'
    + analystNote(r.notesContrast)
  ));

  // ══ COOL VS WARM ══
  var tempOpts = [
    {key:'cool', hex:'#6890B4', label:'Cool'},
    {key:'warm', hex:'#C47038', label:'Warm'},
  ];
  pages.push(rp(
    pageTitle('Step 3','Cool vs Warm')
    + bodyText('The third step is to compare how you look in cool and warm colours. A tick is placed next to the colour that looks most harmonious with your natural features.')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:320px;margin-bottom:6px">'
    + tempOpts.map(function(o){
        var sel=r.temperature===o.key;
        return '<div>'+photoCell(o.hex,sel,false)+'<div style="text-align:center;margin-top:5px;font-size:11px;font-weight:'+(sel?'700':'400')+';color:'+(sel?'#1C1712':'#8C7C6C')+'">'+o.label+'</div></div>';
      }).join('')
    + '</div>'
    + analystNote(r.notesTemp)
  ));

  // ══ BLUSH ══
  var blushOpts = [
    {key:'cool', hex:'#E090A8', label:'Cool — Pink'},
    {key:'warm', hex:'#E08868', label:'Warm — Coral'},
  ];
  pages.push(rp(
    pageTitle('Step 4','Blush')
    + bodyText('Once we determine your skin undertone, we apply a transparent colour to mimic blush. The pink represents a cool blush, the coral represents a warm blush. This guides your choice of foundation, blush, and lip colour.')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:320px;margin-bottom:6px">'
    + blushOpts.map(function(o){
        var sel=r.blush===o.key;
        return '<div>'+photoCell(o.hex,sel,false)+'<div style="text-align:center;margin-top:5px;font-size:11px;font-weight:'+(sel?'700':'400')+';color:'+(sel?'#1C1712':'#8C7C6C')+'">'+o.label+'</div></div>';
      }).join('')
    + '</div>'
    + analystNote(r.notesBlush)
  ));

  // ══ CLEAR VS MUTED ══
  var clarityOpts = [
    {key:'clear', hex:'#D84848', label:'Clear'},
    {key:'muted', hex:'#A87860', label:'Muted / Soft'},
  ];
  pages.push(rp(
    pageTitle('Step 5','Clear vs Muted')
    + bodyText('This step involves draping to refine whether clear or muted colours suit you best — shiny vs matte metals, vibrant vs dusty tones. This reveals your clarity quality and helps narrow your palette.')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:320px;margin-bottom:6px">'
    + clarityOpts.map(function(o){
        var sel=r.clarity===o.key;
        return '<div>'+photoCell(o.hex,sel,false)+'<div style="text-align:center;margin-top:5px;font-size:11px;font-weight:'+(sel?'700':'400')+';color:'+(sel?'#1C1712':'#8C7C6C')+'">'+o.label+'</div></div>';
      }).join('')
    + '</div>'
    + analystNote(r.notesClarity)
  ));

  // ══ YOUR SEASON ══
  pages.push(rp(
    pageTitle('Result','Your Season')
    + bodyText('Here, we\'ve identified your primary colour season along with your two sister seasons. Sister seasons are the ones you can also dip into — they\'re your second best options for colours that still work beautifully with your natural colouring.')
    + '<div style="display:flex;gap:14px;margin-bottom:20px;flex-wrap:wrap">'
    + '<div style="flex:1.3;min-width:170px;padding:20px;background:'+accent+';border-radius:13px;color:white">'
    + '<div style="font-size:7px;letter-spacing:2.5px;text-transform:uppercase;opacity:.8;margin-bottom:7px">Primary Season</div>'
    + '<div style="font-family:\'Playfair Display\',Georgia,serif;font-size:24px;font-weight:300;margin-bottom:5px">'+(r.primarySeason||'—')+'</div>'
    + '<div style="font-size:9.5px;line-height:1.7;opacity:.9">'+(season?season.desc:'')+'</div>'
    + '</div>'
    + '<div style="flex:1;min-width:140px;display:flex;flex-direction:column;gap:8px">'
    + [{data:sisterAData,name:r.sisterA,num:1},{data:sisterBData,name:r.sisterB,num:2}].map(function(s){
        return '<div style="padding:12px 14px;background:white;border:1.5px solid #E5DDD4;border-radius:11px;flex:1">'
          + '<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#8C7C6C;margin-bottom:3px">Sister Season '+s.num+'</div>'
          + '<div style="font-family:\'Playfair Display\',Georgia,serif;font-size:18px;font-weight:300;color:#1C1712">'+(s.name||'—')+'</div>'
          + (s.data?'<div style="font-size:9px;color:#8C7C6C;line-height:1.6;margin-top:2px">'+s.data.desc+'</div>':'')
          + '</div>';
      }).join('')
    + '</div></div>'
    + analystNote(r.notesSeason)
  ));

  // ══ SEASON BOARD ══
  if (r.primarySeason && typeof OCA_SEASON_BOARDS !== 'undefined' && OCA_SEASON_BOARDS[r.primarySeason]) {
    var boardColours = OCA_SEASON_BOARDS[r.primarySeason];
    var stripes = boardColours.map(function(h){return '<div style="flex:1;background:'+h+'"></div>';}).join('');
    pages.push(rp(
      pageTitle('Your Season',r.primarySeason)
      + '<div style="font-size:10.5px;color:#3C3028;margin-bottom:16px">Here is your season up close and personal.</div>'
      + '<div style="position:relative;border-radius:13px;overflow:hidden;height:310px">'
      + '<div style="display:flex;height:100%">'+stripes+'</div>'
      + (photo?'<div style="position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center"><img src="'+photo+'" style="height:96%;object-fit:cover;object-position:center top;filter:drop-shadow(0 8px 32px rgba(0,0,0,.45))"></div>':'')
      + '</div>'
      + '<div style="text-align:center;margin-top:10px;font-family:\'Playfair Display\',Georgia,serif;font-size:16px;font-weight:300;color:#1C1712">'+r.primarySeason+(season?' — '+season.desc.split('.')[0]:'')+'</div>'
    ));
  }

  // ══ SEASON PALETTE ══
  if (season) {
    var allSwatches = (season.swatches||[]).concat(season.neutrals||[]).slice(0,16);
    pages.push(rp(
      pageTitle('Your Palette','Your Colours')
      + '<div style="font-size:10.5px;line-height:1.85;color:#3C3028;max-width:500px;margin-bottom:18px">The colours below are all part of your season\'s palette. Not all of them may suit you perfectly or align with your personal preferences — use this as your complete colour guide.</div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'
      + allSwatches.map(function(sw){
          return '<div style="position:relative;border-radius:9px;overflow:hidden;background:'+sw.hex+';aspect-ratio:1">'
            + (photo?'<img src="'+photo+'" style="width:100%;height:100%;object-fit:cover;display:block">':'')
            + '<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.38));padding:4px 5px 3px;text-align:center">'
            + '<span style="font-size:6.5px;font-weight:600;color:rgba(255,255,255,.92);letter-spacing:.3px">'+sw.name+'</span>'
            + '</div></div>';
        }).join('')
      + '</div>'
    ));
  }

  // ══ NOTES ══
  if (r.notes && r.notes.trim()) {
    pages.push(rp(
      pageTitle('Notes','Personal Notes')
      + '<div style="font-size:12px;line-height:2;color:#3C3028;white-space:pre-wrap">'+r.notes.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>'
    ));
  }

  // ══ THANK YOU ══
  pages.push(rp(
    '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(297mm - 108px);text-align:center">'
    + '<div style="font-size:7px;letter-spacing:4px;text-transform:uppercase;color:#C4B4A4;margin-bottom:30px">YOUR SZN</div>'
    + '<div style="font-family:\'Playfair Display\',Georgia,serif;font-size:50px;font-weight:300;font-style:italic;color:#1C1712;margin-bottom:16px">Thank You</div>'
    + '<div style="width:40px;height:2px;background:'+accent+';margin-bottom:20px"></div>'
    + '<div style="font-size:11.5px;line-height:2;color:#3C3028;max-width:320px;margin-bottom:12px">Thank you for trusting me with your colour analysis! I hope you find as much joy and value in this experience as I\'ve had working with you.</div>'
    + '<div style="font-size:10.5px;line-height:2;color:#3C3028;max-width:320px;margin-bottom:30px">If you\'re pleased with the experience, sharing your journey with friends and family would mean the world to me. And don\'t forget to refer back to this report whenever you need a little colour guidance.</div>'
    + '<div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#8C7C6C;margin-bottom:4px">Latisha Sykes · CEO &amp; Founder</div>'
    + '<div style="font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#C4B4A4">yourszn.com.au</div>'
    + '</div>'
  ));

  var fontLink = '<link rel="preconnect" href="https://fonts.googleapis.com">'
    + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    + '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Marcellus&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">';
  var baseCSS = [
    '@page { size: A4 portrait; margin: 0; }',
    '* { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
  ].join('\n');

  if (scrollMode) {
    var scrollCSS = baseCSS + '\n' + [
      "body { font-family: 'Marcellus',Georgia,serif; background: #3C3C3C; padding: 40px 0; color: #1C1712; -webkit-print-color-adjust: exact; print-color-adjust: exact; zoom: 0.78; }",
      '.rp { width: 210mm; min-height: 297mm; position: relative; background: #FAF6F1; overflow: hidden; margin: 0 auto 32px; display: flex; flex-direction: column; box-shadow: 0 6px 32px rgba(0,0,0,.35); }',
      '.rp:last-child { margin-bottom: 0; }',
      '@media print { body { background: white; padding: 0; zoom: 1; } .rp { width: 210mm; height: 297mm; margin: 0; box-shadow: none; page-break-after: always; overflow: hidden; } .rp:last-child { page-break-after: auto; } }',
    ].join('\n');

    var editScript = '<script>document.addEventListener("DOMContentLoaded",function(){document.designMode="on";});<\/script>';

    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
      + '<title>Colour Analysis — '+(r.clientName||'Report')+'</title>'
      + fontLink
      + '<style>'+scrollCSS+'</style>'
      + editScript
      + '</head><body>'+pages.join('\n')+'</body></html>';
  }

  // ── Page-by-page popup mode ──
  var popupCSS = baseCSS + '\n' + [
    "body { font-family: 'Marcellus',Georgia,serif; background: #EDE7DF; color: #1C1712; -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
    '.rp { width: 210mm; height: 297mm; position: relative; background: #FAF6F1; overflow: hidden; margin: 0 auto; display: none; }',
    '.rp.active { display: flex; flex-direction: column; }',
    '@media screen { body { padding: 70px 0 40px; } .rp.active { box-shadow: 0 4px 28px rgba(0,0,0,.14); } }',
    '#_nav { position:fixed;top:0;left:0;right:0;background:#1C1712;color:white;padding:10px 20px;display:flex;align-items:center;gap:10px;z-index:9999;font-family:Jost,sans-serif;font-size:13px }',
    '#_nav button { background:rgba(255,255,255,.14);color:white;border:none;padding:7px 18px;border-radius:7px;cursor:pointer;font-size:12px;font-family:Jost,sans-serif;font-weight:500;letter-spacing:.3px;transition:background .15s }',
    '#_nav button:hover:not(:disabled) { background:rgba(255,255,255,.26) }',
    '#_nav button:disabled { opacity:.3;cursor:default }',
    '#_nav .print-btn { background:#7B5EA7;font-weight:600;padding:7px 20px }',
    '#_nav .print-btn:hover { background:#9370C4 }',
    '#_pi { flex:1;text-align:center;font-size:12px;opacity:.6;letter-spacing:.5px }',
    '@media print { #_nav { display:none!important } body { background:white;padding:0 } .rp { display:flex!important;flex-direction:column;page-break-after:always;box-shadow:none;margin:0 } .rp:last-child { page-break-after:auto } }',
  ].join('\n');

  var navScript = '<script>'
    + 'var _cur=0;'
    + 'function _sp(n){'
    +   'var pgs=document.querySelectorAll(".rp");'
    +   'if(n<0||n>=pgs.length)return;'
    +   'pgs.forEach(function(p,i){p.classList.toggle("active",i===n);});'
    +   '_cur=n;'
    +   'document.getElementById("_pi").textContent="Page "+(n+1)+" of "+pgs.length;'
    +   'document.getElementById("_pb").disabled=n===0;'
    +   'document.getElementById("_nb").disabled=n===pgs.length-1;'
    +   'window.scrollTo(0,0);'
    + '}'
    + 'document.addEventListener("DOMContentLoaded",function(){_sp(0);});'
    + 'document.addEventListener("keydown",function(e){if(e.key==="ArrowLeft")_sp(_cur-1);if(e.key==="ArrowRight")_sp(_cur+1);});'
    + '<\/script>';

  var navBar = '<div id="_nav">'
    + '<button id="_pb" onclick="_sp(_cur-1)">&#8592; Prev</button>'
    + '<span id="_pi">Page 1</span>'
    + '<button id="_nb" onclick="_sp(_cur+1)">Next &#8594;</button>'
    + '<button class="print-btn" onclick="window.print()">&#128438; Print PDF</button>'
    + '</div>';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
    + '<title>Colour Analysis — '+(r.clientName||'Report')+'</title>'
    + fontLink
    + '<style>'+popupCSS+'</style>'
    + navScript
    + '</head><body>'
    + navBar
    + pages.join('\n')
    + '</body></html>';
}
