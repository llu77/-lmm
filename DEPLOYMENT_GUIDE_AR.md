# 🚀 دليل تطبيق الإصلاحات والنشر على الإنتاج

## 📋 نظرة عامة

هذا الدليل يشرح خطوات تطبيق جميع الإصلاحات والـ migrations على قاعدة البيانات الإنتاجية.

---

## ✅ الخطوة 1: تحضير البيئة

### إعداد Cloudflare API Token

```bash
# تعيين API Token
export CLOUDFLARE_API_TOKEN="2Auk5i5N0_pyBpt8kqnylef3ocAOk9a1tMUA4Gqz"

# التحقق من صحة Token
curl "https://api.cloudflare.com/client/v4/accounts/85b01d19439ca53d3cfa740d2621a2bd/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

### تثبيت الاعتماديات

```bash
cd /path/to/-lmm
npm run install:all
```

---

## ✅ الخطوة 2: تطبيق Migrations على قاعدة البيانات

### الترتيب الصحيح للتطبيق:

```bash
cd symbolai-worker

# 1. إنشاء الجداول الأساسية والأدوار
npx wrangler d1 execute symbolai-financial-db --remote \
  --file=./migrations/002_create_branches_and_roles.sql

# 2. إضافة البيانات الأولية (الفروع والمستخدمين)
npx wrangler d1 execute symbolai-financial-db --remote \
  --file=./migrations/003_seed_users_only.sql

# 3. تحديث كلمة مرور الأدمن
npx wrangler d1 execute symbolai-financial-db --remote \
  --file=./migrations/006_update_admin_password.sql

# 4. إنشاء الجداول المالية (الإيرادات، البونص، الرواتب)
npx wrangler d1 execute symbolai-financial-db --remote \
  --file=./migrations/008_create_financial_tables.sql
```

### التحقق من نجاح التطبيق:

```bash
# عرض جميع الجداول
npx wrangler d1 execute symbolai-financial-db --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# التحقق من المستخدمين
npx wrangler d1 execute symbolai-financial-db --remote \
  --command="SELECT username, role_id, branch_id FROM users_new;"

# التحقق من الفروع
npx wrangler d1 execute symbolai-financial-db --remote \
  --command="SELECT id, name_ar FROM branches;"
```

---

## ✅ الخطوة 3: إصلاح المشاكل الحرجة

### المشكلة 1: Branch ID ثابت في صفحة الإيرادات

**الملف:** `symbolai-worker/src/pages/revenues.astro`

**التغيير المطلوب:**

```typescript
// ❌ قبل الإصلاح (السطر 279)
body: JSON.stringify({
  branchId: 'BR001',  // قيمة ثابتة!
  date,
  cash,
  network,
  budget,
  total
})

// ✅ بعد الإصلاح
// أولاً: إضافة دالة للحصول على session
async function getCurrentSession() {
  const response = await fetch('/api/auth/session');
  const data = await response.json();
  return data;
}

// في form submit:
const session = await getCurrentSession();
if (!session.authenticated) {
  alert('يجب تسجيل الدخول أولاً');
  window.location.href = '/auth/login';
  return;
}

body: JSON.stringify({
  branchId: session.user.branchId,  // ✅ من session
  date,
  cash,
  network,
  budget,
  total
})
```

---

## ✅ الخطوة 4: اختبار النظام

### اختبار محلي:

```bash
# تشغيل الخادم المحلي
cd symbolai-worker
npx wrangler dev --local --port 4321

# في terminal آخر - تشغيل الاختبارات
cd ..
./test-comprehensive.sh
```

### اختبار الإنتاج:

```bash
# تشغيل الاختبارات على الإنتاج
BASE_URL="https://your-production-url.com" ./test-comprehensive.sh
```

---

## ✅ الخطوة 5: النشر على الإنتاج

### النشر باستخدام Wrangler:

```bash
cd symbolai-worker

# بناء المشروع
npm run build

# النشر
npx wrangler deploy

