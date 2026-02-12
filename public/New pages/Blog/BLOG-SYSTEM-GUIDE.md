# TradeMatch Blog System - Complete Guide

## 📚 Overview

The TradeMatch blog system consists of:
1. **Blog listing page** (`blog.html`) - Main blog index with featured posts, categories, and search
2. **Individual post pages** - Generated from templates using Python script
3. **Blog post generator** (`generate-blog-posts.py`) - Automated page creation script

---

## 🚀 Quick Start

### Running the Blog Generator

```bash
# Navigate to the directory
cd /path/to/tradematch-blog

# Run the generator
python3 generate-blog-posts.py
```

**Output:**
```
============================================================
  TradeMatch Blog Post Generator
============================================================

[1/3] Generating: The Complete Guide to Hiring a Plumber in the UK (2025)
  ✅ Saved to: generated-blog/blog/complete-guide-hiring-plumber.html
[2/3] Generating: Kitchen Renovation Costs UK: What to Expect in 2025
  ✅ Saved to: generated-blog/blog/kitchen-renovation-costs-uk.html
[3/3] Generating: 10 Red Flags to Watch for When Hiring Tradespeople
  ✅ Saved to: generated-blog/blog/red-flags-hiring-tradespeople.html

============================================================
  ✅ GENERATION COMPLETE!
============================================================

📁 Output Directory: generated-blog/
📄 Total Posts: 3
📋 Metadata: generated-blog/blog-metadata.json

🎉 All blog posts generated successfully!
```

---

## ✍️ Adding New Blog Posts

### Method 1: Edit the Python Script (Recommended)

1. **Open `generate-blog-posts.py`**

2. **Add a new post to the `BLOG_POSTS` list:**

```python
BLOG_POSTS = [
    # ... existing posts ...
    {
        "slug": "your-post-slug",  # URL-friendly name (lowercase, hyphens)
        "title": "Your Amazing Blog Post Title",
        "meta_description": "SEO meta description (150-160 characters)",
        "category": "Hiring Tips",  # or "Home Improvement", "How-To Guides", "Industry News"
        "author": "Your Name",
        "date": "20 Jan 2025",  # Format: DD Mon YYYY
        "read_time": "5 min read",
        "featured_image": "https://images.unsplash.com/photo-xxxxx?w=1200&q=80",
        "excerpt": "Brief 1-2 sentence summary for preview cards.",
        "content": """
            <p>Your introduction paragraph goes here.</p>

            <h2>First Major Section</h2>
            <p>Content for first section...</p>
            <ul>
                <li>Bullet point one</li>
                <li>Bullet point two</li>
            </ul>

            <h2>Second Major Section</h2>
            <p>More content...</p>
        """
    }
]
```

3. **Run the generator:**
```bash
python3 generate-blog-posts.py
```

4. **Your new post is created at:**
```
generated-blog/blog/your-post-slug.html
```

---

### Method 2: Create Individual Posts Manually

If you only need to create one post without running the full script:

```python
#!/usr/bin/env python3
"""Quick single post generator"""

from generate_blog_posts import generate_blog_post

new_post = {
    "slug": "bathroom-renovation-tips",
    "title": "10 Bathroom Renovation Tips That Save Money",
    "meta_description": "Expert tips for bathroom renovations on a budget...",
    "category": "Home Improvement",
    "author": "Sarah Mitchell",
    "date": "22 Jan 2025",
    "read_time": "7 min read",
    "featured_image": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
    "excerpt": "Save thousands on your bathroom renovation with these expert tips.",
    "content": """
        <p>Your content here...</p>
    """
}

generate_blog_post(new_post)
print(f"✅ Generated: {new_post['slug']}.html")
```

---

## 📂 File Structure

```
tradematch-blog/
├── blog.html                          # Main blog listing page
├── generate-blog-posts.py             # Blog post generator script
├── BLOG-SYSTEM-GUIDE.md              # This guide
│
└── generated-blog/                    # Output directory (auto-created)
    ├── blog-metadata.json             # Post metadata & index
    └── blog/
        ├── complete-guide-hiring-plumber.html
        ├── kitchen-renovation-costs-uk.html
        ├── red-flags-hiring-tradespeople.html
        └── [your-new-posts].html
```

---

## 🎨 Content Formatting Guide

### Headings

```html
<h2>Main Section Heading</h2>        <!-- Use for major sections -->
<h3>Subsection Heading</h3>           <!-- Use for subsections -->
```

### Paragraphs

```html
<p>Regular paragraph text goes here. Keep paragraphs focused and readable.</p>
```

### Lists

