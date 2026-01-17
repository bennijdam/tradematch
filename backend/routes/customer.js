// Customer Routes
const express = require('express');
const router = express.Router();

/**
 * Mock customer dashboard data
 */
router.get('/dashboard', (req, res) => {
    // In production, this would fetch from database
    res.json({
        success: true,
        data: {
            customer: {
                id: req.user?.id || 1,
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+44 123 456 7890'
            },
            stats: {
                activeQuotes: 3,
                completedProjects: 7,
                totalSpent: 12500,
                averageRating: 4.8
            },
            recentActivity: [
                {
                    type: 'quote',
                    description: 'Kitchen renovation quote',
                    date: '2024-01-15T10:00:00Z',
                    status: 'pending'
                },
                {
                    type: 'project',
                    description: 'Bathroom installation completed',
                    date: '2024-01-10T14:30:00Z',
                    status: 'completed'
                }
            ]
        }
    });
});

/**
 * Get customer's quotes
 */
router.get('/quotes', (req, res) => {
    // In production, fetch from database
    res.json({
        success: true,
        data: [
            {
                id: 1,
                title: 'Kitchen Renovation',
                description: 'Complete kitchen remodel',
                budget: '15000-20000',
                status: 'active',
                bidsCount: 5,
                postedDate: '2024-01-15T10:00:00Z',
                expiryDate: '2024-02-15T10:00:00Z'
            },
            {
                id: 2,
                title: 'Bathroom Installation',
                description: 'New bathroom fitting',
                budget: '8000-12000',
                status: 'accepting_bids',
                bidsCount: 3,
                postedDate: '2024-01-10T14:30:00Z',
                expiryDate: '2024-02-10T14:30:00Z'
            }
        ]
    });
});

/**
 * Create new quote request
 */
router.post('/quotes', (req, res) => {
    const { title, description, budget, postcode, urgency } = req.body;
    
    // Validate required fields
    if (!title || !description || !postcode) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: title, description, postcode'
        });
    }
    
    // In production, save to database
    const newQuote = {
        id: Date.now(),
        customerId: req.user?.id || 1,
        title,
        description,
        budget,
        postcode,
        urgency: urgency || 'asap',
        status: 'active',
        postedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    res.status(201).json({
        success: true,
        data: newQuote,
        message: 'Quote request created successfully'
    });
});

module.exports = router;