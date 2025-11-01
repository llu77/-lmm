# ⚡ Phase 1: Quick Command Reference

**Admin Password:** `JYElfpfK3kVJkOTqPpYZ9TRZ` ← **SAVE THIS NOW!**

---

## 1️⃣ Authenticate (on machine with browser)

```bash
npx wrangler login
npx wrangler whoami  # Verify
```

---

## 2️⃣ Execute Phase 1 (Production Database)

```bash
# Navigate to project
cd /home/user/-lmm/symbolai-worker

# Deactivate test users
npx wrangler d1 execute DB --remote --file=migrations/005_remove_test_users_safe.sql

# Create admin (from parent directory)
cd ..
npx wrangler d1 execute DB --remote --file=admin-1761952472067.sql
```

---

## 3️⃣ Verify Changes

```bash
cd symbolai-worker

# Check test users are deactivated
npx wrangler d1 execute DB --remote --command="SELECT id, username, is_active FROM users_new WHERE id LIKE 'user_%';"

# Check admin created
npx wrangler d1 execute DB --remote --command="SELECT id, username, email, is_active FROM users_new WHERE username = 'admin';"
```

---

## 4️⃣ Test Login

```bash
# Test user should FAIL
curl -X POST https://symbolai.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"supervisor_laban","password":"laban1010"}'

# New admin should SUCCEED
curl -X POST https://symbolai.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"JYElfpfK3kVJkOTqPpYZ9TRZ"}'
```

---

## 5️⃣ Setup Cloudflare Rate Limiting (Manual)

1. Go to: https://dash.cloudflare.com
2. Domain: `symbolai.net`
3. Security → WAF → Rate limiting rules
4. Create 4 rules (see `CLOUDFLARE_RATE_LIMITING_SETUP.md`)

---

## 6️⃣ Cleanup

```bash
cd /home/user/-lmm
rm admin-1761952472067.sql
```

---

## 🔄 Rollback (if needed)

```bash
# Reactivate test users
npx wrangler d1 execute DB --remote --command="UPDATE users_new SET is_active = 1 WHERE id LIKE 'user_%';"

# Delete new admin
npx wrangler d1 execute DB --remote --command="DELETE FROM users_new WHERE id = 'admin_1761952472064_c62e26ec';"
```

---

## ✅ Checklist

- [ ] Admin password saved in password manager
- [ ] Wrangler authenticated
- [ ] Test users deactivated
- [ ] Admin user created
- [ ] Verification queries passed
- [ ] Login tests passed
- [ ] Cloudflare rules created
- [ ] SQL file deleted
- [ ] SECURITY.md updated
- [ ] Changes committed to git

---

**Full Documentation:**
- `REMOTE_EXECUTION_GUIDE.md` - Complete remote execution guide
- `PHASE_1_EXECUTION_SUMMARY.md` - Detailed step-by-step
- `CLOUDFLARE_RATE_LIMITING_SETUP.md` - Rate limiting rules
- `SECURITY_FIX_MASTER_PLAN.md` - Overall security strategy
