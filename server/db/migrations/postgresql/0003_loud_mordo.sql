-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column
ALTER TABLE "articles" ADD COLUMN "embedding" vector(1536);

-- Create HNSW index for fast cosine similarity search (critical for performance)
-- This enables O(log N) approximate nearest neighbor search instead of O(N) sequential scan
CREATE INDEX IF NOT EXISTS "articles_embedding_idx" ON "articles" USING hnsw ("embedding" vector_cosine_ops);

-- Add index for time-based filtering (used in duplicate detection queries)
CREATE INDEX IF NOT EXISTS "idx_articles_published_at_desc" ON "articles" ("published_at" DESC);