// ══════════════════════════════════════════════════════════════
// COMMS — Group Chat & Direct Messages
// ══════════════════════════════════════════════════════════════

var groupMsgs = [], dmMsgs = {}, activeDmUser = null;
var commsUnread = { group: {}, dm: {} };

// ── Supabase config (for DM polling) ───────────────────────
var _CSURL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
var _CSKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
var _CSH = { apikey: _CSKEY, Authorization: 'Bearer ' + _CSKEY };

// ── Notification tracking ───────────────────────────────────
var _dmLastCounts     = {};   // { threadKey: count }
var _groupLastNCount  = 0;    // last count we notified about
var _dmPollingReady   = false; // true after first poll snapshots baseline

// ── Toast notification ──────────────────────────────────────
function showCommsToast(senderName, text) {
  var toast = document.getElementById('comms-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'comms-toast';
    toast.style.cssText = [
      'position:fixed', 'bottom:28px', 'right:28px',
      'background:#3A3530', 'color:white',
      'padding:12px 16px', 'border-radius:12px',
      'font-family:Inter,sans-serif', 'font-size:13px',
      'line-height:1.4', 'z-index:9999',
      'opacity:0', 'transition:opacity .3s',
      'pointer-events:none', 'max-width:280px',
      'box-shadow:0 4px 16px rgba(0,0,0,.25)'
    ].join(';');
    document.body.appendChild(toast);
  }
  var safeText = text.length > 60 ? text.substring(0, 60) + '…' : text;
  toast.innerHTML = '💬 <strong>' + esc(senderName) + '</strong>: ' + esc(safeText);
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(function() { toast.style.opacity = '0'; }, 4500);
}

// ── Nav badge ───────────────────────────────────────────────
function commsNavBadge() {
  var badge = document.getElementById('n-comms-badge');
  if (!badge) return;
  var total = commsUnread.group[curUser] || 0;
  Object.keys(commsUnread.dm).forEach(function(key) {
    if (key.indexOf(curUser) > -1) total += commsUnread.dm[key][curUser] || 0;
  });
  badge.style.display = total > 0 ? 'inline-flex' : 'none';
  badge.textContent   = total > 9 ? '9+' : String(total);
}

function markCommsRead() {
  commsUnread.group[curUser] = 0;
  Object.keys(commsUnread.dm).forEach(function(key) {
    if (key.indexOf(curUser) > -1 && commsUnread.dm[key][curUser]) {
      commsUnread.dm[key][curUser] = 0;
    }
  });
  commsNavBadge();
  renderDmList();
}

// ── Comms page render ───────────────────────────────────────
function renderCommsPage() {
  markCommsRead();
  var cg = document.getElementById('comms-group');
  var cd = document.getElementById('comms-dm');
  if (cg) cg.style.display = 'block';
  if (cd) cd.style.display = 'none';
  document.querySelectorAll('.sm-pill').forEach(function(p) {
    if (p.textContent.indexOf('Group')  > -1) p.classList.add('on');
    else if (p.textContent.indexOf('Direct') > -1) p.classList.remove('on');
  });
  renderGroupThread();
  renderDmList();
}

// ── Group chat ──────────────────────────────────────────────
function renderGroupThread() {
  var el = document.getElementById('group-thread'); if (!el) return;
  el.innerHTML = '';
  if (!groupMsgs.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:30px">No messages yet. Say hello! 👋</div>';
    return;
  }
  var avatarColors = {latisha:'#C4956A', salma:'#C49A8A', lemari:'#7A8C6E'};
  groupMsgs.forEach(function(m) {
    var mine = m.from === curUser;
    var row  = document.createElement('div');
    row.className = 'msg-row' + (mine ? ' mine' : '');
    row.innerHTML = (!mine
      ? '<div class="msg-av-sm" style="background:' + (avatarColors[m.from]||'#999') + '">' + cap(m.from).charAt(0) + '</div>'
      : '')
      + '<div class="msg-content">'
      + (!mine ? '<div class="msg-sender">' + cap(m.from) + '</div>' : '')
      + '<div class="msg-bubble">' + esc(m.text) + '</div>'
      + '<div class="msg-time">' + m.time + '</div>'
      + '</div>';
    el.appendChild(row);
  });
  el.scrollTop = el.scrollHeight;
  // notify if new messages from others arrived while not watching
  _checkGroupNotify();
}

