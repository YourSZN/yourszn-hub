// ══ OCA REPORT BUILDER ══
// Generates a printable/PDF colour analysis report

var ocaReport = {
  clientName: '',
  date: new Date().toISOString().split('T')[0],
  primarySeason: '',
  sisterA: '',
  sisterB: '',
  skinTone: 'warm',    // cool | neutral | warm
  contrast: 'medium',  // low | medium | high
  temperature: 'warm', // cool | warm
  blush: 'warm',       // cool | warm
  clarity: 'muted',    // clear | muted
  notes: '',
};

function renderOcaReport() {
  var r = ocaReport;
  var photo = (typeof ocaPhoto !== 'undefined' && ocaPhoto) ? ocaPhoto : null;
  var seasonKeys = Object.keys(OCA_SEASONS);

  function mkSeasonSelect(field, val, label) {
    var opts = '<option value="">— ' + label + ' —</option>'
      + seasonKeys.map(function(k) {
          return '<option value="' + k + '"' + (k === val ? ' selected' : '') + '>' + k + '</option>';
        }).join('');
    return '<div>'
      + '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">' + label + '</div>'
      + '<select onchange="ocaReport.' + field + '=this.value;renderOca()" style="width:100%;padding:10px 12px;border:1px solid var(--sand);border-radius:10px;font-size:13px;font-weight:600;background:white;color:var(--deep)">'
      + opts + '</select></div>';
  }

  function mkRadioRow(field, options) {
    return '<div style="display:flex;gap:8px;flex-wrap:wrap">'
      + options.map(function(o) {
          var on = r[field] === o.val;
          return '<label style="display:flex;align-items:center;gap:7px;padding:8px 14px;border:1.5px solid '
            + (on ? 'var(--deep)' : 'var(--sand)') + ';border-radius:8px;cursor:pointer;font-size:12px;font-weight:'
            + (on ? '700' : '400') + ';background:' + (on ? 'var(--deep)' : 'white') + ';color:' + (on ? 'white' : 'var(--deep)') + ';transition:all .15s">'
            + '<input type="radio" name="' + field + '" value="' + o.val + '" ' + (on ? 'checked' : '')
            + ' onchange="ocaReport.' + field + '=this.value;renderOca()" style="display:none">'
            + (o.dot ? '<span style="width:12px;height:12px;border-radius:50%;background:' + o.dot + ';display:inline-block;flex-shrink:0;border:1px solid rgba(255,255,255,.3)"></span>' : '')
            + o.label + '</label>';
        }).join('')
      + '</div>';
  }

  var html = '';

  // ── Client + Season ──
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">';

  // Client details card
  html += '<div class="card"><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:16px">Client Details</div>'
    + '<div style="display:grid;gap:12px">'
    + '<div><div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Client Name</div>'
    + '<input value="' + r.clientName.replace(/"/g, '&quot;') + '" oninput="ocaReport.clientName=this.value" placeholder="e.g. Jane Smith" style="width:100%;padding:10px 12px;border:1px solid var(--sand);border-radius:10px;font-size:13px;font-family:inherit;color:var(--deep);outline:none"></div>'
    + '<div><div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Session Date</div>'
    + '<input type="date" value="' + r.date + '" oninput="ocaReport.date=this.value" style="width:100%;padding:10px 12px;border:1px solid var(--sand);border-radius:10px;font-size:13px;font-family:inherit;color:var(--deep);outline:none"></div>'
    + '</div></div>';

  // Season result card
  html += '<div class="card"><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:16px">Season Result</div>'
    + '<div style="display:grid;gap:12px">'
    + mkSeasonSelect('primarySeason', r.primarySeason, 'Primary Season')
    + mkSeasonSelect('sisterA', r.sisterA, 'Sister Season 1')
    + mkSeasonSelect('sisterB', r.sisterB, 'Sister Season 2')
    + '</div></div>';

  html += '</div>';

  // ── Analysis results ──
  var steps = [
    { label: 'Skin Tone', field: 'skinTone', options: [
      { val: 'cool',    label: 'Cool',    dot: '#8BA8C0' },
      { val: 'neutral', label: 'Neutral', dot: '#C4A882' },
      { val: 'warm',    label: 'Warm',    dot: '#C4783C' },
    ]},
    { label: 'Contrast Level', field: 'contrast', options: [
      { val: 'low',    label: 'Low' },
      { val: 'medium', label: 'Medium' },
      { val: 'high',   label: 'High' },
    ]},
    { label: 'Temperature', field: 'temperature', options: [
      { val: 'cool', label: 'Cool', dot: '#6890B4' },
      { val: 'warm', label: 'Warm', dot: '#C47038' },
    ]},
    { label: 'Blush', field: 'blush', options: [
      { val: 'cool', label: 'Cool — Pink',   dot: '#E090A8' },
      { val: 'warm', label: 'Warm — Coral',  dot: '#E08868' },
    ]},
    { label: 'Clarity', field: 'clarity', options: [
      { val: 'clear', label: 'Clear', dot: '#D84848' },
      { val: 'muted', label: 'Muted / Soft', dot: '#A87860' },
    ]},
  ];

  html += '<div class="card" style="margin-bottom:20px">'
    + '<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:20px">Analysis Results</div>'
    + '<div style="display:grid;gap:14px">'
    + steps.map(function(step) {
        return '<div style="display:grid;grid-template-columns:160px 1fr;align-items:center;gap:12px">'
          + '<div style="font-size:12px;font-weight:600;color:var(--charcoal)">' + step.label + '</div>'
          + mkRadioRow(step.field, step.options)
          + '</div>';
      }).join('')
    + '</div></div>';

  // ── Notes ──
  html += '<div class="card" style="margin-bottom:20px">'
    + '<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:12px">Analyst Notes</div>'
    + '<textarea oninput="ocaReport.notes=this.value" placeholder="Add personalised notes for this client — these appear on the Notes page of the report..." rows="4" style="width:100%;padding:12px;border:1px solid var(--sand);border-radius:10px;font-size:13px;font-family:inherit;color:var(--deep);resize:vertical;line-height:1.6;outline:none">'
    + r.notes + '</textarea></div>';

  // ── Print button ──
  var warn = !photo ? '<div style="font-size:12px;color:var(--muted);background:var(--warm);padding:10px 14px;border-radius:8px;border:1px solid var(--sand)">&#9888; Upload a client photo above for photo pages in the report</div>' : '';
  html += '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">'
    + warn
    + '<button onclick="ocaPrintReport()" style="margin-left:auto;background:var(--deep);color:white;border:none;padding:13px 28px;font-size:13px;font-weight:600;border-radius:10px;cursor:pointer;letter-spacing:.3px">&#128438; Preview &amp; Print PDF</button>'
    + '</div>';

  return html;
}

// ── Print / open report ──
function ocaPrintReport() {
  var html = ocaBuildReportHTML();
  var win = window.open('', '_blank');
  if (!win) { alert('Pop-up blocked — please allow pop-ups for this page and try again.'); return; }
  win.document.write(html);
  win.document.close();
}

function ocaBuildReportHTML() {
  var r = ocaReport;
  var photo = (typeof ocaPhoto !== 'undefined' && ocaPhoto) ? ocaPhoto : null;
  var season = r.primarySeason ? OCA_SEASONS[r.primarySeason] : null;
  var sisterAData = r.sisterA ? OCA_SEASONS[r.sisterA] : null;
  var sisterBData = r.sisterB ? OCA_SEASONS[r.sisterB] : null;

  // Accent colour = first swatch of primary season
  var accent = season && season.swatches && season.swatches.length ? season.swatches[0].hex : '#C4705A';

  var dateStr = '';
  if (r.date) {
    try {
      dateStr = new Date(r.date + 'T12:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch(e) { dateStr = r.date; }
  }

  // ── Helpers ──
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'; }

  function photoCell(bg, selected, grayscale) {
    var style = 'position:relative;border-radius:12px;overflow:hidden;background:' + bg + ';aspect-ratio:0.72;'
      + 'border:3px solid ' + (selected ? '#1C1712' : 'transparent') + ';';
    var imgStyle = 'width:100%;height:100%;object-fit:cover;display:block;' + (grayscale ? 'filter:grayscale(100%)' : '');
    var tick = selected
      ? '<div style="position:absolute;bottom:10px;right:10px;width:30px;height:30px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.25)">✓</div>'
      : '';
    return '<div style="' + style + '">'
      + (photo ? '<img src="' + photo + '" style="' + imgStyle + '">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:rgba(255,255,255,.5)">No photo</span></div>')
      + tick + '</div>';
  }

  function pageHeader(step, title) {
    return '<div style="font-size:7.5px;letter-spacing:2.5px;text-transform:uppercase;color:#8C7C6C;margin-bottom:5px">' + step + '</div>'
      + '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:34px;font-weight:300;color:#1C1712;margin-bottom:10px;line-height:1.1">' + title + '</div>'
      + '<div style="width:44px;height:2px;background:' + accent + ';margin-bottom:22px"></div>';
  }

  function bodyText(t) {
    return '<div style="font-size:10.5px;line-height:1.85;color:#3C3028;max-width:480px;margin-bottom:28px">' + t + '</div>';
  }

  var pages = [];

  // ════ PAGE 1: COVER ════
  pages.push(
    '<div class="rp" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:70px 60px;text-align:center">'
    + '<div style="font-size:7px;letter-spacing:4px;text-transform:uppercase;color:#C4B4A4;margin-bottom:52px">YOUR SZN — COLOUR ANALYSIS</div>'
    + (photo
        ? '<div style="width:188px;height:188px;border-radius:50%;overflow:hidden;border:4px solid ' + accent + ';margin-bottom:8px;flex-shrink:0"><img src="' + photo + '" style="width:100%;height:100%;object-fit:cover"></div>'
        : '<div style="width:188px;height:188px;border-radius:50%;background:#E5DDD4;margin-bottom:8px;flex-shrink:0"></div>')
    + '<div style="width:48px;height:1px;background:#E5DDD4;margin:20px auto"></div>'
    + '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#8C7C6C;margin-bottom:6px">Online Colour Analysis</div>'
    + '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:50px;font-weight:300;font-style:italic;color:#1C1712;line-height:1.1;margin-bottom:6px">' + (r.clientName || 'Your Client') + '</div>'
    + '<div style="font-size:11px;color:#8C7C6C;margin-bottom:44px">' + dateStr + '</div>'
    + (r.primarySeason
        ? '<div style="width:56px;height:2px;background:' + accent + ';margin-bottom:14px"></div>'
          + '<div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:' + accent + ';font-weight:600">' + r.primarySeason + '</div>'
        : '')
    + '<div style="position:absolute;bottom:32px;left:0;right:0;text-align:center"><div style="font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#C4B4A4">portal.yourszn.com.au</div></div>'
    + '</div>'
  );

  // ════ PAGE 2: PERSONAL FEATURES ════
  var summaryCards = [
    { step: '01', title: 'Skin Tone',    val: cap(r.skinTone) },
    { step: '02', title: 'Contrast',     val: cap(r.contrast) },
    { step: '03', title: 'Temperature',  val: cap(r.temperature) },
    { step: '04', title: 'Blush',        val: cap(r.blush) },
    { step: '05', title: 'Clarity',      val: cap(r.clarity) },
    { step: '06', title: 'Season',       val: r.primarySeason || '—' },
  ];
  pages.push(
    '<div class="rp" style="padding:56px 64px">'
    + pageHeader('01 — Overview', 'Your Personal<br>Features')
    + bodyText('In colour analysis, we consider all your features to create a complete picture. Each feature is assessed carefully, and through a systematic process, we determine your season.<br><br>Over the next few pages, you\'ll find a brief overview of how your season was identified, along with the key steps taken during your analysis.')
    + (photo
        ? '<div style="position:absolute;right:60px;top:72px;width:196px;height:252px;border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.12)"><img src="' + photo + '" style="width:100%;height:100%;object-fit:cover"></div>'
          + '<div style="position:absolute;right:52px;top:64px;width:196px;height:252px;border:2px solid ' + accent + ';border-radius:14px;transform:translate(-8px,-8px)"></div>'
        : '')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:320px">'
    + summaryCards.map(function(c) {
        return '<div style="padding:12px 14px;background:white;border-radius:10px;border:1px solid #E5DDD4">'
          + '<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#8C7C6C;margin-bottom:4px">' + c.step + ' — ' + c.title + '</div>'
          + '<div style="font-size:13px;font-weight:600;color:#1C1712">' + c.val + '</div>'
          + '</div>';
      }).join('')
    + '</div></div>'
  );

  // ════ PAGE 3: SKIN TONES ════
  var skinOpts = [
    { key: 'cool',    hex: '#8BA8C0', label: 'Cool' },
    { key: 'neutral', hex: '#C4A882', label: 'Neutral' },
    { key: 'warm',    hex: '#C4783C', label: 'Warm' },
  ];
  pages.push(
    '<div class="rp" style="padding:56px 64px">'
    + pageHeader('02 — Step One', 'Skin Tones')
    + bodyText('The first step of your colour analysis is to evaluate your skin overtone. I\'ve assessed your skin across cool, neutral, and warm tones, ranging from light to deep. A tick has been placed in the frame that best represents your overall skin tone.')
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;max-width:480px">'
    + skinOpts.map(function(o) {
        var sel = r.skinTone === o.key;
        return '<div>'
          + photoCell(o.hex, sel, false)
          + '<div style="text-align:center;margin-top:8px;font-size:11px;font-weight:' + (sel ? '700' : '400') + ';color:' + (sel ? '#1C1712' : '#8C7C6C') + '">' + o.label + '</div>'
          + '</div>';
      }).join('')
    + '</div></div>'
  );

  // ════ PAGE 4: CONTRAST ════
  var contrastOpts = [
    { key: 'low',    hex: '#B0A090', label: 'Low Contrast' },
    { key: 'medium', hex: '#706050', label: 'Medium Contrast' },
    { key: 'high',   hex: '#1C1410', label: 'High Contrast' },
  ];
  pages.push(
    '<div class="rp" style="padding:56px 64px">'
    + pageHeader('03 — Step Two', 'Contrast')
    + bodyText('The second step of colour analysis is to assess your contrast level. To do this, your image is converted to greyscale. We then evaluate the shades of your skin, hair, and eyes, measuring the difference between the lightest and darkest tones.')
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;max-width:480px">'
    + contrastOpts.map(function(o) {
        var sel = r.contrast === o.key;
        return '<div>'
          + photoCell(o.hex, sel, true)
          + '<div style="text-align:center;margin-top:8px;font-size:11px;font-weight:' + (sel ? '700' : '400') + ';color:' + (sel ? '#1C1712' : '#8C7C6C') + '">' + o.label + '</div>'
          + '</div>';
      }).join('')
    + '</div></div>'
  );

  // ════ PAGE 5: COOL VS WARM ════
  var tempOpts = [
    { key: 'cool', hex: '#6890B4', label: 'Cool' },
    { key: 'warm', hex: '#C47038', label: 'Warm' },
  ];
  pages.push(
    '<div class="rp" style="padding:56px 64px">'
    + pageHeader('04 — Step Three', 'Cool vs Warm')
    + bodyText('The third step is to compare how you look in cool and warm colours. A tick is placed next to the colour I believe is the most flattering for you. Remember these won\'t be a perfect match — this is just the first step.')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:360px">'
    + tempOpts.map(function(o) {
        var sel = r.temperature === o.key;
        return '<div>'
          + photoCell(o.hex, sel, false)
          + '<div style="text-align:center;margin-top:8px;font-size:12px;font-weight:' + (sel ? '700' : '400') + ';color:' + (sel ? '#1C1712' : '#8C7C6C') + '">' + o.label + '</div>'
          + '</div>';
      }).join('')
    + '</div></div>'
  );

  // ════ PAGE 6: BLUSH ════
  var blushOpts = [
    { key: 'cool', hex: '#E090A8', label: 'Cool — Pink' },
    { key: 'warm', hex: '#E08868', label: 'Warm — Coral' },
  ];
  pages.push(
    '<div class="rp" style="padding:56px 64px">'
    + pageHeader('05 — Step Four', 'Blush')
    + bodyText('Once we determine your skin undertone, we perform a quick test by applying a transparent colour to your skin to mimic blush. The pink represents a cool blush (rose), while the coral represents a warm blush. This is helpful to keep in mind when choosing blush and lip colours.')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:360px">'
    + blushOpts.map(function(o) {
        var sel = r.blush === o.key;
        return '<div>'
          + photoCell(o.hex, sel, false)
          + '<div style="text-align:center;margin-top:8px;font-size:12px;font-weight:' + (sel ? '700' : '400') + ';color:' + (sel ? '#1C1712' : '#8C7C6C') + '">' + o.label + '</div>'
          + '</div>';
      }).join('')
    + '</div></div>'
  );

  // ════ PAGE 7: CLEAR VS MUTED ════
  var clarityOpts = [
    { key: 'clear', hex: '#D84848', label: 'Clear' },
    { key: 'muted', hex: '#A87860', label: 'Muted / Soft' },
  ];
  pages.push(
    '<div class="rp" style="padding:56px 64px">'
    + pageHeader('06 — Step Five', 'Clear vs Muted')
    + bodyText('This step involves draping to refine whether clear or soft/muted colours suit you best, highlighting the importance of undertone and seasonal variation. For example, shiny gold and silver may harmonise better with your skin than muted metals, revealing whether you\'re a \'clear\' or \'muted\' type.')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:360px">'
    + clarityOpts.map(function(o) {
        var sel = r.clarity === o.key;
        return '<div>'
          + photoCell(o.hex, sel, false)
          + '<div style="text-align:center;margin-top:8px;font-size:12px;font-weight:' + (sel ? '700' : '400') + ';color:' + (sel ? '#1C1712' : '#8C7C6C') + '">' + o.label + '</div>'
          + '</div>';
      }).join('')
    + '</div></div>'
  );

  // ════ PAGE 8: YOUR SEASON ════
  pages.push(
    '<div class="rp" style="padding:56px 64px">'
    + pageHeader('07 — Result', 'Your Season')
    + bodyText('Here, we\'ve identified your primary colour season along with your two sister seasons. Sister seasons are colours you can also dip into — they\'re your second best.')
    + '<div style="display:flex;gap:16px;margin-bottom:32px;flex-wrap:wrap">'
    // Primary
    + '<div style="flex:1;min-width:180px;padding:22px;background:' + accent + ';border-radius:14px;color:white">'
    + '<div style="font-size:7.5px;letter-spacing:2.5px;text-transform:uppercase;opacity:.8;margin-bottom:8px">Primary Season</div>'
    + '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:26px;font-weight:300;margin-bottom:8px">' + (r.primarySeason || '—') + '</div>'
    + '<div style="font-size:10px;line-height:1.7;opacity:.9">' + (season ? season.desc : '') + '</div>'
    + '</div>'
    // Sisters
    + '<div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:10px">'
    + '<div style="padding:14px;background:white;border:1.5px solid #E5DDD4;border-radius:12px">'
    + '<div style="font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#8C7C6C;margin-bottom:5px">Sister Season 1</div>'
    + '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:20px;font-weight:300;color:#1C1712">' + (r.sisterA || '—') + '</div>'
    + (sisterAData ? '<div style="font-size:9.5px;color:#8C7C6C;line-height:1.6;margin-top:3px">' + sisterAData.desc + '</div>' : '')
    + '</div>'
    + '<div style="padding:14px;background:white;border:1.5px solid #E5DDD4;border-radius:12px">'
    + '<div style="font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#8C7C6C;margin-bottom:5px">Sister Season 2</div>'
    + '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:20px;font-weight:300;color:#1C1712">' + (r.sisterB || '—') + '</div>'
    + (sisterBData ? '<div style="font-size:9.5px;color:#8C7C6C;line-height:1.6;margin-top:3px">' + sisterBData.desc + '</div>' : '')
    + '</div></div></div>'
    + '</div>'
  );

  // ════ PAGE 9: SEASON PALETTE ════
  if (season) {
    var allSwatches = (season.swatches || []).concat(season.neutrals || []).slice(0, 16);
    pages.push(
      '<div class="rp" style="padding:56px 64px">'
      + pageHeader('08 — Your Palette', r.primarySeason || 'Season Palette')
      + '<div style="font-size:10.5px;line-height:1.85;color:#3C3028;max-width:500px;margin-bottom:24px">The colours below are all part of your season\'s palette. Not all of them may suit you perfectly or align with your personal preferences — use this as your complete palette guide.</div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'
      + allSwatches.map(function(sw) {
          return '<div style="position:relative;border-radius:10px;overflow:hidden;background:' + sw.hex + ';aspect-ratio:1">'
            + (photo ? '<img src="' + photo + '" style="width:100%;height:100%;object-fit:cover;display:block">' : '')
            + '<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.45));padding:5px 6px 4px;text-align:center">'
            + '<span style="font-size:7px;font-weight:600;color:rgba(255,255,255,.92);letter-spacing:.3px">' + sw.name + '</span>'
            + '</div></div>';
        }).join('')
      + '</div></div>'
    );
  }

  // ════ PAGE 10: NOTES (only if notes exist) ════
  if (r.notes && r.notes.trim()) {
    pages.push(
      '<div class="rp" style="padding:56px 64px">'
      + pageHeader('09 — Notes', 'Personal Notes')
      + '<div style="font-size:13px;line-height:2;color:#3C3028;white-space:pre-wrap">' + r.notes.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>'
      + '</div>'
    );
  }

  // ════ PAGE LAST: THANK YOU ════
  pages.push(
    '<div class="rp" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:70px 60px">'
    + '<div style="font-size:7px;letter-spacing:4px;text-transform:uppercase;color:#C4B4A4;margin-bottom:36px">YOUR SZN</div>'
    + '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:54px;font-weight:300;font-style:italic;color:#1C1712;margin-bottom:20px">Thank You</div>'
    + '<div style="width:48px;height:2px;background:' + accent + ';margin-bottom:24px"></div>'
    + '<div style="font-size:12px;line-height:2;color:#3C3028;max-width:340px;margin-bottom:40px">Thank you for trusting me with your colour analysis! I hope you find as much joy and value in this experience as I\'ve had working with you.</div>'
    + '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#8C7C6C">portal.yourszn.com.au</div>'
    + '</div>'
  );

  // ── Assemble ──
  var css = [
    "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Jost:wght@300;400;500;600&display=swap');",
    '@page { size: A4 portrait; margin: 0; }',
    '* { box-sizing: border-box; margin: 0; padding: 0; }',
    "body { font-family: 'Jost', 'Helvetica Neue', sans-serif; background: #ddd; color: #1C1712; -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
    '.rp { width: 210mm; min-height: 297mm; position: relative; background: #FAF6F1; page-break-after: always; overflow: hidden; margin: 0 auto; }',
    '.rp:last-child { page-break-after: auto; }',
    '@media screen { body { padding: 32px 0; } .rp { box-shadow: 0 4px 32px rgba(0,0,0,.14); margin-bottom: 24px; } }',
    '@media print { body { background: white; padding: 0; } .rp { margin: 0; box-shadow: none; } }',
  ].join('\n');

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
    + '<title>Colour Analysis — ' + (r.clientName || 'Report') + '</title>'
    + '<style>' + css + '</style>'
    + '</head><body>'
    + pages.join('\n')
    + '<script>window.addEventListener("load",function(){});<\/script>'
    + '</body></html>';
}
