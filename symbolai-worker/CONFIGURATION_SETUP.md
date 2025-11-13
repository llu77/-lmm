# Configuration Setup Guide

This document explains how to properly configure the SymbolAI Worker application.

## Critical Configuration Issues

### 1. KV Namespace Setup (Required)

The application uses Cloudflare KV for session storage. The namespace ID must be configured:

```bash
# Create the KV namespace
wrangler kv:namespace create "SESSIONS"

# The command will output something like:
# ✨ Success!
# Add the following to your wrangler.toml:
# [[kv_namespaces]]
# binding = "SESSIONS"
# id = "abc123def456..."
```

**Update `wrangler.toml` line 24:**
```toml
# Before:
id = "your_kv_namespace_id_here"

# After:
id = "abc123def456..."  # Use the actual ID from wrangler output
```

### 2. Environment Variables Setup

Copy the example file and fill in your secrets:

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your actual API keys
```

**Required secrets for production:**
```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_WEBHOOK_SECRET
wrangler secret put ZAPIER_WEBHOOK_URL
wrangler secret put SESSION_SECRET
```

### 3. Database Setup

The D1 database is already configured in `wrangler.toml`. To initialize:

```bash
# Run migrations
wrangler d1 execute DB --remote --file=./migrations/001_create_email_tables.sql
wrangler d1 execute DB --remote --file=./migrations/002_create_branches_and_roles.sql
# ... run other migrations as needed
```

## Verification

After configuration, test the setup:

```bash
# Local development (uses local simulators)
wrangler dev --local

# Preview (uses remote resources)
wrangler dev

# Deploy
wrangler deploy
```

## Common Issues

### Issue: "Runtime bindings not available"
**Solution:** Ensure KV namespace is created and ID is correctly set in wrangler.toml

### Issue: "Invalid binding `SESSIONS`"
**Solution:** The KV namespace ID is still set to placeholder value

### Issue: Email features not working
**Solution:** Set RESEND_API_KEY secret: `wrangler secret put RESEND_API_KEY`

## Configuration Files Checklist

- [x] `wrangler.toml` - Main configuration (needs KV namespace ID update)
- [x] `astro.config.mjs` - Astro framework configuration
- [x] `tailwind.config.mjs` - Tailwind CSS configuration
- [x] `postcss.config.js` - PostCSS configuration
- [x] `tsconfig.json` - TypeScript configuration
- [x] `.dev.vars` - Local environment variables (create from .dev.vars.example)
- [x] `.gitignore` - Ensure .dev.vars is ignored

## Security Notes

1. Never commit `.dev.vars` to version control
2. Use `wrangler secret put` for production secrets
3. Rotate API keys regularly
4. Keep `SESSION_SECRET` strong and unique

## Next Steps

1. Create KV namespace and update wrangler.toml
2. Copy .dev.vars.example to .dev.vars
3. Fill in your API keys in .dev.vars
4. Run migrations if needed
5. Test locally with `wrangler dev --local`
6. Deploy with `wrangler deploy`
