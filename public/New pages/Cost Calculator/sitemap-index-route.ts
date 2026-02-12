// app/sitemap.xml/route.ts
// Dynamic Sitemap Index Generator for 165,000+ pages

import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SITEMAP_LIMIT = 45000; // Google recommends max 50k, we use 45k for safety
const BASE_URL = 'https://tradematch.uk';

export async function GET() {
  try {
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM seo_pages');
    const totalPages = parseInt(countResult.rows[0].count);
    
    // Calculate number of sitemap files needed
    const numSitemaps = Math.ceil(totalPages / SITEMAP_LIMIT);
    
    // Generate sitemap index XML
    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from({ length: numSitemaps }, (_, i) => `  <sitemap>
    <loc>${BASE_URL}/sitemap-${i + 1}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

    return new Response(sitemapIndex, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Sitemap index error:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}
