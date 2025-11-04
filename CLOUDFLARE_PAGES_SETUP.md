# ☁️ Cloudflare Pages Setup Guide
## دليل إعداد Cloudflare Pages الشامل

---

## 📋 المتطلبات الأساسية / Prerequisites

### 1. حساب Cloudflare
- ✅ حساب Cloudflare مفعّل
- ✅ Cloudflare Pages enabled
- ✅ API Token مع الصلاحيات المناسبة

### 2. GitHub Repository
- ✅ Repository متصل بـ GitHub
- ✅ GitHub Actions مفعّل
- ✅ Secrets محددة

---

## 🔐 الخطوة 1: إعداد API Token

### إنشاء Cloudflare API Token

1. اذهب إلى: https://dash.cloudflare.com/profile/api-tokens
2. اضغط "Create Token"
3. اختر "Edit Cloudflare Workers" template
4. أضف الصلاحيات التالية:
   ```
   - Account → Cloudflare Pages → Edit
   - Account → D1 → Edit
   - Account → Workers KV Storage → Edit
   - Account → Workers Scripts → Edit
   ```
5. احفظ الـ Token (لن تراه مرة أخرى!)

### إضافة Token إلى GitHub Secrets

1. اذهب إلى repository settings
2. Secrets and variables → Actions
3. أضف Secrets التالية:

```
CLOUDFLARE_API_TOKEN=your-token-here
CLOUDFLARE_ACCOUNT_ID=your-account-id-here
```

**للحصول على Account ID:**
```bash
# Method 1: من dashboard
# اذهب إلى: https://dash.cloudflare.com/
# Account ID موجود في الـ sidebar

# Method 2: من wrangler
wrangler whoami
```

---

## 🏗️ الخطوة 2: إنشاء Cloudflare Pages Project

### من Dashboard (الطريقة الأسهل)

1. اذهب إلى: https://dash.cloudflare.com/
2. Workers & Pages → Create application
3. Pages → Connect to Git
4. اختر GitHub repository: `llu77/-lmm`
5. Configure build settings:

```yaml
Production branch: main
Build command: cd symbolai-worker && npm run build
Build output directory: symbolai-worker/dist
Root directory: /
```

6. اضغط "Save and Deploy"

### من Command Line (بديل)

```bash
# تثبيت wrangler
npm install -g wrangler

# تسجيل الدخول
wrangler login

# إنشاء project
cd symbolai-worker
wrangler pages create lkm-hr-system

# أول deployment
npm run build
wrangler pages deploy dist --project-name=lkm-hr-system
```

---

## 🔗 الخطوة 3: إعداد Bindings

### D1 Database Binding

```bash
# إنشاء D1 database
wrangler d1 create lkm-hr-system-db

# تحديث wrangler.toml
```

أضف في `symbolai-worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "lkm-hr-system-db"
database_id = "<your-database-id>"
```

### KV Namespace Bindings

```bash
# إنشاء KV namespaces
wrangler kv:namespace create "SESSIONS"
wrangler kv:namespace create "CACHE"

# للـ preview environment
wrangler kv:namespace create "SESSIONS" --preview
wrangler kv:namespace create "CACHE" --preview
```

أضف في `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "<sessions-namespace-id>"
preview_id = "<sessions-preview-id>"

[[kv_namespaces]]
binding = "CACHE"
id = "<cache-namespace-id>"
preview_id = "<cache-preview-id>"
```

### إعداد Bindings في Cloudflare Dashboard

1. اذهب إلى Pages project → Settings → Functions
2. أضف KV namespace bindings:
   - Variable name: `SESSIONS`
   - KV namespace: (اختر من القائمة)
3. أضف D1 database binding:
   - Variable name: `DB`
   - D1 database: (اختر من القائمة)

---

## 🔧 الخطوة 4: Environment Variables

### في Cloudflare Dashboard

اذهب إلى: Pages project → Settings → Environment variables

#### Production Variables:

```bash
# AI/LLM
ANTHROPIC_API_KEY=sk-ant-...
AI_GATEWAY_ACCOUNT_ID=your-account-id
AI_GATEWAY_NAME=your-gateway-name

# AWS Bedrock (optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Email
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...

# Session
SESSION_SECRET=your-random-secret-here

# Node Environment
NODE_ENV=production
```

#### Preview Variables (same as production or test values)

---

## 📊 الخطوة 5: إعداد Database Schema

```bash
# Run migrations
wrangler d1 execute DB --remote --file=./migrations/001_create_email_tables.sql
wrangler d1 execute DB --remote --file=./migrations/002_create_branches_and_roles.sql
wrangler d1 execute DB --remote --file=./migrations/003_seed_branches_and_users_hashed.sql
```

**أو استخدم migration script:**

```bash
cd symbolai-worker
npm run migrate:prod
```

---

## 🚀 الخطوة 6: Deployment

### Automatic Deployment (GitHub Actions)

تم إعداد GitHub Actions للـ deployment التلقائي:

- **Push إلى `main`**: → Deployment للإنتاج
- **Pull Request**: → Preview deployment

### Manual Deployment

