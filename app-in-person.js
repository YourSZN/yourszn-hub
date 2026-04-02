/* ============================================================
   app-in-person.js  —  In-Person Clients Feature
   ============================================================ */

var IP_SEASONS = [
  'Bright Spring','Bright Winter','Dark Autumn','Dark Winter',
  'Light Spring','Light Summer','Soft Autumn','Soft Summer',
  'True Autumn','True Spring','True Summer','True Winter'
];

var IP_STATUSES = ['pending','uploaded','analysed','complete'];

var IP_GREY_VALS = [
  {bg:'#111'},{bg:'#222'},{bg:'#333'},{bg:'#444'},{bg:'#555'},
  {bg:'#777'},{bg:'#888'},{bg:'#999'},{bg:'#bbb'},{bg:'#ddd'}
];

/* ---------- helpers ---------- */

function ipContrastLevel(skin, hair, eyes) {
  if (!skin && !hair && !eyes) return { range: 0, level: 'Low' };
  var vals = [skin || 1, hair || 1, eyes || 1];
  var range = Math.max.apply(null, vals) - Math.min.apply(null, vals);
  var level = 'Low';
  if (range >= 8) level = 'High';
  else if (range >= 6) level = 'Medium-High';
  else if (range >= 4) level = 'Medium';
  else if (range >= 2) level = 'Medium-Low';
  return { range: range, level: level };
}

function ipContrastColor(level) {
  switch (level) {
    case 'High': return 'var(--deep)';
    case 'Medium-High': return 'var(--brown)';
    case 'Medium': return 'var(--tan)';
    case 'Medium-Low': return 'var(--sand)';
    default: return 'var(--muted)';
  }
}

function ipStatusColor(status) {
  switch (status) {
    case 'complete': return 'var(--green)';
    case 'analysed': return 'var(--gold)';
    case 'uploaded': return 'var(--rose)';
    default: return 'var(--muted)';
  }
}

function ipFormatDate(d) {
  if (!d) return '—';
  var dt = new Date(d);
  return dt.toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
}

/* ==========================================================
   TAB SWITCHING
   ========================================================== */

function showClientsTab(tab) {
  var btnSlots = document.getElementById('cst-slots');
  var btnInperson = document.getElementById('cst-inperson');
  var panelSlots = document.getElementById('clients-slots-panel');
  var panelInperson = document.getElementById('clients-inperson-panel');
  var psub = document.getElementById('clients-psub');
  var headerActions = document.getElementById('clients-header-actions');

  if (tab === 'inperson') {
    if (btnSlots) btnSlots.classList.remove('on');
    if (btnInperson) btnInperson.classList.add('on');
    if (panelSlots) panelSlots.style.display = 'none';
    if (panelInperson) panelInperson.style.display = 'block';
    if (psub) psub.textContent = 'Manage in-person client bookings and contrast analysis';
    if (headerActions) headerActions.innerHTML =
      '<button class="btn btnp" onclick="openNewBookingModal()" style="font-size:13px;padding:8px 18px;">' +
      '+ New Booking</button>';
    renderInPersonList();
  } else {
    if (btnSlots) btnSlots.classList.add('on');
    if (btnInperson) btnInperson.classList.remove('on');
    if (panelSlots) panelSlots.style.display = 'block';
    if (panelInperson) panelInperson.style.display = 'none';
    if (psub) psub.textContent = 'Manage your appointment slots and client bookings';
    if (headerActions) headerActions.innerHTML = '';
  }
}

function renderInPersonTab() {
  var btnInperson = document.getElementById('cst-inperson');
  if (btnInperson && btnInperson.classList.contains('on')) {
    renderInPersonList();
  }
}

/* ==========================================================
   LIST VIEW
   ========================================================== */

