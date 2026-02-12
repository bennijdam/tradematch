const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const pdfService = require('../services/pdf.service');

let pool;
router.setPool = (p) => { pool = p; };

/**
 * Create Proposal
 * POST /api/proposals
 */
router.post('/', authenticate, async (req, res) => {
    const proposalData = req.body;
    const vendorId = req.user.userId;
    
    try {
        const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const proposalNumber = `TM-${Date.now().toString().slice(-6)}`;
        
        // Store proposal in database
        await pool.query(
            `INSERT INTO proposals (
                id, quote_id, vendor_id, proposal_number, 
                project_title, project_description, total_amount,
                data, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')`,
            [
                proposalId,
                proposalData.quoteId,
                vendorId,
                proposalNumber,
                proposalData.projectTitle,
                proposalData.projectDescription,
                proposalData.totalAmount,
                JSON.stringify(proposalData)
            ]
        );
        
        // Generate PDF
        const pdfDir = path.join(__dirname, '../pdfs/proposals');
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
        }
        
        const pdfPath = path.join(pdfDir, `${proposalId}.pdf`);
        
        proposalData.proposalNumber = proposalNumber;
        await pdfService.generateProposal(proposalData, pdfPath);
        
        // Update with PDF path
        await pool.query(
            'UPDATE proposals SET pdf_path = $1 WHERE id = $2',
            [pdfPath, proposalId]
        );
        
        res.json({
            success: true,
            proposalId,
            proposalNumber,
            pdfUrl: `/api/proposals/${proposalId}/pdf`
        });
        
    } catch (error) {
        console.error('Create proposal error:', error);
        res.status(500).json({ error: 'Failed to create proposal' });
    }
});

/**
 * Get Proposal PDF
 * GET /api/proposals/:proposalId/pdf
 */
router.get('/:proposalId/pdf', async (req, res) => {
    const { proposalId } = req.params;
    
    try {
        const result = await pool.query(
            'SELECT pdf_path FROM proposals WHERE id = $1',
            [proposalId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Proposal not found' });
        }
        
        const pdfPath = result.rows[0].pdf_path;
        
        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ error: 'PDF file not found' });
        }
        
        res.contentType('application/pdf');
        res.sendFile(pdfPath);
        
    } catch (error) {
        console.error('Get proposal PDF error:', error);
        res.status(500).json({ error: 'Failed to retrieve PDF' });
    }
});

/**
 * Send Proposal to Customer
 * POST /api/proposals/:proposalId/send
 */
router.post('/:proposalId/send', authenticate, async (req, res) => {
    const { proposalId } = req.params;
    const vendorId = req.user.userId;
    
    try {
        // Update status
        await pool.query(
            `UPDATE proposals 
             SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND vendor_id = $2`,
            [proposalId, vendorId]
        );
        
        // TODO: Send email notification to customer
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Send proposal error:', error);
        res.status(500).json({ error: 'Failed to send proposal' });
    }
});

/**
 * Accept Proposal (Customer)
 * POST /api/proposals/:proposalId/accept
 */
router.post('/:proposalId/accept', authenticate, async (req, res) => {
    const { proposalId } = req.params;
    const customerId = req.user.userId;
    
    try {
        await pool.query(
            `UPDATE proposals 
             SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [proposalId]
        );
        
        // Update quote status
        await pool.query(
            `UPDATE quotes 
             SET status = 'accepted' 
             WHERE id = (SELECT quote_id FROM proposals WHERE id = $1)`,
            [proposalId]
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Accept proposal error:', error);
        res.status(500).json({ error: 'Failed to accept proposal' });
    }
});

module.exports = router;