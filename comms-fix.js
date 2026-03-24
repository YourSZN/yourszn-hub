/**
 * comms-fix.js — YourSZN Hub v5.0
 * Confirmed variable names: sendGroupMsg, sendDm, window.groupMsgs, window.dmMsgs, window.USERS, chkPin
 */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cWVtbGt3c3ltZHhoYW9uZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzM4MDUsImV4cCI6MjA4ODYwOTgwNX0.6F34kwmrXpiLKnd2d_oyQubn5QpodO2iHR6O47W9gA4';
  const H = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
  let currentUser = null;

  function threadKey(a, b) { return [a, b].sort().join('_'); }
  function fmt(d) { return new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase(); }

  async function dbSelect(table, params) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.asc${params||''}`, { headers: H });
    return r.ok ? r.json() : [];
  }

  async function dbInsert(table, payload) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: 'POST', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify(payload) });
  }

  function getUser() {
    if (currentUser) return currentUser;
    const m = document.body.innerText.match(/LOGGED IN AS\s+(\w+)/i);
    if (m) { currentUser = m[1].toLowerCase(); }
    return currentUser;
  }

  function triggerRender() {
    ['renderCommsPage','renderComms','renderGroupThread','renderDmThread','showComms','refreshComms'].forEach(fn => {
      if (typeof window[fn] === 'function') { try { window[fn](); } catch(e) {} }
    });
    document.querySelectorAll('[id*="msg"],[class*="msg"],[class*="chat"],[class*="thread"]')
      .forEach(el => { if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight; });
  }

  function interceptLogin() {
    if (typeof window.chkPin !== 'function') return;
    const orig = window.chkPin;
    window.chkPin = function(pin, ...args) {
      const result = orig.call(this, pin, ...args);
      if (window.USERS) {
        const match = Object.entries(window.USERS).find(([k,v]) => String(v.pin) === String(pin));
        if (match) { currentUser = match[0].toLowerCase(); console.log('[comms-fix] Logged in:', currentUser); loadDMs(); }
      }
      return result;
    };
  }

  function interceptSendGroupMsg() {
    if (typeof window.sendGroupMsg !== 'function') return;
    const orig = window.sendGroupMsg;
    window.sendGroupMsg = async function(...args) {
      const result = orig.apply(this, args);
      await new Promise(r => setTimeout(r, 150));
      const msgs = window.groupMsgs || [];
      const last = msgs[msgs.length - 1];
      if (last && last.from && last.text) {
        await dbInsert('comms_group', { author: last.from, message: last.text });
        console.log('[comms-fix] Group msg saved:', last.text);
      }
      return result;
    };
  }

  function interceptSendDm() {
    if (typeof window.sendDm !== 'function') return;
    const orig = window.sendDm;
    window.sendDm = async function(...args) {
      const result = orig.apply(this, args);
      await new Promise(r => setTimeout(r, 150));
      const me = getUser();
      if (!me || !window.dmMsgs) return result;
      const profiles = Object.keys(window.USERS || {}).map(k => k.toLowerCase());
      const myThreads = profiles.filter(p => p !== me).map(p => threadKey(me, p));
      for (const key of myThreads) {
        const msgs = window.dmMsgs[key];
        if (!msgs || !msgs.length) continue;
        const last = msgs[msgs.length - 1];
        if (last && last.from && last.text) {
          await dbInsert('comms_dm', { thread_key: key, author: last.from, message: last.text });
          console.log('[comms-fix] DM saved:', key, last.text);
          break;
        }
      }
      return result;
    };
  }

  let lastGroup = 0, lastDm = {};

  async function loadGroupMessages() {
    const data = await dbSelect('comms_group');
    if (!data.length || data.length === lastGroup) return;
    window.groupMsgs = data.map(m => ({ from: m.author, text: m.message, time: fmt(m.created_at) }));
    lastGroup = data.length;
    triggerRender();
    console.log('[comms-fix] Group loaded:', data.length);
  }

  async function loadDMs() {
    const me = getUser();
    if (!me) return;
    const profiles = Object.keys(window.USERS || {}).map(k => k.toLowerCase());
    const myThreads = profiles.filter(p => p !== me).map(p => threadKey(me, p));
    const data = await dbSelect('comms_dm');
    if (!data.length) return;
    let updated = false;
    const newDms = {};
    for (const t of myThreads) {
      const msgs = data.filter(m => m.thread_key === t);
      if (msgs.length !== (lastDm[t] || 0)) {
        newDms[t] = msgs.map(m => ({ from: m.author, text: m.message, time: fmt(m.created_at) }));
        lastDm[t] = msgs.length;
        updated = true;
      } else if (window.dmMsgs && window.dmMsgs[t]) {
        newDms[t] = window.dmMsgs[t];
      }
    }
    if (updated) {
      window.dmMsgs = newDms;
      triggerRender();
      console.log('[comms-fix] DMs loaded for:', me);
    }
  }

  async function boot() {
    console.log('[comms-fix] v5.0 booting...');
    await new Promise(r => setTimeout(r, 1500));
    interceptLogin();
    interceptSendGroupMsg();
    interceptSendDm();
    getUser();
    await loadGroupMessages();
    await loadDMs();
    setInterval(() => { loadGroupMessages(); loadDMs(); }, 3000);
    console.log('[comms-fix] v5.0 active, user:', currentUser);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 500);
})();