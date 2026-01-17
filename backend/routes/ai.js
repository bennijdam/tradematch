const express = require('express');
const router = express.Router();
const openaiService = require('../services/openai.service');

let pool;
router.setPool = (p) => { pool = p; };

// Enhance quote with AI
router.post('/enhance-quote', async (req, res) => {
    try {
        const { quoteId, serviceType, description, budget, location } = req.body;
        
        // Get existing quote
        const quoteResult = await pool.query(
            'SELECT * FROM quotes WHERE id = $1',
            [quoteId]
        );
        
        if (quoteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        
        const quote = quoteResult.rows[0];
        
        // Generate AI enhancement
        const enhancement = await openaiService.enhanceQuote({
            serviceType,
            description,
            budget,
            location
        });
        
        // Store enhancement
        const enhancementId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await pool.query(
            `INSERT INTO ai_enhancements (id, user_id, enhancement_type, input_text, output_text, model_used, tokens_used, cost)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [enhancementId, quote.customer_id, 'quote_enhancement', 
             JSON.stringify({ serviceType, description, budget, location }),
             enhancement.output, enhancement.model, enhancement.tokens, enhancement.cost]
        );
        
        res.json({
            success: true,
            enhancement: enhancement.output,
            enhancementId,
            cost: enhancement.cost
        });
    } catch (error) {
        console.error('Enhance quote error:', error);
        res.status(500).json({ error: 'Failed to enhance quote' });
    }
});

// Generate project timeline
router.post('/generate-timeline', async (req, res) => {
    try {
        const { serviceType, scope, budget, location } = req.body;
        
        const timeline = await openaiService.generateTimeline({
            serviceType,
            scope,
            budget,
            location
        });
        
        res.json({
            success: true,
            timeline: timeline.output,
            tokens: timeline.tokens,
            cost: timeline.cost
        });
    } catch (error) {
        console.error('Generate timeline error:', error);
        res.status(500).json({ error: 'Failed to generate timeline' });
    }
});

// Generate cost estimate
router.post('/generate-cost-estimate', async (req, res) => {
    try {
        const { serviceType, scope, location, quality } = req.body;
        
        const estimate = await openaiService.generateCostEstimate({
            serviceType,
            scope,
            location,
            quality
        });
        
        res.json({
            success: true,
            estimate: estimate.output,
            tokens: estimate.tokens,
            cost: estimate.cost
        });
    } catch (error) {
        console.error('Generate cost estimate error:', error);
        res.status(500).json({ error: 'Failed to generate cost estimate' });
    }
});

// Get AI usage history
router.get('/usage/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            `SELECT * FROM ai_enhancements 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [userId]
        );
        
        const totalCost = result.rows.reduce((sum, row) => sum + parseFloat(row.cost || 0), 0);
        
        res.json({
            success: true,
            enhancements: result.rows,
            totalCost,
            usageCount: result.rows.length
        });
    } catch (error) {
        console.error('Get AI usage error:', error);
        res.status(500).json({ error: 'Failed to get AI usage' });
    }
});

module.exports = router;