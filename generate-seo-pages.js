const fs = require('fs');
const path = require('path');

// Load data
const cities = JSON.parse(fs.readFileSync('./data/cities.json', 'utf8'));
const services = JSON.parse(fs.readFileSync('./data/services.json', 'utf8'));

const template = `<!DOCTYPE html>
<html lang="en-GB">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{SERVICE_NAME}} in {{CITY}} ({{POSTCODE}}) | Get Free Quotes</title>
    <meta name="description" content="Get free {{SERVICE_NAME_LOWER}} quotes from verified specialists in {{CITY}}. Compare prices, read reviews, hire with confidence.">
    <meta name="keywords" content="{{KEYWORDS}}">
    <link rel="canonical" href="https://tradematch-fixed.vercel.app/{{URL_SLUG}}">
    
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        h1 { color: #16A34A; margin-bottom: 20px; }
        h2 { color: #333; margin-top: 30px; }
        .cta-button { background: #16A34A; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .stats { display: flex; justify-content: space-around; margin: 30px 0; }
        .stat { text-align: center; padding: 20px; background: #f9f9f9; border-radius: 5px; }
        .stat-number { font-size: 24px; font-weight: bold; color: #16A34A; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 30px 0; }
        @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>{{SERVICE_NAME}} in {{CITY}} ({{POSTCODE}})</h1>
        <p>Looking for trusted <strong>{{SERVICE_NAME_LOWER}}</strong> specialists in {{CITY}}? TradeMatch connects you with verified local tradespeople covering {{POSTCODES}} and all {{REGION}} areas.</p>
        
        <p><strong>{{SERVICE_NAME}}</strong> cost in {{CITY}} ranges from {{COST_RANGE}}, with most homeowners spending between {{BASIC_COST}} - {{MID_COST}} for standard installations.</p>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number">500+</div>
                <div>Verified Trades</div>
            </div>
            <div class="stat">
                <div class="stat-number">4.9/5</div>
                <div>Average Rating</div>
            </div>
            <div class="stat">
                <div class="stat-number">24hr</div>
                <div>Response Time</div>
            </div>
        </div>
        
        <h2>Why Choose TradeMatch for {{SERVICE_NAME}} in {{CITY}}?</h2>
        <div class="grid">
            <div>
                <h3>✅ Verified Professionals</h3>
                <p>All tradespeople are background checked and insured for your peace of mind.</p>
            </div>
            <div>
                <h3>🔒 Secure Payments</h3>
                <p>Money held in escrow until work is completed to your satisfaction.</p>
            </div>
            <div>
                <h3>📝 Free Quotes</h3>
                <p>Get multiple quotes from local specialists. No obligation to proceed.</p>
            </div>
            <div>
                <h3>⭐ Reviews</h3>
                <p>Read genuine reviews from {{CITY}} homeowners before choosing.</p>
            </div>
        </div>
        
        <h2>Popular {{SERVICE_NAME}} Services in {{CITY}}</h2>
        <ul>
            <li>Full {{SERVICE_NAME_LOWER}} installations</li>
            <li>Emergency {{SERVICE_NAME_LOWER}} repairs</li>
            <li>{{SERVICE_NAME_LOWER}} maintenance and servicing</li>
            <li>Custom {{SERVICE_NAME_LOWER}} solutions</li>
        </ul>
        
        <h2>{{CITY}} Coverage Areas</h2>
        <p>We cover all {{POSTCODES}} areas including {{REGION}}. Our local {{SERVICE_NAME_LOWER}} specialists are familiar with {{DESCRIPTION}}.</p>
        
        <h2>Get Free {{SERVICE_NAME}} Quotes in {{CITY}} Today</h2>
        <p>Ready to start your {{SERVICE_NAME_LOWER}} project? Post your job and receive up to 5 quotes from verified local tradespeople in {{CITY}}.</p>
        
        <a href="https://tradematch-fixed.vercel.app/quote-engine.html" class="cta-button">Get Free Quotes Now</a>
        
        <h2> Frequently Asked Questions</h2>
        <details>
            <summary>How much does {{SERVICE_NAME}} cost in {{CITY}}?</summary>
            <p>{{SERVICE_NAME}} in {{CITY}} typically costs between {{BASIC_COST}} - {{PREMIUM_COST}}, depending on the scope and complexity of your project.</p>
        </details>
        <details>
            <summary>Are your {{CITY}} {{SERVICE_NAME_LOWER}} tradespeople insured?</summary>
            <p>Yes, all tradespeople on TradeMatch are fully insured and verified for your protection.</p>
        </details>
        <details>
            <summary>How quickly can I get {{SERVICE_NAME_LOWER}} quotes?</summary>
            <p>You'll typically receive quotes within 24 hours from local {{CITY}} specialists.</p>
        </details>
        
        <footer style="margin-top: 50px; text-align: center; color: #666;">
            <p>© 2026 TradeMatch. Connecting {{CITY}} homeowners with trusted {{SERVICE_NAME_LOWER}} specialists.</p>
            <p><a href="https://tradematch-fixed.vercel.app">Return to TradeMatch</a></p>
        </footer>
    </div>
</body>
</html>`;

