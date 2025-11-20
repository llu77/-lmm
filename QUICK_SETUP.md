# 🚀 إعداد سريع لـ Cloudflare Pages

## الطريقة الأسهل (موصى به)

### الخطوة 1: تشغيل السكريبت التلقائي

```bash
cd symbolai-worker
./setup-cloudflare-pages.sh
```

هذا السكريبت سيقوم بـ:
- ✅ التحقق من تسجيل الدخول
- ✅ إضافة جميع الـ Secrets (سيطلب منك إدخالها)
- ✅ نشر التطبيق (اختياري)

---

### الخطوة 2: إعداد يدوي في Dashboard (5 دقائق)

#### A. Environment Variables

افتح: https://dash.cloudflare.com
→ Pages → symbolai-financial-erp → Settings → Environment variables

**أضف هذه (Production & Preview):**

```env
ENVIRONMENT=production
AI_GATEWAY_ACCOUNT_ID=85b01d19439ca53d3cfa740d2621a2bd
AI_GATEWAY_NAME=symbol
EMAIL_FROM=info@symbolai.net
EMAIL_FROM_NAME=SymbolAI
```

#### B. Function Bindings

انتقل إلى: Settings → Functions → Bindings

**D1 Database:**
- اضغط "Add binding"
- Type: D1 database
- Variable name: `DB`
- D1 database: `symbolai-financial-db`

**KV Namespaces:**

اضغط "Add binding" 4 مرات:

| Variable Name | KV Namespace ID |
|--------------|-----------------|
| SESSIONS | 8f91016b728c4a289fdfdec425492aab |
| CACHE | a497973607cf45bbbee76b64da9ac947 |
| FILES | d9961a2085d44c669bbe6c175f3611c1 |
| RATE_LIMIT | 797b75482e6c4408bb40f6d72f2512af |

**R2 Bucket:**
- اضغط "Add binding"
- Type: R2 bucket
- Variable name: `PAYROLL_PDFS`
- R2 bucket: `symbolai-payrolls`

---

## الطريقة اليدوية الكاملة

### 1. تسجيل الدخول

```bash
cd symbolai-worker
npx wrangler login
```

### 2. إنشاء المشروع (إذا لم يكن موجوداً)

افتح: https://dash.cloudflare.com/pages
- اضغط "Create a project"
- اختر "Direct Upload"
- اسم المشروع: `symbolai-financial-erp`

### 3. إضافة Secrets واحداً تلو الآخر

#### ANTHROPIC_API_KEY
```bash
npx wrangler pages secret put ANTHROPIC_API_KEY \
  --project-name=symbolai-financial-erp
```
عند الطلب، أدخل API key من: https://console.anthropic.com/settings/keys

#### RESEND_API_KEY
```bash
npx wrangler pages secret put RESEND_API_KEY \
  --project-name=symbolai-financial-erp
```
عند الطلب، أدخل API key من: https://resend.com/api-keys

#### SESSION_SECRET
```bash
# توليد secret عشوائي
openssl rand -base64 32

# ثم أضفه
npx wrangler pages secret put SESSION_SECRET \
  --project-name=symbolai-financial-erp
```

### 4. النشر

```bash
# تثبيت التبعيات
npm ci --legacy-peer-deps --ignore-scripts

# بناء التطبيق
NODE_OPTIONS='--max-old-space-size=4096' npm run build

# نشر
npx wrangler pages deploy dist \
  --project-name=symbolai-financial-erp \
  --branch=main
```

### 5. إضافة Bindings (في Dashboard)

اتبع الخطوة 2 من "الطريقة الأسهل" أعلاه.

---

## التحقق من النشر

بعد النشر، افتح:
```
https://symbolai-financial-erp.pages.dev
```

أو راجع Dashboard:
```
https://dash.cloudflare.com/pages
```

---

## استكشاف الأخطاء

### خطأ: "Not logged in"
```bash
npx wrangler login
```

### خطأ: "Project not found"
أنشئ المشروع في Dashboard أولاً:
https://dash.cloudflare.com/pages

### خطأ: "Build failed"
تحقق من السجلات في:
Dashboard → Pages → symbolai-financial-erp → Deployments → [Latest] → View logs

### خطأ: "Binding not found"
تأكد من إضافة جميع الـ bindings في:
Settings → Functions → Bindings

---

## الخطوة التالية

بعد إتمام الإعداد، يمكنك:

1. **النشر التلقائي**: أي push إلى `main` سينشر تلقائياً
2. **النشر اليدوي**: `npm run build && npx wrangler pages deploy dist`
3. **مراقبة**: راجع Analytics في Dashboard

---

## الموارد

- **Dashboard**: https://dash.cloudflare.com/pages
- **Documentation**: DEPLOYMENT_GUIDE.md
- **Support**: https://community.cloudflare.com/

---

**جاهز! 🎉**
