#!/usr/bin/env python3
"""
TradeMatch Blog Post Generator
Automatically generates individual blog post pages from a template
"""

import os
import json
from pathlib import Path
from datetime import datetime

# ============================================
# CONFIGURATION
# ============================================
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "generated-blog"
TEMPLATE_FILE = BASE_DIR / "blog-post-template.html"

# ============================================
# BLOG POST DATA
# ============================================
BLOG_POSTS = [
    {
        "slug": "complete-guide-hiring-plumber",
        "title": "The Complete Guide to Hiring a Plumber in the UK (2025)",
        "meta_description": "Everything you need to know about hiring a qualified plumber in the UK. Learn about certifications, fair pricing, red flags, and how to find reliable plumbing professionals.",
        "category": "Hiring Tips",
        "author": "Sarah Mitchell",
        "date": "15 Jan 2025",
        "read_time": "8 min read",
        "featured_image": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80",
        "excerpt": "Everything you need to know about finding, vetting, and hiring a qualified plumber. From checking certifications to understanding fair pricing, this comprehensive guide covers it all.",
        "content": """
            <p>Finding a reliable plumber can feel like a daunting task, especially when you're dealing with an emergency leak or planning a major renovation. But with the right knowledge, you can hire a qualified professional with confidence.</p>

            <h2>Understanding Plumber Qualifications</h2>
            <p>In the UK, qualified plumbers should have specific certifications. Look for:</p>
            <ul>
                <li><strong>Gas Safe registration</strong> (essential for any gas work)</li>
                <li><strong>City & Guilds Level 2 or 3</strong> in Plumbing</li>
                <li><strong>NVQ Level 2 or 3</strong> in Plumbing and Heating</li>
                <li><strong>Public liability insurance</strong> (minimum £2 million)</li>
            </ul>

            <h2>What to Expect: Pricing Guide</h2>
            <p>Average plumbing costs in the UK vary by region and job type:</p>
            <ul>
                <li>Emergency callout: £80-£150</li>
                <li>Hourly rate: £40-£80 (£60-£100 in London)</li>
                <li>New bathroom installation: £2,000-£5,000</li>
                <li>Boiler replacement: £1,500-£3,500</li>
            </ul>

            <h2>Red Flags to Watch Out For</h2>
            <p>Avoid plumbers who:</p>
            <ul>
                <li>Can't provide proof of Gas Safe registration</li>
                <li>Demand full payment upfront</li>
                <li>Don't offer a written quote</li>
                <li>Have no online reviews or references</li>
                <li>Pressure you into immediate decisions</li>
            </ul>

            <h2>Using TradeMatch to Find Plumbers</h2>
            <p>TradeMatch makes hiring easy by connecting you with verified local plumbers. Every professional on our platform is:</p>
            <ul>
                <li>ID verified</li>
                <li>Insurance checked</li>
                <li>Rated by real customers</li>
                <li>Local to your area</li>
            </ul>

            <p>Simply post your job, receive multiple quotes, and choose the right plumber for your needs. It's free, fast, and takes the stress out of finding reliable tradespeople.</p>
        """
    },
    {
        "slug": "kitchen-renovation-costs-uk",
        "title": "Kitchen Renovation Costs UK: What to Expect in 2025",
        "meta_description": "Planning a kitchen renovation? Complete cost breakdown for UK kitchens in 2025, including average prices, budget tips, and how to save money without compromising quality.",
        "category": "Home Improvement",
        "author": "James Chen",
        "date": "12 Jan 2025",
        "read_time": "6 min read",
        "featured_image": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
        "excerpt": "Planning a kitchen renovation? Learn about average costs, budget breakdowns, and how to save money without compromising quality.",
        "content": """
            <p>A kitchen renovation is one of the most significant home improvements you can make. Understanding the costs involved helps you budget effectively and avoid surprises.</p>

            <h2>Average Kitchen Renovation Costs</h2>
            <p>UK kitchen renovation costs vary significantly based on size, quality, and location:</p>
            <ul>
                <li><strong>Budget kitchen:</strong> £5,000-£8,000</li>
                <li><strong>Mid-range kitchen:</strong> £8,000-£15,000</li>
                <li><strong>High-end kitchen:</strong> £15,000-£30,000+</li>
                <li><strong>Luxury kitchen:</strong> £30,000-£50,000+</li>
            </ul>

            <h2>Cost Breakdown</h2>
            <p>Here's where your money typically goes:</p>
            <ul>
                <li>Cabinets and units: 30-40%</li>
                <li>Appliances: 20-30%</li>
                <li>Labor: 20-25%</li>
                <li>Worktops: 10-15%</li>
                <li>Flooring and tiling: 5-10%</li>
                <li>Plumbing and electrical: 5-10%</li>
            </ul>

            <h2>Money-Saving Tips</h2>
            <p>Reduce costs without sacrificing quality:</p>
            <ul>
                <li>Keep the existing layout (moving plumbing is expensive)</li>
                <li>Choose ready-made cabinets over custom</li>
                <li>Do painting and tiling yourself</li>
                <li>Shop around for appliances during sales</li>
                <li>Use TradeMatch to compare quotes from multiple kitchen fitters</li>
            </ul>

            <h2>When to Spend More</h2>
            <p>Invest in quality for:</p>
            <ul>
                <li>Worktops (they get heavy use)</li>
                <li>Hinges and drawer runners (cheap ones fail quickly)</li>
                <li>Appliances (reliable brands save money long-term)</li>
                <li>Professional installation (mistakes are costly to fix)</li>
            </ul>

            <p>Ready to start your kitchen renovation? Post your job on TradeMatch and receive competitive quotes from verified local kitchen fitters.</p>
        """
    },
    {
        "slug": "red-flags-hiring-tradespeople",
        "title": "10 Red Flags to Watch for When Hiring Tradespeople",
        "meta_description": "Protect yourself from cowboy builders and unreliable tradespeople. Learn the warning signs that indicate you should walk away before hiring.",
        "category": "Hiring Tips",
        "author": "Rachel Patel",
        "date": "10 Jan 2025",
        "read_time": "5 min read",
        "featured_image": "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&q=80",
        "excerpt": "Protect yourself from cowboy builders and unreliable tradespeople. Learn the warning signs that indicate you should walk away.",
        "content": """
            <p>Hiring the wrong tradesperson can cost you thousands in repairs and cause months of stress. Learn to spot these red flags before it's too late.</p>

            <h2>1. No Written Quote</h2>
            <p>A professional tradesperson will always provide a detailed written quote. Verbal estimates are vague and unenforceable. If they can't put it in writing, walk away.</p>

            <h2>2. Demands Cash Payment</h2>
            <p>Insisting on cash-only payments is a major warning sign. Legitimate tradespeople accept bank transfers and card payments. Cash payments leave no paper trail if something goes wrong.</p>

            <h2>3. Requests Full Payment Upfront</h2>
            <p>Never pay 100% upfront. Standard practice is a small deposit (10-20%), staged payments, or payment upon completion. Large upfront demands often indicate cash flow problems or worse.</p>

            <h2>4. No Insurance or Credentials</h2>
            <p>Always verify:</p>
            <ul>
                <li>Public liability insurance</li>
                <li>Professional qualifications</li>
                <li>Gas Safe registration (for gas work)</li>
                <li>Trade association membership</li>
            </ul>

            <h2>5. Pressure Tactics</h2>
            <p>Be wary of tradespeople who:</p>
            <ul>
                <li>Push for immediate decisions</li>
                <li>Claim the quote expires today</li>
                <li>Say they can start immediately (no other jobs?)</li>
                <li>Offer huge discounts if you sign now</li>
            </ul>

            <h2>6. No References or Reviews</h2>
            <p>Established professionals have satisfied customers. If they can't provide references or have zero online reviews, question why.</p>

            <h2>7. Vague Timeline</h2>
            <p>"A couple of weeks" isn't a timeline. Professional quotes include specific start dates, estimated completion, and potential delays.</p>

            <h2>8. Changes Quote Dramatically</h2>
            <p>If the quote jumps significantly after inspection, get a detailed explanation. Legitimate price increases are well-documented, not arbitrary.</p>

            <h2>9. Unregistered Business</h2>
            <p>Check if they're:</p>
            <ul>
                <li>Registered with Companies House</li>
                <li>VAT registered (for larger businesses)</li>
                <li>Members of trade associations</li>
            </ul>

            <h2>10. Poor Communication</h2>
            <p>If they're hard to reach, slow to respond, or unprofessional now, imagine dealing with problems after the job starts.</p>

            <h2>How TradeMatch Helps</h2>
            <p>TradeMatch pre-vets all tradespeople on our platform:</p>
            <ul>
                <li>ID verification</li>
                <li>Insurance checks</li>
                <li>Real customer reviews</li>
                <li>Professional qualifications confirmed</li>
            </ul>

            <p>Post your job free and receive quotes from verified professionals. No red flags, just reliable tradespeople.</p>
        """
    }
]

