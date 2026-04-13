/**
 * comms-fix.js v37
 * v16 core: DM + Group + Hidden tasks UNCHANGED
 * v24: Floating panel task table approach
 * v33: safeId lookup fix for UUID task IDs
 * v34: Permanent delete with blacklist
 * v37: Fix hidden task weekly reset — correct DOM selector for date label
 *      format is "This Week — 23 Mar to 29 Mar" / "Next Week — 30 Mar to 5 Apr"
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

  // ── DM SECTION - DO NOT MODIFY ────────────────────────────────────────────
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
        setTimeout(function() {
          var user = window.curUser;
          if (user) filterDMsForUser(user.toLowerCase());
          if (typeof window.renderHiddenBox === 'function') window.renderHiddenBox();
        }, 300);
      }
    };
  }
  // ── END DM SECTION ────────────────────────────────────────────────────────

  // ── GROUP CHAT SECTION - DO NOT MODIFY ───────────────────────────────────
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
  // ── END GROUP CHAT SECTION ────────────────────────────────────────────────

  // ── HIDDEN TASK FIX - EXACT v16 ──────────────────────────────────────────
  function fixRenderHiddenBoxFor() {
    if (typeof window.renderHiddenBoxFor !== 'function') return;
    window.renderHiddenBoxFor = function(view) {
      var elId = view === 'owner' ? 'hidden-box-owner' : 'hidden-box-staff';
      var el = document.getElementById(elId);
      if (!el) return;
      var hiddenIds = Object.keys(window.hiddenTasks || {}).filter(function(id) {
        return isHiddenThisWeek(window.hiddenTasks[id]);
      });
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
  // ── END HIDDEN TASK FIX ───────────────────────────────────────────────────

  // ── v36: WEEKLY HIDDEN RESET (DOM date label-based) ──────────────────────
  // window.metaWeekOff never changes when clicking Prev/Next (stays 0 always).
  // Instead we read the date range text directly from the DOM — e.g. "26 Mar to 1 Apr".
  // This is the small text under "Tasks" heading that the app always updates on nav.
  // We stamp that label on each hiddenTask entry and compare on every render.

  function getCurrentWeekLabel() {
    // The app renders text like:
    //   "This Week — 23 Mar to 29 Mar"
    //   "Next Week — 30 Mar to 5 Apr"
    //   "6 Apr to 12 Apr"  (further future weeks have no prefix)
    // We scan all text nodes for the date range part (after the em-dash if present).
    var all = document.querySelectorAll('p, small, span, h2, h3, div');
    var datePattern = /(\d+\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+to\s+\d+\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i;
    for (var i = 0; i < all.length; i++) {
      // Only look at direct text, not deeply nested
      var el = all[i];
      if (el.children.length > 2) continue; // skip containers with many children
      var text = el.textContent.trim();
      var match = text.match(datePattern);
      if (match) {
        return match[1]; // return just the date range e.g. "23 Mar to 29 Mar"
      }
    }
    // Fallback: ISO week
    var now = new Date();
    var startOfYear = new Date(now.getFullYear(), 0, 1);
    var week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return now.getFullYear() + '-W' + week;
  }

  // Check whether a hiddenTask entry applies to the current week view
  function isHiddenThisWeek(entry) {
    if (!entry) return false;
    // v36: compare weekLabel (DOM date text)
    if (entry.weekLabel !== undefined) {
      return entry.weekLabel === getCurrentWeekLabel();
    }
    // Legacy entries (weekOffset/weekNumber from v34/v35) — treat as stale
    return false;
  }

  // Patch window.hideTask to stamp the current week label when hiding
  function patchHideTask() {
    if (typeof window.hideTask !== 'function') return;
    var orig = window.hideTask;
    window.hideTask = function(taskId) {
      var r = orig.call(this, taskId);
      // After the app writes to hiddenTasks, stamp weekLabel
      setTimeout(function() {
        if (window.hiddenTasks && window.hiddenTasks[String(taskId)]) {
          window.hiddenTasks[String(taskId)].weekLabel = getCurrentWeekLabel();
          // Clean up legacy fields
          delete window.hiddenTasks[String(taskId)].weekOffset;
          delete window.hiddenTasks[String(taskId)].weekNumber;
          if (typeof window.saveData === 'function') window.saveData();
          console.log('[comms-fix] v36: stamped weekLabel:', getCurrentWeekLabel(), 'on task', taskId);
        }
      }, 150);
      return r;
    };
    console.log('[comms-fix] v36: hideTask patched with DOM week label stamp');
  }

  // Watch for week navigation — detect when the DOM date label changes
  // and force re-render of the hidden box so visibility updates immediately
  function patchWeekNav() {
    var lastLabel = getCurrentWeekLabel();
    setInterval(function() {
      var current = getCurrentWeekLabel();
      if (current !== lastLabel) {
        lastLabel = current;
        console.log('[comms-fix] v36: week label changed to', current, '— re-rendering hidden box');
        if (typeof window.renderHiddenBox === 'function') window.renderHiddenBox();
        // Also reset table patch markers so status dropdowns re-render
        document.querySelectorAll('table[data-v24skip]').forEach(function(t) {
          delete t.dataset.v24skip;
        });
        document.querySelectorAll('[data-v24c]').forEach(function(el) {
          delete el.dataset.v24c;
        });
        document.querySelectorAll('[data-v24n]').forEach(function(el) {
          delete el.dataset.v24n;
        });
        setTimeout(doPatch, 200);
      }
    }, 500);
    console.log('[comms-fix] v36: week nav watcher active');
  }
  // ── END WEEKLY HIDDEN RESET ───────────────────────────────────────────────

  // ── v34: PERMANENT DELETE ─────────────────────────────────────────────────
  // deletedTasks lives in window (synced to state blob via saveData)
  // Structure: array of { id, title, freq } — blacklist
  // We match on title+freq for template tasks (which reuse IDs) and on id for one-offs

  function getDeletedTasks() {
    return window.deletedTasks || [];
  }

  function isTaskDeleted(task) {
    var deleted = getDeletedTasks();
    return deleted.some(function(d) {
      // Match by exact id first (works for UUIDs and unique IDs)
      if (String(d.id) === String(task.id)) return true;
      // For template tasks (is_template:true) also match by title+freq
      // so the blacklist survives even if the template regenerates with a new ID
      if (task.is_template && d.title && d.freq) {
        return d.title === task.title && d.freq === task.freq;
      }
      return false;
    });
  }

  function stripDeletedTasks() {
    if (!window.tasks) return;
    var before = window.tasks.length;
    window.tasks = window.tasks.filter(function(t) { return !isTaskDeleted(t); });
    if (window.tasks.length !== before) {
      console.log('[comms-fix] v34: stripped', before - window.tasks.length, 'permanently deleted task(s)');
    }
  }

  // Called when user confirms permanent delete from the panel
  window.__v24_deleteTask = function(sid) {
    // Find the task
    var task = null;
    (window.tasks || []).forEach(function(x) { if (safeId(x.id) === sid) task = x; });
    if (!task) return;

    var confirmed = window.confirm(
      'Are you sure you want to permanently delete "' + (task.title || 'this task') + '"?\n\nThis cannot be undone — the task will be removed for everyone and will not come back.'
    );
    if (!confirmed) return;

    // Add to deletedTasks blacklist
    if (!window.deletedTasks) window.deletedTasks = [];
    window.deletedTasks.push({
      id: task.id,
      title: task.title || '',
      freq: task.freq || ''
    });

    // Remove from live tasks array immediately
    window.tasks = (window.tasks || []).filter(function(x) { return safeId(x.id) !== sid; });

    // Also clear from hiddenTasks if it was hidden
    if (window.hiddenTasks && window.hiddenTasks[String(task.id)]) {
      delete window.hiddenTasks[String(task.id)];
    }

    // Save everything
    if (typeof window.saveData === 'function') window.saveData();

    // Close panel and force re-patch so the row disappears immediately
    closePanel();
    // Mark all tables as needing re-patch by removing v24skip
    document.querySelectorAll('table[data-v24skip]').forEach(function(t) {
      delete t.dataset.v24skip;
    });
    setTimeout(doPatch, 100);

    console.log('[comms-fix] v34: permanently deleted task:', task.title);
  };
  // ── END PERMANENT DELETE ──────────────────────────────────────────────────

  // ── TASK TABLE v24 — FLOATING PANEL APPROACH ─────────────────────────────

  // v37 FIX: helper to get the current week offset so v24 uses per-week state
  // for daily/weekly recurring tasks instead of reading t.status directly
  function getCurWeekOff() {
    if (window.curUser === 'latisha') return window.taskWeekOff || 0;
    return window.staffTaskWeekOff || 0;
  }

  // v37 FIX: get per-week task state (status, hrsTaken, staffNotes)
  // For daily/weekly tasks this reads from taskWeekState; for one-off it reads from the task itself
  function v24getTS(task) {
    if (typeof window.getTS === 'function') return window.getTS(task, getCurWeekOff());
    // fallback if getTS not available yet
    return { status: task.status || 'not-started', hrsTaken: task.hrsTaken || 0, staffNotes: task.staffNotes || '' };
  }

  // v37 FIX: set per-week task state
  function v24setTS(task, field, val) {
    if (typeof window.setTS === 'function') {
      window.setTS(task, getCurWeekOff(), field, val);
    } else {
      task[field] = val;
    }
  }

  var ST = [
    { v: 'not-started', l: 'Not Started', bg: '#f0f0f0', c: '#666' },
    { v: 'in-progress', l: 'In Progress', bg: '#fff3e0', c: '#e65100' },
    { v: 'blocked',     l: 'Blocked',     bg: '#fdecea', c: '#c62828' },
    { v: 'complete',    l: 'Complete',    bg: '#e8f5e9', c: '#2e7d32' }
  ];
  var openPanelSid = null;

  function stCfg(v) {
    var val = (v || 'not-started').toLowerCase();
    var found = null;
    ST.forEach(function(o) { if (o.v === val) found = o; });
    return found || ST[0];
  }

  function safeId(id) {
    return String(id).replace(/[^a-zA-Z0-9_]/g, '_');
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function injectCSS() {
    if (document.getElementById('v24css')) return;
    var s = document.createElement('style');
    s.id = 'v24css';
    s.textContent = [
      '.v24pri{display:none!important;width:0!important;padding:0!important;border:none!important}',
      '#v24panel{position:fixed;z-index:9999;background:#fff;border:1px solid #ddd;border-radius:10px;',
      'box-shadow:0 4px 20px rgba(0,0,0,.12);padding:18px 20px;max-width:480px;',
      'max-height:70vh;overflow-y:auto;font-family:inherit}',
      '#v24panel .v24-lbl{font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px}',
      '#v24panel .v24-val{font-size:13px;color:#333;white-space:pre-wrap;margin-bottom:12px}',
      '#v24panel textarea{width:100%;box-sizing:border-box;border:1px solid #d4c9bc;border-radius:8px;',
      'padding:8px;font-size:13px;font-family:inherit;resize:vertical;min-height:70px;margin-top:4px}',
      '#v24panel .v24-save{background:#c07a5a;border:none;color:#fff;font-size:12px;padding:5px 14px;',
      'border-radius:8px;cursor:pointer;margin-top:6px}',
      '#v24panel .v24-save:hover{background:#a5644a}',
      '#v24panel .v24-close{position:absolute;top:10px;right:14px;background:none;border:none;',
      'font-size:18px;color:#aaa;cursor:pointer;line-height:1}',
      '.v24-notes-btn{background:#f5f0eb;border:1px solid #d4c9bc;color:#7a6a5a;font-size:11px;',
      'padding:3px 10px;border-radius:8px;cursor:pointer;white-space:nowrap;display:inline-block;margin-top:3px}',
      '.v24-notes-btn:hover{background:#ece4da}',
      // v34: delete button styles
      '#v24panel .v24-delete{background:none;border:1px solid #e0c0c0;color:#c62828;font-size:11px;',
      'padding:4px 12px;border-radius:8px;cursor:pointer;margin-top:14px;display:block;width:100%;text-align:center}',
      '#v24panel .v24-delete:hover{background:#fdecea}'
    ].join('');
    document.head.appendChild(s);
  }

  function getOrCreatePanel() {
    var p = document.getElementById('v24panel');
    if (!p) {
      p = document.createElement('div');
      p.id = 'v24panel';
      p.style.display = 'none';
      document.body.appendChild(p);
    }
    return p;
  }

  function closePanel() {
    var p = document.getElementById('v24panel');
    if (p) p.style.display = 'none';
    openPanelSid = null;
  }

  // v33 FIX: use safeId(x.id) === taskSid for lookup
  // v37 FIX: use setTS for per-week status on daily/weekly tasks
  window.__v24_status = function(taskSid, newVal, sel) {
    var t = null;
    (window.tasks || []).forEach(function(x) { if (safeId(x.id) === taskSid) t = x; });
    if (!t) return;
    v24setTS(t, 'status', newVal);
    var cfg = stCfg(newVal);
    sel.style.background = cfg.bg;
    sel.style.color = cfg.c;
    sel.style.borderColor = cfg.c;
    if (typeof window.saveData === 'function') window.saveData();
  };

  window.__v24_saveNote = function(sid, noteSid) {
    var t = null;
    (window.tasks || []).forEach(function(x) { if (safeId(x.id) === sid) t = x; });
    if (!t) return;
    var ta = document.getElementById('v24ta' + noteSid);
    if (!ta) return;
    var noteVal = ta.value.trim();
    if ((window.curUser || '').toLowerCase() === 'latisha') {
      v24setTS(t, 'notes', noteVal);
    } else {
      v24setTS(t, 'staffNotes', noteVal);
      v24setTS(t, 'staff_notes', noteVal);
    }
    if (typeof window.saveData === 'function') window.saveData();
    var btn = document.getElementById('v24nb' + sid);
    if (btn) { btn.textContent = 'Saved \u2713'; setTimeout(function() { btn.textContent = 'Save Note'; }, 1500); }
  };

  window.__v24_openPanel = function(sid, anchorEl) {
    if (openPanelSid === sid) { closePanel(); return; }
    openPanelSid = sid;

    var task = null;
    (window.tasks || []).forEach(function(x) { if (safeId(x.id) === sid) task = x; });
    if (!task) return;

    var isLatisha = (window.curUser || '').toLowerCase() === 'latisha';
    var _pts = v24getTS(task);
    var desc  = task.desc || task.description || '';
    var video = task.videoUrl || task.video_url || task.trainingVideoUrl || task.training_video_url || '';
    var file  = task.fileUrl || task.file_url || '';
    var myNote = isLatisha
      ? (_pts.notes || task.notes || '')
      : (_pts.staffNotes || _pts.staff_notes || task.staffNotes || task.staff_notes || '');

    var html = '<button class="v24-close" onclick="__v24_closePanel()">\u00d7</button>';
    html += '<div style="font-weight:700;font-size:14px;margin-bottom:12px;padding-right:20px">' + esc(task.title || '') + '</div>';

    if (desc)  html += '<div class="v24-lbl">Instructions</div><div class="v24-val">' + esc(desc) + '</div>';
    if (video) html += '<div class="v24-lbl">Training Video</div><div class="v24-val"><a href="' + esc(video) + '" target="_blank" style="color:#b5785a">' + esc(video) + '</a></div>';
    if (file)  html += '<div class="v24-lbl">File / Resource</div><div class="v24-val"><a href="' + esc(file) + '" target="_blank" style="color:#b5785a">' + esc(file) + '</a></div>';

    if (isLatisha) {
      html += '<div class="v24-lbl">My Notes (Owner)</div>';
      html += '<textarea id="v24ta' + sid + '">' + esc(_pts.notes || task.notes || '') + '</textarea>';
      html += '<button id="v24nb' + sid + '" class="v24-save" onclick="__v24_saveNote(\'' + sid + '\',\'' + sid + '\')">Save Note</button>';
      var sNote = _pts.staffNotes || _pts.staff_notes || task.staffNotes || task.staff_notes || '';
      if (sNote) {
        var assignee = task.assignedTo || task.assigned_to || 'Staff';
        html += '<div class="v24-lbl" style="margin-top:14px">Note from ' + esc(assignee) + '</div>';
        html += '<div style="font-size:13px;color:#555;white-space:pre-wrap;background:#faf8f5;border:1px solid #e8e2db;border-radius:8px;padding:8px;margin-top:4px">' + esc(sNote) + '</div>';
      }
    } else {
      html += '<div class="v24-lbl">My Notes</div>';
      html += '<textarea id="v24ta' + sid + '">' + esc(myNote) + '</textarea>';
      html += '<button id="v24nb' + sid + '" class="v24-save" onclick="__v24_saveNote(\'' + sid + '\',\'' + sid + '\')">Save Note</button>';
      var ownerNote = _pts.notes || task.notes || '';
      if (ownerNote) {
        html += '<div class="v24-lbl" style="margin-top:14px">Note from Latisha (Owner)</div>';
        html += '<div style="font-size:13px;color#555;white-space:pre-wrap;background:#faf8f5;border:1px solid #e8e2db;border-radius:8px;padding:8px;margin-top:4px">' + esc(ownerNote) + '</div>';
      }
    }

    // v34: Permanent delete button — visible to everyone
    html += '<button class="v24-delete" onclick="__v24_deleteTask(\'' + sid + '\')">\uD83D\uDED1 Delete permanently</button>';

    var panel = getOrCreatePanel();
    panel.innerHTML = html;
    panel.style.display = 'block';

    // Positioning: always keep panel fully within viewport
    var rect = anchorEl.getBoundingClientRect();
    var panelW = Math.min(480, window.innerWidth * 0.9);
    var panelH = panel.offsetHeight || 350;

    var left = rect.left;
    if (left + panelW > window.innerWidth - 8) left = window.innerWidth - panelW - 8;
    if (left < 8) left = 8;

    var spaceBelow = window.innerHeight - rect.bottom;
    var top;
    if (spaceBelow >= panelH + 10) {
      top = rect.bottom + 6;
    } else {
      top = rect.top - panelH - 6;
    }
    if (top + panelH > window.innerHeight - 8) top = window.innerHeight - panelH - 8;
    if (top < 8) top = 8;

    panel.style.width = panelW + 'px';
    panel.style.top = top + 'px';
    panel.style.left = left + 'px';

    setTimeout(function() {
      document.addEventListener('click', function outsideClick(e) {
        var p = document.getElementById('v24panel');
        if (p && !p.contains(e.target) && !e.target.classList.contains('v24-notes-btn')) {
          closePanel();
          document.removeEventListener('click', outsideClick);
        }
      });
    }, 50);
  };

  window.__v24_closePanel = closePanel;

  function buildSelect(task) {
    var _ts = v24getTS(task);
    var cfg = stCfg(_ts.status);
    var st = 'background:' + cfg.bg + ';color:' + cfg.c + ';border:1px solid ' + cfg.c +
      ';padding:3px 7px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;outline:none;width:100%;max-width:120px;';
    var sid = safeId(task.id);
    var opts = '';
    var curVal = (_ts.status || 'not-started').toLowerCase();
    ST.forEach(function(o) {
      opts += '<option value="' + o.v + '"' + (o.v === curVal ? ' selected' : '') + '>' + o.l + '</option>';
    });
    return '<select data-v24s="1" style="' + st + '" onchange="__v24_status(\'' + sid + '\',this.value,this)" onclick="event.stopPropagation()">' + opts + '</select>';
  }

  function buildNoteBtn(task) {
    var sid = safeId(task.id);
    var _ts = v24getTS(task);
    var hasNote = !!(_ts.staffNotes || _ts.staff_notes || _ts.notes || task.staffNotes || task.staff_notes || task.notes);
    var label = hasNote ? '\uD83D\uDCDD Note' : '+ Note';
    return '<button class="v24-notes-btn" onclick="__v24_openPanel(\'' + sid + '\',this);event.stopPropagation()">' + label + '</button>';
  }

  function doPatch() {
    if (!window.tasks || !window.tasks.length) return;
    stripDeletedTasks();
    var tables = document.querySelectorAll('table');
    for (var ti = 0; ti < tables.length; ti++) {
      var table = tables[ti];
      if (table.dataset.v24skip) continue;
      var hrow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!hrow) continue;
      var ths = hrow.querySelectorAll('th,td');
      var hdrs = [];
      for (var hi = 0; hi < ths.length; hi++) hdrs.push(ths[hi].textContent.trim().toLowerCase());
      var hasTask   = hdrs.indexOf('task') > -1 || hdrs.indexOf('title') > -1;
      var hasStatus = hdrs.indexOf('status') > -1;
      if (!hasTask || !hasStatus) { table.dataset.v24skip = '1'; continue; }
      var priIdx = hdrs.indexOf('priority');
      var stIdx  = hdrs.indexOf('status');
      var titIdx = hdrs.indexOf('task') > -1 ? hdrs.indexOf('task') : hdrs.indexOf('title');
      var notIdx = hdrs.indexOf('notes');
      var hrsIdx = hdrs.indexOf('hours allowed');
      if (priIdx > -1) ths[priIdx].classList.add('v24pri');
      if (notIdx > -1) { ths[notIdx].style.minWidth = '200px'; ths[notIdx].style.width = '240px'; }
      var rows = table.querySelectorAll('tr');
      for (var ri = 0; ri < rows.length; ri++) {
        var row = rows[ri];
        if (row === hrow) continue;
        var cells = row.querySelectorAll('td');
        if (cells.length < 3) continue;
        if (priIdx > -1 && cells[priIdx]) cells[priIdx].classList.add('v24pri');
        if (notIdx > -1 && cells[notIdx]) {
          cells[notIdx].style.minWidth = '200px';
          cells[notIdx].style.whiteSpace = 'normal';
          cells[notIdx].style.wordBreak = 'break-word';
        }
        var titCell = titIdx > -1 ? cells[titIdx] : cells[0];
        if (!titCell) continue;
        if (titCell.dataset.v24c) continue;
        var titleText = titCell.textContent.trim();
        var curStatusText = '';
        if (stIdx > -1 && cells[stIdx]) {
          curStatusText = cells[stIdx].textContent.trim().toLowerCase().replace(/\s+/g,'-');
        }
        var task = null;
        var titleMatches = [];
        for (var xi = 0; xi < (window.tasks || []).length; xi++) {
          if ((window.tasks[xi].title || '').trim() === titleText) titleMatches.push(window.tasks[xi]);
        }
        if (titleMatches.length === 0) continue;
        if (titleMatches.length === 1) {
          task = titleMatches[0];
        } else {
          for (var mi = 0; mi < titleMatches.length; mi++) {
            var ts = (v24getTS(titleMatches[mi]).status || 'not-started').toLowerCase();
            if (ts === curStatusText || curStatusText.indexOf(ts.replace(/-/g,'')) > -1) {
              task = titleMatches[mi]; break;
            }
          }
          if (!task) task = titleMatches[0];
        }
        if (!task) continue;
        var sid = safeId(task.id);
        if (stIdx > -1 && cells[stIdx] && !cells[stIdx].querySelector('[data-v24s]')) {
          cells[stIdx].innerHTML = buildSelect(task);
        }
        if (hrsIdx > -1 && cells[hrsIdx] && !cells[hrsIdx].dataset.v24h) {
          var hrsVal = task.hrs_allowed || task.hrsAllowed || '';
          if (hrsVal && String(hrsVal) !== '0' && cells[hrsIdx].textContent.trim() === '—') {
            cells[hrsIdx].dataset.v24h = '1';
            cells[hrsIdx].textContent = hrsVal + 'h';
          }
        }
        if (notIdx > -1 && cells[notIdx] && !cells[notIdx].dataset.v24n) {
          cells[notIdx].dataset.v24n = '1';
          var _nts = v24getTS(task);
          var existingNote = _nts.staffNotes || _nts.staff_notes || _nts.notes || task.staffNotes || task.staff_notes || task.notes || '';
          var notePreview = existingNote
            ? '<div style="font-size:12px;color:#666;margin-bottom:4px;white-space:pre-wrap;word-break:break-word">' + esc(existingNote.substring(0, 60)) + (existingNote.length > 60 ? '...' : '') + '</div>'
            : '';
          cells[notIdx].innerHTML = notePreview + buildNoteBtn(task);
        }
        titCell.dataset.v24c = '1';
        titCell.style.cursor = 'pointer';
        var titleEsc = esc(task.title || titleText);
        titCell.innerHTML = '<span onclick="__v24_openPanel(\'' + sid + '\',this);event.stopPropagation()" style="font-weight:600">' +
          titleEsc + '<span style="font-size:9px;color:#ccc;margin-left:4px"> \u25bc</span></span>';
      }
    }
  }

  function watchTaskTable() {
    injectCSS();
    getOrCreatePanel();
    doPatch();
    var obs = new MutationObserver(function(muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes.length > 0) { setTimeout(doPatch, 150); break; }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setInterval(doPatch, 900);
    console.log('[v24] task table watcher active');
  }

  function boot() {
    console.log('[comms-fix] v24.0 booting...');
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

      // v36: init deletedTasks if not present, then strip immediately
      if (!window.deletedTasks) window.deletedTasks = [];
      stripDeletedTasks();

      // v36: patch hideTask to stamp DOM week label when hiding
      patchHideTask();

      // v36: watch for week navigation changes via DOM label
      patchWeekNav();

      watchTaskTable();
      console.log('[comms-fix] v24.0 active');
    }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 500);
  }
})();