# Trigger.dev Setup Guide

This guide will help you set up and deploy the Trigger.dev job queue system for Antkeeper News.

## Overview

The Trigger.dev integration solves the problem of long-running tasks exceeding Vercel's serverless function timeout limits. The article fetching and scraping process can take several minutes, but Vercel limits execution to 10s (Hobby) or 60s (Pro).

### What Changed

**Before (Nitro Tasks):**
```
Vercel Cron → /api/trigger-fetch → Nitro Task (runs inline, times out after 60s)
```

**After (Trigger.dev Scheduled Tasks):**
```
Trigger.dev Scheduler (daily 2 AM UTC) → Orchestrator → Background Jobs (no timeout)
```

**Optional Manual Trigger:**
```
/api/trigger-fetch → Trigger.dev Orchestrator (for testing/emergency runs)
```

## Step 1: Create Trigger.dev Account

1. Go to https://cloud.trigger.dev
2. Sign up with your GitHub account
3. Create a new project:
   - **Name**: `antkeeper-news`
   - **Framework**: Node.js
4. You'll be given:
   - **Secret Key**: `tr_dev_xxxxx` (for development) and `tr_prod_xxxxx` (for production)
   - **Project ID**: `proj_xxxxx`

## Step 2: Configure Environment Variables

### Local Development

Create/update `.env` file:

```bash
# Trigger.dev Development
TRIGGER_SECRET_KEY="tr_dev_xxxxxxxxxxxxxxxxxxxxxxxxxx"
TRIGGER_PROJECT_ID="proj_xxxxxxxxxxxxxx"

# Database (required for jobs to access database)
DATABASE_URL="your-neon-database-url"

# Optional: Protect manual trigger endpoint (/api/trigger-fetch)
# CRON_SECRET="your-secret-key"
```

### Vercel Production

Add environment variables in Vercel dashboard:

1. Go to your project in Vercel
2. Settings → Environment Variables
3. Add:
   ```
   TRIGGER_SECRET_KEY = tr_prod_xxxxxxxxxxxxxxxxxxxxxxxxxx
   TRIGGER_PROJECT_ID = proj_xxxxxxxxxxxxxx
   DATABASE_URL = [your Neon production URL]
   CRON_SECRET = [your cron secret]
   ```

## Step 3: Deploy Jobs to Trigger.dev

### First Time Setup

```bash
# Install dependencies (if not already done)
pnpm install

# Deploy jobs to Trigger.dev
pnpm trigger:deploy
```

This will:
1. Build your job files
2. Upload them to Trigger.dev cloud
3. Make them available for execution

You should see output like:
```
✓ Jobs deployed successfully
  - orchestrate-article-fetch
  - fetch-articles
  - scrape-metadata
```

### Update Jobs

Whenever you modify job files in the `trigger/` directory:

```bash
pnpm trigger:deploy
```

## Step 4: Verify Setup

### Test the Endpoint

Trigger a manual fetch:

```bash
curl -X GET https://your-domain.vercel.app/api/trigger-fetch \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "message": "Article fetch orchestration triggered successfully",
  "jobId": "run_xxxxxxxxx",
  "jobUrl": "https://cloud.trigger.dev/projects/proj_xxx/runs/run_xxx"
}
```

### Check Job Status

Visit the `jobUrl` in the response to see:
- Job progress
- Logs
- Success/failure status
- Output data

Or use the API:

```bash
curl https://your-domain.vercel.app/api/jobs/run_xxxxxxxxx
```

## Step 5: Verify Scheduled Task

The orchestrator is configured as a **Trigger.dev scheduled task** in `trigger/orchestrator.ts`:

```typescript
export const orchestrateArticleFetch = schedules.task({
  id: "orchestrate-article-fetch",
  cron: "0 2 * * *", // Daily at 2:00 AM UTC
  // ...
})
```

After deploying with `pnpm trigger:deploy`, verify it's working:

1. Go to Trigger.dev dashboard → Schedules
2. You should see "orchestrate-article-fetch" scheduled for daily 2 AM UTC
3. View upcoming runs and execution history
4. Optionally trigger a test run from the dashboard

**Note**: The schedule is managed entirely by Trigger.dev - no Vercel cron configuration needed!

## Development Workflow

