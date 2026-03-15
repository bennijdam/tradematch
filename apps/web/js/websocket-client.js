/**
 * TradeMatch WebSocket Client
 * Provides real-time messaging and notifications for dashboards
 */

class TradeMatchWebSocket {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || this.getWebSocketUrl();
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    
    this.ws = null;
    this.reconnectAttempts = 0;
    this.isConnected = false;
    this.listeners = new Map();
    this.currentConversationId = null;
    this.userId = null;
    
    // Bind methods
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // In production, use the same host. In development, use localhost:3001
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
      // Connect with token in query params
      const url = `${this.serverUrl}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(url);
      
      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;
      
      console.log('[WS] Connecting...');
    } catch (error) {
      console.error('[WS] Connection error:', error);
      this.scheduleReconnect();
    }
  }

  handleOpen(event) {
    console.log('[WS] Connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Rejoin conversation if previously joined
    if (this.currentConversationId) {
      this.joinConversation(this.currentConversationId);
    }
    
    // Emit connection event
    this.emit('connected', { timestamp: new Date().toISOString() });
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('[WS] Received:', data.type, data);
      
      // Handle specific message types
      switch (data.type) {
        case 'connection':
          this.userId = data.userId;
          console.log('[WS] Authenticated as:', this.userId);
          break;
          
        case 'new_message':
          this.emit('newMessage', data.message);
          break;
          
        case 'typing':
          this.emit('typing', data);
          break;
          
      case 'message_read':
        this.emit('messageRead', data);
        break;

      case 'stats_update':
        this.emit('statsUpdate', data);
        break;

      case 'new_lead':
        this.emit('newLead', data.lead);
        break;

      case 'quote_update':
        this.emit('quoteUpdate', data.quote);
        break;

      case 'bid_update':
        this.emit('bidUpdate', data.bid);
        break;
          
        case 'notification':
          this.emit('notification', data.notification);
          break;
          
        case 'user_joined':
          this.emit('userJoined', data);
          break;
          
        case 'user_left':
          this.emit('userLeft', data);
          break;
          
        case 'user_online':
        case 'user_offline':
          this.emit('presence', data);
          break;
          
        case 'pong':
          // Heartbeat response
          break;
          
        case 'error':
          console.error('[WS] Server error:', data.message);
          this.emit('error', data);
          break;
          
        default:
          this.emit(data.type, data);
      }
    } catch (error) {
      console.error('[WS] Message parse error:', error);
    }
  }

  handleClose(event) {
    console.log('[WS] Disconnected:', event.code, event.reason);
    this.isConnected = false;
    this.stopHeartbeat();
    
    // Schedule reconnect if not intentional close
    if (event.code !== 1000 && event.code !== 1001) {
      this.scheduleReconnect();
    }
    
    this.emit('disconnected', { code: event.code, reason: event.reason });
  }

  handleError(error) {
    console.error('[WS] Error:', error);
    this.emit('error', { message: 'WebSocket error', error });
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WS] Max reconnection attempts reached');
      this.emit('reconnectFailed');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`[WS] Reconnecting in ${this.reconnectInterval}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      const token = this.getStoredToken();
      if (token) {
        this.connect(token);
      }
    }, this.reconnectInterval);
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, this.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Message sending methods
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    console.warn('[WS] Cannot send, not connected');
    return false;
  }

  joinConversation(conversationId) {
    this.currentConversationId = conversationId;
    return this.send({
      type: 'join_conversation',
      data: { conversationId }
    });
  }

  leaveConversation(conversationId) {
    this.currentConversationId = null;
    return this.send({
      type: 'leave_conversation',
      data: { conversationId }
    });
  }

  sendMessage(conversationId, body, messageType = 'text', attachments = []) {
    return this.send({
      type: 'send_message',
      data: {
        conversationId,
        body,
        messageType,
        attachments
      }
    });
  }

  sendTyping(conversationId, isTyping = true) {
    return this.send({
      type: 'typing',
      data: { conversationId, isTyping }
    });
  }

  markAsRead(messageId, conversationId) {
    return this.send({
      type: 'mark_read',
      data: { messageId, conversationId }
    });
  }

  // Event handling
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    
    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('[WS] Handler error:', error);
        }
      });
    }
  }

  // Disconnect
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    this.currentConversationId = null;
  }

  // Utility methods
  getStoredToken() {
    return localStorage.getItem('token') || 
           sessionStorage.getItem('token') || 
           this.getCookie('token');
  }

  getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  isOnline() {
    return this.isConnected;
  }

  getCurrentConversation() {
    return this.currentConversationId;
  }
}

// Create global instance
window.TradeMatchWebSocket = TradeMatchWebSocket;

// Auto-initialize if token exists
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token && window.location.pathname.includes('dashboard')) {
    window.wsClient = new TradeMatchWebSocket();
    window.wsClient.connect(token);
    
    // Handle notifications
    window.wsClient.on('notification', (notification) => {
      // Show toast notification
      if (window.showToast) {
        window.showToast(notification.title, notification.message);
      }
      
      // Update notification badge
      const badge = document.querySelector('.notification-badge');
      if (badge) {
        const count = parseInt(badge.textContent || '0') + 1;
        badge.textContent = count;
        badge.style.display = 'flex';
      }
    });
    
    // Handle new messages
    window.wsClient.on('newMessage', (message) => {
      // Dispatch custom event for message handlers
      window.dispatchEvent(new CustomEvent('websocket-message', { detail: message }));
    });
  }
});

console.log('✅ WebSocket client loaded');
