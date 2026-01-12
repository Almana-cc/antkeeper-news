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