async function renderInPersonList() {
  var panel = document.getElementById('clients-inperson-panel');
  if (!panel) return;

  panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">Loading bookings...</div>';

  var db = getSupa();
  if (!db) {
    panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--rose);">Database not available</div>';
    return;
  }

  var { data, error } = await db
    .from('in_person_bookings')
    .select('*, in_person_persons(id)')
    .order('appointment_date', { ascending: false });

  if (error) {
    panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--rose);">Error loading bookings: ' + error.message + '</div>';
    return;
  }

  if (!data || data.length === 0) {
    panel.innerHTML =
      '<div style="padding:60px 40px;text-align:center;">' +
        '<div style="color:var(--muted);font-size:15px;margin-bottom:16px;">No in-person bookings yet</div>' +
        '<button class="btn btnp" onclick="openNewBookingModal()" style="font-size:13px;padding:8px 18px;">+ New Booking</button>' +
      '</div>';
    return;
  }

  var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;padding:16px 0;">';

  for (var i = 0; i < data.length; i++) {
    var b = data[i];
    var personCount = b.in_person_persons ? b.in_person_persons.length : 0;
    var sc = ipStatusColor(b.status);

    html +=
      '<div class="card" onclick="showBookingDetail(\'' + b.id + '\')" style="cursor:pointer;transition:transform 0.15s;"' +
      ' onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'none\'">' +
        '<div class="cb" style="padding:20px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">' +
            '<div>' +
              '<div style="font-weight:600;font-size:15px;color:var(--charcoal);">' + (b.client_name || 'Unnamed') + '</div>' +
              '<div style="font-size:12px;color:var(--muted);margin-top:2px;">' + (b.client_email || '') + '</div>' +
            '</div>' +
            '<span style="font-size:11px;padding:4px 10px;border-radius:20px;background:' + sc + ';color:white;text-transform:capitalize;">' +
              (b.status || 'pending') +
            '</span>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--brown);">' +
            '<span>' + ipFormatDate(b.appointment_date) + '</span>' +
            '<span>' + personCount + ' person' + (personCount !== 1 ? 's' : '') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  html += '</div>';
  panel.innerHTML = html;
}

/* ==========================================================
   DETAIL VIEW
   ========================================================== */

async function showBookingDetail(bookingId) {
  var panel = document.getElementById('clients-inperson-panel');
  if (!panel) return;

  panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">Loading booking...</div>';

  var db = getSupa();
  if (!db) return;

  var { data: booking, error: bErr } = await db
    .from('in_person_bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (bErr || !booking) {
    panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--rose);">Booking not found</div>';
    return;
  }

  var { data: persons, error: pErr } = await db
    .from('in_person_persons')
    .select('*')
    .eq('booking_id', bookingId)
    .order('sort_order', { ascending: true });

  if (pErr) persons = [];

  var statusOpts = '';
  for (var s = 0; s < IP_STATUSES.length; s++) {
    statusOpts += '<option value="' + IP_STATUSES[s] + '"' +
      (booking.status === IP_STATUSES[s] ? ' selected' : '') + '>' +
      IP_STATUSES[s].charAt(0).toUpperCase() + IP_STATUSES[s].slice(1) + '</option>';
  }

  var html =
    '<div style="padding:8px 0;">' +
      /* header row */
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<button class="btn btns" onclick="renderInPersonList()" style="font-size:12px;padding:6px 12px;">← Back</button>' +
          '<div>' +
            '<div style="font-weight:600;font-size:17px;color:var(--charcoal);">' + (booking.client_name || 'Unnamed') + '</div>' +
            '<div style="font-size:12px;color:var(--muted);">' + (booking.client_email || '') + ' · ' + ipFormatDate(booking.appointment_date) + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<select onchange="ipUpdateStatus(\'' + bookingId + '\', this.value)"' +
          ' style="font-size:12px;padding:6px 12px;border-radius:8px;border:1px solid var(--sand);background:var(--warm);color:var(--brown);cursor:pointer;">' +
            statusOpts +
          '</select>' +
          '<button class="btn" onclick="ipDeleteBooking(\'' + bookingId + '\')"' +
          ' style="font-size:12px;padding:6px 12px;color:var(--rose);border:1px solid var(--rose);">Delete</button>' +
        '</div>' +
      '</div>' +

      /* persons grid */
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
        '<div style="font-size:13px;font-weight:600;color:var(--brown);">People (' + (persons ? persons.length : 0) + ')</div>' +
        '<button class="btn btnp" onclick="ipAddGuest(\'' + bookingId + '\')" style="font-size:12px;padding:6px 14px;">+ Add Guest</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;">';

  for (var p = 0; p < persons.length; p++) {
    var person = persons[p];
    var cl = ipContrastLevel(person.skin_value, person.hair_value, person.eyes_value);
    var photoThumb = person.photo_url
      ? '<img src="' + person.photo_url + '" style="width:48px;height:48px;border-radius:8px;object-fit:cover;filter:grayscale(100%);" />'
      : '<div style="width:48px;height:48px;border-radius:8px;background:var(--sand);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--muted);">?</div>';

    html +=
      '<div class="card" style="cursor:pointer;" onclick="showPersonContrast(\'' + person.id + '\',\'' + bookingId + '\')">' +
        '<div class="cb" style="padding:16px;">' +
          '<div style="display:flex;gap:12px;align-items:center;">' +
            photoThumb +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-weight:600;font-size:14px;color:var(--charcoal);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
                (person.name || 'Unnamed') +
                (person.is_primary ? ' <span style="font-size:10px;color:var(--muted);font-weight:400;">(primary)</span>' : '') +
              '</div>' +
              '<div style="display:flex;gap:6px;margin-top:6px;align-items:center;">' +
                '<span style="font-size:11px;padding:3px 8px;border-radius:12px;background:' + ipContrastColor(cl.level) + ';color:white;">' + cl.level + '</span>' +
                (person.season ? '<span style="font-size:11px;color:var(--brown);">' + person.season + '</span>' : '') +
              '</div>' +
            '</div>' +
            '<div style="font-size:12px;color:var(--muted);">Edit →</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  html += '</div></div>';
  panel.innerHTML = html;
}