# أو استخدام npm script
cd ..
npm run deploy
```

### التحقق من النشر:

```bash
# اختبار تسجيل الدخول
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Omar101010"}'
```

---

## 📊 الجداول التي تم إنشاؤها

بعد تطبيق جميع الـ migrations، ستكون الجداول التالية متاحة:

### جداول الأساس:
- ✅ `branches` - الفروع
- ✅ `roles` - الأدوار
- ✅ `users_new` - المستخدمين

### جداول المالية:
- ✅ `employees` - الموظفين
- ✅ `revenues` - الإيرادات
- ✅ `revenue_employee_contributions` - مساهمات الموظفين في الإيرادات
- ✅ `bonus_records` - سجلات البونص
- ✅ `advances` - السلف
- ✅ `deductions` - الخصومات
- ✅ `payroll_records` - سجلات الرواتب
- ✅ `employee_requests` - طلبات الموظفين

### جداول النظام:
- ✅ `notifications` - التنبيهات
- ✅ `audit_logs` - سجلات التدقيق

### Views (المشاهد):
- ✅ `users_with_roles` - المستخدمين مع الأدوار
- ✅ `branch_statistics` - إحصائيات الفروع
- ✅ `monthly_revenue_summary` - ملخص الإيرادات الشهري
- ✅ `employee_payroll_summary` - ملخص رواتب الموظفين
- ✅ `pending_requests_summary` - ملخص الطلبات المعلقة

---

## 🔐 بيانات الدخول

### حساب المدير:
```
Username: admin
Password: Omar101010
Role: الأدمن (Admin)
```

### حسابات المشرفين:
```
فرع لبن:
Username: supervisor_laban
Password: laban1010

فرع طويق:
Username: supervisor_tuwaiq
Password: tuwaiq2020
```

### حسابات الشركاء:
```
فرع لبن:
Username: partner_laban
Password: partner1010

فرع طويق:
Username: partner_tuwaiq
Password: partner2020
```

### حسابات الموظفين:
```
فرع لبن:
Username: emp_laban_ahmad
Password: emp1010

فرع طويق:
Username: emp_tuwaiq_khalid
Password: emp2020
```

---

## 🐛 حل المشاكل الشائعة

### المشكلة: "fetch failed" عند التطبيق على الإنتاج

**الحل:**
```bash
# تأكد من تعيين API Token بشكل صحيح
export CLOUDFLARE_API_TOKEN="your-token-here"

# جرب مع --verbose للحصول على تفاصيل أكثر
npx wrangler d1 execute symbolai-financial-db --remote --verbose \
  --file=./migrations/002_create_branches_and_roles.sql
```

### المشكلة: "no such table" عند تشغيل API

**الحل:**
```bash
# تأكد من تطبيق جميع الـ migrations بالترتيب الصحيح
# راجع الخطوة 2 أعلاه
```

### المشكلة: "اسم المستخدم أو كلمة المرور غير صحيحة"

**الحل:**
```bash
# التحقق من كلمة مرور الأدمن في قاعدة البيانات
npx wrangler d1 execute symbolai-financial-db --remote \
  --command="SELECT username, password FROM users_new WHERE username='admin';"

# يجب أن يكون الـ hash:
# d3d95716f02dea05fde0c75ce8d0aee0016718722d67d8ba5b44ab25feee0ccf
```

### المشكلة: "خطأ في تهيئة النظام"

**الحل:**
```bash
# تحقق من Bindings في wrangler.toml
# تأكد من وجود:
# - D1 database binding (DB)
# - KV namespace binding (SESSIONS)
```

---

## 📝 ملاحظات مهمة

1. **النسخ الاحتياطي:**
   - قبل تطبيق أي migrations على الإنتاج، قم بعمل نسخة احتياطية
   - استخدم `npx wrangler d1 backup` إن كان متاحاً

2. **الاختبار:**
   - اختبر دائماً على البيئة المحلية أولاً
   - استخدم `--local` قبل `--remote`

3. **الأمان:**
   - لا تشارك API Token مع أحد
   - استخدم `.env` files للـ tokens في البيئة المحلية
   - أضف `.env` إلى `.gitignore`

4. **الصيانة:**
   - راجع logs بشكل منتظم
   - راقب استخدام قاعدة البيانات
   - قم بتحديث الـ dependencies بانتظام

---

## 🔗 روابط مفيدة

- [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Database Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

---

## 📞 الدعم

في حالة وجود مشاكل:
1. راجع سجلات الأخطاء في `/home/runner/.config/.wrangler/logs/`
2. استخدم `--verbose` flag مع wrangler للحصول على تفاصيل أكثر
3. راجع `DEEP_INSPECTION_REPORT_AR.md` للمعلومات التقنية

---

**آخر تحديث:** 2025-11-16
**الإصدار:** 2.0.0
**الحالة:** ✅ جاهز للتطبيق
