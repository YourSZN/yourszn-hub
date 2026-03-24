/**
 * comms-fix.js v6.0
 * Fixes: group chat render + DM privacy (user detection from sidebar element not body text)
 */
(function () {
  'use strict';
  const URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
  let me = null;

  function tk(a, b) { return [a, b].sort().join('_'); }
  function fmt(d) { return new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase(); }

  // Get current user from the specific sidebar element, not body text
  function getMe() {
    if (me) return me;
    // The sidebar shows the name in a specific element - find it precisely
    const sidebar = document.querySelector('.sidebar, #sidebar, nav, [class*="sidebar"], [class*="nav"]');
    const target = sidebar || document.body;
    // Look for the "LOGGED IN AS" label and get the next element or text
    const allEls = target.querySelectorAll('*');
    for (const el of allEls) {
      if (el.children.length === 0 && el.textContent.match(/^(latisha|lemari|salma)$/i)) {
        me = el.textContent.trim().toLowerCase();
        console.log('[comms-fix] User from element:', me);
        return me;
      }
    }
    // Fallback: find the profile name after LOGGED IN AS text node
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim() === 'LOGGED IN AS') {
        // Get next sibling text nodes
        let next = node.nextSibling;
        while (next) {
          const t = next.textContent.trim();
          if (t.match(/^(latisha|lemari|salma)$/i)) {
            me = t.toLowerCase();
            return me;
          }
          next = next.nextSibling;
        }
      }
    }
    return null;
  }

  async function db(table, params) {
    const r = await fetch(`${URL}/rest/v1/${table}?select=*&order=created_at.asc${params||''}`, { headers: H });
    return r.ok ? r.json() : [];
  }

  async function ins(table, data) {
    await fetch(`${URL}/rest/v1/${table}`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(data) });
  }

  // Re-render group chat by finding the render function or manipulating DOM directly
  function renderGroup(msgs) {
    // Try all known render functions
    const fns = ['renderCommsPage','renderComms','renderGroupChat','renderGroupThread','showComms','refreshComms','renderCommsSection'];
    let rendered = false;
    for (const fn of fns) {
      if (typeof window[fn] === 'function') {
        try { window[fn](); rendered = true; break; } catch(e) {}
      }
    }
    // Also dispatch event
    window.dispatchEvent(new CustomEvent('comms:updated'));
    // Scroll group chat container to bottom
    const chatEl = document.querySelector('#group-chat, .group-chat, [id*="group"][class*="msg"], [id*="group"][class*="chat"]');
    if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
  }

  function renderDMs() {
    window.dispatchEvent(new CustomEvent('comms:updated'));
  }

  // Intercept chkPin to capture login
  function interceptLogin() {
    if (typeof window.chkPin !== 'function') return;
    const orig = window.chkPin;
    window.chkPin = function(pin, ...args) {
      const r = orig.call(this, pin, ...args);
      if (window.USERS) {
        const found = Object.entries(window.USERS).find(([k,v]) => String(v.pin) === String(pin));
        if (found) {
          me = found[0].toLowerCase();
          console.log('[comms-fix] Login detected:', me);
          setTimeout(() => loadDMs(), 500);
        }
      }
      return r;
    };
  }

  // Intercept sendGroupMsg
  function interceptGroup() {
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

  // Intercept sendDm
  function interceptDM() {
    if (typeof window.sendDm !== 'function') return;
    const orig = window.sendDm;
    window.sendDm = async function(...a) {
      const r = orig.apply(this, a);
      await new Promise(x => setTimeout(x, 200));
      const user = getMe();
      if (!user || !window.dmMsgs || !window.USERS) return r;
      const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== user);
      for (const other of others) {
        const key = tk(user, other);
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

  let lastGroupCount = 0;
  let lastDmCounts = {};

  async function loadGroup() {
    const data = await db('comms_group');
    if (!data.length || data.length === lastGroupCount) return;
    window.groupMsgs = data.map(m => ({ from: m.author, text: m.message, time: fmt(m.created_at) }));
    lastGroupCount = data.length;
    renderGroup(window.groupMsgs);
    console.log('[comms-fix] Group loaded:', data.length);
  }

  async function loadDMs() {
    const user = getMe();
    if (!user || !window.USERS) return;
    const others = Object.keys(window.USERS).map(k => k.toLowerCase()).filter(k => k !== user);
    const myKeys = others.map(o => tk(user, o));
    const data = await db('comms_dm');
    let updated = false;
    const newDms = {};
    for (const key of myKeys) {
      const msgs = data.filter(m => m.thread_key === key);
      const prev = lastDmCounts[key] || 0;
      if (msgs.length !== prev) {
        newDms[key] = msgs.map(m => ({ from: m.author, text: m.message, time: fmt(m.created_at) }));
        lastDmCounts[key] = msgs.length;
        updated = true;
      } else {
        newDms[key] = window.dmMsgs?.[key] || [];
      }
    }
    // PRIVACY: only set threads user is part of — removes latisha_lemari from salma
    window.dmMsgs = newDms;
    if (updated) { renderDMs(); console.log('[comms-fix] DMs loaded for:', user, Object.keys(newDms)); }
  }

  async function boot() {
    console.log('[comms-fix] v6.0 booting...');
    await new Promise(r => setTimeout(r, 1500));
    interceptLogin();
    interceptGroup();
    interceptDM();
    getMe();
    await loadGroup();
    await loadDMs();
    setInterval(async () => { await loadGroup(); await loadDMs(); }, 3000);
    console.log('[comms-fix] v6.0 active, user:', me);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 500);
})();