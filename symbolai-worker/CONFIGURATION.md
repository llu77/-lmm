# SymbolAI Worker - Configuration Guide

Complete guide for configuring and deploying the SymbolAI Worker application on Cloudflare Workers & Pages.

## Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Cloudflare Resources](#cloudflare-resources)
4. [Configuration Files](#configuration-files)
5. [Secrets Management](#secrets-management)
6. [Deployment](#deployment)
7. [Security](#security)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Overview

**Application**: SymbolAI Worker
**Framework**: Astro 5.x with Cloudflare adapter
**Platform**: Cloudflare Workers & Pages
**Runtime**: Cloudflare Workers Standard Plan (30s CPU time)

### Key Features

- **Astro SSR**: Server-side rendering with Cloudflare adapter
- **D1 Database**: SQLite database for financial data
- **KV Storage**: Session management, caching, rate limiting
- **R2 Storage**: Payroll PDF storage
- **Workers AI**: Integration with Cloudflare AI (via AI Gateway)
- **Durable Objects**: MCP (Model Context Protocol) agents
- **Workflows**: Automated financial workflows

---

## Environment Setup

### Prerequisites

```bash
# Required tools
node --version    # v20.x or higher
npm --version     # v10.x or higher
git --version     # v2.x or higher

# Install Wrangler CLI globally
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### Local Development

1. **Clone repository**
   ```bash
   git clone https://github.com/llu77/-lmm.git
   cd -lmm/symbolai-worker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create local environment file**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Generate TypeScript types for Workers bindings**
   ```bash
   npm run cf:types
   ```

5. **Start development server**
   ```bash
   npm run dev
   # Server runs on http://localhost:4321
   ```

---

## Cloudflare Resources

### Required Resources

All Cloudflare resources must be created before deployment. Here's the complete list:

#### 1. D1 Database

**Production Database:**
- **Name**: `symbolai-financial-db`
- **ID**: `3897ede2-ffc0-4fe8-8217-f9607c89bef2`
- **Purpose**: Main financial ERP database

```bash
# View database
wrangler d1 info symbolai-financial-db

# Execute SQL
wrangler d1 execute symbolai-financial-db --file=./schema.sql
```

#### 2. KV Namespaces

**Sessions KV:**
- **Binding**: `SESSIONS`
- **ID**: `8f91016b728c4a289fdfdec425492aab`
- **Purpose**: User session storage

**Cache KV:**
- **Binding**: `CACHE`
- **ID**: `a497973607cf45bbbee76b64da9ac947`
- **Purpose**: Application caching

**Files KV:**
- **Binding**: `FILES`
- **ID**: `d9961a2085d44c669bbe6c175f3611c1`
- **Purpose**: File metadata storage

**Rate Limit KV:**
- **Binding**: `RATE_LIMIT`
- **ID**: `797b75482e6c4408bb40f6d72f2512af`
- **Purpose**: API rate limiting

**OAuth KV:**
- **Binding**: `OAUTH_KV`
- **ID**: `57a4eb48d4f047e7aea6b4692e174894`
- **Purpose**: OAuth token storage

```bash
# List all KV namespaces
npm run cf:kv:list

# Create new KV namespace
wrangler kv:namespace create "NAMESPACE_NAME"
```

#### 3. R2 Bucket

**Payroll PDFs:**
- **Binding**: `PAYROLL_PDFS`
- **Bucket**: `symbolai-payrolls`
- **Purpose**: PDF storage for payroll documents

```bash
# List R2 buckets
wrangler r2 bucket list

# Create bucket
wrangler r2 bucket create symbolai-payrolls
```

#### 4. AI Gateway

**Configuration:**
- **Account ID**: `85b01d19439ca53d3cfa740d2621a2bd`
- **Gateway Name**: `symbolai-enhanced`
- **Purpose**: AI request routing and caching

Create at: [Cloudflare Dashboard > AI > AI Gateway](https://dash.cloudflare.com/?to=/:account/ai/ai-gateway)

#### 5. Durable Objects

**CloudflareMCPAgent:**
- **Class**: `CloudflareMCPAgent`
- **Purpose**: MCP (Model Context Protocol) agent instances

Configured automatically via `wrangler.toml` migrations.

#### 6. Workflows

**Financial Workflow:**
- **Binding**: `WORKFLOWS`
- **Name**: `symbolai-workflows`

**D1 Migration Workflow:**
- **Binding**: `D1_MIGRATION_WORKFLOW`
- **Name**: `d1-migration-workflow`

**KV Batch Workflow:**
- **Binding**: `KV_BATCH_WORKFLOW`
- **Name**: `kv-batch-workflow`

---

## Configuration Files

### 1. `wrangler.toml`

Main configuration file for Cloudflare Workers deployment.

**Location**: `symbolai-worker/wrangler.toml`

**Key Sections**:
- Worker name and entry point
- D1 database bindings
- KV namespace bindings
- R2 bucket bindings
- AI Gateway configuration
- Durable Objects configuration
- Workflows configuration
- Environment variables
- Routes configuration

See inline comments in `wrangler.toml` for detailed explanations.

### 2. `astro.config.mjs`

Astro framework configuration with Cloudflare adapter.

**Location**: `symbolai-worker/astro.config.mjs`

**Key Settings**:
```javascript
{
  output: 'server',  // SSR mode
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'cloudflare'
  })
}
```

### 3. `tsconfig.json`

TypeScript configuration with Cloudflare Workers types.

**Location**: `symbolai-worker/tsconfig.json`

**Important**:
```json
{
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  }
}
```

### 4. `.env.example`

Template for environment variables and secrets.

**Location**: `symbolai-worker/.env.example`

**Usage**:
- Copy to `.env.local` for local development
- Never commit `.env.local` to git
- Use `wrangler secret put` for production secrets

---

## Secrets Management

### Required Secrets

All sensitive credentials must be stored as Wrangler secrets:

1. **ANTHROPIC_API_KEY** - Claude AI API key
2. **RESEND_API_KEY** - Email service API key
3. **RESEND_WEBHOOK_SECRET** - Email webhook verification
4. **SESSION_SECRET** - JWT/session encryption key
5. **ZAPIER_WEBHOOK_URL** - Automation webhook URL

### Setting Secrets

**Production:**
```bash
# Set a secret
wrangler secret put ANTHROPIC_API_KEY
# Enter value when prompted

# Set all secrets
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_WEBHOOK_SECRET
wrangler secret put SESSION_SECRET
wrangler secret put ZAPIER_WEBHOOK_URL
```

**Preview Environment:**
```bash
# Set secrets for preview environment
wrangler secret put ANTHROPIC_API_KEY --env preview
wrangler secret put RESEND_API_KEY --env preview
# ... etc
```

**List Secrets:**
```bash
# List all secrets (doesn't show values)
wrangler secret list

# List for preview environment
wrangler secret list --env preview
```

**Delete Secret:**
```bash
wrangler secret delete SECRET_NAME
```

### Generating Secure Secrets

**Session Secret:**
```bash
# Generate random 32-byte base64 string
openssl rand -base64 32
```

**Password Hashing:**
```bash
# Use the secure password generator script
cd symbolai-worker
node scripts/generate-secure-passwords.js
```

---

## Deployment

### Deployment Environments

**1. Production** (main branch)
- URL: `https://symbolai.net`
- Branch: `main`
- Environment: `production`

**2. Preview** (pull requests)
- URL: Auto-generated for each PR
- Branch: Any PR branch
- Environment: `preview`

**3. Local Development**
- URL: `http://localhost:4321`
- Command: `npm run dev`

### Manual Deployment

**Deploy to Production:**
```bash
cd symbolai-worker

# Build the application
npm run build

# Deploy to Cloudflare Workers
npm run deploy
# or
wrangler deploy --config wrangler.toml
```

**Deploy to Preview:**
```bash
npm run deploy:preview
# or
wrangler deploy --config wrangler.toml --env preview
```

### Automated Deployment (GitHub Actions)

The repository includes GitHub Actions workflow for automatic deployment:

**Workflow**: `.github/workflows/cloudflare-workers-deploy.yml`

**Triggers**:
- Push to `main` → Deploy to production
- Pull request → Deploy to preview
- Manual trigger → Deploy to chosen environment

**Required GitHub Secrets**:
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your account ID

**Setup**:
1. Create API token: [Cloudflare Dashboard > API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Add to GitHub: Repository > Settings > Secrets and variables > Actions
3. Push to `main` or create a PR

### Deployment Checklist

Before deploying to production:

- [ ] All tests passing (`npm run security:test`)
- [ ] No npm audit vulnerabilities (`npm run security:audit`)
- [ ] TypeScript type checking passes (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)
- [ ] All secrets set in Cloudflare (`wrangler secret list`)
- [ ] Database migrations applied (`wrangler d1 execute`)
- [ ] Environment variables configured (`wrangler.toml`)

---

## Security

### Security Headers

All responses include OWASP-compliant security headers:

- **Content-Security-Policy (CSP)** - XSS protection
- **Strict-Transport-Security (HSTS)** - Force HTTPS
- **X-Frame-Options** - Clickjacking protection
- **X-Content-Type-Options** - MIME-sniffing protection
- **Referrer-Policy** - Referrer control
- **Permissions-Policy** - Feature restrictions

Configured in: `src/middleware.ts`

### Password Security

- **Algorithm**: Argon2id (PHC winner 2015)
- **Parameters**: 19MB memory, 2 iterations
- **Migration**: Automatic from SHA-256 on login
- **Validation**: OWASP password strength requirements

See: `src/lib/password.ts`

### Rate Limiting

API endpoints are protected with KV-based rate limiting:

- **Sliding window** algorithm
- **Per-user** and **per-IP** limits
- **Configurable** thresholds

### Dependency Security

- **Dependabot** - Automated dependency updates
- **GitHub Security Scanning** - Vulnerability detection
- **npm audit** - Regular security audits

Configuration: `.github/dependabot.yml`

---

## Monitoring

### Cloudflare Dashboard

Monitor your Worker at: [Cloudflare Dashboard > Workers & Pages](https://dash.cloudflare.com/)

**Key Metrics**:
- Requests per second
- CPU time usage
- Errors and exceptions
- Edge locations

### Logging

**View live logs:**
```bash
# Tail production logs
npm run cf:tail

# Tail with filters
wrangler tail --format pretty --status error
```

**Log Levels**:
- `console.log()` - Informational
- `console.warn()` - Warnings
- `console.error()` - Errors

### Performance

**Expected Performance**:
- Password hashing: ~600ms (Argon2id)
- Database queries: <50ms (D1)
- KV reads: <10ms
- Total request: <1000ms

### Error Tracking (Optional)

Consider integrating Sentry for advanced error tracking:

```bash
npm install @sentry/astro --save
```

Configuration guide: [Sentry for Cloudflare Workers](https://docs.sentry.io/platforms/javascript/guides/cloudflare/)

---

## Troubleshooting

### Common Issues

**1. Build Fails with Memory Error**
```bash
# Solution: Increase Node.js memory
NODE_OPTIONS='--max-old-space-size=2048' npm run build
```

**2. TypeScript Errors**
```bash
# Regenerate types
npm run cf:types
npm run sync
```

**3. Database Connection Fails**
```bash
# Check D1 database exists
wrangler d1 list

# Check bindings in wrangler.toml
grep -A5 "d1_databases" wrangler.toml
```

**4. Secrets Not Available**
```bash
# List secrets
wrangler secret list

# Re-set secret
wrangler secret put SECRET_NAME
```

**5. Deployment Fails**
```bash
# Check Wrangler version
wrangler --version  # Should be 3.x

# Update Wrangler
npm update wrangler

# Login again
wrangler login
```

### Debug Mode

Enable verbose logging:

```bash
# Local development
DEBUG=* npm run dev

# Deployment
wrangler deploy --verbose
```

### Support Resources

- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Astro Docs**: https://docs.astro.build/
- **GitHub Issues**: https://github.com/llu77/-lmm/issues
- **Cloudflare Discord**: https://discord.cloudflare.com/

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview build locally

# Deployment
npm run deploy           # Deploy to production
npm run deploy:preview   # Deploy to preview

# Cloudflare
npm run cf:types         # Generate TypeScript types
npm run cf:tail          # View live logs
npm run cf:kv:list       # List KV namespaces
npm run cf:d1:list       # List D1 databases

# Security
npm run security:audit   # Run npm audit
npm run security:test    # Test password hashing

# Type checking
npm run type-check       # Run Astro type check
```

### File Structure

```
symbolai-worker/
├── src/
│   ├── middleware.ts           # Auth & security headers
│   ├── lib/
│   │   ├── password.ts         # Argon2id hashing
│   │   └── permissions.ts      # RBAC system
│   ├── pages/
│   │   ├── api/                # API endpoints
│   │   └── *.astro             # Page routes
│   └── components/             # React components
├── scripts/
│   ├── generate-seed-data.js   # Seed data (secure)
│   ├── generate-secure-passwords.js
│   └── test-password-hashing.ts
├── wrangler.toml               # Cloudflare config
├── astro.config.mjs            # Astro config
├── tsconfig.json               # TypeScript config
├── .env.example                # Environment template
└── CONFIGURATION.md            # This file
```

---

**Last Updated**: 2025-11-20
**Version**: 2.0.0 (Security Enhanced)
**Maintained by**: SymbolAI Security Team
