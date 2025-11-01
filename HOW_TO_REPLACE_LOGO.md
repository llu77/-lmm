# 🎨 كيفية استبدال اللوجو في Jobfit Community

> دليل سريع وبسيط لاستبدال اللوجو المؤقت بلوجوك الفعلي

---

## 📥 تحميل اللوجو من Google Drive

لديك لوجو على Google Drive؟ اتبع هذه الخطوات:

### الطريقة 1: التحميل المباشر

1. افتح رابط Google Drive:
   ```
   https://drive.google.com/file/d/1a96ceXr7Fvy85MEpnQA0di7SGTMpdTuW/view
   ```

2. انقر على الثلاث نقاط (⋮) في الأعلى
3. اختر "تنزيل" (Download)
4. احفظ الملف على جهازك

### الطريقة 2: استخدام Terminal

```bash
# تثبيت gdown (إذا لم يكن مثبتاً)
pip install gdown

# تحميل اللوجو
gdown https://drive.google.com/uc?id=1a96ceXr7Fvy85MEpnQA0di7SGTMpdTuW
```

---

## 🖼️ تحضير ملفات اللوجو

يحتاج النظام إلى 4 نسخ من اللوجو:

| النوع | الحجم المطلوب | الاستخدام |
|-------|---------------|-----------|
| **Full Logo** | 200x200px أو أكبر | اللوجو الكامل في صفحات المصادقة |
| **Icon** | 120x120px أو أكبر | أيقونة في Navbar والأماكن الصغيرة |
| **Horizontal** | 300x80px | نسخة أفقية للـ Headers |
| **White** | نفس الأحجام | نسخة بيضاء للخلفيات الداكنة |

### أمثلة:

```
✅ logo-full.svg       (200x200)
✅ logo-icon.svg       (120x120)
✅ logo-horizontal.svg (300x80)
✅ logo-white.svg      (أي حجم، لكن بألوان بيضاء)
```

---

## 🔧 خطوات الاستبدال

### الخطوة 1: تحضير الملفات

قم بإنشاء/تحويل اللوجو إلى 4 نسخ:

#### إذا كان لديك ملف واحد فقط:

1. **باستخدام Figma/Adobe Illustrator:**
   - افتح اللوجو
   - صدّر 4 نسخ بالأحجام المطلوبة
   - احفظها كـ SVG أو PNG

