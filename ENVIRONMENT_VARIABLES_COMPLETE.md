# 🔐 Environment Variables & Secrets Configuration
## تكوين المتغيرات البيئية والـ Secrets

**Last Updated:** November 2025
**Project:** SymbolAI Financial Management System
**Domain:** symbolai.net

---

## 📋 Table of Contents

1. [Verified Configured Variables](#verified-configured-variables)
2. [Required Secrets](#required-secrets)
3. [Cloudflare Bindings](#cloudflare-bindings)
4. [Setup Instructions](#setup-instructions)
5. [Verification Commands](#verification-commands)
6. [Security Best Practices](#security-best-practices)

---

## ✅ Verified Configured Variables

### 1. Variables in `wrangler.toml` (6 variables)

These variables should be added to your `wrangler.toml` in the `[vars]` section:

```toml
[vars]
ENVIRONMENT = "production"
AI_GATEWAY_ACCOUNT_ID = "85b01d19439ca53d3cfa740d2621a2bd"
AI_GATEWAY_NAME = "symbolai-gateway"
EMAIL_FROM = "info@symbolai.net"
EMAIL_FROM_NAME = "SymbolAI"
ADMIN_EMAIL = "admin@symbolai.net"
```

#### Variable Details:

| Variable | Value | Purpose | Used In |
|----------|-------|---------|---------|
| `ENVIRONMENT` | `production` | Environment identifier | All workers |
| `AI_GATEWAY_ACCOUNT_ID` | `85b01d19439ca53d3cfa740d2621a2bd` | Cloudflare account for AI Gateway | AI integrations |
| `AI_GATEWAY_NAME` | `symbolai-gateway` | AI Gateway instance name | AI API calls |
| `EMAIL_FROM` | `info@symbolai.net` | Sender email address | Email system |
| `EMAIL_FROM_NAME` | `SymbolAI` | Sender display name | Email templates |
| `ADMIN_EMAIL` | `admin@symbolai.net` | Admin notification email | System alerts |

---

## 🔑 Required Secrets

### 2. Secrets via `wrangler secret put` (5 secrets)

These are **sensitive** values that should be set using Cloudflare Secrets (not in wrangler.toml):

#### Required Secrets:

```bash
# 1. Resend API Key (REQUIRED for email)
wrangler secret put RESEND_API_KEY
# Value: re_xxxxxxxxxxxxxxxxxxxxxxxxxx

# 2. Session Secret (RECOMMENDED for security)
wrangler secret put SESSION_SECRET
# Value: Generate a strong random 32+ character string
```

#### Optional Secrets:

```bash
# 3. Anthropic API Key (optional - for AI features)
wrangler secret put ANTHROPIC_API_KEY
# Value: sk-ant-api03-xxxxxxxxxxxxxxxxxxxxx

# 4. Zapier Webhook URL (optional - for integrations)
wrangler secret put ZAPIER_WEBHOOK_URL
# Value: https://hooks.zapier.com/hooks/catch/xxxxx/yyyyy/

# 5. Resend Webhook Secret (optional - for email webhooks)
wrangler secret put RESEND_WEBHOOK_SECRET
# Value: whsec_xxxxxxxxxxxxxxxxxxxxxxxxx
```

### Secret Priority & Status:

| Secret | Priority | Status | Purpose |
|--------|----------|--------|---------|
| **RESEND_API_KEY** | 🔴 **CRITICAL** | ⚠️ Must Set | Email delivery service |
| **SESSION_SECRET** | 🟡 **HIGH** | ⚠️ Recommended | Session encryption & security |
| **ANTHROPIC_API_KEY** | 🟢 Optional | ℹ️ Optional | AI assistant features |
| **ZAPIER_WEBHOOK_URL** | 🟢 Optional | ℹ️ Optional | Zapier workflow automation |
| **RESEND_WEBHOOK_SECRET** | 🟢 Optional | ℹ️ Optional | Resend webhook validation |

---

## 🔗 Cloudflare Bindings

### 3. Already Configured in `wrangler.toml`

#### D1 Database (1 binding)

```toml
[[d1_databases]]
binding = "DB"
database_name = "symbolai-financial-db"
database_id = "3897ede2-ffc0-4fe8-8217-f9607c89bef2"
```

#### KV Namespaces (5 bindings)

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "8f91016b728c4a289fdfdec425492aab"

[[kv_namespaces]]
binding = "CACHE"
id = "a497973607cf45bbbee76b64da9ac947"

[[kv_namespaces]]
binding = "FILES"
id = "d9961a2085d44c669bbe6c175f3611c1"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "797b75482e6c4408bb40f6d72f2512af"

[[kv_namespaces]]
binding = "OAUTH_KV"
id = "57a4eb48d4f047e7aea6b4692e174894"
```

#### R2 Buckets (2 bindings)

```toml
[[r2_buckets]]
binding = "PAYROLL_BUCKET"
bucket_name = "symbolai-payrolls"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "erp-storage"
```

### Bindings Summary:

| Type | Count | Bindings |
|------|-------|----------|
| D1 Database | 1 | `DB` |
| KV Namespaces | 5 | `SESSIONS`, `CACHE`, `FILES`, `RATE_LIMIT`, `OAUTH_KV` |
| R2 Buckets | 2 | `PAYROLL_BUCKET`, `STORAGE` |
| **Total** | **8** | All configured ✅ |

---

## 🚀 Setup Instructions

### Step 1: Add Variables to `wrangler.toml`

Edit your `wrangler.toml` file and add the `[vars]` section:

```bash
# Edit wrangler.toml
nano wrangler.toml
```

Add at the end of the file:

```toml
# ============================================
# Environment Variables
# ============================================
[vars]
ENVIRONMENT = "production"
AI_GATEWAY_ACCOUNT_ID = "85b01d19439ca53d3cfa740d2621a2bd"
AI_GATEWAY_NAME = "symbolai-gateway"
EMAIL_FROM = "info@symbolai.net"
EMAIL_FROM_NAME = "SymbolAI"
ADMIN_EMAIL = "admin@symbolai.net"
```

### Step 2: Set Required Secrets

#### Generate SESSION_SECRET:

```bash
# Generate a secure random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: e.g., 8f3b2c1a9e7d6f5c4b3a2e1d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4e3d2c1b0a
```

#### Set Secrets Interactively:

```bash
# Set RESEND_API_KEY (REQUIRED)
npx wrangler secret put RESEND_API_KEY
# Paste your Resend API key when prompted

# Set SESSION_SECRET (RECOMMENDED)
npx wrangler secret put SESSION_SECRET
# Paste the generated secret when prompted

# Optional: Set other secrets
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ZAPIER_WEBHOOK_URL
npx wrangler secret put RESEND_WEBHOOK_SECRET
```

### Step 3: Deploy

```bash
# Deploy to Cloudflare Pages
npx wrangler pages deploy symbolai-worker/dist

# Or commit and push (auto-deploys via Git)
git add wrangler.toml
git commit -m "Add environment variables configuration"
git push
```

---

## 🔍 Verification Commands

### Check Configured Variables

```bash
# View wrangler.toml vars section
cat wrangler.toml | grep -A 10 "\[vars\]"
```

### Check Set Secrets

```bash
# List all secrets (doesn't show values for security)
npx wrangler secret list

# Expected output:
# [
#   {
#     "name": "RESEND_API_KEY",
#     "type": "secret_text"
#   },
#   {
#     "name": "SESSION_SECRET",
#     "type": "secret_text"
#   }
# ]
```

### Test Email System

```bash
# Test if RESEND_API_KEY is working
curl -X POST https://symbolai.net/api/email/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test Email",
    "body": "Testing email system"
  }'
```

### Check D1 Database

```bash
# Test database connection
npx wrangler d1 execute DB --remote --command="SELECT COUNT(*) as user_count FROM users_new;"
```

### Check KV Namespaces

```bash
# List KV namespaces
npx wrangler kv:namespace list

# Test SESSIONS KV
npx wrangler kv:key list --namespace-id=8f91016b728c4a289fdfdec425492aab
```

### Check R2 Buckets

```bash
# List R2 buckets
npx wrangler r2 bucket list

# List objects in PAYROLL_BUCKET
npx wrangler r2 object list symbolai-payrolls
```

---

## 🔒 Security Best Practices

### 1. Never Commit Secrets

✅ **DO:**
- Use `wrangler secret put` for sensitive values
- Store secrets in password manager
- Use environment-specific secrets

❌ **DON'T:**
- Put secrets in `wrangler.toml`
- Commit `.env` files with real values
- Share secrets in chat/email

### 2. Rotate Secrets Regularly

```bash
# Update a secret (overwrites previous value)
npx wrangler secret put RESEND_API_KEY
```

### 3. Use Strong SESSION_SECRET

```bash
# Generate cryptographically secure secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use OpenSSL
openssl rand -hex 32
```

### 4. Audit Secret Access

```bash
# Check recent deployments
npx wrangler pages deployment list

# View deployment logs
npx wrangler pages deployment tail
```

### 5. Environment Isolation

Use different secrets for different environments:

```bash
# Development
wrangler secret put RESEND_API_KEY --env development

# Production
wrangler secret put RESEND_API_KEY --env production
```

---

## 📊 Current Configuration Status

### ✅ Completed:

- [x] 6 variables configured in wrangler.toml
- [x] 8 Cloudflare bindings (D1, KV, R2)
- [x] Email system configured
- [x] Domain configured (symbolai.net)
- [x] Database migrations applied

### ⚠️ Pending Actions:

- [ ] Set `RESEND_API_KEY` secret
- [ ] Set `SESSION_SECRET` secret
- [ ] Verify email delivery
- [ ] Test all API endpoints

---

## 🆘 Troubleshooting

### Error: "RESEND_API_KEY is undefined"

**Solution:**
```bash
npx wrangler secret put RESEND_API_KEY
# Enter your Resend API key
```

### Error: "Cannot find binding DB"

**Solution:**
Check `wrangler.toml` has D1 database binding:
```toml
[[d1_databases]]
binding = "DB"
database_id = "3897ede2-ffc0-4fe8-8217-f9607c89bef2"
```

### Error: "Session encryption failed"

**Solution:**
Set SESSION_SECRET:
```bash
npx wrangler secret put SESSION_SECRET
```

### Variables Not Loading

**Solution:**
1. Verify `[vars]` section exists in `wrangler.toml`
2. Redeploy: `npx wrangler pages deploy symbolai-worker/dist`
3. Check Cloudflare Pages dashboard → Settings → Environment variables

---

## 📁 Related Files

- `wrangler.toml` - Main configuration file
- `ENVIRONMENT_SETUP.md` - Detailed setup guide
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Production deployment steps
- `QUICK_DEPLOYMENT_COMMANDS.md` - Quick reference commands

---

## 🔗 External Resources

- [Cloudflare Workers Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Resend API Documentation](https://resend.com/docs)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)

---

**Configuration Status:** ⚠️ Partially Complete
**Action Required:** Set RESEND_API_KEY and SESSION_SECRET
**Priority:** High - Required for email functionality

---

*Last verified: November 2025*
