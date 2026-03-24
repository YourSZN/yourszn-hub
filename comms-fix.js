/**
 * comms-fix.js v16.0
 * DM + Group chat: UNTOUCHED
 * Hidden task fix: patch renderHiddenBoxFor then immediately call renderHiddenBox
 * so existing hidden tasks show right away without needing to hide another one
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
  function fixRenderHiddenBoxFor() {
    if (typeof window.renderHiddenBoxFor !== 'function') return;
    window.renderHiddenBoxFor = function(view) {
      var elId = view === 'owner' ? 'hidden-box-owner' : 'hidden-box-staff';
      var el = document.getElementById(elId);
      if (!el) return;
      var hiddenIds = Object.keys(window.hiddenTasks || {});
      var myHidden;
      if (window.curUser === 'latisha') {
        myHidden = hiddenIds.map(function(id) {
          return (window.tasks || []).find(function(t) { return String(t.id) === String(id); });
        }).filter(Boolean);
      } else {
        myHidden = hiddenIds
          .filter(function(id) {
            if (!window.hiddenTasks[id]) return false;
            var t = (window.tasks || []).find(function(t) { return String(t.id) === String(id); });
            if (!t) return false;
            // Check BOTH assignedTo (camelCase) and assigned_to (snake_case)
            var assignee = t.assignedTo || t.assigned_to || '';
            return assignee === window.curUser;
          })
          .map(function(id) {
            return (window.tasks || []).find(function(t) { return String(t.id) === String(id); });
          })
          .filter(Boolean);
      }
      if (!myHidden.length) { el.style.display = 'none'; return; }
      el.style.display = 'block';
      var isOpen = !!window.hiddenBoxOpen[view];
      var html = '<div class="hidden-box-hd" onclick="toggleHiddenBox(\'' + view + '\')">' +
        '<span>👁 ' + myHidden.length + ' hidden task' + (myHidden.length !== 1 ? 's' : '') + '</span>' +
        '<span style="float:right">' + (isOpen ? '▲ collapse' : '▼ show') + '</span>' +
        '</div>';
      if (isOpen) {
        html += '<div class="hidden-box-list">';
        myHidden.forEach(function(t) {
          var h = window.hiddenTasks[String(t.id)];
          var canUnhide = window.curUser === 'latisha' || (h && h.by === window.curUser);
          html += '<div class="hb-row">' +
            '<div class="hb-main">' +
            '<div class="hb-title">' + (t.title || '') + '</div>' +
            '<div class="hb-meta">' +
            (h && h.completedDate ? '<span class="hb-date">🗓 ' + h.completedDate + '</span> ' : '') +
            (window.curUser === 'latisha' && h && h.by ? '<span class="hb-who">by ' + h.by + '</span> ' : '') +
            '<span class="hb-cat">' + (t.category || 'Admin') + '</span>' +
            (h && h.staffNotes ? '<div class="hb-notes">' + h.staffNotes + '</div>' : '') +
            '</div></div>' +
            (canUnhide ? '<button class="hb-restore" onclick="unhideTask(\'' + String(t.id) + '\');event.stopPropagation()">Restore</button>' : '') +
            '</div>';
        });
        html += '</div>';
      }
      el.innerHTML = html;
      console.log('[comms-fix] Hidden box:', view, myHidden.length, 'tasks for', window.curUser);
    };
    // Immediately re-render now that the fix is in place
    if (typeof window.renderHiddenBox === 'function') window.renderHiddenBox();
    console.log('[comms-fix] renderHiddenBoxFor patched + re-rendered');
  }

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
    console.log('[comms-fix] v16.0 booting...');
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
    console.log('[comms-fix] v16.0 active');
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 500);
})();