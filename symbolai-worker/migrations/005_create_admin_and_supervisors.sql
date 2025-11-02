-- =========================================
-- Admin and Supervisor Users Migration
-- Generated: 2025-11-01T20:12:18.411Z
-- =========================================

-- Delete old supervisors if they exist
DELETE FROM users_new WHERE id IN ('user_supervisor_1010', 'user_supervisor_2020');

-- User: Omar123 (Password: Omar101010)
INSERT OR REPLACE INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)
VALUES ('user_admin_main', 'Omar123', '3004eae67e4442607830ed972c090afd:23d05685a1b1cd59d3d911ede464c6764129c49a2d4a0679be6f312b4aec99f4', NULL, 'عمر - المدير الرئيسي', NULL, 'role_admin', NULL, 1);

-- User: Aa123123 (Password: Aa12341234)
INSERT OR REPLACE INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)
VALUES ('user_supervisor_laban_new', 'Aa123123', '2a392d7604e50212ba32a0315272f0ce:86d3e07f707385e73486753e897465131579f9b2f2c062c7c7bbf70263b07698', 'Galalbdo766@gmail.com', 'عبدالحي جلال - مشرف فرع لبن', '+966501234567', 'role_supervisor', 'branch_1010', 1);

-- User: At123123 (Password: At123123)
INSERT OR REPLACE INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)
VALUES ('user_supervisor_tuwaiq_new', 'At123123', 'ff824d550a1d8b8823a35950ea448805:ddff5df450237ec805086972947f3e06cf10f48e97e7db468ae008335ee903a4', 'mohamedismaelebrhem@gmail.com', 'محمد إسماعيل - مشرف فرع طويق', '+966501234568', 'role_supervisor', 'branch_2020', 1);

-- =========================================
-- Summary of Created Users
-- =========================================
-- Admin: 1
--   Username: Omar123
--   Password: Omar101010
--   Role: Admin (full system access)
--
-- Supervisors: 2
--   Laban Branch:
--     Username: Aa123123
--     Password: Aa12341234
--     Email: Galalbdo766@gmail.com
--     Receives: Laban branch notifications
--
--   Tuwaiq Branch:
--     Username: At123123
--     Password: At123123
--     Email: mohamedismaelebrhem@gmail.com
--     Receives: Tuwaiq branch notifications
-- =========================================
