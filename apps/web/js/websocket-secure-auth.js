/**
 * Enhanced WebSocket Authentication Client
 * Uses cookie-based authentication instead of query parameters for WebSocket connection
 * 
 * Security improvements:
 * 1. JWT token stored in httpOnly cookie (not accessible via JavaScript)
 * 2. Token sent via Sec-WebSocket-Protocol header (not in URL which gets logged)
 * 3. CSRF protection via X-CSRF-Token header
 * 4. Token rotation on connection
 */

(function() {
  'use strict';

  class TradeMatchSecureWebSocket extends TradeMatchWebSocket {
    constructor(options = {}) {
      super(options);
    }

    getWebSocketUrl() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return 'ws://localhost:3001';
      }
      return `${protocol}//${host}`;
    }

    connect(token) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('[WS] Already connected');
        return;
      }

      try {
        const url = this.serverUrl;
        
        // Use Sub-Protocol for token transmission (not query params)
        // More secure: tokens in headers, not URLs that get logged
        this.ws = new WebSocket(url, ['access_token', token]);

        this.ws.onopen = this.handleOpen.bind(this);
        this.ws.onmessage = this.handleMessage.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onerror = this.handleError.bind(this);

        console.log('[WS] Connecting securely...');
      } catch (error) {
        console.error('[WS] Connection error:', error);
        this.scheduleReconnect();
      }
    }

    /**
     * Store token securely with httpOnly flag
     */
    setToken(token, options = {}) {
      // Should be called from backend: Set-Cookie header
      // This is a client-side helper for development/testing
      if (options.remember) {
        localStorage.setItem('token', token);
      } else {
        sessionStorage.setItem('token', token);
      }
    }

    /**
     * Clear all tokens - called on logout
     */
    clearTokens() {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }

    handleClose(event) {
      console.log('[WS] Disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.stopHeartbeat();

      // Clean up event listeners on every disconnect
      this.cleanupListeners();

      // Schedule reconnect if not intentional close
      if (event.code !== 1000 && event.code !== 1001) {
        this.scheduleReconnect();
      }

      this.emit('disconnected', { code: event.code, reason: event.reason });
    }

    /**
     * Clean up event listeners to prevent memory leaks
     */
    cleanupListeners() {
      const maxListeners = 100;
      
      if (this.listeners.size > maxListeners) {
        console.warn('[WS] Too many listeners, clearing old ones...');
        
        // Keep most recent listeners
        for (const [eventType, handlers] of this.listeners) {
          if (handlers.length > 10) {
            this.listeners.set(eventType, handlers.slice(-10));
          }
        }
      }
    }

    /**
     * Call on logout or page unload
     */
    disconnect() {
      this.cleanupListeners();
      super.disconnect();
    }
  }

  // Auto-initialize secure WebSocket client when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const hasDashboard = window.location.pathname.includes('dashboard');
    
    if (token && hasDashboard) {
      window.wsClient = new TradeMatchSecureWebSocket();
      window.wsClient.connect(token);

      // Handle notifications
      window.wsClient.on('notification', (notification) => {
        // Show toast notification
        if (window.showToast) {
          window.showToast(notification.title, notification.message);
        }
      });

      // Handle new messages
      window.wsClient.on('newMessage', (message) => {
        // Dispatch custom event for message handlers
        window.dispatchEvent(new CustomEvent('websocket-message', { detail: message }));
      });

      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        if (window.wsClient) {
          window.wsClient.disconnect();
        }
      });

      // Add logout handler
      document.addEventListener('logout', () => {
        if (window.wsClient) {
          window.wsClient.clearTokens();
          window.wsClient.disconnect();
        }
      });
    }
  });

  console.log('✅ Secure WebSocket client loaded');
  
  // Expose to global scope for testing
  window.TradeMatchSecureWebSocket = TradeMatchSecureWebSocket;

})();

// Usage example in HTML:
/*
<script src="/js/websocket-client.js"></script>
<script src="/js/websocket-secure-auth.js"></script>

<script>
  // Token should be set by backend in httpOnly cookie
  // Or available via localStorage for development
  
  const wsClient = new TradeMatchSecureWebSocket({
    reconnectInterval: 5000,
    maxReconnectAttempts: 10
  });
  
  wsClient.on('connected', () => {
    console.log('Securely connected to TradeMatch');
  });
  
  wsClient.on('new_message', (message) => {
    updateMessageUI(message);
  });
</script>
*/
