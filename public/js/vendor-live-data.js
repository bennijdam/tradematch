/**
 * Vendor Dashboard Live Data Connector
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
      dashboard: '/vendor/dashboard',
      profile: '/vendor/profile',
      availableQuotes: '/vendor/available-quotes',
      myBids: '/vendor/my-bids',
      earnings: '/vendor/earnings',
      reviews: '/vendor/reviews',
      leads: '/vendor/leads/accepted',
      overview: '/vendor/overview',
      credits: (vendorId) => `/vendor-credits/balance/${vendorId}`,
      transactions: (vendorId) => `/vendor-credits/transactions/${vendorId}`
    }
  };

  // State management
  let vendorData = null;
  let dashboardData = null;
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
        // Token expired, redirect to login
        window.AuthGuard?.logout?.();
        throw new Error('Session expired');
      }
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch vendor dashboard data
   */
  async function fetchDashboardData() {
    try {
      const data = await apiRequest(API_CONFIG.endpoints.dashboard);
      dashboardData = data;
      return data;
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      return null;
    }
  }

  /**
   * Fetch vendor profile
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
   * Fetch available quotes/leads
   */
  async function fetchAvailableQuotes() {
    try {
      const data = await apiRequest(API_CONFIG.endpoints.availableQuotes);
      return data;
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      return null;
    }
  }

  /**
   * Fetch vendor bids
   */
  async function fetchMyBids() {
    try {
      const data = await apiRequest(API_CONFIG.endpoints.myBids);
      return data;
    } catch (error) {
      console.error('Failed to fetch bids:', error);
      return null;
    }
  }

  /**
   * Fetch earnings data
   */
  async function fetchEarnings() {
    try {
      const data = await apiRequest(API_CONFIG.endpoints.earnings);
      return data;
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
      return null;
    }
  }

  /**
   * Fetch reviews
   */
  async function fetchReviews() {
    try {
      const data = await apiRequest(API_CONFIG.endpoints.reviews);
      return data;
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      return null;
    }
  }

  /**
   * Fetch credits balance
   */
  async function fetchCreditsBalance() {
    const user = getCurrentUser();
    if (!user?.id) return null;

    try {
      const data = await apiRequest(API_CONFIG.endpoints.credits(user.id));
      return data;
    } catch (error) {
      console.error('Failed to fetch credits:', error);
      return null;
    }
  }

  /**
   * Fetch all vendor data at once
   */
  async function fetchAllVendorData() {
    if (isLoading) return;
    isLoading = true;

    try {
      const [dashboard, profile, quotes, bids, earnings, reviews, credits] = await Promise.all([
        fetchDashboardData(),
        fetchProfile(),
        fetchAvailableQuotes(),
        fetchMyBids(),
        fetchEarnings(),
        fetchReviews(),
        fetchCreditsBalance()
      ]);

      vendorData = {
        dashboard: dashboard?.vendor || dashboard,
        profile,
        quotes,
        bids,
        earnings,
        reviews,
        credits
      };

      // Dispatch event for dashboard update
      window.dispatchEvent(new CustomEvent('vendor-data-updated', { 
        detail: vendorData 
      }));

      return vendorData;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Transform API data to dashboard view format
   */
  function transformToViewData(viewName, data) {
    if (!data) return null;

    const { dashboard, profile, quotes, bids, earnings, reviews, credits } = data;

    switch (viewName) {
      case 'analytics':
        return {
          title: 'Vendor Analytics',
          subtitle: 'Lead generation and pipeline control',
          metrics: [
            ['Quotes Viewed', dashboard?.quotesViewed?.toString() || '0', dashboard?.quotesTrend || '0%'],
            ['Bids Submitted', dashboard?.bidsSubmitted?.toString() || '0', dashboard?.bidsTrend || '0%'],
            ['Jobs Won', dashboard?.jobsWon?.toString() || '0', dashboard?.winRate > 25 ? 'Strong' : 'Improving'],
            ['Win Rate', `${dashboard?.winRate?.toString() || '0'}%`, 'Industry avg 25%']
          ],
          rows: (earnings?.monthly || []).map(m => [
            m.month,
            `£${m.revenue?.toLocaleString() || '0'}`,
            m.trend > 0 ? '↑' : m.trend < 0 ? '↓' : '→'
          ]),
          sideItems: (dashboard?.services || []).map(s => [s.name, `${s.winRate}%`])
        };

      case 'new-leads':
        return {
          title: 'New Leads',
          subtitle: 'Fresh inbound jobs to review',
          metrics: [
            ['New Leads', quotes?.new?.toString() || '0', 'Today'],
            ['Urgent', quotes?.urgent?.toString() || '0', 'Requires reply'],
            ['Avg Lead Cost', `£${quotes?.avgCost?.toString() || '0'}`, 'Per lead'],
            ['Balance', credits?.available?.toString() || '0', credits?.low ? 'Low' : 'Good']
          ],
          rows: (quotes?.leads || []).slice(0, 5).map(lead => [
            lead.title,
            lead.location,
            lead.timeAgo
          ]),
          sideItems: [
            ['Quote now', quotes?.quotable?.toString() || '0'],
            ['View details', quotes?.new?.toString() || '0'],
            ['Top up balance', credits?.low ? 'Recommended' : 'Not needed']
          ]
        };

      case 'active-quotes':
        return {
          title: 'Active Quotes',
          subtitle: 'Quotes awaiting customer decision',
          metrics: [
            ['Total Active', bids?.active?.toString() || '0', bids?.trend || '0%'],
            ['Viewed by Customer', bids?.viewed?.toString() || '0', `${Math.round((bids?.viewed / bids?.active) * 100) || 0}%`],
            ['Avg Response Time', `${bids?.avgResponseTime?.toString() || '0'}d`, bids?.responseTrend || '0%'],
            ['Estimated Value', `£${(bids?.totalValue / 1000)?.toFixed(1) || '0'}k`, bids?.valueTrend || '0%']
          ],
          rows: (bids?.items || []).slice(0, 5).map(bid => [
            bid.jobTitle,
            bid.status,
            bid.action
          ]),
          sideItems: [
            ['High value', bids?.highValue?.toString() || '0'],
            ['Needs follow-up', bids?.needsFollowUp?.toString() || '0'],
            ['Likely win', bids?.likelyWin?.toString() || '0']
          ]
        };

      case 'messages':
        return {
          title: 'Messages',
          subtitle: 'Conversations with customers',
          metrics: [
            ['Unread', dashboard?.unreadMessages?.toString() || '0', dashboard?.criticalMessages > 0 ? `${dashboard.criticalMessages} critical` : ''],
            ['Threads', dashboard?.activeThreads?.toString() || '0', 'Active'],
            ['Sent today', dashboard?.messagesSent?.toString() || '0', 'Good cadence'],
            ['Avg response', `${dashboard?.avgResponseTime?.toString() || '0'}m`, dashboard?.responseSpeed || 'Fast']
          ],
          rows: (dashboard?.conversations || []).slice(0, 5).map(conv => [
            conv.title,
            conv.status,
            conv.timeAgo
          ]),
          sideItems: [
            ['Unread now', dashboard?.unreadMessages?.toString() || '0'],
            ['Awaiting files', dashboard?.awaitingFiles?.toString() || '0'],
            ['Escalations', dashboard?.escalations?.toString() || '0']
          ]
        };

      case 'profile':
        return {
          title: 'Business Profile',
          subtitle: 'Public profile and trust signals',
          metrics: [
            ['Profile Score', `${profile?.score?.toString() || '0'}%`, profile?.score > 80 ? 'Good' : 'Needs work'],
            ['Reviews', reviews?.total?.toString() || '0', `+${reviews?.newThisMonth || 0} this month`],
            ['Avg Rating', reviews?.average?.toString() || '0', reviews?.average > 4.5 ? 'Top tier' : 'Improving'],
            ['Trust Badges', profile?.badges?.toString() || '0', 'Verified']
          ],
          rows: [
            ['Business details', profile?.businessComplete ? 'Complete' : 'Incomplete', profile?.lastUpdated || ''],
            ['Insurance docs', profile?.insuranceValid ? 'Valid' : 'Expired', profile?.insuranceExpiry || ''],
            ['Gallery items', `${profile?.galleryCount?.toString() || '0'} photos`, profile?.galleryUpdated || '']
          ],
          sideItems: [
            ['Add certifications', profile?.needsCertifications ? '1' : '0'],
            ['Upload recent project', profile?.needsGallery ? '1' : '0'],
            ['Update availability', profile?.availabilityUpdated || 'Today']
          ]
        };

      case 'settings':
        return {
          title: 'Settings',
          subtitle: 'Account preferences and controls',
          metrics: [
            ['Security', profile?.securityStatus || 'Strong', profile?.twoFactorEnabled ? '2FA on' : '2FA off'],
            ['Alerts', profile?.alertRules?.toString() || '0', 'Configured'],
            ['Service Areas', profile?.serviceAreas?.toString() || '0', 'Active'],
            ['Integrations', profile?.integrations?.toString() || '0', 'Connected']
          ],
          rows: [
            ['Account', profile?.accountActive ? 'Active' : 'Inactive', 'Configured'],
            ['Business Profile', profile?.profileActive ? 'Active' : 'Inactive', 'Configured'],
            ['Verification', profile?.verificationStatus || 'Pending review', 'Action needed']
          ],
          sideItems: [
            ['Verification docs', profile?.verificationStatus || 'Pending'],
            ['Notification tune', 'Recommended'],
            ['Billing defaults', 'Set']
          ]
        };

      case 'billing':
        return {
          title: 'Billing',
          subtitle: 'Plan, credits, and invoices',
          metrics: [
            ['Current Balance', `£${credits?.balance?.toString() || '0'}`, 'After charges'],
            ['Monthly Spend', `£${credits?.monthlySpend?.toString() || '0'}`, 'This cycle'],
            ['Plan', credits?.plan || 'Basic', `Renews in ${credits?.renewsIn || 'N/A'}d`],
            ['Invoices', credits?.invoices?.toString() || '0', 'Available']
          ],
          rows: (credits?.transactions || []).slice(0, 5).map(t => [
            t.description,
            t.status,
            `£${t.amount?.toString() || '0'}`
          ]),
          sideItems: [
            ['Low balance risk', credits?.lowBalanceRisk || 'Low'],
            ['Auto top-up', credits?.autoTopUp ? 'On' : 'Off'],
            ['Payment method', credits?.paymentMethod || 'None']
          ]
        };

      default:
        return null;
    }
  }

  /**
   * Update dashboard with live data
   */
  function updateDashboard(viewName) {
    if (!vendorData) return;

    const viewData = transformToViewData(viewName, vendorData);
    if (!viewData) return;

    // Post message to parent window (dashboard iframe)
    window.parent.postMessage({
      type: 'dashboard-native-data',
      role: 'vendor',
      view: viewName,
      payload: viewData
    }, '*');
  }

  /**
   * Start auto-refresh
   */
  function startAutoRefresh(intervalMinutes = 2) {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    refreshInterval = setInterval(() => {
      fetchAllVendorData();
    }, intervalMinutes * 60 * 1000);
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
    // Wait for auth guard to complete
    if (!window.AuthGuard) {
      console.warn('AuthGuard not loaded');
      return;
    }

    // Fetch initial data
    await fetchAllVendorData();

    // Start auto-refresh every 2 minutes
    startAutoRefresh(2);

    // Listen for view changes
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data?.type === 'vendor-native-nav' && data?.view) {
        updateDashboard(data.view);
      }
    });

    // Listen for data update events
    window.addEventListener('vendor-data-updated', (event) => {
      // Refresh current view
      const currentView = new URLSearchParams(window.location.search).get('view') || 'analytics';
      updateDashboard(currentView);
    });

    console.log('[VendorLiveData] Initialized');
  }

  // Expose API globally
  window.VendorLiveData = {
    fetchAllVendorData,
    fetchDashboardData,
    fetchProfile,
    fetchAvailableQuotes,
    fetchMyBids,
    fetchEarnings,
    fetchReviews,
    fetchCreditsBalance,
    updateDashboard,
    transformToViewData,
    startAutoRefresh,
    stopAutoRefresh,
    getVendorData: () => vendorData
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
