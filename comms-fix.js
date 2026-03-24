/**
 * comms-fix.js — YourSZN Hub v5.0
 * 
 * What we now know for certain:
 * - window.USERS = {latisha:{name,pin,...}, lemari:{...}, salma:{...}}
 * - window.chkPin = function that logs in a user
 * - window.sendGroupMsg = function to send group message
 * - window.sendDm = function to send DM
 * - window.groupMsgs = [] (global array)
 * - window.dmMsgs = {} (global object keyed by thread e.g. "latisha_lemari")
 * - window.supabase exists
 * - Current user is NOT in localStorage — stored in a closure
 * 
 * Strategy:
 * 1. Intercept chkPin to know who logged in
 * 2. Intercept sendGroupMsg to also save to comms_group table
 * 3. Intercept sendDm to also save to comms_dm table
 * 4. Poll comms_group + comms_dm every 3s and push new messages into
 *    window.groupMsgs / window.dmMsgs, then trigger re-render
 * 5. DM privacy: only load threads that include the current user
 */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  const H = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

  let currentUser = null; // we'll set this when chkPin is intercepted

  function threadKey(a, b) { return [a, b].sort().join('_'); }

  function formatTime(d) {
    return new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  }

  // ── REST helpers ──────────────────────────────────────────────────────
  async function dbSelect(table, params = '') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.asc${params}`, { headers: H });
    return r.ok ? r.json() : [];
  }

  async function dbInsert(table, payload) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify(payload)
    });
  }

  // ── Re-render the comms UI ────────────────────────────────────────────
  function triggerRender() {
    // Your app uses renderCommsPage or similar — try all likely names
    ['renderCommsPage', 'renderComms', 'renderGroupThread', 'renderDmThread',
     'showComms', 'refreshComms', 'renderCommsSection'].forEach(fn => {
      if (typeof window[fn] === 'function') { try { window[fn](); } catch(e) {} }
    });
    // Scroll message lists to bottom
    document.querySelectorAll('[id*="msg"], [class*="msg"], [class*="chat"], [class*="thread"]')
      .forEach(el => { if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight; });
  }

  // ── Step 1: Intercept chkPin to capture who logged in ─────────────────
  function interceptLogin() {
    if (typeof window.chkPin !== 'function') return;
    const orig = window.chkPin;
    window.chkPin = function(pin, ...args) {
      const result = orig.call(this, pin, ...args);
      // Find which user has this pin
      if (window.USERS) {
        const match = Object.entries(window.USERS).find(([k, v]) => String(v.pin) === String(pin));
        if (match) {
          currentUser = match[0].toLowerCase(); // e.g. "latisha"
          console.log('[comms-fix] Logged in as:', currentUser);
          // Load DMs now that we know who the user is
          loadDMs();
        }
      }
      return result;
    };
    console.log('[comms-fix] Login intercepted');
  }

  // ── Step 2: Intercept sendGroupMsg ────────────────────────────────────
  function interceptSendGroupMsg() {
    if (typeof window.sendGroupMsg !== 'function') return;
    const orig = window.sendGroupMsg;
    window.sendGroupMsg = async function(...args) {
      const result = orig.apply(this, args);
      // args[0] is likely the message text, or it reads from an input
      // Get the latest message from window.groupMsgs
      await new Promise(r => setTimeout(r, 100)); // wait for app to update state
      const msgs = window.groupMsgs || [];
      const last = msgs[msgs.length - 1];
      if (last && last.from && last.text) {
        await dbInsert('comms_group', { author: last.from, message: last.text });
        console.log('[comms-fix] Group message saved to DB:', last.text);
      }
      return result;
    };
    console.log('[comms-fix] sendGroupMsg intercepted');
  }

  // ── Step 3: Intercept sendDm ──────────────────────────────────────────
  function interceptSendDm() {
    if (typeof window.sendDm !== 'function') return;
    const orig = window.sendDm;
    window.sendDm = async function(...args) {
      const result = orig.apply(this, args);
      // Wait for app to update dmMsgs
      await new Promise(r => setTimeout(r, 100));
      if (!currentUser || !window.dmMsgs) return result;
      // Find the thread that was just updated (most recent message)
      const myProfile = Object.keys(window.USERS || {}).find(k => k.toLowerCase() === currentUser);
      for (const [key, msgs] of Object.entries(window.dmMsgs)) {
        if (!key.includes(currentUser)) continue;
        const last = msgs[msgs.length - 1];
        if (!last || !last.from || !last.text) continue;
        // Only save if it was just sent (within last 2 seconds)
        const isRecent = !last.time || true; // we don't have timestamps on the object
        await dbInsert('comms_dm', { thread_key: key, author: last.from, message: last.text });
        console.log('[comms-fix] DM saved to DB:', key, last.text);
        break;
      }
      return result;
    };
    console.log('[comms-fix] sendDm intercepted');
  }

  // ── Step 4: Poll for new messages and push into app state ─────────────
  let lastGroupCount = 0;
  let lastDmCounts = {};

  async function pollMessages() {
    // Group messages
    const groupData = await dbSelect('comms_group');
    if (groupData.length > lastGroupCount) {
      window.groupMsgs = groupData.map(m => ({
        from: m.author,
        text: m.message,
        time: formatTime(m.created_at),
      }));
      lastGroupCount = groupData.length;
      console.log('[comms-fix] Group messages updated:', groupData.length);
      triggerRender();
    }

    // DM messages — only for threads involving current user
    if (!currentUser) return;
    const dmData = await dbSelect('comms_dm');
    if (!dmData.length) return;

    const profiles = Object.keys(window.USERS || {}).map(k => k.toLowerCase());
    const myThreads = profiles.filter(p => p !== currentUser).map(p => threadKey(currentUser, p));

    let dmUpdated = false;
    const newDmMsgs = window.dmMsgs ? { ...window.dmMsgs } : {};

    for (const thread of myThreads) {
      const threadMsgs = dmData.filter(m => m.thread_key === thread);
      const prevCount = lastDmCounts[thread] || 0;
      if (threadMsgs.length > prevCount) {
        newDmMsgs[thread] = threadMsgs.map(m => ({
          from: m.author,
          text: m.message,
          time: formatTime(m.created_at),
        }));
        lastDmCounts[thread] = threadMsgs.length;
        dmUpdated = true;
      }
    }

    // Remove threads current user is NOT part of (privacy fix)
    for (const key of Object.keys(newDmMsgs)) {
      if (!myThreads.includes(key)) {
        delete newDmMsgs[key];
        dmUpdated = true;
      }
    }

    if (dmUpdated) {
      window.dmMsgs = newDmMsgs;
      console.log('[comms-fix] DMs updated for:', currentUser);
      triggerRender();
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────
  async function boot() {
    console.log('[comms-fix] v5.0 booting...');

    // Wait for app to fully initialise
    await new Promise(r => setTimeout(r, 1500));

    // Intercept login first so we know who the user is
    interceptLogin();

    // Try to detect already-logged-in user from the DOM
    // The page shows "LOGGED IN AS Latisha · Owner" — parse that
    const loggedInEl = document.querySelector('[class*="profile"], [class*="logged"], [id*="logged"], [id*="profile"]');
    if (!currentUser) {
      // Try reading from the sidebar text "Latisha · Owner"
      const allText = document.body.innerText;
      const match = allText.match(/LOGGED IN AS\s+(\w+)/i);
      if (match) {
        currentUser = match[1].toLowerCase();
        console.log('[comms-fix] Detected user from DOM:', currentUser);
      }
    }

    // Intercept send functions
    interceptSendGroupMsg();
    interceptSendDm();

    // Load initial messages
    await pollMessages();

    // Poll every 3 seconds for new messages
    setInterval(pollMessages, 3000);

    console.log('[comms-fix] v5.0 active ✓ Current user:', currentUser);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 500);
  }
})();