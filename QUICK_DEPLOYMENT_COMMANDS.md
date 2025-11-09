# Quick Deployment Commands

## Setup Commands (Run Once)

### 1. Create KV Namespace for Sessions
```bash
wrangler kv:namespace create "SESSIONS"
# Copy the ID from output and update symbolai-worker/wrangler.toml
```

### 2. Create R2 Bucket for Payroll PDFs
```bash
wrangler r2 bucket create symbolai-payrolls
```

### 3. Set Required Secrets
```bash
# AI Service
wrangler secret put ANTHROPIC_API_KEY

# Email Service
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_WEBHOOK_SECRET

# Zapier Integration
wrangler secret put ZAPIER_WEBHOOK_URL

# Session Security
wrangler secret put SESSION_SECRET
```

### 4. Run Database Migrations
```bash
# Navigate to the worker directory
cd symbolai-worker

# Run migrations in order
wrangler d1 execute DB --remote --file=./migrations/001_create_email_tables.sql
wrangler d1 execute DB --remote --file=./migrations/002_create_branches_and_roles.sql
wrangler d1 execute DB --remote --file=./migrations/003_seed_branches_and_users_hashed.sql
```

---

## Build & Deploy Commands

### Local Build
```bash
# Install dependencies
npm install --legacy-peer-deps

# Build the project
npm run build

# The build output will be in: symbolai-worker/dist/
```

### Deploy to Cloudflare Pages
```bash
# Option 1: Using Wrangler (from root directory)
npm run build
wrangler pages deploy symbolai-worker/dist --project-name=lkm-hr-system

# Option 2: Connect GitHub repo to Cloudflare Pages Dashboard
# Build command: npm run build
# Build output: symbolai-worker/dist
```

---

## Development Commands

### Run Tests
```bash
# Test authentication system
cd symbolai-worker && node test-auth.js

# Expected output: ✅ All authentication tests passed!
```

### Lint Code
```bash
npm run lint
```

### Type Check
```bash
npm run type-check
```

### Security Audit
```bash
npm audit
npm run audit:workers
```

---

## Database Management

### Query Database
```bash
# List all tables
wrangler d1 execute DB --remote --command="SELECT name FROM sqlite_master WHERE type='table'"

# Check roles
wrangler d1 execute DB --remote --command="SELECT * FROM roles"

# Check users
wrangler d1 execute DB --remote --command="SELECT id, username, email, role_id, branch_id, is_active FROM users_new"

# Check branches
wrangler d1 execute DB --remote --command="SELECT * FROM branches"
```

### Backup Database
```bash
# Export all data
wrangler d1 export DB --remote --output=backup-$(date +%Y%m%d).sql
```

---

## Troubleshooting Commands

### Check Build Output
```bash
ls -la symbolai-worker/dist/
```

### Clear and Rebuild
```bash
# Clear all caches and node_modules
rm -rf node_modules symbolai-worker/node_modules package-lock.json
rm -rf symbolai-worker/dist symbolai-worker/.astro

# Reinstall and rebuild
npm install --legacy-peer-deps
npm run build
```

### Check Cloudflare Services
```bash
# List KV namespaces
wrangler kv:namespace list

# List R2 buckets
wrangler r2 bucket list

# List D1 databases
wrangler d1 list

# Check deployment
wrangler pages deployment list --project-name=lkm-hr-system
```

---

## User Management

### Create New User (via SQL)
```bash
# Example: Create a new supervisor
wrangler d1 execute DB --remote --command="
INSERT INTO users_new (id, username, password, email, full_name, role_id, branch_id, is_active)
VALUES (
  'user_new_super',
  'newsupervisor',
  'YOUR_SHA256_HASH_HERE',
  'supervisor@example.com',
  'New Supervisor Name',
  'role_supervisor',
  'branch_1010',
  1
)"
```

### Deactivate User
```bash
wrangler d1 execute DB --remote --command="
UPDATE users_new SET is_active = 0 WHERE username = 'username_here'
"
```

### Change User Role
```bash
wrangler d1 execute DB --remote --command="
UPDATE users_new SET role_id = 'role_employee' WHERE username = 'username_here'
"
```

---

## Monitoring

### View Recent Logs
```bash
wrangler pages deployment tail --project-name=lkm-hr-system
```

### Check Audit Logs
```bash
wrangler d1 execute DB --remote --command="
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20
"
```

---

## Default Login Credentials

### Admin
- **Username:** admin
- **Password:** admin123
- ⚠️ **CHANGE IMMEDIATELY AFTER FIRST LOGIN**

### Test Accounts (Laban Branch)
- Supervisor: `supervisor_laban` / `laban1010`
- Partner: `partner_laban` / `partner1010`
- Employee: `emp_laban_ahmad` / `emp1010`

### Test Accounts (Tuwaiq Branch)
- Supervisor: `supervisor_tuwaiq` / `tuwaiq2020`
- Partner: `partner_tuwaiq` / `partner2020`
- Employee: `emp_tuwaiq_khalid` / `emp2020`

---

## Important Notes

1. **Always use `--legacy-peer-deps`** when running `npm install` due to React version compatibility
2. **KV Namespace ID** must be updated in `symbolai-worker/wrangler.toml` before deployment
3. **All secrets** must be set before the application will work properly
4. **Database migrations** must be run on production database before deploying
5. **Test locally** before deploying to production

---

## Emergency Rollback

If deployment fails or issues arise:

```bash
# List previous deployments
wrangler pages deployment list --project-name=lkm-hr-system

# Rollback to previous deployment
wrangler pages deployment rollback --project-name=lkm-hr-system
```

---

**Last Updated:** 2025-11-09  
**Status:** Production Ready
