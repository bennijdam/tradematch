const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const aiService = require('../services/openai.service');

/**
 * Enhance Quote with AI
 * POST /api/ai/enhance-quote
 */
router.post('/enhance-quote', authenticate, async (req, res) => {
    const { description, serviceType } = req.body;
    
    try {
        const enhanced = await aiService.enhanceQuoteDescription(description, serviceType);
        
        res.json({
            success: true,
            original: enhanced.original,
            enhanced: enhanced.enhanced
        });
        
    } catch (error) {
        console.error('AI enhancement error:', error);
        res.status(500).json({ error: 'Failed to enhance quote' });
    }
});

/**
 * Get AI Cost Estimate
 * POST /api/ai/estimate-cost
 */
router.post('/estimate-cost', authenticate, async (req, res) => {
    const projectDetails = req.body;
    
    try {
        const estimate = await aiService.generateCostEstimate(projectDetails);
        
        res.json({
            success: true,
            estimate
        });
        
    } catch (error) {
        console.error('Cost estimate error:', error);
        res.status(500).json({ error: 'Failed to generate estimate' });
    }
});

/**
 * Generate Project Timeline
 * POST /api/ai/generate-timeline
 */
router.post('/generate-timeline', authenticate, async (req, res) => {
    const projectDetails = req.body;
    
    try {
        const timeline = await aiService.generateProjectTimeline(projectDetails);
        
        res.json({
            success: true,
            timeline
        });
        
    } catch (error) {
        console.error('Timeline generation error:', error);
        res.status(500).json({ error: 'Failed to generate timeline' });
    }
});

/**
 * Analyze Quote for Issues
 * POST /api/ai/analyze-quote
 */
router.post('/analyze-quote', authenticate, async (req, res) => {
    const { quoteText } = req.body;
    
    try {
        const analysis = await aiService.analyzeQuoteForIssues(quoteText);
        
        res.json({
            success: true,
            analysis
        });
        
    } catch (error) {
        console.error('Quote analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze quote' });
    }
});

module.exports = router;