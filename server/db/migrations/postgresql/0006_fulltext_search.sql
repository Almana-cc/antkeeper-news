-- Full-text search setup for articles table
-- This migration adds PostgreSQL full-text search capabilities

-- Add tsvector column for full-text search
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create GIN index on the search_vector column for efficient full-text search
CREATE INDEX IF NOT EXISTS "articles_search_vector_idx" ON "articles" USING GIN ("search_vector");

-- Create function to generate search vector from article fields
-- Uses 'simple' configuration for language-agnostic search
-- Weights: A (highest) for title, B for summary, C for content
CREATE OR REPLACE FUNCTION articles_search_vector_update() RETURNS trigger AS '
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector(''simple'', COALESCE(NEW.title, '''')), ''A'') ||
    setweight(to_tsvector(''simple'', COALESCE(NEW.summary, '''')), ''B'') ||
    setweight(to_tsvector(''simple'', COALESCE(NEW.content, '''')), ''C'');
  RETURN NEW;
END;
' LANGUAGE plpgsql;

-- Create trigger to auto-update search_vector on INSERT or UPDATE
DROP TRIGGER IF EXISTS articles_search_vector_trigger ON "articles";
CREATE TRIGGER articles_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, summary, content
  ON "articles"
  FOR EACH ROW
  EXECUTE FUNCTION articles_search_vector_update();

-- Backfill existing articles with search vectors
UPDATE "articles" SET search_vector =
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(summary, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(content, '')), 'C');
