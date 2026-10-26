/* ═══════════ Tailoring → Wardrobe & Planning (onboarding questionnaire) ═══════════
   Six short steps, autosaved through /api/vietnam-wardrobe (client's own row only),
   ending in a one-page "tailoring brief". Favourite-piece photos go to the private
   inspiration-photos bucket under wardrobe/<cid>/.
   Uses page globals: qs, dashClient, recEsc, showToast, flashSaved, SUPABASE_URL,
   SUPABASE_KEY, initTailoringBoard, currentClient, boardItems, sb, loadItems. */

var VW_SEASONS = ['Light Spring', 'True Spring', 'Bright Spring', 'Light Summer', 'True Summer', 'Soft Summer',
  'Soft Autumn', 'True Autumn', 'Dark Autumn', 'Bright Winter', 'True Winter', 'Dark Winter'];
var VW_CATS = ['Tops', 'Pants', 'Shorts', 'Jackets / Blazers', 'Suits', 'Dresses', 'Shoes', 'Accessories'];

var VW_STEPS = [
  { id: 'lifestyle', title: 'Your lifestyle', intro: 'So the pieces you have made suit how you actually live.', fields: [
    { k: 'dress_code', type: 'chips', multi: true, label: 'What do you usually wear for work?', opts: ['Corporate', 'Smart casual', 'Casual', 'Uniform', 'Work from home', 'Not working'] },
    { k: 'week', type: 'split', label: 'Roughly how does your week split?', hint: 'Slide each one — we’ll work out the percentages.',
      opts: [['work', 'Work'], ['casual', 'Everyday casual'], ['going_out', 'Going out & events'], ['travel', 'Travel'], ['active', 'Active']] },
    { k: 'climate', type: 'chips', label: 'Climate at home', opts: ['Hot & humid', 'Mild', 'Four seasons', 'Cold'] },
    { k: 'occasions', type: 'chips', multi: true, other: true, label: 'Any occasions coming up in the next 12 months?', opts: ['Wedding guest', 'My own wedding', 'Work events', 'Holidays', 'Black tie'] }
  ] },
  { id: 'style', title: 'Your style', intro: 'A quick sense of what feels like you.', fields: [
    { k: 'style_words', type: 'chips', multi: true, max: 3, label: 'Pick up to 3 words that describe your style',
      opts: ['Classic', 'Minimal', 'Relaxed', 'Polished', 'Romantic', 'Bold', 'Bohemian', 'Edgy', 'Sporty', 'Feminine', 'Tailored', 'Eclectic'] },
    { k: 'feel', type: 'text', label: 'How do you want to feel in your clothes?', ph: 'e.g. Put-together but comfortable' },
    { k: 'references', type: 'textarea', optional: true, label: 'Style references or people you admire', ph: 'Names, Instagram accounts, Pinterest boards…' }
  ] },
  { id: 'loves', title: 'Pieces you own & love', intro: 'Your proven favourites are the easiest wins — the tailors can copy what already works for you.', fields: [
    { type: 'photos', label: 'Add up to 6 favourite pieces', hint: 'Lay it flat or hang it up and snap a photo. Tell us why it works.' },
    { k: 'never_wear', type: 'chips', multi: true, label: 'Anything you own but never wear? What’s stopping you?', opts: ['Fit', 'Fabric', 'Colour', 'Length', 'Uncomfortable', 'Not my style anymore'] },
    { k: 'never_wear_note', type: 'textarea', optional: true, label: 'Tell us more (optional)', ph: 'e.g. My linen pants are always too long and crease badly…' }
  ] },
  { id: 'fit', title: 'Fit problems', intro: 'Tick anything that usually happens to you in shop-bought clothes. This is where tailoring really shines.', fields: [
    { k: 'fit_tops', type: 'chips', multi: true, other: true, label: 'Tops & shirts',
      opts: ['Gaping at the bust buttons', 'Tight across the back', 'Shoulders too wide', 'Sleeves too long', 'Sleeves too short', 'Body too long', 'Body too short', 'Collar too tight'] },
    { k: 'fit_trousers', type: 'chips', multi: true, other: true, label: 'Trousers & shorts',
      opts: ['Too long', 'Waist gaps at the back', 'Tight through the thighs', 'Tight through the seat', 'Rise too low', 'Rise too high'] },
    { k: 'fit_jackets', type: 'chips', multi: true, other: true, label: 'Jackets & blazers',
      opts: ['Shoulders too wide', 'Sleeves too long', 'Won’t button comfortably', 'Too boxy'] },
    { k: 'fit_dresses', type: 'chips', multi: true, other: true, label: 'Dresses & skirts',
      opts: ['Waist sits in the wrong place', 'Tight at the hips', 'Bust doesn’t fit', 'Too short', 'Too long'] },
    { k: 'fit_notes', type: 'textarea', optional: true, label: 'Anything else about fit we should know?', ph: 'e.g. I’m petite, so most things need shortening…' }
  ] },
  { id: 'colours', title: 'Colours & fabrics', intro: 'Bring your colour analysis to life in fabric.', fields: [
    { k: 'season', type: 'select', label: 'Your season', hint: 'From your YourSZN colour analysis.', opts: ['Not done yet', 'Not sure'].concat(VW_SEASONS) },
    { k: 'colours_love', type: 'text', label: 'Colours you love wearing', ph: 'e.g. Olive, camel, cream, rust' },
    { k: 'colours_avoid', type: 'text', label: 'Colours you avoid', ph: 'e.g. Black near my face, bright pink' },
    { k: 'fabrics_love', type: 'chips', multi: true, other: true, label: 'Fabrics you love', opts: ['Linen', 'Cotton', 'Silk', 'Wool', 'Cashmere', 'Denim', 'Leather', 'Velvet'] },
    { k: 'fabrics_dislike', type: 'chips', multi: true, other: true, label: 'Fabrics you dislike', opts: ['Itchy', 'Too hot', 'Creases easily', 'Clingy', 'Stiff', 'See-through', 'Synthetic feel'] }
  ] },
  { id: 'priorities', title: 'Gaps & priorities', intro: 'Pull it all together into a plan.', fields: [
    { k: 'gaps', type: 'gaps', label: 'Your wardrobe right now', hint: 'For each category, tap whichever fits best.',
      states: [['love', 'Have & love'], ['replace', 'Needs replacing'], ['missing', 'Missing']] },
    { type: 'musts', label: 'Your top 3 must-have pieces', hint: 'The pieces you’d be most disappointed to go home without.' },
    { k: 'piece_count', type: 'stepper', label: 'Roughly how many pieces would you like made?', min: 0, max: 40 }
  ] }
];

