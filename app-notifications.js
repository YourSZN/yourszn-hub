// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS SYSTEM — YourSZN Hub
// ═══════════════════════════════════════════════════════════════

var SB_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';

var notifList = [];
var notifPollTimer = null;

// ── Supabase REST helpers ──────────────────────────────────
function notifHeaders() {
  return { 'apikey': SB_ANON, 'Authorization': 'Bearer ' + SB_ANON, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };
}

async function notifFetch(path, opts) {
  var url = SB_URL + '/rest/v1/' + path;
  var r = await fetch(url, Object.assign({ headers: notifHeaders() }, opts || {}));
  if (!r.ok) { console.error('notif fetch error', r.status, await r.text()); return null; }
  var txt = await r.text();
  return txt ? JSON.parse(txt) : [];
}

// ── Poll submissions & create missing notifications ────────
async function notifPollSubmissions() {
  try {
    // Get all existing notifications
    var existing = await notifFetch('notifications?select=submission_id,type,client_email');
    if (!existing) existing = [];

    var existingMap = {};
    existing.forEach(function(n) { existingMap[n.submission_id + ':' + n.type] = true; });

    var toInsert = [];

    // --- Online Colour Analysis submissions ---
    var subs = await notifFetch('szn_submissions?select=id,full_name,email,status,created_at,revised_photos_at');
    if (subs) {
      subs.forEach(function(s) {
        var newKey = s.id + ':new_submission';
        if (!existingMap[newKey]) {
          toInsert.push({
            type: 'new_submission',
            submission_id: s.id,
            client_name: s.full_name || 'Unknown',
            client_email: s.email || '',
            message: (s.full_name || 'A client') + ' submitted a new colour analysis',
            status: 'Not Addressed'
          });
        }
        if (s.revised_photos_at) {
          var revKey = s.id + ':revised_images';
          if (!existingMap[revKey]) {
            toInsert.push({
              type: 'revised_images',
              submission_id: s.id,
              client_name: s.full_name || 'Unknown',
              client_email: s.email || '',
              message: (s.full_name || 'A client') + ' uploaded revised photos',
              status: 'Not Addressed'
            });
          }
        }
      });
    }

    // --- In-Person Bookings ---
    var bookings = await notifFetch('in_person_bookings?select=id,client_name,client_email,appointment_type,status,photos_submitted_at,created_at');
    if (bookings) {
      bookings.forEach(function(b) {
        var bookKey = b.id + ':new_booking';
        if (!existingMap[bookKey]) {
          toInsert.push({
            type: 'new_booking',
            submission_id: b.id,
            client_name: b.client_name || 'Unknown',
            client_email: b.client_email || '',
            message: (b.client_name || 'A client') + ' booked an in-person ' + (b.appointment_type || 'appointment'),
            status: 'Not Addressed'
          });
        }
        if (b.photos_submitted_at) {
          var photoKey = b.id + ':booking_photos';
          if (!existingMap[photoKey]) {
            toInsert.push({
              type: 'booking_photos',
              submission_id: b.id,
              client_name: b.client_name || 'Unknown',
              client_email: b.client_email || '',
              message: (b.client_name || 'A client') + ' uploaded photos for their in-person appointment',
              status: 'Not Addressed'
            });
          }
        }
      });
    }

    // --- Ivorey Submissions (from Google Sheets) ---
    var existingIvoreyEmails = {};
    existing.forEach(function(n) {
      if (n.type === 'ivorey_submission' && n.client_email) {
        existingIvoreyEmails[n.client_email.toLowerCase().trim()] = true;
      }
    });
    var ivoreyRows = (typeof ivoreyData !== 'undefined' && ivoreyData.length > 0) ? ivoreyData : null;
    if (!ivoreyRows) {
      try {
        var csvRes = await fetch('https://docs.google.com/spreadsheets/d/1j06xazCUHPFtfw9fcmU5cv8TvF3brvK_fMP2zHep1YY/gviz/tq?tqx=out:csv&gid=0');
        if (csvRes.ok) {
          var csvText = await csvRes.text();
          if (typeof ivoreyParseCSV === 'function') {
            ivoreyRows = ivoreyParseCSV(csvText);
            if (ivoreyRows.length > 0) ivoreyRows.shift();
          }
        }
      } catch(e) { /* silent */ }
    }
    if (ivoreyRows && ivoreyRows.length > 0) {
      ivoreyRows.forEach(function(r) {
        var name = (r[0] || '').trim();
        var email = (r[1] || '').toLowerCase().trim();
        if (!email) return;
        if (!existingIvoreyEmails[email]) {
          toInsert.push({ type: 'ivorey_submission', client_name: name || 'Unknown', client_email: email, message: (name || 'A client') + ' submitted a new Ivorey colour analysis', status: 'Not Addressed' });
          existingIvoreyEmails[email] = true;
        }
      });
    }

    if (toInsert.length > 0) {
      await notifFetch('notifications', {
        method: 'POST',
        body: JSON.stringify(toInsert)
      });
    }

    // Reload notification list
    await notifLoadList();
  } catch (e) {
    console.error('notifPollSubmissions error:', e);
  }
}

