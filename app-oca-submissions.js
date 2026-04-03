// ═══════════════════════════════════════════════════════════════
// CLIENT SUBMISSIONS — Online Colour Analysis
// ═══════════════════════════════════════════════════════════════

var ocaSubList = [];
var ocaSubView = 'list';      // 'list' or 'detail'
var ocaSubDetail = null;       // current submission being viewed
var ocaSubDetailNotes = [];
var ocaSubDetailResults = [];
var ocaSubDetailPhotos = [];
var ocaSubFilter = 'all';      // 'all','pending','in_progress','complete','sent'
var ocaSubLoading = false;

var OCA_SUB_STATUSES = [
  { value: 'pending',     label: 'New',         colour: '#E07020', bg: '#FFF3EB' },
  { value: 'in_progress', label: 'In Progress', colour: '#5588DD', bg: '#EBF2FF' },
  { value: 'complete',    label: 'Complete',     colour: '#44AA66', bg: '#EDFBF2' },
  { value: 'sent',        label: 'Sent',         colour: '#888',    bg: '#F4F4F4' }
];

function ocaSubStatusBadge(status) {
  var s = OCA_SUB_STATUSES.find(function(x){ return x.value === status; }) ||
          { label: status || 'New', colour: '#888', bg: '#F4F4F4' };
  return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;'
    + 'font-weight:700;letter-spacing:.3px;color:' + s.colour + ';background:' + s.bg + '">'
    + s.label + '</span>';
}

function ocaSubFormatDate(d) {
  if (!d) return '—';
  var dt = new Date(d);
  var day = dt.getDate();
  var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()];
  var yr = dt.getFullYear();
  return day + ' ' + mon + ' ' + yr;
}

function ocaSubTimeAgo(d) {
  if (!d) return '';
  var now = new Date();
  var dt = new Date(d);
  var diff = Math.floor((now - dt) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff/86400) + 'd ago';
  return ocaSubFormatDate(d);
}

// ── Load submissions from Supabase ──────────────────────────
async function ocaSubLoadList() {
  var db = getSupa();
  if (!db) return;
  ocaSubLoading = true;
  renderOcaSubmissions();
  try {
    var query = db.from('szn_submissions').select('*').order('created_at', { ascending: false });
    if (ocaSubFilter !== 'all') {
      query = query.eq('status', ocaSubFilter);
    }
    var res = await query;
    if (res.error) throw res.error;
    ocaSubList = res.data || [];
  } catch(e) {
    console.warn('Failed to load submissions:', e);
    ocaSubList = [];
  }
  ocaSubLoading = false;
  renderOcaSubmissions();
}

// ── Load single submission detail + notes + results ─────────
async function ocaSubLoadDetail(id) {
  var db = getSupa();
  if (!db) return;
  ocaSubView = 'detail';
  ocaSubLoading = true;
  renderOcaSubmissions();
  try {
    var subRes = await db.from('szn_submissions').select('*').eq('id', id).single();
    if (subRes.error) throw subRes.error;
    ocaSubDetail = subRes.data;

    var notesRes = await db.from('szn_notes').select('*').eq('submission_id', id).order('created_at', { ascending: false });
    ocaSubDetailNotes = (notesRes.data || []);

    var resultsRes = await db.from('szn_results').select('*').eq('submission_id', id).order('created_at', { ascending: false });
    ocaSubDetailResults = (resultsRes.data || []);

    var photosRes = await db.from('szn_photos').select('*').eq('submission_id', id).order('uploaded_at', { ascending: true });
    ocaSubDetailPhotos = (photosRes.data || []);
  } catch(e) {
    console.warn('Failed to load submission detail:', e);
  }
  ocaSubLoading = false;
  renderOcaSubmissions();
}

// ── Update status ───────────────────────────────────────────
async function ocaSubSetStatus(id, status) {
  var db = getSupa();
  if (!db) return;
  try {
    await db.from('szn_submissions').update({ status: status, updated_at: new Date().toISOString() }).eq('id', id);
    if (ocaSubDetail && ocaSubDetail.id === id) {
      ocaSubDetail.status = status;
    }
    // Also update in list cache
    var item = ocaSubList.find(function(s){ return s.id === id; });
    if (item) item.status = status;
    renderOcaSubmissions();
  } catch(e) {
    console.warn('Failed to update status:', e);
    alert('Failed to update status. Please try again.');
  }
}

