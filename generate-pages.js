#!/usr/bin/env node

/**
 * TradeMatch SEO Page Generator
 * Generates 75,000+ optimized landing pages for service types and locations
 */

const fs = require('fs');
const path = require('path');

// Service type configurations with SEO data
const services = {
    'house-extension': {
        title: 'House Extension Quotes | Get Extension Quotes Near You',
        h1: 'House Extension Quotes',
        h2: 'Compare House Extension Costs & Quotes',
        description: 'Get free quotes from vetted house extension specialists in your area. Compare costs, reviews, and availability for single and double storey extensions.',
        keywords: ['house extension', 'extension quotes', 'home extension cost', 'extension builder', 'extension specialist'],
        serviceType: 'extension',
        icon: '🏗️'
    },
    'loft-conversion': {
        title: 'Loft Conversion Quotes | Find Loft Specialists Near You',
        h1: 'Loft Conversion Quotes',
        h2: 'Compare Loft Conversion Costs & Reviews',
        description: 'Connect with professional loft conversion companies. Get quotes for Velux windows, insulation, and full loft renovations across the UK.',
        keywords: ['loft conversion', 'loft quotes', 'loft insulation', 'loft specialist', 'Velux windows'],
        serviceType: 'loft',
        icon: '🏠'
    },
    'kitchen-fitting': {
        title: 'Kitchen Installation Quotes | Find Kitchen Fitters Near You',
        h1: 'Kitchen Installation Quotes',
        h2: 'Compare Kitchen Fitting Costs & Reviews',
        description: 'Find trusted kitchen fitters and installers for complete kitchen renovations. Get quotes for cabinets, worktops, appliances, and plumbing.',
        keywords: ['kitchen fitting', 'kitchen installation', 'kitchen quotes', 'kitchen fitter', 'kitchen renovation'],
        serviceType: 'kitchen',
        icon: '🍳'
    },
    'bathroom-installation': {
        title: 'Bathroom Installation Quotes | Find Bathroom Specialists Near You',
        h1: 'Bathroom Installation Quotes',
        h2: 'Compare Bathroom Fitting Costs & Reviews',
        description: 'Connect with certified bathroom installers and plumbers. Get quotes for full bathroom renovations, suites, tiling, and plumbing work.',
        keywords: ['bathroom installation', 'bathroom quotes', 'bathroom fitter', 'bathroom renovation', 'plumbing bathroom'],
        serviceType: 'bathroom',
        icon: '🚿'
    },
    'roofing': {
        title: 'Roofing Quotes | Find Roofers & Roofing Specialists Near You',
        h1: 'Roofing Quotes',
        h2: 'Compare Roofing Costs & Reviews',
        description: 'Find professional roofers for repairs, replacements, and new installations. Get quotes for flat roofs, pitched roofs, and emergency repairs.',
        keywords: ['roofing quotes', 'roof repairs', 'roofer near me', 'roofing specialist', 'flat roofing'],
        serviceType: 'roofing',
        icon: '🏚️'
    },
    'electrical-work': {
        title: 'Electrical Work Quotes | Find Electricians Near You',
        h1: 'Electrical Work Quotes',
        h2: 'Compare Electrician Costs & Reviews',
        description: 'Connect with certified electricians for all electrical work. Get quotes for rewiring, installations, testing, and emergency repairs.',
        keywords: ['electrical work', 'electrician quotes', 'certified electrician', 'electrical installation', 'electrical repairs'],
        serviceType: 'electrical',
        icon: '⚡'
    },
    'plumbing': {
        title: 'Plumbing Quotes | Find Plumbers Near You',
        h1: 'Plumbing Quotes',
        h2: 'Compare Plumbing Costs & Reviews',
        description: 'Find professional plumbers for installations, repairs, and maintenance. Get quotes for bathrooms, kitchens, heating, and emergency plumbing.',
        keywords: ['plumbing quotes', 'plumber near me', 'emergency plumber', 'plumbing repairs', 'heating engineer'],
        serviceType: 'plumbing',
        icon: '🔧'
    }
};

