# Cloudflare Workers CI/CD Quick Start 🚀

> **TL;DR**: Automatic deployments are configured! Just set up your Cloudflare secrets and start deploying.

## 🔑 Required Setup (One-time)

### 1. Add GitHub Secrets

Go to **Settings** → **Secrets and variables** → **Actions** and add:

| Secret | Where to find it |
|--------|------------------|
| `CLOUDFLARE_API_TOKEN` | [Create at Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → Use "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | Run `wrangler whoami` or check Cloudflare Dashboard sidebar |

### 2. Create Preview Resources (Optional)

For preview deployments, create these in Cloudflare Dashboard:

- **D1 Database**: `symbolai-financial-db-preview`
- **KV Namespaces**: Preview versions of SESSIONS, FILES, OAUTH_KV
- **R2 Bucket**: `symbolai-payrolls-preview`

Then uncomment and update IDs in `symbolai-worker/wrangler.toml` under `[env.preview]`.

## 🎯 How to Deploy

### Production Deployment
```bash
# Method 1: Via GitHub (recommended)
git push origin main

# Method 2: Manual
npm run deploy
```

### Preview Deployment
```bash
# Automatic: Just open a PR!
# The bot will comment with preview URLs
```

### Manual Workflow Trigger
1. Go to **Actions** → **Deploy Cloudflare Workers**
2. Click **Run workflow**
3. Select branch and environment

## 📊 What Gets Deployed

| Worker | Location | Description |
|--------|----------|-------------|
| **SymbolAI Worker** | `symbolai-worker/` | Main app with D1, KV, R2, AI |
| **Cloudflare Worker** | `cloudflare-worker/` | Astro blog starter |
| **Cloudflare Pages** | `symbolai-worker/dist/` | Static site |

## 🔍 Monitoring

- **GitHub Actions**: [View workflows](../../actions/workflows/cloudflare-workers-deploy.yml)
- **Cloudflare Dashboard**: [Workers & Pages](https://dash.cloudflare.com)
- **Deployment Status**: Check PR comments for preview URLs

## ⚡ Key Features

- ✅ Automatic production deploys on `main` branch
- ✅ Automatic preview deploys on pull requests
- ✅ Build caching for faster deployments
- ✅ Path-based triggers (only deploys when workers change)
- ✅ Deployment summaries in GitHub Actions
- ✅ PR comments with preview URLs
- ✅ Concurrent deployment prevention

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Authentication error | Check `CLOUDFLARE_API_TOKEN` secret is set |
| Build fails | Check logs in GitHub Actions |
| Preview not working | Add `[env.preview]` configuration to `wrangler.toml` |
| Bindings error | Ensure preview resources exist in Cloudflare |

## 📚 Full Documentation

For detailed setup instructions, troubleshooting, and advanced configuration:

👉 **[Complete CI/CD Setup Guide](../docs/CLOUDFLARE_CICD_SETUP.md)**

## 🔗 Quick Links

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions Workflow](.github/workflows/cloudflare-workers-deploy.yml)
- [Create API Token](https://dash.cloudflare.com/profile/api-tokens)

---

**Need help?** Check the [troubleshooting guide](../docs/CLOUDFLARE_CICD_SETUP.md#troubleshooting) or open an issue.
