// ══ Vietnam Tour — shared Itinerary & Trip Info editor (staff) ══
// Every tour client sees this on their dashboard's Itinerary tab: the welcome note,
// what's included / not included, then the day-by-day plan. Dates are worked out
// from the tour start date. Stored in vietnam_tour_itinerary + vietnam_tour_content.

var vtTour = null;          // { items, content } once loaded
var vtTourError = '';
var vtTourEditing = null;   // item id, or 'new-<day>'

function vtTourLoad() {
  vtTourError = '';
  vtStaffApiCall('list_tour').then(function(data) {
    if (data && data.ok) vtTour = { items: data.items || [], content: data.content || {} };
    else { vtTour = { items: [], content: {} }; vtTourError = (data && data.error) || 'Couldn\'t load the itinerary — try logging in again.'; }
    renderVietnamTour();
  });
}

function _vtDayTitles() {
  try { return JSON.parse((vtTour.content || {}).day_titles || '{}'); } catch (e) { return {}; }
}

function _vtTourDays() {
  var days = {};
  vtTour.items.forEach(function(it) { days[it.day_number] = true; });
  Object.keys(_vtDayTitles()).forEach(function(d) { days[d] = true; });
  return Object.keys(days).map(Number).sort(function(a, b) { return a - b; });
}

function _vtDayDate(day) {
  var s = (vtTour.content || {}).tour_start_date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return '';
  var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + day - 1);
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

function vtTourSaveContent(key, btnId) {
  var el = document.getElementById('vttour-' + key);
  var btn = btnId ? document.getElementById(btnId) : null;
  var value = el.value;
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  vtStaffApiCall('save_tour_content', { key: key, value: value }).then(function(data) {
    if (data && data.ok) { vtTour.content[key] = value; if (key === 'tour_start_date') renderVietnamTour(); }
    else alert((data && data.error) || 'Couldn\'t save — try again.');
    if (btn) { btn.disabled = false; btn.textContent = data && data.ok ? 'Saved ✓' : 'Save'; setTimeout(function() { if (btn) btn.textContent = 'Save'; }, 1500); }
  });
}

function vtTourRenameDay(day) {
  var titles = _vtDayTitles();
  var el = document.getElementById('vttour-daytitle-' + day);
  titles[String(day)] = el.value.trim();
  var value = JSON.stringify(titles);
  vtStaffApiCall('save_tour_content', { key: 'day_titles', value: value }).then(function(data) {
    if (data && data.ok) vtTour.content.day_titles = value;
  });
}

function vtTourAddDay() {
  var days = _vtTourDays();
  var next = days.length ? days[days.length - 1] + 1 : 1;
  vtTourEditing = 'new-' + next;
  renderVietnamTour();
}

function vtTourEdit(id) {
  vtTourEditing = id; renderVietnamTour();
  setTimeout(function() { var el = document.getElementById('vttour-title'); if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); } }, 30);
}
function vtTourCancel() { vtTourEditing = null; renderVietnamTour(); }

function _vtTourForm(it, day) {
  it = it || { day_number: day };
  return '<div style="padding:14px;margin:8px 0;border:1.5px solid var(--charcoal);border-radius:10px;background:var(--cream,#fff)">'
    + '<div style="display:grid;grid-template-columns:70px 130px 1fr;gap:10px">'
    +   '<div class="sm-field"><label class="sm-lbl">Day</label><input class="sm-inp" type="number" min="1" max="30" id="vttour-day" value="'+esc(it.day_number)+'"></div>'
    +   '<div class="sm-field"><label class="sm-lbl">Time</label><input class="sm-inp" id="vttour-time" value="'+esc(it.time_label||'')+'" placeholder="e.g. 9am / Evening"></div>'
    +   '<div class="sm-field"><label class="sm-lbl">What\'s happening</label><input class="sm-inp" id="vttour-title" value="'+esc(it.title||'')+'" placeholder="e.g. Silk Village tour"></div>'
    + '</div>'
    + '<div class="sm-field"><label class="sm-lbl">Details (optional)</label><textarea class="sm-inp" rows="3" id="vttour-desc" style="resize:vertical">'+esc(it.description||'')+'</textarea></div>'
    + '<div class="sm-field"><label class="sm-lbl">Location (optional)</label><input class="sm-inp" id="vttour-loc" value="'+esc(it.location||'')+'"></div>'
    + '<div id="vttour-err" style="color:#B91C1C;font-size:12px;margin-bottom:8px;display:none"></div>'
    + '<div style="display:flex;gap:8px"><button class="btn btnp" style="font-size:12px" id="vttour-save" onclick="vtTourSaveItem(\''+(it.id||'')+'\')">'+(it.id?'Save Changes':'Add to Day')+'</button>'
    + '<button class="btn" style="font-size:12px" onclick="vtTourCancel()">Cancel</button></div></div>';
}

