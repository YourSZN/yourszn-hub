/**
 * comms-fix.js v17.0
 * DM + Group chat: UNTOUCHED
 * Hidden task fix: UNTOUCHED
 * NEW v17: Task table improvements
 *   - Remove Priority column
 *   - Inline colour-coded status dropdown (all users)
 *   - Wider notes column
 *   - Expandable row on task name click (description, video url, file url, notes)
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

  // ── TASK TABLE v17: STATUS DROPDOWN + EXPANDABLE ROWS ────────

  // Status config
  var STATUS_CFG = {
    'Not Started':  { bg: '#f0f0f0', color: '#666' },
    'In Progress':  { bg: '#fff3e0', color: '#e65100' },
    'Blocked':      { bg: '#fdecea', color: '#c62828' },
    'Complete':     { bg: '#e8f5e9', color: '#2e7d32' }
  };

  // Track which task rows are expanded
  var expandedRows = {};

  function getStatusStyle(status) {
    var cfg = STATUS_CFG[status] || STATUS_CFG['Not Started'];
    return `background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.color}30;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;`;
  }

  // Called when user changes status via dropdown
  window.__v17_setStatus = function(taskId, newStatus, selectEl) {
    var t = (window.tasks || []).find(function(x) { return String(x.id) === String(taskId); });
    if (!t) return;
    t.status = newStatus;
    // Style the select element
    var cfg = STATUS_CFG[newStatus] || STATUS_CFG['Not Started'];
    selectEl.style.background = cfg.bg;
    selectEl.style.color = cfg.color;
    if (typeof window.saveData === 'function') window.saveData();
    console.log('[comms-fix v17] Status updated:', taskId, newStatus);
  };

  // Toggle expand/collapse for a task row
  window.__v17_toggleExpand = function(taskId) {
    expandedRows[taskId] = !expandedRows[taskId];
    var detailRow = document.getElementById('v17-detail-' + taskId);
    if (!detailRow) return;
    detailRow.style.display = expandedRows[taskId] ? 'table-row' : 'none';
    // Update the caret on the task name cell
    var caretEl = document.getElementById('v17-caret-' + taskId);
    if (caretEl) caretEl.textContent = expandedRows[taskId] ? ' ▲' : ' ▼';
  };

  function buildStatusSelect(task) {
    var status = task.status || 'Not Started';
    var cfg = STATUS_CFG[status] || STATUS_CFG['Not Started'];
    var opts = Object.keys(STATUS_CFG).map(function(s) {
      return '<option value="' + s + '"' + (s === status ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
    var style = `background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.color}30;padding:2px 5px;border-radius:10px;font-size:11px;font-weight:600;cursor:pointer;outline:none;max-width:110px;`;
    return '<select style="' + style + '" onchange="__v17_setStatus(\'' + String(task.id) + '\', this.value, this)">' + opts + '</select>';
  }

  function buildDetailRow(task, colCount) {
    var desc = task.description || task.instructions || '';
    var videoUrl = task.trainingVideoUrl || task.training_video_url || task.videoUrl || '';
    var fileUrl = task.fileUrl || task.file_url || task.resourceUrl || task.resource_url || '';
    var notes = task.notes || '';
    var hasAny = desc || videoUrl || fileUrl || notes;
    var inner = '';
    if (!hasAny) {
      inner = '<em style="color:#aaa;font-size:12px;">No extra details saved for this task.</em>';
    } else {
      if (desc) inner += '<div style="margin-bottom:6px;"><strong style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Instructions</strong><div style="margin-top:2px;font-size:13px;color:#333;white-space:pre-wrap;">' + esc(desc) + '</div></div>';
      if (videoUrl) inner += '<div style="margin-bottom:6px;"><strong style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Training Video</strong><div style="margin-top:2px;"><a href="' + esc(videoUrl) + '" target="_blank" style="font-size:13px;color:#c07a5a;text-decoration:underline;">' + esc(videoUrl) + '</a></div></div>';
      if (fileUrl) inner += '<div style="margin-bottom:6px;"><strong style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;">File / Resource</strong><div style="margin-top:2px;"><a href="' + esc(fileUrl) + '" target="_blank" style="font-size:13px;color:#c07a5a;text-decoration:underline;">' + esc(fileUrl) + '</a></div></div>';
      if (notes) inner += '<div><strong style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Notes</strong><div style="margin-top:2px;font-size:13px;color:#333;white-space:pre-wrap;">' + esc(notes) + '</div></div>';
    }
    return '<tr id="v17-detail-' + String(task.id) + '" style="display:none;"><td colspan="' + colCount + '" style="padding:12px 16px 14px 32px;background:#faf9f7;border-bottom:1px solid #ece8e3;">' + inner + '</td></tr>';
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function patchTaskTable() {
    // Find all task tables on the page
    var tables = document.querySelectorAll('table');
    tables.forEach(function(table) {
      // Skip already patched
      if (table.dataset.v17patched) return;

      // Find header row
      var headerRow = table.querySelector('thead tr, tr:first-child');
      if (!headerRow) return;
      var headers = Array.from(headerRow.querySelectorAll('th, td')).map(function(h) { return h.textContent.trim().toLowerCase(); });
      // Must look like a task table
      if (!headers.includes('task') && !headers.includes('title')) return;

      table.dataset.v17patched = 'true';

      // Find column indices
      var priorityIdx = headers.findIndex(function(h) { return h === 'priority'; });
      var statusIdx   = headers.findIndex(function(h) { return h === 'status'; });
      var taskIdx     = headers.findIndex(function(h) { return h === 'task' || h === 'title'; });
      var notesIdx    = headers.findIndex(function(h) { return h === 'notes'; });
      var hoursAllIdx = headers.findIndex(function(h) { return h.includes('hours') && h.includes('allow'); });
      var hoursTakIdx = headers.findIndex(function(h) { return h.includes('hours') && h.includes('tak'); });

      // Remove Priority column header
      if (priorityIdx > -1) {
        var pth = headerRow.querySelectorAll('th, td')[priorityIdx];
        if (pth) pth.style.display = 'none';
      }

      // Widen notes header, shrink hours headers
      if (notesIdx > -1) {
        var nth = headerRow.querySelectorAll('th, td')[notesIdx];
        if (nth) { nth.style.width = '260px'; nth.style.minWidth = '200px'; }
      }
      if (hoursAllIdx > -1) {
        var hah = headerRow.querySelectorAll('th, td')[hoursAllIdx];
        if (hah) { hah.style.width = '80px'; hah.style.minWidth = '60px'; hah.style.fontSize = '11px'; }
      }
      if (hoursTakIdx > -1) {
        var hth2 = headerRow.querySelectorAll('th, td')[hoursTakIdx];
        if (hth2) { hth2.style.width = '80px'; hth2.style.minWidth = '60px'; hth2.style.fontSize = '11px'; }
      }

      var colCount = headers.length - (priorityIdx > -1 ? 1 : 0);

      // Process each body row
      var rows = Array.from(table.querySelectorAll('tbody tr, tr')).filter(function(r) {
        return r !== headerRow && !r.dataset.v17detail;
      });

      rows.forEach(function(row) {
        if (row.dataset.v17row) return;
        row.dataset.v17row = 'true';

        var cells = row.querySelectorAll('td');
        if (cells.length < 2) return;

        // Try to find the task object for this row
        // Match by title text
        var titleCell = taskIdx > -1 ? cells[taskIdx] : cells[0];
        var titleText = titleCell ? titleCell.textContent.trim() : '';
        var task = (window.tasks || []).find(function(t) {
          return (t.title || '').trim() === titleText;
        });

        // Hide priority cell
        if (priorityIdx > -1 && cells[priorityIdx]) {
          cells[priorityIdx].style.display = 'none';
        }

        // Widen notes cell
        if (notesIdx > -1 && cells[notesIdx]) {
          cells[notesIdx].style.width = '260px';
          cells[notesIdx].style.minWidth = '200px';
          cells[notesIdx].style.whiteSpace = 'normal';
          cells[notesIdx].style.wordBreak = 'break-word';
        }

        // Shrink hours cells
        if (hoursAllIdx > -1 && cells[hoursAllIdx]) {
          cells[hoursAllIdx].style.width = '80px';
        }
        if (hoursTakIdx > -1 && cells[hoursTakIdx]) {
          cells[hoursTakIdx].style.width = '80px';
        }

        // Replace status cell with coloured dropdown
        if (statusIdx > -1 && cells[statusIdx] && task) {
          var statusCell = cells[statusIdx];
          statusCell.innerHTML = buildStatusSelect(task);
        }

        // Make task name clickable to expand detail
        if (task && titleCell && !titleCell.dataset.v17click) {
          titleCell.dataset.v17click = 'true';
          titleCell.style.cursor = 'pointer';
          var origHtml = titleCell.innerHTML;
          titleCell.innerHTML = '<span onclick="__v17_toggleExpand('' + String(task.id) + '')" style="font-weight:600;">' +
            esc(task.title || titleText) +
            '<span id="v17-caret-' + String(task.id) + '" style="font-size:10px;color:#aaa;"> ▼</span></span>';

          // Insert detail row after this row
          var detailHtml = buildDetailRow(task, colCount);
          row.insertAdjacentHTML('afterend', detailHtml);
          var detailTr = document.getElementById('v17-detail-' + String(task.id));
          if (detailTr) detailTr.dataset.v17detail = 'true';
        }
      });

      console.log('[comms-fix v17] Patched table with', rows.length, 'rows');
    });
  }

  function watchForTaskTable() {
    // Patch immediately and also watch for re-renders
    patchTaskTable();
    var obs = new MutationObserver(function(muts) {
      var shouldPatch = muts.some(function(m) {
        return m.addedNodes.length > 0;
      });
      if (shouldPatch) patchTaskTable();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    console.log('[comms-fix v17] Task table observer active');
  }

  // ── END TASK TABLE v17 ────────────────────────────────────────

  async function boot() {
    console.log('[comms-fix] v17.0 booting...');
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
    console.log('[comms-fix] v17.0 active');
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 500);
})();