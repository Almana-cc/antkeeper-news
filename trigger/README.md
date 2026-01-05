# Trigger.dev Jobs

This directory contains background job definitions for the Antkeeper News platform using [Trigger.dev](https://trigger.dev).

## Why Trigger.dev?

The article fetching and scraping process can take several minutes to complete, which exceeds Vercel's serverless function timeout limits (10s on Hobby tier, 60s on Pro tier). Trigger.dev allows us to run these long-running tasks in the background with:

- **No timeout limits** - Jobs can run for hours if needed
- **Automatic retries** - Failed jobs are automatically retried with exponential backoff
- **Job monitoring** - Track job progress in real-time via the Trigger.dev dashboard
- **Free tier** - 100k job runs/month on the free tier

## Architecture

The system is split into three jobs:

### 1. Orchestrator (`orchestrator.ts`)
**Scheduled Task** - Runs automatically daily at 2:00 AM UTC

This is a Trigger.dev scheduled task (not a regular task) that coordinates the entire article fetching workflow:
1. Runs on schedule: `cron: "0 2 * * *"`
2. Triggers the `fetchArticles` job and waits for completion
3. If articles need scraping, triggers `scrapeMetadata` jobs in batches
4. Returns aggregated results

Can also be triggered manually via `/api/trigger-fetch` endpoint for testing.

### 2. Fetch Articles (`fetch-articles.ts`)
**Fast** - Fetches RSS feeds and creates database entries

- Queries active RSS sources from the database
- Parses RSS feeds and decodes Google News URLs
- Filters articles by ant-related keywords
- Creates article database entries (without metadata scraping)
- Returns list of article IDs that need metadata scraping

### 3. Scrape Metadata (`scrape-metadata.ts`)
**Slow** - Enriches articles with OpenGraph metadata

- Takes a batch of article IDs as input
- Scrapes each article's URL for OpenGraph data (image, description, author)
- Updates database with enriched metadata
- Includes rate limiting (500ms delay between scrapes)
- Processes up to 50 articles per batch

## Setup

### 1. Create a Trigger.dev Account

1. Go to https://cloud.trigger.dev
2. Sign up with GitHub
3. Create a new project named "antkeeper-news"
4. Copy your **Secret Key** and **Project ID**

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
TRIGGER_SECRET_KEY="tr_dev_xxxxxxxxxx"
TRIGGER_PROJECT_ID="proj_xxxxxxxxxxxxx"
```

Add to Vercel environment variables (Production):

```bash
TRIGGER_SECRET_KEY="tr_prod_xxxxxxxxxx"
TRIGGER_PROJECT_ID="proj_xxxxxxxxxxxxx"
```

### 3. Deploy Jobs to Trigger.dev

```bash
# Deploy to Trigger.dev cloud
pnpm trigger:deploy
```

This will:
- Build your jobs
- Upload them to Trigger.dev
- Make them available for triggering

### 4. Test the Setup

Trigger a manual fetch via the API:

```bash
curl -X GET https://your-domain.com/api/trigger-fetch \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or visit the Trigger.dev dashboard to see your jobs and trigger them manually.

## Development

### Running Locally

Start the Trigger.dev development server:

```bash
pnpm trigger:dev
```

This will:
- Watch your job files for changes
- Automatically reload when you make changes
- Allow you to test jobs locally

### Testing Jobs

You can trigger jobs programmatically in development:

```bash
# Start the Trigger.dev dev server
pnpm trigger:dev

# In another terminal, trigger the orchestrator
curl -X GET http://localhost:3000/api/trigger-fetch
```

### Monitoring Jobs

1. **Trigger.dev Dashboard**: https://cloud.trigger.dev/projects/[your-project-id]
2. **API Endpoint**: `GET /api/jobs/:id` - Check job status programmatically

## Job Flow

**Automatic (Scheduled):**
```
Trigger.dev Scheduler (daily at 2 AM UTC)
  ↓
orchestrateArticleFetch (Scheduled Task)
  ↓
  ├─→ fetchArticles
  │     ├─ Fetch RSS feeds
  │     ├─ Decode Google News URLs
  │     ├─ Filter by keywords
  │     ├─ Create article entries
  │     └─ Return article IDs needing scraping
  │
  └─→ scrapeMetadata (batched)
        ├─ Batch 1 (50 articles)
        ├─ Batch 2 (50 articles)
        └─ Batch N (remaining articles)
```

**Manual (Optional):**
```
/api/trigger-fetch → tasks.trigger() → Same flow as above
```

## Cost Estimate

**Free Tier**: 100k job runs/month

Current usage:
- 1 orchestration job per day = ~30/month
- 1 fetch job per day = ~30/month
- ~20 scrape jobs per day (avg) = ~600/month

**Total**: ~660 job runs/month (well within free tier)

## Troubleshooting

### Jobs Not Appearing in Dashboard

1. Ensure you've deployed: `pnpm trigger:deploy`
2. Check environment variables are set correctly
3. Verify the Trigger.dev project ID matches

### Jobs Failing

1. Check the Trigger.dev dashboard for error details
2. Review logs in the job run page
3. Jobs automatically retry 3 times with exponential backoff

### Database Connection Issues

Trigger.dev jobs run in their own environment. Ensure:
- `DATABASE_URL` is accessible from Trigger.dev's servers
- Database allows connections from external IPs
- For Neon: Add Trigger.dev IPs to allowlist (if IP allowlist enabled)

### Import Errors

Trigger.dev jobs need to be able to import server code. If you see import errors:
- Check that imports use correct paths
- Use `hub:db` for database imports (Nuxt Hub alias)
- Server services should be imported with relative paths

## Best Practices

1. **Keep jobs focused** - Each job should do one thing well
2. **Use batching** - Process items in batches to avoid overwhelming external services
3. **Add delays** - Use `wait.for()` between API calls to avoid rate limiting
4. **Return useful data** - Jobs should return results that can be used by other jobs
5. **Log generously** - Logs appear in the Trigger.dev dashboard for debugging

## Future Enhancements

- **AI tag generation** - Add job to generate tags using Claude/OpenAI
- **Duplicate detection** - Add job to find duplicate articles using embeddings
- **Content summarization** - Add job to generate summaries for articles
- **Image processing** - Add job to optimize and cache images
