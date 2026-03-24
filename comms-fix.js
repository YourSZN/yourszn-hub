/**
 * comms-fix.js v8.0 - minimal safe version
 * - No DOM walking (was crashing app)
 * - No Supabase SDK wrapping
 * - Captures user via chkPin intercept only
 * - Polls DB every 4s to update groupMsgs and filtered dmMsgs
 */
(function () {
  'use strict';
  const U = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  const K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };
  let me = null;

  function tk(a, b) { return [a, b].sort().join('_'); }
  function fmt(d) { return new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase(); }

  async function get(table) {
    try {
      const r = await fetch(`${U}/rest/v1/${table}?select=*&order=created_at.asc`, { headers: H });
      return r.ok ? r.json() : [];
    } catch(e) { return []; }
  }

  async function ins(table, data) {
    try { await fetch(`${U}/rest/v1/${table}`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(data) }); }
    catch(e) {}
  }

  // Capture user when they enter PIN - this is safe and reliable
  function interceptLogin() {
    if (typeof window.chkPin !== 'function') return;
    const orig = window.chkPin;
    window.chkPin = function(pin, ...args) {
      const r = orig.call(this, pin, ...args);
      if (window.USERS) {
        const found = Object.entries(window.USERS).find(([k,v]) => String(v.pin) === String(pin));
        if (found) { me = found[0].toLowerCase(); console.log('[comms-fix] User:', me); }
      }
      return r;
    };
  }

  // Save group message to DB after sendGroupMsg fires
  function interceptGroup() {
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

  // Save DM to DB after sendDm fires
  function interceptDm() {
    if (typeof window.sendDm !== 'function') return;
    const orig = window.sendDm;
    window.sendDm = async function(...a) {
      const r = orig.apply(this, a);
      await new Promise(x => setTimeout(x, 200));
      if (!me || !window.dmMsgs || !window.USERS) return r;
      const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== me);
      for (const o of others) {
        const key = tk(me, o);
        const last = (window.dmMsgs[key] || []).slice(-1)[0];
        if (last?.from && last?.text) { await ins('comms_dm', { thread_key: key, author: last.from, message: last.text }); break; }
      }
      return r;
    };
  }

  // Poll DB and update app state - only touches groupMsgs and dmMsgs, nothing else
  let lastG = 0, lastD = {};
  async function poll() {
    // Always update groupMsgs from DB (app_state trigger keeps DB in sync)
    const gData = await get('comms_group');
    if (gData.length !== lastG) {
      window.groupMsgs = gData.map(m => ({ from: m.author, text: m.message, time: fmt(m.created_at) }));
      lastG = gData.length;
    }

    // Only update DMs if we know who the user is
    if (!me || !window.USERS) return;
    const dData = await get('comms_dm');
    const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== me);
    const myKeys = others.map(o => tk(me, o));
    let changed = false;
    const newDms = {};
    for (const key of myKeys) {
      const msgs = dData.filter(m => m.thread_key === key);
      newDms[key] = msgs.map(m => ({ from: m.author, text: m.message, time: fmt(m.created_at) }));
      if (msgs.length !== (lastD[key] || 0)) { lastD[key] = msgs.length; changed = true; }
    }
    // Only replace dmMsgs with privacy-filtered version when we have the user
    if (changed || Object.keys(window.dmMsgs || {}).some(k => !myKeys.includes(k))) {
      window.dmMsgs = newDms;
    }
  }

  async function boot() {
    console.log('[comms-fix] v8.0 booting...');
    await new Promise(r => setTimeout(r, 2000));
    interceptLogin();
    interceptGroup();
    interceptDm();
    await poll();
    setInterval(poll, 4000);
    console.log('[comms-fix] v8.0 active');
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 500);
})();