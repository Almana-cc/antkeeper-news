# Myrmecology News Platform - Implementation Plan

## Project Overview
Building a **standalone** news aggregation platform for ant-related content ("Myrmecology News by AntKeeper"):
- **Separate codebase** from the AntKeeper mobile app
- Automated news aggregation from multiple sources
- Web-based platform (initially read-only, no auth required for MVP)
- Future: Social media content generation (TikTok/Instagram)
- Future: Optional app integration for comments/engagement

## Key Constraints
- ✅ Standalone project (independent of app codebase)
- ✅ Real database (not Firestore - considering PostgreSQL/MySQL)
- ✅ MVP: Read-only web platform, no authentication
- ✅ Automated content aggregation (hourly updates)
- ✅ SEO-optimized for discovery

## Technical Stack (Based on User Input)
- **Frontend**: Nuxt 3 (Vue.js, SSR/SSG for SEO)
- **Database**: PostgreSQL
- **Content Sources**: RSS feeds (ant blogs) + News aggregator APIs
- **Hosting**: TBD (recommendations: Vercel/Netlify for frontend, Railway/Supabase for DB)

---

## MVP Architecture

### 1. Database Schema (PostgreSQL)

```sql
-- Core tables
articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  content TEXT,
  summary TEXT,
  source_name VARCHAR(200),
  source_url TEXT,
  author VARCHAR(200),
  published_at TIMESTAMP,
  scraped_at TIMESTAMP DEFAULT NOW(),
  language VARCHAR(5) DEFAULT 'en',
  image_url TEXT,
  tags TEXT[], -- PostgreSQL array for tags
  category VARCHAR(50), -- e.g., 'research', 'care', 'news', 'species'
  view_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false
)

sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50), -- 'rss', 'api', 'manual'
  url TEXT,
  last_fetched_at TIMESTAMP,
  fetch_interval_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  config JSONB -- Store RSS feed URL, API keys, etc.
)

article_sources (
  article_id INTEGER REFERENCES articles(id),
  source_id INTEGER REFERENCES sources(id),
  original_url TEXT,
  PRIMARY KEY (article_id, source_id)
)

-- For tracking same article from multiple sources
article_duplicates (
  id SERIAL PRIMARY KEY,
  canonical_article_id INTEGER REFERENCES articles(id),
  duplicate_article_id INTEGER REFERENCES articles(id),
  similarity_score FLOAT,
  merged_at TIMESTAMP DEFAULT NOW()
)
```

**Indexes for performance**:
```sql
CREATE INDEX idx_articles_published ON articles(published_at DESC);
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_featured ON articles(featured, published_at DESC);
CREATE INDEX idx_articles_category ON articles(category, published_at DESC);
CREATE INDEX idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX idx_articles_fulltext ON articles USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));
```

### 2. News Aggregation System

**Tech Stack for Aggregation**:
- **RSS Parsing**: `feedparser` (Python) or `rss-parser` (Node.js)
- **API Integration**: `axios` or `node-fetch` for HTTP requests
- **Scheduler**: Node-cron or BullMQ for job queue
- **Duplicate Detection**: Text similarity using TF-IDF or simple title matching

**Recommended Sources to Start**:
```javascript
// RSS Feeds
const rssSources = [
  { name: 'AntWiki', url: 'https://www.antwiki.org/wiki/Special:RecentChanges?feed=rss' },
  { name: 'AntBlog', url: 'https://antblog.info/feed/' },
  // Add more ant-related RSS feeds
]

// News APIs
const newsAPIs = [
  {
    name: 'NewsAPI',
    endpoint: 'https://newsapi.org/v2/everything',
    params: { q: 'ants OR myrmecology OR antkeeping', language: 'en' }
  },
  // Google News RSS (free alternative)
  {
    name: 'Google News',
    url: 'https://news.google.com/rss/search?q=ants+myrmecology&hl=en'
  }
]
```

**Aggregation via Nuxt Backend**:
Since you're using Nuxt, leverage its server API routes for aggregation:

```
/nuxt-news-platform
  /server
    /api
      /admin
        - scrape-now.post.ts   # Manual trigger to fetch articles
    /utils
      - db.ts                  # PostgreSQL connection
      - scrapers/
        - rss-scraper.ts       # Generic RSS feed parser
        - google-news.ts       # Google News RSS scraper
      - processors/
        - duplicate-detector.ts # Find similar articles
        - content-cleaner.ts    # Strip HTML, extract text
        - tag-extractor.ts      # Auto-tag articles
```

**Cron Strategy**:
- **Option 1**: External cron service (cron-job.org, EasyCron) hits `/api/admin/scrape-now` endpoint hourly
- **Option 2**: Deploy separate Node.js worker on same hosting platform
- **Option 3**: Use hosting platform's built-in cron (Railway, Vercel Cron)

### 3. Nuxt 3 Frontend

