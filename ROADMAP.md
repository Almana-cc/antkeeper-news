# Antkeeper News - Product Roadmap

## Project Context

**Primary Goal:** Provide curated ant-related news feed for Antkeeper mobile app
**Secondary Goal:** SEO-optimized website to drive traffic and visibility

**Current Status:**
- ✅ RSS aggregation from 11 sources (French & English)
- ✅ Google News URL decoding
- ✅ OpenGraph metadata scraping
- ✅ Keyword filtering (ant-related content)
- ✅ Basic pagination and filtering (language, category)
- ✅ Trigger.dev job queue with scheduled tasks (replaces Vercel cron)
- ✅ Multi-language site (i18n) - FR, EN, ES, DE support
- ✅ Antkeeper brand design system (Montserrat font, purple/coral colors)
- ⚠️ No tags/categorization beyond basic "news"
- ⚠️ No duplicate detection
- ⚠️ No AI processing

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

### 🤖 **Phase 2: AI Enhancement (2-4 weeks)**

#### 2.1 Auto-Tag Generation ⭐⭐⭐ [HIGH PRIORITY]
**Why:** Improves discoverability, enables tag filtering
**Effort:** Medium
**How:**
- Use OpenAI/Anthropic API to analyze article title + summary
- Extract relevant tags (species names, topics: care, research, behavior, etc.)
- Store tags in existing `tags` array field
- Run as background job via Trigger.dev

**Suggested Tag Categories:**
- **Species:** Lasius niger, Camponotus, Atta, etc.
- **Topics:** care, research, behavior, conservation, breeding
- **Content Type:** study, news, guide, community
- **Difficulty:** beginner, advanced, expert

**Example Prompt:**
```
Analyze this ant-related article and extract 3-5 relevant tags.
Focus on: species names, topic (care/research/behavior/conservation),
and content type (study/news/guide).

Title: "New study reveals communication patterns in Atta cephalotes"
Summary: "Researchers discover..."

Return as JSON array: ["Atta cephalotes", "research", "behavior", "study"]
```

**Impact:** Enables tag filtering, improves content organization

---

#### 2.2 Smart Duplicate Detection ⭐⭐ [MEDIUM PRIORITY]
**Why:** Reduces clutter, shows multi-source verification
**Effort:** High
**Approaches:**

**Option A: AI-Based Similarity**
- Use embeddings (OpenAI text-embedding-3-small)
- Compare article title + summary embeddings
- Threshold: >0.85 similarity = duplicate
- **Pros:** Catches paraphrased duplicates
- **Cons:** API cost, slower

**Option B: Hybrid Approach (Recommended)**
1. **Fast filter:** Check title similarity (Levenshtein distance)
2. **AI verification:** For potential matches, use embeddings
3. **Link duplicates:** Keep both, mark canonical + duplicates
4. **Display:** Show "Also reported by X sources" badge

**Schema (already exists):**
```sql
article_duplicates {
  canonical_article_id
  duplicate_article_id
  similarity_score
}
```

**Impact:** Cleaner feed, shows story importance (multiple sources)

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

#### 4.2 Tag Filtering UI ⭐ [NICE TO HAVE]
**Why:** Better content discovery (depends on 2.1)
**Effort:** Low
**Features:**
- Tag cloud on homepage
- Click tag → filter articles
- `/tag/[tag]` pages for SEO
- Show tag counts

**Impact:** Improved navigation

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

#### 4.4 Date Range Filtering ⭐ [NICE TO HAVE]
**Why:** Find historical content
**Effort:** Low
**Features:**
- "Last 24h", "This week", "This month" filters
- Custom date range picker
- Useful for researchers

**Impact:** Better content discovery

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

### 🚀 **Next Sprint (High Impact, Unblocks Future Work)**
1. **AI Tag Generation** - Enables better UX and content discovery
2. **Smart Duplicate Detection** - Content quality improvement
3. **Article Pages** - SEO critical for discoverability

### 📱 **Following Sprint (Mobile Focus)**
4. **Mobile API Enhancements** - Primary use case
5. **AI Content Summarization** - Better mobile app experience

### 🎨 **Polish Phase (Lower Priority)**
6. Tag filtering UI
7. Source filtering
8. Date range filtering
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

### With Recommended Additions:

**Trigger.dev:** Free tier (100k job runs/month) - should be enough
**AI API (Claude/OpenAI):**
- ~1000 articles/month × 2 API calls (tags + duplicates)
- ~$2-5/month at current volume
**Image CDN:** Cloudinary free tier (25GB/month) - enough for now

**Total estimate:** $5-10/month

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
