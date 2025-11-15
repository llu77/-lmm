# دليل الاختبار والنشر السريع
# Quick Testing & Deployment Guide

**آخر تحديث / Last Updated:** 2025-11-14  
**الحالة / Status:** ✅ Ready for Production Testing

---

## 🚀 البدء السريع / Quick Start

### المتطلبات / Prerequisites

```bash
✅ Node.js >= 18.20.8
✅ npm >= 9.0.0
✅ Wrangler CLI >= 4.45.0
✅ Cloudflare account with API token
```

---

## 📋 خطوات التشغيل المحلي / Local Development Steps

### 1. تثبيت الاعتماديات / Install Dependencies

```bash
cd /path/to/-lmm
npm install
cd symbolai-worker
npm install
```

### 2. البناء / Build

```bash
cd symbolai-worker
npm run build
```

**النتيجة المتوقعة / Expected Output:**
```
✓ Build completed successfully
✓ Server bundled
✓ Client assets optimized
Build time: ~7 seconds
```

### 3. التطوير المحلي / Local Development

```bash
# Option 1: Using Astro dev server
npm run dev

# Option 2: Using Wrangler dev (with Cloudflare bindings)
cd ..
wrangler dev --config wrangler.toml
```

**الرابط / URL:** `http://localhost:4321`

---

## 🧪 اختبار المصادقة / Authentication Testing

### Test Case 1: Admin Login

```bash
# Test admin login
curl -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Omar101010"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "username": "admin",
    "role": "Admin",
    "roleAr": "مدير النظام",
    "permissions": {
      "canViewAllBranches": true,
      "canManageUsers": true,
      "canManageSettings": true,
      "canManageBranches": true,
      ...
    }
  }
}
```

### Test Case 2: Supervisor Login

```bash
# Test supervisor login (Laban branch)
curl -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "supervisor_laban",
    "password": "laban1010"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "username": "supervisor_laban",
    "fullName": "محمد أحمد - مشرف فرع لبن",
    "branchId": "branch_1010",
    "branchName": "Laban Branch",
    "permissions": {
      "canViewAllBranches": false,
      "canAddRevenue": true,
      "canAddExpense": true,
      ...
    }
  }
}
```

### Test Case 3: Employee Login

```bash
# Test employee login
curl -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "emp_laban_ahmad",
    "password": "emp1010"
  }'
```

### Test Case 4: Failed Login

```bash
# Test with wrong password
curl -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "wrongpassword"
  }'
```

**Expected Response:**
```json
{
  "error": "اسم المستخدم أو كلمة المرور غير صحيحة"
}
```

---

## 🌐 اختبار الصفحات / Page Testing

### Dashboard Test

```bash
# First, login and get session cookie
SESSION=$(curl -s -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Omar101010"}' \
  -c - | grep session | awk '{print $7}')

# Then access dashboard with session
curl -X GET http://localhost:4321/dashboard \
  -H "Cookie: session=$SESSION"
```

### API Endpoint Tests

```bash
# Get dashboard stats
curl -X GET http://localhost:4321/api/dashboard/stats \
  -H "Cookie: session=$SESSION"

# List branches
curl -X GET http://localhost:4321/api/branches/list \
  -H "Cookie: session=$SESSION"

# List users
curl -X GET http://localhost:4321/api/users/list \
  -H "Cookie: session=$SESSION"

# Get revenues
curl -X GET http://localhost:4321/api/revenues/list-rbac \
  -H "Cookie: session=$SESSION"
```

---

## ☁️ النشر على Cloudflare / Deploy to Cloudflare

### المتطلبات / Prerequisites

```bash
# Set Cloudflare API token
export CLOUDFLARE_API_TOKEN="your_api_token_here"
export CLOUDFLARE_ACCOUNT_ID="85b01d19439ca53d3cfa740d2621a2bd"
```

### 1. تطبيق Migrations / Apply Migrations

```bash
cd symbolai-worker

# Apply all migrations in order
wrangler d1 execute DB --remote \
  --file=./migrations/001_create_email_tables.sql

wrangler d1 execute DB --remote \
  --file=./migrations/002_create_branches_and_roles.sql

wrangler d1 execute DB --remote \
  --file=./migrations/003_seed_branches_and_users_hashed.sql

wrangler d1 execute DB --remote \
  --file=./migrations/006_update_admin_password.sql

wrangler d1 execute DB --remote \
  --file=./migrations/007_update_supervisors_names.sql
```