**Project Structure**:
```
/nuxt-news-platform
  /pages
    - index.vue              # Homepage with latest articles
    - articles/[slug].vue    # Individual article view
    - category/[name].vue    # Category listing
    - tag/[tag].vue          # Tag-based filtering
  /components
    - ArticleCard.vue        # Article preview card
    - ArticleFeed.vue        # Paginated article list
    - SourceBadge.vue        # Show multiple sources
    - FeaturedArticle.vue    # Hero section
  /composables
    - useArticles.ts         # Data fetching logic
    - usePagination.ts       # Pagination helper
  /server
    /api
      - articles.get.ts      # GET /api/articles (list)
      - articles/[slug].get.ts # GET /api/articles/:slug
      - articles/trending.get.ts # Featured/trending
  /assets
    - css/main.css           # Tailwind styles
  - nuxt.config.ts
  - package.json
```

**Key Nuxt Features to Use**:
- **SSG/SSR**: Pre-render article pages for SEO
- **useFetch**: Server-side data fetching with caching
- **Dynamic routes**: `/articles/[slug]` for SEO-friendly URLs
- **Meta tags**: `useHead()` for OpenGraph, Twitter cards
- **Sitemap**: Auto-generate XML sitemap for Google

**Example API Route** (`server/api/articles.get.ts`):
```typescript
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const limit = 20
  const offset = (page - 1) * limit

  const { rows } = await pool.query(`
    SELECT id, title, slug, summary, source_name, published_at, image_url, tags
    FROM articles
    WHERE published_at IS NOT NULL
    ORDER BY published_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset])

  return { articles: rows, page, hasMore: rows.length === limit }
})
```

### 4. Deployment Architecture

**Simplified Approach** (hosting TBD):
- **Nuxt app**: Handles both frontend and backend (API routes)
- **PostgreSQL**: Separate database instance
- **Cron**: External service triggers scraping API endpoint

**Environment Variables**:
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
BASE_URL=https://myrmecology-news.com
ADMIN_SECRET=random_secret_for_scrape_endpoint
```

---

## Implementation Phases

### Phase 1: MVP Foundation (Week 1-2)
**Goal**: Basic news aggregation + read-only website

✅ **Database Setup**:
- Set up PostgreSQL database
- Create schema (articles, sources tables)
- Add indexes for performance

✅ **Aggregator (Nuxt Backend)**:
- Server API route for scraping (`/api/admin/scrape-now`)
- RSS feed scraper for 3-5 ant blogs
- Google News RSS integration
- Basic duplicate detection (title matching)
- External cron triggers endpoint hourly
- Store in PostgreSQL via Nuxt API

✅ **Nuxt Frontend**:
- Homepage with latest 20 articles
- Individual article pages (SEO-optimized)
- Basic styling (Tailwind CSS)
- Server-side rendering for SEO
- Sitemap generation

**Deliverable**: Working website showing aggregated ant news, updated hourly

### Phase 2: Content Quality (Week 3)
**Goal**: Improve content quality and discovery

✅ **Enhancements**:
- Add NewsAPI integration (paid, $49/month for commercial use)
- Implement better duplicate detection (fuzzy matching)
- Auto-tagging: extract species names, topics
- Category classification (research, care, news, species)
- Image scraping from articles

✅ **Frontend**:
- Category pages
- Tag filtering
- Search functionality (PostgreSQL full-text search)
- Related articles section
- "Multiple sources" indicator when same story from 2+ sources

### Phase 3: Social Media Pipeline (Week 4+)
**Goal**: Automated social media content generation

✅ **Content Generation**:
- Select top 3-5 articles per week (most views, featured flag)
- Generate short video scripts (AI: GPT-4, Claude)
- Text-to-speech for narration (ElevenLabs, Azure TTS)
- Video generation (remotion.dev or manual editing with templates)
- Schedule posts to TikTok/Instagram (APIs or Buffer/Hootsuite)

✅ **Admin Dashboard** (optional):
- Mark articles as "featured"
- Review before posting
- Manual content queue

### Phase 4: App Integration (Future)
**Goal**: Connect mobile app users for engagement

✅ **Requirements**:
- Shared authentication (Firebase Auth JWT validation on web)
- Comments API endpoint (write to PostgreSQL or Firebase)
- User profiles visible on both platforms
- Deep linking: app users can share articles that open in app

---

## Key Technical Decisions

### 1. Duplicate Detection Strategy
Since you want to show multiple sources for the same article (like AFP + blog covering same story):

**Approach**: Don't auto-merge duplicates, instead **link them**:
- Use fuzzy title matching (80%+ similarity)
- Store relationship in `article_duplicates` table
- Display on frontend: "Also covered by: [Source 2], [Source 3]"
- Let canonical article be the first one published

