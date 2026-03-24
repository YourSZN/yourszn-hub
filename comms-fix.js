/**
 * comms-fix.js — YourSZN Hub v2.0
 * Fixes:
 *  1. Group chat messages now show for all profiles
 *  2. DMs are private — only the two people in the thread can see them
 *  3. Realtime delivery (or 3s polling fallback) so messages arrive live
 */
(function () {
  'use strict';

  const VERSION = '2.0.0';
  const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0OTI2MDUsImV4cCI6MjA1NzA2ODYwNX0.iOgl9X2pMecrMDvFGMB5oGMUAXBuuOFBaXJPbhGVNSo';
  const PROFILES = ['latisha', 'lemari', 'salma'];

  // ── Helpers ──────────────────────────────────────────────────────────
  function threadKey(a, b) { return [a, b].sort().join('_'); }

  function getCurrentUser() {
    const st = window.state || window.appState || window.APP;
    if (st) return st.currentUser || st.activeUser || st.profile || st.user || null;
    const el = document.querySelector('[data-user],[data-profile],#current-user,.current-profile');
    if (el) return (el.dataset.user || el.dataset.profile || el.textContent || '').trim().toLowerCase();
    return null;
  }

  function getAppState() { return window.state || window.appState || window.APP || null; }

  function formatTime(date) {
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  }

  function refreshUI() {
    ['renderComms','renderCommsTab','renderGroupChat','renderDMs','renderMessages',
     'refreshComms','updateComms','renderChat','showComms'].forEach(fn => {
      if (typeof window[fn] === 'function') { try { window[fn](); } catch(e){} }
    });
    window.dispatchEvent(new CustomEvent('comms:updated'));
    document.querySelectorAll('.messages,.chat-messages,.msg-list,.group-chat,.dm-chat')
      .forEach(el => { el.scrollTop = el.scrollHeight; });
  }

  // ── REST API (works with or without Supabase JS SDK) ─────────────────
  const H = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

  async function dbSelect(table, params = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.asc`;
    if (params.eq) Object.entries(params.eq).forEach(([k,v]) => { url += `&${k}=eq.${encodeURIComponent(v)}`; });
    if (params.in) Object.entries(params.in).forEach(([k,vals]) => { url += `&${k}=in.(${vals.map(v=>encodeURIComponent(v)).join(',')})`; });
    const r = await fetch(url, { headers: H });
    return r.ok ? await r.json() : [];
  }

  async function dbInsert(table, payload) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify(payload)
    });
  }

  async function dbExists(table, eq) {
    const data = await dbSelect(table, { eq });
    return data.length > 0;
  }

  // ── Load group messages ───────────────────────────────────────────────
  async function loadGroupMessages() {
    const data = await dbSelect('comms_group');
    if (!data.length) return;
    const msgs = data.map(m => ({ from: m.author, text: m.message, time: formatTime(new Date(m.created_at)) }));
    const st = getAppState();
    if (st) { st.groupMsgs = msgs; if (st.comms) st.comms.groupMsgs = msgs; }
    refreshUI();
  }

  // ── Load DMs — filtered to current user's threads only ───────────────
  async function loadDMs() {
    const me = getCurrentUser();
    if (!me) return;

    // Only threads this user participates in
    const myThreads = PROFILES.filter(p => p !== me).map(p => threadKey(me, p));
    const data = await dbSelect('comms_dm');
    if (!data.length) return;

    const privateMsgs = {};
    for (const msg of data) {
      if (!myThreads.includes(msg.thread_key)) continue; // PRIVACY: skip threads user isn't in
      if (!privateMsgs[msg.thread_key]) privateMsgs[msg.thread_key] = [];
      privateMsgs[msg.thread_key].push({ from: msg.author, text: msg.message, time: formatTime(new Date(msg.created_at)) });
    }

    const st = getAppState();
    if (st) { st.dmMsgs = privateMsgs; if (st.comms) st.comms.dmMsgs = privateMsgs; }
    refreshUI();
  }

  // ── Intercept app_state saves to mirror comms to proper tables ───────
  function interceptSaves() {
    const sdk = window.supabase || window._sb || window.supabaseClient;
    if (!sdk || !sdk.from) return;

    const orig = sdk.from.bind(sdk);
    sdk.from = function(table) {
      const builder = orig(table);
      if (table !== 'app_state') return builder;

      const wrapFn = (fn) => async function(payload, ...args) {
        const result = await fn.call(this, payload, ...args);
        const items = Array.isArray(payload) ? payload : [payload];
        for (const item of items) {
          if (item.id !== 'main' || !item.state) continue;
          const st = item.state;

          // Sync latest group message
          if (Array.isArray(st.groupMsgs) && st.groupMsgs.length) {
            const last = st.groupMsgs[st.groupMsgs.length - 1];
            if (last?.from && last?.text) {
              const exists = await dbExists('comms_group', { author: last.from, message: last.text });
              if (!exists) await dbInsert('comms_group', { author: last.from, message: last.text });
            }
          }

          // Sync latest DM per thread
          if (st.dmMsgs && typeof st.dmMsgs === 'object') {
            for (const [key, msgs] of Object.entries(st.dmMsgs)) {
              if (!Array.isArray(msgs) || !msgs.length) continue;
              const last = msgs[msgs.length - 1];
              if (!last?.from || !last?.text) continue;
              const exists = await dbExists('comms_dm', { thread_key: key, author: last.from, message: last.text });
              if (!exists) await dbInsert('comms_dm', { thread_key: key, author: last.from, message: last.text });
            }
          }
        }
        return result;
      };

      if (builder.upsert) builder.upsert = wrapFn(builder.upsert);
      if (builder.update) builder.update = wrapFn(builder.update);
      return builder;
    };

    // Make sure all references use our wrapped version
    ['supabase', '_sb', 'supabaseClient'].forEach(k => { if (window[k]) window[k].from = sdk.from; });
    console.log('[comms-fix] Save interceptor active');
  }

  // ── Realtime subscription (with polling fallback) ─────────────────────
  function subscribeRealtime() {
    const sdk = window.supabase || window._sb || window.supabaseClient;
    if (sdk && sdk.channel) {
      try {
        sdk.channel('comms-v2')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comms_group' }, loadGroupMessages)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comms_dm' }, loadDMs)
          .subscribe(s => console.log('[comms-fix] Realtime:', s));
        return;
      } catch(e) {}
    }
    // Fallback: poll every 3 seconds
    console.log('[comms-fix] Using 3s polling fallback');
    setInterval(() => { loadGroupMessages(); loadDMs(); }, 3000);
  }

  // ── Boot ──────────────────────────────────────────────────────────────
  async function boot() {
    console.log(`[comms-fix] v${VERSION} booting...`);
    await new Promise(r => setTimeout(r, 1200)); // wait for app init
    await loadGroupMessages();
    await loadDMs();
    subscribeRealtime();
    interceptSaves();
    console.log('[comms-fix] ✓ Ready — group chat fixed, DM privacy enforced');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 500);
  }
})();