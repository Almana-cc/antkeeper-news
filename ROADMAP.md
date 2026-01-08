# Antkeeper News - Product Roadmap

## Project Context

**Primary Goal:** Provide curated ant-related news feed for Antkeeper mobile app
**Secondary Goal:** SEO-optimized website to drive traffic and visibility

**Current Status:**
- ✅ RSS aggregation from 13+ sources across 4 languages (FR, EN, ES, DE)
- ✅ Google News integration for all 4 languages with URL decoding
- ✅ OpenGraph metadata scraping
- ✅ Multi-language keyword filtering (FR: fourmis, EN: ants, ES: hormigas, DE: ameisen)
- ✅ Advanced pagination and filtering (language, category, tags with multi-select, date range)
- ✅ Trigger.dev job queue with scheduled tasks and parallel source fetching (4x faster)
- ✅ Multi-language site (i18n) - FR, EN, ES, DE support
- ✅ Antkeeper brand design system (Montserrat font, purple/coral colors)
- ✅ AI-powered tagging and categorization (8 categories, auto-generated tags)
- ✅ Tag filtering UI with searchable multi-select dropdown
- ✅ OpenRouter integration with free tier models (rate-limited, exponential backoff)
- ⚠️ Tags are in English only (need internationalization)
- ⚠️ No duplicate detection
- ⚠️ No individual article pages yet

---

## Core Architectural Decisions

### 1. Job Queue System for Long-Running Tasks

**Problem:**
- Current cron job takes several minutes
- Vercel has 10s execution limit on Hobby, 60s on Pro
- AI processing will make this worse
- Scraping, duplicate detection, tag generation are slow operations

**Options to Consider:**

#### Option A: Trigger.dev (Recommended)
- **Pros:** Built for long-running jobs, generous free tier, good DX, integrates with Vercel
- **Cons:** Another service to manage
- **Use Case:** Perfect for AI processing, scraping, duplicate detection

#### Option B: Inngest
- **Pros:** Similar to Trigger.dev, event-driven, good for workflows
- **Cons:** Learning curve
- **Use Case:** Complex multi-step workflows

#### Option C: BullMQ + Redis (Self-hosted)
- **Pros:** Full control, open source
- **Cons:** Need to host Redis, more complex setup
- **Use Case:** If you want infrastructure control

#### Option D: Separate Worker Server (Railway/Render)
- **Pros:** Simple, just a long-running Node process
- **Cons:** Need to manage server, not serverless
- **Use Case:** If you prefer traditional server architecture

**Recommendation:** Start with **Trigger.dev** - it's designed for exactly this use case and has excellent Vercel integration.

---

### 2. Multi-Language Site Architecture

**Target Languages:** French (primary), English, Spanish, German

**Implementation Approaches:**

#### Option A: Nuxt I18n Module (Recommended)
```
/                    → French (default)
/en                  → English
/es                  → Spanish
/de                  → German
/en/articles         → English articles
```

- **Pros:** Official Nuxt solution, SEO-friendly URLs, auto-detects user language
- **Cons:** Need to translate all UI strings
- **Effort:** Medium - need translation files for each language

#### Option B: Subdomain Strategy
```
www.antkeeper.com    → French
en.antkeeper.com     → English
es.antkeeper.com     → Spanish
de.antkeeper.com     → German
```

- **Pros:** Clean separation, easy CDN config
- **Cons:** More complex deployment, separate builds
- **Effort:** High

**Recommendation:** **Nuxt I18n** - better SEO, simpler to maintain, standard approach.

**News Feed Logic:**
- Site language = default news filter
- User can override (e.g., French site user can view English articles)
- Mobile app API can request specific language via query param

---

## Feature Roadmap

### ✅ **Phase 1: Foundation (COMPLETED)**

#### 1.1 Job Queue Implementation ✅ [COMPLETED]
**Why:** Unblocks all AI features, fixes cron timeout issues
**Effort:** Medium
**Completed Tasks:**
- ✅ Set up Trigger.dev account (v4)
- ✅ Created scheduled task for article orchestration (daily 2 AM UTC)
- ✅ Created job for article fetching from RSS sources
- ✅ Created job for metadata scraping (batched, 50 articles per batch)
- ✅ Removed Vercel cron dependency
- ✅ Added automatic retry logic (3 attempts with exponential backoff)
- ✅ Configured monitoring via Trigger.dev dashboard

**Impact:** ✅ Enables all future AI features, more reliable fetching, no timeout limits

---

#### 1.2 Multi-Language Site (i18n) ✅ [COMPLETED]
**Why:** Core requirement for international audience
**Effort:** Medium-High
**Completed Tasks:**
- ✅ Installed @nuxtjs/i18n
- ✅ Created translation files (FR, EN, ES, DE)
- ✅ Translated all UI strings (filters, buttons, headers, etc.)
- ✅ Set default news language based on site language
- ✅ Added language switcher in header
- ✅ Configured SEO meta tags per language

**Translation Coverage:**
- ✅ Header/footer
- ✅ Filter labels ("All Languages", "Select category")
- ✅ Pagination controls
- ✅ Empty states
- ✅ All UI elements

**Impact:** ✅ Site now accessible to 4 language markets (FR, EN, ES, DE)

---

### 🤖 **Phase 2: AI Enhancement**

#### 2.1 Auto-Tag Generation & Categorization ✅ [COMPLETED]
**Why:** Improves discoverability, enables tag filtering, content quality
**Effort:** Medium
**Completed Implementation:**
- ✅ OpenRouter API integration with free tier models (Mistral 7B)
- ✅ AI analyzes article title + summary + content preview
- ✅ Extracts 3-5 relevant tags (species names, topics, content types, geographic regions)
- ✅ Assigns one of 8 categories: research, care, conservation, behavior, ecology, community, news, off-topic
- ✅ Runs as Trigger.dev background job (Step 3 in orchestrator)
- ✅ Batch processing (50 articles per batch)
- ✅ Rate limiting: 5s delay between requests (12 req/min, well under 20/min limit)
- ✅ Exponential backoff retry on 429 errors (2 retries: 5s, 10s)
- ✅ Multi-language prompt support (EN, FR, ES, DE)
- ✅ Detects off-topic articles (idiomatic expressions, false keyword matches)
- ✅ Backfill task for existing articles
- ✅ Tag filtering UI with searchable multi-select dropdown
- ✅ Category badges displayed on article cards (color-coded)
- ✅ All 8 categories translated in 4 languages

**Tag Categories Extracted:**
- **Species:** Lasius niger, Camponotus pennsylvanicus, Atta cephalotes
- **Topics:** care, research, behavior, conservation, breeding, ecology
- **Content Type:** study, news, guide, tutorial, community, opinion
- **Geographic regions:** North America, Europe, Amazon, Mediterranean, etc.

**Categories:**
- research, care, conservation, behavior, ecology, community, news, off-topic

**Known Limitation:**
- ⚠️ Tags are generated in English only (regardless of article language)
- ⚠️ Future: Need tag translation/internationalization system

**Impact:** ✅ Massively improved content organization, discoverability, and filtering. Users can filter by multiple tags and category.

---

#### 2.1.1 Tag Internationalization ⭐⭐ [TODO - FUTURE]
**Why:** Tags are currently English-only, limiting UX for non-English users
**Effort:** Medium-High
**Challenges:**
- AI generates tags in English (e.g., "ant care", "north america")
- Users viewing French site see English tags
- Tag filtering works but labels aren't localized

**Potential Solutions:**

**Option A: AI Multi-Language Tag Generation**
- Modify prompts to generate tags in article's language
- FR article → tags in French ("soins des fourmis", "amérique du nord")
- EN article → tags in English
- **Pros:** Native language tags per article
- **Cons:** Inconsistent tag keys across languages, filtering complexity

**Option B: Tag Translation Layer**
- Generate canonical English tags (as now)
- Create translation mapping table: `tag_translations (tag_key, language, label)`
- Display translated labels in UI based on site language
- Example: `"ant-care"` → FR: "Soins des fourmis", EN: "Ant care"
- **Pros:** Consistent filtering, translatable UI
- **Cons:** Need to maintain translations, initial effort

**Option C: Hybrid - Canonical + Auto-Translate**
- Keep English canonical tags for filtering
- Use AI to translate tag labels on-demand
- Cache translations in database
- **Pros:** Best UX, scalable
- **Cons:** API cost for translations

**Recommendation:** **Option B** - Most maintainable and scalable
- Build tag translation system similar to category translations
- Start with common tags, auto-add new ones
- Allows manual curation of tag labels

**Impact:** Better UX for non-English users, professional multi-language experience

---

#### 2.2 Smart Duplicate Detection ✅ [COMPLETED]
**Why:** Reduces clutter, shows multi-source verification
**Effort:** High
**Completed Implementation:**

✅ **Option A: AI-Based Similarity with pgvector**
- ✅ Uses OpenAI text-embedding-3-small via OpenRouter API (1,536 dimensions)
- ✅ pgvector extension enabled with HNSW index for fast similarity search
- ✅ Embedding column added to articles table
- ✅ Compares article title + summary embeddings using cosine distance
- ✅ Threshold: >0.85 similarity (distance <= 0.15) = duplicate
- ✅ Integrated as Step 4 in orchestrator (runs daily after categorization)
- ✅ Stores results in articleDuplicates table for fast UI queries
- ✅ Backfill task for generating embeddings for existing articles

**Files Created:**
- `server/services/embedding.service.ts` - Embedding generation with rate limiting
- `trigger/detect-duplicates.ts` - Duplicate detection task with pgvector similarity search
- `trigger/backfill-embeddings.ts` - Backfill task with automatic duplicate detection

**Advanced Features:**
- ✅ **Configurable lookback period**: Set `lookbackDays: 0` for unlimited search across all articles
- ✅ **Skip existing duplicates**: Automatically skips articles that already have duplicate relationships (prevents re-processing)
- ✅ **Auto-detect after backfill**: Backfill task automatically triggers duplicate detection when complete
- ✅ **Daily incremental detection**: Default 30-day lookback for daily operations, configurable up to unlimited

**Database Schema:**
```sql
articles {
  embedding: vector(1536)  -- NEW: pgvector embedding column
}

article_duplicates {
  canonical_article_id    -- Older article (lower ID)
  duplicate_article_id    -- Newer article (higher ID)
  similarity_score        -- 0.0-1.0 similarity score
}
```

**Performance:**
- Embedding generation: ~10 articles/minute (5s rate limiting)
- Similarity search: ~10ms per query (HNSW index)
- Querying duplicates: <1ms (pre-computed table)
- Cost: ~$0.009/month (100 articles/day)

**Impact:** ✅ Cleaner feed, semantic duplicate detection, pre-computed for fast UI queries

---

#### 2.3 AI Content Summarization ⭐ [NICE TO HAVE]
**Why:** Improves mobile app UX with consistent summaries
**Effort:** Low (once queue is set up)
**How:**
- When scraped summary is missing/poor, generate with AI
- Keep summaries to 2-3 sentences
- Run as background job

**Impact:** Better mobile app experience

---

### 📱 **Phase 3: Mobile App Integration (2-3 weeks)**

#### 3.1 API Enhancements for Mobile ⭐⭐⭐ [HIGH PRIORITY]
**Why:** Primary use case is mobile app
**Effort:** Low-Medium
**Features:**
- Add `/api/articles/latest` endpoint (optimized for mobile)
- Include pagination cursor instead of page numbers (infinite scroll)
- Add `?since=<timestamp>` for "fetch new articles"
- Return image URLs optimized for mobile (maybe CDN/resize)
- Add `?limit` control (default 20, max 100)
- Consider GraphQL for flexible queries

**Mobile-Specific Considerations:**
- Smaller payload sizes (exclude full `content` field)
- Efficient pagination (cursor-based)
- Image optimization
- Caching headers

**Impact:** Better mobile app performance

---

#### 3.2 Read Tracking & Recommendations ⭐ [FUTURE]
**Why:** Personalized experience for app users
**Effort:** High
**Features:**
- Track which articles user read (mobile app)
- Recommend similar articles based on tags
- "For You" feed based on reading history
- Requires user accounts/anonymous IDs

**Impact:** Increases engagement

---

### 🎨 **Phase 4: Website Polish (1-2 weeks)**

#### 4.1 Individual Article Pages ⭐⭐ [SEO PRIORITY]
**Why:** Critical for SEO, low priority for UX (mobile is primary)
**Effort:** Low-Medium
**Features:**
- `/articles/[slug]` page
- Full article display
- Related articles (by tags)
- Share buttons
- Structured data (Schema.org Article)
- OpenGraph/Twitter cards
- View count tracking

**Impact:** Major SEO improvement, shareable links

---

#### 4.2 Tag Filtering UI ✅ [COMPLETED]
**Why:** Better content discovery
**Effort:** Low
**Completed Features:**
- ✅ Multi-select tag dropdown with search
- ✅ Tags dynamically loaded from database (unique tags across all articles)
- ✅ Filter by multiple tags simultaneously (OR logic)
- ✅ Tags update based on language/category filters
- ✅ URL persistence (tags stored as array in query params)
- ✅ Responsive design with proper wrapping

**Future Enhancements:**
- ⏳ Tag cloud visualization
- ⏳ Click tag on article card → filter by that tag
- ⏳ `/tag/[tag]` SEO pages
- ⏳ Show article counts per tag
- ⏳ Tag internationalization (see 2.1.1)

**Impact:** ✅ Significantly improved content discovery and navigation

---

#### 4.3 Source Attribution & Filtering ⭐ [NICE TO HAVE]
**Why:** Transparency, user preference
**Effort:** Low
**Features:**
- Display source favicon/logo on cards
- Filter by source
- `/source/[source]` pages
- Source reliability indicators

**Impact:** User trust, flexibility

---

#### 4.4 Date Range Filtering ✅ [COMPLETED]
**Why:** Find historical content
**Effort:** Low
**Completed Features:**
- ✅ "Last 24h", "Last Week", "Last Month" filters
- ✅ Date range state and options in index.vue
- ✅ Date range UI controls in filter section
- ✅ API query includes date range params
- ✅ URL query params for date range persistence
- ✅ Date filtering logic in articles API endpoint (filters by publishedAt)
- ✅ Clear filters resets date range
- ✅ All translations added (EN, FR, ES, DE)

**Implementation Details:**
- Date filtering uses `publishedAt` field from articles
- Filter options: "All Time", "Last 24 hours", "Last Week", "Last Month"
- Backend filters using `gte` (greater than or equal) comparison
- Fully integrated with existing filter system

**Impact:** ✅ Better content discovery, especially for recent content

---

#### 4.5 Design System - Match Antkeeper Website ✅ [COMPLETED]
**Why:** News section should feel like part of the Antkeeper ecosystem
**Effort:** Medium
**Reference:** https://www.antkeeper.app/fr

**Completed Implementation:**

**Color Palette:** ✅
- ✅ Purple (#5B21B6) - Primary brand color
- ✅ Coral/Red (#FF6666) - Accent/CTA
- ✅ Golden Yellow (#E9D758) - Highlights
- ✅ Teal (#218380) - Secondary sections
- ✅ Full-width colored section blocks

**Typography:** ✅
- ✅ Font: Montserrat (@nuxtjs/google-fonts)
- ✅ Headings: Bold, clear hierarchy
- ✅ Body: Clean, readable sizing

**Layout Patterns:** ✅
- ✅ Alternating image/text layouts
- ✅ Full-width colored sections with high contrast
- ✅ Mobile-first responsive design
- ✅ Section-based navigation

**Component Customization:** ✅
```typescript
// ✅ Nuxt UI theme customized
ui: {
  colors: {
    primary: 'purple',
    secondary: 'teal',
  }
}
```

**Completed Changes:**
1. ✅ Brand-colored article sections
2. ✅ Hover animations
3. ✅ Montserrat font family throughout
4. ✅ Colorful category badges
5. ✅ Hero section with purple background
6. ✅ Footer matching main site style

**Impact:** ✅ Professional brand consistency achieved, seamless user experience between main site and news section

---

### 🔧 **Phase 5: Content Quality (Ongoing)**

#### 5.1 Source Curation ⭐⭐ [ONGOING]
**Why:** Content quality = app quality
**Effort:** Low (manual)
**Tasks:**
- Add more RSS sources (Spanish, German sources)
- Remove inactive/low-quality sources
- Adjust fetch intervals per source
- Monitor for spam/irrelevant content

**Spanish Sources to Add:**
- Mirmecología (Spanish myrmecology groups)
- Science blogs in Spanish

**German Sources to Add:**
- Ameisenwiki related feeds
- German science publications

**Impact:** More diverse, higher quality content

---

#### 5.2 Content Moderation Tools ⭐ [FUTURE]
**Why:** Handle spam, inappropriate content
**Effort:** Medium
**Features:**
- Admin dashboard to review articles
- Flag/delete articles
- Blocklist for domains/keywords
- AI spam detection

**Impact:** Content quality control

---

## Technical Debt & Maintenance

### Database Optimization
- Add indexes on frequently filtered columns (`publishedAt`, `language`, `tags`)
- Full-text search index for search feature
- Monitor query performance as dataset grows

### Error Handling
- Better error logging (Sentry?)
- Retry logic for failed scrapes
- Dead source detection and alerts
- Health check endpoint

### Testing
- API endpoint tests
- Critical path E2E tests
- Mobile app integration tests

---

## Suggested Priority Order

### ✅ **Already Complete**
1. ✅ Basic news aggregation
2. ✅ Pagination and filtering
3. ✅ Google News decoding
4. ✅ **Job Queue Setup (Trigger.dev)** - Scheduled tasks, no timeout limits
5. ✅ **Multi-language Site (i18n)** - FR, EN, ES, DE support
6. ✅ **Design System Customization** - Antkeeper brand design implemented

### 🚀 **Next Sprint (High Impact)**
1. ✅ ~~**AI Tag Generation**~~ - COMPLETED
2. ✅ ~~**Smart Duplicate Detection**~~ - COMPLETED (backend only, UI pending)
3. **Article Pages** - SEO critical for discoverability
4. **Tag Internationalization** - Better UX for non-English users

### 📱 **Following Sprint (Mobile Focus)**
4. **Mobile API Enhancements** - Primary use case
5. **AI Content Summarization** - Better mobile app experience

### 🎨 **Polish Phase (Lower Priority)**
6. ✅ Tag filtering UI - COMPLETED
7. Source filtering
8. ✅ Date range filtering - COMPLETED
9. Content moderation tools

---

## Open Questions & Brainstorming

### 1. **RSS Source Discovery**
**Idea:** Automatically discover new RSS sources
- Crawl Google News for ant-related feeds
- Monitor Reddit/Twitter for shared ant articles
- Suggest new sources to admin for approval

### 2. **Community Features**
**Idea:** Allow users to submit articles
- User-submitted links (moderated)
- Voting/rating system
- Comments (maybe via Disqus to avoid moderation)
**Concern:** Moderation burden

### 3. **Newsletter**
**Idea:** Weekly digest email
- Top 5-10 articles of the week
- Auto-generated with AI summary
- Send via Resend/Sendgrid
**Impact:** Another content distribution channel

### 4. **Social Media Auto-Post**
**Idea:** Auto-share articles to Twitter/Bluesky
- When high-quality article found
- Auto-generate social media post with AI
- Drive traffic back to site
**Impact:** Marketing channel

### 5. **Species Encyclopedia Integration**
**Idea:** Link articles to species profiles
- When article mentions "Lasius niger", link to species page
- Antkeeper app could have species database
- Articles become educational resources
**Effort:** High, requires species database

### 6. **Search Functionality**
**Idea:** Full-text search across articles
- PostgreSQL full-text search
- Search by species, topic, keyword
- Autocomplete suggestions
**Effort:** Medium
**Impact:** User experience

### 7. **Article Quality Scoring**
**Idea:** Rank articles by quality/relevance
- Factors: source reputation, length, image quality, recency
- AI-generated quality score
- Show "Editor's Pick" badge
**Impact:** Better content curation

### 8. **Offline Support (Mobile App)**
**Idea:** Cache articles in app for offline reading
- Download articles for offline access
- Sync when online
- PWA for web version
**Effort:** High (mostly mobile app work)

### 9. **Image Processing**
**Idea:** Enhance article images
- Auto-crop/optimize images
- Generate thumbnails
- Image CDN (Cloudinary/ImageKit)
- Fallback images for articles without photos
**Impact:** Better visual experience

### 10. **Analytics & Insights**
**Idea:** Track what content performs well
- Which topics are most popular?
- Which sources are most reliable?
- User engagement metrics
- Feed back into content curation
**Effort:** Medium

---

## Architecture Recommendations

### Recommended Tech Stack Additions

1. **Job Queue:** Trigger.dev
   - Background jobs for AI processing
   - Scheduled tasks
   - Retry logic

2. **i18n:** @nuxtjs/i18n
   - Multi-language support
   - SEO-friendly URLs

3. **AI:** Claude API (Anthropic) or OpenAI
   - Tag generation
   - Duplicate detection (embeddings)
   - Content summarization

4. **Image CDN:** Cloudinary or ImageKit (optional)
   - Image optimization
   - Responsive images

5. **Monitoring:** Sentry (optional)
   - Error tracking
   - Performance monitoring

6. **Analytics:** Plausible or Umami (privacy-friendly)
   - Track popular content
   - User engagement

### Current Stack
- ✅ Nuxt 4
- ✅ PostgreSQL (Neon)
- ✅ Drizzle ORM
- ✅ Vercel hosting
- ✅ Nuxt UI

---

## Cost Considerations

### Current: ~$0/month
- Vercel Hobby (free)
- Neon Free tier
- No AI usage

### With Current Additions:

**Trigger.dev:** Free tier (100k job runs/month) ✅ - Currently using ~1-2k/month
**OpenRouter API (Free Tier):**
- Free tier: 1000 requests/day with $10 credits
- Current usage: ~30-50 articles/day = ~900-1500 requests/month
- **Cost: $0/month** (within free tier) ✅
- Rate limiting: 20 req/min for :free models → 5s delay between requests = 12 req/min (buffer)
**Image CDN:** Not yet implemented

**Total current cost:** $0/month ✅

**Future cost if scaling:**
- OpenRouter: If >1000 articles/day → consider paid tier (~$0.0001/article)
- Image CDN: Cloudinary free tier (25GB/month)
- Trigger.dev: >100k jobs/month → $20/month

**Total estimate at scale:** $5-10/month

When to upgrade:
- Trigger.dev: >100k jobs/month → $20/month
- AI: >10k articles/month → ~$20-50/month
- Database: Neon Pro if >1M articles

---

## Next Steps Discussion

Before we dive into implementation, let's align on:

1. **Priority:** What's most important to you right now?
   - Mobile app integration?
   - Multi-language site?
   - AI features?

2. **Timeline:** What's your timeline/urgency?
   - Mobile app launch date?
   - SEO urgency?

3. **Resources:**
   - Budget for paid services (AI APIs, etc.)?
   - Time you can dedicate?

4. **Scope:**
   - Start small (job queue + i18n)?
   - Or aim for comprehensive AI features?

Let me know what resonates with you and we can refine the roadmap!