2. **باستخدام أدوات أونلاين:**
   - [Canva](https://www.canva.com) - لتغيير الحجم
   - [SVG Converter](https://convertio.co/png-svg/) - لتحويل PNG إلى SVG
   - [Remove Background](https://www.remove.bg) - لإزالة الخلفية

### الخطوة 2: نسخ الملفات

انسخ ملفاتك إلى مجلد `public/assets`:

```bash
# في Terminal/CMD، انتقل إلى مجلد المشروع
cd path/to/-lmm

# انسخ الملفات
cp /path/to/your/logo-full.svg symbolai-worker/public/assets/logo-placeholder.svg
cp /path/to/your/logo-icon.svg symbolai-worker/public/assets/logo-icon.svg
cp /path/to/your/logo-horizontal.svg symbolai-worker/public/assets/logo-horizontal.svg
cp /path/to/your/logo-white.svg symbolai-worker/public/assets/logo-white.svg
```

#### على Windows:

```cmd
copy C:\path\to\your\logo-full.svg symbolai-worker\public\assets\logo-placeholder.svg
copy C:\path\to\your\logo-icon.svg symbolai-worker\public\assets\logo-icon.svg
copy C:\path\to\your\logo-horizontal.svg symbolai-worker\public\assets\logo-horizontal.svg
copy C:\path\to\your\logo-white.svg symbolai-worker\public\assets\logo-white.svg
```

#### باستخدام File Explorer:

1. افتح مجلد: `symbolai-worker/public/assets/`
2. الصق ملفات اللوجو
3. أعد تسميتها:
   - `logo-placeholder.svg`
   - `logo-icon.svg`
   - `logo-horizontal.svg`
   - `logo-white.svg`

---

### الخطوة 3: تحديث معلومات الشركة

افتح ملف `src/lib/brand-constants.ts` وعدّل المعلومات:

```typescript
export const BRAND = {
  // معلومات الشركة
  name: "اسم شركتك",                    // ⬅️ عدّل هنا
  shortName: "اختصار الاسم",             // ⬅️ عدّل هنا
  tagline: "الشعار أو الوصف القصير",    // ⬅️ عدّل هنا
  description: "وصف شامل عن الشركة",     // ⬅️ عدّل هنا

  // معلومات الاتصال
  contact: {
    email: "info@yourcompany.com",       // ⬅️ عدّل هنا
    phone: "+966 XX XXX XXXX",           // ⬅️ عدّل هنا
    website: "https://yourcompany.com",  // ⬅️ عدّل هنا
    support: "support@yourcompany.com"   // ⬅️ عدّل هنا
  },

  // روابط وسائل التواصل
  social: {
    twitter: "https://twitter.com/yourcompany",
    linkedin: "https://linkedin.com/company/yourcompany",
    facebook: "https://facebook.com/yourcompany",
    instagram: "https://instagram.com/yourcompany"
  },

  // اترك الباقي كما هو
  logo: { ... },
  colors: { ... },
  pdf: { ... }
}
```

---

### الخطوة 4: تحديث الألوان (اختياري)

إذا كانت ألوان شركتك مختلفة عن البرتقالي (#FF6B00):

```typescript
// في نفس الملف: src/lib/brand-constants.ts

colors: {
  primary: {
    main: "#YOUR_COLOR",        // ⬅️ اللون الرئيسي
    light: "#YOUR_LIGHT_COLOR", // ⬅️ نسخة فاتحة
    dark: "#YOUR_DARK_COLOR",   // ⬅️ نسخة داكنة
  },
  // ... الباقي
}
```

### الخطوة 5: اختبار التغييرات

```bash
# شغّل السيرفر
npm run dev

# افتح المتصفح
# http://localhost:3000
```

تحقق من الأماكن التالية:
- ✅ Navbar (الأعلى)
- ✅ Footer (الأسفل)
- ✅ صفحة Login
- ✅ Mobile Menu (على الهاتف)

---

## 🚀 Build للإنتاج

بعد التأكد من كل شيء:

```bash
npm run build
```

---

## ❓ الأسئلة الشائعة

### س: اللوجو لا يظهر بعد النسخ؟

**ج:** جرّب هذه الحلول:

1. **امسح الـ Cache:**
   ```bash
   # Ctrl+Shift+R في المتصفح
   # أو
   npm run build
   ```

2. **تحقق من المسار:**
   ```bash
   ls -la symbolai-worker/public/assets/
   # يجب أن ترى الملفات الأربعة
   ```

3. **تحقق من صيغة الملف:**
   - يُفضل SVG
   - إذا كان PNG، تأكد من الشفافية

---

### س: اللوجو يظهر بحجم خاطئ؟

**ج:** الأحجام المقترحة:

```
logo-placeholder.svg  →  200x200px (مربع)
logo-icon.svg        →  120x120px (مربع)
logo-horizontal.svg  →  300x80px  (مستطيل أفقي)
logo-white.svg       →  نفس حجم النسخة الأصلية
```

---

### س: كيف أغير الألوان في كل التطبيق؟

**ج:** عدّل `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#YOUR_COLOR',
          light: '#YOUR_LIGHT',
          dark: '#YOUR_DARK'
        }
      }
    }
  }
}
```

ثم:
```bash
npm run build
```

---

### س: هل يمكن استخدام صورة PNG بدلاً من SVG؟

**ج:** نعم! لكن SVG أفضل لأنه:
- أصغر حجماً
- قابل للتوسع بدون فقدان الجودة
- أسرع في التحميل

إذا استخدمت PNG:
- تأكد من خلفية شفافة
- استخدم دقة عالية (2x على الأقل)

---

### س: كيف أضيف اللوجو لصفحة معينة؟

**ج:** استخدم Logo component:

```tsx
import { Logo } from "@/components/ui/logo";

<Logo variant="icon" size="md" />
```

الـ variants المتاحة:
- `full` - اللوجو الكامل
- `icon` - الأيقونة فقط
- `horizontal` - نسخة أفقية
- `white` - نسخة بيضاء

---

## 📞 الدعم

إذا واجهت مشاكل:

1. راجع التوثيق الكامل: `LOGO_SYSTEM_DOCUMENTATION.md`
2. تحقق من console في المتصفح (F12)
3. تواصل مع فريق التطوير

---

## ✅ Checklist سريع

قبل الانتهاء، تأكد من:

- [ ] نسخت 4 ملفات اللوجو
- [ ] عدّلت معلومات الشركة في `brand-constants.ts`
- [ ] عدّلت الألوان (إذا لزم)
- [ ] اختبرت على Desktop و Mobile
- [ ] اختبرت في أوضاع Light/Dark (إذا كان موجوداً)
- [ ] شغّلت `npm run build` بنجاح

---

**🎉 تهانينا! الآن لديك نظام لوجو احترافي كامل!**

---

**آخر تحديث:** يناير 2024
**الإصدار:** 1.0.0
