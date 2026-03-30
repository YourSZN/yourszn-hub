/**
 * comms-fix-hidden.js
 * Filters window.hiddenTasks to viewed week + hides DOM rows
 * Does NOT patch any app functions
 */
(function() {
  'use strict';

  var MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';

  function getViewedWeekLabel() {
    var el = document.getElementById('staff-task-week-label');
    if (el && el.textContent.trim()) return el.textContent.trim();
    return null;
  }

  function extractDatePart(label) {
    if (!label) return null;
    var re = new RegExp('(\d+\s+(?:' + MONTHS + ')\s+to\s+\d+\s+(?:' + MONTHS + '))', 'i');
    var m = label.match(re);
    return m ? m[1] : label;
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
    var all = window.__allHiddenTasks || {};
    if (window.hiddenTasks) {
      Object.keys(window.hiddenTasks).forEach(function(id) {
        if (window.hiddenTasks[id]) all[id] = window.hiddenTasks[id];
      });
    }
    window.__allHiddenTasks = all;
    var filtered = {};
    Object.keys(all).forEach(function(id) {
      var entry = all[id];
      if (!entry) return;
      var entryDate = extractDatePart(entry.weekLabel || '');
      if (entryDate && viewedDate && entryDate === viewedDate) filtered[id] = entry;
    });
    window.hiddenTasks = filtered;
    console.log('[comms-fix-hidden] week:', viewedDate, '— showing', Object.keys(filtered).length, 'of', Object.keys(all).length);
    applyHiddenToDOM();
  }

  function init() {
    console.log('[comms-fix-hidden] booting...');
    setTimeout(function() {
      window.__allHiddenTasks = Object.assign({}, window.hiddenTasks || {});
      var label = getViewedWeekLabel();
      syncHiddenToWeek(label);
      var lastLabel = label;
      setInterval(function() {
        var current = getViewedWeekLabel();
        if (!current) return;
        if (current !== lastLabel) {
          lastLabel = current;
          syncHiddenToWeek(current);
          if (typeof window.renderHiddenBox === 'function') window.renderHiddenBox();
        }
        applyHiddenToDOM();
      }, 600);
      var origLog = console.log;
      console.log = function() {
        origLog.apply(console, arguments);
        if (arguments[0] && String(arguments[0]).includes('cloud load successful')) {
          setTimeout(function() {
            if (window.hiddenTasks) {
              Object.keys(window.hiddenTasks).forEach(function(id) {
                if (window.hiddenTasks[id]) window.__allHiddenTasks[id] = window.hiddenTasks[id];
              });
            }
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
