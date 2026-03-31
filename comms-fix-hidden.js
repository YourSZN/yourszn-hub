/**
 * comms-fix-hidden.js v9
 * ONLY responsibility: hide task rows in the DOM for the currently viewed week.
 * 
 * v7 fix: strip day names (Mon/Tue/etc) appended by comms-fix-daily.js
 * v8 fix: correct regex escaping (\d → \\d in RegExp constructor)
 * v9 fix: check weekLabel ourselves instead of relying on filtered hiddenTasks
 */
(function () {
  'use strict';

  var MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';

  function extractDateRange(label) {
    if (!label) return null;
    var re = new RegExp('(\\d+\\s+(?:' + MONTHS + ')\\s+to\\s+\\d+\\s+(?:' + MONTHS + '))', 'i');
    var m = label.match(re);
    return m ? m[1] : null;
  }

  function getCurrentWeekLabel() {
    // Look for date range in the page
    var all = document.querySelectorAll('p, small, span, h2, h3, div');
    var datePattern = /(\d+\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+to\s+\d+\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.children.length > 2) continue;
      var text = el.textContent.trim();
      var match = text.match(datePattern);
      if (match) return match[1];
    }
    return null;
  }

  function applyHiddenToDOM() {
    var hidden = window.hiddenTasks || {};
    var currentWeek = getCurrentWeekLabel();
    
    // Build set of titles to hide - only for entries matching current week
    var hiddenTitles = {};
    Object.keys(hidden).forEach(function (id) {
      var entry = hidden[id];
      // Only hide if weekLabel matches current week
      if (entry && entry.weekLabel === currentWeek) {
        var task = (window.tasks || []).find(function (t) { return String(t.id) === String(id); });
        if (task && task.title) hiddenTitles[task.title.trim()] = true;
      }
    });

    document.querySelectorAll('table tbody tr').forEach(function (row) {
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

  function init() {
    console.log('[comms-fix-hidden] v9 booting...');
    setTimeout(function () {
      applyHiddenToDOM();
      var lastLabel = '';
      setInterval(function () {
        var el = document.getElementById('staff-task-week-label');
        var current = el ? el.textContent.trim() : '';
        applyHiddenToDOM();
        if (current && current !== lastLabel) {
          lastLabel = current;
          console.log('[comms-fix-hidden] week changed to:', current);
        }
      }, 600);
      console.log('[comms-fix-hidden] v9 active');
    }, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }
})();