```bash
cd symbolai-worker

# Build
npm run build

# Deploy
wrangler pages deploy dist --project-name=lkm-hr-system
```

---

## ✅ الخطوة 7: التحقق من التشغيل

### 1. اختبار الـ URL

```bash
# Production
curl https://lkm-hr-system.pages.dev

# يجب أن يعيد HTML
```

### 2. اختبار API Endpoints

```bash
# Test login endpoint
curl -X POST https://lkm-hr-system.pages.dev/api/auth/session \
  -H "Content-Type: application/json" \
  --cookie "session=..."

# يجب أن يعيد: {"authenticated": false} أو user data
```

### 3. اختبار Database Connection

```bash
# من dashboard
wrangler pages project view lkm-hr-system

# Check logs
wrangler pages deployment tail lkm-hr-system
```

### 4. اختبار KV Storage

```bash
# Test session storage
wrangler kv:key list --namespace-id=<sessions-namespace-id>
```

---

## 🔍 الخطوة 8: Monitoring & Debugging

### Cloudflare Dashboard

1. Workers & Pages → lkm-hr-system
2. Tabs المهمة:
   - **Analytics**: Traffic, requests, errors
   - **Logs**: Real-time logs (tail logs)
   - **Functions**: Performance metrics
   - **Settings**: Configuration

### Wrangler CLI

```bash
# View logs in real-time
wrangler pages deployment tail lkm-hr-system

# View specific deployment
wrangler pages deployment list lkm-hr-system

# View project details
wrangler pages project view lkm-hr-system
```

### Troubleshooting Common Issues

#### Issue 1: Build Failed

```bash
# Check build logs in GitHub Actions
# Or build locally:
cd symbolai-worker
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

#### Issue 2: D1 Database Not Found

```bash
# Verify binding
wrangler d1 list

# Check wrangler.toml has correct database_id
```

#### Issue 3: Environment Variables Not Working

```bash
# Check they're set in dashboard
# Settings → Environment variables → Production

# Or use wrangler:
wrangler pages project view lkm-hr-system
```

---

## 🔄 الخطوة 9: Custom Domain (اختياري)

### إضافة Custom Domain

1. اذهب إلى Pages project → Custom domains
2. اضغط "Set up a custom domain"
3. أدخل domain (مثال: `hr.example.com`)
4. اتبع تعليمات DNS:
   ```
   Type: CNAME
   Name: hr
   Content: lkm-hr-system.pages.dev
   ```
5. انتظر DNS propagation (5-10 دقائق)
6. SSL سيتم إعداده تلقائياً

---

## 📋 Checklist النهائي

### Pre-Deployment:
- [ ] API Token منشأ ومحفوظ في GitHub Secrets
- [ ] Pages project منشأ
- [ ] D1 database منشأ و migrated
- [ ] KV namespaces منشأة
- [ ] Environment variables محددة
- [ ] Bindings configured
- [ ] Build يعمل محلياً بدون أخطاء

### Post-Deployment:
- [ ] Production URL تعمل
- [ ] API endpoints تستجيب
- [ ] Database connection تعمل
- [ ] Sessions تعمل (login/logout)
- [ ] Rate limiting يعمل
- [ ] AI features تعمل (إن وُجدت)
- [ ] Monitoring مفعّل
- [ ] GitHub Actions تعمل

---

## 🛠️ Configuration Files

### wrangler.toml (Complete Example)

```toml
name = "lkm-hr-system"
compatibility_date = "2025-01-01"
pages_build_output_dir = "dist"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "lkm-hr-system-db"
database_id = "your-database-id-here"

# KV Namespaces
[[kv_namespaces]]
binding = "SESSIONS"
id = "your-sessions-id-here"
preview_id = "your-sessions-preview-id-here"

[[kv_namespaces]]
binding = "CACHE"
id = "your-cache-id-here"
preview_id = "your-cache-preview-id-here"

# Compatibility flags
[compatibility_flags]
nodejs_compat = true
```

### astro.config.mjs (Complete Example)

```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true
    },
    imageService: 'cloudflare'
  }),
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    ssr: {
      external: [
        'node:buffer',
        'node:path',
        'node:fs',
        'node:fs/promises',
        'node:stream',
        'node:url',
        'node:crypto'
      ]
    }
  }
});
```

---

## 📞 الدعم / Support

### مصادر مفيدة:

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [KV Storage Docs](https://developers.cloudflare.com/kv/)
- [Astro Cloudflare Adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)

### Community:

- [Cloudflare Discord](https://discord.gg/cloudflaredev)
- [Cloudflare Community](https://community.cloudflare.com/)

---

## 🎉 التهانى!

إذا وصلت إلى هنا، فإن تطبيقك الآن:
- ✅ Deployed على Cloudflare Pages
- ✅ متصل بـ D1 Database
- ✅ يستخدم KV Storage للجلسات
- ✅ لديه CI/CD pipeline كامل
- ✅ Protected بـ rate limiting
- ✅ Monitored & logged

**🚀 Your app is production-ready!**

---

**Created:** 2025-01-04
**Version:** 1.0
**Status:** ✅ Complete