/* ---------- status & delete ---------- */

async function ipUpdateStatus(bookingId, status) {
  var db = getSupa(); if (!db) return;
  await db.from('in_person_bookings').update({ status: status, updated_at: new Date().toISOString() }).eq('id', bookingId);
}

async function ipDeleteBooking(bookingId) {
  if (!confirm('Delete this booking and all associated person data?')) return;
  var db = getSupa(); if (!db) return;
  await db.from('in_person_persons').delete().eq('booking_id', bookingId);
  await db.from('in_person_bookings').delete().eq('id', bookingId);
  renderInPersonList();
}

async function ipAddGuest(bookingId) {
  var name = prompt('Guest name:');
  if (!name) return;
  var db = getSupa(); if (!db) return;

  var { data: existing } = await db.from('in_person_persons').select('sort_order').eq('booking_id', bookingId).order('sort_order', { ascending: false }).limit(1);
  var nextSort = (existing && existing.length > 0 && existing[0].sort_order != null) ? existing[0].sort_order + 1 : 1;

  await db.from('in_person_persons').insert({
    booking_id: bookingId,
    name: name,
    is_primary: false,
    sort_order: nextSort
  });

  showBookingDetail(bookingId);
}

/* ==========================================================
   PER-PERSON CONTRAST ANALYSER
   ========================================================== */

