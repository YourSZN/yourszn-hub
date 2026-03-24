/**
 * comms-fix.js — YourSZN Hub v4.0
 * Fixed: correct Supabase anon key (was 401 Unauthorized before)
 * - Loads group messages from comms_group table for all profiles
 * - Loads DMs filtered by current user (privacy fix)
 * - Realtime live updates with 3s polling fallback
 */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  const PROFILES = ['latisha', 'lemari', 'salma'];

  const H = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };

  function threadKey(a, b) { return [a, b].sort().join('_'); }

  function getCurrentUser() {
    const st = window.state || window.appState || window.APP;
    if (st) {
      const u = st.currentUser || st.activeUser || st.profile || st.user || st.loggedInUser || st.activeProfile;
      if (u) return String(u).toLowerCase().trim();
    }
    try {
      const stored = localStorage.getItem('currentUser') || localStorage.getItem('profile')
        || localStorage.getItem('user') || localStorage.getItem('activeProfile');
      if (stored) return stored.toLowerCase().trim();
    } catch(e) {}
    // Try reading from the page — "LOGGED IN AS Latisha"
    const el = document.querySelector('.profile-name, [class*="logged-in"], [class*="current-user"]');
    if (el) return el.textContent.trim().toLowerCase().split(/[\s·]/)[0];
    return null;
  }

  function getAppState() { return window.state || window.appState || window.APP || null; }

  function formatTime(d) {
    return new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  }

  function refreshUI() {
    ['renderComms','renderCommsTab','renderGroupChat','renderDMs','renderMessages',
     'refreshComms','updateComms','renderChat','showComms','renderSection',
     'drawCommsSection','renderCommsSection'].forEach(fn => {
      if (typeof window[fn] === 'function') { try { window[fn](); } catch(e) {} }
    });
    window.dispatchEvent(new CustomEvent('comms:updated'));
    document.querySelectorAll('.messages,.chat-messages,.msg-list,.group-chat,.dm-chat,[id*="group-msg"],[id*="dm-msg"]')
      .forEach(el => { el.scrollTop = el.scrollHeight; });
  }

  async function fetchRows(table, extraParams = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.asc${extraParams}`;
    try {
      const r = await fetch(url, { headers: H });
      if (!r.ok) { console.warn(`[comms-fix] ${table} fetch failed:`, r.status, r.statusText); return []; }
      return await r.json();
    } catch(e) { console.warn('[comms-fix] fetch error:', e); return []; }
  }

  async function loadGroupMessages() {
    const data = await fetchRows('comms_group');
    if (!data.length) return false;
    const msgs = data.map(m => ({ from: m.author, text: m.message, time: formatTime(m.created_at) }));
    const st = getAppState();
    if (st) { st.groupMsgs = msgs; if (st.comms) st.comms.groupMsgs = msgs; }
    console.log(`[comms-fix] Loaded ${msgs.length} group messages`);
    return true;
  }

  async function loadDMs() {
    const me = getCurrentUser();
    console.log('[comms-fix] Current user:', me);
    if (!me) return false;

    const myThreadKeys = PROFILES.filter(p => p !== me).map(p => threadKey(me, p));
    const data = await fetchRows('comms_dm');
    if (!data.length) return false;

    const dmMsgs = {};
    for (const msg of data) {
      if (!myThreadKeys.includes(msg.thread_key)) continue;
      if (!dmMsgs[msg.thread_key]) dmMsgs[msg.thread_key] = [];
      dmMsgs[msg.thread_key].push({ from: msg.author, text: msg.message, time: formatTime(msg.created_at) });
    }

    const st = getAppState();
    if (st) { st.dmMsgs = dmMsgs; if (st.comms) st.comms.dmMsgs = dmMsgs; }
    console.log('[comms-fix] Loaded DMs for threads:', Object.keys(dmMsgs));
    return true;
  }

  function subscribeRealtime() {
    const sdk = window.supabase || window._sb || window.supabaseClient;
    if (sdk && typeof sdk.channel === 'function') {
      try {
        sdk.channel('comms-v4')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comms_group' }, async () => {
            await loadGroupMessages(); refreshUI();
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comms_dm' }, async () => {
            await loadDMs(); refreshUI();
          })
          .subscribe(s => console.log('[comms-fix] Realtime status:', s));
        console.log('[comms-fix] Realtime subscribed');
        return;
      } catch(e) { console.warn('[comms-fix] Realtime failed, using polling:', e); }
    }
    console.log('[comms-fix] Polling every 3s');
    setInterval(async () => {
      await loadGroupMessages();
      await loadDMs();
      refreshUI();
    }, 3000);
  }

  async function boot() {
    console.log('[comms-fix] v4.0 starting...');
    await new Promise(r => setTimeout(r, 1500));
    await loadGroupMessages();
    await loadDMs();
    refreshUI();
    subscribeRealtime();
    console.log('[comms-fix] v4.0 active ✓');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 500);
  }
})();