// ── Load all notifications ─────────────────────────────────
async function notifLoadList() {
  try {
    var data = await notifFetch('notifications?order=created_at.desc');
    if (data) notifList = data;
    notifUpdateBellBadge();
    notifUpdateSidebarBadge();
  } catch (e) {
    console.error('notifLoadList error:', e);
  }
}

// ── Unread count for current user ──────────────────────────
function notifUnreadCount() {
  if (!curUser) return 0;
  var uname = USERS[curUser].name;
  return notifList.filter(function(n) {
    if (!n.read_by) return true;
    var readers = typeof n.read_by === 'string' ? JSON.parse(n.read_by) : n.read_by;
    return !readers.some(function(r) { return r.user === uname; });
  }).length;
}

// ── Bell icon in sidebar user area ─────────────────────────
function notifInjectBell() {
  var suser = document.querySelector('.suser');
  if (!suser || document.getElementById('notif-bell-wrap')) return;

  var wrap = document.createElement('div');
  wrap.id = 'notif-bell-wrap';
  wrap.style.cssText = 'position:absolute;top:12px;right:12px;cursor:pointer;';
  wrap.onclick = function() { showPage('notifications'); };
  wrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;color:var(--muted)">'
    + '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
    + '<span id="notif-bell-badge" style="display:none;position:absolute;top:-4px;right:-6px;background:#EF4444;color:#fff;border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:700;line-height:18px;text-align:center"></span>';
  suser.style.position = 'relative';
  suser.appendChild(wrap);
}

// ── Update bell badge count ────────────────────────────────
function notifUpdateBellBadge() {
  var badge = document.getElementById('notif-bell-badge');
  if (!badge) return;
  var count = notifUnreadCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'block' : 'none';
}

// ── Sidebar nav badge ──────────────────────────────────────
function notifUpdateSidebarBadge() {
  var navEl = document.getElementById('n-notifications');
  if (!navEl) return;
  var existing = navEl.querySelector('.notif-nav-badge');
  if (existing) existing.remove();
  var count = notifUnreadCount();
  if (count > 0) {
    var badge = document.createElement('span');
    badge.className = 'notif-nav-badge';
    badge.style.cssText = 'display:inline-block;background:#EF4444;color:#fff;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:700;margin-left:auto;min-width:18px;text-align:center;';
    badge.textContent = count;
    navEl.appendChild(badge);
  }
}

// ── Mark single notification as read ───────────────────────
async function notifMarkRead(id) {
  if (!curUser) return;
  var uname = USERS[curUser].name;
  var n = notifList.find(function(x) { return x.id === id; });
  if (!n) return;

  var readers = n.read_by || [];
  if (typeof readers === 'string') readers = JSON.parse(readers);
  if (readers.some(function(r) { return r.user === uname; })) return;

  readers.push({ user: uname, at: new Date().toISOString() });

  await notifFetch('notifications?id=eq.' + id, {
    method: 'PATCH',
    body: JSON.stringify({ read_by: readers, updated_at: new Date().toISOString() })
  });

  n.read_by = readers;
  notifUpdateBellBadge();
  notifUpdateSidebarBadge();
}

