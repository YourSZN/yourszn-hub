/**
 * comms-fix-daily.js
 * Standalone script — daily task day bubbles
 * - Adds Mon-Sun bubbles to daily tasks in Tasks page
 * - Replaces weekly task bubbles in Hub with daily task bubbles
 * - Click to toggle green, resets each new week
 * - Never touches comms-fix-v37.js or any existing functionality
 */
(function() {
  'use strict';

  var DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  // Get current week label from DOM (same logic as v37)
  function getWeekLabel() {
    var all = document.querySelectorAll('p,small,span,h2,h3,div');
    var pat = /(\d+\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+to\s+\d+\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.children.length > 2) continue;
      var m = el.textContent.trim().match(pat);
      if (m) return m[1];
    }
    // Fallback: ISO week
    var now = new Date();
    var d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    var day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return d.getUTCFullYear() + '-W' + Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Get or initialise the days data for a task for the current week
  function getTaskDays(task) {
    var key = getWeekLabel();
    if (!task.days) task.days = {};
    if (typeof task.days !== 'object' || Array.isArray(task.days)) task.days = {};
    if (!task.days[key] || typeof task.days[key] !== 'object') task.days[key] = {};
    return task.days[key];
  }

  // Toggle a day bubble on/off
  window.__dailyToggle = function(taskId, day) {
    var task = null;
    (window.tasks || []).forEach(function(t) { if (String(t.id) === String(taskId)) task = t; });
    if (!task) return;
    var dayData = getTaskDays(task);
    dayData[day] = !dayData[day];
    if (typeof window.saveData === 'function') window.saveData();
    // Re-render all bubble containers for this task
    document.querySelectorAll('[data-daily-tid="' + taskId + '"]').forEach(function(el) {
      el.innerHTML = buildBubbles(task);
    });
    // Also refresh Hub
    patchHub();
  };

  // Build the bubble HTML for a task
  function buildBubbles(task) {
    var dayData = getTaskDays(task);
    var tid = String(task.id);
    return DAYS.map(function(d) {
      var done = !!dayData[d];
      return '<span style="display:inline-block;cursor:pointer;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;margin-right:3px;border:1px solid ' +
        (done ? '#22C55E;background:#22C55E;color:white' : '#ccc;background:white;color:#555') +
        '" onclick="__dailyToggle(\'' + tid + '\',\'' + d + '\')">' + d + '</span>';
    }).join('');
  }

  // Inject bubbles into daily task rows in the Tasks page
  function patchTasksPage() {
    (window.tasks || []).forEach(function(task) {
      if (task.freq !== 'daily') return;
      var tid = String(task.id);
      // Find matching rows by title in all task tables
      document.querySelectorAll('table tbody tr').forEach(function(row) {
        // Skip rows already patched for this task
        if (row.querySelector('[data-daily-tid="' + tid + '"]')) return;
        // Find the title cell — look for a cell whose text starts with this task title
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
        // Inject bubble div below title
        var div = document.createElement('div');
        div.setAttribute('data-daily-tid', tid);
        div.style.marginTop = '5px';
        div.innerHTML = buildBubbles(task);
        titleCell.appendChild(div);
      });
    });
  }

  // Patch the Hub recurring tasks section
  function patchHub() {
    var recur = document.getElementById('myhub-recur');
    if (!recur) return;
    var user = (window.curUser || '').toLowerCase();
    if (!user) return;

    var myDaily = (window.tasks || []).filter(function(t) {
      return t.freq === 'daily' &&
        (t.assignedTo || t.assigned_to || '').toLowerCase() === user;
    });

    if (!myDaily.length) return;

    // Build new HTML for the recur section showing daily tasks
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

  // Main watcher
  function init() {
    console.log('[comms-fix-daily] booting...');
    setTimeout(function() {
      patchTasksPage();
      patchHub();

      // Watch for DOM changes
      var obs = new MutationObserver(function(muts) {
        for (var i = 0; i < muts.length; i++) {
          if (muts[i].addedNodes.length > 0) {
            setTimeout(function() {
              patchTasksPage();
              patchHub();
            }, 200);
            break;
          }
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });

      // Poll for tasks page bubbles
      setInterval(patchTasksPage, 1500);

      console.log('[comms-fix-daily] active');
    }, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }
})();
