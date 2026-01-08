# Duplicate Detection Guide

## Overview

Smart duplicate detection using AI embeddings and pgvector for semantic similarity search.

**Status**: ✅ Fully implemented and integrated into daily workflow

---

## Daily Automatic Detection

Runs automatically every day at 2:00 AM UTC as **Step 4** in the orchestrator:

- Processes all newly fetched articles
- Looks back 30 days for potential duplicates
- Skips articles that already have duplicate relationships
- Stores results in `articleDuplicates` table

**Configuration** (in `trigger/orchestrator.ts`):
```typescript
lookbackDays: 30              // Can be increased to 90, 180, or 0 for unlimited
similarityThreshold: 0.85     // Minimum similarity score (0.0-1.0)
skipExistingDuplicates: true  // Skip articles already processed
```

---

## Manual Backfill

Generate embeddings for existing articles without embeddings.

### Via Trigger.dev Dashboard

1. Go to https://trigger.dev
2. Select your project
3. Find task: `backfill-embeddings`
4. Click "Trigger"
5. Use payload:

**Default (100 articles with auto-detection)**:
```json
{
  "limit": 100
}
```

**Advanced options**:
```json
{
  "limit": 500,
  "detectDuplicatesAfter": true,
  "lookbackDays": 0
}
```

### Payload Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `limit` | `100` | Maximum articles to process |
| `detectDuplicatesAfter` | `true` | Trigger duplicate detection after backfill |
| `lookbackDays` | `0` | Lookback period for duplicate detection (0 = unlimited) |

### What Happens

1. **Backfill Phase**:
   - Finds up to `limit` articles without embeddings
   - Generates embeddings (title + summary)
   - Stores in `articles.embedding` column
   - 5-second delay between API calls (rate limiting)

2. **Detection Phase** (if `detectDuplicatesAfter: true`):
   - Automatically triggers `detectDuplicates` task
   - Uses `lookbackDays: 0` (unlimited) by default
   - Only processes articles without existing duplicates
   - Stores results in `articleDuplicates` table

**Example Output**:
```
✓ Backfill completed!
  Articles processed: 100
  Embeddings generated: 100

🔍 Triggering duplicate detection for 100 articles...
  Lookback period: unlimited (all articles with embeddings)
  Only processing articles without existing duplicate relationships

✓ Duplicate detection completed!
  Duplicates found: 15
  Duplicate records created: 15
```

---

## Manual Duplicate Detection

Detect duplicates for specific articles (advanced usage).

### Via Trigger.dev Dashboard

Task: `detect-duplicates`

**Payload**:
```json
{
  "articleIds": [123, 124, 125],
  "lookbackDays": 0,
  "similarityThreshold": 0.85,
  "skipExistingDuplicates": true
}
```

### Payload Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `articleIds` | *required* | Array of article IDs to check |
| `lookbackDays` | `30` | How far back to search (0 = unlimited) |
| `similarityThreshold` | `0.85` | Minimum similarity (0.0-1.0) |
| `skipExistingDuplicates` | `true` | Skip articles with existing duplicates |

### Use Cases

**Re-detect with different threshold**:
```json
{
  "articleIds": [100, 101, 102],
  "lookbackDays": 0,
  "similarityThreshold": 0.90,
  "skipExistingDuplicates": false
}
```

**Historical analysis (all articles)**:
```json
{
  "articleIds": [1, 2, 3, 4, 5],
  "lookbackDays": 0,
  "skipExistingDuplicates": false
}
```

---

## Database Tables

### articles
```sql
CREATE TABLE articles (
  id serial PRIMARY KEY,
  title varchar(500),
  summary text,
  embedding vector(1536),  -- NEW: pgvector embedding
  ...
);

-- HNSW index for fast similarity search (~10ms per query)
CREATE INDEX articles_embedding_idx ON articles
USING hnsw (embedding vector_cosine_ops);
```

### articleDuplicates
```sql
CREATE TABLE article_duplicates (
  id serial PRIMARY KEY,
  canonical_article_id integer,  -- Older article (lower ID)
  duplicate_article_id integer,  -- Newer article (higher ID)
  similarity_score real,         -- 0.0-1.0 similarity score
  merged_at timestamp
);
```

