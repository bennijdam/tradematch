import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware - Serve HTML files directly for 100% visual parity
 * 
 * This middleware intercepts dashboard requests and rewrites them
 * to serve the original HTML files from the public folder.
 */

// Map clean URLs to HTML files
const HTML_ROUTES: Record<string, string> = {
  // Vendor dashboards
  '/dashboards/vendor': '/vendor-dashboard.html',
  '/dashboards/vendor/credentials': '/vendor-credentials-vault.html',
  '/dashboards/vendor/disputes': '/vendor-dispute-centre.html',
  '/dashboards/vendor/active-jobs': '/vendor-active-jobs.html',
  '/dashboards/vendor/analytics': '/vendor-analytics.html',
  '/dashboards/vendor/coverage-map': '/vendor-coverage-map.html',
  '/dashboards/vendor/heatmaps': '/vendor-heatmaps.html',
  '/dashboards/vendor/help-support': '/vendor-help-support.html',
  '/dashboards/vendor/messages': '/vendor-messages.html',
  '/dashboards/vendor/my-profile': '/vendor-my-profile.html',
  '/dashboards/vendor/reviews': '/vendor-reviews.html',
  '/dashboards/vendor/settings': '/vendor-settings.html',
  
  // User dashboards  
  '/dashboards/user': '/user-dashboard.html',
  '/dashboards/user/compare-quotes': '/user-compare-quotes.html',
  '/dashboards/user/disputes': '/user-dispute-centre.html',
  '/dashboards/user/document-vault': '/user-document-vault.html',
  '/dashboards/user/messages': '/user-messages.html',
  '/dashboards/user/payment-success': '/user-payment-success.html',
  '/dashboards/user/settings': '/user-settings.html',
  '/dashboards/user/verification-hub': '/user-verification_hub.html',
  '/dashboards/user/verification-hub/premium': '/user-verification_hub-premiumaddon.html',
  
  // Super Admin dashboards
  '/dashboards/super-admin': '/super-admin-dashboard.html',
  '/dashboards/super-admin/sentinel': '/super-admin-sentinel.html',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a dashboard route that should serve HTML
  const htmlFile = HTML_ROUTES[pathname];
  
  if (htmlFile) {
    // Rewrite to the HTML file in public folder
    const url = request.nextUrl.clone();
    url.pathname = htmlFile;
    return NextResponse.rewrite(url);
  }

  // For all other routes, continue normally
  return NextResponse.next();
}

// Match dashboard routes
export const config = {
  matcher: [
    '/dashboards/:path*',
  ],
};
