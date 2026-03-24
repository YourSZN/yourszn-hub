/**
 * comms-fix.js v7.0
 * Root fix: intercept the app's cloud load to (1) inject group msgs and (2) strip private DMs
 */
(function () {
  'use strict';
  const SURL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  const H = { apikey: SKEY, Authorization: `Bearer ${SKEY}`, 'Content-Type': 'application/json' };

  function tk(a, b) { return [a, b].sort().join('_'); }
  function fmt(d) { return new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase(); }

  // Get current user - check PIN interceptor result first, then DOM
  let _me = null;
  function getMe() {
    if (_me) return _me;
    // Walk DOM looking for exact profile name text node
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      const t = (node.textContent || '').trim();
      if (/^(latisha|lemari|salma)$/i.test(t)) {
        _me = t.toLowerCase();
        return _me;
      }
    }
    return null;
  }

  async function fetchGroup() {
    const r = await fetch(`${SURL}/rest/v1/comms_group?select=*&order=created_at.asc`, { headers: H });
    return r.ok ? r.json() : [];
  }

  async function fetchDMs() {
    const r = await fetch(`${SURL}/rest/v1/comms_dm?select=*&order=created_at.asc`, { headers: H });
    return r.ok ? r.json() : [];
  }

  async function ins(table, data) {
    await fetch(`${SURL}/rest/v1/${table}`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(data) });
  }

  // Patch the app state after every cloud load
  async function patchAppState() {
    const me = getMe();

    // 1. Fetch group messages from DB and set on window
    const groupData = await fetchGroup();
    if (groupData.length) {
      window.groupMsgs = groupData.map(m => ({ from: m.author, text: m.message, time: fmt(m.created_at) }));
    }

    // 2. Fetch DMs and filter to only current user's threads
    if (me && window.USERS) {
      const dmData = await fetchDMs();
      const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== me);
      const myKeys = others.map(o => tk(me, o));
      const filtered = {};
      for (const key of myKeys) {
        const msgs = dmData.filter(m => m.thread_key === key);
        if (msgs.length) {
          filtered[key] = msgs.map(m => ({ from: m.author, text: m.message, time: fmt(m.created_at) }));
        } else if (window.dmMsgs?.[key]) {
          filtered[key] = window.dmMsgs[key];
        }
      }
      window.dmMsgs = filtered;
      console.log('[comms-fix] DMs filtered for:', me, Object.keys(filtered));
    }

    // 3. Trigger re-render
    ['renderCommsPage','renderComms','renderGroupThread','renderDmThread','showComms','refreshComms'].forEach(fn => {
      if (typeof window[fn] === 'function') { try { window[fn](); } catch(e) {} }
    });
    window.dispatchEvent(new CustomEvent('comms:updated'));
  }

  // Intercept the Supabase client's .from() to catch app_state loads
  function interceptSupabaseLoad() {
    const sdk = window.supabase || window._sb || window.supabaseClient;
    if (!sdk || !sdk.from) { console.warn('[comms-fix] No supabase SDK found'); return; }

    const origFrom = sdk.from.bind(sdk);
    sdk.from = function(table) {
      const builder = origFrom(table);
      if (table !== 'app_state') return builder;

      // Wrap .select() to intercept when app loads state from cloud
      const origSelect = builder.select?.bind(builder);
      if (origSelect) {
        builder.select = function(...args) {
          const q = origSelect(...args);
          // Wrap .eq() chain
          const origEq = q.eq?.bind(q);
          if (origEq) {
            q.eq = function(...eqArgs) {
              const result = origEq(...eqArgs);
              // Wrap .single() or final .then()
              const origThen = result.then?.bind(result);
              if (origThen) {
                result.then = function(resolve, reject) {
                  return origThen(async (data) => {
                    // App just loaded from cloud - patch it
                    setTimeout(() => patchAppState(), 100);
                    if (resolve) return resolve(data);
                  }, reject);
                };
              }
              return result;
            };
          }
          return q;
        };
      }
      return builder;
    };

    // Update all references
    if (window.supabase) window.supabase.from = sdk.from;
    if (window._sb) window._sb.from = sdk.from;
    if (window.supabaseClient) window.supabaseClient.from = sdk.from;
    console.log('[comms-fix] Supabase load intercepted');
  }

  // Intercept chkPin to know who logged in
  function interceptLogin() {
    if (typeof window.chkPin !== 'function') return;
    const orig = window.chkPin;
    window.chkPin = function(pin, ...args) {
      const r = orig.call(this, pin, ...args);
      if (window.USERS) {
        const found = Object.entries(window.USERS).find(([k,v]) => String(v.pin) === String(pin));
        if (found) { _me = found[0].toLowerCase(); console.log('[comms-fix] Login:', _me); setTimeout(patchAppState, 600); }
      }
      return r;
    };
  }

  // Intercept sendGroupMsg to save to DB
  function interceptSendGroup() {
    if (typeof window.sendGroupMsg !== 'function') return;
    const orig = window.sendGroupMsg;
    window.sendGroupMsg = async function(...a) {
      const r = orig.apply(this, a);
      await new Promise(x => setTimeout(x, 200));
      const msgs = window.groupMsgs || [];
      const last = msgs[msgs.length - 1];
      if (last?.from && last?.text) {
        await ins('comms_group', { author: last.from, message: last.text });
        console.log('[comms-fix] Group saved:', last.text);
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
      const me = getMe();
      if (!me || !window.dmMsgs || !window.USERS) return r;
      const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== me);
      for (const other of others) {
        const key = tk(me, other);
        const msgs = window.dmMsgs[key];
        if (!msgs?.length) continue;
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

  async function boot() {
    console.log('[comms-fix] v7.0 booting...');
    await new Promise(r => setTimeout(r, 1500));
    interceptLogin();
    interceptSendGroup();
    interceptSendDm();
    interceptSupabaseLoad();
    getMe();
    await patchAppState();
    // Also poll every 4s as backup
    setInterval(patchAppState, 4000);
    console.log('[comms-fix] v7.0 active, user:', _me);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 500);
})();