CREATE TABLE "article_duplicates" (
	"id" serial PRIMARY KEY NOT NULL,
	"canonical_article_id" integer NOT NULL,
	"duplicate_article_id" integer NOT NULL,
	"similarity_score" real,
	"merged_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "article_sources" (
	"article_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"original_url" text,
	CONSTRAINT "article_sources_article_id_source_id_pk" PRIMARY KEY("article_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"slug" varchar(500) NOT NULL,
	"content" text,
	"summary" text,
	"source_name" varchar(200),
	"source_url" text,
	"author" varchar(200),
	"published_at" timestamp,
	"scraped_at" timestamp DEFAULT now(),
	"language" varchar(5) DEFAULT 'en',
	"image_url" text,
	"tags" text[],
	"category" varchar(50),
	"view_count" integer DEFAULT 0,
	"featured" boolean DEFAULT false,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" varchar(50),
	"url" text,
	"last_fetched_at" timestamp,
	"fetch_interval_minutes" integer DEFAULT 60,
	"is_active" boolean DEFAULT true,
	"config" jsonb
);
--> statement-breakpoint
ALTER TABLE "article_duplicates" ADD CONSTRAINT "article_duplicates_canonical_article_id_articles_id_fk" FOREIGN KEY ("canonical_article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_duplicates" ADD CONSTRAINT "article_duplicates_duplicate_article_id_articles_id_fk" FOREIGN KEY ("duplicate_article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_sources" ADD CONSTRAINT "article_sources_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_sources" ADD CONSTRAINT "article_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;