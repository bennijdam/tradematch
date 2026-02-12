// app/questions/[slug]/page.tsx
// Individual Question Page with Expert Answers + AEO Schema

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

interface QuestionData {
  id: string;
  slug: string;
  question_text: string;
  expert_answer: string;
  trade_category: string;
  location_city: string | null;
  question_type: string;
  view_count: number;
  helpful_count: number;
  metadata: {
    related_questions: string[];
    tags: string[];
  };
  created_at: string;
}

// Generate Metadata for SEO
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = params;
  
  try {
    const result = await pool.query(
      'SELECT question_text, expert_answer, trade_category, location_city FROM community_questions WHERE slug = $1',
      [slug]
    );
    const q = result.rows[0];

    if (!q) return { title: 'Question Not Found | TradeMatch' };

    const title = `${q.question_text} | TradeMatch Community`;
    const description = q.expert_answer.substring(0, 155) + '...';
    const location = q.location_city ? ` in ${q.location_city}` : '';

    return {
      title,
      description: `Expert answer: ${description}`,
      alternates: { canonical: `https://tradematch.uk/questions/${slug}` },
      openGraph: {
        title,
        description,
        type: 'article',
        url: `https://tradematch.uk/questions/${slug}`,
      },
    };
  } catch (error) {
    return { title: 'TradeMatch Community Questions' };
  }
}

