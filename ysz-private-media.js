// ═══════════════════════════════════════════════════════════════
// PRIVATE CLIENT MEDIA — staff pages only (portal + lookbook)
//
// Client photo buckets are private. Older records (and some code paths) still
// hold "public" style links like
//   https://<project>.supabase.co/storage/v1/object/public/in-person-photos/...
// which no longer open. This watches the page and swaps any such link on an
// <img>, <a>, <video> or <source> for a short-lived signed link, using the
// logged-in staff member's session. No per-feature changes needed.
//
// Needs a Supabase client with a staff session: getSupa() on the portal, or
// window._yszMediaClient on standalone pages (lookbook.html).
// ═══════════════════════════════════════════════════════════════
(function () {
  var BASE = 'https://ntqemlkwsymdxhaonfdv.supabase.co';
  var PRIVATE_BUCKETS = ['in-person-photos', 'online-clients-photos', 'inspiration-photos', 'online-clients-submissions', 'yszn-clients'];
  var RE = new RegExp('^' + BASE.replace(/[.]/g, '\\.') + '/storage/v1/object/(?:public|authenticated)/(' + PRIVATE_BUCKETS.join('|') + ')/([^?#]+)');
  var TTL = 3600;             // signed link lifetime (seconds)
  var REUSE_FOR = 50 * 60e3;  // reuse a signed link for 50 minutes

  var cache = {};             // 'bucket/path' -> { url, at }
  var queue = {};             // bucket -> { path: [ {el, attr} ] }
  var timer = null;

  function client() {
    if (window._yszMediaClient) return window._yszMediaClient;
    try { if (typeof getSupa === 'function') return getSupa(); } catch (e) {}
    return null;
  }

  function parse(url) {
    var m = RE.exec(url || '');
    if (!m) return null;
    var path = m[2];
    try { path = decodeURIComponent(path); } catch (e) {}
    return { bucket: m[1], path: path };
  }

  function apply(el, attr, url, path) {
    el.setAttribute('data-ysz-signed', '1');
    el.setAttribute(attr, url);
    if (el.tagName === 'IMG' && /\.(heic|heif)$/i.test(path) && typeof window.ipFixHeicImg === 'function') {
      try { window.ipFixHeicImg(el); } catch (e) {}
    }
  }

  function enqueue(el, attr) {
    var raw = el.getAttribute(attr);
    var p = parse(raw);
    if (!p) return;
    var key = p.bucket + '/' + p.path;
    var hit = cache[key];
    if (hit && Date.now() - hit.at < REUSE_FOR) { apply(el, attr, hit.url, p.path); return; }
    var b = queue[p.bucket] || (queue[p.bucket] = {});
    (b[p.path] || (b[p.path] = [])).push({ el: el, attr: attr });
    if (!timer) timer = setTimeout(flush, 25);
  }

  async function flush() {
    timer = null;
    var db = client();
    var work = queue; queue = {};
    if (!db) return;
    Object.keys(work).forEach(async function (bucket) {
      var paths = Object.keys(work[bucket]);
      for (var i = 0; i < paths.length; i += 100) {
        var chunk = paths.slice(i, i + 100);
        try {
          var res = await db.storage.from(bucket).createSignedUrls(chunk, TTL);
          (res.data || []).forEach(function (r, idx) {
            var path = r.path || chunk[idx];
            if (!r.signedUrl) return;
            cache[bucket + '/' + path] = { url: r.signedUrl, at: Date.now() };
            (work[bucket][path] || []).forEach(function (t) { apply(t.el, t.attr, r.signedUrl, path); });
          });
        } catch (e) { console.warn('[ysz-media] could not sign links', e); }
      }
    });
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    var els = root.matches && root.matches('img,a,video,source') ? [root] : [];
    if (root.querySelectorAll) els = els.concat(Array.prototype.slice.call(root.querySelectorAll('img[src*="/storage/v1/object/"],a[href*="/storage/v1/object/"],video[src*="/storage/v1/object/"],source[src*="/storage/v1/object/"]')));
    els.forEach(function (el) {
      if (el.getAttribute('src')) enqueue(el, 'src');
      if (el.tagName === 'A' && el.getAttribute('href')) enqueue(el, 'href');
    });
  }

  function start() {
    scan(document.body);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (m.type === 'attributes') { scan(m.target); return; }
        m.addedNodes.forEach(scan);
      });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href'] });
  }

  // Public helper for code that needs a link directly (e.g. downloads).
  window.yszSignedUrl = async function (urlOrPath, bucket) {
    var p = parse(urlOrPath) || (bucket ? { bucket: bucket, path: urlOrPath } : null);
    if (!p) return urlOrPath;
    var key = p.bucket + '/' + p.path;
    if (cache[key] && Date.now() - cache[key].at < REUSE_FOR) return cache[key].url;
    var db = client(); if (!db) return urlOrPath;
    var r = await db.storage.from(p.bucket).createSignedUrl(p.path, TTL);
    if (r.data && r.data.signedUrl) { cache[key] = { url: r.data.signedUrl, at: Date.now() }; return r.data.signedUrl; }
    return urlOrPath;
  };

  // Headers for raw REST calls made as the logged-in staff member.
  window.yszAuthHeaders = async function (apikey) {
    var key = apikey || (typeof SUPA_KEY !== 'undefined' ? SUPA_KEY : '');
    var token = key;
    var db = client();
    try { var s = db && (await db.auth.getSession()).data.session; if (s) token = s.access_token; } catch (e) {}
    return { apikey: key, Authorization: 'Bearer ' + token };
  };

  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
