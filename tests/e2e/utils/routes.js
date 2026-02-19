// Prefer clean routes by default (matches Vercel `cleanUrls: true`).
// Set CLEAN_ROUTES=false to force explicit .html paths.
const useCleanRoutes = process.env.CLEAN_ROUTES !== 'false';

const cleanRoutes = {
  home: '/',
  login: '/login',
  register: '/register',
  activate: '/activate',
  quoteEngine: '/quote-engine',
  messaging: '/messages',
  customerDashboard: '/user-dashboard-index',
  vendorDashboard: '/dashboard-vendor-profile',
  vendorSettings: '/dashboard-vendor-settings',
  paymentCheckout: '/payment-checkout'
};

const fileRoutes = {
  home: '/index.html',
  login: '/login.html',
  register: '/register.html',
  activate: '/activate.html',
  quoteEngine: '/quote-engine.html',
  messaging: '/messages.html',
  customerDashboard: '/user-dashboard-index.html',
  vendorDashboard: '/dashboard-vendor-profile.html',
  vendorSettings: '/dashboard-vendor-settings.html',
  paymentCheckout: '/payment-checkout.html'
};

const routes = useCleanRoutes ? cleanRoutes : fileRoutes;

module.exports = {
  routes
};
