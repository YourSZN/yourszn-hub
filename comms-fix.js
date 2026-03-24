/**
 * comms-fix.js v11.0
 * DM: UNTOUCHED - working perfectly
 * Group chat fix: poll comms_group every 5s and update window.groupMsgs
 * so all profiles see new messages without waiting for app_state reload
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

  // ── DM SECTION - DO NOT MODIFY ─────────────────────────────────────
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
      setTimeout(() => {
        const user = window.curUser;
        if (user) filterDMsForUser(user.toLowerCase());
      }, 500);
      return r;
    };
  }

  function interceptSendDm() {
    if (typeof window.sendDm !== 'function') return;
    const orig = window.sendDm;
    window.sendDm = async function(...a) {
      const r = orig.apply(this, a);
      await new Promise(x => setTimeout(x, 200));
      const user = window.curUser;
      const other = window.activeDmUser;
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
        setTimeout(() => {
          const user = window.curUser;
          if (user) filterDMsForUser(user.toLowerCase());
        }, 200);
      }
    };
  }
  // ── END DM SECTION ─────────────────────────────────────────────────

  // ── GROUP CHAT SECTION ─────────────────────────────────────────────
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

  // Poll comms_group every 5s - update window.groupMsgs and re-render if new messages
  let lastGroupCount = 0;
  async function pollGroup() {
    try {
      const r = await fetch(`${U}/rest/v1/comms_group?select=*&order=created_at.asc`, { headers: H });
      if (!r.ok) return;
      const data = await r.json();
      if (!data.length || data.length === lastGroupCount) return;
      // New messages arrived - update groupMsgs
      const fmt = d => new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
      window.groupMsgs = data.map(m => ({ from: m.author, text: m.message, time: fmt(m.created_at) }));
      lastGroupCount = data.length;
      // Re-render group thread if it's currently visible
      if (typeof window.renderGroupThread === 'function') {
        window.renderGroupThread();
      }
      console.log('[comms-fix] Group updated:', data.length, 'messages');
    } catch(e) {}
  }
  // ── END GROUP CHAT SECTION ─────────────────────────────────────────

  async function boot() {
    console.log('[comms-fix] v11.0 booting...');
    await new Promise(r => setTimeout(r, 2000));
    // DM setup
    interceptLogin();
    interceptSendDm();
    watchAppReloadForDMs();
    if (window.curUser) filterDMsForUser(window.curUser.toLowerCase());
    // Group chat setup
    interceptSendGroupMsg();
    await pollGroup();
    setInterval(pollGroup, 5000);
    console.log('[comms-fix] v11.0 active');
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 500);
})();