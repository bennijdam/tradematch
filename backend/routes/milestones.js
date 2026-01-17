const express = require('express');
const router = express.Router();

let pool;
router.setPool = (p) => { pool = p; };

// Get milestones for a quote
router.get('/quote/:quoteId', async (req, res) => {
    try {
        const { quoteId } = req.params;
        
        const result = await pool.query(
            `SELECT pm.*, 
                    CASE 
                        WHEN pm.status = 'completed' AND pm.approved_at IS NOT NULL THEN true
                        ELSE false
                    END as can_release_payment
             FROM payment_milestones pm
             WHERE pm.quote_id = $1
             ORDER BY pm.order_index ASC`,
            [quoteId]
        );
        
        res.json({ success: true, milestones: result.rows });
    } catch (error) {
        console.error('Get milestones error:', error);
        res.status(500).json({ error: 'Failed to get milestones' });
    }
});

// Create milestones
router.post('/create', async (req, res) => {
    try {
        const { quoteId, milestones } = req.body;
        
        // Delete existing milestones
        await pool.query('DELETE FROM payment_milestones WHERE quote_id = $1', [quoteId]);
        
        // Insert new milestones
        for (let i = 0; i < milestones.length; i++) {
            const milestone = milestones[i];
            const milestoneId = `ms_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
            
            await pool.query(
                `INSERT INTO payment_milestones 
                    (id, quote_id, title, description, amount, percentage, order_index, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
                [milestoneId, quoteId, milestone.title, milestone.description, 
                 milestone.amount, milestone.percentage, i]
            );
        }
        
        res.json({ success: true, message: 'Milestones created successfully' });
    } catch (error) {
        console.error('Create milestones error:', error);
        res.status(500).json({ error: 'Failed to create milestones' });
    }
});

// Update milestone status
router.post('/update-status', async (req, res) => {
    try {
        const { milestoneId, status, evidence } = req.body;
        
        let updateQuery = `UPDATE payment_milestones SET status = $1`;
        let params = [status];
        
        if (status === 'completed') {
            updateQuery += `, completion_evidence = $${params.length + 1}, completed_at = CURRENT_TIMESTAMP`;
            params.push(JSON.stringify(evidence));
        }
        
        updateQuery += ` WHERE id = $${params.length + 1}`;
        params.push(milestoneId);
        
        await pool.query(updateQuery, params);
        
        res.json({ success: true, message: 'Milestone updated successfully' });
    } catch (error) {
        console.error('Update milestone status error:', error);
        res.status(500).json({ error: 'Failed to update milestone status' });
    }
});

// Submit milestone for approval
router.post('/submit-approval', async (req, res) => {
    try {
        const { milestoneId, vendorId, evidence } = req.body;
        
        await pool.query(
            `UPDATE payment_milestones 
             SET status = 'awaiting_approval', 
                 completion_evidence = $1,
                 submitted_for_approval_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [JSON.stringify(evidence), milestoneId]
        );
        
        // Send notification to customer
        // await notificationService.sendMilestoneApprovalRequest(milestoneId, vendorId);
        
        res.json({ success: true, message: 'Milestone submitted for approval' });
    } catch (error) {
        console.error('Submit approval error:', error);
        res.status(500).json({ error: 'Failed to submit milestone for approval' });
    }
});

// Approve milestone and release payment
router.post('/approve', async (req, res) => {
    try {
        const { milestoneId, customerId, approved } = req.body;
        
        if (!approved) {
            // Reject approval
            await pool.query(
                `UPDATE payment_milestones 
                 SET status = 'rejected' WHERE id = $1`,
                [milestoneId]
            );
            
            return res.json({ success: true, message: 'Milestone rejected' });
        }
        
        // Get milestone details
        const milestoneResult = await pool.query(
            `SELECT pm.*, q.vendor_id, p.id as payment_id
             FROM payment_milestones pm
             JOIN quotes q ON pm.quote_id = q.id
             LEFT JOIN payments p ON q.id = p.quote_id
             WHERE pm.id = $1`,
            [milestoneId]
        );
        
        if (milestoneResult.rows.length === 0) {
            return res.status(404).json({ error: 'Milestone not found' });
        }
        
        const milestone = milestoneResult.rows[0];
        
        // Update milestone
        await pool.query(
            `UPDATE payment_milestones 
             SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = $1
             WHERE id = $2`,
            [customerId, milestoneId]
        );
        
        // Process payment release
        if (milestone.payment_id) {
            await pool.query(
                `INSERT INTO escrow_releases 
                    (payment_id, milestone_id, amount, requested_by, approved_by, status, released_at)
                    VALUES ($1, $2, $3, $4, $5, 'released', CURRENT_TIMESTAMP)`,
                [milestone.payment_id, milestoneId, milestone.vendor_id, customerId, milestone.amount]
            );
            
            // Process Stripe transfer to vendor
            // await stripeService.createTransfer({...});
        }
        
        res.json({ success: true, message: 'Milestone approved and payment released' });
    } catch (error) {
        console.error('Approve milestone error:', error);
        res.status(500).json({ error: 'Failed to approve milestone' });
    }
});

// Get milestone history
router.get('/history/:quoteId', async (req, res) => {
    try {
        const { quoteId } = req.params;
        
        const result = await pool.query(
            `SELECT pm.*, 
                    er.approved_by,
                    er.released_at,
                    uv.name as approved_by_name
             FROM payment_milestones pm
             LEFT JOIN escrow_releases er ON pm.id = er.milestone_id
             LEFT JOIN users uv ON er.approved_by = uv.id
             WHERE pm.quote_id = $1
             ORDER BY pm.order_index ASC`,
            [quoteId]
        );
        
        res.json({ success: true, history: result.rows });
    } catch (error) {
        console.error('Get milestone history error:', error);
        res.status(500).json({ error: 'Failed to get milestone history' });
    }
});

// Upload milestone evidence
router.post('/upload-evidence', async (req, res) => {
    try {
        const { milestoneId, evidence } = req.body;
        
        await pool.query(
            `UPDATE payment_milestones 
             SET completion_evidence = $1 
             WHERE id = $2`,
            [JSON.stringify(evidence), milestoneId]
        );
        
        res.json({ success: true, message: 'Evidence uploaded successfully' });
    } catch (error) {
        console.error('Upload evidence error:', error);
        res.status(500).json({ error: 'Failed to upload evidence' });
    }
});

module.exports = router;