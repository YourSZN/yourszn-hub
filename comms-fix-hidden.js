/**
 * comms-fix-hidden.js
 * Filters window.hiddenTasks to viewed week + hides DOM rows
 * Does NOT patch any app functions
 * v3 - fix normalise regex, fix week-change re-sync
 */
(function() {
  'use strict';

  var MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';

  function getViewedWeekLabel() {
    var el = document.getElementById('staff-task-week-label');
    if (el && el.textContent.trim()) return el.textContent.trim();
    return null;
  }

  function normalise(str) {
    if (!str) return '';
    return str
      .replace(/[    ]/g, ' ')
      .replace(/[‐‑‒–—―]/g, '-')
      .replace(/s+/g, ' ')
      .trim();
  }

  function extractDatePart(label) {
    if (!label) return null;
    var norm = normalise(label);
    var re = new RegExp('(\d+\s+(?:' + MONTHS + ')\s+to\s+\d+\s+(?:' + MONTHS + '))', 'i');
    var m = norm.match(re);
    return m ? normalise(m[1]) : normalise(norm);
  }

  function applyHiddenToDOM() {
    var hidden = window.hiddenTasks || {};
    var hiddenIds = Object.keys(hidden);
    var hiddenTitles = {};
    hiddenIds.forEach(function(id) {
      var task = (window.tasks || []).find(function(t) { return String(t.id) === String(id); });
      if (task && task.title) hiddenTitles[task.title.trim()] = true;
    });
    document.querySelectorAll('table tbody tr').forEach(function(row) {
      var cells = row.querySelectorAll('td');
      if (cells.length < 2) return;
      var titleCell = null;
      for (var i = 0; i < cells.length; i++) {
        var text = cells[i].textContent.trim();
        if (text && text.length > 0 && text.length < 100) {
          var clean = text.split('▼')[0].trim();
          if (hiddenTitles[clean] !== undefined) { titleCell = cells[i]; break; }
        }
      }
      if (!titleCell) return;
      var title = titleCell.textContent.trim().split('▼')[0].trim();
      if (hiddenTitles[title]) {
        row.style.display = 'none';
      } else {
        if (row.style.display === 'none') row.style.display = '';
      }
    });
    if (hiddenIds.length === 0) {
      document.querySelectorAll('table tbody tr').forEach(function(row) {
        if (row.style.display === 'none') row.style.display = '';
      });
    }
  }

  function syncHiddenToWeek(viewedLabel) {
    if (!viewedLabel) return;
    var viewedDate = extractDatePart(viewedLabel);

    // Always merge the unfiltered store + current hiddenTasks into master
    var all = window.__allHiddenTasks || {};
    Object.keys(window.__preFilterHiddenTasks || {}).forEach(function(id) {
      var e = window.__preFilterHiddenTasks[id];
      if (e) all[id] = e;
    });
    // Only merge from hiddenTasks if it hasn't been filtered yet (has entries)
    // We track this with __hiddenTasksFiltered flag
    if (!window.__hiddenTasksFiltered) {
      Object.keys(window.hiddenTasks || {}).forEach(function(id) {
        if (window.hiddenTasks[id]) all[id] = window.hiddenTasks[id];
      });
    }
    window.__allHiddenTasks = all;

    var filtered = {};
    Object.keys(all).forEach(function(id) {
      var entry = all[id];
      if (!entry) return;
      var entryDate = extractDatePart(entry.weekLabel || '');
      var match = (entryDate && viewedDate && entryDate === viewedDate);
      if (match) filtered[id] = entry;
      console.log('[hidden] id=' + id + ' stored=' + JSON.stringify(entryDate) + ' viewed=' + JSON.stringify(viewedDate) + ' match=' + match);
    });
    window.hiddenTasks = filtered;
    window.__hiddenTasksFiltered = true;
    console.log('[hidden] week:', viewedDate, '- showing', Object.keys(filtered).length, 'of', Object.keys(all).length);
    applyHiddenToDOM();
  }

  function init() {
    console.log('[comms-fix-hidden] booting...');
    setTimeout(function() {
      // Snapshot BEFORE any filtering
      window.__allHiddenTasks = Object.assign({}, window.hiddenTasks || {});
      window.__preFilterHiddenTasks = Object.assign({}, window.hiddenTasks || {});
      window.__hiddenTasksFiltered = false;
      var label = getViewedWeekLabel();
      syncHiddenToWeek(label);
      var lastLabel = label;

      setInterval(function() {
        var current = getViewedWeekLabel();
        if (!current) return;
        if (current !== lastLabel) {
          console.log('[hidden] week changed: ' + lastLabel + ' -> ' + current);
          lastLabel = current;
          syncHiddenToWeek(current);
          if (typeof window.renderHiddenBox === 'function') window.renderHiddenBox();
        } else {
          applyHiddenToDOM();
        }
      }, 600);

      // Re-sync after cloud load brings in fresh data
      var origLog = console.log;
      console.log = function() {
        origLog.apply(console, arguments);
        if (arguments[0] && String(arguments[0]).includes('cloud load successful')) {
          setTimeout(function() {
            // Reset filtered flag so fresh data gets merged into master store
            window.__hiddenTasksFiltered = false;
            Object.keys(window.hiddenTasks || {}).forEach(function(id) {
              if (window.hiddenTasks[id]) {
                window.__allHiddenTasks[id] = window.hiddenTasks[id];
                window.__preFilterHiddenTasks[id] = window.hiddenTasks[id];
              }
            });
            syncHiddenToWeek(getViewedWeekLabel());
            if (typeof window.renderHiddenBox === 'function') window.renderHiddenBox();
          }, 300);
        }
      };
      console.log('[comms-fix-hidden] active');
    }, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }
})();