// Create output directory
const outputDir = './generated-pages';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

let pageCount = 0;

// Generate service + city pages
Object.keys(services).forEach(serviceKey => {
    const service = services[serviceKey];
    
    Object.keys(cities).forEach(cityKey => {
        const city = cities[cityKey];
        
        let pageContent = template
            .replace(/\{\{SERVICE_NAME\}\}/g, service.name)
            .replace(/\{\{SERVICE_NAME_LOWER\}\}/g, service.name.toLowerCase())
            .replace(/\{\{CITY\}\}/g, city.name)
            .replace(/\{\{POSTCODE\}\}/g, city.postcodes[0])
            .replace(/\{\{POSTCODES\}\}/g, city.postcodes.join(', '))
            .replace(/\{\{REGION\}\}/g, city.region)
            .replace(/\{\{KEYWORDS\}\}/g, service.keywords.join(', '))
            .replace(/\{\{URL_SLUG\}\}/g, `${service.slug}/${cityKey}`)
            .replace(/\{\{COST_RANGE\}\}/g, service.cost_range)
            .replace(/\{\{BASIC_COST\}\}/g, service.basic_cost)
            .replace(/\{\{MID_COST\}\}/g, service.mid_cost)
            .replace(/\{\{PREMIUM_COST\}\}/g, service.premium_cost)
            .replace(/\{\{DESCRIPTION\}\}/g, city.description);
        
        const filename = `${serviceKey}-${cityKey}.html`;
        fs.writeFileSync(path.join(outputDir, filename), pageContent);
        pageCount++;
        
        // Generate city + service reverse page too
        const reverseContent = pageContent
            .replace(new RegExp(service.name + ' in ' + city.name, 'g'), city.name + ' ' + service.name)
            .replace(new RegExp(service.name + ' in ' + city.name + ' \\(' + city.postcodes[0] + '\\)', 'g'), city.name + ' ' + service.name + ' (' + city.postcodes[0] + ')');
        
        const reverseFilename = `${cityKey}-${serviceKey}.html`;
        fs.writeFileSync(path.join(outputDir, reverseFilename), reverseContent);
        pageCount++;
    });
});

// Generate standalone service pages
Object.keys(services).forEach(serviceKey => {
    const service = services[serviceKey];
    
    let servicePageContent = template
        .replace(/\{\{SERVICE_NAME\}\}/g, service.name)
        .replace(/\{\{SERVICE_NAME_LOWER\}\)/g, service.name.toLowerCase())
        .replace(/\{\{CITY\}\}/g, 'UK')
        .replace(/\{\{POSTCODE\}\)/g, 'Nationwide')
        .replace(/\{\{POSTCODES\}\)/g, 'All UK postcodes')
        .replace(/\{\{REGION\}\}/g, 'United Kingdom')
        .replace(/\{\{KEYWORDS\}\)/g, service.keywords.join(', '))
        .replace(/\{\{URL_SLUG\}\)/g, service.slug)
        .replace(/\{\{COST_RANGE\}\)/g, service.cost_range)
        .replace(/\{\{BASIC_COST\}\)/g, service.basic_cost)
        .replace(/\{\{MID_COST\}\)/g, service.mid_cost)
        .replace(/\{\{PREMIUM_COST\}\)/g, service.premium_cost)
        .replace(/\{\{DESCRIPTION\}\)/g, 'Professional services available across the United Kingdom');
    
    fs.writeFileSync(path.join(outputDir, serviceKey + '.html'), servicePageContent);
    pageCount++;
});

console.log(`✅ Generated ${pageCount} SEO pages in ${outputDir}/`);
console.log('🚀 Ready for deployment!');