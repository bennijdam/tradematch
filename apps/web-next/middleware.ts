import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for dashboard route protection
 * 
 * This middleware:
 * 1. Checks for authentication token
 * 2. Validates user role for specific dashboard routes
 * 3. Redirects to login if not authenticated
 * 4. Redirects to appropriate dashboard if accessing wrong role
 */

// Role-based route mapping
const ROLE_ROUTES: Record<string, string[]> = {
  'super_admin': ['/dashboards/super-admin'],
  'admin': ['/dashboards/super-admin'],
  'finance_admin': ['/dashboards/super-admin'],
  'trust_safety_admin': ['/dashboards/super-admin'],
  'support_admin': ['/dashboards/super-admin'],
  'read_only_admin': ['/dashboards/super-admin'],
  'vendor': ['/dashboards/vendor'],
  'customer': ['/dashboards/user'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === 'development';
  
  // Only protect dashboard routes
  if (!pathname.startsWith('/dashboards')) {
    return NextResponse.next();
  }

  // Get token from cookies or headers
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  // If no token, redirect to login
  if (!token) {
    if (isDev) {
      return NextResponse.next();
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Parse user from cookie (in production, verify JWT here)
  try {
    const userCookie = request.cookies.get('user')?.value;
    if (!userCookie) {
      throw new Error('No user cookie');
    }
    
    const user = JSON.parse(userCookie);
    const userRole = user.role;
    
    // Check if user has access to this route
    const allowedRoutes = ROLE_ROUTES[userRole] || [];
    const hasAccess = allowedRoutes.some(route => pathname.startsWith(route));
    
    if (!hasAccess) {
      // Redirect to their appropriate dashboard
      const redirectRoute = allowedRoutes[0] || '/';
      return NextResponse.redirect(new URL(redirectRoute, request.url));
    }
    
    // Add tenant header for API calls
    const response = NextResponse.next();
    if (user.tenantId) {
      response.headers.set('x-tenant-id', user.tenantId);
    }
    
    return response;
    
  } catch (error) {
    if (isDev) {
      return NextResponse.next();
    }

    // Invalid or expired session, clear cookies and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    response.cookies.delete('user');
    return response;
  }
}

// Match dashboard routes
export const config = {
  matcher: [
    '/dashboards/:path*',
  ],
};
