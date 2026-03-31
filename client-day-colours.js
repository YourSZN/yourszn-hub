/**
 * client-day-colours.js
 * Phase 3 patch — colours client rows by their selected Day value.
 * Safe to load after app.js and existing patch files.
 * Days match the dropdown format: Monday, Tuesday, Wednesday,
 * Thursday, Friday, Saturday, Sunday
 */

(function () {

  // ── Day colour palette ───────────────────────────────────────
  // Soft muted tones designed to complement the existing beige/neutral UI
  const DAY_COLOURS = {
    'monday':    { bg: '#dce8f5', border: '#90b8e0' }, // soft blue
    'tuesday':   { bg: '#fde8d8', border: '#f0b48a' }, // soft peach
    'wednesday': { bg: '#d4edda', border: '#85c99a' }, // soft green
    'thursday':  { bg: '#f3e5f5', border: '#c79edc' }, // soft lavender
    'friday':    { bg: '#fff3cd', border: '#f0c040' }, // soft gold
    'saturday':  { bg: '#fce4ec', border: '#f0a0b8' }, // soft rose
    'sunday':    { bg: '#e8f4f8', border: '#7ec8dc' }, // soft sky blue
  };

  // ── Apply colour to one row ──────────────────────────────────
  function colourRow(row) {
    const selects = row.querySelectorAll('select');
    if (!selects.length) return;

    // Find the day select — the one whose value matches a known day name
    let dayValue = '';
    for (const sel of selects) {
      const v = (sel.value || '').trim().toLowerCase();
      if (DAY_COLOURS[v]) { dayValue = v; break; }
    }

    const colours = DAY_COLOURS[dayValue];

    if (colours) {
      row.style.backgroundColor = colours.bg;
      row.style.borderLeft = '3px solid ' + colours.border;
      row.querySelectorAll('input, select, textarea').forEach(el => {
        el.style.backgroundColor = colours.bg;
      });
    } else {
      row.style.backgroundColor = '';
      row.style.borderLeft = '';
      row.querySelectorAll('input, select, textarea').forEach(el => {
        el.style.backgroundColor = '';
      });
    }
  }

  // ── Colour all client rows ───────────────────────────────────
  function colourAllRows() {
    document.querySelectorAll('tr').forEach(row => {
      if (row.querySelector('td') && row.querySelector('select')) {
        colourRow(row);
      }
    });
  }

  // ── Listen for day dropdown changes in real time ─────────────
  function attachListeners() {
    document.addEventListener('change', function (e) {
      if (e.target && e.target.tagName === 'SELECT') {
        const row = e.target.closest('tr');
        if (row) colourRow(row);
      }
    });
  }

  // ── Watch for rows dynamically added by the app ──────────────
  function watchForNewRows() {
    const observer = new MutationObserver(function (mutations) {
      let hasNew = false;
      mutations.forEach(m => { if (m.addedNodes.length) hasNew = true; });
      if (hasNew) setTimeout(colourAllRows, 120);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    colourAllRows();
    attachListeners();
    watchForNewRows();
    // Re-run after Supabase data load delays
    setTimeout(colourAllRows, 600);
    setTimeout(colourAllRows, 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
