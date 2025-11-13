# ⚡ Environment Variables - Quick Reference
## مرجع سريع للمتغيرات البيئية

---

## 📦 Variables in wrangler.toml (6)

Add this `[vars]` section to your `wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "production"
AI_GATEWAY_ACCOUNT_ID = "85b01d19439ca53d3cfa740d2621a2bd"
AI_GATEWAY_NAME = "symbolai-gateway"
EMAIL_FROM = "info@symbolai.net"
EMAIL_FROM_NAME = "SymbolAI"
ADMIN_EMAIL = "admin@symbolai.net"
```

---

## 🔐 Required Secrets (2)

```bash
# 1. Email Service (CRITICAL)
npx wrangler secret put RESEND_API_KEY
# Get from: https://resend.com/api-keys
# Format: re_xxxxxxxxxxxxxxxxxx

# 2. Session Encryption (RECOMMENDED)
npx wrangler secret put SESSION_SECRET
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔐 Optional Secrets (3)

```bash
# AI Features
npx wrangler secret put ANTHROPIC_API_KEY

# Zapier Integration
npx wrangler secret put ZAPIER_WEBHOOK_URL

# Resend Webhooks
npx wrangler secret put RESEND_WEBHOOK_SECRET
```

---

## ✅ Quick Commands

```bash
# List all secrets
npx wrangler secret list

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Delete a secret
npx wrangler secret delete SECRET_NAME

# Deploy
npx wrangler pages deploy symbolai-worker/dist

# Test deployment
curl https://symbolai.net/api/health
```

---

## 🔗 Cloudflare Bindings (Already Configured)

| Type | Binding | ID/Name |
|------|---------|---------|
| D1 | `DB` | `symbolai-financial-db` |
| KV | `SESSIONS` | `8f91016b...492aab` |
| KV | `CACHE` | `a497973...9ac947` |
| KV | `FILES` | `d9961a2...f3611c1` |
| KV | `RATE_LIMIT` | `797b754...2512af` |
| KV | `OAUTH_KV` | `57a4eb4...e174894` |
| R2 | `PAYROLL_BUCKET` | `symbolai-payrolls` |
| R2 | `STORAGE` | `erp-storage` |

---

## 📋 Status Checklist

```
✅ wrangler.toml configured
✅ D1 database created
✅ KV namespaces created
✅ R2 buckets created
⚠️ Set RESEND_API_KEY
⚠️ Set SESSION_SECRET
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "RESEND_API_KEY undefined" | `npx wrangler secret put RESEND_API_KEY` |
| "Cannot find binding DB" | Check `wrangler.toml` D1 binding |
| "Session encryption failed" | `npx wrangler secret put SESSION_SECRET` |
| Variables not loading | Redeploy: `npx wrangler pages deploy` |

---

## 🔗 Resources

- Full docs: `ENVIRONMENT_VARIABLES_COMPLETE.md`
- Setup wizard: `./setup-secrets.sh`
- Resend Dashboard: https://resend.com
- Cloudflare Dashboard: https://dash.cloudflare.com

---

**Quick Setup:** Run `./setup-secrets.sh` for interactive configuration wizard