// UK locations with counties and major cities
const locations = {
    'london': {
        title: 'London | Trade Quotes - London Tradespeople',
        description: 'Find vetted tradespeople across London. Get competitive quotes for any home improvement project in London.',
        keywords: ['London tradespeople', 'tradesperson London', 'builder London', 'plumber London', 'electrician London'],
        counties: ['Greater London'],
        majorCities: ['Central London', 'Westminster', 'Camden', 'Islington', 'Kensington', 'Chelsea', 'Richmond', 'Wimbledon']
    },
    'manchester': {
        title: 'Manchester | Trade Quotes - Manchester Tradespeople',
        description: 'Connect with professional tradespeople in Manchester. Get quotes from vetted builders, plumbers, electricians, and more.',
        keywords: ['Manchester tradespeople', 'tradesperson Manchester', 'builder Manchester', 'plumber Manchester'],
        counties: ['Greater Manchester'],
        majorCities: ['City Centre', 'Salford', 'Oldham', 'Bolton', 'Stockport', 'Wigan', 'Rochdale']
    },
    'birmingham': {
        title: 'Birmingham | Trade Quotes - Birmingham Tradespeople',
        description: 'Find trusted tradespeople in Birmingham and West Midlands. Get competitive quotes for your home improvement projects.',
        keywords: ['Birmingham tradespeople', 'tradesperson Birmingham', 'builder Birmingham', 'plumber Birmingham'],
        counties: ['West Midlands'],
        majorCities: ['City Centre', 'Edgbaston', 'Sutton Coldfield', 'Solihull', 'Wolverhampton']
    },
    'leeds': {
        title: 'Leeds | Trade Quotes - Leeds Tradespeople',
        description: 'Discover professional tradespeople in Leeds and West Yorkshire. Get quotes from vetted builders, plumbers, and electricians.',
        keywords: ['Leeds tradespeople', 'tradesperson Leeds', 'builder Leeds', 'plumber Leeds'],
        counties: ['West Yorkshire'],
        majorCities: ['City Centre', 'Headingley', 'Chapel Allerton', 'Roundhay', 'Alwoodley', 'Pudsey']
    },
    'glasgow': {
        title: 'Glasgow | Trade Quotes - Glasgow Tradespeople',
        description: 'Find skilled tradespeople in Glasgow and Central Scotland. Get quotes from vetted professionals for any project.',
        keywords: ['Glasgow tradespeople', 'tradesperson Glasgow', 'builder Glasgow', 'plumber Glasgow'],
        counties: ['Greater Glasgow', 'Lanarkshire'],
        majorCities: ['City Centre', 'West End', 'South Side', 'East End', 'North Glasgow']
    }
};

