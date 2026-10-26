// Minimal mock of RevenueCat web SDK for local testing.
// This allows the app to exercise offerings, purchase and restore flows without the real CDN.
(function (global) {
  var mock = {};

  mock.configure = function (opts) {
    console.info('RevenueCat mock configured', opts);
    mock._configured = opts || {};
  };

  mock.init = function (opts) {
    console.info('RevenueCat mock init', opts);
    mock._configured = opts || {};
  };

  mock.getOfferings = function () {
    return Promise.resolve({
      current: {
        identifier: 'default',
        packages: [
          { identifier: 'monthly', title: 'SZN Pro Monthly', price: '$4.99', priceString: '$4.99' },
          { identifier: 'yearly', title: 'SZN Pro Yearly', price: '$29.99', priceString: '$29.99' }
        ]
      },
      offerings: {
        default: {
          identifier: 'default',
          packages: [
            { identifier: 'monthly', title: 'SZN Pro Monthly', price: '$4.99', priceString: '$4.99' },
            { identifier: 'yearly', title: 'SZN Pro Yearly', price: '$29.99', priceString: '$29.99' }
          ]
        }
      }
    });
  };

  mock.purchase = function (pkg) {
    console.info('RevenueCat mock purchase called', pkg);
    return Promise.resolve({ status: 'success', entitlement: getMockEntitlement() });
  };

  mock.restorePurchases = function () {
    console.info('RevenueCat mock restorePurchases');
    return Promise.resolve({ restored: true, entitlement: getMockEntitlement() });
  };

  function getMockEntitlement() {
    return { identifier: 'pro_access', active: true, expires_date: null };
  }

  // Export common global names used in revenuecat.js
  global.RevenueCat = mock;
  global.RevenueCatPurchases = mock;
  global.revenuecat = mock;

})(window);
