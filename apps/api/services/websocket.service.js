const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

class WebSocketService {
  constructor(server, pool) {
    this.wss = new WebSocket.Server({ server });
    this.pool = pool;
    this.clients = new Map(); // userId -> WebSocket
    this.conversations = new Map(); // conversationId -> Set(userIds)
    
    this.setupWebSocket();
    console.log('✅ WebSocket server initialized');
  }

  setupWebSocket() {
    this.wss.on('connection', async (ws, req) => {
      try {
        // Authenticate connection
        const user = await this.authenticateConnection(ws, req);
        if (!user) {
          ws.close(1008, 'Authentication failed');
          return;
        }

        // Store client connection
        this.clients.set(user.userId, ws);
        ws.userId = user.userId;
        ws.userRole = user.role;
        ws.isAlive = true;

        console.log(`🔌 User ${user.userId} connected via WebSocket`);

        // Send connection confirmation
        this.sendToClient(ws, {
          type: 'connection',
          status: 'connected',
          userId: user.userId,
          timestamp: new Date().toISOString()
        });

        // Setup message handlers
        ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data);
            await this.handleMessage(ws, user, message);
          } catch (error) {
            console.error('WebSocket message error:', error);
            this.sendToClient(ws, {
              type: 'error',
              message: 'Invalid message format'
            });
          }
        });

        // Setup heartbeat
        ws.on('pong', () => {
          ws.isAlive = true;
        });

        // Handle disconnection
        ws.on('close', () => {
          this.handleDisconnect(user.userId);
        });

