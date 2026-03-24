/**
 * comms-fix.js v12.0
 * DM: UNTOUCHED - working perfectly
 * Group chat: UNTOUCHED - working perfectly
 * New: Fix unhideTask to call saveData() so restored tasks persist
 * New: Fix new tasks showing immediately without requiring acknowledgement
 */
(function () {
  'use strict';
  const U = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  const K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };

  function tk(a, b) { return [a, b].sort().join('_'); }

  async function ins(table, data) {
    try { await fetch(`${U}/rest/v1/${table}`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(data) }); }
    catch(e) {}
  }

  // ── DM SECTION - DO NOT MODIFY ────────────────────────────────
  function filterDMsForUser(user) {
    if (!window.dmMsgs || !window.USERS || !user) return;
    const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== user);
    const myKeys = others.map(o => tk(user, o));
    Object.keys(window.dmMsgs).forEach(key => {
      if (!myKeys.includes(key)) delete window.dmMsgs[key];
    });
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
  // ── END DM SECTION ───────────────────────────────────────

  // ── GROUP CHAT SECTION - DO NOT MODIFY ─────────────────────────
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
  // ── END GROUP CHAT SECTION ─────────────────────────────────

  // ── TASK FIXES ──────────────────────────────────────────────

  // Fix 1: unhideTask doesn't call saveData() - so restored tasks don't persist
  function fixUnhideTask() {
    if (typeof window.unhideTask !== 'function') return;
    const orig = window.unhideTask;
    window.unhideTask = function(taskId) {
      orig.call(this, taskId);
      // saveData() was missing - add it so the restore persists to cloud
      if (typeof window.saveData === 'function') {
        window.saveData();
        console.log('[comms-fix] unhideTask: saveData called for', taskId);
      }
    };
  }

  // Fix 2: New tasks assigned to staff require banner acknowledgement before showing
  // The banner shows but staff need to click it - auto-mark as seen after 5s
  // so tasks appear without requiring the click
  function fixNewTaskNotification() {
    if (typeof window.renderNewTaskBanner !== 'function') return;
    const orig = window.renderNewTaskBanner;
    window.renderNewTaskBanner = function(...a) {
      const r = orig.apply(this, a);
      // Auto-dismiss after 5 seconds so tasks show without manual acknowledgement
      setTimeout(() => {
        const banner = document.getElementById('new-task-banner');
        if (banner && banner.style.display !== 'none') {
          if (typeof window.clearTaskBadge === 'function') {
            window.clearTaskBadge();
            console.log('[comms-fix] Auto-dismissed new task banner');
          }
        }
      }, 5000);
      return r;
    };
  }
  // ── END TASK FIXES ─────────────────────────────────────────────

  async function boot() {
    console.log('[comms-fix] v12.0 booting...');
    await new Promise(r => setTimeout(r, 2000));
    // DM
    interceptLogin();
    interceptSendDm();
    watchAppReloadForDMs();
    if (window.curUser) filterDMsForUser(window.curUser.toLowerCase());
    // Group
    interceptSendGroupMsg();
    await pollGroup();
    setInterval(pollGroup, 5000);
    // Tasks
    fixUnhideTask();
    fixNewTaskNotification();
    console.log('[comms-fix] v12.0 active');
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 500);
})();