async function showPersonContrast(personId, bookingId) {
  var panel = document.getElementById('clients-inperson-panel');
  if (!panel) return;

  var db = getSupa(); if (!db) return;

  var { data: person, error } = await db
    .from('in_person_persons')
    .select('*')
    .eq('id', personId)
    .single();

  if (error || !person) {
    alert('Person not found');
    return;
  }

  var skinVal = person.skin_value || 5;
  var hairVal = person.hair_value || 5;
  var eyesVal = person.eyes_value || 5;
  var cl = ipContrastLevel(skinVal, hairVal, eyesVal);

  var seasonOpts = '<option value="">— Select Season —</option>';
  for (var s = 0; s < IP_SEASONS.length; s++) {
    seasonOpts += '<option value="' + IP_SEASONS[s] + '"' + (person.season === IP_SEASONS[s] ? ' selected' : '') + '>' + IP_SEASONS[s] + '</option>';
  }

  /* Build greyscale bars for each slider */
  function greyBar(id, label, val) {
    var bar = '<div style="margin-bottom:20px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
        '<span style="font-size:12px;font-weight:600;color:var(--brown);text-transform:uppercase;letter-spacing:0.5px;">' + label + '</span>' +
        '<span id="ip-val-' + id + '" style="font-size:12px;color:var(--muted);">' + val + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:2px;margin-bottom:6px;">';
    for (var g = 0; g < IP_GREY_VALS.length; g++) {
      var idx = g + 1;
      var active = idx === val;
      bar += '<div onclick="ipSetSlider(\'' + id + '\',' + idx + ',\'' + personId + '\',\'' + bookingId + '\')"' +
        ' style="flex:1;height:32px;background:' + IP_GREY_VALS[g].bg + ';cursor:pointer;border-radius:' +
        (g === 0 ? '4px 0 0 4px' : g === 9 ? '0 4px 4px 0' : '0') + ';' +
        (active ? 'box-shadow:0 0 0 2px var(--charcoal);transform:scaleY(1.15);z-index:1;position:relative;' : '') +
        '"></div>';
    }
    bar += '</div>' +
      '<input type="range" min="1" max="10" value="' + val + '" id="ip-slider-' + id + '"' +
      ' oninput="ipSetSlider(\'' + id + '\',parseInt(this.value),\'' + personId + '\',\'' + bookingId + '\')"' +
      ' style="width:100%;accent-color:var(--charcoal);" />' +
      '</div>';
    return bar;
  }

  var photoSection = person.photo_url
    ? '<img src="' + person.photo_url + '" style="width:100%;max-width:300px;border-radius:12px;filter:grayscale(100%);margin-bottom:12px;" />'
    : '<div style="width:100%;max-width:300px;height:200px;border-radius:12px;background:var(--sand);display:flex;align-items:center;justify-content:center;color:var(--muted);margin-bottom:12px;">No photo yet</div>';

  var html =
    '<div style="padding:8px 0;">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">' +
        '<button class="btn btns" onclick="showBookingDetail(\'' + bookingId + '\')" style="font-size:12px;padding:6px 12px;">← Back</button>' +
        '<div style="font-weight:600;font-size:17px;color:var(--charcoal);">' + (person.name || 'Unnamed') + ' — Contrast Analysis</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;" id="ip-contrast-grid">' +
        /* left: photo + upload */
        '<div>' +
          photoSection +
          '<label class="btn btns" style="font-size:12px;padding:8px 16px;display:inline-block;cursor:pointer;">' +
            'Upload Photo' +
            '<input type="file" accept="image/*" onchange="ipUploadPhoto(this.files[0],\'' + personId + '\',\'' + bookingId + '\')" style="display:none;" />' +
          '</label>' +
          '<div style="margin-top:20px;">' +
            '<label style="font-size:12px;font-weight:600;color:var(--brown);display:block;margin-bottom:6px;">SEASON</label>' +
            '<select id="ip-season-select" onchange="ipSaveSeason(\'' + personId + '\',this.value)"' +
            ' style="font-size:13px;padding:8px 12px;border-radius:8px;border:1px solid var(--sand);background:var(--warm);color:var(--brown);width:100%;max-width:260px;">' +
              seasonOpts +
            '</select>' +
          '</div>' +
        '</div>' +

        /* right: sliders + result */
        '<div>' +
          greyBar('skin', 'Skin', skinVal) +
          greyBar('hair', 'Hair', hairVal) +
          greyBar('eyes', 'Eyes', eyesVal) +
          '<div id="ip-contrast-result" style="padding:16px;border-radius:12px;background:var(--warm);border:1px solid var(--sand);text-align:center;">' +
            '<div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Contrast Level</div>' +
            '<div style="font-size:22px;font-weight:700;color:' + ipContrastColor(cl.level) + ';">' + cl.level + '</div>' +
            '<div style="font-size:12px;color:var(--muted);margin-top:4px;">Range: ' + cl.range + '</div>' +
          '</div>' +
          '<div style="margin-top:16px;text-align:right;">' +
            '<button class="btn btnp" onclick="ipDeletePerson(\'' + personId + '\',\'' + bookingId + '\')" ' +
            'style="font-size:12px;padding:6px 14px;background:var(--rose);border-color:var(--rose);">Delete Person</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  panel.innerHTML = html;

  /* Responsive: stack on narrow screens */
  if (window.innerWidth < 700) {
    var grid = document.getElementById('ip-contrast-grid');
    if (grid) grid.style.gridTemplateColumns = '1fr';
  }
}

/* slider interaction */
var _ipSliderTimer = null;

function ipSetSlider(key, val, personId, bookingId) {
  /* update display */
  var valEl = document.getElementById('ip-val-' + key);
  if (valEl) valEl.textContent = val;
  var slider = document.getElementById('ip-slider-' + key);
  if (slider) slider.value = val;

  /* re-render grey bar active state — just rebuild contrast result for speed */
  var skinV = parseInt(document.getElementById('ip-slider-skin') ? document.getElementById('ip-slider-skin').value : 5);
  var hairV = parseInt(document.getElementById('ip-slider-hair') ? document.getElementById('ip-slider-hair').value : 5);
  var eyesV = parseInt(document.getElementById('ip-slider-eyes') ? document.getElementById('ip-slider-eyes').value : 5);

  var cl = ipContrastLevel(skinV, hairV, eyesV);
  var resultEl = document.getElementById('ip-contrast-result');
  if (resultEl) {
    resultEl.innerHTML =
      '<div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Contrast Level</div>' +
      '<div style="font-size:22px;font-weight:700;color:' + ipContrastColor(cl.level) + ';">' + cl.level + '</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:4px;">Range: ' + cl.range + '</div>';
  }

  /* debounced save */
  clearTimeout(_ipSliderTimer);
  _ipSliderTimer = setTimeout(function() {
    ipSaveContrast(personId, skinV, hairV, eyesV, cl);
  }, 500);
}

