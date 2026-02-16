const express = require('express');
const axios = require('axios');

const router = express.Router();

router.get('/autocomplete', async (req, res) => {
    const query = String(req.query.q || '').trim();

    if (query.length < 2) {
        return res.json({ success: true, suggestions: [] });
    }

    try {
        const response = await axios.get('https://api.postcodes.io/postcodes', {
            params: {
                q: query,
                limit: 7
            },
            timeout: 6000
        });

        const results = Array.isArray(response.data?.result) ? response.data.result : [];
        const suggestions = results.map((item) => ({
            postcode: item.postcode,
            district: item.admin_district || null,
            region: item.region || null,
            country: item.country || null
        }));

        return res.json({ success: true, suggestions });
    } catch (error) {
        return res.status(502).json({
            success: false,
            error: 'Postcode lookup failed',
            suggestions: []
        });
    }
});

module.exports = router;