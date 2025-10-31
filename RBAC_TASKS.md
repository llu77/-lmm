# 📋 المهام المتبقية لنظام RBAC

## ✅ المنجز حتى الآن

- ✅ إنشاء قاعدة البيانات (branches, roles, users_new, audit_logs)
- ✅ إنشاء مكتبة الصلاحيات (permissions.ts - 500+ أسطر)
- ✅ إنشاء معالج أخطاء البريد (email-error-handler.ts - 700+ أسطر)
- ✅ 9 APIs جديدة (branches, users, roles, email health)
- ✅ تحديث Login API لتحميل الصلاحيات

## 🔄 المهام المتبقية

### 1. تحديث APIs الموجودة بعزل الفروع

#### A. Revenues APIs (الإيرادات)
**الملفات:**
- `src/pages/api/revenues/create.ts`
- `src/pages/api/revenues/list.ts`
- `src/pages/api/revenues/update.ts`
- `src/pages/api/revenues/delete.ts`

**التغييرات المطلوبة:**
```typescript
// 1. استبدال requireAuth بـ requireAuthWithPermissions
const authResult = await requireAuthWithPermissions(kv, db, request);

// 2. التحقق من الصلاحية
const permError = requirePermission(authResult, 'canAddRevenue');
if (permError) return permError;

// 3. التحقق من الوصول للفرع
const branchError = validateBranchAccess(authResult, branchId);
if (branchError) return branchError;

// 4. في list: استخدام getBranchFilterSQL
const { clause, params } = getBranchFilterSQL(authResult);
const query = `SELECT * FROM revenues WHERE 1=1 ${clause}`;

// 5. تسجيل التدقيق
await logAudit(db, authResult, 'create', 'revenue', revenueId);
```

#### B. Expenses APIs (المصروفات)
**الملفات:**
- `src/pages/api/expenses/create.ts` ✅ (محدث جزئياً - يحتاج فقط للصلاحيات)
- `src/pages/api/expenses/list.ts`
- `src/pages/api/expenses/update.ts`
- `src/pages/api/expenses/delete.ts`

**التغييرات:** نفس revenues

#### C. Employees APIs (الموظفين)
**الملفات:**
- `src/pages/api/employees/create.ts`
- `src/pages/api/employees/list.ts`
- `src/pages/api/employees/update.ts`
- `src/pages/api/employees/toggle-status.ts`

**التغييرات:**
```typescript
// التحقق من canManageEmployees
const permError = requirePermission(authResult, 'canManageEmployees');

// عزل حسب الفرع
const { clause, params } = getBranchFilterSQL(authResult);
```

#### D. Employee Requests APIs (طلبات الموظفين)
**الملفات:**
- `src/pages/api/requests/create.ts` ✅ (محدث جزئياً)
- `src/pages/api/requests/list.ts`
- `src/pages/api/requests/respond.ts` ✅ (محدث جزئياً)

**التغييرات الإضافية:**
```typescript
// في create: Employee يمكنه رفع طلبات فقط
if (!authResult.permissions.canSubmitRequests) {
  return forbidden;
}

// في respond: فقط من لديه canApproveRequests
const permError = requirePermission(authResult, 'canApproveRequests');

// في list:
// - Employee: يرى طلباته فقط (WHERE user_id = ?)
// - Supervisor/Admin: يرى طلبات فرعه/الكل
if (authResult.permissions.roleName === 'employee') {
  query += ` AND user_id = ?`;
  params.push(authResult.userId);
} else {
  const { clause, params: branchParams } = getBranchFilterSQL(authResult);
  query += clause;
  params.push(...branchParams);
}
```

#### E. Product Orders APIs (طلبات المنتجات)
**الملفات:**
- `src/pages/api/orders/create.ts` ✅ (محدث جزئياً)
- `src/pages/api/orders/list.ts`
- `src/pages/api/orders/update-status.ts` ✅ (محدث جزئياً)

**التغييرات:**
```typescript
// التحقق من canManageOrders
const permError = requirePermission(authResult, 'canManageOrders');

// عزل الفرع
const { clause, params } = getBranchFilterSQL(authResult);
```

