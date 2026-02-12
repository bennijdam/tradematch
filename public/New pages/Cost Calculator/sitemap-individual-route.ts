// app/sitemap-[id].xml/route.ts
// Individual Sitemap Generator (handles 45,000 URLs per file)

import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SITEMAP_LIMIT = 45000;
const BASE_URL = 'https://tradematch.uk';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sitemapId = parseInt(params.id);
  
  if (isNaN(sitemapId) || sitemapId < 1) {
    return new Response('Invalid sitemap ID', { status: 400 });
  }

  try {
    const offset = (sitemapId - 1) * SITEMAP_LIMIT;
    
    // Fetch slugs for this sitemap chunk
    const result = await pool.query(
      'SELECT slug, last_updated FROM seo_pages ORDER BY slug LIMIT $1 OFFSET $2',
      [SITEMAP_LIMIT, offset]
    );

    if (result.rows.length === 0) {
      return new Response('Sitemap not found', { status: 404 });
    }

    // Generate sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${result.rows.map(row => `  <url>
    <loc>${BASE_URL}/trades/${row.slug}</loc>
    <lastmod>${new Date(row.last_updated).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error(`Sitemap ${sitemapId} generation error:`, error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}

// Pre-generate sitemap routes at build time (optional, for top sitemaps)
export async function generateStaticParams() {
  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM seo_pages');
    const totalPages = parseInt(countResult.rows[0].count);
    const numSitemaps = Math.ceil(totalPages / SITEMAP_LIMIT);
    
    // Only pre-generate first 2 sitemaps at build time
    // Others generated on-demand
    return Array.from({ length: Math.min(numSitemaps, 2) }, (_, i) => ({
      id: String(i + 1),
    }));
  } catch (error) {
    console.error('generateStaticParams error:', error);
    return [];
  }
}

export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = 86400; // Revalidate daily
