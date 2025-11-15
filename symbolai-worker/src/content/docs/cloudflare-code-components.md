---
title: دليل مكونات الكود - Cloudflare Style Guide
description: دليل استخدام مكونات GitHubCode و CodeBlock المتوافقة مع دليل أنماط Cloudflare
pubDate: 2025-11-15
author: Development Team
tags: ['documentation', 'components', 'cloudflare', 'code']
draft: false
---

# مكونات الكود - متوافقة مع Cloudflare Style Guide

<div dir="rtl">

## نظرة عامة

تم تطوير مكونات عرض الكود في النظام لتتوافق مع [دليل أنماط Cloudflare](https://developers.cloudflare.com/style-guide/components/github-code/) للوثائق التقنية. هذه المكونات توفر طرق احترافية لعرض الكود من GitHub أو من محتوى مباشر.

</div>

---

## 📦 المكونات المتاحة

### 1. GitHubCode Component

مكون لعرض كود من مستودعات GitHub مباشرة في الوثائق.

#### الاستيراد

```typescript
import { GitHubCode } from '~/components';
```

#### الخصائص (Props)

| الخاصية | النوع | مطلوب | الافتراضي | الوصف |
|---------|------|-------|-----------|-------|
| `repo` | string | ✅ | - | اسم المستودع بصيغة `owner/repo` |
| `path` | string | ✅ | - | مسار الملف في المستودع |
| `startLine` | number | ❌ | 1 | رقم السطر الأول |
| `endLine` | number | ❌ | - | رقم السطر الأخير |
| `showLineNumbers` | boolean | ❌ | true | عرض أرقام الأسطر |
| `collapse` | boolean | ❌ | false | إمكانية طي الكود |
| `wrap` | boolean | ❌ | false | التفاف النص |
| `title` | string | ❌ | - | عنوان كتلة الكود |
| `lang` | string | ❌ | auto | لغة البرمجة |

#### أمثلة الاستخدام

##### مثال أساسي

```tsx
<GitHubCode
  repo="llu77/-lmm"
  path="symbolai-worker/src/components/GitHubCode.tsx"
/>
```

##### عرض أسطر محددة

```tsx
<GitHubCode
  repo="cloudflare/cloudflare-docs"
  path="src/components/example.js"
  startLine={10}
  endLine={30}
  title="وظيفة المعالجة الرئيسية"
/>
```

##### مع خيارات العرض

```tsx
<GitHubCode
  repo="llu77/-lmm"
  path="symbolai-worker/astro.config.mjs"
  showLineNumbers={true}
  collapse={true}
  wrap={true}
  title="إعدادات Astro"
/>
```

---

### 2. CodeBlock Component

مكون لعرض كتل الكود المباشرة مع ميزات متقدمة.

#### الاستيراد

```typescript
import { CodeBlock } from '~/components';
```

#### الخصائص (Props)

| الخاصية | النوع | مطلوب | الافتراضي | الوصف |
|---------|------|-------|-----------|-------|
| `children` | ReactNode | ✅ | - | محتوى الكود |
| `lang` | string | ❌ | text | لغة البرمجة |
| `title` | string | ❌ | - | عنوان كتلة الكود |
| `showLineNumbers` | boolean | ❌ | false | عرض أرقام الأسطر |
| `collapse` | boolean | ❌ | false | إمكانية الطي |
| `wrap` | boolean | ❌ | false | التفاف النص |
| `highlight` | number[] | ❌ | [] | أرقام الأسطر المراد تمييزها |

#### أمثلة الاستخدام

##### مثال أساسي

```tsx
<CodeBlock lang="typescript">
  const greeting = "مرحباً بك";
  console.log(greeting);
</CodeBlock>
```

##### مع أرقام الأسطر والتمييز

```tsx
<CodeBlock 
  lang="javascript" 
  showLineNumbers 
  highlight={[2, 3]}
  title="معالج الأحداث"
>
  function handleClick(event) {
    event.preventDefault();
    console.log('تم النقر!');
  }
</CodeBlock>
```

##### كود قابل للطي

```tsx
<CodeBlock 
  lang="typescript" 
  collapse 
  title="تعريفات الأنواع"
>
  interface User {
    id: string;
    name: string;
    email: string;
  }
  
  type UserRole = 'admin' | 'user' | 'guest';
</CodeBlock>
```

---

## 🎨 التصميم والأنماط

### الألوان

المكونات تستخدم نظام الألوان المتوافق مع الوضع الداكن:

- **Light Mode**: خلفية بيضاء مع حدود رمادية فاتحة
- **Dark Mode**: خلفية داكنة مع حدود رمادية داكنة
- **Syntax Highlighting**: يمكن دمجها مع مكتبات مثل Prism.js أو Shiki

### الأيقونات

- أيقونة الكود: تظهر في العنوان
- أيقونة GitHub: رابط إلى المصدر
- الأيقونات متوافقة مع RTL

---

## 📝 معايير تنسيق الكود من Cloudflare

### استخدام الرموز

#### الأقواس الزاوية `< >`
تُستخدم للعناصر التي يجب استبدالها:

```bash
wrangler secret put <SECRET_NAME>
```

#### الأقواس المربعة `[ ]`
تُستخدم للخيارات الاختيارية:

```bash
npx wrangler deploy [OPTIONS]
```

### أوامر Shell

**لا تستخدم** علامة `$` قبل أوامر Shell:

❌ خطأ:
```bash
$ npm install
$ npm run build
```

✅ صحيح:
```bash
npm install
npm run build
```

### استخدام الخط الأحادي (Monospace)

استخدم backticks لـ:
- أسماء الملفات: `package.json`
- أوامر API: `GET /api/users`
- قيم المتغيرات: `NODE_ENV=production`
- أسماء الوظائف: `fetchData()`

---

## 🔧 التكامل مع MDX

### إعداد MDX

إذا كنت تستخدم MDX في Astro، قم بتثبيت التكامل:

```bash
npm install @astrojs/mdx
```

### تحديث astro.config.mjs

```javascript
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
});
```

### استخدام المكونات في MDX

```mdx
---
title: مثال على الوثائق
---

import { GitHubCode, CodeBlock } from '~/components';

# عنوان الصفحة

بعض النص التوضيحي...

<GitHubCode
  repo="llu77/-lmm"
  path="src/example.ts"
  startLine={10}
  endLine={20}
/>

المزيد من النص...

<CodeBlock lang="typescript" showLineNumbers>
  // مثال على الكود
  const example = "Hello";
</CodeBlock>
```

---

## 🌐 دعم RTL والعربية

### النصوص والواجهة

جميع النصوص في المكونات تدعم اللغة العربية:
- رسائل التحميل
- رسائل الخطأ
- أزرار التحكم
- روابط GitHub

### التنسيق

المكونات تستخدم Tailwind CSS utilities للـ RTL:
- `ps-*` / `pe-*` بدلاً من `pl-*` / `pr-*`
- `text-start` / `text-end` بدلاً من `text-left` / `text-right`
- `ms-*` / `me-*` للـ margins

---

## 🎯 حالات الاستخدام

### 1. وثائق API

```tsx
<GitHubCode
  repo="llu77/-lmm"
  path="symbolai-worker/src/pages/api/users.ts"
  title="API Endpoint للمستخدمين"
  showLineNumbers
/>
```

### 2. أمثلة التكوين

```tsx
<CodeBlock 
  lang="json" 
  title="wrangler.toml"
  collapse
>
  {
    "name": "my-worker",
    "main": "src/index.ts",
    "compatibility_date": "2024-01-01"
  }
</CodeBlock>
```

### 3. أمثلة الكود التفاعلية

```tsx
<CodeBlock 
  lang="typescript" 
  showLineNumbers
  highlight={[5, 6, 7]}
  title="مثال على React Hook"
>
  import { useState } from 'react';
  
  function Counter() {
    // هذه الأسطر مميزة
    const [count, setCount] = useState(0);
    const increment = () => setCount(count + 1);
    const decrement = () => setCount(count - 1);
    
    return (
      <div>
        <button onClick={decrement}>-</button>
        <span>{count}</span>
        <button onClick={increment}>+</button>
      </div>
    );
  }
</CodeBlock>
```

---

## 🚀 الأداء والتحسين

### GitHubCode Performance

- **Caching**: يمكن إضافة cache للطلبات المتكررة
- **Rate Limiting**: GitHub API له حدود (60 طلب/ساعة بدون مصادقة)
- **Authentication**: استخدم token للحصول على 5000 طلب/ساعة

### Best Practices

1. **استخدم startLine/endLine**: لا تعرض ملفات كاملة كبيرة
2. **استخدم collapse**: للكود الطويل أو الثانوي
3. **استخدم title**: لتوضيح سياق الكود
4. **استخدم wrap**: للأسطر الطويلة

---

## 🔐 الأمان

### GitHub API

- لا تشارك GitHub tokens في الكود
- استخدم environment variables
- تحقق من الأذونات قبل عرض كود خاص

### XSS Prevention

المكونات تستخدم:
- React's built-in XSS protection
- Safe text rendering
- No `dangerouslySetInnerHTML`

---

## 📚 مراجع إضافية

### Cloudflare Docs
- [GitHubCode Component](https://developers.cloudflare.com/style-guide/components/github-code/)
- [Code Blocks](https://developers.cloudflare.com/style-guide/components/code/)
- [Code Formatting](https://developers.cloudflare.com/style-guide/formatting/code-conventions-and-format/)

### مصادر داخلية
- [نظام التصميم](/docs/design-system)
- [دليل المكونات](/docs/components)
- [دليل Astro 5](/docs/astro-v5-features)

---

## 🎉 خلاصة

المكونات `GitHubCode` و `CodeBlock` توفر:

✅ توافق كامل مع Cloudflare Style Guide  
✅ دعم كامل للغة العربية و RTL  
✅ تصميم responsive و accessible  
✅ ميزات متقدمة (line numbers, highlighting, collapse)  
✅ سهولة الاستخدام في MDX و Astro  

للدعم أو المساعدة، راجع صفحة [الدعم الفني](/system-support).
