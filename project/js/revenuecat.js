// RevenueCat Web Billing integration for the web app.
// Uses the official @revenuecat/purchases-js SDK, loaded via unpkg (no build step needed).
// Docs: https://www.revenuecat.com/docs/web/web-billing/web-sdk

var REVENUECAT_CONFIG = {
  // Use the WEB BILLING public API key from RevenueCat dashboard → Web section
  // (this is different from a mobile app's public API key).
  publicApiKey: 'rcb_sb_KCciKSOuPieNtGPLwRfISmtCp',
  // Must match the entitlement IDENTIFIER (slug) set up in RevenueCat dashboard,
  // e.g. "pro" — not the display name "Your SZN Pro".
  entitlementId: 'pro',
  offeringId: 'default',
  appUserId: ''
};

// Pinned to a specific version + the current UMD build filename — @latest previously
// broke this when the package renamed purchases.iife.js to Purchases.umd.js.
// Bump the version deliberately (and re-check the filename on unpkg) to upgrade.
var REVENUECAT_SDK_URL = 'https://unpkg.com/@revenuecat/purchases-js@1.48.1/dist/Purchases.umd.js';

var revenueCatState = {
  initialized: false,
  status: 'not-configured',
  message: 'RevenueCat is not configured yet.',
  purchases: null,       // the configured Purchases instance
  offerings: [],          // array of { pkg, product } for rendering
  entitlementActive: false,
  lastError: ''
};

function getRevenueCatConfig() {
  var cfg = window.REVENUECAT_CONFIG || REVENUECAT_CONFIG || {};
  return {
    publicApiKey: cfg.publicApiKey || '',
    entitlementId: cfg.entitlementId || 'pro',
    offeringId: cfg.offeringId || 'default',
    appUserId: cfg.appUserId || ''
  };
}

function setRevenueCatStatus(status, message) {
  revenueCatState.status = status;
  revenueCatState.message = message || '';

  var badge = document.getElementById('revenuecat-status-badge');
  var text = document.getElementById('revenuecat-status-text');
  if (!badge || !text) return;

  var label = 'Pending';
  var bg = '#E5E7EB';
  var fg = '#374151';

  if (status === 'ready') {
    label = revenueCatState.entitlementActive ? 'Active' : 'Ready';
    bg = revenueCatState.entitlementActive ? '#DCFCE7' : '#E0F2FE';
    fg = revenueCatState.entitlementActive ? '#166534' : '#075985';
  } else if (status === 'error') {
    label = 'Error';
    bg = '#FEE2E2';
    fg = '#B91C1C';
  } else if (status === 'not-configured') {
    label = 'Pending';
  }

  badge.textContent = label;
  badge.style.background = bg;
  badge.style.color = fg;
  text.textContent = message || 'RevenueCat setup is pending.';
}

function showRevenueCatPaywall() {
  var modal = document.getElementById('revenuecat-paywall');
  if (!modal) return;
  modal.style.display = 'flex';
  if (revenueCatState.initialized) {
    renderRevenueCatPackages();
  } else {
    initRevenueCat();
  }
}

function closeRevenueCatPaywall() {
  var modal = document.getElementById('revenuecat-paywall');
  if (modal) modal.style.display = 'none';
}

function renderRevenueCatPackages() {
  var holder = document.getElementById('revenuecat-packages');
  if (!holder) return;

  if (!revenueCatState.offerings.length) {
    holder.innerHTML = '<div style="font-size:12px;color:var(--muted)">No packages loaded yet. Check your RevenueCat Web Billing setup (offerings/products) in the dashboard.</div>';
    return;
  }

  holder.innerHTML = '';
  revenueCatState.offerings.forEach(function (entry, index) {
    var product = entry.webBillingProduct || {};
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'btn btnp';
    row.style.cssText = 'width:100%;display:flex;justify-content:space-between;align-items:center;padding:10px 12px;font-size:12px;text-align:left;';
    row.onclick = function () { purchaseRevenueCatPackage(index); };
    var title = product.title || entry.identifier || 'Your SZN Pro';
    var price = (product.currentPrice && product.currentPrice.formattedPrice) || 'Subscribe';
    row.innerHTML = '<span>' + title + '</span><strong>' + price + '</strong>';
    holder.appendChild(row);
  });
}

function loadRevenueCatScript(cb) {
  var existing = document.querySelector('script[data-rc-src]');
  if (existing && window.Purchases) {
    return cb(null);
  }
  var s = document.createElement('script');
  s.src = REVENUECAT_SDK_URL;
  s.async = true;
  s.setAttribute('data-rc-src', REVENUECAT_SDK_URL);
  var timer = setTimeout(function () {
    cb(new Error('Timed out loading RevenueCat SDK from ' + REVENUECAT_SDK_URL));
  }, 10000);
  s.onload = function () { clearTimeout(timer); cb(null); };
  s.onerror = function () {
    clearTimeout(timer);
    cb(new Error('Failed to load RevenueCat SDK from ' + REVENUECAT_SDK_URL));
  };
  document.head.appendChild(s);
}