// ── Mark all as read ───────────────────────────────────────
async function notifMarkAllRead() {
  if (!curUser) return;
  var uname = USERS[curUser].name;
  var unread = notifList.filter(function(n) {
    var readers = n.read_by || [];
    if (typeof readers === 'string') readers = JSON.parse(readers);
    return !readers.some(function(r) { return r.user === uname; });
  });

  for (var i = 0; i < unread.length; i++) {
    await notifMarkRead(unread[i].id);
  }
  renderNotifCentre();
}

// ── Update notification status ─────────────────────────────
async function notifUpdateStatus(id, newStatus) {
  if (!curUser) return;
  var uname = USERS[curUser].name;
  var patch = {
    status: newStatus,
    addressed_by: uname,
    addressed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await notifFetch('notifications?id=eq.' + id, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  });

  var n = notifList.find(function(x) { return x.id === id; });
  if (n) { n.status = newStatus; n.addressed_by = uname; n.addressed_at = patch.addressed_at; }
  renderNotifCentre();
}

// ── Format helpers ─────────────────────────────────────────
function notifTimeAgo(d) {
  if (!d) return '';
  var diff = Math.floor((new Date() - new Date(d)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  var dt = new Date(d);
  return dt.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()] + ' ' + dt.getFullYear();
}

function notifTypeLabel(type) {
  if (type === 'new_submission') return '<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700;background:#EBF2FF;color:#5588DD">Online Submission</span>';
  if (type === 'revised_images') return '<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700;background:#FFF3EB;color:#E07020">Revised Photos</span>';
  if (type === 'new_booking') return '<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700;background:#F0EBFF;color:#7C3AED">In-Person Booking</span>';
  if (type === 'booking_photos') return '<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700;background:#FFF3EB;color:#E07020">Booking Photos</span>';
  if (type === 'ivorey_submission') return '<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700;background:#F5EDE4;color:#8B6914">Ivorey Submission</span>';
  return '<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700;background:#F4F4F4;color:#888">' + type + '</span>';
}

function notifStatusColor(status) {
  if (status === 'Completed') return { color: '#44AA66', bg: '#EDFBF2' };
  if (status === 'In Progress') return { color: '#5588DD', bg: '#EBF2FF' };
  return { color: '#E07020', bg: '#FFF3EB' }; // Not Addressed
}

// ── Render Notification Centre page ────────────────────────
function renderNotifCentre() {
  var container = document.getElementById('notif-centre-content');
  if (!container) return;

  if (!curUser) { container.innerHTML = '<p>Please log in.</p>'; return; }

  var uname = USERS[curUser].name;
  var html = '';

  // Header with Mark All Read
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">';
  html += '<div style="font-size:13px;color:var(--muted)">' + notifList.length + ' notification' + (notifList.length !== 1 ? 's' : '') + '</div>';
  var unreadCount = notifUnreadCount();
  if (unreadCount > 0) {
    html += '<button onclick="notifMarkAllRead()" style="background:var(--warm);border:1px solid var(--sand);border-radius:8px;padding:6px 14px;font-size:11px;font-weight:700;cursor:pointer;color:var(--charcoal)">Mark All Read (' + unreadCount + ')</button>';
  }
  html += '</div>';

  if (notifList.length === 0) {
    html += '<div style="text-align:center;padding:60px 20px;color:var(--muted)"><div style="font-size:40px;margin-bottom:12px">🔔</div><div style="font-size:14px">No notifications yet</div><div style="font-size:12px;margin-top:6px">Notifications will appear here when clients submit forms or upload revised photos.</div></div>';
    container.innerHTML = html;
    return;
  }

  // Check if all notifications have been read by current user
  var allRead = notifList.every(function(n) {
    var readers = n.read_by || [];
    if (typeof readers === 'string') readers = JSON.parse(readers);
    return readers.some(function(r) { return r.user === uname; });
  });

  if (allRead) {
    // Group by status
    var groups = { 'Not Addressed': [], 'In Progress': [], 'Completed': [] };
    notifList.forEach(function(n) {
      var s = n.status || 'Not Addressed';
      if (!groups[s]) groups[s] = [];
      groups[s].push(n);
    });

    var sectionOrder = ['Not Addressed', 'In Progress', 'Completed'];
    var sectionColors = {
      'Not Addressed': { color: '#E07020', bg: '#FFF3EB', icon: '⚠️' },
      'In Progress':   { color: '#5588DD', bg: '#EBF2FF', icon: '🔄' },
      'Completed':     { color: '#44AA66', bg: '#EDFBF2', icon: '✅' }
    };

    sectionOrder.forEach(function(status) {
      if (groups[status].length === 0) return;
      var sc = sectionColors[status];
      html += '<div style="margin-bottom:28px">';
      html += '<div style="font-size:14px;font-weight:700;color:' + sc.color + ';margin-bottom:12px;padding:8px 14px;background:' + sc.bg + ';border-radius:8px">' + sc.icon + ' ' + status + ' (' + groups[status].length + ')</div>';
      groups[status].forEach(function(n) {
        html += notifRenderCard(n, uname);
      });
      html += '</div>';
    });
  } else {
    // Show flat list (not all read yet)
    notifList.forEach(function(n) {
      html += notifRenderCard(n, uname);
    });
  }

  container.innerHTML = html;
}

function notifRenderCard(n, uname) {
  var readers = n.read_by || [];
  if (typeof readers === 'string') readers = JSON.parse(readers);
  var isRead = readers.some(function(r) { return r.user === uname; });
  var sc = notifStatusColor(n.status);
  var html = '';

  html += '<div style="padding:16px 20px;border:1px solid ' + (isRead ? 'var(--sand)' : '#C4956A') + ';border-radius:12px;margin-bottom:10px;background:' + (isRead ? '#fff' : '#FFFBF7') + ';cursor:pointer" onclick="notifMarkRead(\'' + n.id + '\')">';

  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  html += '<div style="display:flex;align-items:center;gap:8px">';
  if (!isRead) html += '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#EF4444"></span>';
  html += notifTypeLabel(n.type);
  html += '</div>';
  html += '<span style="font-size:11px;color:var(--muted)">' + notifTimeAgo(n.created_at) + '</span>';
  html += '</div>';

  html += '<div style="font-size:13px;color:var(--charcoal);margin-bottom:10px">' + (n.message || '') + '</div>';

  if (n.client_name) {
    html += '<div style="font-size:11px;color:var(--muted);margin-bottom:10px">';
    html += '👤 ' + n.client_name;
    if (n.client_email) html += ' · ' + n.client_email;
    html += '</div>';
  }

  html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">';
  html += '<select onchange="notifUpdateStatus(\'' + n.id + '\', this.value);event.stopPropagation()" onclick="event.stopPropagation()" style="font-size:11px;padding:4px 8px;border:1px solid var(--sand);border-radius:6px;background:' + sc.bg + ';color:' + sc.color + ';font-weight:600;cursor:pointer">';
  ['Not Addressed', 'In Progress', 'Completed'].forEach(function(s) {
    html += '<option value="' + s + '"' + (n.status === s ? ' selected' : '') + '>' + s + '</option>';
  });
  html += '</select>';

  if (n.addressed_by) {
    html += '<span style="font-size:10px;color:var(--muted)">Updated by ' + n.addressed_by + ' · ' + notifTimeAgo(n.addressed_at) + '</span>';
  }

  if (readers.length > 0) {
    var readNames = readers.map(function(r) { return r.user; }).join(', ');
    html += '<span style="font-size:10px;color:var(--muted);margin-left:auto">Read by: ' + readNames + '</span>';
  }

  html += '</div>';
  html += '</div>';
  return html;
}

// ── Init ───────────────────────────────────────────────────
function notifInit() {
  notifInjectBell();
  notifPollSubmissions();
  // Re-poll every 60 seconds
  if (notifPollTimer) clearInterval(notifPollTimer);
  notifPollTimer = setInterval(notifPollSubmissions, 60000);
}