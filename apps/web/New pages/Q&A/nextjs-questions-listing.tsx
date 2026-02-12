// app/questions/page.tsx
// Questions Listing Page - Browse All Community Q&As

import { Pool } from '@neondatabase/serverless';
import { Metadata } from 'next';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const metadata: Metadata = {
  title: 'Community Questions - Get Free Trade Advice | TradeMatch',
  description: 'Browse thousands of answered questions about home improvement, repairs, and tradespeople. Get free expert advice from verified UK professionals.',
};

interface Question {
  slug: string;
  question_text: string;
  trade_category: string;
  location_city: string | null;
  view_count: number;
  helpful_count: number;
  created_at: string;
}

export default async function QuestionsPage({ 
  searchParams 
}: { 
  searchParams: { category?: string; location?: string; sort?: string } 
}) {
  
  const category = searchParams.category;
  const location = searchParams.location;
  const sort = searchParams.sort || 'recent';

  // Build query
  let query = 'SELECT * FROM community_questions WHERE 1=1';
  const params: any[] = [];
  
  if (category) {
    params.push(category);
    query += ` AND trade_category = $${params.length}`;
  }
  
  if (location) {
    params.push(location);
    query += ` AND location_city = $${params.length}`;
  }
  
  // Sorting
  if (sort === 'popular') {
    query += ' ORDER BY view_count DESC';
  } else if (sort === 'helpful') {
    query += ' ORDER BY helpful_count DESC';
  } else {
    query += ' ORDER BY created_at DESC';
  }
  
  query += ' LIMIT 50';

  let questions: Question[] = [];
  
  try {
    const result = await pool.query(query, params);
    questions = result.rows;
  } catch (error) {
    console.error('Database error:', error);
  }

  return (
    <>
      <style jsx global>{`
        /* Same CSS as questions-listing.html */
        :root {
          --emerald-500: #10b981;
          --emerald-600: #059669;
          --slate-900: #0f172a;
          --slate-700: #334155;
          --slate-600: #475569;
          --slate-500: #64748b;
          --slate-200: #e2e8f0;
          --slate-100: #f1f5f9;
          --slate-50: #f8fafc;
          --white: #ffffff;
          --blue-500: #3b82f6;
          --amber-500: #f59e0b;
        }

        body {
          font-family: 'Archivo', -apple-system, sans-serif;
          background: var(--slate-50);
          color: var(--slate-900);
        }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }

        .hero {
          background: linear-gradient(135deg, var(--emerald-600), var(--blue-500));
          color: white;
          padding: 4rem 0;
          text-align: center;
        }

        .hero h1 {
          font-size: 3rem;
          font-weight: 900;
          margin-bottom: 1rem;
        }

        .hero p {
          font-size: 1.25rem;
          opacity: 0.95;
          max-width: 600px;
          margin: 0 auto;
        }

        .questions-section { padding: 3rem 0; }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: 2rem;
          font-weight: 800;
        }

        .questions-grid {
          display: grid;
          gap: 1.5rem;
        }

        .question-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          transition: all 0.3s;
          cursor: pointer;
        }

        .question-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .question-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .question-meta {
          font-size: 0.875rem;
          color: var(--slate-500);
        }

        .question-title {
          font-size: 1.375rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          color: var(--slate-900);
        }

        .question-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid var(--slate-100);
          margin-top: 1rem;
        }

        .question-category {
          display: inline-block;
          padding: 0.375rem 0.875rem;
          background: rgba(16, 185, 129, 0.1);
          color: var(--emerald-600);
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .question-stats {
          display: flex;
          gap: 1.5rem;
          font-size: 0.875rem;
          color: var(--slate-600);
        }

        @media (max-width: 768px) {
          .hero h1 { font-size: 2rem; }
          .section-header { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <section className="hero">
        <div className="container">
          <h1>Community Questions</h1>
          <p>Browse {questions.length}+ answered questions from verified UK tradespeople</p>
        </div>
      </section>

      <section className="questions-section">
        <div className="container">
          
          <div className="section-header">
            <h2 className="section-title">
              {category ? `${category} Questions` : 'All Questions'}
              {location && ` in ${location}`}
            </h2>
          </div>

          <div className="questions-grid">
            {questions.map((q) => (
              <div 
                key={q.slug} 
                className="question-card"
                onClick={() => window.location.href = `/questions/${q.slug}`}
              >
                <div className="question-header">
                  <div className="question-meta">
                    {new Date(q.created_at).toLocaleDateString('en-GB')}
                    {q.location_city && ` • ${q.location_city}`}
                  </div>
                </div>
                
                <h3 className="question-title">{q.question_text}</h3>
                
                <div className="question-footer">
                  <span className="question-category">{q.trade_category}</span>
                  <div className="question-stats">
                    <span>👁️ {q.view_count}</span>
                    <span>👍 {q.helpful_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {questions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <p style={{ fontSize: '1.25rem', color: 'var(--slate-600)' }}>
                No questions found. Try adjusting your filters.
              </p>
            </div>
          )}

        </div>
      </section>
    </>
  );
}

export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour
