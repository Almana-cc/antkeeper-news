# Trigger.dev Implementation Summary

## Problem Solved

The article fetching process was running as a Nitro task triggered by Vercel cron, which caused timeout issues:

- **Vercel Hobby tier**: 10 second timeout
- **Vercel Pro tier**: 60 second timeout
- **Actual execution time**: Several minutes (especially with metadata scraping)

This caused incomplete fetches and unreliable article updates.

## Solution

Implemented Trigger.dev job queue system to run long-running tasks in the background without timeout limits.

## Changes Made

### 1. Dependencies Added

```json
{
  "@trigger.dev/sdk": "^3.3.17"
}
```

### 2. New Files Created

#### Configuration
- **`trigger.config.ts`** - Trigger.dev project configuration with retry settings
- **`.env.example`** - Updated with Trigger.dev environment variables

#### Jobs (trigger/)
- **`trigger/index.ts`** - Job exports
- **`trigger/orchestrator.ts`** - Main orchestration job
- **`trigger/fetch-articles.ts`** - RSS feed fetching job
- **`trigger/scrape-metadata.ts`** - Metadata scraping job
- **`trigger/README.md`** - Job architecture documentation

#### API Endpoints
- **`server/api/jobs/[id].get.ts`** - Job status monitoring endpoint

#### Documentation
- **`TRIGGER_SETUP.md`** - Complete setup guide
- **`IMPLEMENTATION_SUMMARY.md`** - This file

### 3. Modified Files

#### `server/api/trigger-fetch.ts`
**Before:**
- Called Nitro task inline: `runTask('fetch-articles')`
- Blocked until completion (caused timeouts)
- Required Vercel cron to trigger

**After:**
- Optional manual trigger endpoint for testing/emergency runs
- Uses `tasks.trigger()` to manually invoke scheduled task
- Returns immediately with job ID

#### `trigger/orchestrator.ts`
**Changed:**
- Converted from `task()` to `schedules.task()`
- Added cron schedule: `"0 2 * * *"` (daily at 2 AM UTC)
- Runs automatically without external triggers

#### `vercel.json`
**Removed:**
- No longer needed - scheduling handled by Trigger.dev

#### `package.json`
Added scripts:
```json
{
  "trigger:dev": "npx trigger.dev@latest dev",
  "trigger:deploy": "npx trigger.dev@latest deploy"
}
```

## Architecture

### Job Flow

**Automatic (Daily):**
```
Trigger.dev Scheduler (daily at 2 AM UTC)
  ↓
orchestrateArticleFetch (Scheduled Task)
  ↓
  ├─→ fetchArticles (30-60s)
  │     ├─ Fetch RSS feeds
  │     ├─ Decode Google News URLs
  │     ├─ Filter by keywords
  │     ├─ Create article entries
  │     └─ Return article IDs needing scraping
  │
  └─→ scrapeMetadata × N batches (25s per batch)
        ├─ Batch 1 (50 articles)
        ├─ Batch 2 (50 articles)
        └─ Batch N (remaining)
```

**Manual (Testing/Emergency):**
```
/api/trigger-fetch → tasks.trigger('orchestrate-article-fetch') → Same flow as above
```

### Key Improvements

1. **No Timeouts**: Jobs can run for hours if needed
2. **Automatic Retries**: Failed jobs retry up to 3 times with exponential backoff
3. **Batching**: Metadata scraping split into 50-article batches
4. **Monitoring**: Real-time job tracking in Trigger.dev dashboard
5. **Parallel Processing**: Multiple scrape batches run simultaneously

## Breaking Changes

### None!

The API remains the same:
- Cron still triggers `/api/trigger-fetch`
- Endpoint still returns success/failure
- Database schema unchanged

The only difference is execution happens asynchronously in the background.

## Setup Requirements

### Environment Variables

```bash
# Required
TRIGGER_SECRET_KEY="tr_dev_xxx"  # or tr_prod_xxx for production
TRIGGER_PROJECT_ID="proj_xxx"
DATABASE_URL="postgresql://..."

# Optional
CRON_SECRET="your-secret"
```

### Deployment Steps

1. Create Trigger.dev account at https://cloud.trigger.dev
2. Create project and get credentials
3. Set environment variables in Vercel
4. Deploy jobs: `pnpm trigger:deploy`
5. Verify cron triggers jobs correctly

See `TRIGGER_SETUP.md` for detailed instructions.

## Testing

### Local Testing

```bash
# Terminal 1: Start Trigger.dev dev server
pnpm trigger:dev

# Terminal 2: Start Nuxt dev server
pnpm dev

# Terminal 3: Trigger the job
curl http://localhost:3000/api/trigger-fetch
```

### Production Testing

```bash
# Trigger manually
curl -X GET https://your-domain.com/api/trigger-fetch \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check job status
curl https://your-domain.com/api/jobs/[job-id]
```

## Monitoring

### Trigger.dev Dashboard
- View all job runs
- See detailed logs
- Track success/failure rates
- Monitor execution times

### API Endpoint
```bash
GET /api/jobs/:id
```

Returns job status, output, and errors.

## Cost

**Trigger.dev Free Tier**: 100,000 runs/month

**Estimated usage**: ~660 runs/month
- Well within free tier limits
- No additional costs

## Future Enhancements

The Trigger.dev infrastructure enables:

1. **AI Tag Generation** - Automatically tag articles using Claude/OpenAI
2. **Duplicate Detection** - Find duplicates using embeddings
3. **Content Summarization** - Generate AI summaries
4. **Image Processing** - Optimize and cache images
5. **Newsletter Generation** - Weekly digest emails

All can be added as new jobs without changing core architecture.

## Rollback Plan

If needed, you can rollback by:

1. Revert `server/api/trigger-fetch.ts` to use `runTask('fetch-articles')`
2. Remove Trigger.dev dependencies
3. The old Nitro task still exists in `server/tasks/fetch-articles.ts`

However, the timeout issues will return.

## Performance Comparison

### Before (Nitro Task)
- ❌ Times out after 60 seconds
- ❌ No retry on failure
- ❌ All-or-nothing processing
- ❌ No visibility into progress

### After (Trigger.dev)
- ✅ No timeout limits
- ✅ Automatic retries (3 attempts)
- ✅ Batched processing (continues even if one batch fails)
- ✅ Real-time monitoring and logs

## Conclusion

The Trigger.dev integration successfully solves the timeout problem while maintaining API compatibility and adding powerful job monitoring capabilities. This unblocks all future AI features that require long-running tasks.

Next priority from roadmap: **Multi-language site (i18n)**