### 2. التحقق من قاعدة البيانات / Verify Database

```bash
# Check users table
wrangler d1 execute DB --remote \
  --command="SELECT id, username, email, full_name, role_id, branch_id, is_active FROM users_new"

# Check roles
wrangler d1 execute DB --remote \
  --command="SELECT * FROM roles"

# Check branches
wrangler d1 execute DB --remote \
  --command="SELECT * FROM branches"
```

### 3. النشر / Deploy

```bash
# Build and deploy
npm run build
wrangler deploy

# Or use the monorepo command
cd ..
npm run deploy
```

**Expected Output:**
```
✅ Uploading...
✅ Deployment complete
🌐 https://symbolai.net
```

### 4. اختبار الإنتاج / Test Production

```bash
# Test production login
curl -X POST https://symbolai.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Omar101010"
  }'

# Test production dashboard
curl -X GET https://symbolai.net/dashboard
```

---

## 🔐 اختبار الأمان / Security Testing

### 1. SQL Injection Test

```bash
# Try SQL injection in login
curl -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin\" OR \"1\"=\"1",
    "password": "anything"
  }'
```

**Expected:** Should return error, not bypass authentication ✅

### 2. XSS Test

```bash
# Try XSS in input fields
curl -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "<script>alert(\"XSS\")</script>",
    "password": "test"
  }'
```

**Expected:** Should be sanitized, no script execution ✅

### 3. Session Hijacking Test

```bash
# Try using invalid session token
curl -X GET http://localhost:4321/api/dashboard/stats \
  -H "Cookie: session=invalid_token_here"
```

**Expected:** Should return 401 Unauthorized ✅

### 4. Branch Isolation Test

```bash
# Login as supervisor_laban (branch_1010)
SESSION_LABAN=$(curl -s -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"supervisor_laban","password":"laban1010"}' \
  -c - | grep session | awk '{print $7}')

# Try to access Tuwaiq branch data (branch_2020)
curl -X GET "http://localhost:4321/api/employees/list?branchId=branch_2020" \
  -H "Cookie: session=$SESSION_LABAN"
```

**Expected:** Should return 403 Forbidden or empty results ✅

---

## 📊 اختبار الصلاحيات / Permission Testing

### Admin Tests

```bash
# Login as admin
SESSION_ADMIN=$(curl -s -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Omar101010"}' \
  -c - | grep session | awk '{print $7}')

# Test admin permissions
curl -X GET http://localhost:4321/api/users/list \
  -H "Cookie: session=$SESSION_ADMIN"
# ✅ Should succeed

curl -X GET http://localhost:4321/api/branches/list \
  -H "Cookie: session=$SESSION_ADMIN"
# ✅ Should succeed

curl -X GET http://localhost:4321/api/employees/list \
  -H "Cookie: session=$SESSION_ADMIN"
# ✅ Should succeed (all branches)
```

### Supervisor Tests

```bash
# Login as supervisor
SESSION_SUP=$(curl -s -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"supervisor_laban","password":"laban1010"}' \
  -c - | grep session | awk '{print $7}')

# Test supervisor permissions
curl -X GET http://localhost:4321/api/users/list \
  -H "Cookie: session=$SESSION_SUP"
# ❌ Should fail or return limited data

curl -X GET http://localhost:4321/api/employees/list \
  -H "Cookie: session=$SESSION_SUP"
# ✅ Should succeed (own branch only)
```

### Employee Tests

```bash
# Login as employee
SESSION_EMP=$(curl -s -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"emp_laban_ahmad","password":"emp1010"}' \
  -c - | grep session | awk '{print $7}')

# Test employee permissions
curl -X GET http://localhost:4321/api/employees/list \
  -H "Cookie: session=$SESSION_EMP"
# ❌ Should fail (403 Forbidden)

curl -X GET http://localhost:4321/api/requests/my-requests \
  -H "Cookie: session=$SESSION_EMP"
# ✅ Should succeed (own requests only)
```

---

## 🔍 اختبار الوظائف / Functionality Testing

### Revenue Management Test

