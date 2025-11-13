-- =====================================================
-- Update Supervisors Names
-- Created: 2025-11-12
-- Description: Update supervisor names to correct ones
-- =====================================================

-- Update Tuwaiq supervisor name: عبدالله خالد -> محمد إسماعيل
UPDATE users_new
SET full_name = 'محمد إسماعيل - مشرف فرع طويق',
    updated_at = datetime('now')
WHERE username = 'supervisor_tuwaiq' AND role_id = 'role_supervisor' AND branch_id = 'branch_2020';

-- Update Laban supervisor name: محمد أحمد -> عبدالحي جلال
UPDATE users_new
SET full_name = 'عبدالحي جلال - مشرف فرع لبن',
    updated_at = datetime('now')
WHERE username = 'supervisor_laban' AND role_id = 'role_supervisor' AND branch_id = 'branch_1010';

-- Update branch manager name for Tuwaiq
UPDATE branches
SET manager_name = 'محمد إسماعيل',
    updated_at = datetime('now')
WHERE id = 'branch_2020';

-- Update branch manager name for Laban
UPDATE branches
SET manager_name = 'عبدالحي جلال',
    updated_at = datetime('now')
WHERE id = 'branch_1010';

-- Verify the updates
SELECT id, username, full_name, role_id, branch_id, is_active, updated_at
FROM users_new
WHERE username IN ('supervisor_tuwaiq', 'supervisor_laban');

SELECT id, name, name_ar, manager_name, updated_at
FROM branches
WHERE id IN ('branch_2020', 'branch_1010');
