/**
 * TradeMatch Distributed Event Broker with Redis
 * Enables horizontal scaling across multiple WebSocket server instances
 */

const EventEmitter = require('events');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// EVENT DEFINITIONS (same as event-broker.service.js)
// ============================================================

const EVENT_TYPES = {
  // Lead lifecycle
  'LEAD_OFFERED': 'lead:offered',
  'LEAD_ACCEPTED': 'lead:accepted',
  'LEAD_DECLINED': 'lead:declined',
  'LEAD_EXPIRED': 'lead:expired',

  // Quote lifecycle
  'QUOTE_SENT': 'quote:sent',
  'QUOTE_ACCEPTED': 'quote:accepted',
  'QUOTE_REJECTED': 'quote:rejected',
  'QUOTE_WITHDRAWN': 'quote:withdrawn',

  // Message events
  'MESSAGE_SENT': 'message:sent',
  'MESSAGE_READ': 'message:read',
  'CONVERSATION_LOCKED': 'conversation:locked',
  'CONVERSATION_ARCHIVED': 'conversation:archived',

  // Job lifecycle
  'JOB_CREATED': 'job:created',
  'JOB_POSTED': 'job:posted',
  'JOB_CANCELLED': 'job:cancelled',
  'JOB_IN_PROGRESS': 'job:in_progress',
  'JOB_COMPLETED': 'job:completed',

  // Milestone & payment
  'MILESTONE_SUBMITTED': 'milestone:submitted',
  'MILESTONE_APPROVED': 'milestone:approved',
  'MILESTONE_REJECTED': 'milestone:rejected',
  'PAYMENT_RELEASED': 'payment:released',
  'PAYMENT_DISPUTED': 'payment:disputed',

  // Review
  'REVIEW_POSTED': 'review:posted',
  'REVIEW_RESPONDED': 'review:responded',

  // System
  'ERROR_DOUBLE_ACCEPT': 'error:double_accept',
  'ERROR_INSUFFICIENT_FUNDS': 'error:insufficient_funds'
};

// ============================================================
// DISTRIBUTED EVENT BROKER
// ============================================================

class DistributedEventBroker extends EventEmitter {
  constructor(pool, redisConfig = null) {
    super();
    this.pool = pool;
    
    // Redis clients
    this.redisConfig = redisConfig || process.env.REDIS_URL || 'redis://localhost:6379';
    this.redisPub = new Redis(this.redisConfig);
    this.redisSub = new Redis(this.redisConfig);
    this.redisStore = new Redis(this.redisConfig);
    
    this.eventQueue = [];
    this.subscribers = new Map();
    this.isConnected = false;
    
    this.setupRedis();
  }
  
  async setupRedis() {
    try {
      // Subscribe to global event channel
      await this.redisSub.subscribe('tradematch:events', 'tradematch:websocket', 'tradematch:notifications');
      
      this.redisSub.on('message', (channel, message) => {
        try {
          const event = JSON.parse(message);
          
          // Rebroadcast locally (for in-process subscribers)
          super.emit(event.type, event);
          
          // Specific handling per channel
          switch (channel) {
            case 'tradematch:events':
              this.handleGlobalEvent(event);
              break;
            case 'tradematch:websocket':
              this.handleWebSocketEvent(event);
              break;
            case 'tradematch:notifications':
              this.handleNotificationEvent(event);
              break;
          }
          
        } catch (error) {
          console.error('[REDIS] Failed to parse message:', error);
        }
      });
      
      // Connection events
      this.redisSub.on('connect', () => {
        console.log('✅ Redis subscriber connected');
        this.isConnected = true;
      });
      
      this.redisPub.on('connect', () => {
        console.log('✅ Redis publisher connected');
      });
      
      this.redisSub.on('error', (error) => {
        console.error('[REDIS] Subscriber error:', error);
        this.isConnected = false;
      });
      
      this.redisPub.on('error', (error) => {
        console.error('[REDIS] Publisher error:', error);
      });
      
    } catch (error) {
      console.error('[REDIS] Setup error:', error);
    }
  }
  