        ws.on('error', (error) => {
          console.error(`WebSocket error for user ${user.userId}:`, error);
        });

      } catch (error) {
        console.error('WebSocket connection error:', error);
        ws.close(1011, 'Internal server error');
      }
    });

    // Start heartbeat interval
    this.startHeartbeat();
  }

  async authenticateConnection(ws, req) {
    try {
      // Get token from query params or headers
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token') || 
                   req.headers['sec-websocket-protocol'];

      if (!token) {
        return null;
      }

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify user still exists and is active
      const result = await this.pool.query(
        'SELECT id, user_type, status FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0 || result.rows[0].status !== 'active') {
        return null;
      }

      return {
        userId: result.rows[0].id,
        role: result.rows[0].user_type
      };
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      return null;
    }
  }

  async handleMessage(ws, user, message) {
    const { type, data } = message;

    switch (type) {
      case 'join_conversation':
        await this.handleJoinConversation(ws, user, data);
        break;

      case 'leave_conversation':
        await this.handleLeaveConversation(ws, user, data);
        break;

      case 'send_message':
        await this.handleSendMessage(ws, user, data);
        break;

      case 'typing':
        await this.handleTyping(ws, user, data);
        break;

      case 'mark_read':
        await this.handleMarkRead(ws, user, data);
        break;

      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
        break;

      default:
        this.sendToClient(ws, {
          type: 'error',
          message: `Unknown message type: ${type}`
        });
    }
  }

  async handleJoinConversation(ws, user, data) {
    const { conversationId } = data;

    try {
      // Verify user has access to this conversation
      const access = await this.pool.query(
        `SELECT 1 FROM conversation_participants 
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, user.userId]
      );

      if (access.rows.length === 0 && user.role !== 'admin') {
        this.sendToClient(ws, {
          type: 'error',
          message: 'Access denied to conversation'
        });
        return;
      }

      // Add to conversation tracking
      if (!this.conversations.has(conversationId)) {
        this.conversations.set(conversationId, new Set());
      }
      this.conversations.get(conversationId).add(user.userId);
      ws.conversationId = conversationId;

      // Join confirmation
      this.sendToClient(ws, {
        type: 'joined_conversation',
        conversationId,
        timestamp: new Date().toISOString()
      });

      // Notify other participants
      this.broadcastToConversation(conversationId, {
        type: 'user_joined',
        userId: user.userId,
        conversationId,
        timestamp: new Date().toISOString()
      }, user.userId);

    } catch (error) {
      console.error('Join conversation error:', error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Failed to join conversation'
      });
    }
  }

  async handleLeaveConversation(ws, user, data) {
    const { conversationId } = data;

    if (this.conversations.has(conversationId)) {
      this.conversations.get(conversationId).delete(user.userId);
      
      // Notify other participants
      this.broadcastToConversation(conversationId, {
        type: 'user_left',
        userId: user.userId,
        conversationId,
        timestamp: new Date().toISOString()
      }, user.userId);
    }

    delete ws.conversationId;

    this.sendToClient(ws, {
      type: 'left_conversation',
      conversationId
    });
  }

  async handleSendMessage(ws, user, data) {
    const { conversationId, body, messageType = 'text', attachments = [] } = data;

    try {
      // Verify access
      const access = await this.pool.query(
        `SELECT 1 FROM conversation_participants 
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, user.userId]
      );

      if (access.rows.length === 0) {
        this.sendToClient(ws, {
          type: 'error',
          message: 'Access denied'
        });
        return;
      }

      // Check if conversation is locked
      const convResult = await this.pool.query(
        'SELECT is_locked FROM conversations WHERE id = $1',
        [conversationId]
      );

      if (convResult.rows[0]?.is_locked) {
        this.sendToClient(ws, {
          type: 'error',
          message: 'Conversation is locked'
        });
        return;
      }

      // Insert message
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await this.pool.query(
        `INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, body, attachments, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [messageId, conversationId, user.userId, user.role, messageType, body, JSON.stringify(attachments)]
      );

      const message = result.rows[0];

      // Update conversation
      await this.pool.query(
        `UPDATE conversations 
         SET last_message_id = $1, last_message_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [messageId, conversationId]
      );

      // Create notifications for other participants
      const participants = await this.pool.query(
        `SELECT user_id FROM conversation_participants 
         WHERE conversation_id = $1 AND user_id != $2`,
        [conversationId, user.userId]
      );

      for (const participant of participants.rows) {
        await this.pool.query(
          `INSERT INTO notifications (id, user_id, type, title, message, reference_id, reference_type, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            `not_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            participant.user_id,
            'new_message',
            'New Message',
            `New message in conversation`,
            conversationId,
            'conversation'
          ]
        );
      }

      // Broadcast to conversation
      this.broadcastToConversation(conversationId, {
        type: 'new_message',
        message: {
          id: message.id,
          conversationId: message.conversation_id,
          senderId: message.sender_id,
          senderRole: message.sender_role,
          messageType: message.message_type,
          body: message.body,
          attachments: message.attachments,
          createdAt: message.created_at
        }
      }, null);

      // Confirm to sender
      this.sendToClient(ws, {
        type: 'message_sent',
        messageId: message.id,
        timestamp: message.created_at
      });

    } catch (error) {
      console.error('Send message error:', error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Failed to send message'
      });
    }
  }

  async handleTyping(ws, user, data) {
    const { conversationId, isTyping } = data;

    if (ws.conversationId === conversationId) {
      this.broadcastToConversation(conversationId, {
        type: 'typing',
        userId: user.userId,
        isTyping,
        conversationId,
        timestamp: new Date().toISOString()
      }, user.userId);
    }
  }

  async handleMarkRead(ws, user, data) {
    const { messageId, conversationId } = data;

    try {
      await this.pool.query(
        `UPDATE messages 
         SET read_at = NOW() 
         WHERE id = $1 AND conversation_id = $2 AND sender_id != $3`,
        [messageId, conversationId, user.userId]
      );

      // Notify sender that message was read
      const message = await this.pool.query(
        'SELECT sender_id FROM messages WHERE id = $1',
        [messageId]
      );

      if (message.rows.length > 0) {
        const senderWs = this.clients.get(message.rows[0].sender_id);
        if (senderWs) {
          this.sendToClient(senderWs, {
            type: 'message_read',
            messageId,
            conversationId,
            readBy: user.userId,
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      console.error('Mark read error:', error);
    }
  }

  handleDisconnect(userId) {
    console.log(`🔌 User ${userId} disconnected from WebSocket`);
    
    // Remove from clients
    this.clients.delete(userId);

    // Remove from all conversations
    this.conversations.forEach((participants, conversationId) => {
      if (participants.has(userId)) {
        participants.delete(userId);
        
        // Notify others
        this.broadcastToConversation(conversationId, {
          type: 'user_offline',
          userId,
          timestamp: new Date().toISOString()
        }, userId);
      }
    });
  }

  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  sendToUser(userId, data) {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  broadcastToConversation(conversationId, data, excludeUserId = null) {
    const participants = this.conversations.get(conversationId);
    if (!participants) return;

    participants.forEach(userId => {
      if (userId === excludeUserId) return;
      
      const ws = this.clients.get(userId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }

  broadcastToAll(data, excludeUserId = null) {
    this.clients.forEach((ws, userId) => {
      if (userId === excludeUserId) return;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }

  startHeartbeat() {
    // Check connection health every 30 seconds
    setInterval(() => {
      this.clients.forEach((ws, userId) => {
        if (!ws.isAlive) {
          console.log(`💔 Terminating inactive connection for user ${userId}`);
          ws.terminate();
          this.handleDisconnect(userId);
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  // Public methods for other services to use
  notifyUser(userId, notification) {
    this.sendToUser(userId, {
      type: 'notification',
      notification,
      timestamp: new Date().toISOString()
    });
  }

  notifyConversation(conversationId, data, excludeUserId = null) {
    this.broadcastToConversation(conversationId, {
      type: 'conversation_update',
      ...data,
      timestamp: new Date().toISOString()
    }, excludeUserId);
  }

  getConnectedUsers() {
    return Array.from(this.clients.keys());
  }

  getConversationParticipants(conversationId) {
    return Array.from(this.conversations.get(conversationId) || []);
  }

  // Real-time Stats Updates
  updateVendorStats(vendorId, stats) {
    this.sendToUser(vendorId, {
      type: 'stats_update',
      dashboard: 'vendor',
      stats: {
        newLeads: stats.newLeads || 0,
        activeQuotes: stats.activeQuotes || 0,
        totalBids: stats.totalBids || 0,
        wonJobs: stats.wonJobs || 0,
        totalRevenue: stats.totalRevenue || 0,
        unreadMessages: stats.unreadMessages || 0,
        credits: stats.credits || 0,
        unreadNotifications: stats.unreadNotifications || 0
      },
      timestamp: new Date().toISOString()
    });
  }

  updateCustomerStats(customerId, stats) {
    this.sendToUser(customerId, {
      type: 'stats_update',
      dashboard: 'customer',
      stats: {
        activeJobs: stats.activeJobs || 0,
        totalQuotes: stats.totalQuotes || 0,
        pendingBids: stats.pendingBids || 0,
        completedJobs: stats.completedJobs || 0,
        unreadMessages: stats.unreadMessages || 0,
        unreadNotifications: stats.unreadNotifications || 0
      },
      timestamp: new Date().toISOString()
    });
  }

  updateAdminStats(adminId, stats) {
    this.sendToUser(adminId, {
      type: 'stats_update',
      dashboard: 'admin',
      stats: {
        totalUsers: stats.totalUsers || 0,
        totalVendors: stats.totalVendors || 0,
        pendingVerifications: stats.pendingVerifications || 0,
        openDisputes: stats.openDisputes || 0,
        todayRevenue: stats.todayRevenue || 0,
        activeQuotes: stats.activeQuotes || 0
      },
      timestamp: new Date().toISOString()
    });
  }

  // Push lead updates to vendors
  pushNewLead(vendorId, leadData) {
    this.sendToUser(vendorId, {
      type: 'new_lead',
      lead: {
        id: leadData.id,
        quoteId: leadData.quoteId,
        serviceType: leadData.serviceType,
        location: leadData.location,
        budget: leadData.budget,
        leadCost: leadData.leadCost,
        expiresAt: leadData.expiresAt
      },
      timestamp: new Date().toISOString()
    });
  }

  // Push quote updates
  pushQuoteUpdate(userId, quoteData) {
    this.sendToUser(userId, {
      type: 'quote_update',
      quote: quoteData,
      timestamp: new Date().toISOString()
    });
  }

  // Push bid updates
  pushBidUpdate(userId, bidData) {
    this.sendToUser(userId, {
      type: 'bid_update',
      bid: bidData,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = WebSocketService;
