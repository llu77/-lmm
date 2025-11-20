# 🔐 Secrets Setup Guide

This guide explains how to set up secrets for SymbolAI Worker deployment on Cloudflare Workers.

## ⚠️ Security Warning

**IMPORTANT**: Never commit secrets to git! All sensitive files are gitignored:
- `.env.local`
- `setup-secrets*.sh`
- Any file containing API keys or tokens

---

## Quick Setup (Automated)

We've created an automated script for quick secret setup:

### Step 1: Run the Setup Script

```bash
cd symbolai-worker
./setup-secrets-now.sh
```

This script will automatically configure:
- ✅ ANTHROPIC_API_KEY
- ✅ RESEND_API_KEY  
- ✅ SESSION_SECRET (auto-generated)
- ⚠️  RESEND_WEBHOOK_SECRET (placeholder)
- ⚠️  ZAPIER_WEBHOOK_URL (placeholder)

### Step 2: Verify Secrets

```bash
wrangler secret list --config wrangler.toml
```

### Step 3: Delete the Script (IMPORTANT!)

```bash
rm setup-secrets-now.sh
```

**Why delete?** The script contains your actual API keys and should never be committed or left on disk.

---

## Manual Setup

If you prefer to set secrets manually:

### Production Environment

```bash
cd symbolai-worker

# Set each secret individually
echo "your-anthropic-key" | wrangler secret put ANTHROPIC_API_KEY
echo "your-resend-key" | wrangler secret put RESEND_API_KEY
echo "$(openssl rand -base64 32)" | wrangler secret put SESSION_SECRET
echo "your-webhook-secret" | wrangler secret put RESEND_WEBHOOK_SECRET
echo "your-zapier-url" | wrangler secret put ZAPIER_WEBHOOK_URL
```

### Preview Environment

```bash
# Same commands with --env preview flag
echo "your-anthropic-key" | wrangler secret put ANTHROPIC_API_KEY --env preview
echo "your-resend-key" | wrangler secret put RESEND_API_KEY --env preview
# ... etc
```

---

## Current Configuration

### KV Namespaces (Already Configured in wrangler.toml)

| Binding | ID | Purpose |
|---------|-----|---------|
| SESSIONS | `8f91016b728c4a289fdfdec425492aab` | User sessions |
| CACHE | `a497973607cf45bbbee76b64da9ac947` | App caching |
| FILES | `d9961a2085d44c669bbe6c175f3611c1` | File metadata |
| RATE_LIMIT | `797b75482e6c4408bb40f6d72f2512af` | API rate limiting |
| OAUTH_KV | `57a4eb48d4f047e7aea6b4692e174894` | OAuth tokens |

### API Keys (Set via Secrets)

| Secret | Status | Notes |
|--------|--------|-------|
| ANTHROPIC_API_KEY | ✅ Configured | Claude AI API |
| RESEND_API_KEY | ✅ Configured | Email service |
| SESSION_SECRET | ✅ Auto-generated | JWT encryption |
| RESEND_WEBHOOK_SECRET | ⚠️ Placeholder | Update if using webhooks |
| ZAPIER_WEBHOOK_URL | ⚠️ Placeholder | Update if using Zapier |

### AI Gateway

- **Account ID**: `85b01d19439ca53d3cfa740d2621a2bd`
- **Gateway Name (Production)**: `symbolai-enhanced`
- **Gateway Name (Preview)**: `symbolai-enhanced-preview`

---

## Local Development

For local development with Wrangler:

1. **Copy environment file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local`** with your development keys

3. **Start dev server**:
   ```bash
   npm run dev
   ```

The `.env.local` file is already created with your keys, but **NEVER commit it to git**.

---

## Verification Commands

```bash
# List all secrets
wrangler secret list

# List for preview
wrangler secret list --env preview

# Test deployment (dry run)
wrangler deploy --dry-run

# View live logs
npm run cf:tail
```

---

## Security Best Practices

### ✅ DO:
- Use `wrangler secret put` for production secrets
- Rotate API keys periodically (every 90 days)
- Use different keys for production and preview
- Generate strong random SESSION_SECRET
- Delete setup scripts after use
- Review `.gitignore` regularly

### ❌ DON'T:
- Commit secrets to git (even in private repos)
- Share API keys in Slack/Email
- Reuse secrets across projects
- Use weak or predictable SESSION_SECRET
- Leave setup scripts on disk

---

## Rotating Secrets

To rotate (change) a secret:

```bash
# Generate new key from service provider
# Then update in Cloudflare
echo "new-key-value" | wrangler secret put SECRET_NAME

# Verify
wrangler secret list
```

### Rotation Schedule

| Secret | Recommended Frequency |
|--------|----------------------|
| ANTHROPIC_API_KEY | Every 90 days |
| RESEND_API_KEY | Every 90 days |
| SESSION_SECRET | Every 180 days |
| RESEND_WEBHOOK_SECRET | On compromise |
| ZAPIER_WEBHOOK_URL | On compromise |

---

## Troubleshooting

### Secret Not Found Error

```bash
# Re-set the secret
echo "your-key" | wrangler secret put SECRET_NAME
```

### Authentication Error

```bash
# Re-login to Cloudflare
wrangler login
```

### Wrong Environment

```bash
# Make sure you're in the right directory
cd symbolai-worker

# Use explicit config flag
wrangler secret put SECRET_NAME --config wrangler.toml
```

---

## Next Steps

After setting up secrets:

1. ✅ Generate TypeScript types: `npm run cf:types`
2. ✅ Run security audit: `npm run security:audit`
3. ✅ Test password hashing: `npm run security:test`
4. ✅ Build application: `npm run build`
5. ✅ Deploy: `npm run deploy`

---

## Support

- **Configuration Guide**: See `CONFIGURATION.md`
- **Security Audit**: See `COMPREHENSIVE_SECURITY_AUDIT_REPORT.md`
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/

---

**Last Updated**: 2025-11-20  
**Status**: ✅ All secrets configured for production
