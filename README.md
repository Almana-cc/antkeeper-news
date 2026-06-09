# 🐜 Antkeeper News

An automated news aggregator for the ant-keeping community. Collects, categorizes, and displays articles from various myrmecology sources worldwide.

## Features

- **Automated RSS fetching** — Aggregates articles from multiple ant-keeping sources
- **AI categorization** — Automatic tagging and categorization using OpenRouter
- **Duplicate detection** — Semantic similarity using pgvector embeddings
- **Full-text search** — PostgreSQL tsvector-powered search with autocomplete
- **Multi-language support** — i18n for English and French
- **Background processing** — Trigger.dev tasks for reliable async operations

## Tech Stack

- **Frontend**: Nuxt 4, Vue 3, Tailwind CSS, Nuxt UI
- **Backend**: Nitro (Nuxt server), Drizzle ORM
- **Database**: PostgreSQL with pgvector
- **Background jobs**: Trigger.dev
- **AI**: OpenRouter API (embeddings + categorization)
- **Deployment**: Vercel + NuxtHub

## Setup

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL with pgvector extension
- Trigger.dev account (for background tasks)
- OpenRouter API key (for AI features)

### Installation

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/antkeeper_news
TRIGGER_PROJECT_ID=your-project-id
CRON_SECRET=your-secret-key
OPENROUTER_API_KEY=your-api-key

# Admin mode (GitHub OAuth via nuxt-auth-utils)
NUXT_SESSION_PASSWORD=random-string-of-at-least-32-chars
NUXT_OAUTH_GITHUB_CLIENT_ID=your-github-oauth-client-id
NUXT_OAUTH_GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
NUXT_ADMIN_GITHUB_LOGINS=your-github-username
```

### Database

Run migrations:

```bash
pnpm drizzle-kit push
```

### Development

```bash
# Start Nuxt dev server
pnpm dev

# Start Trigger.dev worker (separate terminal)
pnpm trigger:dev
```

### Admin Mode

Create a [GitHub OAuth App](https://github.com/settings/applications/new) with callback URL `https://<your-domain>/auth/github` (or `http://localhost:3000/auth/github` in dev), then set the `NUXT_OAUTH_GITHUB_*` variables. GitHub logins listed in `NUXT_ADMIN_GITHUB_LOGINS` (comma-separated) can sign in at `/login` and edit articles directly from their page (title, summary, content, category, tags — including one-click "off-topic" / "pest-control" to hide an article).

### Re-checking Old Articles

Articles categorized as `off-topic` or `pest-control` (extermination/anti-ant content) are hidden from the site. To re-run the filters on already-ingested articles:

```bash
pnpm recheck-articles -- --dry-run        # preview without writing
pnpm recheck-articles                     # keyword pass + AI re-categorization
pnpm recheck-articles -- --keywords-only  # fast pass, no AI calls
pnpm recheck-articles -- --limit 100      # cap the number of articles
pnpm recheck-articles -- --ids 12,34      # specific articles
pnpm recheck-articles -- --start-id 1234  # resume after a rate-limit stop
```

## Project Structure

```
├── app/                  # Nuxt frontend
│   ├── components/       # Vue components
│   ├── pages/            # App routes
│   └── composables/      # Vue composables
├── server/
│   ├── api/              # API routes
│   ├── db/               # Drizzle schema & migrations
│   └── services/         # Business logic
├── trigger/              # Trigger.dev background tasks
│   ├── fetch-articles.ts
│   ├── categorize-articles.ts
│   ├── detect-duplicates.ts
│   └── orchestrator.ts
└── i18n/                 # Translations
```

## License

[MIT](LICENSE)