// ── Add note ────────────────────────────────────────────────
async function ocaSubAddNote(submissionId) {
  var textarea = document.getElementById('oca-sub-note-input');
  if (!textarea) return;
  var text = textarea.value.trim();
  if (!text) return;
  var db = getSupa();
  if (!db) return;
  try {
    var res = await db.from('szn_notes').insert({
      submission_id: submissionId,
      note: text,
      author: 'analyst'
    }).select().single();
    if (res.error) throw res.error;
    ocaSubDetailNotes.unshift(res.data);
    textarea.value = '';
    renderOcaSubmissions();
  } catch(e) {
    console.warn('Failed to add note:', e);
    alert('Failed to save note. Please try again.');
  }
}

// ── Delete note ─────────────────────────────────────────────
async function ocaSubDeleteNote(noteId) {
  if (!confirm('Delete this note?')) return;
  var db = getSupa();
  if (!db) return;
  try {
    await db.from('szn_notes').delete().eq('id', noteId);
    ocaSubDetailNotes = ocaSubDetailNotes.filter(function(n){ return n.id !== noteId; });
    renderOcaSubmissions();
  } catch(e) {
    console.warn('Failed to delete note:', e);
  }
}

// ── Upload result file ──────────────────────────────────────
async function ocaSubUploadFile(submissionId) {
  var input = document.getElementById('oca-sub-file-input');
  if (!input || !input.files || !input.files[0]) return;
  var file = input.files[0];
  var db = getSupa();
  if (!db) return;

  var filePath = submissionId + '/' + Date.now() + '_' + file.name;

  try {
    // Upload to storage
    var uploadRes = await db.storage.from('online-clients-submissions').upload(filePath, file);
    if (uploadRes.error) throw uploadRes.error;

    // Get public URL
    var urlRes = db.storage.from('online-clients-submissions').getPublicUrl(filePath);
    var publicUrl = urlRes.data.publicUrl;

    // Save record
    var rec = await db.from('szn_results').insert({
      submission_id: submissionId,
      file_name: file.name,
      file_url: publicUrl,
      file_type: file.type || 'application/octet-stream',
      uploaded_by: 'analyst'
    }).select().single();
    if (rec.error) throw rec.error;

    ocaSubDetailResults.unshift(rec.data);
    input.value = '';
    renderOcaSubmissions();
  } catch(e) {
    console.warn('Failed to upload file:', e);
    alert('Failed to upload file. Please try again.');
  }
}

// ── Delete result file ──────────────────────────────────────
async function ocaSubDeleteFile(resultId, fileUrl) {
  if (!confirm('Delete this result file?')) return;
  var db = getSupa();
  if (!db) return;
  try {
    // Extract path from URL for storage deletion
    var pathMatch = fileUrl.match(/online-clients-submissions\/(.+)$/);
    if (pathMatch) {
      await db.storage.from('online-clients-submissions').remove([pathMatch[1]]);
    }
    await db.from('szn_results').delete().eq('id', resultId);
    ocaSubDetailResults = ocaSubDetailResults.filter(function(r){ return r.id !== resultId; });
    renderOcaSubmissions();
  } catch(e) {
    console.warn('Failed to delete file:', e);
  }
}

// ── Back to list ────────────────────────────────────────────
function ocaSubBackToList() {
  ocaSubView = 'list';
  ocaSubDetail = null;
  ocaSubDetailNotes = [];
  ocaSubDetailResults = [];
  ocaSubDetailPhotos = [];
  ocaSubLoadList();
}

// ── Set filter ──────────────────────────────────────────────
function ocaSubSetFilter(f) {
  ocaSubFilter = f;
  ocaSubLoadList();
}

