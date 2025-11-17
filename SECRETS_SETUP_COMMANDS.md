# 🔐 Secrets Setup Commands - Ready to Use
## أوامر إعداد Secrets - جاهزة للتشغيل

**Project:** lkm-hr-system (Cloudflare Pages)
**Generated:** November 2025

---

## ⚡ Quick Setup (Copy & Paste)

### 🔴 REQUIRED: RESEND_API_KEY

```bash
# Get your API key from: https://resend.com/api-keys
# Format: re_xxxxxxxxxxxxxxxxxxxx

npx wrangler pages secret put RESEND_API_KEY --project-name=lkm-hr-system
# Paste your Resend API key when prompted
```

---

### 🟡 RECOMMENDED: SESSION_SECRET

**Auto-Generated Secure Secret:**

```
caf411de499d41c5c0ed733ca12f396e6ce01c5f630d0c088bcd3f570d5b2fff
```

**Set it:**

```bash
echo "caf411de499d41c5c0ed733ca12f396e6ce01c5f630d0c088bcd3f570d5b2fff" | \
  npx wrangler pages secret put SESSION_SECRET --project-name=lkm-hr-system
```

---

## 🟢 Optional Secrets

### ANTHROPIC_API_KEY (AI Features)

```bash
# Get from: https://console.anthropic.com/
# Format: sk-ant-api03-xxxxxxxxxxxxxxxxxxxx

npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=lkm-hr-system
```

### ZAPIER_WEBHOOK_URL (Zapier Integration)

```bash
# Get from: https://zapier.com/app/zaps
# Format: https://hooks.zapier.com/hooks/catch/xxxxx/yyyyy/

npx wrangler pages secret put ZAPIER_WEBHOOK_URL --project-name=lkm-hr-system
```

### RESEND_WEBHOOK_SECRET (Resend Webhooks)

```bash
# Get from: https://resend.com/webhooks
# Format: whsec_xxxxxxxxxxxxxxxxxxxx

npx wrangler pages secret put RESEND_WEBHOOK_SECRET --project-name=lkm-hr-system
```

---

## ✅ Verification Commands

### List All Secrets

```bash
npx wrangler pages secret list --project-name=lkm-hr-system
```

### Check Pages Deployment

```bash
npx wrangler pages deployment list --project-name=lkm-hr-system
```

### View Project Info

```bash
npx wrangler pages project get lkm-hr-system
```

---

## 🔄 Update/Replace a Secret

```bash
# Overwrites the existing value
npx wrangler pages secret put SECRET_NAME --project-name=lkm-hr-system
```

---

## 🗑️ Delete a Secret

```bash
npx wrangler pages secret delete SECRET_NAME --project-name=lkm-hr-system
```

---

## 📋 Complete Setup Script

**Run all required secrets at once:**

```bash
#!/bin/bash
# Setup Required Secrets for lkm-hr-system

PROJECT="lkm-hr-system"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Setting up Secrets for $PROJECT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. RESEND_API_KEY (REQUIRED)
echo "🔴 1/2: Setting RESEND_API_KEY (REQUIRED)"
echo "Get your key from: https://resend.com/api-keys"
npx wrangler pages secret put RESEND_API_KEY --project-name=$PROJECT

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 2. SESSION_SECRET (RECOMMENDED)
echo "🟡 2/2: Setting SESSION_SECRET (RECOMMENDED)"
echo "Using auto-generated secure secret..."
echo "caf411de499d41c5c0ed733ca12f396e6ce01c5f630d0c088bcd3f570d5b2fff" | \
  npx wrangler pages secret put SESSION_SECRET --project-name=$PROJECT

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Required secrets setup complete!"
echo ""
echo "📋 Verify with:"
echo "   npx wrangler pages secret list --project-name=$PROJECT"
echo ""
echo "🚀 Deploy with:"
echo "   npx wrangler pages deploy symbolai-worker/dist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

**Save as `setup-required-secrets.sh` and run:**

```bash
chmod +x setup-required-secrets.sh
./setup-required-secrets.sh
```

---

## 🆘 Troubleshooting

### Error: "CLOUDFLARE_API_TOKEN environment variable"

**Solution:**

```bash
# Login to Cloudflare
npx wrangler login

