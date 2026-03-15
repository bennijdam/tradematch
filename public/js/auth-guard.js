/**
 * Auth Guard for TradeMatch Dashboards
 * Ensures only authenticated users with proper roles can access dashboard pages
 * @version 1.0.0
 */

(function() {
  'use strict';

  // Configuration
  const AUTH_CONFIG = {
    tokenKey: 'tradematch_token',
    refreshTokenKey: 'tradematch_refresh_token',
    userKey: 'tradematch_user',
    apiUrl: window.location.hostname === 'localhost' 
      ? 'http://localhost:3001/api'
      : 'https://api.tradematch.uk',
    loginUrl: '/login.html',
    unauthorizedUrl: '/unauthorized.html',
    tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
    allowedRoles: {
      vendor: ['vendor'],
      customer: ['customer', 'user'],
      admin: ['admin', 'super_admin', 'finance_admin', 'trust_safety_admin', 'support_admin', 'read_only_admin']
    }
  };

  /**
   * Get stored token from localStorage
   */
  function getToken() {
    try {
      return localStorage.getItem(AUTH_CONFIG.tokenKey);
    } catch (e) {
      return null;
    }
  }

  /**
   * Get stored refresh token
   */
  function getRefreshToken() {
    try {
      return localStorage.getItem(AUTH_CONFIG.refreshTokenKey);
    } catch (e) {
      return null;
    }
  }

  /**
   * Get stored user data
   */
  function getUser() {
    try {
      const userData = localStorage.getItem(AUTH_CONFIG.userKey);
      return userData ? JSON.parse(userData) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Clear all auth data
   */
  function clearAuth() {
    try {
      localStorage.removeItem(AUTH_CONFIG.tokenKey);
      localStorage.removeItem(AUTH_CONFIG.refreshTokenKey);
      localStorage.removeItem(AUTH_CONFIG.userKey);
    } catch (e) {
      console.error('Failed to clear auth:', e);
    }
  }

  /**
   * Decode JWT token payload (without verification)
   */
  function decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  function isTokenExpired(token) {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    // Check if token expires within threshold
    const expiryTime = decoded.exp * 1000;
    return Date.now() >= (expiryTime - AUTH_CONFIG.tokenRefreshThreshold);
  }

  /**
   * Check if token is completely expired (not within refresh window)
   */
  function isTokenFullyExpired(token) {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const expiryTime = decoded.exp * 1000;
    return Date.now() >= expiryTime;
  }

  /**
   * Refresh access token using refresh token
   */
  async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${AUTH_CONFIG.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(AUTH_CONFIG.tokenKey, data.token);
        if (data.refreshToken) {
          localStorage.setItem(AUTH_CONFIG.refreshTokenKey, data.refreshToken);
        }
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  /**
   * Verify token with backend
   */
  async function verifyToken(token) {
    try {
      const response = await fetch(`${AUTH_CONFIG.apiUrl}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { valid: true, user: data };
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    }

    return { valid: false, user: null };
  }

  /**
   * Determine dashboard type from URL
   */
  function getDashboardType() {
    const path = window.location.pathname.toLowerCase();
    
    if (path.includes('vendor') || path.includes('tradesperson')) {
      return 'vendor';
    }
    if (path.includes('admin') || path.includes('super-admin')) {
      return 'admin';
    }
    if (path.includes('customer') || path.includes('user')) {
      return 'customer';
    }
    
    // Default fallback
    return 'customer';
  }

  /**
   * Check if user has required role for dashboard
   */
  function hasRequiredRole(userRole, dashboardType) {
    const allowed = AUTH_CONFIG.allowedRoles[dashboardType] || [];
    return allowed.includes(userRole);
  }

  /**
   * Redirect to login page
   */
  function redirectToLogin(returnUrl) {
    const redirect = returnUrl || encodeURIComponent(window.location.href);
    window.location.href = `${AUTH_CONFIG.loginUrl}?redirect=${redirect}`;
  }

  /**
   * Redirect to unauthorized page
   */
  function redirectToUnauthorized() {
    window.location.href = AUTH_CONFIG.unauthorizedUrl;
  }

  /**
   * Show auth error message
   */
  function showAuthError(message) {
    // Create error overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(10, 14, 20, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: 'Archivo', sans-serif;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: #1E2430;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 400px;
    `;
    
    content.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
      <h2 style="color: #fff; margin: 0 0 12px; font-size: 24px;">Authentication Required</h2>
      <p style="color: #9CA3AF; margin: 0 0 24px; font-size: 14px; line-height: 1.6;">${message}</p>
      <button onclick="window.location.href='${AUTH_CONFIG.loginUrl}'" style="
        background: linear-gradient(135deg, #007a3d, #00c268);
        color: #fff;
        border: none;
        padding: 14px 32px;
        border-radius: 100px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
      ">Go to Login</button>
    `;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
  }

  /**
   * Main auth check function
   */
  async function checkAuth() {
    const token = getToken();
    const dashboardType = getDashboardType();
    
    // No token found
    if (!token) {
      console.log('[AuthGuard] No token found, redirecting to login');
      redirectToLogin();
      return false;
    }

    // Token is fully expired
    if (isTokenFullyExpired(token)) {
      console.log('[AuthGuard] Token fully expired, attempting refresh');
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        clearAuth();
        redirectToLogin();
        return false;
      }
      // Continue with new token
      return checkAuth();
    }

    // Token needs refresh (within threshold)
    if (isTokenExpired(token)) {
      console.log('[AuthGuard] Token expiring soon, refreshing...');
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        console.log('[AuthGuard] Refresh failed, continuing with current token');
      }
    }

    // Verify token with backend
    const verification = await verifyToken(token);
    
    if (!verification.valid) {
      console.log('[AuthGuard] Token verification failed');
      clearAuth();
      redirectToLogin();
      return false;
    }

    // Check role authorization
    const user = verification.user;
    const userRole = user.role || user.userType;
    
    if (!hasRequiredRole(userRole, dashboardType)) {
      console.log(`[AuthGuard] User role '${userRole}' not allowed for ${dashboardType} dashboard`);
      showAuthError(`You don't have permission to access this area. Your role (${userRole}) is not authorized for the ${dashboardType} dashboard.`);
      return false;
    }

    // Store updated user data
    localStorage.setItem(AUTH_CONFIG.userKey, JSON.stringify(user));
    
    console.log('[AuthGuard] Authentication successful');
    return true;
  }

  /**
   * Get auth headers for API requests
   */
  function getAuthHeaders() {
    const token = getToken();
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Logout function
   */
  async function logout() {
    const token = getToken();
    
    // Notify backend (optional)
    if (token) {
      try {
        await fetch(`${AUTH_CONFIG.apiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        // Ignore logout errors
      }
    }
    
    clearAuth();
    redirectToLogin();
  }

  /**
   * Setup automatic token refresh
   */
  function setupTokenRefresh() {
    // Check token every minute
    setInterval(async () => {
      const token = getToken();
      if (token && isTokenExpired(token)) {
        console.log('[AuthGuard] Auto-refreshing token...');
        await refreshAccessToken();
      }
    }, 60 * 1000);
  }

  /**
   * Add logout button to dashboard
   */
  function addLogoutButton() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addLogoutButton);
      return;
    }

    // Find header or nav area
    const header = document.querySelector('.top-nav, .header, nav, .sidebar');
    if (!header) return;

    // Check if logout already exists
    if (header.querySelector('.logout-btn')) return;

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'logout-btn';
    logoutBtn.innerHTML = 'Logout';
    logoutBtn.style.cssText = `
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #9CA3AF;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      margin-left: 12px;
    `;
    logoutBtn.onclick = logout;

    header.appendChild(logoutBtn);
  }

  // Initialize
  async function init() {
    // Skip auth check for login/register pages
    const path = window.location.pathname.toLowerCase();
    if (path.includes('login') || path.includes('register') || path.includes('forgot-password')) {
      return;
    }

    const isAuthorized = await checkAuth();
    
    if (isAuthorized) {
      setupTokenRefresh();
      addLogoutButton();
    }
  }

  // Expose API
  window.AuthGuard = {
    checkAuth,
    getToken,
    getRefreshToken,
    getUser,
    getAuthHeaders,
    logout,
    refreshAccessToken,
    hasRequiredRole,
    decodeToken,
    isTokenExpired,
    isTokenFullyExpired
  };

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