async function ipSaveContrast(personId, skin, hair, eyes, cl) {
  var db = getSupa(); if (!db) return;
  await db.from('in_person_persons').update({
    skin_value: skin,
    hair_value: hair,
    eyes_value: eyes,
    contrast_range: cl.range,
    contrast_level: cl.level
  }).eq('id', personId);
}

async function ipSaveSeason(personId, season) {
  var db = getSupa(); if (!db) return;
  await db.from('in_person_persons').update({ season: season || null }).eq('id', personId);
}

/* photo upload */
async function ipUploadPhoto(file, personId, bookingId) {
  if (!file) return;
  var db = getSupa(); if (!db) return;

  /* get booking_id for path */
  var path = 'booking_' + bookingId + '/person_' + personId + '_' + Date.now() + '.jpg';

  var { data, error } = await db.storage.from('in-person-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) {
    alert('Upload failed: ' + error.message);
    return;
  }

  var { data: urlData } = db.storage.from('in-person-photos').getPublicUrl(path);
  var photoUrl = urlData ? urlData.publicUrl : '';

  await db.from('in_person_persons').update({
    photo_path: path,
    photo_url: photoUrl
  }).eq('id', personId);

  /* refresh view */
  showPersonContrast(personId, bookingId);
}

/* delete person */
async function ipDeletePerson(personId, bookingId) {
  if (!confirm('Delete this person?')) return;
  var db = getSupa(); if (!db) return;
  await db.from('in_person_persons').delete().eq('id', personId);
  showBookingDetail(bookingId);
}

/* ==========================================================
   NEW BOOKING MODAL
   ========================================================== */

function openNewBookingModal() {
  /* Remove existing modal if any */
  var old = document.getElementById('ip-booking-modal');
  if (old) old.remove();

  var modal = document.createElement('div');
  modal.id = 'ip-booking-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  var today = new Date().toISOString().split('T')[0];

  modal.innerHTML =
    '<div style="background:var(--cream);border-radius:16px;padding:28px 32px;width:90%;max-width:420px;box-shadow:0 12px 40px rgba(0,0,0,0.15);">' +
      '<div style="font-weight:700;font-size:17px;color:var(--charcoal);margin-bottom:20px;">New In-Person Booking</div>' +
      '<div style="margin-bottom:14px;">' +
        '<label style="font-size:12px;font-weight:600;color:var(--brown);display:block;margin-bottom:4px;">Client Name</label>' +
        '<input type="text" id="ip-new-name" placeholder="Full name"' +
        ' style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--sand);font-size:14px;background:white;box-sizing:border-box;" />' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
        '<label style="font-size:12px;font-weight:600;color:var(--brown);display:block;margin-bottom:4px;">Client Email</label>' +
        '<input type="email" id="ip-new-email" placeholder="email@example.com"' +
        ' style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--sand);font-size:14px;background:white;box-sizing:border-box;" />' +
      '</div>' +
      '<div style="margin-bottom:20px;">' +
        '<label style="font-size:12px;font-weight:600;color:var(--brown);display:block;margin-bottom:4px;">Appointment Date</label>' +
        '<input type="date" id="ip-new-date" value="' + today + '"' +
        ' style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--sand);font-size:14px;background:white;box-sizing:border-box;" />' +
      '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
        '<button class="btn btns" onclick="document.getElementById(\'ip-booking-modal\').remove()" style="font-size:13px;padding:8px 18px;">Cancel</button>' +
        '<button class="btn btnp" onclick="ipSaveNewBooking()" style="font-size:13px;padding:8px 18px;">Create Booking</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
  setTimeout(function() {
    var nameInput = document.getElementById('ip-new-name');
    if (nameInput) nameInput.focus();
  }, 100);
}

async function ipSaveNewBooking() {
  var name = (document.getElementById('ip-new-name').value || '').trim();
  var email = (document.getElementById('ip-new-email').value || '').trim();
  var date = document.getElementById('ip-new-date').value;

  if (!name) { alert('Please enter a client name'); return; }
  if (!date) { alert('Please select a date'); return; }

  var db = getSupa(); if (!db) return;

  var { data: booking, error: bErr } = await db
    .from('in_person_bookings')
    .insert({
      client_name: name,
      client_email: email,
      appointment_date: date,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (bErr || !booking) {
    alert('Failed to create booking: ' + (bErr ? bErr.message : 'unknown error'));
    return;
  }

  /* Auto-create primary person */
  await db.from('in_person_persons').insert({
    booking_id: booking.id,
    name: name,
    is_primary: true,
    sort_order: 0,
    created_at: new Date().toISOString()
  });

  /* Close modal, refresh */
  var modal = document.getElementById('ip-booking-modal');
  if (modal) modal.remove();

  renderInPersonList();
}
