# Seed Data Documentation

## Overview

This document describes the seed data for the SymbolAI Worker RBAC system, including branches, users, and employees.

## Migration File

**File**: `003_seed_branches_and_users_hashed.sql`

This migration populates the database with initial test data for development and testing purposes.

## Generated Data

### Branches (2)

| ID | Name (EN) | Name (AR) | Location | Manager | Team Size |
|---|---|---|---|---|---|
| branch_1010 | Laban Branch | فرع لبن | Riyadh - Laban District | محمد أحمد | 1 Supervisor + 4 Employees = 5 |
| branch_2020 | Tuwaiq Branch | فرع طويق | Riyadh - Tuwaiq District | عبدالله خالد | 1 Supervisor + 2 Employees = 3 |

### Users (10 total: 2 Supervisors + 2 Partners + 6 Employees)

#### Supervisors (2)

| Username | Password | Branch | Role | Full Name |
|---|---|---|---|---|
| supervisor_laban | laban1010 | branch_1010 | Supervisor | محمد أحمد - مشرف فرع لبن |
| supervisor_tuwaiq | tuwaiq2020 | branch_2020 | Supervisor | عبدالله خالد - مشرف فرع طويق |

**Permissions**: Can add revenues, expenses, manage employees, manage orders, manage requests, generate payroll, manage bonus for their assigned branch only.

#### Partners (2)

| Username | Password | Branch | Role | Full Name |
|---|---|---|---|---|
| partner_laban | partner1010 | branch_1010 | Partner | سعد عبدالرحمن - شريك فرع لبن |
| partner_tuwaiq | partner2020 | branch_2020 | Partner | فيصل ناصر - شريك فرع طويق |

**Permissions**: Read-only access to view reports for their assigned branch only.

#### Employees (6 total: 4 Laban + 2 Tuwaiq)

#### Laban Branch Employees (4)

| Username | Password | Branch | Role | Full Name |
|---|---|---|---|---|
| emp_laban_ahmad | emp1010 | branch_1010 | Employee | أحمد علي - موظف فرع لبن |
| emp_laban_omar | emp1010 | branch_1010 | Employee | عمر حسن - موظف فرع لبن |
| emp_laban_fatima | emp1010 | branch_1010 | Employee | فاطمة أحمد - موظف فرع لبن |
| emp_laban_noura | emp1010 | branch_1010 | Employee | نورة خالد - موظف فرع لبن |

#### Tuwaiq Branch Employees (2)

| Username | Password | Branch | Role | Full Name |
|---|---|---|---|---|
| emp_tuwaiq_khalid | emp2020 | branch_2020 | Employee | خالد سالم - موظف فرع طويق |
| emp_tuwaiq_youssef | emp2020 | branch_2020 | Employee | يوسف فهد - موظف فرع طويق |

**Permissions**: Can submit requests, view their own requests, view their own bonus.

### Employee Records (6 total: 4 Laban + 2 Tuwaiq)

#### Laban Branch Employees (4)

| ID | Name | National ID | Base Salary | Supervisor Allowance | Incentives | Total |
|---|---|---|---|---|---|---|
| emp_rec_1010_1 | أحمد علي محمد | 1234567890 | 5000 | 0 | 500 | 5500 |
| emp_rec_1010_2 | عمر حسن عبدالله | 1234567891 | 4500 | 0 | 300 | 4800 |
| emp_rec_1010_3 | فاطمة أحمد سعيد | 1234567892 | 4000 | 0 | 200 | 4200 |
| emp_rec_1010_4 | نورة خالد محمد | 1234567893 | 4200 | 0 | 250 | 4450 |

**Total Salaries**: 18,950 SAR

#### Tuwaiq Branch Employees (2)

| ID | Name | National ID | Base Salary | Supervisor Allowance | Incentives | Total |
|---|---|---|---|---|---|---|
| emp_rec_2020_1 | خالد سالم عبدالله | 2234567890 | 5200 | 0 | 600 | 5800 |
| emp_rec_2020_2 | يوسف فهد أحمد | 2234567891 | 4800 | 0 | 400 | 5200 |

**Total Salaries**: 11,000 SAR

## How to Apply Seed Data

### Option 1: Direct SQL Execution