**Query duplicates for an article**:
```sql
SELECT
  a.id,
  a.title,
  ad.similarity_score
FROM article_duplicates ad
JOIN articles a ON (
  a.id = ad.canonical_article_id
  OR a.id = ad.duplicate_article_id
)
WHERE ad.canonical_article_id = 123
   OR ad.duplicate_article_id = 123;
```

---

## Performance & Optimization

### Speed
- **Embedding generation**: ~10 articles/minute (limited by 5s API delay)
- **Similarity search**: ~10ms per query (HNSW index)
- **Duplicate queries**: <1ms (pre-computed table)

### Cost
- **Daily operation** (100 new articles): $0.0003/day = **$0.009/month**
- **Backfill** (1,000 articles): $0.003 (one-time)

### Why Pre-compute?
- **Detection**: Use pgvector `ORDER BY embedding <=> query` (fast, runs once)
- **Querying**: Pre-computed table for instant UI lookups (no re-computation)
- **Example**: Article page loads 1,000×/day → saves 9 seconds total vs on-demand queries

---

## Troubleshooting

### No duplicates found
- Check `similarityThreshold` (try lowering to 0.80)
- Verify embeddings exist: `SELECT COUNT(*) FROM articles WHERE embedding IS NOT NULL;`
- Check lookback period (increase `lookbackDays` or set to 0)

### Rate limiting errors
- Free tier: 20 requests/minute
- Current: 12 requests/minute (5s delay = safe)
- If errors persist: increase delay or upgrade OpenRouter plan

### Slow performance
- Verify HNSW index exists: `\d articles` (should show `articles_embedding_idx`)
- Rebuild index if needed: `REINDEX INDEX articles_embedding_idx;`

### Skip logic not working
- Check `skipExistingDuplicates: true` in payload
- Verify duplicates exist: `SELECT COUNT(*) FROM article_duplicates;`

---

## Future UI Integration

**Display "Also reported by" badge**:
```typescript
// Query duplicates for article
const duplicates = await db.query.articleDuplicates.findMany({
  where: or(
    eq(articleDuplicates.canonicalArticleId, articleId),
    eq(articleDuplicates.duplicateArticleId, articleId)
  ),
  with: {
    canonicalArticle: true,
    duplicateArticle: true
  }
})

// Show: "Also reported by 3 sources"
```

**Merge duplicate articles**:
```typescript
// Admin UI to manually merge/hide duplicates
// Mark canonical, hide duplicates from feed
```

---

## Monitoring

### Dashboard Metrics (Trigger.dev)
- Task success rate
- Duplicates found per run
- API errors (rate limiting)
- Execution time

### Database Queries
```sql
-- Total articles with embeddings
SELECT COUNT(*) FROM articles WHERE embedding IS NOT NULL;

-- Total duplicate relationships
SELECT COUNT(*) FROM article_duplicates;

-- Top duplicated articles
SELECT
  canonical_article_id,
  COUNT(*) as duplicate_count
FROM article_duplicates
GROUP BY canonical_article_id
ORDER BY duplicate_count DESC
LIMIT 10;

-- Recent duplicates
SELECT
  ad.*,
  a1.title as canonical_title,
  a2.title as duplicate_title
FROM article_duplicates ad
JOIN articles a1 ON a1.id = ad.canonical_article_id
JOIN articles a2 ON a2.id = ad.duplicate_article_id
ORDER BY ad.merged_at DESC
LIMIT 10;
```

---

## Summary

✅ **Automatic**: Runs daily at 2 AM UTC, processes new articles
✅ **Backfill**: Generate embeddings + detect duplicates for historical articles
✅ **Smart**: Skips articles with existing duplicates (no re-processing)
✅ **Fast**: pgvector HNSW index = 10ms searches, <1ms UI queries
✅ **Cheap**: ~$0.009/month for 100 articles/day
✅ **Configurable**: Adjust lookback, threshold, skip logic

**Next step**: Run backfill task to process existing articles!
