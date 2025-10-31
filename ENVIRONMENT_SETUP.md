# دليل إعداد متغيرات البيئة
## Environment Variables Setup Guide

هذا الدليل يشرح كيفية إعداد متغيرات البيئة للمشروع في جميع البيئات.

> ✨ **تحديث:** تم تبسيط نظام المصادقة! لم تعد هناك حاجة لكلمات مرور محلية - يستخدم التطبيق الآن Convex Anonymous Auth فقط للدخول السريع والآمن.

---

## 📋 جدول المحتويات

1. [الفرق بين متغيرات Frontend و Backend](#الفرق-بين-متغيرات-frontend-و-backend)
2. [إعداد التطوير المحلي (Local Development)](#إعداد-التطوير-المحلي)
3. [إعداد Convex Backend](#إعداد-convex-backend)
4. [إعداد Cloudflare Pages (Frontend)](#إعداد-cloudflare-pages)
5. [المتغيرات المطلوبة](#المتغيرات-المطلوبة)

---

## الفرق بين متغيرات Frontend و Backend

### Frontend (React/Vite)
- تستخدم في الواجهة الأمامية (المتصفح)
- **يجب** أن تبدأ بـ `VITE_`
- يتم الوصول إليها عبر `import.meta.env.VITE_KEY`
- مثال: `VITE_CONVEX_URL`, `VITE_EMPLOYEES_PASSWORD`

### Backend (Convex)
- تستخدم في دوال Convex على السيرفر
- **لا تبدأ** بـ `VITE_`
- يتم الوصول إليها عبر `process.env.KEY`
- مثال: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`

---

## إعداد التطوير المحلي

### 1. إنشاء ملف `.env`

```bash
# انسخ ملف المثال
cp .env.example .env
```

### 2. تعديل ملف `.env`

افتح ملف `.env` وعدّل القيم:

```env
# Frontend Variables
VITE_CONVEX_URL=https://careful-clownfish-771.convex.cloud
VITE_APP_URL=http://localhost:5173

# Backend Variables (تضاف في Convex Dashboard)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
RESEND_API_KEY=re_your-key-here
APP_URL=https://1868c429.lkm-3fu.pages.dev
SUPERVISOR_EMAIL_1010=supervisor1@company.com
SUPERVISOR_EMAIL_2020=supervisor2@company.com
```

### 3. تشغيل التطوير المحلي

```bash
# تشغيل Convex في الخلفية
npx convex dev

# في terminal آخر، شغل الواجهة الأمامية
npm run dev
```

---

## إعداد Convex Backend

### الخطوات:

1. اذهب إلى [Convex Dashboard](https://dashboard.convex.dev/)
2. افتح مشروعك: `default-project-9205c`
3. اذهب إلى **Settings** → **Environment Variables**
4. أضف المتغيرات التالية:

#### المتغيرات المطلوبة:

| المتغير | الوصف | مثال |
|---------|-------|------|
| `ANTHROPIC_API_KEY` | مفتاح Anthropic Claude API | `sk-ant-api03-...` |
| `RESEND_API_KEY` | مفتاح Resend لإرسال البريد | `re_...` |
| `APP_URL` | رابط التطبيق (يستخدم في البريد الإلكتروني) | `https://1868c429.lkm-3fu.pages.dev` |
| `SUPERVISOR_EMAIL_1010` | إيميل مشرف فرع لبن | `supervisor1@company.com` |
| `SUPERVISOR_EMAIL_2020` | إيميل مشرف فرع طويق | `supervisor2@company.com` |
| `DEFAULT_SUPERVISOR_EMAIL` | إيميل المشرف الافتراضي | `admin@company.com` |

#### المتغيرات الاختيارية:

| المتغير | الوصف | متى تحتاجه |
|---------|-------|------------|
| `PDFCO_API_KEY` | مفتاح PDF.co API | إذا كنت تستخدم PDF.co |
| `ZAPIER_WEBHOOK_URL` | رابط Zapier Webhook | للتكامل مع Zapier |
| `DEFAULT_ZAPIER_WEBHOOK_URL` | رابط Zapier الافتراضي | للتكامل مع Zapier |

### ملاحظات مهمة:

⚠️ **لا تضع متغيرات `VITE_*` في Convex Dashboard** - هذه متغيرات Frontend فقط!

✅ **بعد إضافة المتغيرات:**
```bash
# أعد نشر Backend
npx convex deploy
```

---

## إعداد Cloudflare Pages

### الخطوات:

1. اذهب إلى [Cloudflare Pages Dashboard](https://dash.cloudflare.com/)
2. افتح مشروعك: `lkm`
3. اذهب إلى **Settings** → **Environment Variables**
4. اختر **Production** أو **Preview** حسب البيئة

#### المتغيرات المطلوبة:

| المتغير | القيمة | الوصف |
|---------|--------|-------|
| `VITE_CONVEX_URL` | `https://careful-clownfish-771.convex.cloud` | رابط Convex deployment |
| `VITE_APP_URL` | `https://1868c429.lkm-3fu.pages.dev` | رابط التطبيق |

### ملاحظات مهمة:

⚠️ **لا تضع متغيرات Backend (مثل `ANTHROPIC_API_KEY`) في Cloudflare Pages** - هذه للـ Backend فقط!

✅ **بعد إضافة المتغيرات:**
- اضغط **Retry deployment** أو
- قم بـ push جديد إلى GitHub

---

## المتغيرات المطلوبة

### ✅ للتطوير المحلي (Local):

```env
# ملف .env في جذر المشروع
VITE_CONVEX_URL=https://careful-clownfish-771.convex.cloud
VITE_APP_URL=http://localhost:5173
```

### ✅ لـ Convex Backend:

إضافة في **Convex Dashboard** → **Settings** → **Environment Variables**:

```
ANTHROPIC_API_KEY=sk-ant-api03-...
RESEND_API_KEY=re_...
SUPERVISOR_EMAIL_1010=email@company.com
SUPERVISOR_EMAIL_2020=email@company.com
DEFAULT_SUPERVISOR_EMAIL=admin@company.com
```

### ✅ لـ Cloudflare Pages:

إضافة في **Cloudflare Pages** → **Settings** → **Environment Variables**:

```
VITE_CONVEX_URL=https://careful-clownfish-771.convex.cloud
VITE_APP_URL=https://1868c429.lkm-3fu.pages.dev
```

---

## 🔐 نصائح أمنية

1. **لا تشارك ملف `.env`** أبدًا على GitHub
2. **احمِ مفاتيح API** (ANTHROPIC_API_KEY, RESEND_API_KEY) ولا تشاركها
3. **راجع المتغيرات بانتظام** وأزل ما لا تحتاجه
4. **قم بتدوير المفاتيح (rotate)** بشكل دوري
5. **المصادقة الآن عبر Convex Auth فقط** - لا حاجة لكلمات مرور محلية

---

## 🚀 أوامر سريعة

```bash
# تطوير محلي
npx convex dev          # تشغيل Convex
npm run dev             # تشغيل Frontend

# نشر للإنتاج
npx convex deploy       # نشر Backend
git push origin main    # نشر Frontend (Cloudflare تلقائياً)

# التحقق من المتغيرات
npx convex env list     # عرض متغيرات Convex
```

---

## ❓ استكشاف الأخطاء

### مشكلة: "VITE_CONVEX_URL is not defined"
**الحل**: تأكد من إضافة المتغير في Cloudflare Pages

### مشكلة: "ANTHROPIC_API_KEY is undefined"
**الحل**: أضف المفتاح في Convex Dashboard → Environment Variables

### مشكلة: لا يعمل البريد الإلكتروني
**الحل**: تحقق من `RESEND_API_KEY` في Convex Dashboard

### مشكلة: الواجهة لا تتصل بـ Backend
**الحل**: تحقق من `VITE_CONVEX_URL` - يجب أن يطابق deployment URL الخاص بك

---

## 📚 مصادر إضافية

- [Convex Environment Variables Docs](https://docs.convex.dev/production/environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)

---

**آخر تحديث:** 2025-10-27
