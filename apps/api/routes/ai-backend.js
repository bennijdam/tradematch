const express = require('express');
const router = express.Router();

// Import AI service for backend-side generation
const aiService = require('../services/openai.service');

let pool;
router.setPool = (p) => { pool = p; };

/**
 * Generate AI Description
 * POST /api/ai/generate-description
 */
router.post('/generate-description', async (req, res) => {
  try {
    const { prompt, service, propertyType } = req.body;

    if (!prompt || !service || !propertyType) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['prompt', 'service', 'propertyType']
      });
    }

    // Generate description using backend AI service
    const aiDescription = await aiService.generateDescription(prompt, service, propertyType);
    
    // Ensure description is within reasonable length
    if (aiDescription.length > 500) {
      aiDescription = aiDescription.substring(0, 500) + '...[truncated due to length limit]';
    }
    
    res.json({
      success: true,
      description: aiDescription.trim()
    });

  } catch (error) {
    console.error('Backend AI service error:', error);
    res.status(500).json({ 
      error: 'Failed to generate description',
      details: error.message 
    });
  }
});

/**
 * Health check for AI service
 * GET /api/ai/health
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      status: 'ok',
      service: 'ai-backend',
      configured: aiService.isConfigured(),
      model: 'openai-gpt-3.5-turbo'
    });
  } catch (error) {
    console.error('AI health check error:', error);
    res.status(500).json({ 
      error: 'Health check failed',
      details: error.message 
    });
  }
});

module.exports = router;