# ============================================
# BLOG POST TEMPLATE
# ============================================
BLOG_POST_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | TradeMatch Blog</title>
    <meta name="description" content="{meta_description}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{excerpt}">
    <meta property="og:image" content="{featured_image}">
    <meta property="og:type" content="article">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
    
    <style>
        :root {{
            --emerald-500: #10b981;
            --emerald-600: #059669;
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
            --white: #ffffff;
            --blue-500: #3b82f6;
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Archivo', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.7;
            color: var(--slate-800);
            background: var(--white);
        }}

        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }}

        /* Navigation */
        .navbar {{
            background: var(--white);
            border-bottom: 1px solid var(--slate-200);
            padding: 1rem 0;
            position: sticky;
            top: 0;
            z-index: 1000;
        }}

        .navbar .container {{
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        .logo {{
            font-size: 1.5rem;
            font-weight: 900;
            color: var(--slate-900);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}

        .logo-icon {{
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, var(--emerald-500), var(--blue-500));
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 800;
        }}

        .back-link {{
            color: var(--emerald-600);
            text-decoration: none;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }}

        .back-link:hover {{
            color: var(--emerald-700);
        }}

        /* Article Header */
        .article-header {{
            max-width: 800px;
            margin: 3rem auto;
            text-align: center;
        }}

        .post-category {{
            display: inline-block;
            padding: 0.375rem 0.875rem;
            background: rgba(16, 185, 129, 0.1);
            color: var(--emerald-700);
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
        }}

        .article-header h1 {{
            font-size: 3rem;
            font-weight: 900;
            line-height: 1.2;
            margin-bottom: 1.5rem;
            color: var(--slate-900);
        }}

        .article-meta {{
            display: flex;
            justify-content: center;
            gap: 2rem;
            flex-wrap: wrap;
            color: var(--slate-600);
            font-size: 0.9375rem;
        }}

        .meta-item {{
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}

        /* Featured Image */
        .featured-image {{
            max-width: 1200px;
            margin: 3rem auto;
            border-radius: 16px;
            overflow: hidden;
        }}

        .featured-image img {{
            width: 100%;
            height: auto;
            display: block;
        }}

        /* Article Content */
        .article-content {{
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 0 5rem;
        }}

        .article-content p {{
            font-size: 1.125rem;
            line-height: 1.8;
            margin-bottom: 1.5rem;
            color: var(--slate-700);
        }}

        .article-content h2 {{
            font-size: 2rem;
            font-weight: 800;
            margin: 3rem 0 1.5rem;
            color: var(--slate-900);
        }}

        .article-content h3 {{
            font-size: 1.5rem;
            font-weight: 700;
            margin: 2rem 0 1rem;
            color: var(--slate-900);
        }}

        .article-content ul,
        .article-content ol {{
            margin: 1.5rem 0 1.5rem 2rem;
        }}

        .article-content li {{
            font-size: 1.125rem;
            line-height: 1.8;
            margin-bottom: 0.75rem;
            color: var(--slate-700);
        }}

        .article-content strong {{
            color: var(--slate-900);
            font-weight: 700;
        }}

        .article-content a {{
            color: var(--emerald-600);
            text-decoration: none;
        }}

        .article-content a:hover {{
            text-decoration: underline;
        }}

        /* CTA Box */
        .cta-box {{
            background: linear-gradient(135deg, var(--emerald-500), var(--blue-500));
            color: white;
            padding: 3rem;
            border-radius: 16px;
            text-align: center;
            margin: 4rem 0;
        }}

        .cta-box h3 {{
            font-size: 2rem;
            margin-bottom: 1rem;
        }}

        .cta-box p {{
            font-size: 1.125rem;
            margin-bottom: 2rem;
            color: rgba(255, 255, 255, 0.95);
        }}

        .cta-btn {{
            display: inline-block;
            padding: 1rem 2.5rem;
            background: white;
            color: var(--emerald-600);
            border-radius: 8px;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.2s;
        }}

        .cta-btn:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }}

        /* Footer */
        .footer {{
            background: var(--slate-900);
            color: rgba(255, 255, 255, 0.7);
            padding: 3rem 0 2rem;
            margin-top: 5rem;
        }}

        .footer-bottom {{
            text-align: center;
            font-size: 0.875rem;
        }}

        @media (max-width: 768px) {{
            .container {{
                padding: 0 1rem;
            }}

            .article-header h1 {{
                font-size: 2rem;
            }}

            .article-content p,
            .article-content li {{
                font-size: 1rem;
            }}
        }}
    </style>
</head>
<body>
    
    <nav class="navbar">
        <div class="container">
            <a href="/" class="logo">
                <div class="logo-icon">T</div>
                <span>TradeMatch</span>
            </a>
            <a href="/blog" class="back-link">← Back to Blog</a>
        </div>
    </nav>

    <article>
        <div class="container">
            <header class="article-header">
                <span class="post-category">{category}</span>
                <h1>{title}</h1>
                <div class="article-meta">
                    <span class="meta-item">
                        <span>✍️</span>
                        <span>{author}</span>
                    </span>
                    <span class="meta-item">
                        <span>📅</span>
                        <span>{date}</span>
                    </span>
                    <span class="meta-item">
                        <span>⏱️</span>
                        <span>{read_time}</span>
                    </span>
                </div>
            </header>

            <div class="featured-image">
                <img src="{featured_image}" alt="{title}">
            </div>

            <div class="article-content">
                {content}

                <div class="cta-box">
                    <h3>Need Help with Your Home Improvement Project?</h3>
                    <p>Post your job free and receive up to 5 quotes from verified local tradespeople</p>
                    <a href="/post-job" class="cta-btn">Get Free Quotes →</a>
                </div>
            </div>
        </div>
    </article>

    <footer class="footer">
        <div class="container">
            <div class="footer-bottom">
                <p>&copy; 2025 TradeMatch. All rights reserved.</p>
            </div>
        </div>
    </footer>

</body>
</html>
"""

# ============================================
# HELPER FUNCTIONS
# ============================================

def generate_blog_post(post_data):
    """Generate a single blog post page"""
    html_content = BLOG_POST_TEMPLATE.format(
        slug=post_data['slug'],
        title=post_data['title'],
        meta_description=post_data['meta_description'],
        category=post_data['category'],
        author=post_data['author'],
        date=post_data['date'],
        read_time=post_data['read_time'],
        featured_image=post_data['featured_image'],
        excerpt=post_data['excerpt'],
        content=post_data['content']
    )
    
    # Create output directory
    blog_dir = OUTPUT_DIR / "blog"
    blog_dir.mkdir(parents=True, exist_ok=True)
    
    # Write file
    output_file = blog_dir / f"{post_data['slug']}.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return output_file


def generate_all_posts():
    """Generate all blog posts"""
    print("=" * 60)
    print("  TradeMatch Blog Post Generator")
    print("=" * 60)
    print()
    
    generated_posts = []
    
    for idx, post in enumerate(BLOG_POSTS, 1):
        print(f"[{idx}/{len(BLOG_POSTS)}] Generating: {post['title']}")
        output_file = generate_blog_post(post)
        generated_posts.append(output_file)
        print(f"  ✅ Saved to: {output_file}")
    
    # Save post metadata
    metadata_file = OUTPUT_DIR / "blog-metadata.json"
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "total_posts": len(BLOG_POSTS),
            "posts": [{k: v for k, v in post.items() if k != 'content'} for post in BLOG_POSTS]
        }, f, indent=2, ensure_ascii=False)
    
    print()
    print("=" * 60)
    print("  ✅ GENERATION COMPLETE!")
    print("=" * 60)
    print()
    print(f"📁 Output Directory: {OUTPUT_DIR}")
    print(f"📄 Total Posts: {len(generated_posts)}")
    print(f"📋 Metadata: {metadata_file}")
    print()
    print("🎉 All blog posts generated successfully!")
    print()


if __name__ == "__main__":
    generate_all_posts()