If using Cloudflare D1 locally:

```bash
# Apply the seed data migration
wrangler d1 execute symbolai-db --local --file=migrations/003_seed_branches_and_users_hashed.sql

# Or for production
wrangler d1 execute symbolai-db --file=migrations/003_seed_branches_and_users_hashed.sql
```

### Option 2: Via Cloudflare Dashboard

1. Go to Cloudflare Dashboard → D1 Databases
2. Select your database (e.g., `symbolai-db`)
3. Go to the "Console" tab
4. Copy and paste the contents of `003_seed_branches_and_users_hashed.sql`
5. Click "Execute"

### Option 3: Via API Endpoints (Recommended for Production)

Use the management APIs to create data programmatically:

```bash
# Login as admin first
curl -X POST https://your-worker.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-admin-password"}'

# Create branches
curl -X POST https://your-worker.workers.dev/api/branches/create \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{"name": "Laban Branch", "name_ar": "فرع لبن", "location": "Riyadh - Laban District", "phone": "+966501234567", "manager_name": "محمد أحمد"}'

# Create users
curl -X POST https://your-worker.workers.dev/api/users/create \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{"username": "supervisor_laban", "password": "laban1010", "email": "supervisor.laban@symbolai.net", "full_name": "محمد أحمد - مشرف فرع لبن", "role_id": "role_supervisor", "branch_id": "branch_1010"}'
```

## Regenerating Seed Data

If you need to regenerate the seed data with different passwords or data:

```bash
# Edit the script
cd symbolai-worker/scripts
nano generate-seed-data.js

# Regenerate the SQL file
node generate-seed-data.js > ../migrations/003_seed_branches_and_users_hashed.sql
```

## Security Notes

⚠️ **IMPORTANT**: These are test credentials for development only!

- **DO NOT use these credentials in production**
- All passwords are simple and easily guessable
- Passwords are SHA-256 hashed (as per the system's authentication mechanism)
- For production, use strong, unique passwords for each user

### Recommended Password Policy for Production

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, and symbols
- No dictionary words
- Different password for each user
- Regular password rotation

## Testing RBAC

Use these test credentials to verify RBAC functionality:

### Test 1: Supervisor Access Control

1. Login as `supervisor_laban` / `laban1010`
2. Try to add revenue for branch_1010 → ✅ Should succeed
3. Try to add revenue for branch_2020 → ❌ Should fail (403 Forbidden)
4. Try to view reports for branch_1010 → ✅ Should succeed
5. Try to view reports for branch_2020 → ❌ Should only see branch_1010 data

### Test 2: Partner Read-Only Access

1. Login as `partner_laban` / `partner1010`
2. Try to view reports for branch_1010 → ✅ Should succeed
3. Try to add revenue → ❌ Should fail (403 Forbidden)
4. Try to add expense → ❌ Should fail (403 Forbidden)
5. Try to modify any data → ❌ Should fail (403 Forbidden)

### Test 3: Employee Limited Access

1. Login as `emp_laban_ahmad` / `emp1010`
2. Try to submit a request → ✅ Should succeed
3. Try to view own requests → ✅ Should succeed
4. Try to view other employee's requests → ❌ Should fail
5. Try to view bonus → ✅ Should see only their own bonus
6. Try to add revenue → ❌ Should fail (403 Forbidden)

## Migration Order

Ensure migrations are applied in the correct order:

1. `001_create_email_tables.sql` - Email system tables
2. `002_create_branches_and_roles.sql` - RBAC tables and default roles
3. `003_seed_branches_and_users_hashed.sql` - Seed data (this file)

## Cleanup

To remove all seed data:

```sql
-- Remove employees
DELETE FROM employees WHERE branch_id IN ('branch_1010', 'branch_2020');

-- Remove users
DELETE FROM users_new WHERE branch_id IN ('branch_1010', 'branch_2020');

-- Remove branches
DELETE FROM branches WHERE id IN ('branch_1010', 'branch_2020');
```

## Contact

For questions about seed data or RBAC implementation, refer to:
- `RBAC_SYSTEM.md` - Complete RBAC documentation
- `RBAC_TASKS.md` - Implementation tasks and patterns
- `IMPLEMENTATION_SUMMARY.md` - Overall project status