### Running Jobs Locally

```bash
# Terminal 1: Start Trigger.dev dev server
pnpm trigger:dev

# Terminal 2: Start Nuxt dev server
pnpm dev

# Terminal 3: Trigger a job
curl http://localhost:3000/api/trigger-fetch
```

The Trigger.dev dev server will:
- Watch for job file changes
- Execute jobs locally
- Show logs in real-time

### Testing Individual Jobs

You can test jobs in the Trigger.dev dashboard:

1. Go to https://cloud.trigger.dev/projects/[your-project]/jobs
2. Select a job
3. Click "Test run"
4. View logs and output

## Understanding the Jobs

### 1. Orchestrator (`trigger/orchestrator.ts`)

**Purpose**: Coordinates the entire workflow (Scheduled Task)

**Schedule**: Daily at 2:00 AM UTC (`cron: "0 2 * * *"`)

**Flow**:
1. Triggers `fetchArticles` job
2. Waits for completion
3. If articles need scraping, triggers `scrapeMetadata` jobs in batches
4. Returns aggregated results

**Triggered by**:
- **Automatically**: Trigger.dev scheduler (daily at 2 AM UTC)
- **Manually**: `/api/trigger-fetch` endpoint (for testing/emergency runs)

### 2. Fetch Articles (`trigger/fetch-articles.ts`)

**Purpose**: Fetch and save articles from RSS feeds

**What it does**:
- Queries active RSS sources
- Parses feeds (with Google News URL decoding)
- Filters by ant-related keywords
- Creates article database entries
- Returns IDs of articles needing metadata

**Execution time**: ~30-60 seconds

### 3. Scrape Metadata (`trigger/scrape-metadata.ts`)

**Purpose**: Enrich articles with OpenGraph metadata

**What it does**:
- Takes batch of article IDs
- Scrapes each URL for metadata (image, description, author)
- Updates database
- Rate limits (500ms between requests)

**Execution time**: ~25 seconds per 50 articles

## Monitoring & Debugging

### Trigger.dev Dashboard

https://cloud.trigger.dev/projects/[your-project-id]

Shows:
- All job runs
- Success/failure status
- Execution time
- Detailed logs
- Retry attempts

### Job Status API

Check any job status programmatically:

```bash
GET /api/jobs/:jobId
```

Returns:
```json
{
  "success": true,
  "job": {
    "id": "run_xxx",
    "status": "COMPLETED",
    "createdAt": "2024-01-05T12:00:00Z",
    "output": { ... },
    "url": "https://cloud.trigger.dev/..."
  }
}
```

### Common Issues

#### Jobs Not Running

1. **Check environment variables**: Ensure `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_ID` are set
2. **Deploy jobs**: Run `pnpm trigger:deploy` if you haven't already
3. **Check Trigger.dev dashboard**: Look for error messages

#### Database Connection Errors

Trigger.dev jobs need access to your database:

1. **Neon**: Ensure `DATABASE_URL` is set in Trigger.dev environment
2. **IP Allowlist**: If using IP restrictions, add Trigger.dev's IPs
3. **Connection pooling**: Neon's serverless driver should handle this automatically

#### Import Errors

Jobs use Nuxt's `hub:db` alias:

```typescript
import { db, schema } from 'hub:db'  // ✅ Correct
import { db, schema } from '../server/db/schema'  // ❌ Won't work
```

## Cost Estimate

**Trigger.dev Free Tier**: 100,000 job runs/month

**Current usage**:
- Orchestrator: ~30/month (1 per day)
- Fetch articles: ~30/month (1 per day)
- Scrape metadata: ~600/month (~20 batches per day)

**Total**: ~660 runs/month (**well within free tier**)

## Next Steps

After setting up Trigger.dev, you can add more jobs:

- **AI Tag Generation**: Automatically tag articles using Claude/OpenAI
- **Duplicate Detection**: Find duplicate articles using embeddings
- **Content Summarization**: Generate summaries for articles
- **Image Processing**: Optimize and cache images

See `trigger/README.md` for more details on job architecture.

## Support

- **Trigger.dev Docs**: https://trigger.dev/docs
- **Trigger.dev Discord**: https://trigger.dev/discord
- **Project Issues**: Check the Antkeeper News repository issues
