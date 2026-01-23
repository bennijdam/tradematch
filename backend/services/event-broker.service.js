/**
 * TradeMatch Connection Layer: Event System & Message Broker
 *
 * This module implements a shared event system for real-time synchronization
 * between Customer and Vendor dashboards.
 *
 * Features:
 * - Event emitter for all state changes (lead_accepted, quote_received, etc.)
 * - In-memory event queue with persistence to event_log table
 * - Notification dispatcher (email, push, in-app)
 * - Event replay/audit trail
 * - Idempotent event processing
 *
 * Architecture:
 * - Core events are emitted to in-memory emitter
 * - Events are persisted to event_log for audit
 * - Notifications are queued and processed asynchronously
 * - Subscribers (dashboards) receive events via REST polling or WebSocket
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// EVENT DEFINITIONS
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
// EVENT EMITTER
// ============================================================

class TradeMatchEventBroker extends EventEmitter {
    constructor(pool) {
        super();
        this.pool = pool;
        this.eventQueue = [];
        this.subscribers = new Map(); // userId -> subscriber handlers
    }
    
    /**
     * Emit event: Called when state changes
     * Returns: Promise to ensure event is persisted before returning to caller
     */
    async emit(eventType, eventData) {
        const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Create event object
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
            
            // Persist to event_log
            await this.persistEvent(event);
            
            // Emit locally (for in-process subscribers)
            super.emit(eventType, event);
            
            // Queue notifications
            await this.queueNotifications(event);
            
            console.log(`[EVENT] ${eventType} emitted (${eventId})`);
            return event;
            
        } catch (error) {
            console.error(`[EVENT ERROR] Failed to emit ${eventType}:`, error);
            throw error;
        }
    }
    
    /**
     * Persist event to database for audit trail and replay
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
                    event.metadata.idempotency_key || event.id
                ]
            );
            
            if (result.rows.length === 0) {
                console.warn(`[EVENT] Duplicate event ignored (idempotency): ${event.id}`);
            }
            
        } catch (error) {
            console.error('[EVENT] Persist error:', error);
            throw error;
        }
    }
    
    /**
     * Queue notifications for async processing
     */
    async queueNotifications(event) {
        try {
            const notifications = this.getNotificationsForEvent(event);
            
            for (const notification of notifications) {
                await this.pool.query(
                    `INSERT INTO notification_queue (
                        id, user_id, event_type, recipient_id, title, body,
                        action_url, status, created_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9
                    )`,
                    [
                        `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        notification.user_id,
                        event.type,
                        notification.recipient_id,
                        notification.title,
                        notification.body,
                        notification.action_url,
                        'pending',
                        new Date()
                    ]
                );
            }
            
            console.log(`[NOTIFICATIONS] Queued ${notifications.length} notifications`);
            
        } catch (error) {
            console.error('[NOTIFICATION QUEUE] Error:', error);
            // Don't throw - notifications are non-critical
        }
    }
    
    /**
     * Determine which users should be notified for an event
     */
    getNotificationsForEvent(event) {
        const notifications = [];
        
        // Helper to add notification
        const notify = (userId, recipientId, title, body, actionUrl) => {
            notifications.push({
                user_id: userId,
                recipient_id: recipientId,
                title,
                body,
                action_url: actionUrl
            });
        };
        
        // Map events to notifications
        switch (event.type) {
            case EVENT_TYPES.LEAD_OFFERED:
                // Notify vendor: "New lead: {jobTitle}"
                notify(
                    event.subject_id, // Vendor ID
                    event.subject_id,
                    `New Lead: ${event.metadata.job_title || 'Job'}`,
                    `A new job matching your profile is available.`,
                    `/vendor/leads/${event.subject_id}`
                );
                break;
                
            case EVENT_TYPES.LEAD_ACCEPTED:
                // Notify customer: "Vendor {name} accepted your lead"
                notify(
                    event.metadata.customer_id,
                    event.metadata.customer_id,
                    `Vendor Accepted Your Job`,
                    `${event.metadata.vendor_name} accepted your job request.`,
                    `/customer/jobs/${event.job_id}`
                );
                // Notify vendor: "Lead accepted - messaging enabled"
                notify(
                    event.actor_id, // Vendor
                    event.actor_id,
                    `Lead Accepted`,
                    `Your lead has been accepted. Messaging is now enabled.`,
                    `/vendor/leads/${event.metadata.lead_id}`
                );
                break;
                
            case EVENT_TYPES.QUOTE_SENT:
                // Notify customer: "Quote received from {vendor}"
                notify(
                    event.metadata.customer_id,
                    event.metadata.customer_id,
                    `Quote Received`,
                    `${event.metadata.vendor_name} sent a quote: £${event.metadata.quote_amount}`,
                    `/customer/jobs/${event.job_id}`
                );
                break;
                
            case EVENT_TYPES.QUOTE_ACCEPTED:
                // Notify vendor: "Your quote was accepted!"
                notify(
                    event.actor_id, // Vendor
                    event.actor_id,
                    `Quote Accepted!`,
                    `${event.metadata.customer_name} accepted your quote.`,
                    `/vendor/quotes/${event.metadata.quote_id}`
                );
                break;
                
            case EVENT_TYPES.MESSAGE_SENT:
                // Notify other party: "New message from {sender}"
                notify(
                    event.metadata.recipient_id,
                    event.metadata.recipient_id,
                    `New Message`,
                    `${event.metadata.sender_name} sent you a message.`,
                    `/messages/${event.metadata.conversation_id}`
                );
                break;
                
            case EVENT_TYPES.MILESTONE_SUBMITTED:
                // Notify customer: "Milestone submitted for approval"
                notify(
                    event.metadata.customer_id,
                    event.metadata.customer_id,
                    `Milestone Submitted`,
                    `${event.metadata.vendor_name} submitted a milestone for your approval.`,
                    `/customer/jobs/${event.job_id}`
                );
                break;
                
            case EVENT_TYPES.MILESTONE_APPROVED:
                // Notify vendor: "Milestone approved - payment released"
                notify(
                    event.actor_id, // Vendor
                    event.actor_id,
                    `Milestone Approved`,
                    `Your milestone was approved. Payment will be released shortly.`,
                    `/vendor/milestones`
                );
                break;
                
            case EVENT_TYPES.REVIEW_POSTED:
                // Notify vendor: "You received a review"
                notify(
                    event.metadata.vendor_id,
                    event.metadata.vendor_id,
                    `Review Posted`,
                    `${event.metadata.customer_name} left you a ${event.metadata.rating}-star review.`,
                    `/vendor/reviews`
                );
                break;
        }
        
        return notifications;
    }
    
    /**
     * Subscribe to events (for listeners like WebSocket handlers)
     */
    subscribe(userId, handler) {
        if (!this.subscribers.has(userId)) {
            this.subscribers.set(userId, []);
        }
        this.subscribers.get(userId).push(handler);
    }
    
    /**
     * Unsubscribe from events
     */
    unsubscribe(userId, handler) {
        const handlers = this.subscribers.get(userId);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    /**
     * Get event history for a job (for replay/audit)
     */
    async getEventHistory(jobId, limit = 100) {
        try {
            const result = await this.pool.query(
                `SELECT * FROM event_log
                 WHERE job_id = $1
                 ORDER BY created_at DESC
                 LIMIT $2`,
                [jobId, limit]
            );
            return result.rows;
        } catch (error) {
            console.error('[EVENT] History retrieval error:', error);
            return [];
        }
    }
    
    /**
     * Replay events (for recovery or testing)
     */
    async replayEvents(jobId) {
        try {
            const events = await this.getEventHistory(jobId, 999);
            
            for (const event of events) {
                super.emit(event.event_type, event);
            }
            
            console.log(`[EVENT] Replayed ${events.length} events for job ${jobId}`);
            
        } catch (error) {
            console.error('[EVENT] Replay error:', error);
            throw error;
        }
    }
}

// ============================================================
// NOTIFICATION DISPATCHER
// ============================================================

class NotificationDispatcher {
    constructor(pool, emailService, options = {}) {
        this.pool = pool;
        this.emailService = emailService;
        this.timer = null;
        this.stopping = false;
        this.stopped = false;

        // Retry configuration
        this.maxAttempts = options.maxAttempts || 5;
        this.baseBackoffMs = options.baseBackoffMs || 2000; // exponential backoff base
        this.maxBackoffMs = options.maxBackoffMs || 5 * 60 * 1000; // cap at 5 minutes
    }

    /**
     * Start periodic processing with configurable interval
     */
    startProcessing(intervalMs = 5000) {
        if (this.timer) return; // idempotent
        this.timer = setInterval(() => {
            if (this.stopping || this.stopped) return;
            this.processQueue().catch(err => {
                console.error('[NOTIFICATIONS] Processing failed', err.message);
            });
        }, intervalMs);
    }

    /**
     * Stop processing and prevent further pool usage
     */
    stopProcessing() {
        this.stopping = true;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.stopped = true;
    }
    
    /**
     * Process notification queue (called periodically)
     */
    async processQueue() {
        if (this.stopping || this.stopped) return;
                try {
                        // Get pending notifications
                        const result = await this.pool.query(
                                `SELECT * FROM notification_queue
                                 WHERE status IN ('pending', 'failed')
                                     AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
                                 ORDER BY next_attempt_at NULLS FIRST, created_at ASC
                                 LIMIT 50`
                        );
            
            for (const notification of result.rows) {
                await this.sendNotification(notification);
            }
            
            console.log(`[NOTIFICATIONS] Processed ${result.rows.length} notifications`);
            
        } catch (error) {
            console.error('[NOTIFICATION DISPATCHER] Queue error:', error);
            // If pool is ended during shutdown, avoid noisy retries
            if (this.stopping || this.stopped) {
                return;
            }
        }
    }
    
    /**
     * Send individual notification
     */
    async sendNotification(notification) {
        try {
            // Get user preferences
            const prefResult = await this.pool.query(
                'SELECT * FROM notification_preferences WHERE user_id = $1',
                [notification.recipient_id]
            );
            
            const preferences = prefResult.rows[0] || {};
            
            // Check quiet hours
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const quietStart = preferences.quiet_hours_start ? parseInt(preferences.quiet_hours_start.split(':')[0]) * 60 : null;
            const quietEnd = preferences.quiet_hours_end ? parseInt(preferences.quiet_hours_end.split(':')[0]) * 60 : null;
            
            if (quietStart && quietEnd && currentTime >= quietStart && currentTime <= quietEnd) {
                // Suppress notifications during quiet hours
                await this.pool.query(
                    `UPDATE notification_queue SET status = 'suppressed'
                     WHERE id = $1`,
                    [notification.id]
                );
                return;
            }
            
            // Send email
            if (preferences.email_enabled && this.emailService && typeof this.emailService.sendEmail === 'function') {
                try {
                    const userResult = await this.pool.query(
                        'SELECT email FROM users WHERE id = $1',
                        [notification.recipient_id]
                    );
                    
                    if (userResult.rows[0]) {
                        await this.emailService.sendEmail({
                            to: userResult.rows[0].email,
                            subject: notification.title,
                            html: notification.body,
                            text: notification.body
                        });
                        
                        await this.pool.query(
                            `UPDATE notification_queue SET email_sent = true
                             WHERE id = $1`,
                            [notification.id]
                        );
                    }
                } catch (err) {
                    console.error('[NOTIFICATION] Email send error:', err);
                }
            }
            
            // Send push (stub - implement with Firebase, etc.)
            if (preferences.push_enabled) {
                console.log(`[NOTIFICATION] Push: ${notification.recipient_id} - ${notification.title}`);
            }
            
            // Mark as sent
            await this.pool.query(
                `UPDATE notification_queue
                 SET status = 'sent', sent_at = CURRENT_TIMESTAMP, last_error = NULL
                 WHERE id = $1`,
                [notification.id]
            );
            
        } catch (error) {
            console.error('[NOTIFICATION] Send error:', error);
            await this.handleSendFailure(notification, error);
        }
    }

    /**
     * Handle failed sends with exponential backoff and dead-lettering
     */
    async handleSendFailure(notification, error) {
        const nextAttemptCount = (notification.attempt_count || 0) + 1;
        const maxAttempts = notification.max_attempts || this.maxAttempts;
        const isDeadLetter = nextAttemptCount >= maxAttempts;
        const delayMs = Math.min(
            this.baseBackoffMs * Math.pow(2, nextAttemptCount - 1),
            this.maxBackoffMs
        );
        const nextAttemptAt = isDeadLetter ? null : new Date(Date.now() + delayMs);

        if (isDeadLetter) {
            await this.pool.query(
                `UPDATE notification_queue
                 SET status = 'dead_letter', failed_at = CURRENT_TIMESTAMP, last_error = $2, attempt_count = $3
                 WHERE id = $1`,
                [notification.id, error.message || 'dispatch failed', nextAttemptCount]
            );
            return;
        }

        await this.pool.query(
            `UPDATE notification_queue
             SET status = 'failed', failed_at = CURRENT_TIMESTAMP, last_error = $2,
                 attempt_count = $3, next_attempt_at = $4, max_attempts = $5
             WHERE id = $1`,
            [notification.id, error.message || 'dispatch failed', nextAttemptCount, nextAttemptAt, maxAttempts]
        );
    }

    /**
     * Lightweight stats for health reporting
     */
    async getStats() {
        if (this.stopping && this.stopped) return { running: false };
        try {
            const countsResult = await this.pool.query(
                `SELECT status, COUNT(*)::int AS count,
                        MIN(next_attempt_at) AS next_attempt_at,
                        MAX(attempt_count) AS max_attempts_seen
                 FROM notification_queue
                 GROUP BY status`
            );

            const byStatus = countsResult.rows.reduce((acc, row) => {
                acc[row.status] = {
                    count: row.count,
                    next_attempt_at: row.next_attempt_at,
                    max_attempts_seen: row.max_attempts_seen
                };
                return acc;
            }, {});

            const oldestPendingResult = await this.pool.query(
                `SELECT created_at
                 FROM notification_queue
                 WHERE status IN ('pending', 'failed')
                 ORDER BY created_at ASC
                 LIMIT 1`
            );

            const lastErrorResult = await this.pool.query(
                `SELECT last_error, failed_at
                 FROM notification_queue
                 WHERE last_error IS NOT NULL
                 ORDER BY failed_at DESC NULLS LAST
                 LIMIT 1`
            );

            return {
                running: !this.stopped && !this.stopping,
                byStatus,
                totalPending: (byStatus.pending?.count || 0) + (byStatus.failed?.count || 0),
                nextAttemptAt: byStatus.failed?.next_attempt_at || byStatus.pending?.next_attempt_at || null,
                oldestPendingAt: oldestPendingResult.rows[0]?.created_at || null,
                lastError: lastErrorResult.rows[0]?.last_error || null,
                lastErrorAt: lastErrorResult.rows[0]?.failed_at || null
            };
        } catch (err) {
            console.error('[NOTIFICATION DISPATCHER] Stats error:', err.message);
            return { running: !this.stopped && !this.stopping, error: err.message };
        }
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    TradeMatchEventBroker,
    NotificationDispatcher,
    EVENT_TYPES
};
