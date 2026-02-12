// app/trades/[slug]/page.tsx
// COMPLETE DESIGN - Matches modern-aeo-page-gas-work-croydon.html exactly

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

interface PageData {
  slug: string;
  city: string;
  category: string;
  seo_title: string;
  seo_description: string;
  h1_header: string;
  content_body: {
    introduction: string;
    benefits: string[];
    common_services: string[];
    pricing: {
      avg_cost: string;
      standard: string;
      emergency: string | null;
    };
    local_stats: {
      verified_pros: number;
      avg_rating: string;
      total_reviews: number;
      completed_jobs: number;
      avg_response: string;
    };
    qualification_info: {
      required: string | null;
      description: string;
    };
    emergency_available: boolean;
  };
}

// Dynamic Metadata
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = params;
  
  try {
    const result = await pool.query(
      'SELECT seo_title, seo_description FROM seo_pages WHERE slug = $1',
      [slug]
    );
    const page = result.rows[0];

    if (!page) return { title: 'TradeMatch' };

    return {
      title: page.seo_title,
      description: page.seo_description,
      alternates: { canonical: `https://tradematch.uk/trades/${slug}` },
      openGraph: {
        title: page.seo_title,
        description: page.seo_description,
        url: `https://tradematch.uk/trades/${slug}`,
        siteName: 'TradeMatch',
        type: 'website',
      },
    };
  } catch (error) {
    return { title: 'TradeMatch' };
  }
}

