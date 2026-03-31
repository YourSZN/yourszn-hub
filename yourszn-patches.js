/**
 * ═══════════════════════════════════════════════════════════════════════════
 * YOUR SZN Hub — Unified Patches
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This file consolidates all runtime patches for the YOUR SZN Hub app.
 * It replaces the separate comms-fix-v39.js, comms-fix-hidden.js, and 
 * comms-fix-daily.js files.
 * 
 * Sections:
 *   1. Configuration & Utilities
 *   2. Direct Message (DM) Patches
 *   3. Group Chat Patches
 *   4. Hidden Task Patches (Week-Scoped Hiding)
 *   5. Daily Task Day Bubbles
 *   6. Task Panel & Status Patches
 *   7. Error Logging
 *   8. Boot Sequence
 * 
 * Version History:
 *   v47c (2026-03-31): Week-scoped hiding + hiddenTasks persistence fix
 *   v48  (2026-03-31): Consolidated all patches into single file
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */
(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: CONFIGURATION & UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  var VERSION = 'v48';
  var SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  var HEADERS = { 
    apikey: SUPABASE_KEY, 
    Authorization: 'Bearer ' + SUPABASE_KEY, 
    'Content-Type': 'application/json' 
  };
  
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Utility: Create thread key from two user IDs
  function threadKey(a, b) { 
    return [a, b].sort().join('_'); 
  }
  
  // Utility: Insert record to Supabase
  function insertRecord(table, data) {
    try { 
      fetch(SUPABASE_URL + '/rest/v1/' + table, { 
        method: 'POST', 
        headers: Object.assign({}, HEADERS, { Prefer: 'return=minimal' }), 
        body: JSON.stringify(data) 
      }); 
    } catch(e) {
      logError('insertRecord', e);
    }
  }
  
  // Utility: Safe ID for DOM elements
  function safeId(id) { 
    return String(id).replace(/[^a-zA-Z0-9_]/g, '_'); 
  }
  
  // Utility: Escape HTML
  function escapeHtml(s) { 
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); 
  }
  
  // Utility: Get current week label from DOM
  function getCurrentWeekLabel() {
    var datePattern = /(\d+\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+to\s+\d+\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i;
    
    // First, try the specific task week label elements
    var staffLabel = document.getElementById('staff-task-week-label');
    var ownerLabel = document.getElementById('task-week-label');
    
    // Use staff label if visible, otherwise owner label
    var el = null;
    if (staffLabel && staffLabel.offsetParent !== null) {
      el = staffLabel;
    } else if (ownerLabel && ownerLabel.offsetParent !== null) {
      el = ownerLabel;
    } else if (staffLabel) {
      el = staffLabel;
    } else if (ownerLabel) {
      el = ownerLabel;
    }
    
    if (el) {
      var match = el.textContent.trim().match(datePattern);
      if (match) return match[1];
    }
    
    // Fallback: scan all elements
    var all = document.querySelectorAll('p, small, span, h2, h3, div');
    for (var i = 0; i < all.length; i++) {
      var elem = all[i];
      if (elem.children.length > 2) continue;
      var text = elem.textContent.trim();
      var m = text.match(datePattern);
      if (m) return m[1];
    }
    
    // Final fallback: compute week number
    var now = new Date();
    var startOfYear = new Date(now.getFullYear(), 0, 1);
    var week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return now.getFullYear() + '-W' + week;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: DIRECT MESSAGE (DM) PATCHES
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Filter DMs so users only see their own conversations
  function filterDMsForUser(user) {
    if (!window.dmMsgs || !window.USERS || !user) return;
    var others = Object.keys(window.USERS).map(function(k) { 
      return k.toLowerCase(); 
    }).filter(function(k) { 
      return k !== user; 
    });
    var myKeys = others.map(function(o) { return threadKey(user, o); });
    Object.keys(window.dmMsgs).forEach(function(key) { 
      if (!myKeys.includes(key)) delete window.dmMsgs[key]; 
    });
  }
  
  // Intercept login to filter DMs
  function interceptLogin() {
    if (typeof window.chkPin !== 'function') return;
    var orig = window.chkPin;
    window.chkPin = function(pin) {
      var r = orig.call(this, pin);
      setTimeout(function() { 
        var user = window.curUser; 
        if (user) filterDMsForUser(user.toLowerCase()); 
      }, 500);
      return r;
    };
  }
  
  // Intercept DM sends to sync to Supabase
  function interceptSendDm() {
    if (typeof window.sendDm !== 'function') return;
    var orig = window.sendDm;
    window.sendDm = function() {
      var args = arguments;
      var r = orig.apply(this, args);
      setTimeout(function() {
        var user = window.curUser; 
        var other = window.activeDmUser;
        if (!user || !other || !window.dmMsgs) return;
        var key = [user, other].sort().join('_');
        var msgs = window.dmMsgs[key] || [];
        var last = msgs[msgs.length - 1];
        if (last && last.from && last.text) {
          insertRecord('comms_dm', { thread_key: key, author: last.from, message: last.text });
        }
      }, 200);
      return r;
    };
  }
  
  // Watch for app reload to re-filter DMs and re-apply patches
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: GROUP CHAT PATCHES
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Intercept group message sends to sync to Supabase
  function interceptSendGroupMsg() {
    if (typeof window.sendGroupMsg !== 'function') return;
    var orig = window.sendGroupMsg;
    window.sendGroupMsg = function() {
      var r = orig.apply(this, arguments);
      setTimeout(function() {
        var last = (window.groupMsgs || []).slice(-1)[0];
        if (last && last.from && last.text) {
          insertRecord('comms_group', { author: last.from, message: last.text });
        }
      }, 200);
      return r;
    };
  }
  
  // Poll group messages from Supabase
  var lastGroupCount = 0;
  function pollGroup() {
    fetch(SUPABASE_URL + '/rest/v1/comms_group?select=*&order=created_at.asc', { headers: HEADERS })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.length || data.length === lastGroupCount) return;
        window.groupMsgs = data.map(function(m) {
          var t = new Date(m.created_at);
          var h = t.getHours(); 
          var mn = t.getMinutes();
          var ampm = h >= 12 ? 'pm' : 'am';
          h = h % 12 || 12;
          return { 
            from: m.author, 
            text: m.message, 
            time: (h < 10 ? '0' : '') + h + ':' + (mn < 10 ? '0' : '') + mn + ' ' + ampm 
          };
        });
        lastGroupCount = data.length;
        if (typeof window.renderGroupThread === 'function') window.renderGroupThread();
      }).catch(function(e) { logError('pollGroup', e); });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: HIDDEN TASK PATCHES (WEEK-SCOPED HIDING)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Check if a hidden task entry applies to the current week
  function isHiddenThisWeek(entry) {
    if (!entry) return false;
    if (entry.weekLabel !== undefined) return entry.weekLabel === getCurrentWeekLabel();
    return false;
  }
  
  // Patch renderHiddenBoxFor to show only current week's hidden tasks
  function patchRenderHiddenBoxFor() {
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
    };
    if (typeof window.renderHiddenBox === 'function') window.renderHiddenBox();
  }
  
  // Patch unhideTask to save after unhiding
  function patchUnhideTask() {
    if (typeof window.unhideTask !== 'function') return;
    var orig = window.unhideTask;
    window.unhideTask = function(taskId) {
      orig.call(this, taskId);
      if (typeof window.saveData === 'function') window.saveData();
    };
  }
  
  // Patch hideTask to add weekLabel
  function patchHideTask() {
    if (typeof window.hideTask !== 'function') return;
    var orig = window.hideTask;
    window.hideTask = function(taskId) {
      var r = orig.call(this, taskId);
      setTimeout(function() {
        // Try both the original key type and string version
        var entry = window.hiddenTasks[taskId] || window.hiddenTasks[String(taskId)];
        if (entry) {
          entry.weekLabel = getCurrentWeekLabel();
          delete entry.weekOffset;
          delete entry.weekNumber;
          console.log('[yourszn-patches] Tagged task', taskId, 'with weekLabel:', entry.weekLabel);
          if (typeof window.saveData === 'function') window.saveData();
        }
      }, 150);
      return r;
    };
  }
  
  // Patch week navigation to re-render hidden box
  function patchWeekNav() {
    var lastLabel = getCurrentWeekLabel();
    setInterval(function() {
      var current = getCurrentWeekLabel();
      if (current !== lastLabel) {
        lastLabel = current;
        if (typeof window.renderHiddenBox === 'function') window.renderHiddenBox();
      }
    }, 500);
  }
  
  // Patch buildTaskTablesHTML for week-aware hiding
  function patchBuildTaskTablesHTML() {
    if (typeof window.buildTaskTablesHTML !== 'function') return;
    var orig = window.buildTaskTablesHTML;
    window.buildTaskTablesHTML = function(uid, weekOff, isStaff) {
      // Before calling original, temporarily modify hiddenTasks to only include
      // entries for the current viewed week
      var originalHiddenTasks = window.hiddenTasks;
      var filteredHiddenTasks = {};
      var currentWeek = getCurrentWeekLabel();
      
      Object.keys(originalHiddenTasks || {}).forEach(function(id) {
        var entry = originalHiddenTasks[id];
        // Only include if weekLabel matches current week
        if (entry && entry.weekLabel === currentWeek) {
          filteredHiddenTasks[id] = entry;
        }
      });
      
      window.hiddenTasks = filteredHiddenTasks;
      var result = orig.call(this, uid, weekOff, isStaff);
      window.hiddenTasks = originalHiddenTasks; // Restore original
      
      return result;
    };
  }
  
  // Patch _applyLoadedData to load hiddenTasks (fixes original app bug)
  function patchApplyLoadedData() {
    if (typeof window._applyLoadedData !== 'function') return false;
    if (window._applyLoadedData.__patched) return true;
    
    var orig = window._applyLoadedData;
    window._applyLoadedData = function(d) {
      var result = orig.call(this, d);
      // Load hiddenTasks (which the original app forgot to do!)
      if (d && d.hiddenTasks) {
        window.hiddenTasks = d.hiddenTasks;
        console.log('[yourszn-patches] Loaded', Object.keys(d.hiddenTasks).length, 'hidden tasks from cloud');
      }
      // Re-render after loading
      setTimeout(function() {
        if (typeof window.renderHiddenBox === 'function') window.renderHiddenBox();
        if (typeof window.renderTaskBoard === 'function') window.renderTaskBoard();
      }, 100);
      return result;
    };
    window._applyLoadedData.__patched = true;
    return true;
  }
  
  // Apply DOM-level hiding for tasks (backup to buildTaskTablesHTML patch)
  function applyHiddenToDOM() {
    var hidden = window.hiddenTasks || {};
    var currentWeek = getCurrentWeekLabel();
    
    // Build set of titles to hide - only for entries matching current week
    var hiddenTitles = {};
    Object.keys(hidden).forEach(function(id) {
      var entry = hidden[id];
      if (entry && entry.weekLabel === currentWeek) {
        var task = (window.tasks || []).find(function(t) { 
          return String(t.id) === String(id); 
        });
        if (task && task.title) hiddenTitles[task.title.trim()] = true;
      }
    });

    document.querySelectorAll('table tbody tr').forEach(function(row) {
      var cells = row.querySelectorAll('td');
      if (cells.length < 2) return;
      var title = null;
      for (var i = 0; i < cells.length; i++) {
        var text = cells[i].textContent.trim()
          .split('▼')[0]
          .replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun))*/gi, '')
          .trim();
        if (text && text.length > 0 && text.length < 120) { title = text; break; }
      }
      if (!title) return;
      if (hiddenTitles[title]) {
        row.style.display = 'none';
      } else {
        if (row.style.display === 'none') row.style.display = '';
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: DAILY TASK DAY BUBBLES
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Get week label for daily tasks
  function getDailyWeekLabel() {
    var el = document.getElementById('staff-task-week-label');
    if (el && el.textContent.trim()) return el.textContent.trim();
    // Fallback: ISO week
    var now = new Date();
    var d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    var day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return d.getUTCFullYear() + '-W' + Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }
  
  // Get or initialize days data for a task
  function getTaskDays(task) {
    var key = getDailyWeekLabel();
    if (!task.days) task.days = {};
    if (typeof task.days !== 'object' || Array.isArray(task.days)) task.days = {};
    if (!task.days[key] || typeof task.days[key] !== 'object') task.days[key] = {};
    return task.days[key];
  }
  
  // Toggle a day bubble
  window.__dailyToggle = function(taskId, day) {
    var task = null;
    (window.tasks || []).forEach(function(t) { 
      if (String(t.id) === String(taskId)) task = t; 
    });
    if (!task) return;
    var dayData = getTaskDays(task);
    dayData[day] = !dayData[day];
    if (typeof window.saveData === 'function') window.saveData();
    // Re-render all bubble containers for this task
    document.querySelectorAll('[data-daily-tid="' + taskId + '"]').forEach(function(el) {
      el.innerHTML = buildDayBubbles(task);
    });
    patchDailyHub();
  };
  
  // Build day bubble HTML
  function buildDayBubbles(task) {
    var dayData = getTaskDays(task);
    var tid = String(task.id);
    return DAYS.map(function(d) {
      var done = !!dayData[d];
      return '<span style="display:inline-block;cursor:pointer;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;margin-right:3px;border:1px solid ' +
        (done ? '#22C55E;background:#22C55E;color:white' : '#ccc;background:white;color:#555') +
        '" onclick="__dailyToggle(\'' + tid + '\',\'' + d + '\')">' + d + '</span>';
    }).join('');
  }
  
  // Inject bubbles into daily task rows
  function patchDailyTasksPage() {
    (window.tasks || []).forEach(function(task) {
      if (task.freq !== 'daily') return;
      var tid = String(task.id);
      document.querySelectorAll('table tbody tr').forEach(function(row) {
        if (row.querySelector('[data-daily-tid="' + tid + '"]')) return;
        var cells = row.querySelectorAll('td');
        var titleCell = null;
        for (var i = 0; i < cells.length; i++) {
          var text = cells[i].textContent.trim();
          if (text === task.title || text.indexOf(task.title) === 0) {
            titleCell = cells[i];
            break;
          }
        }
        if (!titleCell) return;
        var div = document.createElement('div');
        div.setAttribute('data-daily-tid', tid);
        div.style.marginTop = '5px';
        div.innerHTML = buildDayBubbles(task);
        titleCell.appendChild(div);
      });
    });
  }
  
  // Patch the Hub recurring tasks section
  function patchDailyHub() {
    var recur = document.getElementById('myhub-recur');
    if (!recur) return;
    var user = (window.curUser || '').toLowerCase();
    if (!user) return;

    var myDaily = (window.tasks || []).filter(function(t) {
      return t.freq === 'daily' &&
        (t.assignedTo || t.assigned_to || '').toLowerCase() === user;
    });

    if (!myDaily.length) return;

    var html = myDaily.map(function(task) {
      var tid = String(task.id);
      var status = task.status || 'not-started';
      var statusLabel = status === 'complete' ? 'Complete' : status === 'in-progress' ? 'In Progress' : 'Not Started';
      var statusBg = status === 'complete' ? '#22C55E' : status === 'in-progress' ? '#F97316' : '#94A3B8';
      var dayData = getTaskDays(task);
      var chips = DAYS.map(function(d) {
        var done = !!dayData[d];
        return '<span data-daily-tid="' + tid + '" style="display:inline-block;cursor:pointer;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;margin-right:3px;border:1px solid ' +
          (done ? '#22C55E;background:#22C55E;color:white' : '#ccc;background:white;color:#555') +
          '" onclick="__dailyToggle(\'' + tid + '\',\'' + d + '\')">' + d + '</span>';
      }).join('');
      return '<div style="margin-bottom:12px">' +
        '<div style="font-size:13px;font-weight:600;margin-bottom:4px">' +
        task.title +
        ' <span style="font-size:10px;padding:2px 6px;border-radius:8px;color:white;background:' + statusBg + '">' + statusLabel + '</span>' +
        '</div>' +
        '<div>' + chips + '</div>' +
        '</div>';
    }).join('');

    recur.innerHTML = html;
  }
  
  // Watch for week changes in daily tasks
  function watchDailyWeekChanges() {
    var lastWeekLabel = getDailyWeekLabel();
    setInterval(function() {
      var current = getDailyWeekLabel();
      if (current !== lastWeekLabel) {
        lastWeekLabel = current;
        document.querySelectorAll('[data-daily-tid]').forEach(function(el) {
          var tid = el.getAttribute('data-daily-tid');
          var task = null;
          (window.tasks || []).forEach(function(t) { 
            if (String(t.id) === String(tid)) task = t; 
          });
          if (task) el.innerHTML = buildDayBubbles(task);
        });
        patchDailyHub();
      }
    }, 600);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: TASK PANEL & STATUS PATCHES
  // ═══════════════════════════════════════════════════════════════════════════
  
  var STATUS_CONFIGS = [
    { v: 'not-started', l: 'Not Started', bg: '#f0f0f0', c: '#666' },
    { v: 'in-progress', l: 'In Progress', bg: '#fff3e0', c: '#e65100' },
    { v: 'blocked', l: 'Blocked', bg: '#fdecea', c: '#c62828' },
    { v: 'complete', l: 'Complete', bg: '#e8f5e9', c: '#2e7d32' }
  ];
  
  var openPanelSid = null;
  
  function getStatusConfig(v) { 
    var val = (v || 'not-started').toLowerCase(); 
    var found = null; 
    STATUS_CONFIGS.forEach(function(o) { if (o.v === val) found = o; }); 
    return found || STATUS_CONFIGS[0]; 
  }
  
  // Inject CSS for task panels
  function injectPanelCSS() {
    if (document.getElementById('yszn-panel-css')) return;
    var s = document.createElement('style'); 
    s.id = 'yszn-panel-css';
    s.textContent = [
      '.v24pri{display:none!important;width:0!important;padding:0!important;border:none!important}',
      '#v24panel{position:fixed;z-index:9999;background:#fff;border:1px solid #ddd;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.12);padding:18px 20px;max-width:480px;max-height:70vh;overflow-y:auto;font-family:inherit}',
      '#v24panel .v24-lbl{font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px}',
      '#v24panel .v24-val{font-size:13px;color:#333;white-space:pre-wrap;margin-bottom:12px}',
      '#v24panel textarea{width:100%;box-sizing:border-box;border:1px solid #d4c9bc;border-radius:8px;padding:8px;font-size:13px;font-family:inherit;resize:vertical;min-height:70px;margin-top:4px}',
      '#v24panel .v24-save{background:#c07a5a;border:none;color:#fff;font-size:12px;padding:5px 14px;border-radius:8px;cursor:pointer;margin-top:6px}',
      '#v24panel .v24-save:hover{background:#a5644a}',
      '#v24panel .v24-close{position:absolute;top:10px;right:14px;background:none;border:none;font-size:18px;color:#aaa;cursor:pointer;line-height:1}',
      '.v24-notes-btn{cursor:pointer;background:#f5f0eb;border:1px solid #d4c9bc;color:#7a6a5a;font-size:11px;padding:3px 10px;border-radius:8px;white-space:nowrap;display:inline-block;margin-top:3px}',
      '.v24-notes-btn:hover{background:#ece4da}',
      '#v24panel .v24-delete{background:none;border:1px solid #e0c0c0;color:#c62828;font-size:11px;padding:4px 12px;border-radius:8px;cursor:pointer;margin-top:14px;display:block;margin-left:auto;margin-right:auto;width:100%;text-align:center}',
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
  
  // Global functions for task panel
  window.__v24_status = function(taskSid, newVal, sel) {
    var t = null; 
    (window.tasks || []).forEach(function(x) { if (safeId(x.id) === taskSid) t = x; });
    if (!t) return; 
    t.status = newVal; 
    var cfg = getStatusConfig(newVal);
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
      t.notes = noteVal; 
    } else { 
      t.staffNotes = noteVal; 
      t.staff_notes = noteVal; 
    }
    if (typeof window.saveData === 'function') window.saveData();
    var btn = document.getElementById('v24nb' + sid);
    if (btn) { 
      btn.textContent = 'Saved ✓'; 
      setTimeout(function() { btn.textContent = 'Save Note'; }, 1500); 
    }
  };
  
  // Deleted tasks blacklist
  function stripDeletedTasks() {
    if (!window.deletedTasks || !window.deletedTasks.length) return;
    var before = (window.tasks || []).length;
    window.tasks = (window.tasks || []).filter(function(t) {
      return !window.deletedTasks.includes(t.id) && !window.deletedTasks.includes(String(t.id));
    });
    var removed = before - window.tasks.length;
    if (removed > 0) {
      console.log('[yourszn-patches] Stripped', removed, 'deleted tasks');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: ERROR LOGGING
  // ═══════════════════════════════════════════════════════════════════════════
  
  var errorLog = [];
  
  function logError(context, error) {
    var entry = {
      time: new Date().toISOString(),
      context: context,
      message: error ? (error.message || String(error)) : 'Unknown error',
      stack: error && error.stack ? error.stack.substring(0, 500) : null
    };
    errorLog.push(entry);
    console.error('[yourszn-patches] Error in ' + context + ':', error);
    
    // Keep only last 50 errors
    if (errorLog.length > 50) errorLog.shift();
    
    // Optional: Save errors to Supabase (uncomment to enable)
    // try {
    //   insertRecord('app_errors', entry);
    // } catch(e) {}
  }
  
  // Expose error log for debugging
  window.__ysznErrors = function() {
    console.table(errorLog);
    return errorLog;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: BOOT SEQUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Early patch for _applyLoadedData (must run before loadData completes)
  (function earlyPatch() {
    if (patchApplyLoadedData()) return;
    var attempts = 0;
    var interval = setInterval(function() {
      attempts++;
      if (patchApplyLoadedData() || attempts > 40) {
        clearInterval(interval);
      }
    }, 50);
  })();
  
  // Watch task tables for changes
  function watchTaskTable() {
    injectPanelCSS(); 
    getOrCreatePanel();
    
    var obs = new MutationObserver(function(muts) {
      for (var i = 0; i < muts.length; i++) { 
        if (muts[i].addedNodes.length > 0) { 
          setTimeout(function() {
            patchDailyTasksPage();
            applyHiddenToDOM();
          }, 100);
          break; 
        } 
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
  
  // Main boot function
  function boot() {
    console.log('[yourszn-patches] ' + VERSION + ' booting...');
    
    setTimeout(function() {
      try {
        // DM patches
        interceptLogin(); 
        interceptSendDm(); 
        watchAppReloadForDMs();
        if (window.curUser) filterDMsForUser(window.curUser.toLowerCase());
        
        // Group chat patches
        interceptSendGroupMsg(); 
        pollGroup(); 
        setInterval(pollGroup, 5000);
        
        // Hidden task patches
        patchRenderHiddenBoxFor(); 
        patchUnhideTask();
        patchHideTask(); 
        patchWeekNav();
        patchBuildTaskTablesHTML();
        
        // Deleted tasks
        if (!window.deletedTasks) window.deletedTasks = [];
        stripDeletedTasks();
        
        // Task panel
        watchTaskTable();
        
        // Daily task bubbles
        patchDailyTasksPage();
        patchDailyHub();
        watchDailyWeekChanges();
        setInterval(patchDailyTasksPage, 1500);
        
        // DOM-level hidden task enforcement
        setInterval(applyHiddenToDOM, 600);
        
        console.log('[yourszn-patches] ' + VERSION + ' booted successfully ✓');
      } catch(e) {
        logError('boot', e);
      }
    }, 2000);
  }
  
  // Start boot sequence
  if (document.readyState === 'loading') { 
    document.addEventListener('DOMContentLoaded', boot); 
  } else { 
    setTimeout(boot, 500); 
  }
  
})();
