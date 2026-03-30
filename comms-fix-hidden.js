/**
 * comms-fix-hidden.js v4
 * ONLY responsibility: hide task rows in the DOM for the current week.
 * Does NOT touch window.hiddenTasks at all.
 * v37 owns hiddenTasks, week scoping, renderHiddenBox, and user filtering.
 */
(function () {
  'use strict';

  function applyHiddenToDOM() {
    var hidden = window.hiddenTasks || {};
    var hiddenIds = Object.keys(hidden);

    var hiddenTitles = {};
    hiddenIds.forEach(function (id) {
      var entry = hidden[id];
      if (typeof window.isHiddenThisWeek === 'function' && !window.isHiddenThisWeek(entry)) return;
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
    console.log('[comms-fix-hidden] v4 booting...');
    setTimeout(function () {
      applyHiddenToDOM();
      var lastLabel = '';
      setInterval(function () {
        var el = document.getElementById('staff-task-week-label');
        var current = el ? el.textContent.trim() : '';
        applyHiddenToDOM();
        if (current && current !== lastLabel) {
          lastLabel = current;
          console.log('[comms-fix-hidden] week label changed:', current);
        }
      }, 600);
      console.log('[comms-fix-hidden] v4 active');
    }, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }
})();
