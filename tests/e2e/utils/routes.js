const useCleanRoutes = process.env.CLEAN_ROUTES === 'true';

const cleanRoutes = {
  home: '/',
  login: '/login',
  register: '/register',
  activate: '/activate',
  quoteEngine: '/quote-engine',
  messaging: '/messages',
  customerDashboard: '/customer-dashboard',
  vendorDashboard: '/vendor-dashboard',
  vendorSettings: '/vendor-dashboard/vendor-settings',
  paymentCheckout: '/payment-checkout'
};

const fileRoutes = {
  home: '/index.html',
  login: '/pages/auth-login.html',
  register: '/pages/auth-register.html',
  activate: '/pages/activate.html',
  quoteEngine: '/pages/quote-engine.html',
  messaging: '/pages/messages.html',
  customerDashboard: '/user-dashboard/index.html',
  vendorDashboard: '/vendor-dashboard/index.html',
  vendorSettings: '/vendor-dashboard/pages/vendor-settings.html',
  paymentCheckout: '/pages/payment-checkout.html'
};

const routes = useCleanRoutes ? cleanRoutes : fileRoutes;

module.exports = {
  routes
};
