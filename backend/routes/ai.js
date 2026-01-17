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

// GET /api/ai/dashboard - Get AI usage
router.get('/dashboard', authenticate, async (req, res) => {
    const userId = req.user.userId;
    
    try {
        const result = await pool.query(
            'SELECT COUNT(*) as total_enhancements, SUM(tokens_used) as total_tokens, SUM(cost) as total_cost FROM ai_enhancements WHERE user_id = $1',
            [userId]
        );
        
        const usage = result.rows[0] || {
            totalEnhancements: 0,
            totalTokens: 0,
            totalCost: 0
        };
        
        res.json({
            success: true,
            usage
        });
    } catch (error) {
        console.error('Get AI usage error:', error);
        res.status(500).json({ error: 'Failed to get AI usage' });
    }
});

// POST /api/ai/enhance-quote - Enhance quote with AI
router.post('/enhance-quote', authenticate, async (req, res) => {
    const { description, serviceType } = req.body;
    
    // Check if OpenAI is enabled
    if (!process.env.OPENAI_API_KEY || !process.env.ENABLE_AI_FEATURES) {
        return res.json({
            success: false,
            error: 'AI features not enabled. Please configure OPENAI_API_KEY.',
            enhanced: description // Return original as fallback
        });
    }
    
    try {
        // Placeholder - Full OpenAI integration coming soon
        const enhanced = `${description}\n\nEnhanced with professional details:\n- Includes all necessary materials and labor\n- Complies with UK building regulations\n- Professional finish guaranteed\n- Project timeline: 2-4 weeks\n- Includes cleanup and disposal`;
        
        res.json({
            success: true,
            original: description,
            enhanced: enhanced,
            note: 'This is a placeholder. Full OpenAI GPT-4 integration coming in Phase 7 deployment.'
        });
    } catch (error) {
        console.error('AI enhancement error:', error);
        res.status(500).json({ error: 'AI enhancement failed' });
    }
});

// POST /api/ai/estimate-cost - Generate cost estimate
router.post('/estimate-cost', authenticate, async (req, res) => {
    const { serviceType, description } = req.body;
    
    // Simple cost estimation logic (placeholder)
    const baseCosts = {
        extension: { min: 30000, max: 80000 },
        loft: { min: 20000, max: 50000 },
        kitchen: { min: 8000, max: 25000 },
        bathroom: { min: 4000, max: 15000 },
        roofing: { min: 5000, max: 20000 }
    };
    
    const estimate = baseCosts[serviceType] || { min: 1000, max: 10000 };
    
    res.json({
        success: true,
        estimate: {
            min: estimate.min,
            max: estimate.max,
            breakdown: 'Includes materials, labor, and typical project costs'
        }
    });
};

module.exports = router;