// ── Delete submission ───────────────────────────────────────
async function ocaSubDelete(id) {
  if (!confirm('Permanently delete this submission and all its notes/results?')) return;
  var db = getSupa();
  if (!db) return;
  try {
    // Delete related notes and results first
    await db.from('szn_notes').delete().eq('submission_id', id);
    await db.from('szn_results').delete().eq('submission_id', id);
    await db.from('szn_photos').delete().eq('submission_id', id);
    await db.from('szn_submissions').delete().eq('id', id);
    ocaSubBackToList();
  } catch(e) {
    console.warn('Failed to delete submission:', e);
    alert('Failed to delete. Please try again.');
  }
}

// ═══════════════════════════════════════════════════════════════
// RENDER — Master
// ═══════════════════════════════════════════════════════════════

function renderOcaSubmissions() {
  var content = document.getElementById('oca-content');
  if (!content) return;

  if (ocaSubLoading) {
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--muted);font-size:14px">'
      + '<div style="margin-bottom:12px;font-size:24px">⏳</div>Loading submissions…</div>';
    return;
  }

  if (ocaSubView === 'detail' && ocaSubDetail) {
    content.innerHTML = renderOcaSubDetail();
  } else {
    content.innerHTML = renderOcaSubList();
  }
}

// ═══════════════════════════════════════════════════════════════
// RENDER — List view
// ═══════════════════════════════════════════════════════════════

function renderOcaSubList() {
  // Filter tabs
  var filters = [{ value:'all', label:'All' }].concat(OCA_SUB_STATUSES);
  var filterHtml = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px">'
    + filters.map(function(f) {
        var active = ocaSubFilter === f.value;
        return '<button class="btn btns" style="font-size:11px;padding:5px 14px;'
          + (active ? 'background:var(--charcoal);color:#fff;' : '')
          + '" onclick="ocaSubSetFilter(\'' + f.value + '\')">' + f.label + '</button>';
      }).join('')
    + '</div>';

  // Stats summary
  var total = ocaSubList.length;
  var statsHtml = '<div style="font-size:12px;color:var(--muted);margin-bottom:16px">'
    + total + ' submission' + (total !== 1 ? 's' : '')
    + (ocaSubFilter !== 'all' ? ' (' + ocaSubFilter.replace('_',' ') + ')' : '')
    + '</div>';

  if (total === 0) {
    return filterHtml + statsHtml
      + '<div style="text-align:center;padding:60px;color:var(--muted);font-size:14px">'
      + '<div style="font-size:32px;margin-bottom:12px">📋</div>'
      + 'No submissions yet.<br><span style="font-size:12px">Client questionnaire responses will appear here.</span>'
      + '</div>';
  }

  // Submission cards
  var cards = ocaSubList.map(function(sub) {
    var name = sub.full_name || 'Unnamed';
    var initials = name.split(' ').map(function(w){ return w[0]; }).join('').toUpperCase().slice(0,2);
    return '<div onclick="ocaSubLoadDetail(\'' + sub.id + '\')" style="display:flex;align-items:center;gap:14px;'
      + 'padding:14px 18px;border-radius:12px;cursor:pointer;transition:background .15s;'
      + 'border:1px solid rgba(0,0,0,0.06);margin-bottom:8px;background:#fff" '
      + 'onmouseover="this.style.background=\'var(--sand)\'" onmouseout="this.style.background=\'#fff\'">'
      // Avatar
      + '<div style="width:40px;height:40px;border-radius:50%;background:var(--rose);color:#fff;'
      + 'display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0">'
      + initials + '</div>'
      // Info
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:14px;font-weight:700;color:var(--charcoal);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + name + '</div>'
      + '<div style="font-size:12px;color:var(--muted);margin-top:2px">'
      + (sub.email || '') + (sub.predicted_season ? ' · Predicts: ' + sub.predicted_season : '')
      + '</div>'
      + '</div>'
      // Status + date
      + '<div style="text-align:right;flex-shrink:0">'
      + ocaSubStatusBadge(sub.status)
      + (sub.revised_photos_at ? '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:#C47272;color:#fff;margin-left:6px">📸 Revised</span>' : '')
      + '<div style="font-size:11px;color:var(--muted);margin-top:4px">' + ocaSubFormatDate(sub.created_at) + '</div>'
      + '</div>'
      + '</div>';
  }).join('');

  return filterHtml + statsHtml + cards;
}

