# 🛡️ XSS Vulnerability Fix Guide
## دليل إصلاح ثغرات XSS

---

## 📋 Overview / نظرة عامة

هذا الدليل يشرح كيفية إصلاح ثغرات XSS في جميع صفحات Astro.

**الملفات المتأثرة:** 15 صفحة
**الأولوية:** 🔴 عالية
**الوقت المتوقع:** 4-6 ساعات

---

## 🔍 تحديد المشاكل / Identifying Issues

### Script للبحث عن innerHTML

```bash
# البحث عن جميع استخدامات innerHTML
grep -rn "innerHTML" symbolai-worker/src/pages/*.astro

# البحث عن pattern خطير
grep -rn "\.innerHTML.*\$\{" symbolai-worker/src/pages/*.astro
```

### الصفحات المتأثرة:

1. ✅ `advances-deductions.astro` (lines 552-561, 622-641)
2. ✅ `bonus.astro` (lines 252-260, 347-373)
3. ✅ `branches.astro` (lines 178-234)
4. ✅ `dashboard.astro` (lines 323-335)
5. ✅ `email-settings.astro` (lines 372-376, 450-471)
6. ✅ `employee-requests.astro` (lines 201-214)
7. ✅ `employees.astro` (lines 194-218)
8. ✅ `expenses.astro` (lines 265-281)
9. ✅ `manage-requests.astro` (lines 244-259, 306)
10. ✅ `my-requests.astro` (lines 199-211, 244-269)
11. ✅ `payroll.astro` (lines 304-316, 412-428, 470-525)
12. ✅ `product-orders.astro` (lines 284-300, 484-540)
13. ✅ `revenues.astro` (lines 206-220)
14. ✅ `users.astro` (lines 344-374)
15. ✅ `backups.astro`

---

## 🔧 طرق الإصلاح / Fix Methods

### Method 1: استخدام textContent (الأسرع والأكثر أماناً)

```javascript
// ❌ غير آمن
element.innerHTML = `<td>${employee.name}</td>`;

// ✅ آمن
element.textContent = employee.name;
```

### Method 2: استخدام DOMPurify (للـ HTML المعقد)

```javascript
import { sanitizeHTML } from '@/lib/xss-protection';

// ❌ غير آمن
element.innerHTML = userProvidedHTML;

// ✅ آمن
element.innerHTML = sanitizeHTML(userProvidedHTML);
```

### Method 3: استخدام createTableRows helper (للجداول)

```javascript
import { createTableRows } from '@/lib/xss-protection';

// ❌ غير آمن
tbody.innerHTML = employees.map(emp => `
  <tr>
    <td>${emp.name}</td>
    <td>${emp.salary}</td>
  </tr>
`).join('');

// ✅ آمن
tbody.innerHTML = createTableRows(employees, ['name', 'salary']);
```

### Method 4: إعادة كتابة بـ React/Astro Components (الأفضل)

```astro
<!-- ❌ غير آمن -->
<div id="content"></div>
<script>
  document.getElementById('content').innerHTML = data.map(item => `
    <div>${item.name}</div>
  `).join('');
</script>

<!-- ✅ آمن - استخدام Astro -->
<div>
  {data.map(item => (
    <div>{item.name}</div>
  ))}
</div>
```

---

## 📝 أمثلة عملية / Practical Examples

### مثال 1: employees.astro

