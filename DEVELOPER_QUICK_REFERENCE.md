# دليل المطور السريع - LMM Financial System
# Developer Quick Reference Guide

## 🚀 البدء السريع / Quick Start

```bash
# تثبيت التبعيات
npm install

# فحص الأنواع
npm run type-check

# البناء
npm run build

# التطوير (Dev mode)
npm run dev
```

---

## 📂 هيكل المشروع / Project Structure

```
lmm/
├── src/
│   ├── pages/              # 15 صفحة
│   │   ├── revenues/       # ✅ منطق حسابات صحيح
│   │   ├── bonus/          # ✅ بونص أسبوعي
│   │   ├── payroll/        # ✅ كشف رواتب
│   │   ├── expenses/       # ✅ مصروفات
│   │   └── ...
│   │
│   ├── components/
│   │   └── ui/            # 65+ مكون
│   │
│   ├── lib/
│   │   ├── api-client.ts  # ✅ جاهز
│   │   ├── pdf-export.ts  # ✅ 1545 سطر
│   │   └── utils.ts
│   │
│   └── ...
│
├── symbolai-worker/        # Astro + Cloudflare
│   ├── src/
│   │   ├── pages/
│   │   │   └── api/       # ⚠️ يحتاج إنشاء APIs
│   │   ├── workflows/     # ✅ موجودة
│   │   └── theme/         # ✅ نظام تصميم
│   │
│   └── ...
│
└── cloudflare-worker/      # Worker بسيط
```

---

## 💰 صيغ الحسابات / Calculation Formulas

### الإيرادات (Revenues)
```typescript
// المجموع
total = cash + network

// شروط المطابقة
isMatched = (total === (cash + network)) && (budget === network)

// التحقق من الموظفين
employeesTotal === calculatedTotal  // يجب أن يتطابق
```

### الرواتب (Payroll)
```typescript
// الإجمالي
grossSalary = baseSalary + supervisorAllowance + incentives

// الصافي
netSalary = grossSalary - totalAdvances - totalDeductions
```

### البونص (Bonus)
```typescript
// الأهلية
isEligible = totalRevenue >= THRESHOLD

// مبلغ البونص
bonusAmount = isEligible ? (totalRevenue * PERCENTAGE) : 0

// الاعتماد
canApprove = isFirstDayOfWeek() && !isAlreadyApproved
```

---

## 🎨 نظام الألوان / Color System

```typescript
Primary (Cyan):   #06b6d4
Secondary (Pink): #ec4899
Success (Green):  #22c55e
Warning (Orange): #f97316
Danger (Rose):    #f43f5e
Error (Red):      #ef4444
Info (LightBlue): #0ea5e9
```

---

## 📄 دوال PDF / PDF Functions

```typescript
import {
  generateRevenuesPDF,
  printRevenuesPDF,
  generateExpensesPDF,
  printExpensesPDF,
  generateProductOrderPDF,
  printProductOrderPDF,
  generatePayrollPDF,
  printPayrollPDF,
} from '@/lib/pdf-export';

// مثال: تصدير تقرير إيرادات
await generateRevenuesPDF(
  revenueData,
  branchName,
  startDate,
  endDate,
  { companyName: 'شركتي' }
);
```

---

## 🔌 API Client Usage

```typescript
import { apiClient } from '@/lib/api-client';

// GET request
const response = await apiClient.get('/api/revenues/list');

// POST request
await apiClient.post('/api/revenues/create', {
  date: Date.now(),
  cash: 5000,
  network: 3000,
  branchId: '1010'
});

// DELETE request
await apiClient.delete('/api/revenues/remove');
```

---

## 🔐 المصادقة / Authentication

```typescript
import { Authenticated, Unauthenticated, AuthLoading } from '@/hooks/use-auth';

<Authenticated>
  {/* محتوى للمستخدمين المصادق عليهم */}
</Authenticated>

<Unauthenticated>
  <SignInButton />
</Unauthenticated>

<AuthLoading>
  <Skeleton className="h-32 w-full" />
</AuthLoading>
```

---

## 🏢 إدارة الفروع / Branch Management

```typescript
import { useBranch } from '@/hooks/use-branch';

const { branchId, branchName, selectBranch } = useBranch();

// اختيار فرع
selectBranch({ id: '1010', name: 'لبن' });

// الموظفون حسب الفرع
const BRANCH_EMPLOYEES = {
  '1010': ['عبدالحي جلال', 'محمود عمارة', ...],
  '2020': ['محمد إسماعيل', 'محمد ناصر', ...],
};
```

---

## 🎯 مكونات UI الأساسية / Essential UI Components

```tsx
// Buttons
<Button variant="default | outline | ghost | destructive">
  حفظ
</Button>

// Cards
<Card>
  <CardHeader>
    <CardTitle>العنوان</CardTitle>
  </CardHeader>
  <CardContent>المحتوى</CardContent>
</Card>

// Forms
<Input type="text" placeholder="أدخل النص" />
<Textarea placeholder="ملاحظات" />
<Select>
  <SelectTrigger>
    <SelectValue placeholder="اختر" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">خيار 1</SelectItem>
  </SelectContent>
</Select>

// Tables
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>العمود 1</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>القيمة 1</TableCell>
    </TableRow>
  </TableBody>
</Table>

// Dialogs
<Dialog>
  <DialogTrigger asChild>
    <Button>فتح</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>العنوان</DialogTitle>
    </DialogHeader>
    المحتوى
  </DialogContent>
</Dialog>

// Toasts
import { toast } from 'sonner';

toast.success('تم الحفظ بنجاح');
toast.error('حدث خطأ');
toast.loading('جاري التحميل...');
```

---

## 📊 عرض البيانات / Data Display

