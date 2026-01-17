const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Enhance Quote Description with AI
 */
async function enhanceQuoteDescription(originalDescription, serviceType) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `You are a professional home improvement consultant. 
                             Enhance the following quote description to be more detailed, 
                             professional, and comprehensive. Include typical considerations, 
                             potential challenges, and best practices for ${serviceType} projects.
                             Keep it under 200 words.`
                },
                {
                    role: "user",
                    content: originalDescription
                }
            ],
            temperature: 0.7,
            max_tokens: 300
        });
        
        return {
            enhanced: completion.choices[0].message.content,
            original: originalDescription
        };
        
    } catch (error) {
        console.error('AI enhancement error:', error);
        throw error;
    }
}

/**
 * Generate Project Cost Estimate
 */
async function generateCostEstimate(projectDetails) {
    try {
        const { serviceType, description, postcode, urgency } = projectDetails;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `You are a construction cost estimator. Provide a realistic 
                             UK price range (in GBP) for the following project. 
                             Consider labor, materials, and typical markups. 
                             Response format: {"min": NUMBER, "max": NUMBER, "breakdown": "text"}`
                },
                {
                    role: "user",
                    content: `Service: ${serviceType}
                             Description: ${description}
                             Location: ${postcode}
                             Urgency: ${urgency}`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.5
        });
        
        return JSON.parse(completion.choices[0].message.content);
        
    } catch (error) {
        console.error('Cost estimate error:', error);
        throw error;
    }
}

/**
 * Generate Project Timeline
 */
async function generateProjectTimeline(projectDetails) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `Generate a realistic project timeline with milestones. 
                             Return JSON: {"duration_weeks": NUMBER, "milestones": [{"title": "", "description": "", "week": NUMBER}]}`
                },
                {
                    role: "user",
                    content: JSON.stringify(projectDetails)
                }
            ],
            response_format: { type: "json_object" }
        });
        
        return JSON.parse(completion.choices[0].message.content);
        
    } catch (error) {
        console.error('Timeline generation error:', error);
        throw error;
    }
}

/**
 * Analyze Quote for Red Flags
 */
async function analyzeQuoteForIssues(quoteText) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `Analyze this quote for potential red flags, unclear terms, 
                             or missing information. Return JSON: 
                             {"risk_level": "low|medium|high", "issues": ["..."], "recommendations": ["..."]}`
                },
                {
                    role: "user",
                    content: quoteText
                }
            ],
            response_format: { type: "json_object" }
        });
        
        return JSON.parse(completion.choices[0].message.content);
        
    } catch (error) {
        console.error('Quote analysis error:', error);
        throw error;
    }
}

/**
 * Generate SEO-Optimized Service Page Content
 */
async function generateServicePageContent(service, location) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `Generate SEO-optimized content for a service page. 
                             Include: title, meta description, H1, introduction (150 words), 
                             key benefits (5 points), typical cost range, and FAQs (3).
                             Return as JSON.`
                },
                {
                    role: "user",
                    content: `Service: ${service}, Location: ${location}`
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 1500
        });
        
        return JSON.parse(completion.choices[0].message.content);
        
    } catch (error) {
        console.error('SEO content generation error:', error);
        throw error;
    }
}

module.exports = {
    enhanceQuoteDescription,
    generateCostEstimate,
    generateProjectTimeline,
    analyzeQuoteForIssues,
    generateServicePageContent
};