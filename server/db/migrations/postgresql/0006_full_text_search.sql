-- Full-text search support for articles
-- Adds tsvector column with GIN index

-- Add tsvector column for full-text search
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "articles_search_vector_idx" ON "articles" USING GIN ("search_vector");

-- Backfill existing articles with search vectors
UPDATE "articles" SET
  search_vector = 
    setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(summary, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(content, '')), 'C')
WHERE search_vector IS NULL;
