# نظام LMM للإدارة المالية

[![Dependency review](https://github.com/llu77/-lmm/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/llu77/-lmm/actions/workflows/dependency-review.yml)

<div dir="rtl">

## 📋 نظرة عامة

نظام إدارة مالية شامل مبني بتقنيات حديثة مع دعم كامل للغة العربية واتجاه RTL. يشمل النظام إدارة الرواتب، المصروفات، الإيرادات، طلبات الموظفين، ومساعد ذكي مدعوم بالـ AI.

</div>

---

## 🚀 المميزات الرئيسية

### 💰 الإدارة المالية
- **الإيرادات**: تتبع الدخل بطرق دفع متعددة (نقدي/شبكة)
- **المصروفات**: تصنيف المصروفات مع 11 فئة مختلفة
- **المكافآت**: نظام مكافآت الموظفين
- **كشوف الرواتب**: توليد كشوف الرواتب الشهرية تلقائياً

### 👥 إدارة الموظفين
- إنشاء وتعديل بيانات الموظفين
- السلف والخصومات
- حساب الرواتب الصافية
- تتبع الحضور والغياب

### 📦 نظام الطلبات
- طلبات المنتجات مع كتالوج 50+ منتج
- طلبات الموظفين المخصصة
- سير عمل الموافقات
- تتبع حالة الطلبات

### 🤖 المساعد الذكي
- التحقق من البيانات بذكاء اصطناعي
- اكتشاف الأنماط
- توليد المحتوى
- إنشاء قوالب البريد الإلكتروني

### 🎨 نظام التصميم
- مبني على **NativeBase v3.4**
- 200+ لون مع 10 تدرجات لكل لون
- دعم كامل للوضع الداكن
- متوافق مع WCAG 3.0 APCA

---

## 🛠 التقنيات المستخدمة




### PDF Generation
- **jsPDF** - PDF creation
- **jspdf-autotable** - Table generation

### Date Handling
- **date-fns** - Date utilities with Arabic locale

---

## 📁 هيكل المشروع

```
lmm/
├── src/
│   ├── pages/              # Page components (15 routes)
│   │   ├── Index.tsx       # Landing page
│   │   ├── dashboard/      # Dashboard
│   │   ├── revenues/       # Revenue management
│   │   ├── expenses/       # Expense tracking
│   │   ├── employees/      # Employee management
│   │   ├── payroll/        # Payroll system
│   │   └── ...
│   │
│   ├── components/
│   │   ├── ui/            # 65+ reusable UI components
│   │   ├── navbar.tsx     # Main navigation
│   │   ├── branch-selector.tsx
│   │   └── error-boundary.tsx
│   │
│   ├── lib/
│   │   ├── utils.ts       # Utility functions
│   │   └── pdf-export.ts  # PDF generation
│   │
│   ├── convex/
│   │   └── _generated/    # Auto-generated Convex API
│   │
│   ├── App.tsx            # Main router
│   └── main.tsx           # Entry point
│
├── symbolai-worker/        # Astro/Cloudflare Workers
│   └── src/
│       ├── theme/         # Design tokens
│       │   ├── colors.ts
│       │   ├── typography.ts
│       │   ├── spacing.ts
│       │   └── index.ts
│       └── styles/
│           └── globals.css
│
├── DESIGN_SYSTEM.md                    # Design system docs
├── FIGMA_UNLIMITED_IMPLEMENTATION.md   # Implementation guide
├── LMM_SYSTEM_SPECIFICATION.json       # Complete system spec
└── README.md                           # This file
```

---

## 🎨 نظام التصميم

### الألوان الرئيسية

```css
Primary (Cyan):   #06b6d4
Secondary (Pink): #ec4899
Success (Green):  #22c55e
Warning (Orange): #f97316
Danger (Rose):    #f43f5e
Error (Red):      #ef4444
Info (LightBlue): #0ea5e9
```

### أحجام الخطوط

```
2xs: 10px → 9xl: 128px
14 حجم متدرج مع line heights محسّنة
```

### Spacing

```
Scale: 4px base
Range: px (1px) → 96 (384px)
```

### Border Radius

```
xs: 2px → 3xl: 24px + full (circular)
```

راجع [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) للتفاصيل الكاملة.

---

## 📱 الصفحات والمسارات

| المسار | الوصف | الأيقونة |
|--------|-------|----------|
| `/` | الصفحة الرئيسية | - |
| `/dashboard` | لوحة التحكم | LayoutDashboard |
| `/revenues` | الإيرادات | TrendingUp |
| `/expenses` | المصروفات | TrendingDown |
| `/bonus` | المكافآت | Gift |
| `/employees` | إدارة الموظفين | Users |
| `/advances-deductions` | السلف والخصومات | Wallet |
| `/payroll` | كشف الرواتب | FileText |
| `/product-orders` | طلبات المنتجات | Package |
| `/employee-requests` | طلبات الموظفين | ClipboardList |
| `/my-requests` | طلباتي | FileCheck |
| `/manage-requests` | إدارة الطلبات | Settings |
| `/ai-assistant` | المساعد الذكي | Bot |
| `/system-support` | الدعم الفني | HelpCircle |
| `/backups` | النسخ الاحتياطي | Database |

---

## 🧩 المكونات الرئيسية

### UI Components (65+)

#### Form Inputs
- Input, Textarea, Select, Checkbox, RadioGroup
- Switch, Slider, Calendar, InputOTP

#### Buttons
- Button (6 variants), ButtonGroup
- Toggle, ToggleGroup

#### Data Display
- Table, Card, Badge, Avatar
- Empty, Skeleton

#### Overlays
- Dialog, AlertDialog, Drawer, Sheet
- Popover, HoverCard, Tooltip

#### Navigation
- Tabs, Accordion, Breadcrumb
- NavigationMenu, Sidebar, Pagination

#### Feedback
- Alert, Toast, Spinner
- Progress, ErrorState

#### Utilities
- Separator, ScrollArea, Resizable
- AspectRatio, Carousel, Command
- Kbd, Chart

### Layout Components
- **Navbar**: Navigation with RTL support
- **BranchSelector**: Multi-branch with security lock
- **ErrorBoundary**: Error handling

---

## 🔐 المصادقة والأمان



### Branch Security
- Lock mechanism after failed attempts:
  - 3 attempts → 1 hour lock
  - 5 attempts → 24 hour lock
- LocalStorage persistence

---

## 🌍 دعم RTL والعربية

### Tailwind RTL Utilities
```tsx
ps-4    // padding-inline-start
pe-4    // padding-inline-end
ms-4    // margin-inline-start
me-4    // margin-inline-end
text-start  // text-align: right in RTL
```

### خطوط عربية محسّنة
```css
font-family: -apple-system, BlinkMacSystemFont,
             'Segoe UI', Roboto, 'Noto Sans Arabic',
             'Helvetica Neue', Arial, sans-serif;
```

---

## 📊 إدارة الحالة

### Data Fetching (Convex)
```tsx
// Real-time queries
const revenues = useQuery(api.revenues.list, params);

// Mutations
const createRevenue = useMutation(api.revenues.create);

// Actions
const generatePayroll = useAction(api.payroll.generate);
```

### Forms (React Hook Form)
```tsx
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: {...}
});
```

### Authentication
```tsx
<Authenticated>
  {/* Protected content */}
</Authenticated>

<Unauthenticated>
  <SignInButton />
</Unauthenticated>
```

---

## 📄 تصدير PDF

### المستندات المدعومة
- كشوف الرواتب
- تقارير الإيرادات
- تقارير المصروفات
- طلبات المنتجات
- قوائم الموظفين

### الاستخدام
```tsx
import { exportToPDF } from '@/lib/pdf-export';

exportToPDF({
  type: 'payroll',
  data: payrollData,
  filename: 'payroll-2025-11.pdf'
});
```

---

## 🎯 أمثلة على الاستخدام

### إنشاء إيراد جديد
```tsx
const createRevenue = useMutation(api.revenues.create);

await createRevenue({
  amount: 1000,
  paymentMethod: "نقدي",
  description: "بيع منتج",
  date: new Date(),
  branchId: selectedBranch
});
```

### عرض جدول بيانات
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>التاريخ</TableHead>
      <TableHead>المبلغ</TableHead>
      <TableHead>الإجراءات</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {revenues?.map((revenue) => (
      <TableRow key={revenue._id}>
        <TableCell>{format(revenue.date, 'd MMM yyyy', {locale: ar})}</TableCell>
        <TableCell>{revenue.amount}</TableCell>
        <TableCell>
          <Button onClick={() => handleEdit(revenue)}>تعديل</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### استخدام نظام الألوان
```tsx
// Primary button
<Button className="bg-primary-500 hover:bg-primary-600">
  حفظ
</Button>

// Success alert
<Alert className="bg-success-50 text-success-900 border-success-500">
  تم الحفظ بنجاح
</Alert>

// Danger badge
<Badge className="bg-danger-500 text-white">
  محذوف
</Badge>
```

---

## 🧪 الاختبار

### موصى به
- **Unit Tests**: Vitest or Jest
- **Integration Tests**: React Testing Library
- **E2E Tests**: Playwright or Cypress
- **Visual Regression**: Chromatic

### Test Cases
- Component rendering
- Form validation
- API integration
- Authentication flow
- Navigation
- Responsive design
- RTL layout
- Accessibility

---

## 🚀 التطوير المستقبلي

### قصير المدى
- [ ] Storybook للمكونات
- [ ] Unit & Integration tests
- [ ] تحسينات الأداء
- [ ] تحسينات UX

### متوسط المدى
- [ ] تطبيق موبايل (React Native)
- [ ] دعم Offline
- [ ] إشعارات Email/SMS
- [ ] نظام صلاحيات متقدم (RBAC)

### طويل المدى
- [ ] تحليلات متقدمة
- [ ] تعدد اللغات (عربي + إنجليزي)
- [ ] API documentation
- [ ] GraphQL API
- [ ] Webhooks

---

## 📚 الوثائق

- **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)**: نظام التصميم الكامل
- **[FIGMA_UNLIMITED_IMPLEMENTATION.md](./FIGMA_UNLIMITED_IMPLEMENTATION.md)**: دليل التنفيذ
- **[LMM_SYSTEM_SPECIFICATION.json](./LMM_SYSTEM_SPECIFICATION.json)**: مواصفات النظام بصيغة JSON

---

## 📊 الإحصائيات

| المقياس | القيمة |
|---------|--------|
| عدد الصفحات | 15 |
| مكونات UI | 65+ |
| مكونات التخطيط | 4 |
| سطور الكود | ~17,143 |
| الألوان المتاحة | 200+ |
| أحجام الخطوط | 14 |
| أوزان الخطوط | 10 |
| Breakpoints | 5 |

---

## 🎉 الحالة

**الإصدار**: 2.0.0
**الحالة**: ✅ Production Ready
**آخر تحديث**: 2025-11-01

---

## 🤖 GitHub Copilot Pair Programming Agent

This repository includes a comprehensive **Pair Programming Agent** for GitHub Copilot that provides professional AI-assisted collaborative development.

### Features

- **7 Collaboration Modes**: Driver, Navigator, Switch, TDD, Review, Mentor, Debug
- **Quality Verification**: Automatic truth score evaluation (0.90-1.0 scale)
- **Comprehensive Commands**: Code, testing, review, Git, and session management
- **Real-World Workflows**: Feature implementation, debugging, and refactoring flows
- **Best Practices**: Guidance for session management and code quality

### Quick Start

Use the agent in GitHub Copilot:

```
@pair-programming help me implement this feature in TDD mode
```

```
@pair-programming review this code for security issues
```

For complete documentation, see [PAIR_PROGRAMMING_AGENT.md](./PAIR_PROGRAMMING_AGENT.md)

---

## 📄 الرخصة

هذا المشروع خاص بشركة LMM.

---

## 🤝 المساهمة

للمساهمة في المشروع:
1. Fork المشروع
2. أنشئ feature branch
3. Commit التغييرات
4. Push للفرع
5. افتح Pull Request

---

## 📞 الدعم

للدعم الفني، يرجى استخدام:
- صفحة الدعم الفني في النظام
- البريد الإلكتروني: support@lmm.com

---

<div align="center">

**بني بـ ❤️ باستخدام React, TypeScript, Tailwind CSS, و Convex**

</div>
