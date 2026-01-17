// Vendor Routes
const express = require('express');
const router = express.Router();

/**
 * Get vendor dashboard data
 */
router.get('/dashboard', (req, res) => {
    // In production, fetch from database
    res.json({
        success: true,
        data: {
            vendor: {
                id: req.user?.id || 1,
                name: 'Smith & Sons Construction',
                email: 'vendor@example.com',
                phone: '+44 123 456 7890',
                rating: 4.9,
                completedJobs: 156,
                responseTime: '2.3 hours'
            },
            stats: {
                activeBids: 8,
                availableQuotes: 23,
                totalEarnings: 45800,
                averageQuoteValue: 3200
            },
            performance: {
                winRate: 0.75,
                avgResponseTime: 2.3,
                customerRating: 4.8
            }
        }
    });
});

/**
 * Get available quotes for vendor
 */
router.get('/available-quotes', (req, res) => {
    // In production, fetch from database
    res.json({
        success: true,
        data: [
            {
                id: 1,
                title: 'Kitchen Extension',
                description: 'Single storey kitchen extension',
                budget: '20000-30000',
                postcode: 'SW1A 1AA',
                customerName: 'John Doe',
                postedDate: '2024-01-15T10:00:00Z',
                urgency: 'asap',
                category: 'extension'
            },
            {
                id: 2,
                title: 'Bathroom Renovation',
                description: 'Complete bathroom remodel',
                budget: '12000-18000',
                postcode: 'SW1A 2AA',
                customerName: 'Jane Smith',
                postedDate: '2024-01-14T16:30:00Z',
                urgency: '1-3months',
                category: 'bathroom'
            }
        ]
    });
});

/**
 * Submit bid for a quote
 */
router.post('/bids', (req, res) => {
    const { quoteId, amount, description, timeline } = req.body;
    
    // Validate required fields
    if (!quoteId || !amount || !description) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: quoteId, amount, description'
        });
    }
    
    // In production, save to database
    const newBid = {
        id: Date.now(),
        vendorId: req.user?.id || 1,
        quoteId,
        amount,
        description,
        timeline: timeline || '2-4 weeks',
        status: 'submitted',
        submittedDate: new Date().toISOString()
    };
    
    res.status(201).json({
        success: true,
        data: newBid,
        message: 'Bid submitted successfully'
    });
});

/**
 * Get vendor's bids
 */
router.get('/bids', (req, res) => {
    // In production, fetch from database
    res.json({
        success: true,
        data: [
            {
                id: 1,
                quoteId: 101,
                quoteTitle: 'Kitchen Extension',
                amount: 25000,
                description: 'Complete kitchen extension including plumbing and electrical',
                timeline: '6-8 weeks',
                status: 'accepted',
                submittedDate: '2024-01-10T14:30:00Z',
                customerResponse: '2024-01-12T09:15:00Z'
            },
            {
                id: 2,
                quoteId: 102,
                quoteTitle: 'Bathroom Renovation',
                amount: 15000,
                description: 'Complete bathroom remodel with modern fittings',
                timeline: '4-6 weeks',
                status: 'pending',
                submittedDate: '2024-01-08T11:20:00Z'
            }
        ]
    });
});

module.exports = router;