function vtTourSaveItem(id) {
  var g = function(x) { return document.getElementById(x).value; };
  var err = document.getElementById('vttour-err');
  var day = parseInt(g('vttour-day'), 10);
  var payload = { day_number: day, time_label: g('vttour-time').trim(), title: g('vttour-title').trim(), description: g('vttour-desc').trim(), location: g('vttour-loc').trim() };
  if (!payload.title) { err.textContent = 'Add what\'s happening.'; err.style.display = 'block'; return; }
  if (!(day >= 1)) { err.textContent = 'Pick a day.'; err.style.display = 'block'; return; }
  if (id) payload.id = id;
  else payload.sort_order = vtTour.items.filter(function(x) { return x.day_number === day; }).length;
  var btn = document.getElementById('vttour-save'); btn.disabled = true; btn.textContent = 'Saving…';
  vtStaffApiCall('save_tour_item', payload).then(function(data) {
    if (!data || !data.ok) { btn.disabled = false; btn.textContent = id ? 'Save Changes' : 'Add to Day'; err.textContent = (data && data.error) || 'Couldn\'t save — try again.'; err.style.display = 'block'; return; }
    if (id) vtTour.items = vtTour.items.map(function(x) { return x.id === id ? data.item : x; });
    else vtTour.items.push(data.item);
    vtTour.items.sort(function(a, b) { return a.day_number - b.day_number || a.sort_order - b.sort_order; });
    vtTourEditing = null; renderVietnamTour();
  });
}

function vtTourDelete(id) {
  var it = vtTour.items.filter(function(x) { return x.id === id; })[0];
  if (!it || !confirm('Remove "' + it.title + '" from Day ' + it.day_number + '?')) return;
  vtStaffApiCall('delete_tour_item', { id: id }).then(function(data) {
    if (data && data.ok) { vtTour.items = vtTour.items.filter(function(x) { return x.id !== id; }); renderVietnamTour(); }
    else alert('Couldn\'t delete — try again.');
  });
}

function vtTourMove(id, dir) {
  var it = vtTour.items.filter(function(x) { return x.id === id; })[0]; if (!it) return;
  var list = vtTour.items.filter(function(x) { return x.day_number === it.day_number; });
  var i = list.indexOf(it), j = i + dir; if (j < 0 || j >= list.length) return;
  list[i] = list[j]; list[j] = it;
  list.forEach(function(x, k) { x.sort_order = k; });
  vtTour.items.sort(function(a, b) { return a.day_number - b.day_number || a.sort_order - b.sort_order; });
  renderVietnamTour();
  vtStaffApiCall('reorder_tour_items', { ids: list.map(function(x) { return x.id; }) });
}

function _vtTourTextBlock(key, label, hint, rows) {
  return '<div class="sm-field"><label class="sm-lbl">'+label+'</label>'
    + '<textarea class="sm-inp" id="vttour-'+key+'" rows="'+rows+'" style="resize:vertical;line-height:1.5">'+esc((vtTour.content||{})[key]||'')+'</textarea>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;gap:10px"><span style="font-size:11px;color:var(--muted)">'+hint+'</span>'
    + '<button class="btn btnp" style="font-size:11px;padding:6px 14px" id="vttour-save-'+key+'" onclick="vtTourSaveContent(\''+key+'\',\'vttour-save-'+key+'\')">Save</button></div></div>';
}

