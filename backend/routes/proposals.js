const express = require('express');
const router = express.Router();
const pdfService = require('../services/pdf.service');

let pool;
router.setPool = (p) => { pool = p; };

// Create proposal
router.post('/create', async (req, res) => {
    try {
        const { 
            quoteId, 
            vendorId, 
            projectTitle, 
            projectDescription, 
            totalAmount, 
            milestones,
            terms 
        } = req.body;
        
        const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const proposalNumber = `PROP-${Date.now()}`;
        
        // Store proposal
        await pool.query(
            `INSERT INTO proposals (id, quote_id, vendor_id, proposal_number, project_title, project_description, total_amount, data, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')`,
            [proposalId, quoteId, vendorId, proposalNumber, projectTitle, projectDescription, totalAmount, 
             JSON.stringify({ milestones, terms })]
        );
        
        res.json({
            success: true,
            proposalId,
            proposalNumber
        });
    } catch (error) {
        console.error('Create proposal error:', error);
        res.status(500).json({ error: 'Failed to create proposal' });
    }
});

// Generate PDF
router.post('/generate-pdf', async (req, res) => {
    try {
        const { proposalId } = req.body;
        
        // Get proposal data
        const proposalResult = await pool.query(
            `SELECT p.*, q.title as quote_title, q.description as quote_description,
                    u.name as vendor_name, u.email as vendor_email, u.phone as vendor_phone,
                    cu.name as customer_name
             FROM proposals p
             JOIN quotes q ON p.quote_id = q.id
             JOIN users u ON p.vendor_id = u.id
             JOIN users cu ON q.customer_id = cu.id
             WHERE p.id = $1`,
            [proposalId]
        );
        
        if (proposalResult.rows.length === 0) {
            return res.status(404).json({ error: 'Proposal not found' });
        }
        
        const proposal = proposalResult.rows[0];
        
        // Generate PDF
        const pdfBuffer = await pdfService.generateProposalPDF(proposal);
        
        // Update proposal with PDF path
        const pdfPath = `/proposals/${proposalId}.pdf`;
        await pool.query(
            `UPDATE proposals SET pdf_path = $1, status = 'ready' WHERE id = $2`,
            [pdfPath, proposalId]
        );
        
        res.json({
            success: true,
            pdfPath,
            pdfSize: pdfBuffer.length
        });
    } catch (error) {
        console.error('Generate PDF error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// Send proposal
router.post('/send', async (req, res) => {
    try {
        const { proposalId, recipientEmail, message } = req.body;
        
        // Update proposal status
        await pool.query(
            `UPDATE proposals SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [proposalId]
        );
        
        // Send notification email (implement email service)
        // await emailService.sendProposalEmail(proposalId, recipientEmail, message);
        
        res.json({
            success: true,
            message: 'Proposal sent successfully'
        });
    } catch (error) {
        console.error('Send proposal error:', error);
        res.status(500).json({ error: 'Failed to send proposal' });
    }
});

// Get vendor proposals
router.get('/vendor/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        
        const result = await pool.query(
            `SELECT p.*, q.title as quote_title, u.name as customer_name
             FROM proposals p
             JOIN quotes q ON p.quote_id = q.id
             JOIN users u ON q.customer_id = u.id
             WHERE p.vendor_id = $1
             ORDER BY p.created_at DESC`,
            [vendorId]
        );
        
        res.json({ success: true, proposals: result.rows });
    } catch (error) {
        console.error('Get vendor proposals error:', error);
        res.status(500).json({ error: 'Failed to get proposals' });
    }
});

// Get customer proposals
router.get('/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        
        const result = await pool.query(
            `SELECT p.*, q.title as quote_title, u.name as vendor_name, u.rating as vendor_rating
             FROM proposals p
             JOIN quotes q ON p.quote_id = q.id
             JOIN users u ON p.vendor_id = u.id
             WHERE q.customer_id = $1
             ORDER BY p.created_at DESC`,
            [customerId]
        );
        
        res.json({ success: true, proposals: result.rows });
    } catch (error) {
        console.error('Get customer proposals error:', error);
        res.status(500).json({ error: 'Failed to get proposals' });
    }
});

// Accept proposal
router.post('/accept', async (req, res) => {
    try {
        const { proposalId, customerId } = req.body;
        
        await pool.query(
            `UPDATE proposals 
             SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [proposalId]
        );
        
        // Update quote status
        await pool.query(
            `UPDATE quotes SET status = 'accepted' 
             WHERE id = (SELECT quote_id FROM proposals WHERE id = $1)`,
            [proposalId]
        );
        
        res.json({ success: true, message: 'Proposal accepted' });
    } catch (error) {
        console.error('Accept proposal error:', error);
        res.status(500).json({ error: 'Failed to accept proposal' });
    }
});

module.exports = router;