var VW = { loaded: false, loading: false, answers: {}, photos: [], step: 0, completed: null, view: 'steps', sub: null, saveT: null, uploading: 0 };

/* ── API ── */
function vwApi(body) {
  body.cid = qs('cid'); body.email = dashClient && dashClient.email;
  return fetch('/api/vietnam-wardrobe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(function(r) { return r.json().then(function(d) { if (!r.ok || !d.ok) throw new Error((d && d.error) || 'Request failed'); return d; }); });
}

function vwLoad() {
  if (VW.loaded || VW.loading) return Promise.resolve();
  VW.loading = true;
  return vwApi({ op: 'get' }).then(function(d) {
    var p = d.plan;
    if (p) {
      VW.answers = p.answers || {}; VW.photos = p.photos || []; VW.step = Math.min(p.step || 0, VW_STEPS.length - 1);
      VW.completed = p.completed_at || null;
      if (VW.completed) VW.view = 'brief';
    }
    VW.loaded = true;
  }).catch(function(e) { console.error(e); VW.loadError = true; }).then(function() { VW.loading = false; });
}

function vwSave(extra) {
  clearTimeout(VW.saveT);
  var body = { op: 'save', answers: VW.answers, photos: VW.photos.map(function(p) { return { path: p.path, category: p.category, why: p.why, note: p.note, copy: p.copy }; }), step: VW.step };
  if (extra) Object.keys(extra).forEach(function(k) { body[k] = extra[k]; });
  return vwApi(body).then(function(d) { flashSaved(); return d; }).catch(function(e) { showToast(e.message || 'Couldn’t save — check your connection', true); });
}
function vwSaveSoon() { clearTimeout(VW.saveT); VW.saveT = setTimeout(vwSave, 700); }

/* ── Tailoring subtabs ── */
function vwSubtabsHTML() {
  var done = !!VW.completed;
  return '<div class="rec-subtabs tl-subtabs">'
    + '<button class="rec-subtab' + (VW.sub === 'wardrobe' ? ' on' : '') + '" onclick="vwSetSub(\'wardrobe\')">Wardrobe &amp; Planning' + (done ? ' <span class="vw-tick">✓</span>' : '') + '</button>'
    + '<button class="rec-subtab' + (VW.sub === 'board' ? ' on' : '') + '" onclick="vwSetSub(\'board\')">Inspiration Board</button>'
    + '</div>';
}

function vwSetSub(s) {
  VW.sub = s;
  var bar = document.getElementById('tl-subtabs'); if (bar) bar.innerHTML = vwSubtabsHTML();
  var w = document.getElementById('tl-wardrobe'), b = document.getElementById('tl-board');
  if (w) w.style.display = s === 'wardrobe' ? '' : 'none';
  if (b) b.style.display = s === 'board' ? '' : 'none';
  if (s === 'board') initTailoringBoard();
  else vwRender();
}

// Called whenever the Tailoring tab opens.
function vwShow() {
  vwLoad().then(function() {
    if (!VW.sub) VW.sub = VW.completed ? 'board' : 'wardrobe';
    vwSetSub(VW.sub);
  });
}

/* ── Intro-tab reminder ── */
function vwReminderRefresh() {
  vwLoad().then(function() {
    var el = document.getElementById('vw-reminder'); if (!el) return;
    if (VW.completed || VW.loadError) { el.innerHTML = ''; return; }
    var started = Object.keys(VW.answers || {}).length > 0 || VW.photos.length > 0;
    el.innerHTML = '<div class="vw-remind"><div><div class="vw-remind-t">' + (started ? 'Finish your tailoring questionnaire' : 'Start your tailoring questionnaire') + '</div>'
      + '<div class="vw-remind-s">About 10 minutes. It helps us plan your pieces before your consultations.</div></div>'
      + '<button class="vw-btn" onclick="setTab(\'tailoring\');vwSetSub(\'wardrobe\')">' + (started ? 'Continue' : 'Start') + ' →</button></div>';
  });
}

/* ── Rendering ── */
function vwE(v) { return recEsc(v == null ? '' : String(v)); }

function vwRender() {
  var el = document.getElementById('tl-wardrobe'); if (!el) return;
  if (!VW.loaded) { el.innerHTML = VW.loadError ? '<div class="empty">Couldn’t load your questionnaire. Please refresh and try again.</div>' : '<div class="empty">Loading…</div>'; return; }
  el.innerHTML = VW.view === 'brief' ? vwBriefHTML() : vwStepHTML();
}

function vwStepHTML() {
  var s = VW_STEPS[VW.step], n = VW_STEPS.length;
  var dots = VW_STEPS.map(function(st, i) {
    return '<button type="button" class="vw-dot' + (i === VW.step ? ' on' : '') + (i < VW.step ? ' done' : '') + '" onclick="vwGo(' + i + ')" title="' + vwE(st.title) + '"><span>' + (i + 1) + '</span><em>' + vwE(st.title) + '</em></button>';
  }).join('');
  var html = '<div class="vw-wrap">'
    + '<div class="vw-head"><div class="board-header" style="margin-bottom:6px"><h1>Wardrobe &amp; Planning</h1><p>A short questionnaire so we can plan your tailoring together. Your answers save as you go.</p></div></div>'
    + '<div class="vw-steps">' + dots + '</div>'
    + '<div class="vw-card"><div class="vw-eyebrow">Step ' + (VW.step + 1) + ' of ' + n + '</div><h2 class="vw-title">' + vwE(s.title) + '</h2>'
    + (s.intro ? '<p class="vw-intro">' + vwE(s.intro) + '</p>' : '')
    + s.fields.map(vwFieldHTML).join('')
    + '<div class="vw-nav">'
    + (VW.step > 0 ? '<button type="button" class="vw-btn ghost" onclick="vwGo(' + (VW.step - 1) + ')">← Back</button>' : '<span></span>')
    + (VW.step < n - 1 ? '<button type="button" class="vw-btn" onclick="vwGo(' + (VW.step + 1) + ')">Next →</button>'
                      : '<button type="button" class="vw-btn" onclick="vwFinish()">See my tailoring brief →</button>')
    + '</div></div>'
    + (VW.completed ? '<div style="text-align:center;margin-top:12px"><button type="button" class="vw-link" onclick="vwShowBrief()">Back to my brief</button></div>' : '')
    + '</div>';
  return html;
}

function vwFieldHTML(f) {
  var a = VW.answers, lbl = f.label ? '<div class="vw-lbl">' + vwE(f.label) + (f.optional ? ' <span>(optional)</span>' : '') + '</div>' : '';
  var hint = f.hint ? '<div class="vw-hint">' + vwE(f.hint) + '</div>' : '';
  if (f.type === 'chips') {
    var cur = a[f.k], sel = f.multi ? (Array.isArray(cur) ? cur : []) : cur;
    var chips = f.opts.map(function(o) {
      var on = f.multi ? sel.indexOf(o) !== -1 : sel === o;
      return '<button type="button" class="vw-chip' + (on ? ' on' : '') + '" onclick="vwChip(\'' + f.k + '\',' + vwQ(o) + ')">' + vwE(o) + '</button>';
    }).join('');
    var otherOn = f.other && a[f.k + '_other_on'];
    if (f.other) chips += '<button type="button" class="vw-chip' + (otherOn ? ' on' : '') + '" onclick="vwOther(\'' + f.k + '\')">Other</button>';
    return '<div class="vw-field">' + lbl + hint + (f.max ? '<div class="vw-hint">' + (sel ? sel.length : 0) + ' of ' + f.max + ' picked</div>' : '')
      + '<div class="vw-chips">' + chips + '</div>'
      + (otherOn ? '<input class="vw-inp" style="margin-top:8px" placeholder="Tell us…" value="' + vwE(a[f.k + '_other']) + '" oninput="vwSet(\'' + f.k + '_other\',this.value)">' : '')
      + '</div>';
  }
  if (f.type === 'text') return '<div class="vw-field">' + lbl + hint + '<input class="vw-inp" placeholder="' + vwE(f.ph) + '" value="' + vwE(a[f.k]) + '" oninput="vwSet(\'' + f.k + '\',this.value)"></div>';
  if (f.type === 'textarea') return '<div class="vw-field">' + lbl + hint + '<textarea class="vw-inp" rows="3" placeholder="' + vwE(f.ph) + '" oninput="vwSet(\'' + f.k + '\',this.value)">' + vwE(a[f.k]) + '</textarea></div>';
  if (f.type === 'select') {
    return '<div class="vw-field">' + lbl + hint + '<select class="vw-inp" onchange="vwSet(\'' + f.k + '\',this.value)"><option value="">Select…</option>'
      + f.opts.map(function(o) { return '<option' + (a[f.k] === o ? ' selected' : '') + '>' + vwE(o) + '</option>'; }).join('') + '</select></div>';
  }
  if (f.type === 'split') {
    var w = a[f.k] || {}, tot = 0;
    f.opts.forEach(function(o) { tot += +w[o[0]] || 0; });
    return '<div class="vw-field">' + lbl + hint + '<div class="vw-split">' + f.opts.map(function(o) {
      var v = +w[o[0]] || 0, pct = tot ? Math.round(v / tot * 100) : 0;
      return '<label class="vw-split-row"><span class="vw-split-l">' + vwE(o[1]) + '</span>'
        + '<input type="range" min="0" max="10" step="1" value="' + v + '" oninput="vwSplit(\'' + f.k + '\',\'' + o[0] + '\',this.value)">'
        + '<span class="vw-split-p" id="vwp-' + o[0] + '">' + pct + '%</span></label>';
    }).join('') + '</div></div>';
  }
  if (f.type === 'stepper') {
    var n = +a[f.k] || 0;
    return '<div class="vw-field">' + lbl + '<div class="vw-stepper"><button type="button" onclick="vwStep(\'' + f.k + '\',-1,' + f.min + ',' + f.max + ')">−</button>'
      + '<span id="vws-' + f.k + '">' + (n || '—') + '</span><button type="button" onclick="vwStep(\'' + f.k + '\',1,' + f.min + ',' + f.max + ')">+</button></div></div>';
  }
  if (f.type === 'gaps') {
    var g = a[f.k] || {};
    return '<div class="vw-field">' + lbl + hint + '<div class="vw-gaps">' + VW_CATS.map(function(c) {
      return '<div class="vw-gap-row"><span class="vw-gap-c">' + vwE(c) + '</span><span class="vw-gap-opts">' + f.states.map(function(st) {
        return '<button type="button" class="vw-chip sm' + (g[c] === st[0] ? ' on' : '') + ' st-' + st[0] + '" onclick="vwGap(\'' + f.k + '\',' + vwQ(c) + ',\'' + st[0] + '\')">' + vwE(st[1]) + '</button>';
      }).join('') + '</span></div>';
    }).join('') + '</div></div>';
  }
  if (f.type === 'musts') {
    var m = Array.isArray(a.musts) ? a.musts : [];
    var rows = [0, 1, 2].map(function(i) {
      var r = m[i] || {};
      return '<div class="vw-must"><span class="vw-must-n">' + (i + 1) + '</span>'
        + '<select class="vw-inp" onchange="vwMust(' + i + ',\'category\',this.value)"><option value="">Category…</option>'
        + VW_CATS.map(function(c) { return '<option' + (r.category === c ? ' selected' : '') + '>' + vwE(c) + '</option>'; }).join('') + '</select>'
        + '<input class="vw-inp" placeholder="e.g. Navy linen wide-leg trousers" value="' + vwE(r.text) + '" oninput="vwMust(' + i + ',\'text\',this.value)"></div>';
    }).join('');
    return '<div class="vw-field">' + lbl + hint + rows + '</div>';
  }
  if (f.type === 'photos') {
    var tiles = VW.photos.map(function(p, i) {
      return '<div class="vw-ph">'
        + '<div class="vw-ph-img"' + (p.url ? ' style="background-image:url(\'' + String(p.url).replace(/'/g, '%27') + '\')"' : '') + '>' + (p.url ? '' : 'Uploading…')
        + '<button type="button" class="vw-ph-x" onclick="vwPhotoDel(' + i + ')" aria-label="Remove">×</button></div>'
        + '<div class="vw-ph-body">'
        + '<select class="vw-inp sm" onchange="vwPhoto(' + i + ',\'category\',this.value)"><option value="">What is it?</option>'
        + VW_CATS.map(function(c) { return '<option' + (p.category === c ? ' selected' : '') + '>' + vwE(c) + '</option>'; }).join('') + '</select>'
        + '<div class="vw-hint" style="margin:8px 0 4px">Why it works</div><div class="vw-chips">'
        + ['Fit', 'Fabric', 'Colour', 'Comfort', 'Versatile', 'Confidence'].map(function(w) {
          return '<button type="button" class="vw-chip sm' + ((p.why || []).indexOf(w) !== -1 ? ' on' : '') + '" onclick="vwPhotoWhy(' + i + ',' + vwQ(w) + ')">' + w + '</button>';
        }).join('') + '</div>'
        + '<input class="vw-inp sm" style="margin-top:8px" placeholder="Anything else? (optional)" value="' + vwE(p.note) + '" oninput="vwPhoto(' + i + ',\'note\',this.value)">'
        + '<div class="vw-hint" style="margin:8px 0 4px">Would you like it copied?</div><div class="vw-chips">'
        + [['exact', 'Exactly'], ['changes', 'With changes'], ['no', 'No']].map(function(c) {
          return '<button type="button" class="vw-chip sm' + (p.copy === c[0] ? ' on' : '') + '" onclick="vwPhoto(' + i + ',\'copy\',\'' + c[0] + '\',true)">' + c[1] + '</button>';
        }).join('') + '</div></div></div>';
    }).join('');
    var add = VW.photos.length < 6
      ? '<label class="vw-ph vw-ph-add"><input type="file" accept="image/*" multiple style="display:none" onchange="vwPhotoAdd(this)"><span>+</span>Add photo' + (VW.photos.length ? '' : 's') + '</label>' : '';
    return '<div class="vw-field">' + lbl + hint + '<div class="vw-phs">' + tiles + add + '</div></div>';
  }
  return '';
}

function vwQ(s) { return '\'' + String(s).replace(/\\/g, '\\\\').replace(/'/g, '\\\'') + '\''; }

/* ── Field handlers ── */
function vwSet(k, v) { VW.answers[k] = v; vwSaveSoon(); }

function vwChip(k, o) {
  var f = null; VW_STEPS.forEach(function(s) { s.fields.forEach(function(x) { if (x.k === k) f = x; }); });
  if (f && f.multi) {
    var arr = Array.isArray(VW.answers[k]) ? VW.answers[k].slice() : [], i = arr.indexOf(o);
    if (i !== -1) arr.splice(i, 1);
    else { if (f.max && arr.length >= f.max) { showToast('Pick up to ' + f.max + ' — untick one first', true); return; } arr.push(o); }
    VW.answers[k] = arr;
  } else VW.answers[k] = VW.answers[k] === o ? '' : o;
  vwSaveSoon(); vwRender();
}

function vwOther(k) { VW.answers[k + '_other_on'] = !VW.answers[k + '_other_on']; if (!VW.answers[k + '_other_on']) VW.answers[k + '_other'] = ''; vwSaveSoon(); vwRender(); }

function vwSplit(k, part, v) {
  var w = Object.assign({}, VW.answers[k] || {}); w[part] = +v; VW.answers[k] = w;
  var tot = 0; Object.keys(w).forEach(function(x) { tot += +w[x] || 0; });
  Object.keys(w).forEach(function(x) { var el = document.getElementById('vwp-' + x); if (el) el.textContent = (tot ? Math.round((+w[x] || 0) / tot * 100) : 0) + '%'; });
  vwSaveSoon();
}

function vwStep(k, d, min, max) {
  var n = Math.max(min, Math.min(max, (+VW.answers[k] || 0) + d)); VW.answers[k] = n;
  var el = document.getElementById('vws-' + k); if (el) el.textContent = n || '—';
  vwSaveSoon();
}

function vwGap(k, c, st) { var g = Object.assign({}, VW.answers[k] || {}); g[c] = g[c] === st ? '' : st; VW.answers[k] = g; vwSaveSoon(); vwRender(); }

function vwMust(i, field, v) {
  var m = Array.isArray(VW.answers.musts) ? VW.answers.musts.slice() : [];
  while (m.length < 3) m.push({});
  m[i] = Object.assign({}, m[i]); m[i][field] = v;
  if (field === 'text' || field === 'category') delete m[i].added;   // edited → can be added again
  VW.answers.musts = m; vwSaveSoon();
}

function vwGo(i) {
  VW.step = Math.max(0, Math.min(VW_STEPS.length - 1, i)); VW.view = 'steps';
  vwSave(); vwRender();
  var el = document.getElementById('tl-wardrobe');
  if (el) { var top = el.getBoundingClientRect().top + window.scrollY - 16; if (window.scrollY > top) window.scrollTo({ top: top }); }
}

function vwFinish() {
  VW.view = 'brief';
  vwSave({ complete: true }).then(function(d) {
    VW.completed = (d && d.completed_at) || new Date().toISOString();
    var bar = document.getElementById('tl-subtabs'); if (bar) bar.innerHTML = vwSubtabsHTML();
    vwReminderRefresh();
  });
  vwRender(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function vwShowBrief() { VW.view = 'brief'; vwRender(); }

/* ── Photos ── */
function vwResize(file) {
  return new Promise(function(resolve) {
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function() {
      var max = 1600, s = Math.min(1, max / Math.max(img.width, img.height));
      var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(function(b) { resolve(b || file); }, 'image/jpeg', 0.85);
    };
    img.onerror = function() { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function vwPhotoAdd(input) {
  var files = Array.prototype.slice.call(input.files || [], 0, 6 - VW.photos.length);
  input.value = '';
  files.forEach(function(file) {
    var path = 'wardrobe/' + qs('cid') + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.jpg';
    var entry = { path: path, url: '', category: '', why: [], note: '', copy: '' };
    VW.photos.push(entry); VW.uploading++; vwRender();
    vwResize(file).then(function(blob) {
      return fetch(SUPABASE_URL + '/storage/v1/object/inspiration-photos/' + path, {
        method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'image/jpeg' }, body: blob
      }).then(function(r) { if (!r.ok) throw new Error('Upload failed'); entry.url = URL.createObjectURL(blob); vwSave(); });
    }).catch(function() {
      VW.photos.splice(VW.photos.indexOf(entry), 1); showToast('That photo didn’t upload — try again', true);
    }).then(function() { VW.uploading--; vwRender(); });
  });
}

function vwPhoto(i, field, v, rerender) { var p = VW.photos[i]; if (!p) return; p[field] = (field === 'copy' && p.copy === v) ? '' : v; vwSaveSoon(); if (rerender) vwRender(); }
function vwPhotoWhy(i, w) { var p = VW.photos[i]; if (!p) return; p.why = p.why || []; var k = p.why.indexOf(w); if (k === -1) p.why.push(w); else p.why.splice(k, 1); vwSaveSoon(); vwRender(); }
function vwPhotoDel(i) {
  var p = VW.photos[i]; if (!p || !confirm('Remove this photo?')) return;
  VW.photos.splice(i, 1); vwRender(); vwSave();
  vwApi({ op: 'deletePhoto', path: p.path }).catch(function() {});
}

/* ── Brief ── */
function vwList(arr, other) { var a = (Array.isArray(arr) ? arr : []).slice(); if (other) a.push(other); return a; }
function vwRow(label, val) { return val ? '<div class="vw-b-row"><div class="vw-b-l">' + vwE(label) + '</div><div class="vw-b-v">' + val + '</div></div>' : ''; }
function vwJoin(arr) { return arr.length ? arr.map(vwE).join(' · ') : ''; }

function vwBriefHTML() {
  var a = VW.answers;
  var sec = function(title, body, step) {
    return '<div class="vw-b-sec"><div class="vw-b-h"><span>' + vwE(title) + '</span><button type="button" class="vw-link" onclick="vwGo(' + step + ')">Edit</button></div>'
      + (body || '<div class="vw-hint">Nothing added yet.</div>') + '</div>';
  };
  var week = '';
  if (a.week) {
    var tot = 0; Object.keys(a.week).forEach(function(x) { tot += +a.week[x] || 0; });
    if (tot) week = VW_STEPS[0].fields[1].opts.filter(function(o) { return +a.week[o[0]]; })
      .map(function(o) { return vwE(o[1]) + ' ' + Math.round(a.week[o[0]] / tot * 100) + '%'; }).join(' · ');
  }
  var gaps = '';
  if (a.gaps) {
    var by = { missing: [], replace: [], love: [] };
    VW_CATS.forEach(function(c) { if (by[a.gaps[c]]) by[a.gaps[c]].push(c); });
    gaps = vwRow('Missing', vwJoin(by.missing)) + vwRow('Needs replacing', vwJoin(by.replace)) + vwRow('Have & love', vwJoin(by.love));
  }
  var musts = (Array.isArray(a.musts) ? a.musts : []).map(function(m, i) {
    if (!m || (!m.text && !m.category)) return '';
    return '<div class="vw-b-must"><span class="vw-must-n">' + (i + 1) + '</span><div style="flex:1"><b>' + vwE(m.text || m.category) + '</b>'
      + (m.text && m.category ? '<div class="vw-hint">' + vwE(m.category) + '</div>' : '') + '</div>'
      + (m.added ? '<span class="vw-added">On your board ✓</span>'
        : (m.category ? '<button type="button" class="vw-btn sm" onclick="vwAddToBoard(' + i + ')">Add to Inspiration Board</button>' : '<span class="vw-hint">Pick a category to add it to your board</span>'))
      + '</div>';
  }).join('');
  var photos = VW.photos.length ? '<div class="vw-b-phs">' + VW.photos.map(function(p) {
    return '<div class="vw-b-ph"><div class="vw-ph-img"' + (p.url ? ' style="background-image:url(\'' + String(p.url).replace(/'/g, '%27') + '\')"' : '') + '></div>'
      + '<div class="vw-b-ph-t"><b>' + vwE(p.category || 'Favourite piece') + '</b>' + (p.why && p.why.length ? '<br>' + vwJoin(p.why) : '')
      + (p.copy ? '<br><i>' + { exact: 'Copy exactly', changes: 'Copy with changes', no: 'Don’t copy' }[p.copy] + '</i>' : '') + '</div></div>';
  }).join('') + '</div>' : '';
  var fits = [['Tops & shirts', 'fit_tops'], ['Trousers & shorts', 'fit_trousers'], ['Jackets & blazers', 'fit_jackets'], ['Dresses & skirts', 'fit_dresses']]
    .map(function(x) { return vwRow(x[0], vwJoin(vwList(a[x[1]], a[x[1] + '_other']))); }).join('') + vwRow('Notes', vwE(a.fit_notes));

  return '<div class="vw-wrap">'
    + '<div class="vw-brief-hero"><div class="vw-eyebrow">' + (VW.completed ? 'Questionnaire complete ✓' : 'Your answers so far') + '</div>'
    + '<h2 class="vw-title" style="font-size:26px">Your tailoring brief</h2>'
    + '<p class="vw-intro">Here’s everything in one place. We’ll go through it together in your pre-trip consultations. You can edit any section, any time.</p></div>'
    + sec('Must-haves', (musts || '') + vwRow('Pieces to have made', a.piece_count ? vwE(a.piece_count) : '') + gaps, 5)
    + sec('Lifestyle', vwRow('Work wear', vwJoin(vwList(a.dress_code))) + vwRow('Your week', week) + vwRow('Climate at home', vwE(a.climate))
        + vwRow('Coming up', vwJoin(vwList(a.occasions, a.occasions_other))), 0)
    + sec('Style', vwRow('In 3 words', vwJoin(vwList(a.style_words))) + vwRow('Want to feel', vwE(a.feel)) + vwRow('References', vwE(a.references)), 1)
    + sec('Pieces you love', photos + vwRow('Never worn because of', vwJoin(vwList(a.never_wear))) + vwRow('More detail', vwE(a.never_wear_note)), 2)
    + sec('Fit problems', fits, 3)
    + sec('Colours & fabrics', vwRow('Season', vwE(a.season)) + vwRow('Love wearing', vwE(a.colours_love)) + vwRow('Avoid', vwE(a.colours_avoid))
        + vwRow('Fabrics you love', vwJoin(vwList(a.fabrics_love, a.fabrics_love_other))) + vwRow('Fabrics you dislike', vwJoin(vwList(a.fabrics_dislike, a.fabrics_dislike_other))), 4)
    + '<div style="text-align:center;margin-top:18px"><button type="button" class="vw-btn" onclick="vwSetSub(\'board\')">Go to your Inspiration Board →</button></div>'
    + '</div>';
}

function vwAddToBoard(i) {
  var m = (VW.answers.musts || [])[i]; if (!m || !m.category) return;
  Promise.resolve(initTailoringBoard()).then(function() {
    if (!currentClient) throw new Error('Board not ready');
    return sb('inspiration_items', { method: 'POST', prefer: 'return=representation',
      body: JSON.stringify({ client_id: currentClient.id, category: m.category, sort_order: (boardItems || []).length,
        prompt_love: m.text || '', prompt_priority: 'Must-have' }) });
  }).then(function() {
    VW.answers.musts[i] = Object.assign({}, m, { added: true });
    vwSave(); vwRender(); showToast('Added to your Inspiration Board');
    if (typeof loadItems === 'function' && currentClient) loadItems().catch(function() {});
  }).catch(function() { showToast('Couldn’t add it — try again', true); });
}