function renderVtItinTab() {
  if (vtTour === null) { vtTourLoad(); return '<div style="color:var(--muted);font-size:13px">Loading itinerary…</div>'; }
  var fmtHint = 'Blank line = new paragraph · start a line with - for a bullet · **double stars** for bold';
  var html = '<div style="font-size:13px;color:var(--muted);margin-bottom:16px">Every tour client sees these on their dashboard. A client with their own itinerary items (old system) sees those instead of the shared days below.</div>';
  if (vtTourError) html += '<div style="color:#B91C1C;font-size:12px;margin-bottom:12px">'+esc(vtTourError)+'</div>';

  html += '<div class="card" style="padding:16px;margin-bottom:16px">'
    + '<div class="sm-field" style="max-width:260px"><label class="sm-lbl">Tour start date (Day 1)</label>'
    + '<div style="display:flex;gap:8px"><input class="sm-inp" type="date" id="vttour-tour_start_date" value="'+esc((vtTour.content||{}).tour_start_date||'')+'">'
    + '<button class="btn btnp" style="font-size:11px;padding:6px 14px" id="vttour-save-start" onclick="vtTourSaveContent(\'tour_start_date\',\'vttour-save-start\')">Save</button></div>'
    + '<div style="font-size:11px;color:var(--muted);margin-top:4px">Sets the dates on each day and the client countdown. Leave blank until confirmed.</div></div>'
    + '<div style="font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin:14px 0 8px">Introduction tab</div>'
    + _vtTourTextBlock('welcome_note', 'Welcome note', fmtHint, 8)
    + '<div class="sm-field"><label class="sm-lbl">How-to video link</label>'
    + '<div style="display:flex;gap:8px"><input class="sm-inp" id="vttour-intro_video_url" value="'+esc((vtTour.content||{}).intro_video_url||'')+'" placeholder="Paste a YouTube, Vimeo or Loom link">'
    + '<button class="btn btnp" style="font-size:11px;padding:6px 14px" id="vttour-save-video" onclick="vtTourSaveContent(\'intro_video_url\',\'vttour-save-video\')">Save</button></div>'
    + '<div style="font-size:11px;color:var(--muted);margin-top:4px">Shows under your welcome note. Leave blank until the video is ready. Unlisted YouTube videos work well.</div></div>'
    + '<div style="font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin:18px 0 8px">FAQ tab (shown above the questions)</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    +   _vtTourTextBlock('included', 'What\'s included', fmtHint, 10)
    +   _vtTourTextBlock('not_included', 'Not included', fmtHint, 10)
    + '</div></div>';

  var titles = _vtDayTitles();
  var days = _vtTourDays();
  var newDay = (vtTourEditing || '').indexOf('new-') === 0 ? parseInt(vtTourEditing.slice(4), 10) : null;
  if (newDay && days.indexOf(newDay) === -1) days.push(newDay);
  days.forEach(function(day) {
    var list = vtTour.items.filter(function(x) { return x.day_number === day; });
    var date = _vtDayDate(day);
    html += '<div class="card" style="padding:14px 16px;margin-bottom:12px">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap">'
      +   '<div style="font-weight:700;font-size:14px;white-space:nowrap">Day '+day+(date?' <span style="font-weight:400;color:var(--muted)">· '+date+'</span>':'')+'</div>'
      +   '<input class="sm-inp" style="flex:1;min-width:160px;max-width:320px;padding:6px 10px" id="vttour-daytitle-'+day+'" value="'+esc(titles[String(day)]||'')+'" placeholder="Day title, e.g. Silk Village" onchange="vtTourRenameDay('+day+')">'
      + '</div>';
    list.forEach(function(it, i) {
      if (vtTourEditing === it.id) { html += _vtTourForm(it, day); return; }
      html += '<div style="display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--warm)">'
        + '<div style="width:90px;flex-shrink:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);padding-top:2px">'+esc(it.time_label||'')+'</div>'
        + '<div style="flex:1;min-width:0;cursor:pointer" onclick="vtTourEdit(\''+it.id+'\')"><div style="font-weight:600;font-size:13px">'+esc(it.title)+'</div>'
        + (it.description ? '<div style="font-size:12px;color:var(--muted);margin-top:2px;line-height:1.45">'+esc(it.description)+'</div>' : '')
        + (it.location ? '<div style="font-size:11px;color:var(--muted);margin-top:2px">&#128205; '+esc(it.location)+'</div>' : '') + '</div>'
        + '<div style="display:flex;gap:4px;flex-shrink:0">'
        +   '<button class="fin-row-edit" title="Move up" '+(i===0?'disabled style="opacity:.3"':'')+' onclick="vtTourMove(\''+it.id+'\',-1)">&#8593;</button>'
        +   '<button class="fin-row-edit" title="Move down" '+(i===list.length-1?'disabled style="opacity:.3"':'')+' onclick="vtTourMove(\''+it.id+'\',1)">&#8595;</button>'
        +   '<button class="fin-row-edit" title="Edit" onclick="vtTourEdit(\''+it.id+'\')">&#9998;</button>'
        +   '<button class="fin-row-edit" title="Delete" style="color:#EF4444" onclick="vtTourDelete(\''+it.id+'\')">&#10005;</button>'
        + '</div></div>';
    });
    if (vtTourEditing === 'new-' + day) html += _vtTourForm(null, day);
    else html += '<button class="fin-row-edit" style="margin-top:6px" onclick="vtTourEdit(\'new-'+day+'\')">+ Add to Day '+day+'</button>';
    html += _vtDayExtras(day);
    html += '</div>';
  });
  html += '<button class="btn" style="font-size:12px" onclick="vtTourAddDay()">+ Add a day</button>';
  return html;
}