function sendGroupMsg() {
  var inp = document.getElementById('group-input');
  if (!inp || !inp.value.trim()) return;
  var msg = {from:curUser, text:inp.value.trim(), time:new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})};
  groupMsgs.push(msg);
  _groupLastNCount = groupMsgs.length; // don't notify yourself
  inp.value = '';
  Object.keys(USERS).forEach(function(u) {
    if (u !== curUser) commsUnread.group[u] = (commsUnread.group[u]||0) + 1;
  });
  commsNavBadge();
  renderGroupThread();
  // comms-fix-v39.js handles persistence to comms_group table — saveData not needed here
}

// ── Group notification check (called after thread renders) ──
function _checkGroupNotify() {
  if (!curUser || !groupMsgs.length) return;
  if (groupMsgs.length <= _groupLastNCount) { _groupLastNCount = groupMsgs.length; return; }
  var newMsgs = groupMsgs.slice(_groupLastNCount);
  _groupLastNCount = groupMsgs.length;
  var onComms = document.getElementById('pg-comms') && document.getElementById('pg-comms').classList.contains('on');
  newMsgs.forEach(function(msg) {
    if (msg.from === curUser) return;
    if (!onComms) commsUnread.group[curUser] = (commsUnread.group[curUser]||0) + 1;
    var name = USERS[msg.from] ? USERS[msg.from].name : cap(msg.from);
    showCommsToast(name, msg.text);
  });
  commsNavBadge();
}

// ── Direct messages ─────────────────────────────────────────
function renderDmList() {
  var el = document.getElementById('dm-list'); if (!el) return;
  el.innerHTML = '';
  var others = Object.keys(USERS).filter(function(u){ return u !== curUser; });
  var avatarColors = {latisha:'#C4956A', salma:'#C49A8A', lemari:'#7A8C6E'};
  others.forEach(function(uid) {
    var u      = USERS[uid];
    var key    = [curUser, uid].sort().join('_');
    var unread  = (commsUnread.dm[key] && commsUnread.dm[key][curUser]) || 0;
    var lastMsg = dmMsgs[key] && dmMsgs[key].length ? dmMsgs[key][dmMsgs[key].length-1] : null;
    var btn = document.createElement('button');
    btn.className = 'dm-person-btn' + (activeDmUser === uid ? ' active' : '');
    btn.innerHTML =
      '<div style="position:relative">'
      + '<div class="dm-av" style="background:' + (avatarColors[uid]||'#999') + '">' + u.name.charAt(0) + '</div>'
      + (unread > 0 ? '<div style="position:absolute;top:-4px;right:-4px;background:#EF4444;color:white;border-radius:50%;width:16px;height:16px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">' + unread + '</div>' : '')
      + '</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="display:flex;justify-content:space-between;align-items:center">'
      + '<div style="font-size:13px;font-weight:600;color:var(--charcoal)">' + u.name + '</div>'
      + (lastMsg ? '<div style="font-size:10px;color:var(--muted)">' + lastMsg.time + '</div>' : '')
      + '</div>'
      + '<div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px">'
      + (lastMsg ? (lastMsg.from === curUser ? 'You: ' : cap(lastMsg.from)+': ') + lastMsg.text : u.role)
      + '</div>'
      + '</div>';
    btn.onclick = function() { openDm(uid); };
    el.appendChild(btn);
  });
}

function openDm(uid) {
  activeDmUser = uid;
  var key = [curUser, uid].sort().join('_');
  if (commsUnread.dm[key]) commsUnread.dm[key][curUser] = 0;
  commsNavBadge();
  var hd = document.getElementById('dm-header');
  if (hd) {
    var avatarColors = {latisha:'#C4956A', salma:'#C49A8A', lemari:'#7A8C6E'};
    hd.innerHTML = '<div class="dm-av" style="background:' + (avatarColors[uid]||'#999') + ';width:28px;height:28px;font-size:13px">' + USERS[uid].name.charAt(0) + '</div>'
      + '<div><div style="font-size:14px;font-weight:600">' + USERS[uid].name + '</div>'
      + '<div style="font-size:11px;color:var(--muted)">' + USERS[uid].role + '</div></div>';
  }
  var wrap = document.getElementById('dm-thread-wrap'); if (wrap) wrap.style.display = 'block';
  // mark messages as read and update DM last count
  var key2 = [curUser, uid].sort().join('_');
  _dmLastCounts[key2] = (dmMsgs[key2]||[]).length;
  renderDmThread();
  renderDmList();
}

