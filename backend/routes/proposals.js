const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

let pool;
router.setPool = (p) => { pool = p; };

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

// POST /api/proposals - Create proposal
router.post('/', authenticate, async (req, res) => {
    const { quoteId, title, description, price, milestones, terms } = req.body;
    const vendorId = req.user.userId;
    
    try {
        // Validate required fields
        if (!quoteId || !title || !description || !price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Create proposal
        const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await pool.query(
            `INSERT INTO proposals (id, quote_id, vendor_id, title, description, total_amount, data, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')`,
            [proposalId, quoteId, vendorId, title, description, price, JSON.stringify({ milestones, terms }), 'draft']
        );
        
        res.json({
            success: true,
            proposalId,
            message: 'Proposal created successfully'
        });
    } catch (error) {
        console.error('Create proposal error:', error);
        res.status(500).json({ error: 'Failed to create proposal' });
    }
});

// GET /api/proposals - Get vendor proposals
router.get('/', authenticate, async (req, res) => {
    const vendorId = req.user.userId;
    
    try {
        const result = await pool.query(
            `SELECT p.*, q.title as quote_title, u.name as customer_name
             FROM proposals p
             JOIN quotes q ON p.quote_id = q.id
             JOIN users u ON q.customer_id = u.id
             WHERE p.vendor_id = $1
             ORDER BY p.created_at DESC`,
            [vendorId]
        );
        
        res.json({
            success: true,
            proposals: result.rows
        });
    } catch (error) {
        console.error('Get proposals error:', error);
        res.status(500).json({ error: 'Failed to fetch proposals' });
    }
});

// POST /api/proposals/generate-pdf - Generate proposal PDF
router.post('/generate-pdf', authenticate, async (req, res) => {
    const { proposalId } = req.body;
    const vendorId = req.user.userId;
    
    try {
        // Get proposal data
        const proposalResult = await pool.query(
            `SELECT p.*, q.title, u.name as customer_name
             FROM proposals p
             JOIN quotes q ON p.quote_id = q.id
             JOIN users u ON q.customer_id = u.id
             WHERE p.id = $1 AND p.vendor_id = $2`,
            [proposalId, vendorId]
        );
        
        if (proposalResult.rows.length === 0) {
            return res.status(404).json({ error: 'Proposal not found' });
        }
        
        const proposal = proposalResult.rows[0];
        
        // Generate PDF content (placeholder)
        const pdfContent = `
            PROPOSAL
            =========
            
            Title: ${proposal.title}
            Description: ${proposal.description}
            Vendor: ${proposal.vendor_id}
            Customer: ${proposal.customer_name}
            
            Price: £${proposal.total_amount}
            
            This is a placeholder PDF. Full PDF generation coming in Phase 7 deployment.
        `;
        
        const pdfPath = `/proposals/${proposalId}.pdf`;
        
        res.json({
            success: true,
            pdfPath,
            message: 'PDF generation placeholder. Full PDF generation coming in Phase 7 deployment.'
        });
    } catch (error) {
        console.error('Generate PDF error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

module.exports = router;