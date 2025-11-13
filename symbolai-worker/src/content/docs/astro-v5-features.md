---
title: ميزات Astro 5.x الجديدة
description: نظرة على التحديثات والميزات الجديدة في Astro 5.0
pubDate: 2024-11-13
updatedDate: 2024-11-13
author: Development Team
tags: ['astro', 'updates', 'technical']
draft: false
---

# ميزات Astro 5.x الجديدة

Astro 5.x يقدم تحسينات كبيرة في الأداء وتجربة المطور.

## التحديثات الرئيسية

### 1. Content Layer API
- محمل `glob()` الجديد للمحتوى القائم على الملفات
- أداء محسّن للمحتوى الكبير
- دعم أفضل للأنواع (Types)

```typescript
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
  }),
});
```

### 2. ClientRouter للانتقالات
- استخدام `<ClientRouter />` بدلاً من `<ViewTransitions />`
- تجربة تنقل أكثر سلاسة
- دعم أفضل للحالة المستمرة

```astro
---
import { ClientRouter } from 'astro:transitions';
---
<head>
  <ClientRouter />
</head>
```

### 3. توليد الأنواع التلقائي
- الأنواع تُولّد تلقائياً في `.astro/types.d.ts`
- تشغيل `astro sync` لتحديث التعريفات
- دعم أفضل لـ TypeScript

### 4. تكامل محسّن مع Cloudflare
- دعم أفضل لـ Workers وD1
- تكامل محسّن مع KV وR2
- أداء أفضل على الحافة (Edge)

## الترحيل

راجع [دليل الترحيل](/docs/migration-guide) للتفاصيل الكاملة.