/* ── Per-day banner photo + "Need to know today" tips ── */

function _vtJsonKey(key) { try { return JSON.parse((vtTour.content || {})[key] || '{}') || {}; } catch (e) { return {}; } }

function _vtSaveJsonKey(key, obj) {
  var value = JSON.stringify(obj);
  return vtStaffApiCall('save_tour_content', { key: key, value: value }).then(function(data) {
    if (data && data.ok) vtTour.content[key] = value;
    return data;
  });
}

function _vtDayExtras(day) {
  var photo = _vtJsonKey('day_photos')[String(day)] || '';
  var tips = _vtJsonKey('day_tips')[String(day)] || '';
  return '<div style="display:grid;grid-template-columns:150px 1fr;gap:14px;margin-top:12px;padding-top:12px;border-top:1px dashed var(--sand)">'
    + '<div><div class="sm-lbl" style="margin-bottom:6px">Day photo</div>'
    +   (photo ? '<div style="position:relative;width:150px;height:96px;border-radius:8px;overflow:hidden"><img src="'+esc(photo)+'" style="width:100%;height:100%;object-fit:cover">'
                 + '<button class="fin-row-edit" style="position:absolute;right:4px;bottom:4px;background:#fff;color:#EF4444;padding:0 6px" title="Remove photo" onclick="vtTourDayPhotoRemove('+day+')">&#10005;</button></div>'
               : '<div style="width:150px;height:96px;border-radius:8px;border:1px dashed var(--sand);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--muted);text-align:center;padding:6px" id="vttour-photo-status-'+day+'">No photo — clients see a plain banner</div>')
    +   '<input type="file" accept="image/*" id="vttour-photo-'+day+'" style="display:none" onchange="vtTourDayPhotoUpload('+day+',this)">'
    +   '<button class="fin-row-edit" style="margin-top:6px" onclick="document.getElementById(\'vttour-photo-'+day+'\').click()">'+(photo?'Change photo':'+ Add photo')+'</button></div>'
    + '<div><div class="sm-lbl" style="margin-bottom:6px">Need to know today</div>'
    +   '<textarea class="sm-inp" rows="4" id="vttour-tips-'+day+'" style="resize:vertical;line-height:1.5" placeholder="- What to wear or bring\n- Timings to remember">'+esc(tips)+'</textarea>'
    +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;gap:10px"><span style="font-size:11px;color:var(--muted)">Start lines with - for bullets · **double stars** for bold</span>'
    +   '<button class="btn btnp" style="font-size:11px;padding:6px 14px" id="vttour-tips-save-'+day+'" onclick="vtTourSaveTips('+day+')">Save tips</button></div></div>'
    + '</div>';
}

function vtTourSaveTips(day) {
  var btn = document.getElementById('vttour-tips-save-' + day);
  var map = _vtJsonKey('day_tips');
  var v = document.getElementById('vttour-tips-' + day).value.trim();
  if (v) map[String(day)] = v; else delete map[String(day)];
  btn.disabled = true; btn.textContent = 'Saving…';
  _vtSaveJsonKey('day_tips', map).then(function(data) {
    btn.disabled = false; btn.textContent = data && data.ok ? 'Saved ✓' : 'Failed — retry';
    setTimeout(function() { btn.textContent = 'Save tips'; }, 1500);
  });
}

function vtTourDayPhotoUpload(day, input) {
  var file = input.files && input.files[0]; input.value = '';
  if (!file) return;
  var status = document.getElementById('vttour-photo-status-' + day);
  if (status) status.textContent = 'Uploading…';
  _vtRecShrink(file).then(function(b64) {
    return vtStaffApiCall('upload_rec_photo', { content_type: 'image/jpeg', file_base64: b64 });
  }).then(function(data) {
    if (!data || !data.ok || !data.url) throw new Error((data && data.error) || 'Upload failed.');
    var map = _vtJsonKey('day_photos'); map[String(day)] = data.url;
    return _vtSaveJsonKey('day_photos', map);
  }).then(function() { renderVietnamTour(); })
    .catch(function(e) { alert(e.message || 'Upload failed.'); renderVietnamTour(); });
}

function vtTourDayPhotoRemove(day) {
  var map = _vtJsonKey('day_photos'); delete map[String(day)];
  _vtSaveJsonKey('day_photos', map).then(function() { renderVietnamTour(); });
}
