-- =====================================================
-- Update Admin Password
-- Created: 2025-11-12
-- Description: Update admin password to Omar101010
-- =====================================================

-- Update admin password (SHA-256 hash of "Omar101010")
UPDATE users_new
SET password = 'd3d95716f02dea05fde0c75ce8d0aee0016718722d67d8ba5b44ab25feee0ccf',
    updated_at = datetime('now')
WHERE username = 'admin' AND role_id = 'role_admin';

-- Verify the update
SELECT id, username, email, full_name, role_id, is_active, updated_at
FROM users_new
WHERE username = 'admin';
