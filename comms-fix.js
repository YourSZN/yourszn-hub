/**
 * comms-fix.js v14.0
 * DM + Group chat: UNTOUCHED
 * Task fix: renderHiddenBoxFor uses .map(Number) on task IDs
 * but IDs are UUIDs so Number('uuid') = NaN and no tasks ever show.
 * Fix: patch renderHiddenBoxFor to use string IDs directly.
 */
(function () {
  'use strict';
  const U = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  const K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };

  function tk(a, b) { return [a, b].sort().join('_'); }
  async function ins(table, data) {
    try { await fetch(`${U}/rest/v1/${table}`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(data) }); } catch(e) {}
  }

  // ── DM SECTION - DO NOT MODIFY ─────────────────────────────────
  function filterDMsForUser(user) {
    if (!window.dmMsgs || !window.USERS || !user) return;
    const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== user);
    const myKeys = others.map(o => tk(user, o));
    Object.keys(window.dmMsgs).forEach(key => { if (!myKeys.includes(key)) delete window.dmMsgs[key]; });
  }
  function interceptLogin() {
    if (typeof window.chkPin !== 'function') return;
    const orig = window.chkPin;
    window.chkPin = function(pin, ...args) {
      const r = orig.call(this, pin, ...args);
      setTimeout(() => { const user = window.curUser; if (user) filterDMsForUser(user.toLowerCase()); }, 500);
      return r;
    };
  }
  function interceptSendDm() {
    if (typeof window.sendDm !== 'function') return;
    const orig = window.sendDm;
    window.sendDm = async function(...a) {
      const r = orig.apply(this, a);
      await new Promise(x => setTimeout(x, 200));
      const user = window.curUser; const other = window.activeDmUser;
      if (!user || !other || !window.dmMsgs) return r;
      const key = [user, other].sort().join('_');
      const msgs = window.dmMsgs[key] || [];
      const last = msgs[msgs.length - 1];
      if (last?.from && last?.text) await ins('comms_dm', { thread_key: key, author: last.from, message: last.text });
      return r;
    };
  }
  function watchAppReloadForDMs() {
    const origLog = console.log;
    console.log = function(...args) {
      origLog.apply(console, args);
      if (args[0] && String(args[0]).includes('cloud load successful')) {
        setTimeout(() => { const user = window.curUser; if (user) filterDMsForUser(user.toLowerCase()); }, 200);
      }
    };
  }
  // ── END DM SECTION ────────────────────────────────────────

  // ── GROUP CHAT SECTION - DO NOT MODIFY ──────────────────────
  function interceptSendGroupMsg() {
    if (typeof window.sendGroupMsg !== 'function') return;
    const orig = window.sendGroupMsg;
    window.sendGroupMsg = async function(...a) {
      const r = orig.apply(this, a);
      await new Promise(x => setTimeout(x, 200));
      const last = (window.groupMsgs || []).slice(-1)[0];
      if (last?.from && last?.text) await ins('comms_group', { author: last.from, message: last.text });
      return r;
    };
  }
  let lastGroupCount = 0;
  async function pollGroup() {
    try {
      const r = await fetch(`${U}/rest/v1/comms_group?select=*&order=created_at.asc`, { headers: H });
      if (!r.ok) return;
      const data = await r.json();
      if (!data.length || data.length === lastGroupCount) return;
      const fmt = d => new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
      window.groupMsgs = data.map(m => ({ from: m.author, text: m.message, time: fmt(m.created_at) }));
      lastGroupCount = data.length;
      if (typeof window.renderGroupThread === 'function') window.renderGroupThread();
    } catch(e) {}
  }
  // ── END GROUP CHAT SECTION ─────────────────────────────

  // ── HIDDEN TASK FIX ──────────────────────────────────────────
  // Bug: renderHiddenBoxFor does Object.keys(hiddenTasks).map(Number)
  // UUID task IDs like 'fdb79ffe-138d-...' become NaN when converted to Number
  // so myHidden is always empty and the box never shows
  // Fix: replace renderHiddenBoxFor with a version that uses string IDs
  function fixRenderHiddenBoxFor() {
    if (typeof window.renderHiddenBoxFor !== 'function') return;
    window.renderHiddenBoxFor = function(view) {
      var elId = view === 'owner' ? 'hidden-box-owner' : 'hidden-box-staff';
      var el = document.getElementById(elId);
      if (!el) return;

      // Use string IDs - do NOT call .map(Number) which breaks UUIDs
      var hiddenIds = Object.keys(window.hiddenTasks || {});
      var myHidden;
      if (window.curUser === 'latisha') {
        myHidden = hiddenIds.map(function(id) {
          return (window.tasks || []).find(function(t) { return t.id == id; });
        }).filter(Boolean);
      } else {
        myHidden = hiddenIds
          .filter(function(id) { return window.hiddenTasks[id] && (window.tasks || []).find(function(t) { return t.id == id && t.assignedTo === window.curUser; }); })
          .map(function(id) { return (window.tasks || []).find(function(t) { return t.id == id; }); })
          .filter(Boolean);
      }

      if (!myHidden.length) { el.style.display = 'none'; return; }
      el.style.display = 'block';

      var isOpen = !!window.hiddenBoxOpen[view];
      var html = '<div class="hidden-box-hd" onclick="toggleHiddenBox(\'' + view + '\')">' +
        '<span>' + myHidden.length + ' hidden task' + (myHidden.length !== 1 ? 's' : '') + '</span>' +
        '<span>' + (isOpen ? '▲' : '▼') + '</span>' +
        '</div>';

      if (isOpen) {
        html += '<div class="hidden-box-list">';
        myHidden.forEach(function(t) {
          var h = window.hiddenTasks[t.id];
          var canUnhide = window.curUser === 'latisha' || (h && h.by === window.curUser);
          html += '<div class="hb-row">' +
            '<div class="hb-main">' +
            '<div class="hb-title">' + t.title + '</div>' +
            '<div class="hb-meta">' +
            (h && h.completedDate ? '<span class="hb-date">🗓 ' + h.completedDate + '</span>' : '') +
            (window.curUser === 'latisha' && h && h.by ? '<span class="hb-who">by ' + h.by + '</span>' : '') +
            '<span class="hb-cat">' + (t.category || 'Admin') + '</span>' +
            (h && h.staffNotes ? '<div class="hb-notes">' + h.staffNotes + '</div>' : '') +
            '</div>' +
            '</div>' +
            (canUnhide ? '<button class="hb-restore" onclick="unhideTask(\'' + t.id + '\');event.stopPropagation()">Restore</button>' : '') +
            '</div>';
        });
        html += '</div>';
      }

      el.innerHTML = html;
      console.log('[comms-fix] renderHiddenBoxFor:', view, myHidden.length, 'hidden tasks shown');
    };
    console.log('[comms-fix] renderHiddenBoxFor patched - UUID fix applied');
  }

  // Also fix unhideTask to call saveData
  function fixUnhideTask() {
    if (typeof window.unhideTask !== 'function') return;
    const orig = window.unhideTask;
    window.unhideTask = function(taskId) {
      orig.call(this, taskId);
      if (typeof window.saveData === 'function') window.saveData();
    };
  }
  // ── END HIDDEN TASK FIX ───────────────────────────────────

  async function boot() {
    console.log('[comms-fix] v14.0 booting...');
    await new Promise(r => setTimeout(r, 2000));
    interceptLogin();
    interceptSendDm();
    watchAppReloadForDMs();
    if (window.curUser) filterDMsForUser(window.curUser.toLowerCase());
    interceptSendGroupMsg();
    await pollGroup();
    setInterval(pollGroup, 5000);
    fixRenderHiddenBoxFor();
    fixUnhideTask();
    console.log('[comms-fix] v14.0 active');
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 500);
})();