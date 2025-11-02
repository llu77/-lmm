# 🔄 دليل ترحيل Convex إلى Cloudflare Auth

## ✅ ما تم إنجازه:

### 1. نظام المصادقة الجديد:
- ✅ **API Client** (`src/lib/api-client.ts`) - للتواصل مع الباك إند
- ✅ **Auth Hooks** (`src/hooks/use-auth.tsx`) - useAuth, AuthProvider, Authenticated, Unauthenticated, AuthLoading
- ✅ **Branch Hook** (`src/hooks/use-branch.ts`) - useBranch
- ✅ **DefaultProviders** (`src/components/providers/default.tsx`) - Provider رئيسي

### 2. Auth Endpoints الموجودة في الباك إند:
- ✅ `/api/auth/login` - تسجيل دخول
- ✅ `/api/auth/session` - التحقق من الجلسة
- ✅ `/api/auth/logout` - تسجيل خروج
- ✅ قاعدة بيانات D1 + KV Sessions (Cloudflare)

---

## ⚠️ المطلوب: استبدال Convex في 17 صفحة

### خطوات الاستبدال لكل صفحة:

#### **الخطوة 1: تحديث الاستيرادات**

**قبل:**
```typescript
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
```

**بعد:**
```typescript
import { Authenticated, Unauthenticated, AuthLoading } from "@/hooks/use-auth";
// حذف useQuery, useMutation, useAction
// حذف api import
```

#### **الخطوة 2: استبدال useQuery**

**قبل:**
```typescript
const stats = useQuery(api.dashboard.getStats);
```

**بعد - الحل المؤقت:**
```typescript
const [stats, setStats] = useState<DashboardStats | undefined>(undefined);

useEffect(() => {
  // سيتم إنشاء API endpoint لاحقاً
  // fetch('/api/dashboard/stats')
  //   .then(res => res.json())
  //   .then(data => setStats(data));
}, []);
```

**أو استخدام React Query:**
```typescript
import { useQuery } from '@tanstack/react-query';

const { data: stats } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: () => apiClient.get('/dashboard/stats')
});
```

#### **الخطوة 3: استبدال useMutation**

**قبل:**
```typescript
const createRevenue = useMutation(api.revenues.create);
await createRevenue({ ... });
```

**بعد:**
```typescript
import { apiClient } from '@/lib/api-client';

async function handleSubmit() {
  await apiClient.post('/revenues/create', { ... });
}
```

#### **الخطوة 4: استبدال useAuth**

**قبل:**
```typescript
import { useAuth } from "@/hooks/use-auth.ts"; // Convex version
const { signoutRedirect } = useAuth();
```

**بعد:**
```typescript
import { useAuth } from "@/hooks/use-auth"; // New Cloudflare version
const { signoutRedirect } = useAuth(); // نفس ال API!
```

---

## 📋 قائمة الصفحات التي تحتاج ترقية:

- [ ] `/src/pages/dashboard/page.tsx`
- [ ] `/src/pages/revenues/page.tsx`
- [ ] `/src/pages/expenses/page.tsx`
- [ ] `/src/pages/bonus/page.tsx`
- [ ] `/src/pages/employees/page.tsx`
- [ ] `/src/pages/payroll/page.tsx`
- [ ] `/src/pages/advances-deductions/page.tsx`
- [ ] `/src/pages/product-orders/page.tsx`
- [ ] `/src/pages/employee-requests/page.tsx`
- [ ] `/src/pages/my-requests/page.tsx`
- [ ] `/src/pages/manage-requests/page.tsx`
- [ ] `/src/pages/ai-assistant/page.tsx`
- [ ] `/src/pages/system-support/page.tsx`
- [ ] `/src/pages/backups/page.tsx`
- [ ] `/src/components/navbar.tsx`
- [ ] `/src/components/providers/update-current-user.tsx`

---

## 🔧 نصائح للترقية:

### 1. استخدام Find & Replace:

```bash
# استبدال الاستيرادات
find src -name "*.tsx" -exec sed -i 's/from "convex\/react"/from "@\/hooks\/use-auth"/g' {} +

# حذف api imports
find src -name "*.tsx" -exec sed -i '/from "@\/convex\/_generated\/api.js"/d' {} +
```

### 2. تثبيت React Query (اختياري لكن مُوصى به):

```bash
npm install @tanstack/react-query
```

### 3. إنشاء API Endpoints في الباك إند:

يجب إنشاء endpoints جديدة في `symbolai-worker/src/pages/api/`:
- `/api/dashboard/stats`
- `/api/dashboard/chart-data`
- `/api/revenues/list`
- `/api/revenues/create`
- إلخ...

---

## 🎯 الخلاصة:

1. ✅ **نظام المصادقة جاهز** - Auth hooks و API client جاهزة
2. ⚠️ **البيانات تحتاج عمل** - useQuery يجب استبدالها بـ fetch أو React Query
3. ⚠️ **17 صفحة تحتاج تحديث** - استبدال Convex imports

### الأولوية:
1. إصلاح المصادقة في جميع الصفحات (سهل - استبدال imports)
2. إنشاء API endpoints في الباك إند (متوسط)
3. استبدال useQuery بـ fetch/React Query (متوسط)

---

## 📞 للمساعدة:

إذا كنت تريد مني إكمال الترقية، أخبرني وسأقوم بـ:
- [ ] استبدال Convex في جميع ال 17 صفحة
- [ ] إنشاء API endpoints في الباك إند
- [ ] استخدام React Query للبيانات
- [ ] اختبار البناء والتأكد من عمل كل شيء

**الوقت المتوقع**: 2-3 ساعات عمل

