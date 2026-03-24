/**
 * comms-fix.js v10.0
 * Now using confirmed variable names: curUser, activeDmUser, dmMsgs
 * Group chat: handled by DB trigger (do not touch)
 * DM: 
 *   1. Save to comms_dm on send (DB trigger writes back to app_state)
 *   2. Filter dmMsgs after app loads to hide threads curUser is not in
 *   3. Use curUser directly - no guessing
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

  // Filter dmMsgs so curUser only sees their own threads
  function filterDMsForUser(user) {
    if (!window.dmMsgs || !window.USERS || !user) return;
    const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== user);
    const myKeys = others.map(o => tk(user, o));
    // Remove any thread keys that don't involve this user
    Object.keys(window.dmMsgs).forEach(key => {
      if (!myKeys.includes(key)) {
        delete window.dmMsgs[key];
        console.log('[comms-fix] Removed private thread from view:', key);
      }
    });
  }

  // Intercept chkPin to capture user and immediately filter DMs
  function interceptLogin() {
    if (typeof window.chkPin !== 'function') return;
    const orig = window.chkPin;
    window.chkPin = function(pin, ...args) {
      const r = orig.call(this, pin, ...args);
      // curUser is set by the app after chkPin succeeds
      setTimeout(() => {
        const user = window.curUser;
        if (user) {
          filterDMsForUser(user.toLowerCase());
          console.log('[comms-fix] DMs filtered for:', user);
        }
      }, 500);
      return r;
    };
  }

  // Intercept sendDm to also save to comms_dm table
  // DB trigger will write back to app_state so other users see it on next load
  function interceptSendDm() {
    if (typeof window.sendDm !== 'function') return;
    const orig = window.sendDm;
    window.sendDm = async function(...a) {
      const r = orig.apply(this, a);
      // Wait for app to update dmMsgs
      await new Promise(x => setTimeout(x, 200));
      const user = window.curUser;
      const other = window.activeDmUser;
      if (!user || !other || !window.dmMsgs) return r;
      const key = [user, other].sort().join('_');
      const msgs = window.dmMsgs[key] || [];
      const last = msgs[msgs.length - 1];
      if (last?.from && last?.text) {
        await ins('comms_dm', { thread_key: key, author: last.from, message: last.text });
        console.log('[comms-fix] DM saved to DB:', key, last.text);
      }
      return r;
    };
  }

  // Watch for app state reloads and re-filter DMs each time
  // The app reloads from cloud every ~30s - we need to re-filter after each reload
  function watchAppReload() {
    // The app logs 'YourSZN: cloud load successful' - intercept console to detect it
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

  async function boot() {
    console.log('[comms-fix] v10.0 booting...');
    await new Promise(r => setTimeout(r, 2000));
    interceptLogin();
    interceptSendDm();
    watchAppReload();
    // Filter immediately in case already logged in
    if (window.curUser) filterDMsForUser(window.curUser.toLowerCase());
    console.log('[comms-fix] v10.0 active, curUser:', window.curUser);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 500);
})();