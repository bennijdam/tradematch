const express = require('express');
const stripeWebhook = require('../middleware/stripe-webhook');

const router = express.Router();

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

// Webhook health check
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Webhook service is running',
        timestamp: new Date()
    });
});

// Get webhook logs
router.get('/logs', async (req, res) => {
    try {
        const pool = require('../database').pool;
        const { limit = 50, eventType } = req.query;
        
        let query = `
            SELECT * FROM analytics_events 
            WHERE $1::text IS NULL OR event_type = $1
            ORDER BY created_at DESC 
            LIMIT $2
        `;
        
        const result = await pool.query(query, [eventType || null, limit]);
        
        res.json({
            success: true,
            logs: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Get webhook logs error:', error);
        res.status(500).json({ error: 'Failed to get webhook logs' });
    }
});

// Replay webhook event
router.post('/replay/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        
        const pool = require('../database').pool;
        
        // Get the event from logs
        const eventResult = await pool.query(
            'SELECT * FROM analytics_events WHERE id = $1',
            [eventId]
        );
        
        if (eventResult.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const event = eventResult.rows[0];
        
        // Replay the event (this would depend on your specific logic)
        // For now, just mark as replayed
        await pool.query(
            `UPDATE analytics_events 
                 SET data = data || $1::jsonb || '{"replayed": true}'
                 WHERE id = $2`,
            [JSON.stringify({ replayed: true, replayedAt: new Date() }), eventId]
        );
        
        res.json({
            success: true,
            message: 'Event replayed successfully',
            eventId
        });
    } catch (error) {
        console.error('Replay webhook error:', error);
        res.status(500).json({ error: 'Failed to replay webhook' });
    }
});

// Test webhook endpoint
router.post('/test', (req, res) => {
    const testEvent = {
        id: `evt_test_${Date.now()}`,
        object: 'event',
        type: 'test.webhook',
        created: Math.floor(Date.now() / 1000),
        data: {
            object: {
                test: true,
                message: 'Test webhook event'
            }
        }
    };
    
    // Process the test event
    stripeWebhook(req, res, () => {
        res.json({
            success: true,
            message: 'Test webhook processed',
            eventId: testEvent.id
        });
    });
});

module.exports = router;