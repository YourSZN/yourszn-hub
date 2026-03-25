/**
 * comms-fix.js v19.0
 * DM + Group chat: UNTOUCHED
 * Hidden task fix: UNTOUCHED
 * v19: Task table fixes
 *   - Status values are stored as 'not-started','in-progress','blocked','complete' (hyphenated)
 *   - App renders status as a <span> pill — we replace its innerHTML with a <select>
 *   - Priority column hidden by adding CSS rule (no DOM reliance)
 *   - Expandable row on task name click
 *   - Runs every 600ms to survive re-renders
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

  // ── TASK TABLE v19 ──────────────────────────────────────────

  // Status values as stored in DB (hyphenated lowercase)
  var STATUS_OPTS = [
    { val: 'not-started', label: 'Not Started', bg: '#f0f0f0',  color: '#666' },
    { val: 'in-progress', label: 'In Progress', bg: '#fff3e0',  color: '#e65100' },
    { val: 'blocked',     label: 'Blocked',     bg: '#fdecea',  color: '#c62828' },
    { val: 'complete',    label: 'Complete',    bg: '#e8f5e9',  color: '#2e7d32' }
  ];

  var expandedRows = {};

  function getStatusCfg(val) {
    return STATUS_OPTS.find(function(o) { return o.val === val; }) || STATUS_OPTS[0];
  }

  // Inject a CSS rule once to hide all Priority column cells
  function injectPriorityHideCSS() {
    if (document.getElementById('v19-priority-hide')) return;
    // We identify priority column cells by their text content "Red", "Orange", "Green"
    // Strategy: hide any td that directly contains ONLY a color word with no child elements
    // Better: we'll use our column-index approach via a <style> with nth-child
    // But we don't know nth-child without reading the table.
    // Instead: add a class to them during patch, then hide via CSS
    var style = document.createElement('style');
    style.id = 'v19-priority-hide';
    style.textContent = '.v19-hide { display: none !important; width: 0 !important; padding: 0 !important; }';
    document.head.appendChild(style);
  }

  window.__v19_setStatus = function(taskId, newVal, sel) {
    var t = (window.tasks || []).find(function(x) { return String(x.id) === String(taskId); });
    if (!t) return;
    t.status = newVal;
    var cfg = getStatusCfg(newVal);
    sel.style.background = cfg.bg;
    sel.style.color = cfg.color;
    sel.style.borderColor = cfg.color + '60';
    if (typeof window.saveData === 'function') window.saveData();
    console.log('[v19] Status saved:', taskId, newVal);
  };

  window.__v19_toggleExpand = function(taskId) {
    expandedRows[taskId] = !expandedRows[taskId];
    var dr = document.getElementById('v19d-' + taskId);
    if (dr) dr.style.display = expandedRows[taskId] ? 'table-row' : 'none';
    var cr = document.getElementById('v19c-' + taskId);
    if (cr) cr.textContent = expandedRows[taskId] ? ' ▲' : ' ▼';
  };

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function buildSelect(task) {
    var val = (task.status || 'not-started').toLowerCase();
    var cfg = getStatusCfg(val);
    var style = 'background:' + cfg.bg + ';color:' + cfg.color + ';border:1px solid ' + cfg.color + '60;' +
      'padding:3px 7px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;outline:none;width:100%;max-width:120px;';
    var opts = STATUS_OPTS.map(function(o) {
      return '<option value="' + o.val + '"' + (o.val === val ? ' selected' : '') + '>' + o.label + '</option>';
    }).join('');
    return '<select data-v19sel="1" style="' + style + '" onchange="__v19_setStatus('' + esc(String(task.id)) + '',this.value,this)" onclick="event.stopPropagation()">' + opts + '</select>';
  }

  function buildDetailRow(task, cols) {
    var desc  = task.desc || task.description || task.instructions || '';
    var video = task.videoUrl || task.trainingVideoUrl || task.training_video_url || task.video_url || '';
    var file  = task.fileUrl || task.file_url || task.resourceUrl || task.resource_url || '';
    var notes = task.notes || task.staffNotes || task.staff_notes || '';
    var inner = '';
    if (!desc && !video && !file && !notes) {
      inner = '<em style="color:#bbb;font-size:12px;">No extra details saved for this task yet.</em>';
    } else {
      if (desc)  inner += '<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">Instructions</div><div style="font-size:13px;color:#333;white-space:pre-wrap">' + esc(desc) + '</div></div>';
      if (video) inner += '<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">Training Video</div><a href="' + esc(video) + '" target="_blank" style="font-size:13px;color:#b5785a;word-break:break-all">' + esc(video) + '</a></div>';
      if (file)  inner += '<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">File / Resource</div><a href="' + esc(file) + '" target="_blank" style="font-size:13px;color:#b5785a;word-break:break-all">' + esc(file) + '</a></div>';
      if (notes) inner += '<div><div style="font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">Notes</div><div style="font-size:13px;color:#333;white-space:pre-wrap">' + esc(notes) + '</div></div>';
    }
    return '<tr id="v19d-' + esc(String(task.id)) + '" data-v19detail="1" style="display:none;">' +
      '<td colspan="' + cols + '" style="padding:14px 18px 16px 36px;background:#faf8f5;border-bottom:2px solid #ece8e3">' +
      inner + '</td></tr>';
  }

  function _doPatch() {
    if (!window.tasks || !window.tasks.length) return;

    var tables = document.querySelectorAll('table');
    tables.forEach(function(table) {
      // Skip detail rows' wrapping tables and already-noted non-task tables
      if (table.dataset.v19skip) return;

      var headerRow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!headerRow) return;

      var ths = Array.from(headerRow.querySelectorAll('th, td'));
      var headers = ths.map(function(h) { return h.textContent.trim().toLowerCase(); });

      // Must have a TASK/TITLE column AND a STATUS column to be a task table
      var hasTask   = headers.some(function(h) { return h === 'task' || h === 'title'; });
      var hasStatus = headers.some(function(h) { return h === 'status'; });
      if (!hasTask || !hasStatus) { table.dataset.v19skip = '1'; return; }

      var priorityIdx = headers.findIndex(function(h) { return h === 'priority'; });
      var statusIdx   = headers.findIndex(function(h) { return h === 'status'; });
      var taskIdx     = headers.findIndex(function(h) { return h === 'task' || h === 'title'; });
      var notesIdx    = headers.findIndex(function(h) { return h === 'notes'; });
      var colCount    = ths.length;

      // Hide priority TH
      if (priorityIdx > -1 && !ths[priorityIdx].classList.contains('v19-hide')) {
        ths[priorityIdx].classList.add('v19-hide');
      }
      // Widen notes TH
      if (notesIdx > -1) {
        ths[notesIdx].style.minWidth = '200px';
        ths[notesIdx].style.width = '260px';
      }

      // Process body rows
      var bodyRows = Array.from(table.querySelectorAll('tr')).filter(function(r) {
        return r !== headerRow && !r.dataset.v19detail;
      });

      bodyRows.forEach(function(row) {
        var cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 3) return;

        // --- Hide priority TD ---
        if (priorityIdx > -1 && cells[priorityIdx]) {
          cells[priorityIdx].classList.add('v19-hide');
        }

        // --- Widen notes TD ---
        if (notesIdx > -1 && cells[notesIdx]) {
          cells[notesIdx].style.minWidth = '200px';
          cells[notesIdx].style.whiteSpace = 'normal';
          cells[notesIdx].style.wordBreak = 'break-word';
        }

        // --- Match task by title (strip all child element text, just raw text) ---
        var titleCell = taskIdx > -1 ? cells[taskIdx] : null;
        if (!titleCell) return;

        // Get title text — look for the text content of the cell ignoring nested elements
        var titleText = titleCell.textContent.trim();
        var task = (window.tasks || []).find(function(t) {
          return (t.title || '').trim() === titleText;
        });
        if (!task) return;
        var tid = String(task.id);

        // --- Patch STATUS cell: replace if it doesn't already have our select ---
        if (statusIdx > -1 && cells[statusIdx]) {
          var statusCell = cells[statusIdx];
          if (!statusCell.querySelector('[data-v19sel]')) {
            statusCell.innerHTML = buildSelect(task);
          } else {
            // Update existing select value in case task status changed elsewhere
            var sel = statusCell.querySelector('[data-v19sel]');
            var currentVal = (task.status || 'not-started').toLowerCase();
            if (sel.value !== currentVal) sel.value = currentVal;
          }
        }

        // --- Patch title cell: add expand caret + detail row ---
        if (!titleCell.dataset.v19click) {
          titleCell.dataset.v19click = '1';
          titleCell.style.cursor = 'pointer';
          titleCell.innerHTML = '<span onclick="__v19_toggleExpand('' + tid + '')" style="font-weight:600;">' +
            esc(task.title || titleText) +
            '<span id="v19c-' + tid + '" style="font-size:9px;color:#ccc;margin-left:4px;"> ▼</span>' +
            '</span>';
          // Insert detail row after this row if not already present
          if (!document.getElementById('v19d-' + tid)) {
            row.insertAdjacentHTML('afterend', buildDetailRow(task, colCount));
            var dr = document.getElementById('v19d-' + tid);
            if (dr) dr.dataset.v19detail = '1';
          }
        }
      });
    });
  }

  function watchForTaskTable() {
    injectPriorityHideCSS();
    _doPatch();
    var obs = new MutationObserver(function(muts) {
      var relevant = muts.some(function(m) {
        return Array.from(m.addedNodes).some(function(n) {
          return n.nodeType === 1;
        });
      });
      if (relevant) setTimeout(_doPatch, 100);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    // Interval fallback — catches any re-renders we miss
    setInterval(_doPatch, 800);
    console.log('[v19] Task table watcher active');
  }
  // ── END TASK TABLE v19 ───────────────────────────────────

  async function boot() {
    console.log('[comms-fix] v19.0 booting...');
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
    console.log('[comms-fix] v19.0 active');
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 500);
})();