#### F. Payroll APIs (كشوف الرواتب)
**الملفات:**
- `src/pages/api/payroll/generate.ts`
- `src/pages/api/payroll/list.ts`

**التغييرات:**
```typescript
// التحقق من canGeneratePayroll
const permError = requirePermission(authResult, 'canGeneratePayroll');

// عزل الفرع
const { clause, params } = getBranchFilterSQL(authResult);
```

#### G. Bonus APIs (المكافآت)
**الملفات:**
- `src/pages/api/bonus/approve.ts`
- `src/pages/api/bonus/list.ts`

**التغييرات:**
```typescript
// التحقق من canManageBonus
const permError = requirePermission(authResult, 'canManageBonus');

// في list للموظف:
if (authResult.permissions.roleName === 'employee' && authResult.permissions.canViewOwnBonus) {
  // عرض مكافآته فقط
  query += ` AND employee_id = (SELECT id FROM employees WHERE user_id = ?)`;
  params.push(authResult.userId);
}
```

---

### 2. واجهات المستخدم (UI Pages)

#### A. صفحة إدارة الفروع (branches.astro)
**المسار:** `src/pages/branches.astro`

**المميزات:**
- ✅ قائمة الفروع (Admin يرى الكل، غيره فرعه فقط)
- ✅ إضافة فرع جديد (Admin فقط)
- ✅ تعديل الفرع (Admin فقط)
- ✅ إحصائيات كل فرع
- ✅ عدد الموظفين، الإيرادات، المصروفات

**الكود المطلوب:**
```astro
---
import MainLayout from '@/layouts/MainLayout.astro';

// Check authentication
const cookieHeader = Astro.request.headers.get('Cookie');
if (!cookieHeader?.includes('session=')) {
  return Astro.redirect('/auth/login');
}
---

<MainLayout title="إدارة الفروع - SymbolAI">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">إدارة الفروع</h1>
      <button id="add-branch-btn" class="btn-primary hidden" data-admin-only>
        + إضافة فرع
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-3" id="branch-stats"></div>

    <!-- Branches Table -->
    <div class="card">
      <table class="w-full">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الموقع</th>
            <th>المدير</th>
            <th>عدد الموظفين</th>
            <th>الإيرادات الشهرية</th>
            <th>المصروفات الشهرية</th>
            <th>الحالة</th>
            <th data-admin-only>إجراءات</th>
          </tr>
        </thead>
        <tbody id="branches-table"></tbody>
      </table>
    </div>
  </div>

  <script>
    // Load user permissions from login
    let userPermissions = {};

    async function loadBranches() {
      const response = await fetch('/api/branches/list');
      const data = await response.json();

      if (data.success) {
        renderBranchesTable(data.branches);
      }
    }

    function renderBranchesTable(branches) {
      // Render table...
    }

    // Hide admin-only elements based on permissions
    if (!userPermissions.canManageBranches) {
      document.querySelectorAll('[data-admin-only]').forEach(el => {
        el.style.display = 'none';
      });
    }

    loadBranches();
  </script>
</MainLayout>
```

#### B. صفحة إدارة المستخدمين (users.astro)
**المسار:** `src/pages/users.astro`

**المميزات:**
- ✅ قائمة المستخدمين (Admin: الكل، Supervisor: فرعه فقط)
- ✅ إضافة مستخدم (Admin فقط)
- ✅ تعديل المستخدم (Admin فقط)
- ✅ تعيين الدور والفرع
- ✅ تفعيل/تعطيل المستخدم

**الأعمدة:**
- الاسم
- اسم المستخدم
- البريد
- الدور (admin, supervisor, partner, employee)
- الفرع
- الحالة (نشط/غير نشط)
- الإجراءات (تعديل، تفعيل/تعطيل)

#### C. تحديث Dashboard (dashboard.astro)
**التغييرات المطلوبة:**

