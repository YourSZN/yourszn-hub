/**
 * comms-fix.js — YourSZN Hub v3.0
 * Database trigger now handles syncing messages to comms_group + comms_dm.
 * This script handles: loading messages on open + Realtime live delivery + DM privacy.
 */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0OTI2MDUsImV4cCI6MjA1NzA2ODYwNX0.iOgl9X2pMecrMDvFGMB5oGMUAXBuuOFBaXJPbhGVNSo';
  const PROFILES = ['latisha', 'lemari', 'salma'];

  const H = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };

  function threadKey(a, b) { return [a, b].sort().join('_'); }

  function getCurrentUser() {
    // Try every common pattern for storing the logged-in profile
    const st = window.state || window.appState || window.APP;
    if (st) {
      const u = st.currentUser || st.activeUser || st.profile || st.user || st.loggedInUser || st.activeProfile;
      if (u) return String(u).toLowerCase().trim();
    }
    // Check localStorage
    try {
      const stored = localStorage.getItem('currentUser') || localStorage.getItem('profile') || localStorage.getItem('user') || localStorage.getItem('activeProfile');
      if (stored) return stored.toLowerCase().trim();
    } catch(e) {}
    return null;
  }

  function getAppState() {
    return window.state || window.appState || window.APP || null;
  }

  function formatTime(d) {
    return new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  }

  function refreshUI() {
    // Try all possible render function names
    ['renderComms','renderCommsTab','renderGroupChat','renderDMs','renderMessages',
     'refreshComms','updateComms','renderChat','showComms','renderSection',
     'drawCommsSection','renderCommsSection'].forEach(fn => {
      if (typeof window[fn] === 'function') { try { window[fn](); } catch(e) {} }
    });
    window.dispatchEvent(new CustomEvent('comms:updated'));
    // Scroll message containers to bottom
    document.querySelectorAll('.messages,.chat-messages,.msg-list,.group-chat,.dm-chat,[id*="group-msg"],[id*="dm-msg"]')
      .forEach(el => { el.scrollTop = el.scrollHeight; });
  }

  // ── REST fetch helpers ────────────────────────────────────────────────
  async function fetchRows(table, extraParams = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.asc${extraParams}`;
    try {
      const r = await fetch(url, { headers: H });
      return r.ok ? await r.json() : [];
    } catch(e) { return []; }
  }

  // ── Load group messages into app state ───────────────────────────────
  async function loadGroupMessages() {
    const data = await fetchRows('comms_group');
    if (!data.length) return false;

    const msgs = data.map(m => ({
      from: m.author,
      text: m.message,
      time: formatTime(m.created_at),
    }));

    const st = getAppState();
    if (st) {
      st.groupMsgs = msgs;
      if (st.comms) st.comms.groupMsgs = msgs;
    }
    return true;
  }

  // ── Load DMs — only threads the current user is in ───────────────────
  async function loadDMs() {
    const me = getCurrentUser();
    if (!me) return false;

    const myThreadKeys = PROFILES.filter(p => p !== me).map(p => threadKey(me, p));
    const data = await fetchRows('comms_dm');
    if (!data.length) return false;

    // Build filtered dmMsgs object — only this user's threads
    const dmMsgs = {};
    for (const msg of data) {
      if (!myThreadKeys.includes(msg.thread_key)) continue; // Privacy: skip other threads
      if (!dmMsgs[msg.thread_key]) dmMsgs[msg.thread_key] = [];
      dmMsgs[msg.thread_key].push({
        from: msg.author,
        text: msg.message,
        time: formatTime(msg.created_at),
      });
    }

    const st = getAppState();
    if (st) {
      st.dmMsgs = dmMsgs;
      if (st.comms) st.comms.dmMsgs = dmMsgs;
    }
    return true;
  }

  // ── Realtime subscription ─────────────────────────────────────────────
  function subscribeRealtime() {
    const sdk = window.supabase || window._sb || window.supabaseClient;

    if (sdk && typeof sdk.channel === 'function') {
      try {
        sdk.channel('comms-v3')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comms_group' }, async () => {
            await loadGroupMessages();
            refreshUI();
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comms_dm' }, async () => {
            await loadDMs();
            refreshUI();
          })
          .subscribe(s => console.log('[comms-fix] Realtime:', s));
        console.log('[comms-fix] Realtime subscribed via SDK');
        return;
      } catch(e) {
        console.warn('[comms-fix] Realtime SDK error, falling back to polling:', e);
      }
    }

    // Polling fallback every 3 seconds
    console.log('[comms-fix] Using 3s polling');
    setInterval(async () => {
      const gUpdated = await loadGroupMessages();
      const dUpdated = await loadDMs();
      if (gUpdated || dUpdated) refreshUI();
    }, 3000);
  }

  // ── Boot ──────────────────────────────────────────────────────────────
  async function boot() {
    console.log('[comms-fix] v3.0 starting...');

    // Wait for app to initialise (it saves state on load)
    await new Promise(r => setTimeout(r, 1500));

    // Initial load
    const gOk = await loadGroupMessages();
    const dOk = await loadDMs();

    if (gOk || dOk) {
      refreshUI();
      console.log('[comms-fix] Initial messages loaded');
    } else {
      console.log('[comms-fix] No messages in DB yet — waiting for first send');
    }

    // Subscribe for live updates
    subscribeRealtime();

    console.log('[comms-fix] v3.0 active ✓');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 500);
  }
})();