```bash
# Create revenue (as admin or supervisor)
curl -X POST http://localhost:4321/api/revenues/create \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$SESSION_ADMIN" \
  -d '{
    "branchId": "branch_1010",
    "amount": 1000,
    "paymentMethod": "cash",
    "description": "Test revenue",
    "date": "2025-11-14"
  }'

# List revenues
curl -X GET http://localhost:4321/api/revenues/list-rbac \
  -H "Cookie: session=$SESSION_ADMIN"
```

### Payroll Calculation Test

```bash
# Calculate payroll (as admin or supervisor)
curl -X POST http://localhost:4321/api/payroll/calculate \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$SESSION_ADMIN" \
  -d '{
    "branchId": "branch_1010",
    "month": 11,
    "year": 2025
  }'
```

### Request Management Test

```bash
# Create employee request (as employee)
curl -X POST http://localhost:4321/api/requests/create \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$SESSION_EMP" \
  -d '{
    "type": "vacation",
    "description": "Need vacation",
    "startDate": "2025-12-01",
    "endDate": "2025-12-10"
  }'

# Approve request (as supervisor)
curl -X PUT http://localhost:4321/api/requests/update-status \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$SESSION_SUP" \
  -d '{
    "requestId": "request_id_here",
    "status": "approved",
    "comment": "Approved"
  }'
```

---

## 🐛 استكشاف الأخطاء / Troubleshooting

### Problem: Build fails

```bash
# Solution: Clean and reinstall
rm -rf node_modules package-lock.json
npm install
cd symbolai-worker
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Problem: Session not working

```bash
# Check KV binding
wrangler kv:namespace list

# Check session in KV
wrangler kv:key get --binding=SESSIONS "session:your_token_here"
```

### Problem: Database queries fail

```bash
# Verify D1 database
wrangler d1 list

# Check tables
wrangler d1 execute DB --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table'"

# Check users
wrangler d1 execute DB --remote \
  --command="SELECT COUNT(*) FROM users_new"
```

### Problem: Permission denied

```bash
# Verify user permissions
wrangler d1 execute DB --remote \
  --command="SELECT u.username, r.name, r.can_manage_users, r.can_view_all_branches 
             FROM users_new u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.username = 'your_username'"
```

---

## ✅ قائمة التحقق النهائية / Final Checklist

### قبل النشر / Before Deployment

- [ ] جميع Migrations مطبقة بنجاح
- [ ] قاعدة البيانات محدثة
- [ ] المستخدمون موجودون
- [ ] Cloudflare Bindings مكونة
- [ ] Environment Variables محددة
- [ ] البناء ناجح بدون أخطاء
- [ ] الاختبارات المحلية تعمل
- [ ] كلمات المرور آمنة

### بعد النشر / After Deployment

- [ ] الموقع يعمل على الإنتاج
- [ ] تسجيل الدخول يعمل
- [ ] الصلاحيات تعمل بشكل صحيح
- [ ] عزل الفروع يعمل
- [ ] API Endpoints تستجيب
- [ ] الجلسات تستمر بشكل صحيح
- [ ] الأمان مفعل
- [ ] Audit Logs تسجل الأحداث

---

## 📚 مراجع إضافية / Additional References

- [COMPREHENSIVE_VERIFICATION_REPORT.md](./COMPREHENSIVE_VERIFICATION_REPORT.md) - التقرير الشامل
- [VERIFICATION_SUMMARY.md](./VERIFICATION_SUMMARY.md) - ملخص التحقق
- [CLOUDFLARE_DATABASE_VERIFICATION.md](./CLOUDFLARE_DATABASE_VERIFICATION.md) - دليل قاعدة البيانات
- [QUICK_START.md](./QUICK_START.md) - البدء السريع
- [README.md](./README.md) - الدليل الرئيسي

---

## 📞 الدعم / Support

### بيانات الوصول / Credentials

**Admin:**
```
Username: admin
Password: Omar101010
Access: Full system
```

**Cloudflare:**
```
Account ID: 85b01d19439ca53d3cfa740d2621a2bd
Database ID: 3897ede2-ffc0-4fe8-8217-f9607c89bef2
Gateway ID: 3c9bde8186fe4c868defcc441f28ca5e
```

---

**آخر تحديث / Last Updated:** 2025-11-14  
**الحالة / Status:** ✅ Ready  
**الجودة / Quality:** ⭐⭐⭐⭐⭐