```javascript
// ❌ الكود الحالي (غير آمن)
function renderEmployees(employees) {
  const tbody = document.getElementById('employees-tbody');
  tbody.innerHTML = employees.map(emp => `
    <tr>
      <td>${emp.employee_name}</td>
      <td>${emp.national_id}</td>
      <td>${emp.base_salary.toLocaleString('ar-EG')}</td>
      <td>${emp.is_active ? 'نشط' : 'غير نشط'}</td>
    </tr>
  `).join('');
}

// ✅ الحل 1: استخدام textContent
function renderEmployees(employees) {
  const tbody = document.getElementById('employees-tbody');
  tbody.innerHTML = ''; // Clear first

  employees.forEach(emp => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = emp.employee_name;
    row.appendChild(nameCell);

    const idCell = document.createElement('td');
    idCell.textContent = emp.national_id;
    row.appendChild(idCell);

    const salaryCell = document.createElement('td');
    salaryCell.textContent = emp.base_salary.toLocaleString('ar-EG');
    row.appendChild(salaryCell);

    const statusCell = document.createElement('td');
    statusCell.textContent = emp.is_active ? 'نشط' : 'غير نشط';
    row.appendChild(statusCell);

    tbody.appendChild(row);
  });
}

// ✅ الحل 2: استخدام helper
import { createTableRows } from '@/lib/xss-protection';

function renderEmployees(employees) {
  const tbody = document.getElementById('employees-tbody');
  const data = employees.map(emp => ({
    name: emp.employee_name,
    id: emp.national_id,
    salary: emp.base_salary.toLocaleString('ar-EG'),
    status: emp.is_active ? 'نشط' : 'غير نشط'
  }));

  tbody.innerHTML = createTableRows(data, ['name', 'id', 'salary', 'status']);
}
```

### مثال 2: payroll.astro

```javascript
// ❌ الكود الحالي (غير آمن)
payrollData.forEach(emp => {
  const row = `
    <tr>
      <td>${emp.employeeName}</td>
      <td>${emp.baseSalary}</td>
      <td>${emp.advances}</td>
      <td>${emp.netSalary}</td>
    </tr>
  `;
  tbody.innerHTML += row;
});

// ✅ الحل
import { escapeHTML } from '@/lib/xss-protection';

payrollData.forEach(emp => {
  const row = document.createElement('tr');

  ['employeeName', 'baseSalary', 'advances', 'netSalary'].forEach(field => {
    const cell = document.createElement('td');
    cell.textContent = emp[field];
    row.appendChild(cell);
  });

  tbody.appendChild(row);
});
```

### مثال 3: dashboard.astro (Stats Cards)

```javascript
// ❌ الكود الحالي (غير آمن)
document.getElementById('total-revenue').innerHTML = stats.revenue.toLocaleString('ar-EG');

// ✅ الحل
document.getElementById('total-revenue').textContent = stats.revenue.toLocaleString('ar-EG');
```

---

## 🔄 خطة العمل خطوة بخطوة / Step-by-Step Action Plan

### الخطوة 1: تحديد جميع المشاكل

```bash
# تشغيل script البحث
bash scripts/find-xss-vulnerabilities.sh > xss-report.txt

# مراجعة النتائج
cat xss-report.txt
```

### الخطوة 2: إصلاح الصفحات (حسب الأولوية)

#### المرحلة A - صفحات حرجة (2 ساعة):
1. ✅ **employees.astro** - بيانات الموظفين
2. ✅ **payroll.astro** - كشوف المرتبات
3. ✅ **users.astro** - إدارة المستخدمين
4. ✅ **revenues.astro** - الإيرادات

#### المرحلة B - صفحات مهمة (2 ساعة):
5. ✅ **expenses.astro** - المصروفات
6. ✅ **bonus.astro** - المكافآت
7. ✅ **advances-deductions.astro** - السلف والخصومات
8. ✅ **branches.astro** - الفروع

#### المرحلة C - صفحات متوسطة (1-2 ساعة):
9. ✅ **employee-requests.astro**
10. ✅ **my-requests.astro**
11. ✅ **manage-requests.astro**
12. ✅ **product-orders.astro**
13. ✅ **dashboard.astro**
14. ✅ **email-settings.astro**
15. ✅ **backups.astro**

### الخطوة 3: الاختبار

```javascript
// اختبار XSS في كل صفحة
const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror="alert(1)">',
  '"><script>alert(String.fromCharCode(88,83,83))</script>',
  '<iframe src="javascript:alert(1)">',
  '<body onload="alert(1)">',
];

// حاول إدخال كل payload في حقول الإدخال
// يجب أن يتم عرضها كنص وليس تنفيذها
```