# Or set API token
export CLOUDFLARE_API_TOKEN="your-token-here"
```

### Error: "Project not found"

**Solution:**

```bash
# List all projects
npx wrangler pages project list

# Use the correct project name
npx wrangler pages secret put SECRET_NAME --project-name=lkm-hr-system
```

### Secret Not Working After Setting

**Solution:**

1. Verify secret is set:
   ```bash
   npx wrangler pages secret list --project-name=lkm-hr-system
   ```

2. Redeploy the project:
   ```bash
   npx wrangler pages deploy symbolai-worker/dist
   ```

3. Check deployment logs:
   ```bash
   npx wrangler pages deployment tail --project-name=lkm-hr-system
   ```

---

## 🔑 Secret Values Reference

### Generated SESSION_SECRET

```
caf411de499d41c5c0ed733ca12f396e6ce01c5f630d0c088bcd3f570d5b2fff
```

**Keep this safe!** You'll need it if you want to manually set it later.

### Where to Get Other Secrets

| Secret | Get From | Format |
|--------|----------|--------|
| RESEND_API_KEY | https://resend.com/api-keys | `re_xxxxx` |
| ANTHROPIC_API_KEY | https://console.anthropic.com/ | `sk-ant-api03-xxxxx` |
| ZAPIER_WEBHOOK_URL | https://zapier.com/app/zaps | `https://hooks.zapier.com/...` |
| RESEND_WEBHOOK_SECRET | https://resend.com/webhooks | `whsec_xxxxx` |

---

## 📊 Current Configuration Status

### ✅ Configured in wrangler.toml (6 variables):

```toml
[vars]
ENVIRONMENT = "production"
AI_GATEWAY_ACCOUNT_ID = "85b01d19439ca53d3cfa740d2621a2bd"
AI_GATEWAY_NAME = "symbol"
EMAIL_FROM = "info@symbolai.net"
EMAIL_FROM_NAME = "SymbolAI"
ADMIN_EMAIL = "admin@symbolai.net"
```

### ⚠️ Need to Set (2 required secrets):

- [ ] `RESEND_API_KEY` (Critical)
- [ ] `SESSION_SECRET` (Recommended) - **Value generated above**

### 🟢 Optional (3 secrets):

- [ ] `ANTHROPIC_API_KEY`
- [ ] `ZAPIER_WEBHOOK_URL`
- [ ] `RESEND_WEBHOOK_SECRET`

---

## 🚀 Next Steps After Setting Secrets

1. **Verify Secrets:**
   ```bash
   npx wrangler pages secret list --project-name=lkm-hr-system
   ```

2. **Deploy:**
   ```bash
   npx wrangler pages deploy symbolai-worker/dist
   ```

3. **Test Email System:**
   ```bash
   curl -X POST https://symbolai.net/api/email/test \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"to":["test@example.com"],"subject":"Test","body":"Testing"}'
   ```

4. **Monitor Deployment:**
   ```bash
   npx wrangler pages deployment tail --project-name=lkm-hr-system
   ```

---

## 💡 Pro Tips

### Generate New SESSION_SECRET Anytime

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Bulk Secret Setup via Script

Create a file `secrets.txt`:

```
RESEND_API_KEY=re_your_key_here
SESSION_SECRET=caf411de499d41c5c0ed733ca12f396e6ce01c5f630d0c088bcd3f570d5b2fff
```

Then:

```bash
while IFS='=' read -r key value; do
  echo "$value" | npx wrangler pages secret put "$key" --project-name=lkm-hr-system
done < secrets.txt
```

### Rotate Secrets Regularly

```bash
# Generate new SECRET
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Update
echo "$NEW_SECRET" | npx wrangler pages secret put SESSION_SECRET --project-name=lkm-hr-system
```

---

**Ready to set secrets!** Start with the required ones:

```bash
# 1. RESEND_API_KEY
npx wrangler pages secret put RESEND_API_KEY --project-name=lkm-hr-system

# 2. SESSION_SECRET (use generated value)
echo "caf411de499d41c5c0ed733ca12f396e6ce01c5f630d0c088bcd3f570d5b2fff" | \
  npx wrangler pages secret put SESSION_SECRET --project-name=lkm-hr-system
```
