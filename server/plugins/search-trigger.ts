import postgres from 'postgres'

export default defineNitroPlugin(async () => {
  if (!process.env.DATABASE_URL) {
    console.warn('[search-trigger] DATABASE_URL not set, skipping trigger setup')
    return
  }

  const sql = postgres(process.env.DATABASE_URL)

  try {
    await sql`
      CREATE OR REPLACE FUNCTION articles_update_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
          setweight(to_tsvector('simple', COALESCE(NEW.summary, '')), 'B') ||
          setweight(to_tsvector('simple', COALESCE(NEW.content, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `

    await sql`DROP TRIGGER IF EXISTS articles_search_vector_trigger ON articles`

    await sql`
      CREATE TRIGGER articles_search_vector_trigger
        BEFORE INSERT OR UPDATE OF title, summary, content
        ON articles
        FOR EACH ROW
        EXECUTE FUNCTION articles_update_search_vector()
    `

    console.log('[search-trigger] Full-text search trigger created successfully')
  }
  catch (error) {
    console.error('[search-trigger] Failed to create trigger:', error)
  }
  finally {
    await sql.end()
  }
})
