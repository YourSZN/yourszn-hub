/**
 * comms-fix-hidden.js v5
 * ONLY responsibility: hide task rows in the DOM for the currently viewed week.
 * Does NOT touch window.hiddenTasks at all -- v37 owns that fully.
 *
 * Uses #staff-task-week-label as the authoritative week source (not
 * getCurrentWeekLabel() from v37 which scans broadly and can return
 * the wrong date when multiple week sections are in the DOM).
 */
(function () {
  'use strict';

  var MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';

  function extractDateRange(label) {
    if (!label) return null;
    var re = new RegExp('(\d+\s+(?:' + MONTHS + ')\s+to\s+\d+\s+(?:' + MONTHS + '))', 'i');
    var m = label.match(re);
    return m ? m[1] : null;
  }

  function getViewedDateRange() {
    var el = document.getElementById('staff-task-week-label');
    if (!el) return null;
    return extractDateRange(el.textContent.trim());
  }

  function applyHiddenToDOM() {
    var hidden = window.hiddenTasks || {};
    var hiddenIds = Object.keys(hidden);
    var viewedDate = getViewedDateRange();

    var hiddenTitles = {};
    hiddenIds.forEach(function (id) {
      var entry = hidden[id];
      if (!entry) return;
      var entryDate = extractDateRange(entry.weekLabel || '') || entry.weekLabel;
      if (!entryDate || !viewedDate) return;
      if (entryDate !== viewedDate) return;
      var task = (window.tasks || []).find(function (t) { return String(t.id) === String(id); });
      if (task && task.title) hiddenTitles[task.title.trim()] = true;
    });

    document.querySelectorAll('table tbody tr').forEach(function (row) {
      var cells = row.querySelectorAll('td');
      if (cells.length < 2) return;
      var title = null;
      for (var i = 0; i < cells.length; i++) {
        var text = cells[i].textContent.trim().split('▼')[0].trim();
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
    console.log('[comms-fix-hidden] v5 booting...');
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
      console.log('[comms-fix-hidden] v5 active');
    }, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }
})();
