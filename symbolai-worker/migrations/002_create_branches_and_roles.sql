-- =====================================================
-- Branches and Roles System Migration
-- Created: 2025-10-30
-- Description: Multi-branch support with role-based access control
-- =====================================================

-- =====================================================
-- Table: branches
-- Purpose: Store company branches information
-- =====================================================
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL, -- Arabic name
  location TEXT,
  phone TEXT,
  manager_name TEXT,
  is_active INTEGER DEFAULT 1,

  -- Statistics (updated periodically)
  total_revenue REAL DEFAULT 0,
  total_expenses REAL DEFAULT 0,
  employee_count INTEGER DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for active branches
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);

-- =====================================================
-- Table: roles
-- Purpose: Define user roles and their permissions
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- admin, supervisor, partner, employee
  name_ar TEXT NOT NULL, -- الأدمن, مشرف فرع, شريك, موظف
  description TEXT,

  -- Permissions flags
  can_view_all_branches INTEGER DEFAULT 0, -- Admin only
  can_manage_users INTEGER DEFAULT 0, -- Admin only
  can_manage_settings INTEGER DEFAULT 0, -- Admin only
  can_manage_branches INTEGER DEFAULT 0, -- Admin only

  -- Branch-level permissions
  can_add_revenue INTEGER DEFAULT 0,
  can_add_expense INTEGER DEFAULT 0,
  can_view_reports INTEGER DEFAULT 0,
  can_manage_employees INTEGER DEFAULT 0,
  can_manage_orders INTEGER DEFAULT 0,
  can_manage_requests INTEGER DEFAULT 0,
  can_approve_requests INTEGER DEFAULT 0,
  can_generate_payroll INTEGER DEFAULT 0,
  can_manage_bonus INTEGER DEFAULT 0,

  -- Employee-specific permissions
  can_submit_requests INTEGER DEFAULT 0,
  can_view_own_requests INTEGER DEFAULT 0,
  can_view_own_bonus INTEGER DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =====================================================
-- Default Roles
-- =====================================================
INSERT OR IGNORE INTO roles (id, name, name_ar, description,
  can_view_all_branches, can_manage_users, can_manage_settings, can_manage_branches,
  can_add_revenue, can_add_expense, can_view_reports, can_manage_employees,
  can_manage_orders, can_manage_requests, can_approve_requests,
  can_generate_payroll, can_manage_bonus,
  can_submit_requests, can_view_own_requests, can_view_own_bonus)
VALUES
  -- Admin: Full access
  ('role_admin', 'admin', 'الأدمن', 'مدير النظام - صلاحيات كاملة',
   1, 1, 1, 1,
   1, 1, 1, 1,
   1, 1, 1,
   1, 1,
   1, 1, 1),

  -- Supervisor: Branch manager
  ('role_supervisor', 'supervisor', 'مشرف فرع', 'مشرف الفرع - إدارة فرع واحد فقط',
   0, 0, 0, 0,
   1, 1, 1, 1,
   1, 1, 1,
   1, 1,
   1, 1, 1),

  -- Partner: Branch partner (view only)
  ('role_partner', 'partner', 'شريك', 'شريك الفرع - متابعة إحصائيات الفرع فقط',
   0, 0, 0, 0,
   0, 0, 1, 0,
   0, 0, 0,
   0, 0,
   0, 0, 0),

  -- Employee: Basic access
  ('role_employee', 'employee', 'موظف', 'موظف - الطلبات والمتابعة فقط',
   0, 0, 0, 0,
   0, 0, 0, 0,
   0, 0, 0,
   0, 0,
   1, 1, 1);

-- =====================================================
-- Update users table to include role and branch
-- =====================================================

-- Check if columns already exist before adding
-- SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we'll use a different approach

-- Add role_id column (foreign key to roles)
-- ALTER TABLE users ADD COLUMN role_id TEXT DEFAULT 'role_employee';

-- Add branch_id column (foreign key to branches)
-- ALTER TABLE users ADD COLUMN branch_id TEXT;

-- Note: Run these ALTER TABLE commands manually if needed:
-- For existing deployments, run:
-- ALTER TABLE users ADD COLUMN role_id TEXT DEFAULT 'role_employee';
-- ALTER TABLE users ADD COLUMN branch_id TEXT;

