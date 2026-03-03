import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type SyntheticSession = {
  token: string;
};

const LEGACY_VENDOR_REDIRECTS: Record<string, string> = {
  '/vendor-dashboard.html': '/vendor/dashboard',
  '/vendor-active-jobs.html': '/vendor/active-jobs',
  '/vendor-new-leads.html': '/vendor/leads',
  '/vendor-messages.html': '/vendor/messages',
  '/vendor-analytics.html': '/vendor/analytics',
  '/vendor-reviews.html': '/vendor/reviews',
  '/vendor-coverage.html': '/vendor/coverage',
  '/vendor-profile.html': '/vendor/profile',
  '/vendor-billing.html': '/vendor/billing',
  '/vendor-settings.html': '/vendor/settings',
  '/vendor-home.html': '/vendor/dashboard',
  '/vendor-dashboard/vendor-dashboard-with-modals': '/vendor/dashboard',
  '/vendor-dashboard/vendor-dashboard-enhanced': '/vendor/dashboard',
  '/vendor-dashboard/vendor-active-jobs': '/vendor/active-jobs',
  '/vendor-dashboard/vendor-new-leads': '/vendor/leads',
  '/vendor-dashboard/vendor-messages': '/vendor/messages',
  '/vendor-dashboard/vendor-analytics': '/vendor/analytics',
  '/vendor-dashboard/vendor-profile': '/vendor/profile',
  '/vendor-dashboard/vendor-billing': '/vendor/billing',
  '/vendor-dashboard/vendor-settings': '/vendor/settings',
  '/vendor-dashboard/vendor-coverage': '/vendor/coverage',
  '/vendor-dashboard/vendor-timeline': '/vendor/analytics',
  '/vendor-dashboard/vendor-impressions': '/vendor/analytics',
  '/vendor-dashboard/vendor-heatmaps': '/vendor/analytics',
  '/vendor-dashboard/vendor-badges': '/vendor/reviews',
  '/vendor-dashboard/vendor-archived-jobs': '/vendor/active-jobs',
  '/vendor-dashboard/vendor-active-quotes': '/vendor/active-jobs',
  '/vendor-dashboard/vendor-new-jobs': '/vendor/active-jobs',
};

function normalizePath(pathname: string) {
  return pathname.endsWith('/') && pathname !== '/'
    ? pathname.slice(0, -1)
    : pathname;
}

function hasAuthCookie(request: NextRequest) {
  const cookieNames = ['session_token', 'auth-token', 'auth_token', 'token'];
  return cookieNames.some((name) => Boolean(request.cookies.get(name)?.value));
}

function isLocalHost(request: NextRequest) {
  const host = request.nextUrl.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function resolveSyntheticSession(request: NextRequest): SyntheticSession | null {
  if (!isLocalHost(request)) {
    return null;
  }

  const providedSecret = request.headers.get('x-tradematch-test-secret');
  const expectedSecret = process.env.INTERNAL_TEST_SECRET || 'dev-secret-123';

  if (!providedSecret || providedSecret !== expectedSecret) {
    return null;
  }

  const syntheticUser = request.headers.get('x-tradematch-test-user') || 'vendor';
  const normalizedUser = syntheticUser.toLowerCase() === 'customer' ? 'customer' : 'vendor';

  return {
    token: `e2e-${normalizedUser}-token`,
  };
}

function applySyntheticCookies(response: NextResponse, session: SyntheticSession) {
  response.cookies.set('auth-token', session.token, { path: '/', sameSite: 'lax' });
  response.cookies.set('auth_token', session.token, { path: '/', sameSite: 'lax' });
  response.cookies.set('token', session.token, { path: '/', sameSite: 'lax' });
  response.cookies.set('session_token', session.token, { path: '/', sameSite: 'lax' });
}

export function proxy(request: NextRequest) {
  const sourcePath = normalizePath(request.nextUrl.pathname);
  const hasSession = hasAuthCookie(request);
  const syntheticSession = resolveSyntheticSession(request);
  const canAutoSession = Boolean(syntheticSession);

  if ((sourcePath === '/' || sourcePath === '/index.html') && (hasSession || canAutoSession)) {
    const url = request.nextUrl.clone();
    url.pathname = '/vendor/dashboard';
    const response = NextResponse.redirect(url, 307);
    if (syntheticSession && !hasSession) {
      applySyntheticCookies(response, syntheticSession);
    }
    return response;
  }

  const destination = LEGACY_VENDOR_REDIRECTS[sourcePath];

  if (!destination) {
    const response = NextResponse.next();
    if (syntheticSession && !hasSession) {
      applySyntheticCookies(response, syntheticSession);
    }
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname = destination;
  const response = NextResponse.redirect(url, 308);
  if (syntheticSession && !hasSession) {
    applySyntheticCookies(response, syntheticSession);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|robots.txt|sitemap.xml).*)'],
};
