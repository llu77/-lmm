# 🚀 Environment Variables - Quick Reference

## ✅ Currently Configured (wrangler.toml)

| Variable | Value | Description |
|----------|-------|-------------|
| `ENVIRONMENT` | `"production"` | Environment identifier |
| `AI_GATEWAY_ACCOUNT_ID` | `"85b01d19439ca53d3cfa740d2621a2bd"` | Cloudflare AI Gateway account |
| `AI_GATEWAY_NAME` | `"symbol"` | AI Gateway name |
| `EMAIL_FROM` | `"info@symbolai.net"` | Default sender email |
| `EMAIL_FROM_NAME` | `"SymbolAI"` | Sender display name |
| `ADMIN_EMAIL` | `"admin@symbolai.net"` | Admin notification email |

---

## ⚠️ Secrets to Configure

### Required (Email Functionality)

```bash
# RESEND_API_KEY - Required for email
npx wrangler secret put RESEND_API_KEY
# Get from: https://resend.com/api-keys
```

### Recommended (Security)

```bash
# SESSION_SECRET - Recommended for production
npx wrangler secret put SESSION_SECRET
# Generate: openssl rand -base64 32
```

### Optional (Features)

```bash
# ANTHROPIC_API_KEY - For AI features
npx wrangler secret put ANTHROPIC_API_KEY

# ZAPIER_WEBHOOK_URL - For Zapier automation
npx wrangler secret put ZAPIER_WEBHOOK_URL

# RESEND_WEBHOOK_SECRET - For email webhook validation
npx wrangler secret put RESEND_WEBHOOK_SECRET
```

---

## 🔍 Usage in Code

### Email Variables
- **Used in**: `src/lib/email.ts`, `src/lib/email-error-handler.ts`, `src/lib/email-triggers.ts`
- **Purpose**: Send emails via Resend API
- **Required**: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `ADMIN_EMAIL`

### Session Variables
- **Used in**: `src/lib/session.ts`
- **Purpose**: Session management with KV
- **Required**: `SESSIONS` (KV namespace)
- **Optional**: `SESSION_SECRET`

### AI Variables
- **Used in**: AI-powered features
- **Purpose**: Claude API integration
- **Optional**: `ANTHROPIC_API_KEY`

---

## ❌ Not Used

- `NODE_ENV` → Use `ENVIRONMENT` instead
- `BASE_URL` → Configured via routes in wrangler.toml
- `jwt_secret` → Using session-based auth, not JWT

---

## 🛠️ Quick Setup

```bash
# Interactive setup
cd symbolai-worker
./setup-secrets.sh

# Or manually
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put SESSION_SECRET

# List secrets
npx wrangler secret list

# Deploy
npm run build
npx wrangler deploy
```

---

## 📚 Documentation

- Full details: `ENVIRONMENT_VARIABLES_VERIFICATION.md`
- Setup script: `symbolai-worker/setup-secrets.sh`
- Type definitions: `symbolai-worker/src/env.d.ts`
