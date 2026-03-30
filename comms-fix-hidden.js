/**
 * comms-fix-hidden.js v6
 * ONLY responsibility: hide task rows in the DOM for the currently viewed week.
 * Does NOT touch window.hiddenTasks at all -- v37 owns that fully.
 *
 * Fix over v5: re-run applyHiddenToDOM after cloud load completes,
 * since week navigation triggers a full data reload which temporarily
 * empties window.hiddenTasks before v37 repopulates it.
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
    console.log('[comms-fix-hidden] v6 booting...');
    setTimeout(function () {
      applyHiddenToDOM();
      setInterval(applyHiddenToDOM, 600);
      var origLog = console.log;
      console.log = function () {
        origLog.apply(console, arguments);
        if (arguments[0] && String(arguments[0]).includes('cloud load successful')) {
          setTimeout(applyHiddenToDOM, 350);
        }
      };
      console.log('[comms-fix-hidden] v6 active');
    }, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }
})();
