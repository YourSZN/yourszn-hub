/**
 * comms-fix.js v20.0
 * RESTORED: v16 DM + Group + Hidden task fixes exactly as they were
 * NEW: Task table patches added carefully with no quote escaping issues
 */
(function () {
  'use strict';
  const U = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  const K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };

  function tk(a, b) { return [a, b].sort().join('_'); }
  async function ins(table, data) {
    try { await fetch(U + '/rest/v1/' + table, { method: 'POST', headers: Object.assign({}, H, { Prefer: 'return=minimal' }), body: JSON.stringify(data) }); } catch(e) {}
  }

  // -- DM SECTION - DO NOT MODIFY --
  function filterDMsForUser(user) {
    if (!window.dmMsgs || !window.USERS || !user) return;
    const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== user);
    const myKeys = others.map(o => tk(user, o));
    Object.keys(window.dmMsgs).forEach(key => { if (!myKeys.includes(key)) delete window.dmMsgs[key]; });
  }
  function interceptLogin() {
    if (typeof window.chkPin !== 'function') return;
    const orig = window.chkPin;
    window.chkPin = function(pin) {
      const r = orig.call(this, pin);
      setTimeout(() => { const user = window.curUser; if (user) filterDMsForUser(user.toLowerCase()); }, 500);
      return r;
    };
  }
  function interceptSendDm() {
    if (typeof window.sendDm !== 'function') return;
    const orig = window.sendDm;
    window.sendDm = async function() {
      const r = orig.apply(this, arguments);
      await new Promise(x => setTimeout(x, 200));
      const user = window.curUser; const other = window.activeDmUser;
      if (!user || !other || !window.dmMsgs) return r;
      const key = [user, other].sort().join('_');
      const msgs = window.dmMsgs[key] || [];
      const last = msgs[msgs.length - 1];
      if (last && last.from && last.text) await ins('comms_dm', { thread_key: key, author: last.from, message: last.text });
      return r;
    };
  }
  function watchAppReloadForDMs() {
    const origLog = console.log;
    console.log = function() {
      origLog.apply(console, arguments);
      if (arguments[0] && String(arguments[0]).includes('cloud load successful')) {
        setTimeout(() => { const user = window.curUser; if (user) filterDMsForUser(user.toLowerCase()); }, 200);
      }
    };
  }
  // -- END DM SECTION --

  // -- GROUP CHAT SECTION - DO NOT MODIFY --
  function interceptSendGroupMsg() {
    if (typeof window.sendGroupMsg !== 'function') return;
    const orig = window.sendGroupMsg;
    window.sendGroupMsg = async function() {
      const r = orig.apply(this, arguments);
      await new Promise(x => setTimeout(x, 200));
      const last = (window.groupMsgs || []).slice(-1)[0];
      if (last && last.from && last.text) await ins('comms_group', { author: last.from, message: last.text });
      return r;
    };
  }
  let lastGroupCount = 0;
  async function pollGroup() {
    try {
      const r = await fetch(U + '/rest/v1/comms_group?select=*&order=created_at.asc', { headers: H });
      if (!r.ok) return;
      const data = await r.json();
      if (!data.length || data.length === lastGroupCount) return;
      const fmt = d => new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
      window.groupMsgs = data.map(m => ({ from: m.author, text: m.message, time: fmt(m.created_at) }));
      lastGroupCount = data.length;
      if (typeof window.renderGroupThread === 'function') window.renderGroupThread();
    } catch(e) {}
  }
  // -- END GROUP CHAT SECTION --

  // -- HIDDEN TASK FIX - EXACT v16 --
  function fixRenderHiddenBoxFor() {
    if (typeof window.renderHiddenBoxFor !== 'function') return;
    window.renderHiddenBoxFor = function(view) {
      var elId = view === 'owner' ? 'hidden-box-owner' : 'hidden-box-staff';
      var el = document.getElementById(elId);
      if (!el) return;
      var hiddenIds = Object.keys(window.hiddenTasks || {});
      var myHidden;
      if (window.curUser === 'latisha') {
        myHidden = hiddenIds.map(function(id) {
          return (window.tasks || []).find(function(t) { return String(t.id) === String(id); });
        }).filter(Boolean);
      } else {
        myHidden = hiddenIds
          .filter(function(id) {
            if (!window.hiddenTasks[id]) return false;
            var t = (window.tasks || []).find(function(t) { return String(t.id) === String(id); });
            if (!t) return false;
            var assignee = t.assignedTo || t.assigned_to || '';
            return assignee === window.curUser;
          })
          .map(function(id) {
            return (window.tasks || []).find(function(t) { return String(t.id) === String(id); });
          })
          .filter(Boolean);
      }
      if (!myHidden.length) { el.style.display = 'none'; return; }
      el.style.display = 'block';
      var isOpen = !!window.hiddenBoxOpen[view];
      var html = '<div class="hidden-box-hd" onclick="toggleHiddenBox('' + view + '')">' +
        '<span>👁 ' + myHidden.length + ' hidden task' + (myHidden.length !== 1 ? 's' : '') + '</span>' +
        '<span style="float:right">' + (isOpen ? '▲ collapse' : '▼ show') + '</span>' +
        '</div>';
      if (isOpen) {
        html += '<div class="hidden-box-list">';
        myHidden.forEach(function(t) {
          var h = window.hiddenTasks[String(t.id)];
          var canUnhide = window.curUser === 'latisha' || (h && h.by === window.curUser);
          html += '<div class="hb-row">' +
            '<div class="hb-main">' +
            '<div class="hb-title">' + (t.title || '') + '</div>' +
            '<div class="hb-meta">' +
            (h && h.completedDate ? '<span class="hb-date">🗓 ' + h.completedDate + '</span> ' : '') +
            (window.curUser === 'latisha' && h && h.by ? '<span class="hb-who">by ' + h.by + '</span> ' : '') +
            '<span class="hb-cat">' + (t.category || 'Admin') + '</span>' +
            (h && h.staffNotes ? '<div class="hb-notes">' + h.staffNotes + '</div>' : '') +
            '</div></div>' +
            (canUnhide ? '<button class="hb-restore" onclick="unhideTask('' + String(t.id) + '');event.stopPropagation()">Restore</button>' : '') +
            '</div>';
        });
        html += '</div>';
      }
      el.innerHTML = html;
      console.log('[comms-fix] Hidden box:', view, myHidden.length, 'tasks for', window.curUser);
    };
    if (typeof window.renderHiddenBox === 'function') window.renderHiddenBox();
    console.log('[comms-fix] renderHiddenBoxFor patched + re-rendered');
  }
  function fixUnhideTask() {
    if (typeof window.unhideTask !== 'function') return;
    const orig = window.unhideTask;
    window.unhideTask = function(taskId) {
      orig.call(this, taskId);
      if (typeof window.saveData === 'function') window.saveData();
    };
  }
  // -- END HIDDEN TASK FIX --

  // -- TASK TABLE v20 --
  // Status values stored in DB: 'not-started', 'in-progress', 'blocked', 'complete'
  var ST = [
    { v: 'not-started', l: 'Not Started', bg: '#f0f0f0', c: '#666' },
    { v: 'in-progress', l: 'In Progress', bg: '#fff3e0', c: '#e65100' },
    { v: 'blocked',     l: 'Blocked',     bg: '#fdecea', c: '#c62828' },
    { v: 'complete',    l: 'Complete',    bg: '#e8f5e9', c: '#2e7d32' }
  ];
  var expandedRows = {};

  function stCfg(v) {
    var val = (v || 'not-started').toLowerCase();
    return ST.find(function(o) { return o.v === val; }) || ST[0];
  }

  // Inject CSS to hide priority column cells tagged with class v20pri
  function injectCSS() {
    if (document.getElementById('v20css')) return;
    var s = document.createElement('style');
    s.id = 'v20css';
    s.textContent = '.v20pri{display:none!important;width:0!important;padding:0!important;border:none!important}';
    document.head.appendChild(s);
  }

  // Global callbacks — must not use template literals to avoid escaping issues
  window.__v20_status = function(taskId, newVal, sel) {
    var t = (window.tasks || []).find(function(x) { return String(x.id) === String(taskId); });
    if (!t) return;
    t.status = newVal;
    var cfg = stCfg(newVal);
    sel.style.background = cfg.bg;
    sel.style.color = cfg.c;
    sel.style.borderColor = cfg.c;
    if (typeof window.saveData === 'function') window.saveData();
  };

  window.__v20_expand = function(taskId) {
    expandedRows[taskId] = !expandedRows[taskId];
    var dr = document.getElementById('v20d' + taskId);
    if (dr) dr.style.display = expandedRows[taskId] ? 'table-row' : 'none';
    var cr = document.getElementById('v20c' + taskId);
    if (cr) cr.textContent = expandedRows[taskId] ? ' ▲' : ' ▼';
  };

  function safeId(id) {
    // Make task id safe to embed in HTML attribute / inline JS string
    return String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  function buildSelect(task) {
    var cfg = stCfg(task.status);
    var style = 'background:' + cfg.bg + ';color:' + cfg.c + ';border:1px solid ' + cfg.c +
      ';padding:3px 7px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;outline:none;width:100%;max-width:120px;';
    var sid = safeId(task.id);
    var opts = ST.map(function(o) {
      return '<option value=' + o.v + (o.v === (task.status || 'not-started').toLowerCase() ? ' selected' : '') + '>' + o.l + '</option>';
    }).join('');
    return '<select data-v20s=1 style="' + style + '" onchange="__v20_status(' + JSON.stringify(String(task.id)) + ',this.value,this)" onclick="event.stopPropagation()">' + opts + '</select>';
  }

  function buildDetail(task, cols) {
    var desc  = task.desc || task.description || '';
    var video = task.videoUrl || task.video_url || task.trainingVideoUrl || task.training_video_url || '';
    var file  = task.fileUrl || task.file_url || '';
    var notes = task.notes || task.staffNotes || task.staff_notes || '';
    var inner = '';
    if (!desc && !video && !file && !notes) {
      inner = '<em style="color:#bbb;font-size:12px">No extra details saved for this task yet.</em>';
    } else {
      var lbl = 'font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px';
      if (desc)  inner += '<div style="margin-bottom:8px"><div style="' + lbl + '">Instructions</div><div style="font-size:13px;color:#333;white-space:pre-wrap">' + desc.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</div></div>';
      if (video) inner += '<div style="margin-bottom:8px"><div style="' + lbl + '">Training Video</div><a href="' + video + '" target=_blank style="font-size:13px;color:#b5785a">' + video + '</a></div>';
      if (file)  inner += '<div style="margin-bottom:8px"><div style="' + lbl + '">File / Resource</div><a href="' + file + '" target=_blank style="font-size:13px;color:#b5785a">' + file + '</a></div>';
      if (notes) inner += '<div><div style="' + lbl + '">Notes</div><div style="font-size:13px;color:#333;white-space:pre-wrap">' + notes.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</div></div>';
    }
    var sid = safeId(task.id);
    return '<tr id=v20d' + sid + ' data-v20det=1 style=display:none><td colspan=' + cols +
      ' style="padding:14px 18px 16px 36px;background:#faf8f5;border-bottom:2px solid #ece8e3">' + inner + '</td></tr>';
  }

  function doPatch() {
    if (!window.tasks || !window.tasks.length) return;
    document.querySelectorAll('table').forEach(function(table) {
      if (table.dataset.v20skip) return;
      var hrow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!hrow) return;
      var ths = Array.from(hrow.querySelectorAll('th,td'));
      var hdrs = ths.map(function(h) { return h.textContent.trim().toLowerCase(); });
      var hasTask   = hdrs.some(function(h) { return h === 'task' || h === 'title'; });
      var hasStatus = hdrs.some(function(h) { return h === 'status'; });
      if (!hasTask || !hasStatus) { table.dataset.v20skip = 1; return; }

      var priIdx  = hdrs.findIndex(function(h) { return h === 'priority'; });
      var stIdx   = hdrs.findIndex(function(h) { return h === 'status'; });
      var titIdx  = hdrs.findIndex(function(h) { return h === 'task' || h === 'title'; });
      var notIdx  = hdrs.findIndex(function(h) { return h === 'notes'; });
      var cols    = ths.length;

      // Hide priority TH
      if (priIdx > -1) ths[priIdx].classList.add('v20pri');
      // Widen notes TH
      if (notIdx > -1) { ths[notIdx].style.minWidth = '200px'; ths[notIdx].style.width = '260px'; }

      // Patch data rows
      Array.from(table.querySelectorAll('tr')).forEach(function(row) {
        if (row === hrow || row.dataset.v20det) return;
        var cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 3) return;

        // Hide priority TD
        if (priIdx > -1 && cells[priIdx]) cells[priIdx].classList.add('v20pri');
        // Widen notes TD
        if (notIdx > -1 && cells[notIdx]) {
          cells[notIdx].style.minWidth = '200px';
          cells[notIdx].style.whiteSpace = 'normal';
          cells[notIdx].style.wordBreak = 'break-word';
        }

        // Find matching task by title
        var titCell = titIdx > -1 ? cells[titIdx] : cells[0];
        if (!titCell) return;
        var titleText = titCell.textContent.trim();
        var task = (window.tasks || []).find(function(t) {
          return (t.title || '').trim() === titleText;
        });
        if (!task) return;
        var sid = safeId(task.id);

        // Replace status cell with dropdown (only if not already done)
        if (stIdx > -1 && cells[stIdx] && !cells[stIdx].querySelector('[data-v20s]')) {
          cells[stIdx].innerHTML = buildSelect(task);
        }

        // Make title clickable with expand caret (only once per row)
        if (!titCell.dataset.v20c) {
          titCell.dataset.v20c = 1;
          titCell.style.cursor = 'pointer';
          var titleEsc = (task.title || titleText).replace(/</g,'&lt;').replace(/>/g,'&gt;');
          titCell.innerHTML = '<span onclick="__v20_expand(' + JSON.stringify(sid) + ')" style="font-weight:600">' +
            titleEsc + '<span id=v20c' + sid + ' style="font-size:9px;color:#ccc;margin-left:4px"> ▼</span></span>';
          // Insert detail row after this row if not already there
          if (!document.getElementById('v20d' + sid)) {
            row.insertAdjacentHTML('afterend', buildDetail(task, cols));
            var dr = document.getElementById('v20d' + sid);
            if (dr) dr.dataset.v20det = 1;
          }
        }
      });
    });
  }

  function watchTaskTable() {
    injectCSS();
    doPatch();
    var obs = new MutationObserver(function(muts) {
      if (muts.some(function(m) { return m.addedNodes.length > 0; })) setTimeout(doPatch, 120);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setInterval(doPatch, 900);
    console.log('[v20] task table watcher active');
  }
  // -- END TASK TABLE v20 --

  async function boot() {
    console.log('[comms-fix] v20.0 booting...');
    await new Promise(r => setTimeout(r, 2000));
    interceptLogin();
    interceptSendDm();
    watchAppReloadForDMs();
    if (window.curUser) filterDMsForUser(window.curUser.toLowerCase());
    interceptSendGroupMsg();
    await pollGroup();
    setInterval(pollGroup, 5000);
    fixRenderHiddenBoxFor();
    fixUnhideTask();
    watchTaskTable();
    console.log('[comms-fix] v20.0 active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 500);
  }
})();