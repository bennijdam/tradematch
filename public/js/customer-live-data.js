/**
 * Customer Dashboard Live Data Connector
 * Fetches real-time data from TradeMatch backend API
 * @version 1.0.0
 */

(function() {
  'use strict';

  // API Configuration
  const API_CONFIG = {
    baseUrl: window.location.hostname === 'localhost' 
      ? 'http://localhost:3001/api'
      : 'https://api.tradematch.uk/api',
    endpoints: {
      dashboard: '/customer/dashboard',
      quotes: '/customer/quotes',
      messages: '/customer/messages',
      savedTrades: '/customer/saved-trades',
      notifications: '/customer/notifications',
      profile: '/customer/profile',
      payments: '/customer/payments'
    }
  };

  // State management
  let customerData = null;
  let isLoading = false;
  let refreshInterval = null;

  /**
   * Get auth token from localStorage
   */
  function getAuthToken() {
    return localStorage.getItem('tradematch_token');
  }

  /**
   * Get current user data
   */
  function getCurrentUser() {
    try {
      const userData = localStorage.getItem('tradematch_user');
      return userData ? JSON.parse(userData) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Make authenticated API request
   */
  async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.AuthGuard?.logout?.();
        throw new Error('Session expired');
      }
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch customer dashboard data
   */
  async function fetchDashboardData() {
    try {
      const data = await apiRequest(API_CONFIG.endpoints.dashboard);
      return data;
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      return null;
    }
  }

  /**
   * Fetch customer quotes
   */
  async function fetchQuotes() {
    try {
      const data = await apiRequest(API_CONFIG.endpoints.quotes);
      return data;
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      return null;
    }
  }

  /**
   * Fetch messages
   */
  async function fetchMessages() {
    try {
      const data = await apiRequest(API_CONFIG.endpoints.messages);
      return data;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return null;
    }
  }

  /**
   * Fetch saved trades
   */
  async function fetchSavedTrades() {
    try {
      const data = await apiRequest(API_CONFIG.endpoints.savedTrades);
      return data;
    } catch (error) {
      console.error('Failed to fetch saved trades:', error);
      return null;
    }
  }

  /**
   * Fetch notifications
   */
  async function fetchNotifications() {
    try {
      const data = await apiRequest(API_CONFIG.endpoints.notifications);
      return data;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return null;
    }
  }

  /**
   * Fetch profile
   */
  async function fetchProfile() {
    try {
      const data = await apiRequest(API_CONFIG.endpoints.profile);
      return data;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }
  }

  /**
   * Fetch payments
   */
  async function fetchPayments() {
    try {
      const data = await apiRequest(API_CONFIG.endpoints.payments);
      return data;
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      return null;
    }
  }

  /**
   * Fetch all customer data
   */
  async function fetchAllCustomerData() {
    if (isLoading) return;
    isLoading = true;

    try {
      const [dashboard, quotes, messages, savedTrades, notifications, profile, payments] = await Promise.all([
        fetchDashboardData(),
        fetchQuotes(),
        fetchMessages(),
        fetchSavedTrades(),
        fetchNotifications(),
        fetchProfile(),
        fetchPayments()
      ]);

      customerData = {
        dashboard,
        quotes,
        messages,
        savedTrades,
        notifications,
        profile,
        payments
      };

      window.dispatchEvent(new CustomEvent('customer-data-updated', { 
        detail: customerData 
      }));

      return customerData;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Transform API data to dashboard view format
   */
  function transformToViewData(viewName, data) {
    if (!data) return null;

    const { dashboard, quotes, messages, savedTrades, notifications, profile, payments } = data;
    const stats = dashboard?.data?.stats || {};

    switch (viewName) {
      case 'dashboard':
        return {
          title: 'Dashboard',
          subtitle: 'Customer workspace',
          metrics: [
            ['Active Jobs', stats?.open_quotes?.toString() || '0', '+1 this week'],
            ['Quotes Received', stats?.total_quotes?.toString() || '0', '+2 today'],
            ['Unread Messages', messages?.unread?.toString() || '0', 'Needs response'],
            ['Pending Reviews', dashboard?.pendingReviews?.toString() || '0', 'Due this week']
          ],
          rows: (dashboard?.data?.recentActivity || []).slice(0, 5).map(activity => [
            activity.quote_title,
            activity.type === 'bid' ? 'New' : 'Open',
            activity.timeAgo || 'Just now'
          ]),
          sideText: 'Compare kitchen quotes and shortlist two vendors before Friday.'
        };

      case 'my-jobs':
        return {
          title: 'My Jobs',
          subtitle: 'Track progress and milestones',
          metrics: [
            ['Open Jobs', stats?.open_quotes?.toString() || '0', '1 urgent'],
            ['In Progress', dashboard?.inProgress?.toString() || '0', 'On track'],
            ['Completed', stats?.completed_jobs?.toString() || '0', '+1 this month'],
            ['Archived', dashboard?.archived?.toString() || '0', 'History']
          ],
          rows: (quotes?.quotes || []).slice(0, 5).map(q => [
            q.title,
            q.status,
            q.created_at
          ]),
          sideText: 'Update the bathroom brief to include fixture preference before new quotes arrive.'
        };

      case 'quotes':
        return {
          title: 'Quotes',
          subtitle: 'Compare vendor offers',
          metrics: [
            ['New Quotes', quotes?.quotes?.filter(q => q.status === 'open').length?.toString() || '0', 'This week'],
            ['Pending Decision', dashboard?.pendingDecision?.toString() || '0', '3 days left'],
            ['Avg Quote', `£${dashboard?.avgQuote?.toString() || '0'}`, 'Per job'],
            ['Best Value', dashboard?.bestValueVendor?.toString() || 'TBD', 'Top rated']
          ],
          rows: (quotes?.quotes || []).slice(0, 5).map(q => [
            q.title,
            `${q.bid_count || 0} bids`,
            q.lowest_bid ? `From £${q.lowest_bid}` : 'No bids yet'
          ]),
          sideText: 'Shortlist 2-3 vendors and request detailed breakdowns before deciding.'
        };

      case 'messages':
        return {
          title: 'Messages',
          subtitle: 'Chat with shortlisted vendors',
          metrics: [
            ['Unread', messages?.unread?.toString() || '0', 'Needs reply'],
            ['Active Threads', messages?.threads?.toString() || '0', 'Ongoing'],
            ['Sent Today', messages?.sentToday?.toString() || '0', 'Good engagement'],
            ['Avg Response', `${messages?.avgResponseTime?.toString() || '0'}h`, 'Fast']
          ],
          rows: (messages?.conversations || []).slice(0, 5).map(m => [
            m.vendor_name,
            m.unread ? 'Unread' : 'Read',
            m.lastMessage
          ]),
          sideText: 'Reply to Bob about the start date for the garden project.'
        };

      case 'saved-trades':
        return {
          title: 'Saved Trades',
          subtitle: 'Preferred vendors and teams',
          metrics: [
            ['Saved Vendors', savedTrades?.vendors?.length?.toString() || '0', 'Favourites'],
            ['Top Rated', savedTrades?.topRated?.toString() || '0', '4.8+ stars'],
            ['Verified', savedTrades?.verified?.toString() || '0', 'Insurance valid'],
            ['Local', savedTrades?.local?.toString() || '0', 'Within 5 miles']
          ],
          rows: (savedTrades?.vendors || []).slice(0, 5).map(v => [
            v.company_name,
            `${v.rating} stars`,
            v.trade_category
          ]),
          sideText: 'Contact Green Gardens Ltd for the upcoming patio project.'
        };

      case 'notifications':
        return {
          title: 'Notifications',
          subtitle: 'Alerts and updates',
          metrics: [
            ['Unread', notifications?.unread?.toString() || '0', 'Action needed'],
            ['Today', notifications?.today?.toString() || '0', 'New alerts'],
            ['This Week', notifications?.thisWeek?.toString() || '0', 'Total'],
            ['Important', notifications?.important?.toString() || '0', 'High priority']
          ],
          rows: (notifications?.items || []).slice(0, 5).map(n => [
            n.message,
            n.type,
            n.timeAgo
          ]),
          sideText: 'Review the quote expiration notice for the bathroom renovation.'
        };

      case 'billing':
        return {
          title: 'Billing',
          subtitle: 'Invoices and payment methods',
          metrics: [
            ['Total Spent', `£${stats?.total_spent?.toString() || '0'}`, 'All time'],
            ['This Month', `£${payments?.thisMonth?.toString() || '0'}`, 'Current'],
            ['Payment Methods', payments?.methods?.length?.toString() || '0', 'Saved'],
            ['Invoices', payments?.invoices?.toString() || '0', 'Available']
          ],
          rows: (payments?.transactions || []).slice(0, 5).map(t => [
            t.description,
            t.status,
            `£${t.amount}`
          ]),
          sideText: 'Update your payment method before the next project milestone.'
        };

      case 'settings':
        return {
          title: 'Settings',
          subtitle: 'Account and preferences',
          metrics: [
            ['Security', profile?.securityStatus || 'Strong', '2FA enabled'],
            ['Notifications', profile?.notificationsEnabled?.toString() || '0', 'Active'],
            ['Addresses', profile?.addresses?.toString() || '0', 'Saved'],
            ['Preferences', profile?.preferencesSet?.toString() || '0', 'Configured']
          ],
          rows: [
            ['Account', profile?.accountActive ? 'Active' : 'Inactive', 'Verified'],
            ['Email', profile?.emailVerified ? 'Verified' : 'Unverified', 'Primary'],
            ['Phone', profile?.phoneVerified ? 'Verified' : 'Unverified', 'Contact']
          ],
          sideText: 'Update your notification preferences for job alerts.'
        };

      default:
        return null;
    }
  }

  /**
   * Update dashboard with live data
   */
  function updateDashboard(viewName) {
    if (!customerData) return;

    const viewData = transformToViewData(viewName, customerData);
    if (!viewData) return;

    window.parent.postMessage({
      type: 'dashboard-native-data',
      role: 'customer',
      view: viewName,
      payload: viewData
    }, '*');
  }

  /**
   * Start auto-refresh
   */
  function startAutoRefresh(intervalMinutes = 2) {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(fetchAllCustomerData, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop auto-refresh
   */
  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  /**
   * Initialize live data
   */
  async function init() {
    if (!window.AuthGuard) {
      console.warn('AuthGuard not loaded');
      return;
    }

    await fetchAllCustomerData();
    startAutoRefresh(2);

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data?.type === 'customer-native-nav' && data?.view) {
        updateDashboard(data.view);
      }
    });

    window.addEventListener('customer-data-updated', () => {
      const currentView = new URLSearchParams(window.location.search).get('view') || 'dashboard';
      updateDashboard(currentView);
    });

    console.log('[CustomerLiveData] Initialized');
  }

  // Expose API globally
  window.CustomerLiveData = {
    fetchAllCustomerData,
    fetchDashboardData,
    fetchQuotes,
    fetchMessages,
    fetchSavedTrades,
    fetchNotifications,
    fetchProfile,
    fetchPayments,
    updateDashboard,
    transformToViewData,
    startAutoRefresh,
    stopAutoRefresh,
    getCustomerData: () => customerData
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
