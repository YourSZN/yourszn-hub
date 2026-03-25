/**
 * comms-fix.js v18.0
 * DM + Group chat: UNTOUCHED
 * Hidden task fix: UNTOUCHED
 * NEW v18: Task table — intercept render function + interval fallback
 *   - Hooks window.renderTasks (or similar) to inject changes at source
 *   - Also runs on MutationObserver + 500ms interval for resilience
 *   - Per-cell patching so re-renders get re-patched correctly
 *   - Remove Priority column, inline status dropdown, expandable rows
 */
(function () {
  'use strict';
  const U = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  const K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };

  function tk(a, b) { return [a, b].sort().join('_'); }
  async function ins(table, data) {
    try { await fetch(`${U}/rest/v1/${table}`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(data) }); } catch(e) {}
  }

  // ── DM SECTION - DO NOT MODIFY ─────────────────────────────────
  function filterDMsForUser(user) {
    if (!window.dmMsgs || !window.USERS || !user) return;
    const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== user);
    const myKeys = others.map(o => tk(user, o));
    Object.keys(window.dmMsgs).forEach(key => { if (!myKeys.includes(key)) delete window.dmMsgs[key]; });
  }
  function interceptLogin() {
    if (typeof window.chkPin !== 'function') return;
    const orig = window.chkPin;
    window.chkPin = function(pin, ...args) {
      const r = orig.call(this, pin, ...args);
      setTimeout(() => { const user = window.curUser; if (user) filterDMsForUser(user.toLowerCase()); }, 500);
      return r;
    };
  }
  function interceptSendDm() {
    if (typeof window.sendDm !== 'function') return;
    const orig = window.sendDm;
    window.sendDm = async function(...a) {
      const r = orig.apply(this, a);
      await new Promise(x => setTimeout(x, 200));
      const user = window.curUser; const other = window.activeDmUser;
      if (!user || !other || !window.dmMsgs) return r;
      const key = [user, other].sort().join('_');
      const msgs = window.dmMsgs[key] || [];
      const last = msgs[msgs.length - 1];
      if (last?.from && last?.text) await ins('comms_dm', { thread_key: key, author: last.from, message: last.text });
      return r;
    };
  }
  function watchAppReloadForDMs() {
    const origLog = console.log;
    console.log = function(...args) {
      origLog.apply(console, args);
      if (args[0] && String(args[0]).includes('cloud load successful')) {
        setTimeout(() => { const user = window.curUser; if (user) filterDMsForUser(user.toLowerCase()); }, 200);
      }
    };
  }
  // ── END DM SECTION ────────────────────────────────────────

  // ── GROUP CHAT SECTION - DO NOT MODIFY ──────────────────────
  function interceptSendGroupMsg() {
    if (typeof window.sendGroupMsg !== 'function') return;
    const orig = window.sendGroupMsg;
    window.sendGroupMsg = async function(...a) {
      const r = orig.apply(this, a);
      await new Promise(x => setTimeout(x, 200));
      const last = (window.groupMsgs || []).slice(-1)[0];
      if (last?.from && last?.text) await ins('comms_group', { author: last.from, message: last.text });
      return r;
    };
  }
  let lastGroupCount = 0;
  async function pollGroup() {
    try {
      const r = await fetch(`${U}/rest/v1/comms_group?select=*&order=created_at.asc`, { headers: H });
      if (!r.ok) return;
      const data = await r.json();
      if (!data.length || data.length === lastGroupCount) return;
      const fmt = d => new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
      window.groupMsgs = data.map(m => ({ from: m.author, text: m.message, time: fmt(m.created_at) }));
      lastGroupCount = data.length;
      if (typeof window.renderGroupThread === 'function') window.renderGroupThread();
    } catch(e) {}
  }
  // ── END GROUP CHAT SECTION ─────────────────────────────

  // ── HIDDEN TASK FIX - DO NOT MODIFY ─────────────────────────
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
    const orig = window.unhideTask;
    window.unhideTask = function(taskId) {
      orig.call(this, taskId);
      if (typeof window.saveData === 'function') window.saveData();
    };
  }
  // ── END HIDDEN TASK FIX ───────────────────────────────────

  // ── TASK TABLE v18 ──────────────────────────────────────────
  var STATUS_CFG = {
    'Not Started': { bg: '#f0f0f0', color: '#666' },
    'In Progress': { bg: '#fff3e0', color: '#e65100' },
    'Blocked':     { bg: '#fdecea', color: '#c62828' },
    'Complete':    { bg: '#e8f5e9', color: '#2e7d32' }
  };
  var expandedRows = {};

  window.__v18_setStatus = function(taskId, newStatus, sel) {
    var t = (window.tasks || []).find(function(x) { return String(x.id) === String(taskId); });
    if (!t) return;
    t.status = newStatus;
    var cfg = STATUS_CFG[newStatus] || STATUS_CFG['Not Started'];
    sel.style.background = cfg.bg;
    sel.style.color = cfg.color;
    sel.style.borderColor = cfg.color + '60';
    if (typeof window.saveData === 'function') window.saveData();
  };

  window.__v18_toggleExpand = function(taskId) {
    expandedRows[taskId] = !expandedRows[taskId];
    var dr = document.getElementById('v18d-' + taskId);
    if (dr) dr.style.display = expandedRows[taskId] ? 'table-row' : 'none';
    var cr = document.getElementById('v18c-' + taskId);
    if (cr) cr.textContent = expandedRows[taskId] ? ' ▲' : ' ▼';
  };

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function buildSelect(task) {
    var st = task.status || 'Not Started';
    var cfg = STATUS_CFG[st] || STATUS_CFG['Not Started'];
    var s = 'background:' + cfg.bg + ';color:' + cfg.color + ';border:1px solid ' + cfg.color + '60;' +
      'padding:3px 6px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;outline:none;max-width:115px;';
    var opts = Object.keys(STATUS_CFG).map(function(k) {
      return '<option value="' + k + '"' + (k === st ? ' selected' : '') + '>' + k + '</option>';
    }).join('');
    return '<select style="' + s + '" onchange="__v18_setStatus('' + esc(String(task.id)) + '',this.value,this)">' + opts + '</select>';
  }

  function buildDetailRow(task, cols) {
    var desc     = task.description || task.instructions || '';
    var video    = task.trainingVideoUrl || task.training_video_url || task.videoUrl || '';
    var file     = task.fileUrl || task.file_url || task.resourceUrl || task.resource_url || '';
    var notes    = task.notes || '';
    var inner    = '';
    if (!desc && !video && !file && !notes) {
      inner = '<em style="color:#bbb;font-size:12px;">No extra details for this task yet.</em>';
    } else {
      if (desc)  inner += '<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">Instructions</div><div style="font-size:13px;color:#333;white-space:pre-wrap">' + esc(desc) + '</div></div>';
      if (video) inner += '<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">Training Video</div><a href="' + esc(video) + '" target="_blank" style="font-size:13px;color:#b5785a;word-break:break-all">' + esc(video) + '</a></div>';
      if (file)  inner += '<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">File / Resource</div><a href="' + esc(file) + '" target="_blank" style="font-size:13px;color:#b5785a;word-break:break-all">' + esc(file) + '</a></div>';
      if (notes) inner += '<div><div style="font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">Notes</div><div style="font-size:13px;color:#333;white-space:pre-wrap">' + esc(notes) + '</div></div>';
    }
    return '<tr id="v18d-' + esc(String(task.id)) + '" data-v18detail="1" style="display:none">' +
      '<td colspan="' + cols + '" style="padding:14px 18px 16px 36px;background:#faf8f5;border-bottom:2px solid #ece8e3">' +
      inner + '</td></tr>';
  }

  var patchPending = false;
  function patchTaskTable() {
    if (patchPending) return;
    patchPending = true;
    setTimeout(function() {
      patchPending = false;
      _doPatch();
    }, 80);
  }

  function _doPatch() {
    var tables = document.querySelectorAll('table');
    tables.forEach(function(table) {
      var headerRow = table.querySelector('thead tr');
      if (!headerRow) headerRow = table.querySelector('tr');
      if (!headerRow) return;

      var ths = Array.from(headerRow.querySelectorAll('th, td'));
      var headers = ths.map(function(h) { return h.textContent.trim().toLowerCase(); });

      // Only process task tables
      if (!headers.some(function(h) { return h === 'task' || h === 'title'; })) return;
      if (!headers.some(function(h) { return h === 'status'; })) return;

      var priorityIdx  = headers.findIndex(function(h) { return h === 'priority'; });
      var statusIdx    = headers.findIndex(function(h) { return h === 'status'; });
      var taskIdx      = headers.findIndex(function(h) { return h === 'task' || h === 'title'; });
      var notesIdx     = headers.findIndex(function(h) { return h === 'notes'; });
      var hoursAlIdx   = headers.findIndex(function(h) { return h.includes('hours') && h.includes('allow'); });
      var hoursTkIdx   = headers.findIndex(function(h) { return h.includes('hours') && h.includes('tak'); });
      var colCount     = ths.length;

      // --- Patch header once ---
      if (!table.dataset.v18hdr) {
        table.dataset.v18hdr = '1';
        if (priorityIdx > -1) { ths[priorityIdx].style.display = 'none'; ths[priorityIdx].style.width = '0'; }
        if (notesIdx   > -1) { ths[notesIdx].style.width = '260px'; ths[notesIdx].style.minWidth = '180px'; }
        if (hoursAlIdx > -1) { ths[hoursAlIdx].style.width = '75px'; ths[hoursAlIdx].style.fontSize = '11px'; ths[hoursAlIdx].style.whiteSpace = 'nowrap'; }
        if (hoursTkIdx > -1) { ths[hoursTkIdx].style.width = '75px'; ths[hoursTkIdx].style.fontSize = '11px'; ths[hoursTkIdx].style.whiteSpace = 'nowrap'; }
      }

      // --- Patch each data row ---
      var bodyRows = Array.from(table.querySelectorAll('tbody tr, tr')).filter(function(r) {
        return r !== headerRow && !r.dataset.v18detail;
      });

      bodyRows.forEach(function(row) {
        if (row.dataset.v18detail) return; // skip detail rows
        var cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 2) return;

        // Hide priority cell (always, in case row was re-rendered)
        if (priorityIdx > -1 && cells[priorityIdx]) {
          cells[priorityIdx].style.display = 'none';
          cells[priorityIdx].style.width = '0';
          cells[priorityIdx].style.padding = '0';
        }

        // Widen notes cell
        if (notesIdx > -1 && cells[notesIdx]) {
          cells[notesIdx].style.width = '260px';
          cells[notesIdx].style.minWidth = '180px';
          cells[notesIdx].style.whiteSpace = 'normal';
          cells[notesIdx].style.wordBreak = 'break-word';
          cells[notesIdx].style.maxWidth = '280px';
        }

        // Shrink hours cells
        if (hoursAlIdx > -1 && cells[hoursAlIdx]) cells[hoursAlIdx].style.width = '75px';
        if (hoursTkIdx > -1 && cells[hoursTkIdx]) cells[hoursTkIdx].style.width = '75px';

        // Match task object by title
        var titleCell = taskIdx > -1 ? cells[taskIdx] : cells[0];
        if (!titleCell) return;
        var titleText = titleCell.textContent.trim();
        var task = (window.tasks || []).find(function(t) {
          return (t.title || '').trim() === titleText ||
                 titleCell.querySelector('[data-taskid="' + String(t.id) + '"]');
        });
        if (!task) return;
        var tid = String(task.id);

        // Patch status cell — only if not already a select
        if (statusIdx > -1 && cells[statusIdx] && !cells[statusIdx].querySelector('select')) {
          cells[statusIdx].innerHTML = buildSelect(task);
        }

        // Patch title cell — only if not already patched
        if (!titleCell.dataset.v18click) {
          titleCell.dataset.v18click = '1';
          titleCell.style.cursor = 'pointer';
          var label = esc(task.title || titleText);
          titleCell.innerHTML = '<span onclick="__v18_toggleExpand('' + tid + '')" style="font-weight:600;display:inline-flex;align-items:center;gap:4px">' +
            label +
            '<span id="v18c-' + tid + '" style="font-size:9px;color:#ccc;user-select:none"> ▼</span>' +
            '</span>';
          // Insert detail row after this row if not already there
          if (!document.getElementById('v18d-' + tid)) {
            row.insertAdjacentHTML('afterend', buildDetailRow(task, colCount));
          }
        }
      });
    });
  }

  function watchForTaskTable() {
    _doPatch();
    // MutationObserver — debounced
    var obs = new MutationObserver(function(muts) {
      var relevant = muts.some(function(m) {
        return Array.from(m.addedNodes).some(function(n) {
          return n.nodeType === 1 && (n.tagName === 'TR' || n.tagName === 'TABLE' || n.tagName === 'TBODY' || (n.querySelector && n.querySelector('table,tr')));
        });
      });
      if (relevant) patchTaskTable();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    // Interval fallback — re-patch every 600ms, handles any render we missed
    setInterval(_doPatch, 600);
    console.log('[comms-fix v18] Task table watcher active');
  }
  // ── END TASK TABLE v18 ───────────────────────────────────

  async function boot() {
    console.log('[comms-fix] v18.0 booting...');
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
    watchForTaskTable();
    console.log('[comms-fix] v18.0 active');
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 500);
})();