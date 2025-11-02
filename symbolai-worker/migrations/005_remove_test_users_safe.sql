-- =====================================================
-- SAFE Test User Removal Strategy
-- Created: 2025-10-31
-- Purpose: Remove test users while preserving audit trail
-- =====================================================

-- ⚠️ WARNING: This will affect the following:
-- - 10 test users (supervisors, partners, employees)
-- - 2 test branches (branch_1010, branch_2020)
-- - Related audit logs (optional: can be preserved)
-- - Related email logs (optional: can be preserved)

-- =====================================================
-- STRATEGY 1: DEACTIVATE (RECOMMENDED)
-- Preserves all data and audit trail
-- Users cannot login but data remains
-- =====================================================

-- Step 1.1: Deactivate test users
UPDATE users_new
SET is_active = 0,
    updated_at = datetime('now')
WHERE id IN (
  'user_supervisor_1010',
  'user_supervisor_2020',
  'user_partner_1010',
  'user_partner_2020',
  'user_employee_1010_1',
  'user_employee_1010_2',
  'user_employee_1010_3',
  'user_employee_1010_4',
  'user_employee_2020_1',
  'user_employee_2020_2'
);

-- Step 1.2: Deactivate test branches
UPDATE branches
SET is_active = 0,
    updated_at = datetime('now')
WHERE id IN ('branch_1010', 'branch_2020');

-- Verification query
SELECT
  'DEACTIVATED_USERS' as type,
  COUNT(*) as count
FROM users_new
WHERE is_active = 0
  AND (id LIKE 'user_%_1010%' OR id LIKE 'user_%_2020%')

UNION ALL

SELECT
  'DEACTIVATED_BRANCHES' as type,
  COUNT(*) as count
FROM branches
WHERE is_active = 0
  AND id IN ('branch_1010', 'branch_2020');

-- =====================================================
-- STRATEGY 2: SOFT DELETE WITH AUDIT PRESERVATION
-- Marks users as deleted but keeps audit logs
-- =====================================================

-- Add deleted_at column if not exists
-- ALTER TABLE users_new ADD COLUMN deleted_at TEXT;

-- Mark as deleted
-- UPDATE users_new
-- SET deleted_at = datetime('now'),
--     is_active = 0
-- WHERE id IN (...);

-- =====================================================
-- STRATEGY 3: HARD DELETE (USE WITH CAUTION!)
-- Permanently removes all data
-- Only use if you're sure no audit trail is needed
-- =====================================================

-- UNCOMMENT THE FOLLOWING ONLY IF YOU WANT PERMANENT DELETION:

-- Step 3.1: Delete audit logs first (to avoid FK constraint)
-- DELETE FROM audit_logs
-- WHERE user_id IN (
--   'user_supervisor_1010',
--   'user_supervisor_2020',
--   'user_partner_1010',
--   'user_partner_2020',
--   'user_employee_1010_1',
--   'user_employee_1010_2',
--   'user_employee_1010_3',
--   'user_employee_1010_4',
--   'user_employee_2020_1',
--   'user_employee_2020_2'
-- );

-- Step 3.2: Delete email logs (optional - no FK constraint)
-- DELETE FROM email_logs
-- WHERE user_id IN (...);

-- Step 3.3: Delete test employee records
-- DELETE FROM employees
-- WHERE id IN (
--   'emp_rec_1010_1',
--   'emp_rec_1010_2',
--   'emp_rec_1010_3',
--   'emp_rec_1010_4',
--   'emp_rec_2020_1',
--   'emp_rec_2020_2'
-- );

-- Step 3.4: Delete test users
-- DELETE FROM users_new
-- WHERE id IN (...);

-- Step 3.5: Delete test branches
-- DELETE FROM branches
-- WHERE id IN ('branch_1010', 'branch_2020');

-- =====================================================
-- Rollback Plan
-- =====================================================

-- To rollback DEACTIVATION (Strategy 1):
-- UPDATE users_new SET is_active = 1 WHERE id IN (...);
-- UPDATE branches SET is_active = 1 WHERE id IN ('branch_1010', 'branch_2020');

-- To rollback DELETION (Strategy 3):
-- Re-run migrations/003_seed_branches_and_users_hashed.sql
-- Note: This will NOT restore deleted audit logs!

-- =====================================================
-- Post-Execution Verification
-- =====================================================

-- Check remaining test users
SELECT
  id,
  username,
  is_active,
  deleted_at
FROM users_new
WHERE id LIKE 'user_%'
ORDER BY id;

-- Check if any active sessions exist
-- (Note: Sessions are in KV, not DB)
-- You'll need to check KV namespace separately

-- =====================================================
-- Recommendations
-- =====================================================

-- ✅ RECOMMENDED: Use Strategy 1 (Deactivate)
-- Pros:
--   - Preserves audit trail
--   - Reversible
--   - No data loss
--   - Compliant with audit requirements
-- Cons:
--   - Data remains in database (minimal storage impact)

-- ⚠️ NOT RECOMMENDED: Strategy 3 (Hard Delete)
-- Pros:
--   - Clean database
--   - Removes all traces
-- Cons:
--   - Irreversible
--   - Loses audit trail
--   - May violate compliance requirements
--   - Risk of accidental data loss

-- =====================================================
-- Execution Instructions
-- =====================================================

-- For LOCAL testing:
-- wrangler d1 execute DB --local --file=./migrations/005_remove_test_users_safe.sql

-- For PRODUCTION (CAREFUL!):
-- wrangler d1 execute DB --remote --file=./migrations/005_remove_test_users_safe.sql

-- =====================================================
