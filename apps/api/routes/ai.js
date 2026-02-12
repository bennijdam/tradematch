const express = require('express');
const router = express.Router();

// Claude API integration for secure AI description generation
const { Anthropic } = require('@anthropic-ai/sdk');

let claudeClient;

// Initialize Claude client from environment
function initializeClaude() {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    console.warn('CLAUDE_API_KEY not configured, AI description generation disabled');
    return null;
  }

  claudeClient = new Anthropic({
    apiKey: apiKey,
    baseURL: 'https://api.anthropic.com'
  });

  return claudeClient;
}

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

    // Initialize Claude client
    const claude = initializeClaude();
    if (!claude) {
      // Fallback to template-based generation
      const templates = {
        bathroom: `I'm looking to renovate my ${propertyType} bathroom. ${prompt}

The current bathroom suite is outdated and showing signs of wear. I'd like to replace the entire suite including:

• Removal and disposal of old bathroom suite
• Installation of new sanitaryware and fixtures
• Retiling of walls and floor with quality ceramic tiles
• New bathroom furniture/storage if space permits
• Updated plumbing and waste connections
• Proper waterproofing and ventilation

I'm looking for a professional finish with attention to detail. The bathroom is approximately [size] and I'd prefer modern, contemporary styling. All work should comply with current building regulations.

Please provide a detailed quote including materials, labour, and estimated timeframe. I'm happy to discuss material choices and can be flexible on exact specifications.`,
        kitchen: `I need a complete kitchen installation for my ${propertyType}. ${prompt}

The current kitchen is outdated and no longer meets our needs. I'm looking for a full replacement including:

• Removal of existing kitchen units and appliances
• Installation of new kitchen units (base and wall)
• Worktop fitting (granite/quartz preferred)
• Integrated appliances (oven, hob, extractor, dishwasher)
• New sink and tap installation
• Plumbing and electrical work as needed
• Tiling of splashback areas

The kitchen space is approximately [size]. I'm looking for a modern design with good storage solutions and quality materials that will last. Soft-close mechanisms and LED under-cabinet lighting would be ideal.

Please include all materials, labour, and removal/disposal costs in your quote. Timeline and payment terms are flexible for the right contractor.`,
        extension: `I'm planning a house extension for my ${propertyType}. ${prompt}

I'm looking to extend the property to create additional living space. The project requires:

• Single/double storey extension [specify based on prompt]
• Structural design and planning permission support
• Foundation work and construction
• Roof structure and covering
• Internal walls and plastering
• Electrical and plumbing first fix
• Heating system extension
• Flooring preparation

The extension should match the existing property style and use quality materials throughout. All work must comply with building regulations and I'll need Building Control sign-off.

Please provide a detailed breakdown of costs, timeline, and what's included in your quote. I'm looking for an experienced contractor who can manage the full project from design through to completion.`,
        loft: `I want to convert my loft space into a usable room in my ${propertyType}. ${prompt}

The loft currently has [height] headroom and [access type]. I'm looking for a full loft conversion including:

• Structural survey and building regulations compliance
• Floor strengthening and insulation
• Staircase installation
• Dormer windows or velux windows
• Plastering and finishing
• Electrical wiring and lighting
• Heating extension
• Storage solutions

I'd like the converted space to be a [bedroom/office/playroom] with proper insulation, ventilation, and natural light. The finish should match the rest of the house.

Please include all structural work, materials, labour, and any planning requirements in your quote.`,
        home: `I need some home improvement work for my ${propertyType}. ${prompt}

Please provide a detailed description of the work needed, including materials, timeline, and any specific requirements. I'm looking for a professional and reliable contractor who can complete the project to a high standard.`
      };

      const template = templates[service.toLowerCase()] || templates.home;
      res.json({
        success: true,
        description: template.substring(0, 500)
      });

    } catch (error) {
      console.error('Template fallback error:', error);
      res.status(500).json({ 
        error: 'Failed to generate description',
        details: error.message 
      });
    }
  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ 
      error: 'Failed to generate description',
      details: error.message 
    });
  }
};

/**
 * Health check for AI service
 * GET /api/ai/health
 */
router.get('/health', async (req, res) => {
  try {
    const claude = initializeClaude();
    if (claude) {
      res.json({
        status: 'ok',
        service: 'claude',
        configured: true,
        model: 'claude-3-5-sonnet-20241022'
      });
    } else {
      res.json({
        status: 'ok',
        service: 'template',
        configured: false,
        reason: 'CLAUDE_API_KEY not set'
      });
    }
  } catch (error) {
    console.error('AI health check error:', error);
    res.status(500).json({ 
      error: 'Health check failed',
      details: error.message 
    });
  }
};

module.exports = router;