  /**
   * Emit event - distributed across all server instances
   */
  async emit(eventType, eventData) {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const event = {
        id: eventId,
        type: eventType,
        timestamp: new Date(),
        actor_id: eventData.actor_id,
        actor_role: eventData.actor_role,
        subject_id: eventData.subject_id,
        subject_type: eventData.subject_type,
        job_id: eventData.job_id,
        old_state: eventData.old_state || null,
        new_state: eventData.new_state || null,
        metadata: eventData.metadata || {}
      };
      
      // 1. Persist to database
      await this.persistEvent(event);
      
      // 2. Emit locally
      super.emit(eventType, event);
      
      // 3. Publish to Redis for other server instances
      try {
        await this.redisPub.publish('tradematch:events', JSON.stringify(event));
        console.log(`[EVENT REDIS] ${eventType} published (${eventId})`);
      } catch (redisError) {
        console.warn('[REDIS WARN] Could not publish to Redis:', redisError);
        // Continue without Redis - single instance mode
      }
      
      // 4. Queue notifications
      await this.queueNotifications(event);
      
      return event;
      
    } catch (error) {
      console.error(`[EVENT ERROR] Failed to emit ${eventType}:`, error);
      throw error;
    }
  }
  
  /**
   * Persist event to database
   */
  async persistEvent(event) {
    try {
      const category = event.type.split(':')[0];
      
      const result = await this.pool.query(
        `INSERT INTO event_log (
          id, event_type, event_category, actor_id, actor_role,
          subject_type, subject_id, job_id, old_state, new_state,
          metadata, created_at, idempotency_key
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id`,
        [
          event.id,
          event.type,
          category,
          event.actor_id,
          event.actor_role,
          event.subject_type,
          event.subject_id,
          event.job_id,
          JSON.stringify(event.old_state),
          JSON.stringify(event.new_state),
          JSON.stringify(event.metadata),
          event.timestamp,
          event.metadata.idempotency_key || uuidv4()
        ]
      );
      
      return result.rows[0]?.id;
      
    } catch (error) {
      console.error('[EVENT PERSIST] Failed to persist event:', error);
      throw error;
    }
  }
  
  /**
   * Queue notifications for async processing
   */
  async queueNotifications(event) {
    try {
      // Determine notification recipients based on event type
      const recipients = await this.getNotificationRecipients(event);
      
      for (const recipient of recipients) {
        const notification = {
          id: `not_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: recipient.user_id,
          type: event.type,
          title: this.getNotificationTitle(event, recipient),
          message: this.getNotificationMessage(event),
          reference_id: event.subject_id,
          reference_type: event.subject_type,
          created_at: new Date(),
          metadata: event.metadata
        };
        
        // Persist notification
        await this.pool.query(
          `INSERT INTO notifications (id, user_id, type, title, message, reference_id, reference_type, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            notification.id,
            notification.user_id,
            notification.type,
            notification.title,
            notification.message,
            notification.reference_id,
            notification.reference_type,
            JSON.stringify(notification.metadata),
            notification.created_at
          ]
        );
        
        // Publish notification event to Redis
        this.redisPub.publish('tradematch:notifications', JSON.stringify({
          event: 'notification_created',
          notification,
          timestamp: Date.now()
        }));
      }
      
    } catch (error) {
      console.error('[NOTIFICATION] Failed to queue notifications:', error);
    }
  }
  
  /**
   * Get notification recipients based on event type
   */
  async getNotificationRecipients(event) {
    const recipients = [];
    
    switch (event.type) {
      case EVENT_TYPES.LEAD_OFFERED:
      case EVENT_TYPES.LEAD_ACCEPTED:
        // Notify both customer and all vendors who received the lead
        const leadNotification = await this.pool.query(
          `SELECT DISTINCT l.vendor_id as user_id
           FROM leads l
           WHERE l.job_id = $1`,
          [event.job_id]
        );
        
        // Remove the actor (they don't need a notification for their own action)
        recipients.push(...leadNotification.rows.filter(r => r.user_id !== event.actor_id));
        break;
        
      case EVENT_TYPES.MESSAGE_SENT:
      case EVENT_TYPES.QUOTE_SENT:
        // Notify other conversation participants
        const participantNotification = await this.pool.query(
          `SELECT user_id 
           FROM conversation_participants 
           WHERE conversation_id = $1 AND user_id != $2`,
          [event.metadata.conversation_id, event.actor_id]
        );
        recipients.push(...participantNotification.rows);
        break;
        
      case EVENT_TYPES.MESSAGE_READ:
        // Notify the sender that their message was read
        if (event.metadata.sender_id && event.metadata.sender_id !== event.actor_id) {
          recipients.push({ user_id: event.metadata.sender_id });
        }
        break;
    }
    
    return recipients;
  }
  
  /**
   * Get notification title based on event type
   */
  getNotificationTitle(event, recipient) {
    const eventTypeToTitle = {
      [EVENT_TYPES.LEAD_OFFERED]: 'New Lead Available',
      [EVENT_TYPES.LEAD_ACCEPTED]: 'Lead Accepted',
      [EVENT_TYPES.MESSAGE_SENT]: 'New Message',
      [EVENT_TYPES.QUOTE_SENT]: 'New Quote Received',
      [EVENT_TYPES.MESSAGE_READ]: 'Message Read',
      [EVENT_TYPES.JOB_POSTED]: 'New Job Posted',
      [EVENT_TYPES.JOB_COMPLETED]: 'Job Completed'
    };
    
    return eventTypeToTitle[event.type] || 'Update Available';
  }
  
  /**
   * Get notification message based on event type
   */
  getNotificationMessage(event) {
    const actorName = event.metadata.actor_name || event.actor_id;
    
    switch (event.type) {
      case EVENT_TYPES.LEAD_OFFERED:
        return `New lead in ${event.metadata.job_title || 'your area'}`;
      
      case EVENT_TYPES.LEAD_ACCEPTED:
        return `${actorName} accepted your lead`;
      
      case EVENT_TYPES.MESSAGE_SENT:
        return `New message from ${actorName}`;
      
      case EVENT_TYPES.QUOTE_SENT:
        return `Quote received from ${actorName}: ${event.metadata.quote_amount || 'Amount TBD'}`;
      
      case EVENT_TYPES.MESSAGE_READ:
        return 'Your message has been read';
        
      default:
        return 'You have a new update';
    }
  }
  
  /**
   * Handle global events (for logging, metrics)
   */
  handleGlobalEvent(event) {
    // Emit locally (already done in constructor, but kept for clarity)
    super.emit(event.type, event);
  }
  
  /**
   * Handle WebSocket events - distributed across instances
   */
  handleWebSocketEvent(event) {
    // Rebroadcast to local WebSocket clients
    // This will be handled by the WebSocket service listening to our events
    super.emit('websocket_broadcast', event);
  }
  
  /**
   * Handle notification events
   */
  handleNotificationEvent(event) {
    // Push notifications would be handled here
    // For now, just emit to local listeners
    super.emit('notification_created', event);
  }
  
  /**
   * Get event history for replay
   */
  async getEventHistory(options = {}) {
    try {
      const { jobId, userId, limit = 100, offset = 0 } = options;
      
      const conditions = [];
      const params = [];
      let paramIndex = 1;
      
      if (jobId) {
        conditions.push(`job_id = $${paramIndex}`);
        params.push(jobId);
        paramIndex++;
      }
      
      if (userId) {
        conditions.push(`actor_id = $${paramIndex} OR metadata->>'recipient_id' = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : '';
      
      const query = `
        SELECT * FROM event_log
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(limit, offset);
      
      const result = await this.pool.query(query, params);
      return result.rows;
      
    } catch (error) {
      console.error('[EVENT HISTORY] Failed to fetch:', error);
      throw error;
    }
  }
  
  /**
   * Rehydrate state from event history
   */
  async rehydrateState(subjectType, subjectId) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM event_log 
         WHERE subject_type = $1 AND subject_id = $2 
         ORDER BY created_at ASC`,
        [subjectType, subjectId]
      );
      
      let state = null;
      
      for (const event of result.rows) {
        // Apply each event to build current state
        state = this.applyEvent(state, event);
      }
      
      return state;
      
    } catch (error) {
      console.error('[REHYDRATE] Failed:', error);
      throw error;
    }
  }
  
  applyEvent(state, event) {
    // This would contain business logic for state transitions
    // For now, return the new_state from the event
    return event.new_state;
  }
  
  /**
   * Shutdown gracefully
   */
  async shutdown() {
    console.log('[DISTRIBUTED BROKER] Shutting down...');
    
    try {
      await this.redisPub.quit();
      await this.redisSub.quit();
      await this.redisStore.quit();
      console.log('[DISTRIBUTED BROKER] Redis clients disconnected');
    } catch (error) {
      console.error('[SHUTDOWN] Error:', error);
    }
    
    // Clear event queue
    this.eventQueue = [];
    this.subscribers.clear();
  }
}

module.exports = {
  DistributedEventBroker,
  EVENT_TYPES
};