**Algorithm**:
```javascript
// When new article is scraped
1. Check existing articles from last 7 days
2. Compare titles using string-similarity
3. If match > 0.8, link as duplicate (don't delete)
4. Show all versions with "Multiple sources" badge
```

### 2. Content Storage
- **Full article scraping**: Use `cheerio` to extract main content from source URL
- **Summary only**: If scraping fails, store just RSS feed description
- **Images**: Extract first image from article HTML or use OpenGraph image

### 3. Aggregation Frequency
Start conservative, scale up:
- **MVP**: Every 2 hours (12 runs/day)
- **Production**: Every 30-60 minutes
- **Peak times**: More frequent during business hours (9am-6pm)

### 4. Database Choice Justification
PostgreSQL advantages over Firestore for this use case:
- ✅ Full-text search built-in (`to_tsvector`, `to_tsquery`)
- ✅ Complex queries (JOINs, aggregations) without client-side processing
- ✅ Lower cost at scale (no per-read pricing)
- ✅ Mature ecosystem for Node.js (`pg`, Prisma ORM)
- ✅ Better for relational data (articles ↔ sources ↔ duplicates)

### 5. SEO Optimization Checklist
Nuxt configuration for maximum SEO:
```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      title: 'Myrmecology News - Latest Ant Research & Care',
      meta: [
        { name: 'description', content: 'Stay updated with the latest ant news, research, and care guides from around the web.' }
      ]
    }
  },
  routeRules: {
    '/': { prerender: true },
    '/articles/**': { swr: 3600 }, // Cache for 1 hour
  },
  sitemap: {
    hostname: 'https://myrmecology-news.com',
    gzip: true
  }
})
```

Each article page should have:
- Unique `<title>` and meta description
- OpenGraph tags (og:title, og:description, og:image)
- Twitter Card tags
- Canonical URL
- Schema.org Article structured data

---

## MVP Scope Summary

**What's IN for MVP**:
- ✅ PostgreSQL database with articles + sources tables
- ✅ Node.js aggregator script (RSS + Google News RSS)
- ✅ Nuxt 3 frontend (homepage + article pages)
- ✅ Hourly automated scraping (cron job)
- ✅ Basic duplicate detection (link related articles)
- ✅ SEO optimization (SSR, meta tags, sitemap)
- ✅ Responsive design (mobile-friendly)

**What's OUT for MVP** (future phases):
- ❌ User authentication
- ❌ Comments system
- ❌ Paid NewsAPI integration (use free Google News RSS first)
- ❌ Social media video generation
- ❌ Admin dashboard (beyond basic scrape trigger)
- ❌ Advanced search/filtering
- ❌ AI-powered summarization

---

## Implementation Steps

### Step 1: Project Setup
1. Create new Git repository (e.g., `antkeeper-news`)
2. Initialize Nuxt 3 project with TypeScript
3. Set up PostgreSQL database (local for development)
4. Create database schema (run SQL migration)

### Step 2: Database Layer
1. Create `/server/utils/db.ts` for PostgreSQL connection
2. Build helper functions for article CRUD operations
3. Test database connection and queries

### Step 3: Build Scrapers
1. Create `/server/utils/scrapers/rss-scraper.ts`
   - Generic RSS feed parser
   - Extract title, summary, URL, published date, image
2. Create `/server/utils/scrapers/google-news.ts`
   - Google News RSS for ant-related keywords
3. Create `/server/utils/processors/duplicate-detector.ts`
   - Title similarity matching
   - Link duplicates in database

### Step 4: Backend API
1. Create `/server/api/admin/scrape-now.post.ts`
   - Endpoint to trigger scraping
   - Protected by secret token
   - Calls all scrapers, processes results
2. Create `/server/api/articles.get.ts`
   - List articles with pagination
3. Create `/server/api/articles/[slug].get.ts`
   - Single article detail
   - Increment view count

### Step 5: Frontend Pages
1. Create `/pages/index.vue` - Homepage
   - Fetch latest 20 articles
   - Display as cards with image, title, summary
   - Pagination
2. Create `/pages/articles/[slug].vue` - Article detail
   - Full article content
   - Meta tags for SEO
   - "Also covered by" section for duplicates
3. Create components:
   - `ArticleCard.vue` - Reusable article preview
   - `SourceBadge.vue` - Show source name/logo

### Step 6: SEO Optimization
1. Configure Nuxt sitemap module
2. Add OpenGraph and Twitter Card meta tags
3. Implement Schema.org Article structured data
4. Set up proper canonical URLs

### Step 7: Deployment
1. Deploy Nuxt app to hosting platform
2. Connect to PostgreSQL database
3. Set up external cron job (cron-job.org) to hit scrape endpoint hourly
4. Monitor logs and test aggregation

### Step 8: Add Content Sources
1. Find 5-10 ant-related RSS feeds
2. Add to sources table
3. Test scraping and monitor content quality
4. Adjust duplicate detection thresholds