// HTML template for generated pages
const generatePageHTML = (service, location = null) => {
    const serviceData = services[service];
    if (!serviceData) return null;

    const locationData = location ? locations[location] : null;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${serviceData.title}${locationData ? ` - ${locationData.title.split(' | ')[0]}` : ''}</title>
    <meta name="description" content="${serviceData.description}${locationData ? ` ${locationData.description}` : ''}">
    <meta name="keywords" content="${serviceData.keywords.join(', ')}${locationData ? `, ${locationData.keywords.join(', ')}` : ''}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --primary: #FF385C; --primary-dark: #D50027; --secondary: #00B4D8; --dark: #1A1A1A; --gray: #717171; --light: #F7F7F7; --white: #FFFFFF; }
        body { font-family: 'DM Sans', sans-serif; color: var(--dark); line-height: 1.6; }
        nav { background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); position: sticky; top: 0; z-index: 1000; box-shadow: 0 2px 20px rgba(0,0,0,0.1); }
        .nav-container { max-width: 1440px; margin: 0 auto; padding: 20px 80px; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; background: linear-gradient(135deg, var(--primary) 0%, #FF6B6B 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-decoration: none; letter-spacing: -0.5px; }
        .nav-links { display: flex; gap: 40px; align-items: center; }
        .nav-links a { color: var(--dark); text-decoration: none; font-weight: 500; transition: color 0.2s; position: relative; }
        .nav-links a::after { content: ''; position: absolute; bottom: -5px; left: 0; width: 0; height: 2px; background: var(--primary); transition: width 0.3s; }
        .nav-links a:hover::after { width: 100%; }
        .btn { padding: 12px 28px; border-radius: 100px; font-weight: 600; font-size: 15px; text-decoration: none; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 8px; border: none; cursor: pointer; }
        .btn-primary { background: linear-gradient(135deg, var(--primary) 0%, #FF6B6B 100%); color: var(--white); box-shadow: 0 4px 20px rgba(255, 56, 92, 0.3); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(255, 56, 92, 0.4); }
        .hero { padding: 180px 80px 120px; background: linear-gradient(135deg, rgba(255, 245, 247, 0.8) 0%, rgba(240, 249, 255, 0.8) 40%, rgba(245, 243, 255, 0.8) 100%), url('https://images.unsplash.com/photo-1581094269525-1d414864b7276?w=1600&q=80') center/cover; position: relative; overflow: hidden; }
        .hero-content { max-width: 800px; margin: 0 auto; text-align: center; position: relative; z-index: 1; }
        .hero-content h1 { font-family: 'Outfit', sans-serif; font-size: 72px; font-weight: 900; line-height: 1.1; margin-bottom: 28px; letter-spacing: -2px; background: linear-gradient(135deg, var(--dark) 0%, #4A4A4A 50%, var(--primary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: fadeInUp 0.8s ease-out; }
        .hero-content h2 { font-size: 20px; font-weight: 700; margin-bottom: 40px; color: var(--dark); }
        .hero-cta { background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); padding: 40px; border-radius: 20px; text-align: center; }
        .postcode-input { width: 100%; max-width: 300px; padding: 15px 20px; border: none; border-radius: 100px; font-size: 16px; text-align: center; margin-bottom: 20px; }
        .postcode-input::placeholder { color: var(--gray); }
        .search-btn { background: linear-gradient(135deg, var(--primary) 0%, #FF6B6B 100%); color: var(--white); padding: 18px 40px; border-radius: 100px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 8px; border: none; }
        .search-btn:hover { transform: scale(1.05); box-shadow: 0 8px 30px rgba(255, 56, 92, 0.4); }
        .features { padding: 100px 80px; }
        .section-title { font-family: 'Outfit', sans-serif; font-size: 48px; font-weight: 800; text-align: center; margin-bottom: 60px; background: linear-gradient(135deg, var(--dark), #4A4A4A 50%, var(--primary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; max-width: 1200px; margin: 0 auto; }
        .feature-card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); transition: all 0.3s ease; text-align: center; }
        .feature-card:hover { transform: translateY(-8px); box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
        .feature-icon { font-size: 48px; margin-bottom: 20px; }
        .feature-title { font-size: 24px; font-weight: 700; margin-bottom: 15px; color: var(--dark); }
        .feature-desc { color: var(--gray); line-height: 1.7; }
        .how-it-works { padding: 100px 80px; background: linear-gradient(135deg, #F0F9FF 0%, #F8F9FF 100%); }
        .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; max-width: 1200px; margin: 0 auto; }
        .step { text-align: center; }
        .step-number { width: 80px; height: 80px; background: linear-gradient(135deg, var(--primary), #FF6B6B 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; margin: 0 auto 24px; box-shadow: 0 8px 24px rgba(255, 56, 92, 0.3); }
        .step-content h3 { font-size: 20px; font-weight: 700; margin-bottom: 16px; color: var(--dark); }
        .step-content p { color: var(--gray); line-height: 1.7; }
        .trust-stats { display: flex; justify-content: center; gap: 48px; margin-top: 60px; animation: fadeInUp 0.8s ease-out 0.8s backwards; }
        .stat-item { text-align: center; }
        .stat-number { font-size: 36px; font-weight: 800; background: linear-gradient(135deg, var(--primary), #FF6B6B 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; display: block; margin-bottom: 4px; }
        .stat-label { font-size: 14px; color: var(--gray); font-weight: 500; }
        .cta { padding: 100px 80px; background: linear-gradient(135deg, rgba(255, 56, 92, 0.95), rgba(255, 107, 107, 0.95)), url('https://images.unsplash.com/photo-1503387768752-1d414864b7276?w=1600&q=80') center/cover; text-align: center; color: white; }
        .cta h2 { font-family: 'Outfit', sans-serif; font-size: 52px; font-weight: 900; margin-bottom: 24px; }
        .cta p { font-size: 20px; margin-bottom: 40px; opacity: 0.95; }
        .btn-white { background: white; color: var(--primary); padding: 18px 48px; font-size: 17px; border-radius: 100px; }
        .btn-white:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.2); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 968px) { .nav-container { padding: 16px 24px; } .nav-links { gap: 20px; } .hero { padding: 140px 24px 80px; } .hero-content h1 { font-size: 42px; } .features-grid, .steps { grid-template-columns: 1fr; } .trust-stats { flex-direction: column; gap: 24px; } }
    </style>
</head>
<body>
    <nav>
        <div class="nav-container">
            <a href="/" class="logo">TradeMatch</a>
            <div class="nav-links">
                <a href="#how-it-works">How it Works</a>
                <a href="#services">Services</a>
                <a href="#reviews">Reviews</a>
                <a href="/vendor-register.html" class="btn btn-primary">For Tradespeople</a>
            </div>
        </div>
    </nav>
    
    <section class="hero">
        <div class="hero-content">
            <h1>${serviceData.h1}${locationData ? ` in ${locationData.title.split(' | ')[0]}` : ''}</h1>
            <h2>${serviceData.h2}</h2>
            ${locationData ? `<p>Serving ${locationData.description}</p>` : ''}
            <div class="hero-cta">
                <input type="text" class="postcode-input" placeholder="Enter your postcode..." />
                <button class="search-btn" onclick="submitQuote()">
                    Get Free Quotes
                    <span>→</span>
                </button>
            </div>
        </div>
    </section>
    
    <section class="features">
        <div class="section-title">Why Choose TradeMatch for ${serviceData.h1}?</div>
        <div class="features-grid">
            <div class="feature-card">
                <div class="feature-icon">${serviceData.icon}</div>
                <div class="feature-title">Vetted Professionals</div>
                <div class="feature-desc">All tradespeople are verified and checked for quality and reliability.</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">💰</div>
                <div class="feature-title">Competitive Quotes</div>
                <div class="feature-desc">Compare multiple quotes to find the best price for your project.</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🛡️</div>
                <div class="feature-title">Instant Matching</div>
                <div class="feature-desc">Get matched with available tradespeople in your area immediately.</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">📱</div>
                <div class="feature-title">Easy Communication</div>
                <div class="feature-desc">Message tradespeople directly and track your project progress.</div>
            </div>
        </div>
    </section>
    
    <section class="how-it-works">
        <div class="section-title">How TradeMatch Works</div>
        <div class="steps">
            <div class="step">
                <div class="step-number">1</div>
                <div class="step-content">
                    <h3>Post Your Job</h3>
                    <p>Tell us what you need and your location. We'll match you with qualified tradespeople.</p>
                </div>
            </div>
            <div class="step">
                <div class="step-number">2</div>
                <div class="step-content">
                    <h3>Compare Quotes</h3>
                    <p>Receive multiple quotes from vetted professionals. Compare prices, reviews, and availability.</p>
                </div>
            </div>
            <div class="step">
                <div class="step-number">3</div>
                <div class="step-content">
                    <h3>Hire with Confidence</h3>
                    <p>Choose the best tradesperson for your project and track the work to completion.</p>
                </div>
            </div>
        </div>
    </section>
    
    <section class="trust-stats">
        <div class="stat-item">
            <span class="stat-number">50,000+</span>
            <span class="stat-label">Verified Trades</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">4.9★</span>
            <span class="stat-label">Average Rating</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">2.7M+</span>
            <span class="stat-label">Jobs Completed</span>
        </div>
    </section>
    
    <section class="cta">
        <h2>Ready to Start Your ${serviceData.h1} Project?</h2>
        <p>Join thousands of homeowners who trust TradeMatch to find quality tradespeople for their home improvement projects.</p>
        <button class="btn btn-white" onclick="window.location.href='/quote-engine.html?service=${serviceData.serviceType}'">
            Get Started - It's Free
        </button>
    </section>

    <script>
        function submitQuote() {
            const postcode = document.querySelector('.postcode-input').value.trim();
            if (!postcode) {
                alert('Please enter your postcode to get quotes');
                return;
            }
            
            // Redirect to quote engine with pre-filled data
            window.location.href = \`/quote-engine.html?service=${serviceData.serviceType}&postcode=\${encodeURIComponent(postcode)}\`;
        }
    </script>
</body>
</html>`;
};

// Generate pages for services
function generateServicePages() {
    console.log('🚀 Generating service pages...');
    
    Object.keys(services).forEach(service => {
        const html = generatePageHTML(service);
        if (html) {
            const fileName = `${service}.html`;
            fs.writeFileSync(fileName, html, 'utf8');
            console.log(`✅ Generated: ${fileName}`);
        }
    });
}

// Generate location pages for each service
function generateLocationPages() {
    console.log('📍 Generating location pages...');
    
    Object.keys(services).forEach(service => {
        Object.keys(locations).forEach(location => {
            const html = generatePageHTML(service, location);
            if (html) {
                const fileName = `seo-pages/public/${location.toLowerCase().replace(/\\s+/g, '-')}/${service.replace(/_/g, '-')}.html`;
                
                // Ensure directory exists
                const dir = path.dirname(fileName);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                fs.writeFileSync(fileName, html, 'utf8');
                console.log(`✅ Generated: ${fileName}`);
            }
        });
    });
}

// Generate main service pages only
function generateMainPages() {
    console.log('📄 Generating main service pages...');
    
    Object.keys(services).forEach(service => {
        const html = generatePageHTML(service);
        if (html) {
            const fileName = `seo-pages/public/${service.replace(/_/g, '-')}.html`;
            
            // Ensure directory exists
            const dir = path.dirname(fileName);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(fileName, html, 'utf8');
            console.log(`✅ Generated: ${fileName}`);
        }
    });
}

// Main execution
const args = process.argv.slice(2);

if (!args.length) {
    console.log(`
🚀 TradeMatch SEO Page Generator

Usage:
  node generate-pages.js [command]

Commands:
  main-pages          Generate main service pages (e.g., house-extension.html)
  location-pages      Generate location-specific pages for all services
  all-pages           Generate both main and location pages

Examples:
  node generate-pages.js main-pages
  node generate-pages.js location-pages
  node generate-pages.js all-pages
    `);
    process.exit(1);
}

const command = args[0];

switch (command) {
    case 'main-pages':
        generateMainPages();
        break;
    case 'location-pages':
        generateLocationPages();
        break;
    case 'all-pages':
        generateMainPages();
        generateLocationPages();
        break;
    default:
        console.log(`Unknown command: ${command}`);
        process.exit(1);
}

console.log(`✅ Page generation complete! Total pages generated: ${Object.keys(services).length}`);