### الخطوة 4: التحقق النهائي

```bash
# التأكد من عدم وجود innerHTML متبقية
grep -rn "innerHTML.*\$\{" symbolai-worker/src/pages/*.astro

# يجب ألا يظهر أي نتائج
```

---

## 🛠️ Tools & Helpers

### Script للبحث عن XSS

```bash
#!/bin/bash
# scripts/find-xss-vulnerabilities.sh

echo "=== Searching for XSS Vulnerabilities ==="
echo ""

echo "1. innerHTML usage:"
grep -rn "innerHTML" symbolai-worker/src/pages/*.astro | grep -v "\.innerHTML = ''" | grep -v "// Safe"

echo ""
echo "2. Dangerous patterns:"
grep -rn "\.innerHTML.*\$\{" symbolai-worker/src/pages/*.astro

echo ""
echo "3. Template literal HTML:"
grep -rn "\`.*<.*\${.*}.*>\`" symbolai-worker/src/pages/*.astro

echo ""
echo "=== Search Complete ==="
```

### Script للإصلاح التلقائي (استخدم بحذر)

```bash
#!/bin/bash
# scripts/auto-fix-xss.sh

# هذا مثال بسيط - قد تحتاج تخصيص حسب الحالة
for file in symbolai-worker/src/pages/*.astro; do
  echo "Processing: $file"

  # استبدال innerHTML ب textContent للحالات البسيطة
  # هذا مثال - لا تستخدمه بدون مراجعة!
  # sed -i 's/\.innerHTML = `/\.textContent = `/g' "$file"

  # إضافة import للـ helper functions
  # if ! grep -q "import.*xss-protection" "$file"; then
  #   sed -i '1i import { escapeHTML, sanitizeHTML } from "@/lib/xss-protection";' "$file"
  # fi
done

echo "Auto-fix complete. Please review all changes!"
```

---

## ✅ Checklist

### لكل صفحة:

- [ ] تحديد جميع استخدامات `innerHTML`
- [ ] اختيار طريقة الإصلاح المناسبة
- [ ] تطبيق الإصلاح
- [ ] اختبار الصفحة محلياً
- [ ] اختبار XSS payloads
- [ ] مراجعة الكود
- [ ] Commit التغييرات

### بعد إصلاح جميع الصفحات:

- [ ] تشغيل script البحث - يجب ألا يظهر نتائج
- [ ] اختبار جميع الصفحات
- [ ] Penetration testing
- [ ] مراجعة أمنية نهائية
- [ ] تحديث documentation
- [ ] Deploy للإنتاج

---

## 📊 تقدير الوقت / Time Estimates

| المرحلة | الوقت |
|---------|-------|
| Setup & Testing | 30 min |
| Critical pages (4) | 2 hours |
| Important pages (4) | 2 hours |
| Medium pages (7) | 1.5 hours |
| Testing & Review | 1 hour |
| **Total** | **7 hours** |

---

## 🎯 نتيجة متوقعة / Expected Outcome

بعد إكمال جميع الإصلاحات:

```
✅ Zero XSS vulnerabilities
✅ All user input sanitized
✅ CSP headers enabled
✅ Security score: A- (9.0/10) for XSS protection
✅ Penetration testing passed
```

---

## 📞 Need Help?

إذا واجهت مشكلة:

1. راجع التوثيق: `/symbolai-worker/src/lib/xss-protection.ts`
2. اختبر في بيئة development أولاً
3. استخدم browser DevTools للتحقق
4. راجع أمثلة الإصلاح في هذا الدليل

---

## 🔗 مصادر إضافية / Additional Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [MDN: textContent vs innerHTML](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)

---

**Created:** 2025-01-04
**Status:** 🔄 In Progress
**Priority:** 🔴 High