```astro
<script>
  // Get user permissions from login response
  const userPermissions = JSON.parse(
    localStorage.getItem('userPermissions') || '{}'
  );

  const userBranchId = localStorage.getItem('userBranchId');

  // Load data based on branch
  async function loadDashboardData() {
    let params = '';

    // If not admin, filter by branch
    if (!userPermissions.canViewAllBranches && userBranchId) {
      params = `?branchId=${userBranchId}`;
    }

    // Load revenues
    const revenuesRes = await fetch(`/api/revenues/list${params}`);

    // Load expenses
    const expensesRes = await fetch(`/api/expenses/list${params}`);

    // etc...
  }

  // Hide/show elements based on permissions
  if (!userPermissions.canAddRevenue) {
    document.getElementById('add-revenue-btn')?.remove();
  }

  if (!userPermissions.canAddExpense) {
    document.getElementById('add-expense-btn')?.remove();
  }

  // Show branch selector only for admin
  if (userPermissions.canViewAllBranches) {
    document.getElementById('branch-selector').style.display = 'block';
  }
</script>
```

#### D. تحديث Navigation/Menu
**الملف:** `src/layouts/MainLayout.astro` أو `src/components/Navigation.astro`

**التغييرات:**
```astro
<script>
  const permissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');

  // Menu items with permission requirements
  const menuItems = [
    { path: '/dashboard', label: 'لوحة التحكم', permission: null }, // All
    { path: '/revenues', label: 'الإيرادات', permission: 'canViewReports' },
    { path: '/expenses', label: 'المصروفات', permission: 'canViewReports' },
    { path: '/employees', label: 'الموظفين', permission: 'canManageEmployees' },
    { path: '/my-requests', label: 'طلباتي', permission: 'canSubmitRequests' },
    { path: '/manage-requests', label: 'إدارة الطلبات', permission: 'canApproveRequests' },
    { path: '/product-orders', label: 'طلبات المنتجات', permission: 'canManageOrders' },
    { path: '/payroll', label: 'كشوف الرواتب', permission: 'canGeneratePayroll' },
    { path: '/bonus', label: 'المكافآت', permission: 'canManageBonus' },
    { path: '/branches', label: 'الفروع', permission: 'canManageBranches' },
    { path: '/users', label: 'المستخدمين', permission: 'canManageUsers' },
    { path: '/email-settings', label: 'إعدادات البريد', permission: 'canManageSettings' },
  ];

  // Render only items user has permission for
  menuItems.forEach(item => {
    if (!item.permission || permissions[item.permission]) {
      // Show menu item
    } else {
      // Hide menu item
    }
  });
</script>
```

---

### 3. تحسينات إضافية (اختياري)

#### A. Branch Selector Component
```typescript
// src/components/BranchSelector.astro
// مكون لاختيار الفرع (للأدمن فقط)
// يظهر في أعلى الصفحات لتصفية البيانات
```

#### B. Permission Checker Utility
```typescript
// src/lib/client-permissions.ts
export function hasPermission(permission: string): boolean {
  const permissions = JSON.parse(
    localStorage.getItem('userPermissions') || '{}'
  );
  return permissions[permission] === true;
}

export function canAccessBranch(branchId: string): boolean {
  const userBranchId = localStorage.getItem('userBranchId');
  const canViewAll = hasPermission('canViewAllBranches');

  return canViewAll || userBranchId === branchId;
}
```

#### C. Store Permissions in localStorage on Login
```typescript
// في صفحة login.astro
const response = await fetch('/api/auth/login', { ... });
const data = await response.json();

if (data.success) {
  // Store permissions
  localStorage.setItem('userPermissions', JSON.stringify(data.user.permissions));
  localStorage.setItem('userBranchId', data.user.branchId);
  localStorage.setItem('userRole', data.user.role);
  localStorage.setItem('userName', data.user.fullName);

  // Redirect to dashboard
  window.location.href = '/dashboard';
}
```

---

## 📝 خطة التنفيذ المقترحة

### المرحلة 1: APIs الأساسية (أولوية عالية)
1. ✅ تحديث Login API
2. تحديث Revenues APIs (4 ملفات)
3. تحديث Expenses APIs (4 ملفات)
4. تحديث Employees APIs (4 ملفات)

**الوقت المتوقع:** 2-3 ساعات

### المرحلة 2: APIs الطلبات (أولوية متوسطة)
5. تحديث Requests APIs (2 ملفات متبقية)
6. تحديث Orders APIs (1 ملف متبقي)
7. تحديث Payroll APIs (2 ملفات)
8. تحديث Bonus APIs (2 ملفات)