// Main Page Component
export default async function TradePage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  let page: PageData | null = null;
  
  try {
    const result = await pool.query('SELECT * FROM seo_pages WHERE slug = $1', [slug]);
    page = result.rows[0];
  } catch (error) {
    console.error('Database error:', error);
  }

  if (!page) notFound();

  const stats = page.content_body.local_stats;
  const emergency = page.content_body.emergency_available;

  return (
    <>
      <style jsx global>{`
        :root {
          --emerald-500: #10b981;
          --emerald-600: #059669;
          --emerald-700: #047857;
          --slate-900: #0f172a;
          --slate-800: #1e293b;
          --slate-700: #334155;
          --slate-600: #475569;
          --slate-500: #64748b;
          --slate-400: #94a3b8;
          --slate-300: #cbd5e1;
          --slate-200: #e2e8f0;
          --slate-100: #f1f5f9;
          --slate-50: #f8fafc;
          --blue-500: #3b82f6;
          --blue-600: #2563eb;
          --amber-500: #f59e0b;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Archivo', -apple-system, sans-serif;
          line-height: 1.6;
          color: var(--slate-900);
          background: var(--slate-50);
          overflow-x: hidden;
        }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }

        /* Navbar */
        .navbar {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--slate-200);
          padding: 1rem 0;
          position: sticky;
          top: 0;
          z-index: 1000;
          transition: all 0.3s;
        }

        .navbar .container { display: flex; justify-content: space-between; align-items: center; }

        .logo {
          font-size: 1.5rem;
          font-weight: 900;
          color: var(--slate-900);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, var(--emerald-500), var(--blue-500));
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
        }

        .btn-nav {
          padding: 0.75rem 1.5rem;
          background: var(--emerald-500);
          color: white;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }

        .btn-nav:hover {
          background: var(--emerald-600);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        /* Hero */
        .hero {
          background: linear-gradient(135deg, rgba(5, 150, 105, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%),
                      url('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1600&q=80') center/cover;
          color: white;
          padding: 5rem 0 4rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .hero::before {
          content: '';
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
          top: -200px;
          right: -200px;
          animation: float 8s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, 30px); }
        }

        .hero .container { position: relative; z-index: 1; }

        .emergency-badge {
          display: inline-block;
          padding: 0.625rem 1.25rem;
          background: var(--amber-500);
          color: var(--slate-900);
          border-radius: 30px;
          font-weight: 700;
          font-size: 0.9375rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 8px 24px rgba(245, 158, 11, 0.6); }
        }

        .hero h1 {
          font-size: 3.5rem;
          font-weight: 900;
          margin-bottom: 1.5rem;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
        }

        .hero-subtitle {
          font-size: 1.375rem;
          margin-bottom: 2.5rem;
          opacity: 0.95;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .trust-stats {
          display: flex;
          justify-content: center;
          gap: 3rem;
          flex-wrap: wrap;
          margin-top: 3rem;
        }

        .stat {
          text-align: center;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          min-width: 150px;
          transition: all 0.3s;
        }

        .stat:hover {
          transform: translateY(-8px);
          background: rgba(255, 255, 255, 0.2);
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 900;
          display: block;
          font-family: 'Space Mono', monospace;
        }

        /* Verification Badges */
        .verification-section {
          background: white;
          padding: 3rem 0;
          border-bottom: 1px solid var(--slate-200);
        }

        .badges-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
          margin-top: 2rem;
        }

        .badge-card {
          text-align: center;
          padding: 1.5rem;
          background: var(--slate-50);
          border-radius: 16px;
          transition: all 0.3s;
          border: 2px solid transparent;
        }

        .badge-card:hover {
          border-color: var(--emerald-500);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }

        .badge-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, var(--emerald-500), var(--blue-500));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin: 0 auto 1rem;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
        }

        .badge-title { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; }
        .badge-description { font-size: 0.875rem; color: var(--slate-600); }

        /* Feature Sections */
        .feature-section { padding: 5rem 0; background: white; }
        .feature-section:nth-child(even) { background: var(--slate-50); }

        .feature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .feature-grid.reverse { direction: rtl; }
        .feature-grid.reverse > * { direction: ltr; }

        .feature-content h2 {
          font-size: 2.25rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
        }

        .feature-content p {
          font-size: 1.125rem;
          line-height: 1.8;
          color: var(--slate-700);
          margin-bottom: 1.5rem;
        }

        .feature-list { list-style: none; margin-bottom: 2rem; }

        .feature-list li {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
          font-size: 1rem;
          color: var(--slate-700);
        }

        .feature-list .icon {
          width: 24px;
          height: 24px;
          background: var(--emerald-500);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 0.875rem;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .feature-image {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          transition: all 0.5s;
        }

        .feature-image:hover {
          transform: translateY(-10px);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.2);
        }

        .feature-image img { width: 100%; height: auto; display: block; }

        /* Pricing Section */
        .pricing-section { padding: 5rem 0; background: var(--slate-50); }
        .pricing-header { text-align: center; margin-bottom: 3rem; }
        .pricing-header h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem; }

        .pricing-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .pricing-card {
          background: white;
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s;
        }

        .pricing-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .pricing-card.featured {
          border: 3px solid var(--emerald-500);
          transform: scale(1.05);
        }

        .pricing-type {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--emerald-600);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 1rem;
        }

        .pricing-amount {
          font-size: 3rem;
          font-weight: 900;
          color: var(--slate-900);
          font-family: 'Space Mono', monospace;
          margin-bottom: 0.5rem;
        }

        .pricing-label {
          font-size: 0.9375rem;
          color: var(--slate-600);
          margin-bottom: 1.5rem;
        }

        .pricing-features { list-style: none; }

        .pricing-features li {
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--slate-100);
          font-size: 0.9375rem;
          color: var(--slate-700);
        }

        .pricing-features li:last-child { border-bottom: none; }

        /* Services Grid */
        .services-section { padding: 5rem 0; background: white; }

        .services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-top: 3rem;
        }

        .service-card {
          background: var(--slate-50);
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          transition: all 0.3s;
          border: 2px solid transparent;
        }

        .service-card:hover {
          border-color: var(--emerald-500);
          background: white;
          transform: translateY(-4px);
        }

        .service-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }
        .service-name { font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem; }

        /* Testimonials */
        .testimonials-section { padding: 5rem 0; background: var(--slate-50); }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-top: 3rem;
        }

        .testimonial-card {
          background: white;
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s;
        }

        .testimonial-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
        }

        .testimonial-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .testimonial-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--emerald-500), var(--blue-500));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.25rem;
        }

        .testimonial-author h4 {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .testimonial-author p { font-size: 0.875rem; color: var(--slate-600); }
        .testimonial-stars { color: var(--amber-500); font-size: 1.25rem; margin-bottom: 1rem; }
        .testimonial-text { font-size: 1rem; line-height: 1.7; color: var(--slate-700); font-style: italic; }

        /* CTA Section */
        .cta-section {
          background: linear-gradient(135deg, var(--emerald-600) 0%, var(--blue-600) 100%);
          color: white;
          padding: 5rem 0;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cta-section::before {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
          bottom: -150px;
          left: -150px;
        }

        .cta-section .container { position: relative; z-index: 1; }

        .cta-section h2 {
          font-size: 3rem;
          margin-bottom: 1.5rem;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
        }

        .cta-section p {
          font-size: 1.25rem;
          margin-bottom: 2.5rem;
          opacity: 0.95;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .btn-cta {
          display: inline-block;
          padding: 1.25rem 3rem;
          background: white;
          color: var(--emerald-600);
          border-radius: 12px;
          font-size: 1.25rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
        }

        .btn-cta:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
        }

        /* Footer */
        .footer {
          background: var(--slate-900);
          color: rgba(255, 255, 255, 0.7);
          padding: 3rem 0 2rem;
        }

        .footer-content {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .footer-section h4 { color: white; margin-bottom: 1rem; }
        .footer-links { list-style: none; }
        .footer-links li { margin-bottom: 0.5rem; }
        .footer-links a {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .footer-links a:hover { color: var(--emerald-500); }

        .footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 2rem;
          text-align: center;
          font-size: 0.875rem;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .feature-grid { grid-template-columns: 1fr; gap: 3rem; }
          .feature-grid.reverse { direction: ltr; }
          .badges-grid, .pricing-cards, .testimonials-grid, .services-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .hero h1 { font-size: 2.25rem; }
          .trust-stats { flex-direction: column; gap: 1rem; }
          .badges-grid, .pricing-cards, .testimonials-grid, .services-grid, .footer-content { grid-template-columns: 1fr; }
          .cta-section h2 { font-size: 2rem; }
        }
      `}</style>

      <nav className="navbar">
        <div className="container">
          <a href="/" className="logo">
            <div className="logo-icon">T</div>
            <span>TradeMatch</span>
          </a>
          <a href="/post-job" className="btn-nav">Get Free Quotes →</a>
        </div>
      </nav>

      <section className="hero">
        <div className="container">
          {emergency && <div className="emergency-badge">⚡ Emergency Services Available 24/7</div>}
          <h1>{page.h1_header}</h1>
          <p className="hero-subtitle">
            Connect with {stats.verified_pros}+ verified {page.category.toLowerCase()}s in {page.city}. 
            Get free quotes in 24 hours from local, certified professionals.
          </p>
          
          <div className="trust-stats">
            <div className="stat">
              <span className="stat-value">{stats.verified_pros}+</span>
              <span>Verified {page.category}s</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.avg_rating}★</span>
              <span>Average Rating</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.avg_response}</span>
              <span>Response Time</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.completed_jobs}</span>
              <span>Jobs Completed</span>
            </div>
          </div>
        </div>
      </section>

      <section className="verification-section">
        <div className="container">
          <div className="badges-grid">
            <div className="badge-card">
              <div className="badge-icon">✓</div>
              <h3 className="badge-title">{page.content_body.qualification_info.required || 'Professional'} Certified</h3>
              <p className="badge-description">{page.content_body.qualification_info.description}</p>
            </div>
            <div className="badge-card">
              <div className="badge-icon">🛡️</div>
              <h3 className="badge-title">Fully Insured</h3>
              <p className="badge-description">Minimum £2M public liability insurance verified</p>
            </div>
            <div className="badge-card">
              <div className="badge-icon">🆔</div>
              <h3 className="badge-title">ID Verified</h3>
              <p className="badge-description">Government-issued photo ID checked and confirmed</p>
            </div>
            <div className="badge-card">
              <div className="badge-icon">⭐</div>
              <h3 className="badge-title">Customer Rated</h3>
              <p className="badge-description">{stats.total_reviews}+ real reviews from verified {page.city} customers</p>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section">
        <div className="container">
          <div className="feature-grid">
            <div className="feature-content">
              <h2>{emergency ? `Emergency ${page.category} Available 24/7` : `Professional ${page.category} in ${page.city}`}</h2>
              <p>{page.content_body.introduction}</p>
              
              <ul className="feature-list">
                {page.content_body.benefits.slice(0, 4).map((benefit, idx) => (
                  <li key={idx}>
                    <span className="icon">✓</span>
                    <span><strong>{benefit.split(':')[0]}:</strong> {benefit.split(':')[1]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="feature-image">
              <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80" alt={page.category} />
            </div>
          </div>
        </div>
      </section>

      <section className="pricing-section">
        <div className="container">
          <div className="pricing-header">
            <h2>Transparent Pricing in {page.city}</h2>
            <p>Based on {stats.completed_jobs} completed jobs in {page.city}</p>
          </div>

          <div className="pricing-cards">
            <div className="pricing-card">
              <div className="pricing-type">Standard Work</div>
              <div className="pricing-amount">{page.content_body.pricing.standard.split('-')[0]}</div>
              <div className="pricing-label">starting price</div>
              <ul className="pricing-features">
                <li>Scheduled appointments</li>
                <li>Regular service calls</li>
                <li>Standard installations</li>
                <li>Maintenance work</li>
              </ul>
            </div>

            {emergency && page.content_body.pricing.emergency && (
              <div className="pricing-card featured">
                <div className="pricing-type">Emergency Callout</div>
                <div className="pricing-amount">{page.content_body.pricing.emergency.split(' ')[0]}</div>
                <div className="pricing-label">callout + hourly</div>
                <ul className="pricing-features">
                  <li>24/7 availability</li>
                  <li>1-2 hour response</li>
                  <li>Urgent repairs</li>
                  <li>Emergency breakdowns</li>
                </ul>
              </div>
            )}

            <div className="pricing-card">
              <div className="pricing-type">Complex Work</div>
              <div className="pricing-amount">{page.content_body.pricing.avg_cost.split('-')[1]}</div>
              <div className="pricing-label">premium service</div>
              <ul className="pricing-features">
                <li>Major installations</li>
                <li>System upgrades</li>
                <li>Complex repairs</li>
                <li>Multi-day projects</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section">
        <div className="container">
          <div className="feature-grid reverse">
            <div className="feature-content">
              <h2>Complete {page.category} Services in {page.city}</h2>
              <p>Our {page.category.toLowerCase()}s in {page.city} provide a full range of services for residential and commercial properties.</p>
              
              <ul className="feature-list">
                {page.content_body.common_services.slice(0, 4).map((service, idx) => (
                  <li key={idx}>
                    <span className="icon">🔧</span>
                    <span><strong>{service}</strong></span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="feature-image">
              <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80" alt="Professional service" />
            </div>
          </div>
        </div>
      </section>

      <section className="services-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem' }}>
              Common {page.category} Services in {page.city}
            </h2>
            <p style={{ fontSize: '1.125rem', color: 'var(--slate-600)' }}>
              What our {page.category.toLowerCase()}s help with most
            </p>
          </div>

          <div className="services-grid">
            {page.content_body.common_services.map((service, idx) => (
              <div key={idx} className="service-card">
                <span className="service-icon">🔧</span>
                <h3 className="service-name">{service}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="testimonials-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem' }}>
              What {page.city} Customers Say
            </h2>
            <p style={{ fontSize: '1.125rem', color: 'var(--slate-600)' }}>
              Real reviews from verified customers in {page.city}
            </p>
          </div>

          <div className="testimonials-grid">
            {[
              { initials: 'MJ', name: 'Michael Johnson', text: `Needed an emergency ${page.category.toLowerCase()} and found an excellent professional through TradeMatch. Response was quick and the work was top quality. Highly recommend!` },
              { initials: 'SP', name: 'Sarah Patel', text: `Posted my job for ${page.category.toLowerCase()} and received multiple quotes within hours. Chose a local professional with great reviews. Job completed perfectly, very professional.` },
              { initials: 'DW', name: 'David Williams', text: `Brilliant experience with TradeMatch. The ${page.category.toLowerCase()} work was excellent, pricing was fair, and communication was outstanding throughout.` }
            ].map((testimonial, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="testimonial-header">
                  <div className="testimonial-avatar">{testimonial.initials}</div>
                  <div className="testimonial-author">
                    <h4>{testimonial.name}</h4>
                    <p>{page.city}</p>
                  </div>
                </div>
                <div className="testimonial-stars">★★★★★</div>
                <p className="testimonial-text">{testimonial.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>Ready to Find Your {page.category}?</h2>
          <p>Post your job free and receive up to 5 quotes from verified {page.category.toLowerCase()}s in {page.city}</p>
          <a href="/post-job" className="btn-cta">Get Free Quotes Now →</a>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>For Customers</h4>
              <ul className="footer-links">
                <li><a href="/post-job">Post a Job</a></li>
                <li><a href="/how-it-works">How It Works</a></li>
                <li><a href="/find-tradespeople">Find Tradespeople</a></li>
                <li><a href="/help">Help Centre</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>For Tradespeople</h4>
              <ul className="footer-links">
                <li><a href="/vendors/signup">Join TradeMatch</a></li>
                <li><a href="/vendors/how-it-works">How It Works</a></li>
                <li><a href="/compare">Compare Platforms</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <ul className="footer-links">
                <li><a href="/about">About Us</a></li>
                <li><a href="/blog">Blog</a></li>
                <li><a href="/careers">Careers</a></li>
                <li><a href="/press">Press</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Legal</h4>
              <ul className="footer-links">
                <li><a href="/terms">Terms of Service</a></li>
                <li><a href="/privacy">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 TradeMatch. All rights reserved. | Find verified {page.category.toLowerCase()}s across the UK</p>
          </div>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": page.h1_header,
            "description": page.seo_description,
            "provider": {
              "@type": "LocalBusiness",
              "name": "TradeMatch",
              "url": "https://tradematch.uk"
            },
            "areaServed": { "@type": "City", "name": page.city },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": stats.avg_rating,
              "reviewCount": stats.total_reviews
            }
          })
        }}
      />
    </>
  );
}

export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = 604800;

export async function generateStaticParams() {
  try {
    const result = await pool.query(`
      SELECT slug FROM seo_pages 
      WHERE city IN ('London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow')
      LIMIT 500
    `);
    
    return result.rows.map((row) => ({ slug: row.slug }));
  } catch (error) {
    return [];
  }
}