// Main Question Page Component
export default async function QuestionPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  let question: QuestionData | null = null;
  
  try {
    const result = await pool.query('SELECT * FROM community_questions WHERE slug = $1', [slug]);
    question = result.rows[0];
    
    // Increment view count
    if (question) {
      await pool.query('UPDATE community_questions SET view_count = view_count + 1 WHERE slug = $1', [slug]);
    }
  } catch (error) {
    console.error('Database error:', error);
  }

  if (!question) notFound();

  // Parse metadata
  const metadata = question.metadata;
  const relatedQuestions = metadata.related_questions || [];

  // QA Schema for Answer Engine Optimization
  const qaSchema = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "mainEntity": {
      "@type": "Question",
      "name": question.question_text,
      "text": question.question_text,
      "answerCount": 1,
      "upvoteCount": question.helpful_count,
      "dateCreated": question.created_at,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": question.expert_answer,
        "upvoteCount": question.helpful_count,
        "dateCreated": question.created_at,
        "author": {
          "@type": "Organization",
          "name": "TradeMatch Verified Expert"
        }
      }
    }
  };

  return (
    <>
      <style jsx global>{`
        :root {
          --emerald-500: #10b981;
          --emerald-600: #059669;
          --emerald-50: #ecfdf5;
          --slate-900: #0f172a;
          --slate-800: #1e293b;
          --slate-700: #334155;
          --slate-600: #475569;
          --slate-500: #64748b;
          --slate-300: #cbd5e1;
          --slate-200: #e2e8f0;
          --slate-100: #f1f5f9;
          --slate-50: #f8fafc;
          --white: #ffffff;
          --blue-500: #3b82f6;
          --amber-500: #f59e0b;
        }

        body {
          font-family: 'Archivo', -apple-system, sans-serif;
          line-height: 1.6;
          color: var(--slate-900);
          background: var(--slate-50);
        }

        .container { max-width: 900px; margin: 0 auto; padding: 0 1.5rem; }

        .breadcrumb {
          padding: 1.5rem 0;
          font-size: 0.875rem;
          color: var(--slate-600);
        }

        .breadcrumb a {
          color: var(--emerald-600);
          text-decoration: none;
        }

        .question-section {
          background: white;
          border-radius: 16px;
          padding: 2.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .question-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--slate-200);
        }

        .question-category {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: var(--emerald-50);
          color: var(--emerald-700);
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .question-title {
          font-size: 2.25rem;
          font-weight: 900;
          margin-bottom: 1rem;
          line-height: 1.3;
        }

        .question-meta {
          font-size: 0.875rem;
          color: var(--slate-500);
          margin-bottom: 1.5rem;
        }

        .question-body {
          font-size: 1.0625rem;
          line-height: 1.8;
          color: var(--slate-700);
        }

        .question-stats {
          display: flex;
          gap: 2rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--slate-200);
          font-size: 0.875rem;
          color: var(--slate-600);
        }

        .expert-answer {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(59, 130, 246, 0.05));
          border-left: 4px solid var(--emerald-500);
          border-radius: 12px;
          padding: 2.5rem;
          margin-bottom: 2rem;
        }

        .expert-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--emerald-500);
          color: white;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
        }

        .answer-body {
          font-size: 1.0625rem;
          line-height: 1.8;
          color: var(--slate-800);
          white-space: pre-wrap;
        }

        .cta-box {
          background: linear-gradient(135deg, var(--slate-900), var(--slate-800));
          color: white;
          border-radius: 16px;
          padding: 3rem;
          text-align: center;
          margin: 3rem 0;
        }

        .cta-box h3 {
          font-size: 2rem;
          font-weight: 900;
          margin-bottom: 1rem;
        }

        .cta-box p {
          font-size: 1.125rem;
          margin-bottom: 2rem;
          opacity: 0.9;
        }

        .btn-cta {
          display: inline-block;
          padding: 1.25rem 3rem;
          background: var(--amber-500);
          color: var(--slate-900);
          border-radius: 12px;
          font-size: 1.125rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s;
        }

        .btn-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4);
        }

        .related-questions {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          margin: 2rem 0;
        }

        .related-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
        }

        .related-list { list-style: none; }

        .related-item {
          padding: 1rem 0;
          border-bottom: 1px solid var(--slate-100);
        }

        .related-item:last-child { border-bottom: none; }

        .related-item a {
          color: var(--slate-900);
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }

        .related-item a:hover { color: var(--emerald-600); }

        @media (max-width: 768px) {
          .question-title { font-size: 1.75rem; }
          .question-section, .expert-answer, .cta-box { padding: 1.5rem; }
        }
      `}</style>

      <div className="container">
        
        <div className="breadcrumb">
          <a href="/">Home</a> › <a href="/questions">Questions</a> › <a href={`/questions/category/${question.trade_category.toLowerCase()}`}>{question.trade_category}</a>
          {question.location_city && ` › ${question.location_city}`}
        </div>

        <div className="question-section">
          <div className="question-header">
            <div>
              <h1 className="question-title">{question.question_text}</h1>
              <div className="question-meta">
                Asked {new Date(question.created_at).toLocaleDateString('en-GB')}
                {question.location_city && ` • ${question.location_city}`}
              </div>
            </div>
            <span className="question-category">{question.trade_category}</span>
          </div>

          <div className="question-stats">
            <span>👁️ {question.view_count.toLocaleString()} views</span>
            <span>👍 {question.helpful_count} found helpful</span>
            <span>🔖 {question.question_type}</span>
          </div>
        </div>

        <div className="expert-answer">
          <div className="expert-badge">
            ✓ Expert Verified Answer
          </div>

          <div className="answer-body">
            {question.expert_answer}
          </div>
        </div>

        <div className="cta-box">
          <h3>Need a {question.trade_category}{question.location_city ? ` in ${question.location_city}` : ''}?</h3>
          <p>Get 3-5 free quotes from verified, insured professionals near you</p>
          <a 
            href={`/post-job?category=${question.trade_category.toLowerCase()}${question.location_city ? `&location=${question.location_city.toLowerCase()}` : ''}`}
            className="btn-cta"
          >
            Get Free Quotes →
          </a>
        </div>

        {relatedQuestions.length > 0 && (
          <div className="related-questions">
            <h3 className="related-title">Related Questions</h3>
            <ul className="related-list">
              {relatedQuestions.map((relatedSlug, idx) => (
                <li key={idx} className="related-item">
                  <a href={`/questions/${relatedSlug}`}>
                    → {relatedSlug.replace(/-/g, ' ')}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(qaSchema) }}
      />
    </>
  );
}

// ISR Configuration
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = 86400; // Revalidate daily

// Pre-render top questions
export async function generateStaticParams() {
  try {
    const result = await pool.query(`
      SELECT slug FROM community_questions 
      ORDER BY view_count DESC, helpful_count DESC
      LIMIT 100
    `);
    
    return result.rows.map((row) => ({ slug: row.slug }));
  } catch (error) {
    return [];
  }
}