```tsx
// Skeleton Loading
{isLoading ? (
  <Skeleton className="h-32 w-full" />
) : (
  <DataDisplay data={data} />
)}

// Empty State
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <Icon />
    </EmptyMedia>
    <EmptyTitle>لا توجد بيانات</EmptyTitle>
    <EmptyDescription>يرجى إضافة بيانات جديدة</EmptyDescription>
  </EmptyHeader>
</Empty>
```

---

## 🌍 RTL Support

```tsx
// Tailwind RTL utilities
className="ps-4"    // padding-inline-start (→ padding-right في RTL)
className="pe-4"    // padding-inline-end (→ padding-left في RTL)
className="ms-4"    // margin-inline-start
className="me-4"    // margin-inline-end
className="text-start"  // text-align: right في RTL
```

---

## ⚠️ Backend APIs المطلوبة / Required Backend APIs

```typescript
// Revenues
POST /api/revenues/create
GET  /api/revenues/list
POST /api/revenues/remove
GET  /api/revenues/stats

// Bonus
GET  /api/bonus/current-week
POST /api/bonus/approve
GET  /api/bonus/records

// Payroll
POST /api/payroll/generate
GET  /api/payroll/list
POST /api/payroll/delete

// Expenses
POST /api/expenses/create
GET  /api/expenses/list
POST /api/expenses/delete

// Employees
POST /api/employees/create
GET  /api/employees/list
PUT  /api/employees/update
POST /api/employees/delete

// PDF Generation
POST /api/pdf/generate-revenue-report
POST /api/pdf/generate-payroll
POST /api/pdf/generate-order

// AI & Integrations
POST /api/ai/validate-revenue
POST /api/zapier/webhook
```

---

## 🔧 معالجة الأخطاء / Error Handling

```typescript
try {
  await apiClient.post('/api/revenues/create', data);
  toast.success('تم الحفظ بنجاح');
} catch (error) {
  const errorMessage = error instanceof Error 
    ? error.message 
    : 'حدث خطأ غير متوقع';
  toast.error(errorMessage, { duration: 6000 });
  console.error('Error:', error);
}
```

---

## 📝 التحقق من البيانات / Data Validation

```typescript
// Revenue validation example
if (!cash || !network) {
  toast.error('يرجى إدخال الكاش والشبكة');
  return;
}

if (!isMatched && !mismatchReason.trim()) {
  toast.error('يرجى إدخال سبب عدم المطابقة');
  return;
}

// Employee revenue validation
const employeesTotal = employees.reduce((sum, emp) => sum + emp.revenue, 0);
const calculatedTotal = cashNum + networkNum;

if (employeesTotal !== calculatedTotal) {
  toast.error(`خطأ: مجموع إيرادات الموظفين ${employeesTotal} لا يساوي المجموع الإجمالي ${calculatedTotal}`);
  return;
}
```

---

## 🎨 Styling Best Practices

```tsx
// استخدم Tailwind classes
<div className="flex items-center justify-between gap-4 p-6">
  <h1 className="text-2xl font-bold">العنوان</h1>
</div>

// استخدم CSS variables للألوان
<div className="bg-primary-500 text-white">
  محتوى
</div>

// Dark mode support
<div className="bg-white dark:bg-gray-800">
  يدعم الوضع الداكن
</div>
```

---

## 🔍 Debugging Tips

```typescript
// استخدم console.log بشكل فعال
console.log('Data:', { cash, network, total, isMatched });

// استخدم Chrome DevTools
// Network tab: فحص API calls
// Console tab: فحص logs
// React DevTools: فحص state & props

// استخدم TypeScript للكشف المبكر عن الأخطاء
npm run type-check
```

---

## 📦 Dependencies الرئيسية / Main Dependencies

```json
{
  "react": "^18.3.1",
  "react-router-dom": "^7.9.5",
  "convex": "^1.29.0",
  "@radix-ui/react-*": "Various",
  "jspdf": "PDF generation",
  "date-fns": "Date utilities",
  "sonner": "Toast notifications"
}
```

---

## 🚨 أخطاء شائعة / Common Errors

### 1. API not implemented
```
Error: حدث خطأ في الاتصال بالخادم
السبب: Backend API غير منشأ
الحل: إنشاء API endpoint في Cloudflare Worker
```

### 2. Type errors
```
Error: Type 'undefined' is not assignable to type 'string'
السبب: missing null check
الحل: استخدم optional chaining (?.) أو null coalescing (??)
```

### 3. RTL layout issues
```
Issue: النص يظهر معكوس
الحل: استخدم ps/pe/ms/me بدلاً من pl/pr/ml/mr
```

---

## 📚 موارد إضافية / Additional Resources

- **README.md** - نظرة عامة
- **DESIGN_SYSTEM.md** - نظام التصميم
- **COMPREHENSIVE_SYSTEM_AUDIT_AR.md** - تقرير الفحص العميق
- **SYSTEM_VERIFICATION_CHECKLIST.md** - قائمة التحقق
- **LMM_SYSTEM_SPECIFICATION.json** - المواصفات التفصيلية

---

## 🤝 المساهمة / Contributing

1. Fork المشروع
2. أنشئ feature branch: `git checkout -b feature/amazing-feature`
3. Commit التغييرات: `git commit -m 'Add amazing feature'`
4. Push للفرع: `git push origin feature/amazing-feature`
5. افتح Pull Request

---

## 📞 الدعم / Support

- **Documentation:** راجع الملفات في الجذر
- **Issues:** افتح issue في GitHub
- **Email:** support@lmm.com

---

**آخر تحديث:** 2025-11-13  
**الإصدار:** 2.0.0  
**الحالة:** ✅ Production Ready (بعد إنشاء Backend APIs)
