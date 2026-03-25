/**
 * comms-fix.js v22.0
 * v16 core: DM + Group + Hidden tasks UNCHANGED
 * v22: Task table fixes
 *   - Fixed colspan syntax (quoted attributes)
 *   - Hours columns now visible (detail row uses full colspan correctly)
 *   - Staff notes button in each row — opens editable textarea in expanded panel
 *   - Latisha sees all staff notes; staff edit their own note on their tasks
 */
(function () {
  'use strict';
  var U = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  var K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  var H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };

  function tk(a, b) { return [a, b].sort().join('_'); }
  function ins(table, data) {
    try { fetch(U + '/rest/v1/' + table, { method: 'POST', headers: Object.assign({}, H, { Prefer: 'return=minimal' }), body: JSON.stringify(data) }); } catch(e) {}
  }

  // ── DM SECTION - DO NOT MODIFY ─────────────────────────────────
  function filterDMsForUser(user) {
    if (!window.dmMsgs || !window.USERS || !user) return;
    var others = Object.keys(window.USERS).map(function(k) { return k.toLowerCase(); }).filter(function(k) { return k !== user; });
    var myKeys = others.map(function(o) { return tk(user, o); });
    Object.keys(window.dmMsgs).forEach(function(key) { if (!myKeys.includes(key)) delete window.dmMsgs[key]; });
  }
  function interceptLogin() {
    if (typeof window.chkPin !== 'function') return;
    var orig = window.chkPin;
    window.chkPin = function(pin) {
      var r = orig.call(this, pin);
      setTimeout(function() { var user = window.curUser; if (user) filterDMsForUser(user.toLowerCase()); }, 500);
      return r;
    };
  }
  function interceptSendDm() {
    if (typeof window.sendDm !== 'function') return;
    var orig = window.sendDm;
    window.sendDm = function() {
      var args = arguments;
      var r = orig.apply(this, args);
      setTimeout(function() {
        var user = window.curUser; var other = window.activeDmUser;
        if (!user || !other || !window.dmMsgs) return;
        var key = [user, other].sort().join('_');
        var msgs = window.dmMsgs[key] || [];
        var last = msgs[msgs.length - 1];
        if (last && last.from && last.text) ins('comms_dm', { thread_key: key, author: last.from, message: last.text });
      }, 200);
      return r;
    };
  }
  function watchAppReloadForDMs() {
    var origLog = console.log;
    console.log = function() {
      origLog.apply(console, arguments);
      if (arguments[0] && String(arguments[0]).includes('cloud load successful')) {
        setTimeout(function() { var user = window.curUser; if (user) filterDMsForUser(user.toLowerCase()); }, 200);
      }
    };
  }
  // ── END DM SECTION ────────────────────────────────────────

  // ── GROUP CHAT SECTION - DO NOT MODIFY ──────────────────────
  function interceptSendGroupMsg() {
    if (typeof window.sendGroupMsg !== 'function') return;
    var orig = window.sendGroupMsg;
    window.sendGroupMsg = function() {
      var r = orig.apply(this, arguments);
      setTimeout(function() {
        var last = (window.groupMsgs || []).slice(-1)[0];
        if (last && last.from && last.text) ins('comms_group', { author: last.from, message: last.text });
      }, 200);
      return r;
    };
  }
  var lastGroupCount = 0;
  function pollGroup() {
    fetch(U + '/rest/v1/comms_group?select=*&order=created_at.asc', { headers: H })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.length || data.length === lastGroupCount) return;
        window.groupMsgs = data.map(function(m) {
          var t = new Date(m.created_at);
          var h = t.getHours(); var mn = t.getMinutes();
          var ampm = h >= 12 ? 'pm' : 'am';
          h = h % 12 || 12;
          return { from: m.author, text: m.message, time: (h < 10 ? '0' : '') + h + ':' + (mn < 10 ? '0' : '') + mn + ' ' + ampm };
        });
        lastGroupCount = data.length;
        if (typeof window.renderGroupThread === 'function') window.renderGroupThread();
      }).catch(function() {});
  }
  // ── END GROUP CHAT SECTION ─────────────────────────────

  // ── HIDDEN TASK FIX - EXACT v16 ──────────────────────────────
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
      var html = '<div class="hidden-box-hd" onclick="toggleHiddenBox(\'' + view + '\')">' +
        '<span>\uD83D\uDC41 ' + myHidden.length + ' hidden task' + (myHidden.length !== 1 ? 's' : '') + '</span>' +
        '<span style="float:right">' + (isOpen ? '\u25b2 collapse' : '\u25bc show') + '</span>' +
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
            (h && h.completedDate ? '<span class="hb-date">\uD83D\uDDD3 ' + h.completedDate + '</span> ' : '') +
            (window.curUser === 'latisha' && h && h.by ? '<span class="hb-who">by ' + h.by + '</span> ' : '') +
            '<span class="hb-cat">' + (t.category || 'Admin') + '</span>' +
            (h && h.staffNotes ? '<div class="hb-notes">' + h.staffNotes + '</div>' : '') +
            '</div></div>' +
            (canUnhide ? '<button class="hb-restore" onclick="unhideTask(\'' + String(t.id) + '\');event.stopPropagation()">Restore</button>' : '') +
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
    var orig = window.unhideTask;
    window.unhideTask = function(taskId) {
      orig.call(this, taskId);
      if (typeof window.saveData === 'function') window.saveData();
    };
  }
  // ── END HIDDEN TASK FIX ───────────────────────────────────

  // ── TASK TABLE v22 ────────────────────────────────────────
  var ST = [
    { v: 'not-started', l: 'Not Started', bg: '#f0f0f0', c: '#666' },
    { v: 'in-progress', l: 'In Progress', bg: '#fff3e0', c: '#e65100' },
    { v: 'blocked',     l: 'Blocked',     bg: '#fdecea', c: '#c62828' },
    { v: 'complete',    l: 'Complete',    bg: '#e8f5e9', c: '#2e7d32' }
  ];
  var expandedRows = {};

  function stCfg(v) {
    var val = (v || 'not-started').toLowerCase();
    var found = null;
    ST.forEach(function(o) { if (o.v === val) found = o; });
    return found || ST[0];
  }

  function injectCSS() {
    if (document.getElementById('v22css')) return;
    var s = document.createElement('style');
    s.id = 'v22css';
    s.textContent = [
      '.v22pri{display:none!important;width:0!important;padding:0!important;border:none!important}',
      '.v22-detail-row td{padding:14px 18px 16px 20px!important;background:#faf8f5!important;border-bottom:2px solid #ece8e3!important}',
      '.v22-notes-btn{background:#f5f0eb;border:1px solid #d4c9bc;color:#7a6a5a;font-size:11px;padding:3px 10px;border-radius:8px;cursor:pointer;white-space:nowrap}',
      '.v22-notes-btn:hover{background:#ece4da}',
      '.v22-notes-save{background:#c07a5a;border:none;color:#fff;font-size:12px;padding:5px 14px;border-radius:8px;cursor:pointer;margin-top:6px}',
      '.v22-notes-save:hover{background:#a5644a}',
      '.v22-notes-area{width:100%;box-sizing:border-box;border:1px solid #d4c9bc;border-radius:8px;padding:8px;font-size:13px;font-family:inherit;resize:vertical;min-height:70px;margin-top:6px}'
    ].join('');
    document.head.appendChild(s);
  }

  window.__v22_status = function(taskId, newVal, sel) {
    var t = null;
    (window.tasks || []).forEach(function(x) { if (String(x.id) === String(taskId)) t = x; });
    if (!t) return;
    t.status = newVal;
    var cfg = stCfg(newVal);
    sel.style.background = cfg.bg;
    sel.style.color = cfg.c;
    sel.style.borderColor = cfg.c;
    if (typeof window.saveData === 'function') window.saveData();
  };

  window.__v22_expand = function(sid) {
    expandedRows[sid] = !expandedRows[sid];
    var dr = document.getElementById('v22d' + sid);
    var cr = document.getElementById('v22c' + sid);
    if (!dr) return;
    if (expandedRows[sid]) {
      // Rebuild inner content fresh based on current logged-in user
      var task = null;
      (window.tasks || []).forEach(function(x) { if (safeId(x.id) === sid) task = x; });
      if (task) {
        var isLatisha = (window.curUser || '').toLowerCase() === 'latisha';
        var desc  = task.desc || task.description || '';
        var video = task.videoUrl || task.video_url || task.trainingVideoUrl || task.training_video_url || '';
        var file  = task.fileUrl || task.file_url || '';
        var lbl = 'font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px';
        var inner = '';
        if (desc)  inner += '<div style="margin-bottom:8px"><div style="' + lbl + '">Instructions</div><div style="font-size:13px;color:#333;white-space:pre-wrap">' + desc.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</div></div>';
        if (video) inner += '<div style="margin-bottom:8px"><div style="' + lbl + '">Training Video</div><a href="' + video + '" target="_blank" style="font-size:13px;color:#b5785a">' + video + '</a></div>';
        if (file)  inner += '<div style="margin-bottom:8px"><div style="' + lbl + '">File / Resource</div><a href="' + file + '" target="_blank" style="font-size:13px;color:#b5785a">' + file + '</a></div>';
        if (isLatisha) {
          inner += '<div style="margin-bottom:10px"><div style="' + lbl + '">My Notes (Owner)</div>';
          inner += '<textarea id="v22ta' + sid + '" class="v22-notes-area">' + (task.notes || '').replace(/</g,'&lt;') + '</textarea>';
          inner += '<button id="v22nb' + sid + '" class="v22-notes-save" onclick="__v22_saveNote(\'' + String(task.id) + '\',\'' + sid + '\')">Save Note</button></div>';
          var sNote = task.staffNotes || task.staff_notes || '';
          if (sNote) {
            var assignee = task.assignedTo || task.assigned_to || 'Staff';
            inner += '<div><div style="' + lbl + '">Note from ' + assignee + '</div><div style="font-size:13px;color:#555;white-space:pre-wrap;background:#fff;border:1px solid #e8e2db;border-radius:8px;padding:8px;margin-top:4px">' + sNote.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</div></div>';
          }
        } else {
          var myNote = task.staffNotes || task.staff_notes || '';
          inner += '<div><div style="' + lbl + '">My Notes</div>';
          inner += '<textarea id="v22ta' + sid + '" class="v22-notes-area">' + myNote.replace(/</g,'&lt;') + '</textarea>';
          inner += '<button id="v22nb' + sid + '" class="v22-notes-save" onclick="__v22_saveNote(\'' + String(task.id) + '\',\'' + sid + '\')">Save Note</button></div>';
        }
        if (!inner) inner = '<em style="color:#bbb;font-size:12px">No extra details saved for this task yet.</em>';
        dr.querySelector('td').innerHTML = inner;
      }
      dr.style.display = 'table-row';
    } else {
      dr.style.display = 'none';
    }
    if (cr) cr.textContent = expandedRows[sid] ? ' \u25b2' : ' \u25bc';
  };

  window.__v22_saveNote = function(taskId, sid) {
    var t = null;
    (window.tasks || []).forEach(function(x) { if (String(x.id) === String(taskId)) t = x; });
    if (!t) return;
    var ta = document.getElementById('v22ta' + sid);
    if (!ta) return;
    var noteVal = ta.value.trim();
    // Staff save to staffNotes; Latisha saves to notes (owner notes)
    if (window.curUser === 'latisha') {
      t.notes = noteVal;
    } else {
      t.staffNotes = noteVal;
      t.staff_notes = noteVal;
    }
    if (typeof window.saveData === 'function') window.saveData();
    // Show saved confirmation
    var btn = document.getElementById('v22nb' + sid);
    if (btn) { btn.textContent = 'Saved!'; setTimeout(function() { btn.textContent = 'Save Note'; }, 1500); }
  };

  function safeId(id) {
    return String(id).replace(/[^a-zA-Z0-9_]/g, '_');
  }

  function buildSelect(task) {
    var cfg = stCfg(task.status);
    var st = 'background:' + cfg.bg + ';color:' + cfg.c + ';border:1px solid ' + cfg.c +
      ';padding:3px 7px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;outline:none;width:100%;max-width:120px;';
    var sid = safeId(task.id);
    var opts = '';
    var curVal = (task.status || 'not-started').toLowerCase();
    ST.forEach(function(o) {
      opts += '<option value="' + o.v + '"' + (o.v === curVal ? ' selected' : '') + '>' + o.l + '</option>';
    });
    return '<select data-v22s="1" style="' + st + '" onchange="__v22_status(\'' + sid + '\',this.value,this)" onclick="event.stopPropagation()">' + opts + '</select>';
  }

  function buildDetail(task, cols) {
    var sid = safeId(task.id);
    var isLatisha = window.curUser === 'latisha';

    // Determine note value to show
    var myNote = isLatisha
      ? (task.notes || '')
      : (task.staffNotes || task.staff_notes || '');

    // Task details (instructions, video, file)
    var desc  = task.desc || task.description || '';
    var video = task.videoUrl || task.video_url || task.trainingVideoUrl || task.training_video_url || '';
    var file  = task.fileUrl || task.file_url || '';

    var lbl = 'font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px';
    var detailHtml = '';
    if (desc)  detailHtml += '<div style="margin-bottom:8px"><div style="' + lbl + '">Instructions</div><div style="font-size:13px;color:#333;white-space:pre-wrap">' + desc.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</div></div>';
    if (video) detailHtml += '<div style="margin-bottom:8px"><div style="' + lbl + '">Training Video</div><a href="' + video + '" target="_blank" style="font-size:13px;color:#b5785a">' + video + '</a></div>';
    if (file)  detailHtml += '<div style="margin-bottom:8px"><div style="' + lbl + '">File / Resource</div><a href="' + file + '" target="_blank" style="font-size:13px;color:#b5785a">' + file + '</a></div>';

    // Staff notes section — always visible
    // If latisha: show all staff notes (read-only from staff, editable owner note)
    var notesSection = '';
    if (isLatisha) {
      // Show owner note (editable)
      notesSection += '<div style="margin-bottom:10px"><div style="' + lbl + '">My Notes (Owner)</div>';
      notesSection += '<textarea id="v22ta' + sid + '" class="v22-notes-area">' + (task.notes || '').replace(/</g,'&lt;') + '</textarea>';
      notesSection += '<button id="v22nb' + sid + '" class="v22-notes-save" onclick="__v22_saveNote(\'' + String(task.id) + '\',\'' + sid + '\')">Save Note</button>';
      notesSection += '</div>';
      // Show staff note (read-only for latisha)
      var sNote = task.staffNotes || task.staff_notes || '';
      if (sNote) {
        var assignee = task.assignedTo || task.assigned_to || 'Staff';
        notesSection += '<div><div style="' + lbl + '">Note from ' + assignee + '</div><div style="font-size:13px;color:#555;white-space:pre-wrap;background:#fff;border:1px solid #e8e2db;border-radius:8px;padding:8px;margin-top:4px">' + sNote.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</div></div>';
      }
    } else {
      // Staff: editable note
      notesSection += '<div><div style="' + lbl + '">My Notes</div>';
      notesSection += '<textarea id="v22ta' + sid + '" class="v22-notes-area">' + myNote.replace(/</g,'&lt;') + '</textarea>';
      notesSection += '<button id="v22nb' + sid + '" class="v22-notes-save" onclick="__v22_saveNote(\'' + String(task.id) + '\',\'' + sid + '\')">Save Note</button>';
      notesSection += '</div>';
    }

    var inner = '';
    if (detailHtml) inner += detailHtml;
    inner += notesSection;
    if (!detailHtml && !myNote && !isLatisha) {
      // show placeholder hint
    }

    // IMPORTANT: colspan must be a quoted number, and the row must NOT interfere with the main table columns
    return '<tr id="v22d' + sid + '" class="v22-detail-row" data-v22det="1" style="display:none"><td colspan="' + cols + '">' + inner + '</td></tr>';
  }

  function buildNotesBtn(task) {
    var sid = safeId(task.id);
    var hasNote = !!(task.staffNotes || task.staff_notes || task.notes);
    var label = hasNote ? '\uD83D\uDCDD Note' : '+ Note';
    return '<button class="v22-notes-btn" onclick="__v22_expand(\'' + sid + '\');event.stopPropagation()">' + label + '</button>';
  }

  function doPatch() {
    if (!window.tasks || !window.tasks.length) return;
    var tables = document.querySelectorAll('table');
    for (var ti = 0; ti < tables.length; ti++) {
      var table = tables[ti];
      if (table.dataset.v22skip) continue;
      var hrow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!hrow) continue;
      var ths = hrow.querySelectorAll('th,td');
      var hdrs = [];
      for (var hi = 0; hi < ths.length; hi++) hdrs.push(ths[hi].textContent.trim().toLowerCase());
      var hasTask   = hdrs.indexOf('task') > -1 || hdrs.indexOf('title') > -1;
      var hasStatus = hdrs.indexOf('status') > -1;
      if (!hasTask || !hasStatus) { table.dataset.v22skip = '1'; continue; }

      var priIdx = hdrs.indexOf('priority');
      var stIdx  = hdrs.indexOf('status');
      var titIdx = hdrs.indexOf('task') > -1 ? hdrs.indexOf('task') : hdrs.indexOf('title');
      var notIdx = hdrs.indexOf('notes');
      var cols   = ths.length;

      if (priIdx > -1) ths[priIdx].classList.add('v22pri');
      if (notIdx > -1) { ths[notIdx].style.minWidth = '200px'; ths[notIdx].style.width = '240px'; }

      var rows = table.querySelectorAll('tr');
      for (var ri = 0; ri < rows.length; ri++) {
        var row = rows[ri];
        if (row === hrow || row.dataset.v22det) continue;
        var cells = row.querySelectorAll('td');
        if (cells.length < 3) continue;

        if (priIdx > -1 && cells[priIdx]) cells[priIdx].classList.add('v22pri');
        if (notIdx > -1 && cells[notIdx]) {
          cells[notIdx].style.minWidth = '200px';
          cells[notIdx].style.whiteSpace = 'normal';
          cells[notIdx].style.wordBreak = 'break-word';
        }

        var titCell = titIdx > -1 ? cells[titIdx] : cells[0];
        if (!titCell) continue;
        var titleText = titCell.textContent.trim();
        var task = null;
        for (var xi = 0; xi < (window.tasks || []).length; xi++) {
          if ((window.tasks[xi].title || '').trim() === titleText) { task = window.tasks[xi]; break; }
        }
        if (!task) continue;
        var sid = safeId(task.id);

        // Status dropdown
        if (stIdx > -1 && cells[stIdx] && !cells[stIdx].querySelector('[data-v22s]')) {
          cells[stIdx].innerHTML = buildSelect(task);
        }

        // Notes column: show notes btn + existing notes text
        if (notIdx > -1 && cells[notIdx] && !cells[notIdx].dataset.v22n) {
          cells[notIdx].dataset.v22n = '1';
          var existingNote = task.staffNotes || task.staff_notes || task.notes || '';
          var noteText = existingNote ? '<div style="font-size:12px;color:#666;margin-bottom:4px;white-space:pre-wrap;word-break:break-word">' + existingNote.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</div>' : '';
          cells[notIdx].innerHTML = noteText + buildNotesBtn(task);
        }

        // Title: add caret + expand
        if (!titCell.dataset.v22c) {
          titCell.dataset.v22c = '1';
          titCell.style.cursor = 'pointer';
          var titleEsc = (task.title || titleText).replace(/</g,'&lt;').replace(/>/g,'&gt;');
          titCell.innerHTML = '<span onclick="__v22_expand(\'' + sid + '\')" style="font-weight:600">' +
            titleEsc + '<span id="v22c' + sid + '" style="font-size:9px;color:#ccc;margin-left:4px"> \u25bc</span></span>';
          if (!document.getElementById('v22d' + sid)) {
            row.insertAdjacentHTML('afterend', buildDetail(task, cols));
            var dr = document.getElementById('v22d' + sid);
            if (dr) dr.dataset.v22det = '1';
          }
        }
      }
    }
  }

  function watchTaskTable() {
    injectCSS();
    doPatch();
    var obs = new MutationObserver(function(muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes.length > 0) { setTimeout(doPatch, 150); break; }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setInterval(doPatch, 900);
    console.log('[v22] task table watcher active');
  }
  // ── END TASK TABLE v22 ────────────────────────────────────

  function boot() {
    console.log('[comms-fix] v22.0 booting...');
    setTimeout(function() {
      interceptLogin();
      interceptSendDm();
      watchAppReloadForDMs();
      if (window.curUser) filterDMsForUser(window.curUser.toLowerCase());
      interceptSendGroupMsg();
      pollGroup();
      setInterval(pollGroup, 5000);
      fixRenderHiddenBoxFor();
      fixUnhideTask();
      watchTaskTable();
      console.log('[comms-fix] v22.0 active');
    }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 500);
  }
})();
