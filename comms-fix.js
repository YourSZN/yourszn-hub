/**
 * comms-fix.js v9.0
 * DO NOT TOUCH GROUP CHAT - it works via DB trigger.
 * DM fix only:
 *  - Save DMs to comms_dm table on send
 *  - On login: filter dmMsgs to only show current user's threads
 *  - Poll comms_dm every 5s for new messages, append only (never replace whole object)
 *  - Never interrupt the app during polling
 */
(function () {
  'use strict';
  const U = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  const K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };
  let me = null;
  let dmPollActive = false;

  function tk(a, b) { return [a, b].sort().join('_'); }
  function fmt(d) { return new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase(); }

  async function ins(table, data) {
    try { await fetch(`${U}/rest/v1/${table}`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(data) }); }
    catch(e) {}
  }

  async function getDMs() {
    try {
      const r = await fetch(`${U}/rest/v1/comms_dm?select=*&order=created_at.asc`, { headers: H });
      return r.ok ? r.json() : [];
    } catch(e) { return []; }
  }

  // Filter window.dmMsgs to only show threads current user is part of
  // Called ONCE after login, never during active DM use
  function filterDMs(user) {
    if (!window.dmMsgs || !window.USERS) return;
    const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== user);
    const myKeys = others.map(o => tk(user, o));
    const filtered = {};
    for (const key of myKeys) {
      if (window.dmMsgs[key]) filtered[key] = window.dmMsgs[key];
    }
    window.dmMsgs = filtered;
    console.log('[comms-fix] DMs filtered for', user, ':', Object.keys(filtered));
  }

  // Intercept chkPin - capture user and filter DMs immediately after login
  function interceptLogin() {
    if (typeof window.chkPin !== 'function') return;
    const orig = window.chkPin;
    window.chkPin = function(pin, ...args) {
      const r = orig.call(this, pin, ...args);
      if (window.USERS) {
        const found = Object.entries(window.USERS).find(([k,v]) => String(v.pin) === String(pin));
        if (found) {
          me = found[0].toLowerCase();
          console.log('[comms-fix] Logged in:', me);
          // Wait for app to finish login render, then filter DMs
          setTimeout(() => { filterDMs(me); startDMPoll(); }, 800);
        }
      }
      return r;
    };
  }

  // Intercept sendDm to save to DB
  function interceptSendDm() {
    if (typeof window.sendDm !== 'function') return;
    const orig = window.sendDm;
    window.sendDm = async function(...a) {
      const r = orig.apply(this, a);
      await new Promise(x => setTimeout(x, 200));
      if (!me || !window.dmMsgs || !window.USERS) return r;
      const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== me);
      for (const o of others) {
        const key = tk(me, o);
        const msgs = window.dmMsgs[key] || [];
        const last = msgs[msgs.length - 1];
        if (last?.from && last?.text) {
          await ins('comms_dm', { thread_key: key, author: last.from, message: last.text });
          console.log('[comms-fix] DM saved:', key, last.text);
          break;
        }
      }
      return r;
    };
  }

  // Poll for new DMs - ONLY append new messages, never replace whole dmMsgs
  let dmCounts = {};
  async function pollDMs() {
    if (!me || !window.USERS) return;
    const data = await getDMs();
    if (!data.length) return;

    const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== me);
    const myKeys = others.map(o => tk(me, o));

    for (const key of myKeys) {
      const msgs = data.filter(m => m.thread_key === key);
      const prev = dmCounts[key] || 0;
      if (msgs.length > prev) {
        // Only update this specific thread, never touch others
        if (!window.dmMsgs) window.dmMsgs = {};
        window.dmMsgs[key] = msgs.map(m => ({ from: m.author, text: m.message, time: fmt(m.created_at) }));
        dmCounts[key] = msgs.length;
        console.log('[comms-fix] DM thread updated:', key, msgs.length, 'msgs');
      }
    }

    // Remove any threads user shouldn't see (privacy)
    if (window.dmMsgs) {
      for (const key of Object.keys(window.dmMsgs)) {
        if (!myKeys.includes(key)) {
          delete window.dmMsgs[key];
        }
      }
    }
  }

  let pollInterval = null;
  function startDMPoll() {
    if (dmPollActive) return;
    dmPollActive = true;
    pollInterval = setInterval(pollDMs, 5000);
    pollDMs(); // run immediately
  }

  async function boot() {
    console.log('[comms-fix] v9.0 booting...');
    await new Promise(r => setTimeout(r, 2000));
    interceptLogin();
    interceptSendDm();
    console.log('[comms-fix] v9.0 active - waiting for login to start DM poll');
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 500);
})();