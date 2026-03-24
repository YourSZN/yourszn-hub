/**
 * comms-fix.js — YourSZN Hub
 * Patches the Comms section to use Supabase Realtime so messages
 * are delivered live to all profiles (latisha / lemari / salma).
 *
 * How it works:
 *  - Waits for the app's Supabase client to be ready
 *  - Migrates any existing messages from app_state into the proper tables
 *  - Subscribes to comms_group + comms_dm via Realtime
 *  - When a new message arrives it re-renders the comms UI automatically
 *  - Overrides the send functions so new messages go to Supabase, not just app_state
 */

(function () {
  'use strict';

  const PATCH_VERSION = '1.0.3';
  const MAX_WAIT_MS   = 15000;
  const POLL_INTERVAL = 200;

  /* ─── Wait for the app's supabase client ─────────────────────────── */
  function waitForSupabase(cb) {
    const start = Date.now();
    const timer = setInterval(() => {
      // The app exposes the client as window.supabase or window._sb
      const sb = window.supabase || window._sb || window.supabaseClient;
      if (sb && sb.channel) {
        clearInterval(timer);
        cb(sb);
      } else if (Date.now() - start > MAX_WAIT_MS) {
        clearInterval(timer);
        console.warn('[comms-fix] Supabase client not found — patch skipped');
      }
    }, POLL_INTERVAL);
  }

  /* ─── Wait for the app's currentUser / activeProfile to be set ───── */
  function waitForUser(cb) {
    const start = Date.now();
    const timer = setInterval(() => {
      const user =
        window.currentUser ||
        window.activeProfile ||
        window.state?.currentUser ||
        window.appState?.currentUser;
      if (user) {
        clearInterval(timer);
        cb(user);
      } else if (Date.now() - start > MAX_WAIT_MS) {
        clearInterval(timer);
        // Still try to patch without a known user — send will pick it up at runtime
        cb(null);
      }
    }, POLL_INTERVAL);
  }

  /* ─── Migrate old messages from app_state JSON into proper tables ─── */
  async function migrateExistingMessages(sb) {
    try {
      // Fetch current app_state
      const { data, error } = await sb
        .from('app_state')
        .select('state')
        .eq('id', 'main')
        .single();

      if (error || !data) return;

      const state = data.state || {};

      // --- Group messages ---
      const groupMsgs = state.groupMsgs || [];
      for (const msg of groupMsgs) {
        if (!msg || !msg.from) continue;
        // Check if already migrated
        const { data: existing } = await sb
          .from('comms_group')
          .select('id')
          .eq('author', msg.from)
          .eq('message', msg.text || msg.message || '')
          .limit(1);
        if (existing && existing.length > 0) continue;

        await sb.from('comms_group').insert({
          author:  msg.from,
          message: msg.text || msg.message || '',
          created_at: msg.time
            ? new Date().toISOString()   // can't reconstruct exact time
            : new Date().toISOString(),
        });
      }

      // --- DM messages ---
      const dmMsgs = state.dmMsgs || {};
      for (const [threadKey, msgs] of Object.entries(dmMsgs)) {
        if (!Array.isArray(msgs)) continue;
        for (const msg of msgs) {
          if (!msg || !msg.from) continue;
          const { data: existing } = await sb
            .from('comms_dm')
            .select('id')
            .eq('thread_key', threadKey)
            .eq('author', msg.from)
            .eq('message', msg.text || msg.message || '')
            .limit(1);
          if (existing && existing.length > 0) continue;

          await sb.from('comms_dm').insert({
            thread_key: threadKey,
            author:     msg.from,
            message:    msg.text || msg.message || '',
            created_at: new Date().toISOString(),
          });
        }
      }

      console.log('[comms-fix] Migration complete');
    } catch (err) {
      console.warn('[comms-fix] Migration error:', err);
    }
  }

  /* ─── Subscribe to Realtime for group + DM channels ─────────────── */
  let _realtimeChannel = null;

  function subscribeRealtime(sb) {
    if (_realtimeChannel) {
      sb.removeChannel(_realtimeChannel);
    }

    _realtimeChannel = sb
      .channel('comms-realtime-v1')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comms_group' },
        (payload) => {
          console.log('[comms-fix] New group message:', payload.new);
          handleIncomingGroupMessage(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comms_dm' },
        (payload) => {
          console.log('[comms-fix] New DM message:', payload.new);
          handleIncomingDM(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('[comms-fix] Realtime status:', status);
      });
  }

  /* ─── Handle incoming realtime group message ─────────────────────── */
  function handleIncomingGroupMessage(msg) {
    // Update app state so existing render functions pick it up
    const state = getAppState();
    if (!state) return;

    const newMsg = {
      from:    msg.author,
      text:    msg.message,
      time:    formatTime(new Date(msg.created_at)),
    };

    // Avoid duplicates
    if (!state.groupMsgs) state.groupMsgs = [];
    const alreadyExists = state.groupMsgs.some(
      (m) => m.from === newMsg.from && m.text === newMsg.text
    );
    if (!alreadyExists) {
      state.groupMsgs.push(newMsg);
      triggerRender('group');
    }
  }

  /* ─── Handle incoming realtime DM ───────────────────────────────── */
  function handleIncomingDM(msg) {
    const state = getAppState();
    if (!state) return;

    if (!state.dmMsgs) state.dmMsgs = {};
    if (!state.dmMsgs[msg.thread_key]) state.dmMsgs[msg.thread_key] = [];

    const newMsg = {
      from: msg.author,
      text: msg.message,
      time: formatTime(new Date(msg.created_at)),
    };

    const alreadyExists = state.dmMsgs[msg.thread_key].some(
      (m) => m.from === newMsg.from && m.text === newMsg.text
    );
    if (!alreadyExists) {
      state.dmMsgs[msg.thread_key].push(newMsg);
      triggerRender('dm', msg.thread_key);
    }
  }

  /* ─── Patch send functions ───────────────────────────────────────── */
  function patchSendFunctions(sb) {
    // We intercept the most common patterns apps use for sending
    // Strategy: wrap XMLHttpRequest + fetch aren't needed since this is
    // a direct Supabase JS client app. Instead we patch window functions.

    // Look for common send function names and wrap them
    const GROUP_SEND_NAMES = ['sendGroupMessage', 'sendCommsGroup', 'sendGroup', 'postGroupMsg'];
    const DM_SEND_NAMES    = ['sendDM', 'sendDirectMessage', 'sendCommsDM', 'postDM'];

    GROUP_SEND_NAMES.forEach((name) => {
      if (typeof window[name] === 'function') {
        const original = window[name];
        window[name] = async function (...args) {
          // Call original (keeps local state updated)
          const result = await original.apply(this, args);
          // Also save to Supabase
          const text   = args[0] || (typeof args[0] === 'object' ? args[0].text : '');
          const author = getCurrentUser();
          if (author && text) {
            await sb.from('comms_group').insert({ author, message: text });
          }
          return result;
        };
        console.log(`[comms-fix] Patched ${name}`);
      }
    });

    DM_SEND_NAMES.forEach((name) => {
      if (typeof window[name] === 'function') {
        const original = window[name];
        window[name] = async function (...args) {
          const result = await original.apply(this, args);
          const text      = typeof args[0] === 'string' ? args[0] : args[0]?.text || '';
          const threadKey = args[1] || args[0]?.threadKey || buildThreadKey(args);
          const author    = getCurrentUser();
          if (author && text && threadKey) {
            await sb.from('comms_dm').insert({ thread_key: threadKey, author, message: text });
          }
          return result;
        };
        console.log(`[comms-fix] Patched ${name}`);
      }
    });

    // Also intercept direct supabase calls from the app by wrapping sb.from
    const originalFrom = sb.from.bind(sb);
    sb.from = function (table) {
      const builder = originalFrom(table);
      if (table === 'app_state') {
        const originalUpsert = builder.upsert?.bind(builder);
        if (originalUpsert) {
          builder.upsert = async function (payload, opts) {
            const result = await originalUpsert(payload, opts);
            // After app_state save, sync any new comms messages to proper tables
            if (Array.isArray(payload)) {
              payload.forEach((p) => syncCommFromAppState(sb, p));
            } else {
              syncCommFromAppState(sb, payload);
            }
            return result;
          };
        }
      }
      return builder;
    };
  }

  /* ─── Sync new comms messages when app_state is saved ───────────── */
  async function syncCommFromAppState(sb, payload) {
    try {
      if (!payload || payload.id !== 'main') return;
      const state = payload.state || {};

      // Sync group messages
      const groupMsgs = state.groupMsgs || [];
      if (groupMsgs.length > 0) {
        const lastMsg = groupMsgs[groupMsgs.length - 1];
        if (lastMsg?.from && lastMsg?.text) {
          // Check if already in DB
          const { data } = await sb
            .from('comms_group')
            .select('id')
            .eq('author', lastMsg.from)
            .eq('message', lastMsg.text)
            .limit(1);
          if (!data || data.length === 0) {
            await sb.from('comms_group').insert({
              author:  lastMsg.from,
              message: lastMsg.text,
            });
          }
        }
      }

      // Sync DM messages
      const dmMsgs = state.dmMsgs || {};
      for (const [threadKey, msgs] of Object.entries(dmMsgs)) {
        if (!Array.isArray(msgs) || msgs.length === 0) continue;
        const lastMsg = msgs[msgs.length - 1];
        if (!lastMsg?.from || !lastMsg?.text) continue;

        const { data } = await sb
          .from('comms_dm')
          .select('id')
          .eq('thread_key', threadKey)
          .eq('author', lastMsg.from)
          .eq('message', lastMsg.text)
          .limit(1);
        if (!data || data.length === 0) {
          await sb.from('comms_dm').insert({
            thread_key: threadKey,
            author:     lastMsg.from,
            message:    lastMsg.text,
          });
        }
      }
    } catch (err) {
      // Silent fail — don't break the app
    }
  }

  /* ─── Load existing messages from Supabase on startup ───────────── */
  async function loadMessagesFromSupabase(sb) {
    try {
      const state = getAppState();
      if (!state) return;

      // Load group messages
      const { data: groupData } = await sb
        .from('comms_group')
        .select('*')
        .order('created_at', { ascending: true });

      if (groupData && groupData.length > 0) {
        state.groupMsgs = groupData.map((m) => ({
          from: m.author,
          text: m.message,
          time: formatTime(new Date(m.created_at)),
        }));
      }

      // Load DM messages
      const { data: dmData } = await sb
        .from('comms_dm')
        .select('*')
        .order('created_at', { ascending: true });

      if (dmData && dmData.length > 0) {
        state.dmMsgs = {};
        for (const m of dmData) {
          if (!state.dmMsgs[m.thread_key]) state.dmMsgs[m.thread_key] = [];
          state.dmMsgs[m.thread_key].push({
            from: m.author,
            text: m.message,
            time: formatTime(new Date(m.created_at)),
          });
        }
      }

      // Re-render if comms tab is currently visible
      triggerRender('both');
    } catch (err) {
      console.warn('[comms-fix] Load error:', err);
    }
  }

  /* ─── Helpers ───────────────────────────────────────────────────── */

  function getAppState() {
    return (
      window.state ||
      window.appState ||
      window.APP_STATE ||
      null
    );
  }

  function getCurrentUser() {
    return (
      window.currentUser ||
      window.activeProfile ||
      window.state?.currentUser ||
      window.appState?.currentUser ||
      null
    );
  }

  function buildThreadKey(args) {
    // Try to figure out the thread key from args
    const user = getCurrentUser();
    if (!user) return null;
    const other = args[1] || args[0]?.to || null;
    if (!other) return null;
    return [user, other].sort().join('_');
  }

  function formatTime(date) {
    return date.toLocaleTimeString('en-AU', {
      hour:   '2-digit',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase();
  }

  function triggerRender(type, threadKey) {
    // Try common render function names the app might use
    const renderFns = [
      'renderComms', 'renderCommsSection', 'renderMessages',
      'refreshComms', 'updateComms', 'drawComms',
      'renderGroupChat', 'renderDMs', 'renderChat',
    ];
    for (const name of renderFns) {
      if (typeof window[name] === 'function') {
        try {
          window[name](type, threadKey);
        } catch (e) { /* ignore */ }
      }
    }

    // Also try dispatching a custom event the app might listen for
    window.dispatchEvent(new CustomEvent('comms:update', {
      detail: { type, threadKey }
    }));

    // Last resort: look for the comms section in the DOM and trigger a re-render
    // by finding and clicking the active comms tab if visible
    const commsSection = document.querySelector(
      '[data-section="comms"], #comms, .comms-section, [id*="comm"]'
    );
    if (commsSection && commsSection.style.display !== 'none') {
      // Scroll chat to bottom
      const chatContainers = commsSection.querySelectorAll(
        '.messages, .chat-messages, .msg-list, [class*="message"]'
      );
      chatContainers.forEach((el) => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }

  /* ─── Boot ───────────────────────────────────────────────────────── */
  function boot() {
    console.log(`[comms-fix] Booting v${PATCH_VERSION}`);

    waitForSupabase(async (sb) => {
      console.log('[comms-fix] Supabase client found');

      // 1. Migrate any old messages from app_state to proper tables
      await migrateExistingMessages(sb);

      // 2. Load messages from Supabase into app state
      await loadMessagesFromSupabase(sb);

      // 3. Subscribe to Realtime so new messages arrive live
      subscribeRealtime(sb);

      // 4. Patch send functions to also write to Supabase
      patchSendFunctions(sb);

      console.log('[comms-fix] Patch active ✓');
    });
  }

  // Run after the page is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    // Small delay to let the app initialize first
    setTimeout(boot, 800);
  }
})();