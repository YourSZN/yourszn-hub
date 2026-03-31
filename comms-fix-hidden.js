/**
 * comms-fix-hidden.js v8
 * ONLY responsibility: hide task rows in the DOM for the currently viewed week.
 * Does NOT touch window.hiddenTasks at all -- v39 owns that fully.
 *
 * v7 fix: strip day names (Mon/Tue/etc) appended by comms-fix-daily.js
 * v8 fix: correct regex escaping (\d → \\d in RegExp constructor)
 */
(function () {
  'use strict';

  var MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';

  function extractDateRange(label) {
    if (!label) return null;
    // v8 FIX: Use \\d instead of \d in RegExp string constructor
    var re = new RegExp('(\\d+\\s+(?:' + MONTHS + ')\\s+to\\s+\\d+\\s+(?:' + MONTHS + '))', 'i');
    var m = label.match(re);
    return m ? m[1] : null;
  }

  function getViewedDateRange() {
    var el = document.getElementById('staff-task-week-label');
    if (!el) return null;
    return extractDateRange(el.textContent.trim());
  }

  function applyHiddenToDOM() {
    // v8 FIX: window.hiddenTasks is already filtered by v39 to only contain
    // entries for the CURRENT viewed week. So we just hide anything in there.
    // On other weeks, window.hiddenTasks will be empty (or not contain this task),
    // so the task will show normally.
    var hidden = window.hiddenTasks || {};
    var hiddenIds = Object.keys(hidden);

    // Build set of titles to hide (only tasks hidden for THIS week are in window.hiddenTasks)
    var hiddenTitles = {};
    hiddenIds.forEach(function (id) {
      var task = (window.tasks || []).find(function (t) { return String(t.id) === String(id); });
      if (task && task.title) hiddenTitles[task.title.trim()] = true;
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
        // v8: Always restore visibility if not in current week's hidden list
        if (row.style.display === 'none') row.style.display = '';
      }
    });
  }

  function init() {
    console.log('[comms-fix-hidden] v7 booting...');
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
      console.log('[comms-fix-hidden] v7 active');
    }, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }
})();
