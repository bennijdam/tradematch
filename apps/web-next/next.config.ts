import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep static export for production builds, but allow local dev with middleware.
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  trailingSlash: false,

  // Clean URL rewrites - serve HTML files at professional endpoints
  async rewrites() {
    return [
      // ═══════════════════════════════════════════════════
      // VENDOR DASHBOARDS
      // ═══════════════════════════════════════════════════
      {
        source: '/dashboards/vendor',
        destination: '/vendor-dashboard.html',
      },
      {
        source: '/dashboards/vendor/credentials',
        destination: '/vendor-credentials-vault.html',
      },
      {
        source: '/dashboards/vendor/disputes',
        destination: '/vendor-dispute-centre.html',
      },
      {
        source: '/dashboards/vendor/active-jobs',
        destination: '/vendor-active-jobs.html',
      },
      {
        source: '/dashboards/vendor/analytics',
        destination: '/vendor-analytics.html',
      },
      {
        source: '/dashboards/vendor/coverage-map',
        destination: '/vendor-coverage-map.html',
      },
      {
        source: '/dashboards/vendor/heatmaps',
        destination: '/vendor-heatmaps.html',
      },
      {
        source: '/dashboards/vendor/help-support',
        destination: '/vendor-help-support.html',
      },
      {
        source: '/dashboards/vendor/messages',
        destination: '/vendor-messages.html',
      },
      {
        source: '/dashboards/vendor/my-profile',
        destination: '/vendor-my-profile.html',
      },
      {
        source: '/dashboards/vendor/reviews',
        destination: '/vendor-reviews.html',
      },
      {
        source: '/dashboards/vendor/settings',
        destination: '/vendor-settings.html',
      },

      // ═══════════════════════════════════════════════════
      // USER/CUSTOMER DASHBOARDS
      // ═══════════════════════════════════════════════════
      {
        source: '/dashboards/user',
        destination: '/user-dashboard.html',
      },
      {
        source: '/dashboards/user/compare-quotes',
        destination: '/user-compare-quotes.html',
      },
      {
        source: '/dashboards/user/disputes',
        destination: '/user-dispute-centre.html',
      },
      {
        source: '/dashboards/user/document-vault',
        destination: '/user-document-vault.html',
      },
      {
        source: '/dashboards/user/messages',
        destination: '/user-messages.html',
      },
      {
        source: '/dashboards/user/payment-success',
        destination: '/user-payment-success.html',
      },
      {
        source: '/dashboards/user/settings',
        destination: '/user-settings.html',
      },
      {
        source: '/dashboards/user/verification-hub',
        destination: '/user-verification_hub.html',
      },
      {
        source: '/dashboards/user/verification-hub/premium',
        destination: '/user-verification_hub-premiumaddon.html',
      },

      // ═══════════════════════════════════════════════════
      // SUPER ADMIN DASHBOARDS
      // ═══════════════════════════════════════════════════
      {
        source: '/dashboards/super-admin',
        destination: '/super-admin-dashboard.html',
      },
      {
        source: '/dashboards/super-admin/sentinel',
        destination: '/super-admin-sentinel.html',
      },

      // ═══════════════════════════════════════════════════
      // REDIRECTS (HTML files to clean URLs)
      // ═══════════════════════════════════════════════════
      {
        source: '/vendor-dashboard.html',
        destination: '/dashboards/vendor',
      },
      {
        source: '/user-dashboard.html',
        destination: '/dashboards/user',
      },
      {
        source: '/super-admin-dashboard.html',
        destination: '/dashboards/super-admin',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
