# Antkeeper News - Project Conventions

This document contains project patterns and conventions discovered during development.
Update this file when you discover reusable patterns.

## Tech Stack

- **Framework**: Nuxt 4 (Vue 3 Composition API)
- **Database**: PostgreSQL via Neon (serverless)
- **ORM**: Drizzle ORM
- **UI**: Nuxt UI (built on Tailwind CSS)
- **Jobs**: Trigger.dev v4 for background tasks
- **i18n**: @nuxtjs/i18n (FR, EN, ES, DE)
- **AI**: OpenRouter API (free tier models)

## Directory Structure

```
/
├── app/
│   ├── components/      # Vue components (ArticleCard, etc.)
│   ├── composables/     # Vue composables
│   ├── pages/           # Nuxt pages (file-based routing)
│   └── layouts/         # Page layouts
├── server/
│   ├── api/             # API routes (Nitro)
│   ├── database/        # Drizzle schema & migrations
│   └── services/        # Business logic services
├── trigger/             # Trigger.dev background tasks
├── i18n/                # Translation files
├── newsletters/         # Generated newsletter markdown files
├── public/              # Static assets
└── scripts/             # Utility scripts (including ralph/)
```

## Database Schema

Key tables in `server/database/schema.ts`:
- `articles` - News articles with embeddings
- `sources` - RSS feed sources
- `articleDuplicates` - Duplicate detection results

## API Conventions

### Articles API
```
GET /api/articles
  ?language=fr|en|es|de
  ?category=research|care|conservation|...
  ?tags[]=tag1&tags[]=tag2
  ?dateRange=day|week|month
  ?page=1
  ?limit=20
```

Response includes:
- `articles`: Array of article objects
- `pagination`: { page, limit, total, totalPages }
- `duplicates`: Duplicate article information

## Component Patterns

### ArticleCard
- Located at `app/components/ArticleCard.vue`
- Props: article object
- Shows: image, title, summary, source, date, category badge, tags

### Filters
- Language, category, tags, date range filters on index page
- Tags use multi-select dropdown with search
- URL query params persist filter state

## Trigger.dev Tasks

Located in `trigger/` directory:
- Use `task()` from `@trigger.dev/sdk`
- Never use deprecated `client.defineJob()`
- Always define retry config
- Use `triggerAndWait().unwrap()` for chained tasks

Example:
```typescript
import { task } from "@trigger.dev/sdk";

export const myTask = task({
  id: "my-task",
  retry: { maxAttempts: 3 },
  run: async (payload) => {
    // task logic
    return { success: true };
  },
});
```

## i18n Patterns

- Translation files in `i18n/locales/[lang].json`
- Use `$t('key')` in templates
- Use `useI18n()` composable in setup
- Default locale: French (fr)

## Newsletter Generation

- Newsletters stored in `newsletters/YYYY-MM-DD.md`
- French content by default
- Format: intro, top 3 articles with summaries, key points
- AI selects articles based on scientific importance, originality, quality

## Git Conventions

- Branch names: `ralph/feature-name` for Ralph-generated work
- Commit format: `ralph: [US-XXX] Story title`
- Always run `pnpm typecheck` before committing

## Common Gotchas

1. **Drizzle migrations**: Run `pnpm db:generate` then `pnpm db:push`
2. **Nuxt UI**: Components are auto-imported, no need to import
3. **API routes**: Use `defineEventHandler` from `h3`
4. **OpenRouter**: Rate limited to 20 req/min on free tier

## Testing

Currently no automated tests. Manual verification required:
- Run `pnpm dev` for local development
- Check browser for UI changes
- Verify API responses with curl or browser dev tools

---

*Last updated: Initial setup*
