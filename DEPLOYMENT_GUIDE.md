# 🚀 دليل النشر الشامل | Complete Deployment Guide

**النظام:** Jobfit Community - symbolai-worker
**المنصة:** Cloudflare Workers + Pages
**التاريخ:** نوفمبر 2025

---

## ✅ **التنظيف المكتمل:**

تم بنجاح:
- ✅ نقل `/src/` (Convex) إلى `src-convex-backup/`
- ✅ حذف المجلدات القديمة (cloudflare-worker, etc.)
- ✅ نقل `/wrangler.toml` إلى backup
- ✅ إصلاح `symbolai-worker/wrangler.toml`
- ✅ إنشاء `.env.example`
- ✅ إنشاء سكريبتات Setup
- ✅ تحديث `.gitignore`

---

## 📋 **Checklist قبل Deploy:**

### **1️⃣ المتطلبات الأساسية**

```bash
# تحقق من تثبيت Node.js
node --version  # يجب >= 18.0.0

# تحقق من تثبيت Wrangler
wrangler --version  # يجب >= 3.0.0

# إذا لم يكن مثبتاً:
npm install -g wrangler

# تسجيل الدخول إلى Cloudflare
wrangler login
```

---

### **2️⃣ إعداد KV Namespace**

```bash
cd symbolai-worker

# تشغيل سكريبت Setup التلقائي
./scripts/setup-kv.sh

# أو يدوياً:
wrangler kv:namespace create "SESSIONS"
# ستحصل على ID، ضعه في wrangler.toml:17
```

**الناتج المتوقع:**
```
🌀 Creating namespace with title "symbolai-worker-SESSIONS"
✨ Success!
Add the following to your wrangler.toml:
{ binding = "SESSIONS", id = "abc123..." }
```

**قم بتحديث `wrangler.toml`:**
```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "abc123..."  # ضع الـ ID هنا
```

---

### **3️⃣ إعداد Secrets**

#### **A. استخدام السكريبت التلقائي (موصى به):**
```bash
cd symbolai-worker
./scripts/setup-secrets.sh
```

السكريبت سيوجهك خلال:
- توليد `SESSION_SECRET` عشوائي
- إضافة `ANTHROPIC_API_KEY` (optional)
- إضافة `RESEND_API_KEY` (optional)
- باقي الـ Secrets

#### **B. يدوياً:**

```bash
# 1. SESSION_SECRET (مطلوب!)
# توليد عشوائي:
openssl rand -base64 32

# ثم:
wrangler secret put SESSION_SECRET
# الصق القيمة المولدة

# 2. ANTHROPIC_API_KEY (للـ AI Assistant)
wrangler secret put ANTHROPIC_API_KEY
# أدخل: sk-ant-api03-...

# 3. RESEND_API_KEY (للإيميل)
wrangler secret put RESEND_API_KEY
# أدخل: re_...

# 4. RESEND_WEBHOOK_SECRET (للإيميل)
wrangler secret put RESEND_WEBHOOK_SECRET

# 5. ZAPIER_WEBHOOK_URL (للتكاملات)
wrangler secret put ZAPIER_WEBHOOK_URL
```

**التحقق من الـ Secrets:**
```bash
wrangler secret list
```

---

### **4️⃣ تحديث Domain (اختياري)**

إذا كان لديك Domain مخصص:

```toml
# في wrangler.toml، احذف التعليقات (#):
routes = [
  { pattern = "yourdomain.com/*", zone_name = "yourdomain.com" },
  { pattern = "*.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

**إذا لم يكن لديك Domain:**
- سيتم استخدام subdomain تلقائي: `symbolai-worker.<account>.workers.dev`

---

## 🛠️ **خطوات Deploy:**

### **المرحلة 1: التحضير**

```bash
cd symbolai-worker

# 1. تثبيت Dependencies
npm install

# 2. اختبار Build محلياً
npm run build

# يجب أن ينجح بدون أخطاء!
```

**إذا فشل Build:**
- تأكد من وجود `node_modules/`
- حاول: `rm -rf node_modules && npm install`
- تحقق من `package.json`

---

### **المرحلة 2: اختبار محلي (اختياري)**

```bash
# تشغيل Dev server محلي
npm run dev

# افتح: http://localhost:4321
# اختبر الصفحات الرئيسية
```

**اختبر:**
- `/` - الصفحة الرئيسية
- `/auth/login` - صفحة تسجيل الدخول
- `/dashboard` - لوحة التحكم
- `/revenues` - صفحة الإيرادات

---

### **المرحلة 3: Deploy الفعلي**

```bash
# 1. Dry Run (اختبار بدون deploy فعلي)
wrangler deploy --dry-run

# 2. Deploy الفعلي
wrangler deploy

# 3. مشاهدة الـ Logs فوراً
wrangler tail
```

**الناتج المتوقع:**
```
✨ Built successfully!
⚡️ Uploading...
🌍 Publishing...
✅ https://symbolai-worker.<account>.workers.dev
```

---

### **المرحلة 4: التحقق**

```bash
# 1. افتح الـ URL
# https://symbolai-worker.<account>.workers.dev

# 2. اختبر الصفحات:
curl https://symbolai-worker.<account>.workers.dev/
curl https://symbolai-worker.<account>.workers.dev/auth/login

# 3. شاهد الـ Logs
wrangler tail
# اترك هذا يعمل في terminal منفصل
```

**إذا نجح كل شيء:**
```
✅ الصفحة الرئيسية تعمل
✅ صفحة Login تعمل
✅ API endpoints تستجيب
✅ لا توجد أخطاء في الـ Logs
```

---

## 🐛 **حل المشاكل:**

### **Problem 1: Build يفشل**

```bash
# Error: astro: not found
# الحل:
cd symbolai-worker
npm install