// ═══════════════════════════════════════════════════════════════
// RENDER — Detail view
// ═══════════════════════════════════════════════════════════════

function renderOcaSubDetail() {
  var s = ocaSubDetail;
  if (!s) return '';

  var html = '';

  // ── Back button + header ──
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">'
    + '<button class="btn btns" style="font-size:12px;padding:6px 16px" onclick="ocaSubBackToList()">← Back to List</button>'
    + '<div style="display:flex;gap:8px">'
    + '<button class="btn btns" style="font-size:11px;padding:5px 12px;color:#c00" onclick="ocaSubDelete(\'' + s.id + '\')">🗑 Delete</button>'
    + '</div>'
    + '</div>';

  // ── Client header card ──
  var name = s.full_name || 'Unnamed';
  var initials = name.split(' ').map(function(w){ return w[0]; }).join('').toUpperCase().slice(0,2);
  html += '<div style="background:var(--warm);border-radius:14px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:18px;flex-wrap:wrap">'
    + '<div style="width:56px;height:56px;border-radius:50%;background:var(--rose);color:#fff;'
    + 'display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;flex-shrink:0">'
    + initials + '</div>'
    + '<div style="flex:1;min-width:200px">'
    + '<div style="font-size:18px;font-weight:700;color:var(--charcoal)">' + name + '</div>'
    + '<div style="font-size:13px;color:var(--muted);margin-top:2px">'
    + [s.email, s.phone].filter(Boolean).join(' · ')
    + '</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-top:2px">'
    + 'Submitted ' + ocaSubFormatDate(s.created_at)
    + (s.age ? ' · Age ' + s.age : '')
    + (s.gender ? ' · ' + s.gender : '')
    + '</div>'
    + '</div>'
    // Status selector
    + '<div style="flex-shrink:0">'
    + '<select style="font-size:13px;padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,0.1);'
    + 'background:#fff;font-weight:600;cursor:pointer" onchange="ocaSubSetStatus(\'' + s.id + '\',this.value)">'
    + OCA_SUB_STATUSES.map(function(st){
        return '<option value="' + st.value + '"' + (s.status===st.value?' selected':'') + '>' + st.label + '</option>';
      }).join('')
    + '</select>'
    + '</div>'
    + '</div>';

  // ── Questionnaire answers ──
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;margin-bottom:20px">';

  // Personal info card
  html += ocaSubSection('👤 Personal Info', [
    { label:'Date of Birth', value: ocaSubFormatDate(s.dob) },
    { label:'Gender', value: s.gender },
    { label:'Ancestry', value: s.ancestry },
    { label:'Mother\'s Ancestry', value: s.mother_ancestry },
    { label:'Father\'s Ancestry', value: s.father_ancestry }
  ]);

  // Season predictions
  html += ocaSubSection('🔮 Season Predictions', [
    { label:'Predicted Season', value: s.predict_dont_know ? "Don't know" : s.predicted_season },
    { label:'Wanted Season', value: s.want_dont_care ? "Don't care" : s.wanted_season }
  ]);

  // Skin
  html += ocaSubSection('🧴 Skin', [
    { label:'Skin Tone', value: s.skin_tone },
    { label:'Skin Depth', value: s.skin_depth },
    { label:'Freckles (Face)', value: s.freckles_face },
    { label:'Freckles (Arms)', value: s.freckles_arms },
    { label:'Tan Reaction', value: s.tan_reaction }
  ]);

  // Eyes
  html += ocaSubSection('👁 Eyes', [
    { label:'Eye Depth', value: s.eye_depth },
    { label:'Eye Colour', value: s.eye_colour },
    { label:'Eye Whites', value: s.eye_whites }
  ]);

  // Hair
  html += ocaSubSection('💇 Hair', [
    { label:'Hair Depth', value: s.hair_depth },
    { label:'Hair Natural', value: s.hair_natural },
    { label:'Natural = Selected', value: s.hair_natural_as_selected ? 'Yes' : 'No' },
    { label:'Childhood Hair', value: s.hair_childhood },
    { label:'Early 20s Hair', value: s.hair_early_twenties_na ? 'N/A' : s.hair_early_twenties },
    { label:'Facial Hair', value: s.facial_hair },
    { label:'Hair Shades', value: s.hair_shades ? s.hair_shades.join(', ') : null }
  ]);

  // Preferences
  html += ocaSubSection('✨ Preferences', [
    { label:'Preferred Metal', value: s.preferred_metal },
    { label:'Fabric Surface', value: s.fabric_surface },
    { label:'Chosen Colours', value: s.chosen_colours ? s.chosen_colours.join(', ') : null }
  ]);

  html += '</div>';

  // Client's extra notes
  if (s.extra_notes) {
    html += '<div style="background:#fff;border-radius:12px;padding:16px 20px;margin-bottom:20px;border:1px solid rgba(0,0,0,0.06)">'
      + '<div style="font-size:12px;font-weight:700;color:var(--charcoal);letter-spacing:.5px;margin-bottom:8px">💬 CLIENT\'S NOTES</div>'
      + '<div style="font-size:13px;color:var(--charcoal);line-height:1.6;white-space:pre-wrap">' + escHtml(s.extra_notes) + '</div>'
      + '</div>';
  }

  // ── Client Photos ──────────────────────────────────────
  var originalPhotos = ocaSubDetailPhotos.filter(function(p) { return !p.is_revised; });
  var revisedPhotos = ocaSubDetailPhotos.filter(function(p) { return p.is_revised; });

  if (originalPhotos.length > 0) {
    html += '<div style="background:#fff;border-radius:12px;padding:16px 20px;margin-bottom:20px;border:1px solid rgba(0,0,0,0.06)">'
      + '<div style="font-size:12px;font-weight:700;color:var(--charcoal);letter-spacing:.5px;margin-bottom:12px">📸 CLIENT PHOTOS</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px">';
    originalPhotos.forEach(function(p) {
      var label = (p.slot_label || '').replace(/_/g, ' ');
      var isHeic = /\.(heic|heif)$/i.test(p.file_url || '');
      html += '<div style="cursor:pointer" onclick="ocaSubOpenLightbox(\'' + (p.file_url||'').replace(/'/g,"\\'") + '\',\'' + escHtml(label).replace(/'/g,"\\'") + '\')">'
        + '<img src="' + p.file_url + '" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:1px solid rgba(0,0,0,0.08)" alt="' + escHtml(label) + '"'
        + ' onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
        + '<div style="display:' + (isHeic ? 'flex' : 'none') + ';width:100%;aspect-ratio:1;border-radius:8px;border:1px solid rgba(0,0,0,0.08);background:var(--sand);align-items:center;justify-content:center;flex-direction:column;gap:4px">'
        + '<span style="font-size:20px">⚠️</span><span style="font-size:9px;color:var(--muted);font-weight:700">HEIC</span>'
        + '<a href="' + p.file_url + '" download style="font-size:9px;color:var(--rose);text-decoration:underline" onclick="event.stopPropagation()">Download</a></div>'
        + '<div style="font-size:10px;color:var(--muted);text-align:center;margin-top:3px">' + escHtml(label) + '</div>'
        + '</div>';
    });
    html += '</div></div>';
  }

  // ── Revised Photos ──────────────────────────────────────
  if (revisedPhotos.length > 0) {
    var revisedDate = s.revised_photos_at ? ocaSubFormatDate(s.revised_photos_at) : '';
    html += '<div style="background:#fff;border-radius:12px;padding:16px 20px;margin-bottom:20px;border:2px solid #C47272">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'
      + '<div style="font-size:12px;font-weight:700;color:#C47272;letter-spacing:.5px">📸 REVISED PHOTOS</div>'
      + '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:#C47272;color:#fff">' + revisedPhotos.length + '</span>'
      + (revisedDate ? '<span style="font-size:11px;color:var(--muted);margin-left:auto">' + revisedDate + '</span>' : '')
      + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px">';
    revisedPhotos.forEach(function(p) {
      var label = (p.file_name || 'Revised').replace(/_/g, ' ');
      var isHeic = /\.(heic|heif)$/i.test(p.file_url || '');
      html += '<div style="cursor:pointer" onclick="ocaSubOpenLightbox(\'' + (p.file_url||'').replace(/'/g,"\\'") + '\',\'' + escHtml(label).replace(/'/g,"\\'") + '\')">'
        + '<img src="' + p.file_url + '" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:2px solid #C47272" alt="' + escHtml(label) + '"'
        + ' onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
        + '<div style="display:' + (isHeic ? 'flex' : 'none') + ';width:100%;aspect-ratio:1;border-radius:8px;border:2px solid #C47272;background:var(--sand);align-items:center;justify-content:center;flex-direction:column;gap:4px">'
        + '<span style="font-size:20px">⚠️</span><span style="font-size:9px;color:var(--muted);font-weight:700">HEIC</span>'
        + '<a href="' + p.file_url + '" download style="font-size:9px;color:var(--rose);text-decoration:underline" onclick="event.stopPropagation()">Download</a></div>'
        + '<div style="font-size:10px;color:#C47272;text-align:center;margin-top:3px">' + escHtml(label) + '</div>'
        + '</div>';
    });
    html += '</div></div>';
  }

  // ── Analyst Notes ─────────────────────────────────────────
  html += '<div style="background:#fff;border-radius:12px;padding:16px 20px;margin-bottom:20px;border:1px solid rgba(0,0,0,0.06)">'
    + '<div style="font-size:12px;font-weight:700;color:var(--charcoal);letter-spacing:.5px;margin-bottom:12px">📝 ANALYST NOTES</div>'
    // Add note form
    + '<div style="display:flex;gap:8px;margin-bottom:16px">'
    + '<textarea id="oca-sub-note-input" placeholder="Add a note…" style="flex:1;font-size:13px;padding:10px 14px;'
    + 'border-radius:8px;border:1px solid rgba(0,0,0,0.1);resize:vertical;min-height:40px;font-family:inherit"></textarea>'
    + '<button class="btn btns" style="font-size:12px;padding:8px 16px;align-self:flex-end" '
    + 'onclick="ocaSubAddNote(\'' + s.id + '\')">Save</button>'
    + '</div>';

  if (ocaSubDetailNotes.length === 0) {
    html += '<div style="font-size:12px;color:var(--muted);text-align:center;padding:16px">No notes yet.</div>';
  } else {
    html += ocaSubDetailNotes.map(function(n) {
      return '<div style="padding:10px 14px;background:var(--sand);border-radius:8px;margin-bottom:6px;position:relative">'
        + '<div style="font-size:13px;color:var(--charcoal);line-height:1.5;white-space:pre-wrap;padding-right:30px">' + escHtml(n.note) + '</div>'
        + '<div style="font-size:11px;color:var(--muted);margin-top:4px">' + ocaSubTimeAgo(n.created_at) + '</div>'
        + '<button onclick="ocaSubDeleteNote(\'' + n.id + '\')" style="position:absolute;top:8px;right:8px;'
        + 'background:none;border:none;cursor:pointer;font-size:14px;color:var(--muted);padding:2px" title="Delete">×</button>'
        + '</div>';
    }).join('');
  }
  html += '</div>';

  // ── Result Files ──────────────────────────────────────────
  html += '<div style="background:#fff;border-radius:12px;padding:16px 20px;margin-bottom:20px;border:1px solid rgba(0,0,0,0.06)">'
    + '<div style="font-size:12px;font-weight:700;color:var(--charcoal);letter-spacing:.5px;margin-bottom:12px">📎 RESULT FILES</div>'
    // Upload form
    + '<div style="display:flex;gap:8px;margin-bottom:16px;align-items:center">'
    + '<input type="file" id="oca-sub-file-input" style="font-size:12px;flex:1">'
    + '<button class="btn btns" style="font-size:12px;padding:8px 16px" '
    + 'onclick="ocaSubUploadFile(\'' + s.id + '\')">Upload</button>'
    + '</div>';

  if (ocaSubDetailResults.length === 0) {
    html += '<div style="font-size:12px;color:var(--muted);text-align:center;padding:16px">No result files uploaded yet.</div>';
  } else {
    html += ocaSubDetailResults.map(function(r) {
      var icon = '📄';
      if (r.file_type && r.file_type.indexOf('image') === 0) icon = '🖼';
      if (r.file_type && r.file_type.indexOf('pdf') >= 0) icon = '📕';
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--sand);'
        + 'border-radius:8px;margin-bottom:6px">'
        + '<span style="font-size:18px">' + icon + '</span>'
        + '<div style="flex:1;min-width:0">'
        + '<a href="' + r.file_url + '" target="_blank" style="font-size:13px;font-weight:600;color:var(--charcoal);'
        + 'text-decoration:none;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'
        + escHtml(r.file_name) + '</a>'
        + '<div style="font-size:11px;color:var(--muted)">' + ocaSubFormatDate(r.created_at) + '</div>'
        + '</div>'
        + '<button onclick="ocaSubDeleteFile(\'' + r.id + '\',\'' + r.file_url.replace(/'/g,"\\'") + '\')" '
        + 'style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--muted);padding:4px" title="Delete">×</button>'
        + '</div>';
    }).join('');
  }
  html += '</div>';

  return html;
}

// ── Section card helper ─────────────────────────────────────
function ocaSubSection(title, rows) {
  var body = rows.map(function(r) {
    var val = r.value || '—';
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.04)">'
      + '<span style="font-size:12px;color:var(--muted)">' + r.label + '</span>'
      + '<span style="font-size:12px;font-weight:600;color:var(--charcoal);text-align:right;max-width:60%;word-break:break-word">' + escHtml(val) + '</span>'
      + '</div>';
  }).join('');

  return '<div style="background:#fff;border-radius:12px;padding:16px 20px;border:1px solid rgba(0,0,0,0.06)">'
    + '<div style="font-size:12px;font-weight:700;color:var(--charcoal);letter-spacing:.5px;margin-bottom:10px">' + title + '</div>'
    + body
    + '</div>';
}

// ── Escape HTML helper ──────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


// ── Photo Lightbox ─────────────────────────────────────────
function ocaSubOpenLightbox(url, label) {
  var existing = document.getElementById('oca-lightbox');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'oca-lightbox';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = function(e) { if (e.target === overlay) ocaSubCloseLightbox(); };
  overlay.innerHTML = '<button onclick="ocaSubCloseLightbox()" style="position:absolute;top:16px;right:20px;background:none;border:none;color:#fff;font-size:28px;cursor:pointer">&times;</button>'
    + '<img src="' + url + '" style="max-width:90%;max-height:75vh;border-radius:8px;object-fit:contain">'
    + '<div style="color:#fff;font-size:13px;margin-top:12px">' + label + '</div>'
    + '<a href="' + url + '" download style="margin-top:10px;color:#fff;font-size:12px;text-decoration:underline">Download</a>';
  document.body.appendChild(overlay);
}

function ocaSubCloseLightbox() {
  var el = document.getElementById('oca-lightbox');
  if (el) el.remove();
}

// ── Revised-photos badge on nav ─────────────────────────
function updateOcaRevisedBadge() {
  var SB_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  var url = SB_URL + '/rest/v1/szn_submissions?revised_photos_at=not.is.null&status=in.(pending,in_progress)&select=id';
  fetch(url, {
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var navEl = document.getElementById('n-online');
    if (!navEl) return;
    // Remove existing badge if any
    var existing = navEl.querySelector('.oca-revised-badge');
    if (existing) existing.remove();
    if (data && data.length > 0) {
      var badge = document.createElement('span');
      badge.className = 'oca-revised-badge';
      badge.textContent = data.length;
      navEl.appendChild(badge);
    }
  })
  .catch(function() { /* silent */ });
}
