// Comms — team communication

function commsNavBadge() {
  var badge = document.getElementById('n-comms-badge');
  if (!badge) return;
  // Count total unread for curUser
  var total = 0;
  // group unread
  total += commsUnread.group[curUser] || 0;
  // dm unread — any conversation key involving curUser
  Object.keys(commsUnread.dm).forEach(function(key) {
    if (key.indexOf(curUser) > -1) total += commsUnread.dm[key][curUser] || 0;
  });
  badge.style.display = total > 0 ? 'inline-flex' : 'none';
  badge.textContent   = total > 9 ? '9+' : String(total);
}

function markCommsRead() {
  // Clear unread for current user when they open comms
  commsUnread.group[curUser] = 0;
  Object.keys(commsUnread.dm).forEach(function(key) {
    if (key.indexOf(curUser) > -1 && commsUnread.dm[key][curUser]) {
      commsUnread.dm[key][curUser] = 0;
    }
  });
  commsNavBadge();
  // Re-render DM list so any red dots clear
  renderDmList();
}

function renderCommsPage() {
  markCommsRead();
  // Show group chat by default
  var cg = document.getElementById('comms-group');
  var cd = document.getElementById('comms-dm');
  if (cg) cg.style.display = 'block';
  if (cd) cd.style.display = 'none';
  // Reset tab pills
  document.querySelectorAll('.sm-pill').forEach(function(p){
    if(p.textContent.indexOf('Group')>-1) p.classList.add('on');
    else if(p.textContent.indexOf('Direct')>-1) p.classList.remove('on');
  });
  renderGroupThread();
  renderDmList();
}

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
    row.className = 'msg-row' + (mine?' mine':'');
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
}

function sendGroupMsg() {
  var inp = document.getElementById('group-input');
  if (!inp || !inp.value.trim()) return;
  var msg = {from:curUser, text:inp.value.trim(), time:new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})};
  groupMsgs.push(msg);
  inp.value = '';
  // Mark unread for everyone else
  Object.keys(USERS).forEach(function(u) {
    if (u !== curUser) {
      commsUnread.group[u] = (commsUnread.group[u]||0) + 1;
    }
  });
  commsNavBadge();
  renderGroupThread();
}

function renderDmList() {
  var el = document.getElementById('dm-list'); if (!el) return;
  el.innerHTML = '';
  var others = Object.keys(USERS).filter(function(u){return u!==curUser;});
  var avatarColors = {latisha:'#C4956A', salma:'#C49A8A', lemari:'#7A8C6E'};
  others.forEach(function(uid) {
    var u   = USERS[uid];
    var key = [curUser, uid].sort().join('_');
    var unread = (commsUnread.dm[key] && commsUnread.dm[key][curUser]) || 0;
    var lastMsg = dmMsgs[key] && dmMsgs[key].length ? dmMsgs[key][dmMsgs[key].length-1] : null;
    var btn = document.createElement('button');
    btn.className = 'dm-person-btn' + (activeDmUser===uid?' active':'');
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
      + (lastMsg ? (lastMsg.from===curUser?'You: ':cap(lastMsg.from)+': ') + lastMsg.text : u.role)
      + '</div>'
      + '</div>';
    btn.onclick = function(){ openDm(uid); };
    el.appendChild(btn);
  });
}

function openDm(uid) {
  activeDmUser = uid;
  // Clear unread for this conversation
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
  var wrap = document.getElementById('dm-thread-wrap'); if (wrap) wrap.style.display='block';
  renderDmThread();
  renderDmList(); // refresh list to clear red dot
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
    row.className = 'msg-row' + (mine?' mine':'');
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
  inp.value = '';
  // Mark unread for recipient
  if (!commsUnread.dm[key]) commsUnread.dm[key] = {};
  commsUnread.dm[key][activeDmUser] = (commsUnread.dm[key][activeDmUser]||0) + 1;
  commsNavBadge();
  renderDmThread();
  renderDmList();
}

function showCommsTab(tab, btn) {
  document.getElementById('comms-group').style.display = tab==='group'?'block':'none';
  document.getElementById('comms-dm').style.display    = tab==='dm'   ?'block':'none';
  document.querySelectorAll('#pg-comms .sm-pill').forEach(function(b){b.classList.remove('on');});
  if (btn) btn.classList.add('on');
  if (tab==='group') {
    commsUnread.group[curUser] = 0;
    commsNavBadge();
  }
}

// ════════════════════════════════════════════════════════════════
// TASK COMPLETION, HIDING & NOTIFICATIONS
// ════════════════════════════════════════════════════════════════

// Called when staff clicks ✓ Done — marks status=done, prompts to hide
