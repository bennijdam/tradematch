// OpenAI Service for AI Description Generation
class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = 'gpt-3.5-turbo'; // or 'gpt-4'
  }

  async generateDescription(prompt, serviceType) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
messages: [{
          role: "system",
          content: `You are a professional home improvement consultant. 
Enhancement of the following quote description to be more detailed, 
comprehensive and professional. Include typical considerations, 
potential challenges, and best practices for ${serviceType} projects.

Response format: {"min": NUMBER, "max": NUMBER, "breakdown": "text"}`

User's brief description: "${prompt}"
Service: ${serviceType}
Property Type: Not specified

Generate a professional, detailed description (150-250 words) that includes:
1. Project Overview and Scope
2. Technical Requirements and Materials
3. Methodology and Phased Approach
4. Compliance and Regulations
5. Timeline and Schedule
6. Risk Assessment and Mitigation
7. Cost Breakdown and Value Engineering
8. Quality Assurance and Standards
9. Post-Completion Support
10. Environmental and Sustainability Considerations

The description should be:
- Formal, technical, and professional
- Structured with clear headings and bullet points
- Include specific measurements, materials, and standards
- Provide regulatory requirements where applicable
- Contain practical recommendations and alternatives
- Written from a contractor's perspective
- Include estimated timelines and coordination requirements
- Appropriate word count (150-250 words)
- Include realistic price ranges based on current UK market rates. Consider regional variations.`
        }],
        max_tokens: 500,
        temperature: 0.7
      });
    }

    if (!response.ok) {
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Failed to generate description';
  }
}

// Claude Service for AI Description Generation (Enhanced)
class ClaudeAIService {
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY;
    this.model = 'claude-3-5-sonnet-20241022';
  }

  async generateDescription(prompt, serviceType) {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1000,
        messages: [{
          role: 'system',
          content: `You are a professional home improvement consultant. 

Enhancement of the following quote description to be more detailed, comprehensive and professional. Include technical specifications, potential challenges, compliance requirements, and best practices for ${serviceType} projects.

User's brief description: "${prompt}"

Service: ${serviceType}
Property Type: Not specified

Generate a professional, detailed description (150-250 words) that includes:
1. Project Overview and Scope
2. Technical Requirements and Materials
3. Methodology and Phased Approach
4. Compliance and Regulations
5. Timeline and Schedule
6. Risk Assessment and Mitigation
7. Cost Breakdown and Value Engineering
8. Quality Assurance and Standards
9. Post-Completion Support
10. Environmental and Sustainability Considerations

The description should be:
- Formal, technical, and professional
- Structured with clear headings and bullet points
- Include specific measurements, materials, and standards
- Provide regulatory requirements where applicable
- Contain practical recommendations and alternatives
- Written from a contractor's perspective
- Include estimated timelines and coordination requirements

Format: Professional report with executive summary followed by detailed sections.`
        }],
        max_tokens: 500,
        temperature: 0.7
      });
    }

    if (!response.ok) {
      throw new Error(`Claude API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Failed to generate description';
  }
}

// OpenAI Service for AI Cost Estimation
class OpenAICostService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  async generateCostEstimate(projectDetails) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: `You are a construction cost estimator. Analyze the following project details and provide a realistic cost estimate in UK pounds.

Project Details:
${JSON.stringify(projectDetails)}

Return JSON with:
- "min": NUMBER
- "max": NUMBER
- "breakdown": "text"

Include:
- Labor costs by phase
- Material costs with quantities
- Equipment rental fees
- Waste disposal costs
- Planning and permit fees
- Contingency (10-20%)
- VAT considerations

Provide realistic price ranges based on current UK market rates. Consider regional variations.`}
        }],
        max_tokens: 400,
        temperature: 0.3
      });
    }

    if (!response.ok) {
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Failed to generate cost estimate';
  }
}

module.exports = { OpenAIService, OpenAICostService, ClaudeAIService };