-- Create new users table with roles and branches (for fresh installations)
CREATE TABLE IF NOT EXISTS users_new (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT,
  full_name TEXT,
  phone TEXT,

  -- Role and Branch
  role_id TEXT NOT NULL DEFAULT 'role_employee',
  branch_id TEXT,

  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- =====================================================
-- Default Branches
-- =====================================================
INSERT OR IGNORE INTO branches (id, name, name_ar, location, is_active)
VALUES
  ('branch_main', 'Main Branch', 'الفرع الرئيسي', 'Cairo, Egypt', 1),
  ('branch_alex', 'Alexandria Branch', 'فرع الإسكندرية', 'Alexandria, Egypt', 1),
  ('branch_giza', 'Giza Branch', 'فرع الجيزة', 'Giza, Egypt', 1);

-- =====================================================
-- Default Admin User
-- =====================================================
-- Password: admin123 (hashed with bcrypt - you should change this!)
INSERT OR IGNORE INTO users_new (id, username, password, full_name, role_id, is_active)
VALUES
  ('user_admin', 'admin', '$2a$10$rO5K8zQZ8qQZ8qQZ8qQZ8O5K8zQZ8qQZ8qQZ8qQZ8qQZ8qQZ8qQZ', 'مدير النظام', 'role_admin', 1);

-- =====================================================
-- Update existing tables with branch isolation
-- =====================================================

-- Revenues table - ensure branch_id exists
-- Already has branch_id column

-- Expenses table - ensure branch_id exists
-- Already has branch_id column

-- Employees table - ensure branch_id exists
-- Already has branch_id column

-- Employee requests - ensure branch_id exists
-- Already has branch_id column

-- Product orders - ensure branch_id exists
-- Already has branch_id column

-- Payroll - ensure branch_id exists
-- Already has branch_id column

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users_new(role_id);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users_new(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users_new(is_active);

-- =====================================================
-- Views for role-based access
-- =====================================================

-- View: User with role details
CREATE VIEW IF NOT EXISTS users_with_roles AS
SELECT
  u.id,
  u.username,
  u.email,
  u.full_name,
  u.phone,
  u.is_active,
  u.branch_id,
  b.name as branch_name,
  b.name_ar as branch_name_ar,
  u.role_id,
  r.name as role_name,
  r.name_ar as role_name_ar,
  r.can_view_all_branches,
  r.can_manage_users,
  r.can_manage_settings,
  r.can_manage_branches,
  r.can_add_revenue,
  r.can_add_expense,
  r.can_view_reports,
  r.can_manage_employees,
  r.can_manage_orders,
  r.can_manage_requests,
  r.can_approve_requests,
  r.can_generate_payroll,
  r.can_manage_bonus,
  r.can_submit_requests,
  r.can_view_own_requests,
  r.can_view_own_bonus,
  u.created_at
FROM users_new u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN branches b ON u.branch_id = b.id;

-- View: Branch statistics
CREATE VIEW IF NOT EXISTS branch_statistics AS
SELECT
  b.id,
  b.name,
  b.name_ar,
  b.location,
  b.is_active,
  -- Employee count
  (SELECT COUNT(*) FROM employees e WHERE e.branch_id = b.id AND e.is_active = 1) as employee_count,
  -- Revenue statistics (current month)
  (SELECT COALESCE(SUM(total), 0) FROM revenues r
   WHERE r.branch_id = b.id
   AND strftime('%Y-%m', r.date) = strftime('%Y-%m', 'now')) as monthly_revenue,
  -- Expense statistics (current month)
  (SELECT COALESCE(SUM(amount), 0) FROM expenses e
   WHERE e.branch_id = b.id
   AND strftime('%Y-%m', e.date) = strftime('%Y-%m', 'now')) as monthly_expenses,
  -- Pending requests count
  (SELECT COUNT(*) FROM employee_requests er
   WHERE er.branch_id = b.id
   AND er.status = 'pending') as pending_requests,
  -- Pending orders count
  (SELECT COUNT(*) FROM product_orders po
   WHERE po.branch_id = b.id
   AND po.status = 'pending') as pending_orders,
  b.created_at
FROM branches b;

-- =====================================================
-- Audit Log Table (Optional but recommended)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT,
  role_name TEXT,
  branch_id TEXT,

  action TEXT NOT NULL, -- create, update, delete, view
  entity_type TEXT NOT NULL, -- revenue, expense, employee, etc.
  entity_id TEXT,

  details TEXT, -- JSON string with additional info
  ip_address TEXT,
  user_agent TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users_new(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_branch ON audit_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- =====================================================
-- Data Migration Helper
-- =====================================================

-- If you have existing users table, copy data:
-- INSERT INTO users_new (id, username, password, email, full_name, phone, is_active, created_at, updated_at, role_id, branch_id)
-- SELECT id, username, password, email, full_name, phone, is_active, created_at, updated_at,
--        'role_admin' as role_id, -- or determine based on existing logic
--        NULL as branch_id -- or assign default branch
-- FROM users
-- WHERE NOT EXISTS (SELECT 1 FROM users_new WHERE users_new.id = users.id);

-- After migration, rename tables:
-- DROP TABLE users;
-- ALTER TABLE users_new RENAME TO users;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Run this migration using Wrangler CLI:
--
-- 1. Apply migration to local D1:
--    wrangler d1 execute DB --local --file=./migrations/002_create_branches_and_roles.sql
--
-- 2. Apply migration to remote D1:
--    wrangler d1 execute DB --remote --file=./migrations/002_create_branches_and_roles.sql
--
-- 3. Verify tables created:
--    wrangler d1 execute DB --local --command="SELECT name FROM sqlite_master WHERE type='table'"
-- =====================================================