**الوقت المتوقع:** 2 ساعة

### المرحلة 3: واجهات المستخدم (أولوية متوسطة)
9. إنشاء branches.astro
10. إنشاء users.astro
11. تحديث dashboard.astro
12. تحديث Navigation

**الوقت المتوقع:** 3-4 ساعات

### المرحلة 4: التحسينات (اختياري)
13. Branch Selector Component
14. Permission Checker Utility
15. localStorage Management

**الوقت المتوقع:** 1 ساعة

---

## 🚀 الأوامر المطلوبة للتفعيل

### 1. تطبيق Migrations
```bash
# Local
wrangler d1 execute DB --local --file=./migrations/002_create_branches_and_roles.sql

# Production
wrangler d1 execute DB --remote --file=./migrations/002_create_branches_and_roles.sql
```

### 2. إنشاء فروع افتراضية
```bash
curl -X POST http://localhost:8788/api/branches/create \
  -H "Cookie: session=ADMIN_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Branch",
    "name_ar": "الفرع الرئيسي",
    "location": "Cairo, Egypt"
  }'
```

### 3. إنشاء مستخدم Admin
```bash
curl -X POST http://localhost:8788/api/users/create \
  -H "Cookie: session=ADMIN_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "full_name": "مدير النظام",
    "role_id": "role_admin",
    "email": "admin@symbolai.net"
  }'
```

### 4. إنشاء مشرف فرع
```bash
curl -X POST http://localhost:8788/api/users/create \
  -H "Cookie: session=ADMIN_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "supervisor_cairo",
    "password": "supervisor123",
    "full_name": "مشرف القاهرة",
    "role_id": "role_supervisor",
    "branch_id": "branch_main",
    "email": "supervisor@symbolai.net"
  }'
```

---

## 📊 التقدم الحالي

```
✅ قاعدة البيانات:          100% (4 جداول + 2 views)
✅ مكتبات الصلاحيات:         100% (permissions.ts + error handler)
✅ APIs الفروع والمستخدمين:   100% (9 endpoints)
✅ Login API:               100% (مع تحميل الصلاحيات)
🔄 تحديث APIs الموجودة:     10% (فقط بعض ملفات Orders)
⏳ واجهات المستخدم:         0%
⏳ تحديث Dashboard:         0%
⏳ تحديث Navigation:        0%

الإجمالي: ~40% مكتمل
```

---

## ✅ Checklist للمطور

### APIs
- [x] Login API - تحميل الصلاحيات
- [ ] Revenues: create, list, update, delete
- [ ] Expenses: list, update, delete (create محدث جزئياً)
- [ ] Employees: create, list, update, toggle-status
- [ ] Requests: list (create/respond محدثة جزئياً)
- [ ] Orders: list (create/update-status محدثة جزئياً)
- [ ] Payroll: generate, list
- [ ] Bonus: approve, list

### UI Pages
- [ ] branches.astro
- [ ] users.astro
- [ ] dashboard.astro (تحديث)
- [ ] navigation (تحديث)
- [ ] localStorage management

### Testing
- [ ] اختبار تسجيل دخول بكل دور
- [ ] اختبار عزل الفروع
- [ ] اختبار الصلاحيات
- [ ] اختبار سجل التدقيق

---

## 🎯 النتيجة المتوقعة

بعد إتمام جميع المهام:

✅ **نظام صلاحيات كامل**
- 4 أدوار بصلاحيات واضحة
- عزل تام للبيانات حسب الفروع
- سجل تدقيق شامل

✅ **تجربة مستخدم مخصصة**
- كل دور يرى فقط ما يخصه
- واجهات مبسطة حسب الصلاحيات
- عدم إمكانية الوصول لبيانات غير مصرح بها

✅ **أمان عالي**
- حماية على مستوى Backend
- عزل على مستوى Database
- تسجيل كل العمليات

---

**ملاحظة:** يمكن تنفيذ المهام بشكل تدريجي. الأولوية للمرحلة 1 و 2 (تحديث APIs) لأنها تؤثر على الأمان مباشرة.