function initRevenueCat() {
  var cfg = getRevenueCatConfig();
  setRevenueCatStatus('pending', 'Checking RevenueCat setup...');

  if (!cfg.publicApiKey) {
    setRevenueCatStatus('not-configured', 'Add your RevenueCat Web Billing public API key in the config.');
    return;
  }

  loadRevenueCatScript(function (err) {
    if (err) {
      revenueCatState.lastError = err.message;
      setRevenueCatStatus('error', err.message);
      console.error(err);
      return;
    }

    // The unpkg build exposes a nested namespace: window.Purchases.Purchases
    var Purchases = window.Purchases && window.Purchases.Purchases;
    if (!Purchases) {
      setRevenueCatStatus('error', 'RevenueCat SDK loaded but Purchases class was not found on window.');
      return;
    }

    try {
      var appUserId = cfg.appUserId || Purchases.generateRevenueCatAnonymousAppUserId();
      var purchases = Purchases.configure({
        apiKey: cfg.publicApiKey,
        appUserId: appUserId
      });

      revenueCatState.initialized = true;
      revenueCatState.purchases = purchases;
      setRevenueCatStatus('ready', 'RevenueCat is initialized. Loading offerings...');
      loadRevenueCatOfferings();
      refreshRevenueCatEntitlement();
    } catch (e) {
      revenueCatState.lastError = e && e.message ? e.message : String(e);
      setRevenueCatStatus('error', 'RevenueCat initialization failed: ' + revenueCatState.lastError);
    }
  });
}

function loadRevenueCatOfferings() {
  var purchases = revenueCatState.purchases;
  if (!purchases) return;

  purchases.getOfferings().then(function (offerings) {
    var current = offerings.current;
    var packages = (current && current.availablePackages) || [];
    revenueCatState.offerings = packages;
    renderRevenueCatPackages();
    setRevenueCatStatus('ready', 'Offerings loaded.');
  }).catch(function (err) {
    revenueCatState.lastError = err && err.message ? err.message : String(err);
    setRevenueCatStatus('error', 'Unable to load offerings: ' + revenueCatState.lastError);
  });
}

function refreshRevenueCatEntitlement() {
  var purchases = revenueCatState.purchases;
  var cfg = getRevenueCatConfig();
  if (!purchases) return;

  purchases.getCustomerInfo().then(function (customerInfo) {
    revenueCatState.entitlementActive = !!(customerInfo.entitlements.active[cfg.entitlementId]);
    setRevenueCatStatus('ready', revenueCatState.entitlementActive
      ? 'Your SZN Pro is active.'
      : 'RevenueCat is initialized.');
  }).catch(function (err) {
    console.error('Failed to fetch customer info:', err);
  });
}

function purchaseRevenueCatPackage(index) {
  var purchases = revenueCatState.purchases;
  var cfg = getRevenueCatConfig();
  var pkg = revenueCatState.offerings[index];

  if (!purchases) {
    setRevenueCatStatus('error', 'RevenueCat is not initialized yet.');
    return;
  }
  if (!pkg) {
    setRevenueCatStatus('error', 'No package is available yet.');
    return;
  }

  setRevenueCatStatus('pending', 'Starting purchase flow...');
  purchases.purchase({ rcPackage: pkg }).then(function (result) {
    var customerInfo = result.customerInfo;
    revenueCatState.entitlementActive = !!(customerInfo.entitlements.active[cfg.entitlementId]);
    setRevenueCatStatus('ready', revenueCatState.entitlementActive
      ? 'Purchase completed. Your SZN Pro is now active.'
      : 'Purchase completed.');
    closeRevenueCatPaywall();
  }).catch(function (err) {
    // User cancelling the flow shouldn't be shown as a hard error.
    if (err && err.errorCode === 'user-cancelled') {
      setRevenueCatStatus('ready', 'Purchase cancelled.');
      return;
    }
    revenueCatState.lastError = err && err.message ? err.message : String(err);
    setRevenueCatStatus('error', 'Purchase failed: ' + revenueCatState.lastError);
  });
}

function restoreRevenueCatPurchases() {
  var purchases = revenueCatState.purchases;
  if (!purchases) {
    initRevenueCat();
    return;
  }
  setRevenueCatStatus('pending', 'Refreshing subscription status...');
  refreshRevenueCatEntitlement();
}

window.REVENUECAT_CONFIG = REVENUECAT_CONFIG;
window.revenueCatState = revenueCatState;
window.initRevenueCat = initRevenueCat;
window.restoreRevenueCatPurchases = restoreRevenueCatPurchases;
window.showRevenueCatPaywall = showRevenueCatPaywall;
window.closeRevenueCatPaywall = closeRevenueCatPaywall;
window.purchaseRevenueCatPackage = purchaseRevenueCatPackage;
window.renderRevenueCatPackages = renderRevenueCatPackages;

document.addEventListener('DOMContentLoaded', function () {
  setRevenueCatStatus('not-configured', 'Click "Check RevenueCat" to initialize.');
});