**Unordered (bullets):**
```html
<ul>
    <li>First item</li>
    <li>Second item</li>
    <li>Third item</li>
</ul>
```

**Ordered (numbered):**
```html
<ol>
    <li>First step</li>
    <li>Second step</li>
    <li>Third step</li>
</ol>
```

### Bold Text

```html
<p>Use <strong>bold text</strong> for emphasis.</p>
```

### Links

```html
<p>Check out our <a href="/post-job">post a job</a> page.</p>
```

### Blockquotes (Optional)

```html
<blockquote>
    <p>"A notable quote or important callout."</p>
</blockquote>
```

---

## 🏷️ Categories

Choose from these predefined categories:

- **Hiring Tips** - How to find and hire tradespeople
- **Home Improvement** - Renovation guides, design ideas
- **How-To Guides** - DIY tutorials, step-by-step instructions
- **Industry News** - Trade industry updates, regulations
- **Cost Guides** - Pricing information, budget planning

---

## 🖼️ Finding Featured Images

### Recommended Sources:

1. **Unsplash** (Free, high-quality)
   - URL format: `https://images.unsplash.com/photo-XXXXX?w=1200&q=80`
   - Search: [unsplash.com](https://unsplash.com)
   - Categories: construction, home improvement, renovation, tools

2. **Pexels** (Free)
   - URL format: `https://images.pexels.com/photos/XXXXX/photo.jpg?w=1200`

3. **Custom Images**
   - Upload to your CDN/server
   - Recommended size: 1200x630px (social sharing optimized)

### Image Best Practices:
- Minimum width: 1200px
- Aspect ratio: 16:9 or 3:2
- File size: < 500KB (optimize for web)
- Format: JPG or WebP

---

## 📊 SEO Best Practices

### Title
- **Length:** 50-60 characters
- **Include:** Main keyword + year (if relevant)
- **Example:** "Kitchen Renovation Costs UK: What to Expect in 2025"

### Meta Description
- **Length:** 150-160 characters
- **Include:** Main keyword, benefit, call-to-action
- **Example:** "Planning a kitchen renovation? Complete cost breakdown for UK kitchens in 2025, including average prices and money-saving tips."

### Slug
- **Format:** lowercase, hyphens only
- **Length:** 3-6 words
- **Avoid:** stop words (the, a, an), special characters
- **Good:** `kitchen-renovation-costs-uk`
- **Bad:** `the-complete-guide-to-kitchen-renovation-costs-in-the-uk`

### Content
- **Length:** 800-2000 words (minimum 800)
- **Structure:** H2s every 200-300 words
- **Keywords:** Natural placement, 1-2% density
- **Links:** 2-3 internal links to TradeMatch pages

---

## 🔄 Updating Existing Posts

### Option 1: Regenerate All Posts
1. Edit the post in `BLOG_POSTS` array
2. Run `python3 generate-blog-posts.py`
3. All posts regenerate (safe, keeps consistency)

### Option 2: Edit HTML Directly
1. Open `generated-blog/blog/[slug].html`
2. Edit content between `<div class="article-content">` tags
3. Save file
4. **Warning:** Changes lost if you regenerate all posts

---

## 📝 Blog Post Template Anatomy

```python
{
    "slug": "url-friendly-name",              # No spaces, lowercase, hyphens only
    "title": "Exact Title (50-60 chars)",     # Shows in browser tab & H1
    "meta_description": "SEO desc 150-160",   # Google search snippet
    "category": "Category Name",               # From predefined list
    "author": "Author Name",                   # Byline attribution
    "date": "DD Mon YYYY",                    # Publication date
    "read_time": "X min read",                # Estimated reading time
    "featured_image": "https://...",          # Hero image URL
    "excerpt": "1-2 sentence preview",        # Preview cards & social
    "content": """HTML content here"""        # Main article body
}
```

---

## 🎯 Content Strategy

### Ideal Post Mix:
- **40%** - Hiring Tips (matches user intent)
- **30%** - How-To Guides (evergreen content)
- **20%** - Home Improvement (inspiration)
- **10%** - Industry News (authority building)

### Publishing Frequency:
- **Minimum:** 2 posts/month
- **Optimal:** 4-6 posts/month
- **Best days:** Tuesday-Thursday (higher engagement)

### Content Calendar Ideas:

**January - March (Winter)**
- Heating system maintenance
- Winter home repairs
- Planning spring renovations

**April - June (Spring)**
- Garden & landscaping
- Exterior painting
- Roof inspections

**July - September (Summer)**
- Kitchen renovations
- Bathroom upgrades
- Extension projects

**October - December (Autumn)**
- Insulation & energy efficiency
- Boiler servicing
- Winter preparation

---

## 🔗 Adding Posts to Blog Index

After generating new posts, update `blog.html`:

1. **Add to Featured Post (if applicable):**
```html
<article class="featured-post fade-in">
    <div class="featured-image">
        <img src="YOUR_IMAGE_URL" alt="YOUR_TITLE">
        <span class="featured-badge">Featured</span>
    </div>
    <div class="featured-content">
        <div class="post-meta">
            <span class="post-category">YOUR_CATEGORY</span>
            <!-- ... meta items ... -->
        </div>
        <h2><a href="/blog/YOUR_SLUG">YOUR_TITLE</a></h2>
        <p class="post-excerpt">YOUR_EXCERPT</p>
        <a href="/blog/YOUR_SLUG" class="read-more">Read Full Article →</a>
    </div>
</article>
```

2. **Add to Posts Grid:**
```html
<article class="post-card fade-in">
    <div class="post-image">
        <img src="YOUR_IMAGE_URL" alt="YOUR_TITLE">
    </div>
    <div class="post-content">
        <div class="post-meta">
            <span class="post-category">YOUR_CATEGORY</span>
            <span class="meta-item">
                <span class="meta-icon">📅</span>
                <span>YOUR_DATE</span>
            </span>
        </div>
        <h3><a href="/blog/YOUR_SLUG">YOUR_TITLE</a></h3>
        <p class="post-excerpt">YOUR_EXCERPT</p>
        <a href="/blog/YOUR_SLUG" class="read-more">Read More →</a>
    </div>
</article>
```

3. **Update Popular Posts Sidebar:**
```html
<li class="popular-post-item">
    <a href="/blog/YOUR_SLUG">YOUR_TITLE</a>
    <div class="popular-post-date">YOUR_DATE</div>
</li>
```

---

## 🚀 Deployment

### Static Hosting (Recommended)
```bash
# Copy generated files to your web server
cp -r generated-blog/blog/* /var/www/html/blog/
cp blog.html /var/www/html/blog/index.html
```

### Netlify/Vercel
```bash
# Deploy entire directory
netlify deploy --dir=generated-blog --prod
```

### WordPress Integration
1. Create custom post type "blog_posts"
2. Import HTML content into post editor
3. Map metadata to custom fields

---

## 📈 Analytics Tracking

Add to each blog post template:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

Track these metrics:
- Page views
- Time on page
- Scroll depth
- CTA click rate
- Social shares

---

## 🔧 Troubleshooting

### Generator Fails to Run
```bash
# Check Python version (need 3.6+)
python3 --version

# Verify script permissions
chmod +x generate-blog-posts.py
```

### Images Not Loading
- Verify image URLs are publicly accessible
- Check for HTTPS (not HTTP)
- Test image URL in browser

### Formatting Issues
- Ensure HTML tags are properly closed
- Check for smart quotes (" " vs " ")
- Validate HTML: [validator.w3.org](https://validator.w3.org)

### SEO Not Working
- Check meta tags in generated HTML
- Verify canonical URLs
- Submit sitemap to Google Search Console

---

## 📋 Example: Complete New Post

```python
{
    "slug": "boiler-replacement-guide-uk",
    "title": "Boiler Replacement Guide UK: Costs, Grants & How to Choose",
    "meta_description": "Complete guide to boiler replacement in the UK. Learn about costs, available grants, best boiler types, and how to find qualified Gas Safe engineers.",
    "category": "How-To Guides",
    "author": "Mike Anderson",
    "date": "25 Jan 2025",
    "read_time": "9 min read",
    "featured_image": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=80",
    "excerpt": "Replacing your boiler? Learn about costs (£1,500-£4,000), government grants, and how to choose the right system for your home.",
    "content": """
        <p>Replacing a boiler is a significant investment, but modern energy-efficient models can save you hundreds annually on heating bills. This comprehensive guide covers everything you need to know.</p>

        <h2>Boiler Replacement Costs UK (2025)</h2>
        <p>Average boiler replacement costs vary by type and installation complexity:</p>
        <ul>
            <li><strong>Combi boiler:</strong> £1,500-£3,000</li>
            <li><strong>System boiler:</strong> £2,000-£3,500</li>
            <li><strong>Regular (conventional) boiler:</strong> £2,500-£4,000</li>
        </ul>
        <p>These prices include the boiler unit, installation labor, and necessary parts. Complex installations (moving location, upgrading pipework) cost more.</p>

        <h2>Which Boiler Type is Right for You?</h2>
        
        <h3>Combi Boilers (Most Popular)</h3>
        <p><strong>Best for:</strong> Small to medium homes, 1-2 bathrooms</p>
        <ul>
            <li>Heats water on demand (no tank needed)</li>
            <li>Space-saving and energy-efficient</li>
            <li>Not ideal for homes with multiple bathrooms in use simultaneously</li>
        </ul>

        <h3>System Boilers</h3>
        <p><strong>Best for:</strong> Larger homes, multiple bathrooms</p>
        <ul>
            <li>Stores hot water in a cylinder</li>
            <li>Suitable for high hot water demand</li>
            <li>Works well with solar thermal systems</li>
        </ul>

        <h3>Regular (Conventional) Boilers</h3>
        <p><strong>Best for:</strong> Older homes with existing systems, very high demand</p>
        <ul>
            <li>Requires both hot water cylinder and cold water tank</li>
            <li>Most expensive to install</li>
            <li>Good for period properties with traditional radiator systems</li>
        </ul>

        <h2>Government Boiler Grants & Schemes</h2>
        <p>You may be eligible for funding to help with boiler replacement costs:</p>

        <h3>ECO4 Scheme (Energy Company Obligation)</h3>
        <ul>
            <li>Free or heavily subsidized boiler replacement</li>
            <li>Available to low-income households and those on benefits</li>
            <li>Eligibility based on benefits received and property EPC rating</li>
        </ul>

        <h3>Boiler Upgrade Scheme</h3>
        <ul>
            <li>£5,000 grant for air source heat pumps</li>
            <li>£6,000 grant for ground source heat pumps</li>
            <li>Available until March 2028</li>
        </ul>

        <h2>Choosing a Gas Safe Engineer</h2>
        <p>Only Gas Safe registered engineers can legally work on gas boilers. Always verify:</p>
        <ul>
            <li><strong>Gas Safe ID card</strong> - Check photo and license number</li>
            <li><strong>Registration</strong> - Verify online at gassaferegister.co.uk</li>
            <li><strong>Appropriate category</strong> - Ensure they're qualified for boiler installation</li>
        </ul>

        <h2>What to Expect During Installation</h2>
        <p>A typical boiler replacement takes 1-2 days and involves:</p>
        <ol>
            <li>Draining old system and removing old boiler</li>
            <li>Installing new boiler and controls</li>
            <li>Connecting to gas, water, and electrics</li>
            <li>Power flushing system (recommended)</li>
            <li>Testing and commissioning</li>
            <li>Demonstrating controls and providing warranty documents</li>
        </ol>

        <h2>Energy Efficiency Tips</h2>
        <p>Maximize your new boiler's efficiency:</p>
        <ul>
            <li>Install a smart thermostat (saves £75/year average)</li>
            <li>Bleed radiators annually</li>
            <li>Service boiler yearly (required for warranty)</li>
            <li>Insulate pipes in unheated spaces</li>
            <li>Consider upgrading radiators to modern efficient models</li>
        </ul>

        <h2>Finding Qualified Installers with TradeMatch</h2>
        <p>TradeMatch connects you with verified Gas Safe registered engineers in your area. All professionals on our platform are:</p>
        <ul>
            <li>Gas Safe registered and verified</li>
            <li>Insurance checked</li>
            <li>Rated by real customers</li>
            <li>Local to your postcode</li>
        </ul>
        <p>Post your boiler replacement job free and receive up to 5 competitive quotes. Compare prices, reviews, and experience before making your decision.</p>
    """
}
```

---

## 🎉 Success Checklist

Before publishing a new post, verify:

- [ ] Slug is URL-friendly (lowercase, hyphens, no special chars)
- [ ] Title is 50-60 characters
- [ ] Meta description is 150-160 characters
- [ ] Category is valid (from predefined list)
- [ ] Featured image URL is working and high-quality
- [ ] Content has at least 2-3 H2 headings
- [ ] Content is 800+ words
- [ ] Internal links to TradeMatch pages included
- [ ] Read time is accurate (800 words ≈ 5 min)
- [ ] HTML is properly formatted (test in browser)
- [ ] CTA box is included in content
- [ ] Added to blog index page
- [ ] Regenerated all posts successfully
- [ ] Tested on mobile and desktop

---

## 📞 Support

Questions? Check:
- **Python docs:** [python.org/doc](https://docs.python.org)
- **HTML reference:** [developer.mozilla.org](https://developer.mozilla.org)
- **Unsplash API:** [unsplash.com/developers](https://unsplash.com/developers)

Happy blogging! 🚀
