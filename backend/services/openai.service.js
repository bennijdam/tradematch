const OpenAI = require('openai');

class OpenAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.model = 'gpt-3.5-turbo';
        this.maxTokens = 1000;
        this.costPerToken = 0.000002; // $0.002 per 1K tokens
    }
    
    // Enhance quote with AI
    async enhanceQuote({ serviceType, description, budget, location }) {
        try {
            const prompt = `You are an expert home improvement consultant. Enhance this quote request:

Service Type: ${serviceType}
Current Description: ${description}
Budget: £${budget}
Location: ${location}

Please provide:
1. An enhanced professional description
2. Key considerations for this type of work
3. Typical timeline estimate
4. Important questions to ask the tradesperson
5. Cost-saving recommendations

Format as JSON:
{
    "enhancedDescription": "...",
    "keyConsiderations": ["...", "..."],
    "timelineEstimate": "...",
    "importantQuestions": ["...", "..."],
    "costSavingTips": ["...", "..."]
}`;

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: this.maxTokens,
                temperature: 0.7,
            });
            
            const tokens = response.usage.total_tokens;
            const cost = tokens * this.costPerToken;
            
            return {
                output: response.choices[0].message.content,
                model: this.model,
                tokens,
                cost: cost.toFixed(6),
            };
        } catch (error) {
            console.error('OpenAI enhance quote error:', error);
            throw error;
        }
    }
    
    // Generate project timeline
    async generateTimeline({ serviceType, scope, budget, location }) {
        try {
            const prompt = `Generate a detailed project timeline for:

Service: ${serviceType}
Scope: ${scope}
Budget: £${budget}
Location: ${location}

Provide a realistic timeline with phases and durations. Format as JSON:
{
    "phases": [
        {
            "phase": "Planning & Design",
            "duration": "1-2 weeks",
            "description": "..."
        }
    ],
    "totalDuration": "6-8 weeks",
    "criticalPath": ["Planning", "Structural Work", "Finishing"],
    "dependencies": ["Permits required before construction"]
}`;

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: this.maxTokens,
                temperature: 0.5,
            });
            
            const tokens = response.usage.total_tokens;
            const cost = tokens * this.costPerToken;
            
            return {
                output: response.choices[0].message.content,
                model: this.model,
                tokens,
                cost: cost.toFixed(6),
            };
        } catch (error) {
            console.error('OpenAI generate timeline error:', error);
            throw error;
        }
    }
    
    // Generate cost estimate
    async generateCostEstimate({ serviceType, scope, location, quality = 'standard' }) {
        try {
            const prompt = `Generate a detailed cost estimate for:

Service: ${serviceType}
Scope: ${scope}
Location: ${location}
Quality Level: ${quality}

Break down costs by:
- Materials (percentage)
- Labor (percentage) 
- Contingency (percentage)
- Permits/Planning (percentage)

Provide UK market rates. Format as JSON:
{
    "estimatedCost": {
        "min": 5000,
        "max": 8000,
        "recommended": 6500
    },
    "costBreakdown": {
        "materials": { "percentage": 40, "estimated": 2600 },
        "labor": { "percentage": 45, "estimated": 2925 },
        "contingency": { "percentage": 10, "estimated": 650 },
        "permits": { "percentage": 5, "estimated": 325 }
    },
    "factors": ["London location premium", "Quality materials", "Complex installation"],
    "marketRate": "This is within the normal UK market range for this scope"
}`;

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: this.maxTokens,
                temperature: 0.3,
            });
            
            const tokens = response.usage.total_tokens;
            const cost = tokens * this.costPerToken;
            
            return {
                output: response.choices[0].message.content,
                model: this.model,
                tokens,
                cost: cost.toFixed(6),
            };
        } catch (error) {
            console.error('OpenAI generate cost estimate error:', error);
            throw error;
        }
    }
    
    // Generate vendor bio
    async generateVendorBio({ trade, experience, services, location }) {
        try {
            const prompt = `Write a professional vendor bio for:

Trade: ${trade}
Experience: ${experience} years
Services: ${services.join(', ')}
Location: ${location}

Write in first person, professional tone, highlighting expertise and trustworthiness.
Include specialization areas and unique value proposition. Keep under 200 words.`;

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 300,
                temperature: 0.6,
            });
            
            const tokens = response.usage.total_tokens;
            const cost = tokens * this.costPerToken;
            
            return {
                output: response.choices[0].message.content,
                model: this.model,
                tokens,
                cost: cost.toFixed(6),
            };
        } catch (error) {
            console.error('OpenAI generate vendor bio error:', error);
            throw error;
        }
    }
    
    // Analyze customer requirements
    async analyzeCustomerRequirements({ description, budget, timeline }) {
        try {
            const prompt = `Analyze these customer requirements and provide insights:

Description: ${description}
Budget: £${budget}
Timeline: ${timeline}

Provide analysis in JSON format:
{
    "projectComplexity": "medium",
    "priorityFactors": ["cost", "quality", "timeline"],
    "potentialChallenges": ["...", "..."],
    "recommendations": ["...", "..."],
    "suitableForRemoteQuote": true,
    "estimatedServiceType": "electrical"
}`;

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500,
                temperature: 0.4,
            });
            
            const tokens = response.usage.total_tokens;
            const cost = tokens * this.costPerToken;
            
            return {
                output: response.choices[0].message.content,
                model: this.model,
                tokens,
                cost: cost.toFixed(6),
            };
        } catch (error) {
            console.error('OpenAI analyze requirements error:', error);
            throw error;
        }
    }
    
    // Get usage statistics
    async getUsageStats(userId) {
        try {
            // This would query your database for AI usage
            // For now, return placeholder
            return {
                totalTokens: 0,
                totalCost: 0,
                usageCount: 0,
                lastUsed: null,
            };
        } catch (error) {
            console.error('Get usage stats error:', error);
            throw error;
        }
    }
    
    // Check if service is enabled
    isEnabled() {
        return process.env.ENABLE_AI_FEATURES === 'true' && !!process.env.OPENAI_API_KEY;
    }
    
    // Calculate cost estimate
    calculateCost(estimatedTokens) {
        return (estimatedTokens * this.costPerToken).toFixed(6);
    }
}

module.exports = new OpenAIService();