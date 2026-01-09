-- Tag translations table for i18n support
CREATE TABLE IF NOT EXISTS "tag_translations" (
  "id" SERIAL PRIMARY KEY,
  "tag_key" VARCHAR(100) NOT NULL,
  "language" VARCHAR(5) NOT NULL,
  "label" VARCHAR(200) NOT NULL
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS "tag_translations_tag_key_idx" ON "tag_translations" ("tag_key");
CREATE INDEX IF NOT EXISTS "tag_translations_language_idx" ON "tag_translations" ("language");
CREATE UNIQUE INDEX IF NOT EXISTS "tag_translations_tag_key_language_unique" ON "tag_translations" ("tag_key", "language");