# Error: Module not found
# الحل:
rm -rf node_modules package-lock.json
npm install
```

---

### **Problem 2: KV Namespace error**

```
Error: KV namespace not found: PLACEHOLDER_KV_ID
```

**الحل:**
```bash
# أنشئ KV namespace
wrangler kv:namespace create "SESSIONS"

# حدث wrangler.toml بالـ ID الفعلي
nano wrangler.toml
# ابحث عن: id = "PLACEHOLDER_KV_ID"
# استبدل بـ: id = "abc123..."
```

---

### **Problem 3: Secrets مفقودة**

```
Error: SESSION_SECRET is not defined
```

**الحل:**
```bash
# أضف الـ Secret
wrangler secret put SESSION_SECRET

# تحقق:
wrangler secret list
```

---

### **Problem 4: Login لا يعمل**

**أسباب محتملة:**
1. SESSION_SECRET غير مضبوط
2. D1 Database غير متصل
3. KV Namespace غير صحيح

**الحل:**
```bash
# تحقق من الـ Secrets
wrangler secret list

# تحقق من D1
wrangler d1 list

# تحقق من Logs
wrangler tail
# حاول تسجيل الدخول وشاهد الأخطاء
```

---

### **Problem 5: Email لا يعمل**

```
Error: RESEND_API_KEY is not defined
```

**الحل:**
```bash
# أضف Resend API Key
wrangler secret put RESEND_API_KEY

# احصل على Key من: https://resend.com/api-keys
```

---

## 📊 **بعد Deploy:**

### **1. مراقبة الأداء**

```bash
# Logs في الوقت الفعلي
wrangler tail

# أو في dashboard:
# https://dash.cloudflare.com/ > Workers > symbolai-worker > Logs
```

---

### **2. تحديثات مستقبلية**

```bash
cd symbolai-worker

# 1. عدّل الكود
# 2. اختبر محلياً
npm run dev

# 3. Build
npm run build

# 4. Deploy
wrangler deploy
```

---

### **3. إدارة Secrets**

```bash
# عرض الـ Secrets الحالية
wrangler secret list

# تحديث Secret
wrangler secret put SECRET_NAME

# حذف Secret
wrangler secret delete SECRET_NAME
```

---

### **4. إدارة KV**

```bash
# قائمة namespaces
wrangler kv:namespace list

# عرض البيانات
wrangler kv:key list --namespace-id=abc123

# حذف مفتاح
wrangler kv:key delete --namespace-id=abc123 "key_name"
```

---

### **5. Database Management**

```bash
# اتصال بـ D1
wrangler d1 execute symbolai-financial-db --command="SELECT * FROM users_new LIMIT 5"

# تشغيل migration
wrangler d1 execute symbolai-financial-db --file=./migrations/xxx.sql

# Backup
wrangler d1 export symbolai-financial-db --output=backup.sql
```

---

## 🔐 **الأمان:**

### **Best Practices:**

1. **لا ترفع Secrets إلى Git أبداً**
   ```bash
   # تحقق من .gitignore
   cat .gitignore | grep ".env"
   ```

2. **استخدم Secrets قوية**
   ```bash
   # SESSION_SECRET يجب أن يكون 32+ حرف عشوائي
   openssl rand -base64 32
   ```

3. **قم بتحديث Secrets دورياً**
   ```bash
   # كل 3-6 أشهر
   wrangler secret put SESSION_SECRET
   ```

4. **راقب الـ Logs للأخطاء**
   ```bash
   wrangler tail --format=pretty
   ```

---

## 📞 **الدعم:**

### **إذا واجهت مشاكل:**

1. **تحقق من الـ Logs:**
   ```bash
   wrangler tail --format=pretty
   ```

2. **تحقق من Status:**
   - https://www.cloudflarestatus.com/

3. **وثائق Cloudflare:**
   - https://developers.cloudflare.com/workers/

4. **Community:**
   - https://discord.gg/cloudflaredev

---

## ✅ **Checklist النهائي:**

```
Pre-Deploy:
□ Node.js مثبت (>= 18.0.0)
□ Wrangler مثبت (>= 3.0.0)
□ تسجيل دخول Cloudflare
□ KV Namespace تم إنشاؤه
□ SESSION_SECRET تم ضبطه
□ wrangler.toml محدّث

Build:
□ npm install نجح
□ npm run build نجح

Deploy:
□ wrangler deploy --dry-run نجح
□ wrangler deploy نجح
□ URL يعمل
□ Login يعمل
□ لا أخطاء في الـ Logs

Post-Deploy:
□ تم اختبار الصفحات الرئيسية
□ تم اختبار APIs
□ تم ضبط Monitoring
```

---

## 🎯 **الخطوة التالية:**

```bash
cd symbolai-worker
./scripts/setup-kv.sh
./scripts/setup-secrets.sh
npm run build
wrangler deploy
```

**رابط Deploy:** سيظهر بعد `wrangler deploy`

---

**🎉 مبروك! نظامك جاهز للإنتاج!**

**يحتوي على:**
- ✅ خطوط عربية احترافية
- ✅ لوجو Jobfit Community
- ✅ Rate Limiting للحماية
- ✅ Branch Validation مع IP tracking
- ✅ نظام Email محسّن
- ✅ RBAC كامل
- ✅ جاهز للـ Production

---

**تاريخ آخر تحديث:** نوفمبر 2025
**الإصدار:** 1.0.0
**الحالة:** Production Ready ✅
