const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { EVENT_TYPES } = require('../services/event-broker.service');

let pool, eventBroker;
router.setPool = (p) => { pool = p; };
router.setEventBroker = (eb) => { eventBroker = eb; };

// Simple authentication middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// GET /api/milestones/quote/:quoteId - Get milestones for a quote
router.get('/quote/:quoteId', authenticate, async (req, res) => {
    const { quoteId } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT * FROM payment_milestones WHERE quote_id = $1 ORDER BY order_index ASC`,
            [quoteId]
        );
        
        res.json({
            success: true,
            milestones: result.rows
        });
    } catch (error) {
        console.error('Get milestones error:', error);
        res.status(500).json({ error: 'Failed to get milestones' });
    }
});

// POST /api/milestones/create - Create milestones
router.post('/create', authenticate, async (req, res) => {
    const { quoteId, milestones } = req.body;
    const vendorId = req.user.userId;
    
    try {
        // Validate input
        if (!quoteId || !milestones || !Array.isArray(milestones)) {
            return res.status(400).json({ error: 'Invalid input' });
        }
        
        // Delete existing milestones
        await pool.query(
            `DELETE FROM payment_milestones WHERE quote_id = $1`,
            [quoteId]
        );
        
        // Insert new milestones
        for (let i = 0; i < milestones.length; i++) {
            const milestone = milestones[i];
            const milestoneId = `ms_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
            
            await pool.query(
                `INSERT INTO payment_milestones (id, quote_id, title, description, amount, percentage, order_index, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
                [milestoneId, quoteId, milestone.title, milestone.description, milestone.amount, milestone.percentage, i, 'pending']
            );
        }
        
        res.json({
            success: true,
            message: 'Milestones created successfully'
        });
    } catch (error) {
        console.error('Create milestones error:', error);
        res.status(500).json({ error: 'Failed to create milestones' });
    }
});

// POST /api/milestones/update-status - Update milestone status
router.post('/update-status', authenticate, async (req, res) => {
    const { milestoneId, status, evidence } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    try {
        // Get milestone details
        const milestoneResult = await pool.query(
            `SELECT pm.*, j.id as job_id, j.customer_id, l.vendor_id
             FROM payment_milestones pm
             JOIN jobs j ON pm.job_id = j.id
             LEFT JOIN leads l ON j.id = l.job_id AND l.status = 'accepted'
             WHERE pm.id = $1`,
            [milestoneId]
        );
        
        if (milestoneResult.rows.length === 0) {
            return res.status(404).json({ error: 'Milestone not found' });
        }
        
        const milestone = milestoneResult.rows[0];
        
        await pool.query(
            `UPDATE payment_milestones 
             SET status = $1, completion_evidence = $2
             WHERE id = $3`,
            [status, evidence, milestoneId]
        );
        
        // Emit events based on status change
        if (eventBroker) {
            if (status === 'submitted' && userRole === 'vendor') {
                // Vendor submitted milestone for approval
                await eventBroker.emit(EVENT_TYPES.MILESTONE_SUBMITTED, {
                    actor_id: userId,
                    actor_role: userRole,
                    subject_type: 'milestone',
                    subject_id: milestoneId,
                    job_id: milestone.job_id,
                    metadata: {
                        customer_id: milestone.customer_id,
                        vendor_id: milestone.vendor_id,
                        vendor_name: req.user.email,
                        milestone_title: milestone.title,
                        milestone_amount: milestone.amount
                    }
                });
            } else if (status === 'approved' && userRole === 'customer') {
                // Customer approved milestone
                await eventBroker.emit(EVENT_TYPES.MILESTONE_APPROVED, {
                    actor_id: userId,
                    actor_role: userRole,
                    subject_type: 'milestone',
                    subject_id: milestoneId,
                    job_id: milestone.job_id,
                    metadata: {
                        customer_id: milestone.customer_id,
                        vendor_id: milestone.vendor_id,
                        milestone_title: milestone.title,
                        milestone_amount: milestone.amount
                    }
                });
            } else if (status === 'rejected' && userRole === 'customer') {
                // Customer rejected milestone
                await eventBroker.emit(EVENT_TYPES.MILESTONE_REJECTED, {
                    actor_id: userId,
                    actor_role: userRole,
                    subject_type: 'milestone',
                    subject_id: milestoneId,
                    job_id: milestone.job_id,
                    metadata: {
                        customer_id: milestone.customer_id,
                        vendor_id: milestone.vendor_id,
                        milestone_title: milestone.title,
                        rejection_reason: evidence
                    }
                });
            }
        }
        
        res.json({
            success: true,
            message: 'Milestone status updated successfully'
        });
    } catch (error) {
        console.error('Update milestone status error:', error);
        res.status(500).json({ error: 'Failed to update milestone status' });
    }
});

module.exports = router;