function renderDmThread() {
  var el = document.getElementById('dm-thread'); if (!el) return;
  var key  = [curUser, activeDmUser].sort().join('_');
  var msgs = dmMsgs[key] || [];
  el.innerHTML = '';
  if (!msgs.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:30px">No messages yet.</div>';
    return;
  }
  var avatarColors = {latisha:'#C4956A', salma:'#C49A8A', lemari:'#7A8C6E'};
  msgs.forEach(function(m) {
    var mine = m.from === curUser;
    var row  = document.createElement('div');
    row.className = 'msg-row' + (mine ? ' mine' : '');
    row.innerHTML = (!mine
      ? '<div class="msg-av-sm" style="background:' + (avatarColors[m.from]||'#999') + '">' + cap(m.from).charAt(0) + '</div>'
      : '')
      + '<div class="msg-content">'
      + '<div class="msg-bubble">' + esc(m.text) + '</div>'
      + '<div class="msg-time">' + m.time + '</div>'
      + '</div>';
    el.appendChild(row);
  });
  el.scrollTop = el.scrollHeight;
}

function sendDm() {
  var inp = document.getElementById('dm-input');
  if (!inp || !inp.value.trim() || !activeDmUser) return;
  var key = [curUser, activeDmUser].sort().join('_');
  if (!dmMsgs[key]) dmMsgs[key] = [];
  var msg = {from:curUser, text:inp.value.trim(), time:new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})};
  dmMsgs[key].push(msg);
  _dmLastCounts[key] = dmMsgs[key].length; // don't notify yourself
  inp.value = '';
  if (!commsUnread.dm[key]) commsUnread.dm[key] = {};
  commsUnread.dm[key][activeDmUser] = (commsUnread.dm[key][activeDmUser]||0) + 1;
  commsNavBadge();
  renderDmThread();
  renderDmList();
  saveData();
}

function showCommsTab(tab, btn) {
  document.getElementById('comms-group').style.display = tab === 'group' ? 'block' : 'none';
  document.getElementById('comms-dm').style.display    = tab === 'dm'    ? 'block' : 'none';
  document.querySelectorAll('#pg-comms .sm-pill').forEach(function(b){ b.classList.remove('on'); });
  if (btn) btn.classList.add('on');
  if (tab === 'group') {
    commsUnread.group[curUser] = 0;
    commsNavBadge();
  }
}

// ── DM polling — checks comms_dm table every 5 seconds ─────
function _pollDMs() {
  if (!curUser) return;
  fetch(_CSURL + '/rest/v1/comms_dm?select=*&order=created_at.asc', { headers: _CSH })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!Array.isArray(data)) return;
      // Group by thread_key
      var threads = {};
      data.forEach(function(m) {
        if (!threads[m.thread_key]) threads[m.thread_key] = [];
        var t  = new Date(m.created_at);
        var h  = t.getHours(), mn = t.getMinutes();
        var ap = h >= 12 ? 'pm' : 'am';
        h = h % 12 || 12;
        threads[m.thread_key].push({
          from: m.author,
          text: m.message,
          time: (h < 10 ? '0' : '') + h + ':' + (mn < 10 ? '0' : '') + mn + ' ' + ap
        });
      });
      var anyNew = false;
      Object.keys(threads).forEach(function(key) {
        if (key.indexOf(curUser) === -1) return;
        var incoming = threads[key];
        // Update local store so DM list shows latest messages
        dmMsgs[key] = incoming;
        if (!_dmPollingReady) {
          // First poll: just snapshot current counts, don't notify
          _dmLastCounts[key] = incoming.length;
          return;
        }
        var prev = _dmLastCounts[key] !== undefined ? _dmLastCounts[key] : 0;
        if (incoming.length <= prev) { _dmLastCounts[key] = incoming.length; return; }
        // New messages since last check
        var newMsgs = incoming.slice(prev);
        _dmLastCounts[key] = incoming.length;
        newMsgs.forEach(function(msg) {
          if (msg.from === curUser) return;
          if (!commsUnread.dm[key]) commsUnread.dm[key] = {};
          commsUnread.dm[key][curUser] = (commsUnread.dm[key][curUser]||0) + 1;
          anyNew = true;
          var name = USERS[msg.from] ? USERS[msg.from].name : cap(msg.from);
          showCommsToast(name, msg.text);
        });
      });
      _dmPollingReady = true; // after first pass, all subsequent polls notify
      if (anyNew) {
        commsNavBadge();
        renderDmList();
        // If the thread is open, refresh it
        if (activeDmUser) {
          var openKey = [curUser, activeDmUser].sort().join('_');
          if (threads[openKey]) renderDmThread();
        }
      }
    }).catch(function(){});
}

// ── Boot: start DM polling after page loads ─────────────────
(function() {
  function startPolling() {
    _pollDMs();
    setInterval(_pollDMs, 5000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPolling);
  } else {
    setTimeout(startPolling, 1000);
  }
})();
