# Deploy with API Token

## Quick Start

### 1. Get API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use template: **"Edit Cloudflare Workers"**
4. Copy the token

### 2. Get Account ID

From: https://dash.cloudflare.com (in the sidebar)

### 3. Deploy

```bash
# Set environment variables
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"

# Deploy
npx wrangler deploy
```

## Alternative: Deploy via GitHub Actions

Add these secrets to your GitHub repository:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Then push to main branch - automatic deployment will trigger!

## Manual Secret Setup

```bash
# After authentication, set secrets:
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY

# Apply database schema
npx wrangler d1 execute symbolai-financial-db --file=./schema.sql

# Deploy
npx wrangler deploy
```

## Verify Deployment

```bash
# Check deployment status
npx wrangler deployments list

# Test worker
curl https://your-worker.workers.dev/

# Check D1 database
npx wrangler d1 execute symbolai-financial-db --command="SELECT COUNT(*) FROM Uu_sink"
```
