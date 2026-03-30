/**
 * comms-fix-hidden.js
 * Standalone script — hidden task week scoping
 * - Keeps ALL hidden tasks in window.__allHiddenTasks (master store)
 * - window.hiddenTasks only contains entries for the VIEWED week
 * - When week changes, swaps window.hiddenTasks to match viewed week
 * - Restoring a task removes it from master store
 * - Never touches comms-fix-v37.js or any existing functionality
 */
(function() {
  'use strict';

  // Get the viewed week label from the Tasks page element
  function getViewedWeekLabel() {
    var el = document.getElementById('staff-task-week-label') ||
             document.getElementById('tasks-week-label');
    if (el && el.textContent.trim()) return el.textContent.trim();
    // Fallback: owner view
    var all = document.querySelectorAll('.psub, [class*="week"]');
    for (var i = 0; i < all.length; i++) {
      var text = all[i].textContent.trim();
      var m = text.match(/(\d+\s+\w+\s+to\s+\d+\s+\w+)/);
      if (m) return m[1];
    }
    // Final fallback: ISO week
    var now = new Date();
    var d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    var day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return d.getUTCFullYear() + '-W' + Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Sync window.hiddenTasks to only show entries for the viewed week
  function syncHiddenToWeek(label) {
    var all = window.__allHiddenTasks || {};
    // Merge anything currently in hiddenTasks into master store
    if (window.hiddenTasks) {
      Object.keys(window.hiddenTasks).forEach(function(id) {
        all[id] = window.hiddenTasks[id];
      });
    }
    window.__allHiddenTasks = all;
    // Build filtered view for this week only
    var filtered = {};
    Object.keys(all).forEach(function(id) {
      var entry = all[id];
      if (entry && entry.weekLabel === label) filtered[id] = entry;
    });
    window.hiddenTasks = filtered;
    console.log('[comms-fix-hidden] synced for week', label, '— showing', Object.keys(filtered).length, 'of', Object.keys(all).length);
  }

  // Patch hideTask to stamp weekLabel when hiding
  function patchHideTask() {
    if (typeof window.hideTask !== 'function') return;
    if (window.__hiddenPatchApplied) return;
    window.__hiddenPatchApplied = true;
    var orig = window.hideTask;
    window.hideTask = function(taskId) {
      var r = orig.call(this, taskId);
      setTimeout(function() {
        var label = getViewedWeekLabel();
        if (window.hiddenTasks && window.hiddenTasks[String(taskId)]) {
          window.hiddenTasks[String(taskId)].weekLabel = label;
          delete window.hiddenTasks[String(taskId)].weekOffset;
          delete window.hiddenTasks[String(taskId)].weekNumber;
        }
        if (!window.__allHiddenTasks) window.__allHiddenTasks = {};
        if (window.hiddenTasks && window.hiddenTasks[String(taskId)]) {
          window.__allHiddenTasks[String(taskId)] = window.hiddenTasks[String(taskId)];
        }
        if (typeof window.saveData === 'function') window.saveData();
      }, 150);
      return r;
    };
    console.log('[comms-fix-hidden] hideTask patched');
  }

  // Patch unhideTask to remove from master store
  function patchUnhideTask() {
    if (typeof window.unhideTask !== 'function') return;
    if (window.__unhiddenPatchApplied) return;
    window.__unhiddenPatchApplied = true;
    var orig = window.unhideTask;
    window.unhideTask = function(taskId) {
      orig.call(this, taskId);
      if (window.__allHiddenTasks) delete window.__allHiddenTasks[String(taskId)];
      if (typeof window.saveData === 'function') window.saveData();
    };
    console.log('[comms-fix-hidden] unhideTask patched');
  }

  // Patch loadData to re-sync after every reload
  function patchLoadData() {
    if (typeof window.loadData !== 'function') return;
    if (window.__loadDataHiddenPatch) return;
    window.__loadDataHiddenPatch = true;
    var orig = window.loadData;
    window.loadData = function() {
      var r = orig.apply(this, arguments);
      setTimeout(function() {
        syncHiddenToWeek(getViewedWeekLabel());
      }, 150);
      return r;
    };
    console.log('[comms-fix-hidden] loadData patched');
  }

  function init() {
    console.log('[comms-fix-hidden] booting...');
    setTimeout(function() {
      // Init master store from current hiddenTasks
      window.__allHiddenTasks = Object.assign({}, window.hiddenTasks || {});
      // Sync to current viewed week
      syncHiddenToWeek(getViewedWeekLabel());
      // Patch functions
      patchHideTask();
      patchUnhideTask();
      patchLoadData();

      // Watch for week label changes
      var lastLabel = getViewedWeekLabel();
      setInterval(function() {
        var current = getViewedWeekLabel();
        if (current !== lastLabel) {
          lastLabel = current;
          syncHiddenToWeek(current);
          if (typeof window.renderHiddenBox === 'function') window.renderHiddenBox();
        }
      }, 500);

      // Re-sync after cloud load
      var origLog = console.log;
      console.log = function() {
        origLog.apply(console, arguments);
        if (arguments[0] && String(arguments[0]).includes('cloud load successful')) {
          setTimeout(function() {
            window.__allHiddenTasks = Object.assign({}, window.__allHiddenTasks || {}, window.hiddenTasks || {});
            syncHiddenToWeek(getViewedWeekLabel());
            if (typeof window.renderHiddenBox === 'function') window.renderHiddenBox();
          }, 200);
        }
      };

      console.log('[comms-fix-hidden] active');
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }
})();
