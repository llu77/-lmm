-- =====================================================
-- Financial Tables Migration
-- Created: 2025-11-16
-- Description: Create tables for revenues, bonus, payroll, and related entities
-- =====================================================

-- =====================================================
-- Table: employees
-- Purpose: Store employee information for payroll
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  national_id TEXT,
  phone TEXT,
  email TEXT,
  
  -- Salary components
  base_salary REAL DEFAULT 0,
  supervisor_allowance REAL DEFAULT 0,
  incentives REAL DEFAULT 0,
  
  is_active INTEGER DEFAULT 1,
  hire_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- =====================================================
-- Table: revenues
-- Purpose: Store daily revenue records per branch
-- =====================================================
CREATE TABLE IF NOT EXISTS revenues (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  date TEXT NOT NULL,
  
  -- Payment methods
  cash REAL DEFAULT 0,
  network REAL DEFAULT 0,
  budget REAL DEFAULT 0,
  
  -- Total entered by user
  total REAL NOT NULL,
  
  -- Calculated total for verification
  calculated_total REAL,
  is_matched INTEGER DEFAULT 1,
  
  -- Optional: employee contributions as JSON
  employees TEXT,
  
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (created_by) REFERENCES users_new(id)
);

-- =====================================================
-- Table: revenue_employee_contributions
-- Purpose: Track individual employee revenue contributions
-- =====================================================
CREATE TABLE IF NOT EXISTS revenue_employee_contributions (
  id TEXT PRIMARY KEY,
  revenue_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (revenue_id) REFERENCES revenues(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- =====================================================
-- Table: bonus_records
-- Purpose: Store weekly bonus calculations
-- =====================================================
CREATE TABLE IF NOT EXISTS bonus_records (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  
  -- Period information
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL, -- 1-5
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  
  -- Bonus data (JSON array of employee bonuses)
  employee_bonuses TEXT NOT NULL,
  total_paid REAL NOT NULL,
  
  status TEXT DEFAULT 'draft', -- draft, approved, paid
  notes TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  approved_at TEXT,
  approved_by TEXT,
  
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (created_by) REFERENCES users_new(id),
  FOREIGN KEY (approved_by) REFERENCES users_new(id),
  
  -- Ensure one bonus record per branch per week
  UNIQUE(branch_id, year, month, week_number)
);

-- =====================================================
-- Table: advances
-- Purpose: Track salary advances for employees
-- =====================================================
CREATE TABLE IF NOT EXISTS advances (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  
  amount REAL NOT NULL,
  
  -- Period when advance is deducted
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  
  reason TEXT,
  request_date TEXT NOT NULL,
  approved_date TEXT,
  approved_by TEXT,
  
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (approved_by) REFERENCES users_new(id),
  FOREIGN KEY (created_by) REFERENCES users_new(id)
);

-- =====================================================
-- Table: deductions
-- Purpose: Track salary deductions for employees
-- =====================================================
CREATE TABLE IF NOT EXISTS deductions (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  
  amount REAL NOT NULL,
  
  -- Period when deduction is applied
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  
  deduction_type TEXT, -- absence, violation, other
  reason TEXT NOT NULL,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (created_by) REFERENCES users_new(id)
);

-- =====================================================
-- Table: payroll_records
-- Purpose: Store monthly payroll calculations
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll_records (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  
  -- Period
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  
  -- Payroll data (JSON array of employee payroll details)
  payroll_data TEXT NOT NULL,
  
  -- Summary totals
  total_gross_salary REAL NOT NULL,
  total_bonus REAL NOT NULL,
  total_earnings REAL NOT NULL,
  total_advances REAL NOT NULL,
  total_deductions REAL NOT NULL,
  total_net_salary REAL NOT NULL,
  
  employee_count INTEGER NOT NULL,
  
  status TEXT DEFAULT 'draft', -- draft, approved, paid
  notes TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  approved_at TEXT,
  approved_by TEXT,
  paid_at TEXT,
  
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (created_by) REFERENCES users_new(id),
  FOREIGN KEY (approved_by) REFERENCES users_new(id),
  
  -- Ensure one payroll record per branch per month
  UNIQUE(branch_id, year, month)
);

-- =====================================================
-- Table: employee_requests
-- Purpose: Store employee requests (advances, vacation, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_requests (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  user_id TEXT, -- Link to user account if employee has login
  
  employee_name TEXT NOT NULL,
  national_id TEXT,
  
  request_type TEXT NOT NULL, -- سلفة, إجازة, صرف متأخرات, استئذان, مخالفة, استقالة
  request_date TEXT NOT NULL,
  
  -- Type-specific fields
  advance_amount REAL,
  vacation_date TEXT,
  dues_amount REAL,
  permission_date TEXT,
  violation_date TEXT,
  violation_description TEXT,
  resignation_date TEXT,
  resignation_reason TEXT,
  
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  response_notes TEXT,
  responded_at TEXT,
  responded_by TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (user_id) REFERENCES users_new(id),
  FOREIGN KEY (responded_by) REFERENCES users_new(id)
);

-- =====================================================
-- Table: notifications
-- Purpose: System notifications for users
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  user_id TEXT, -- NULL for broadcast notifications
  
  type TEXT NOT NULL, -- revenue_mismatch, employee_request, payroll_ready, etc.
  severity TEXT DEFAULT 'info', -- info, warning, high, critical
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  action_required INTEGER DEFAULT 0,
  action_url TEXT,
  related_entity TEXT, -- ID of related record
  
  is_read INTEGER DEFAULT 0,
  read_at TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (user_id) REFERENCES users_new(id)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_national_id ON employees(national_id);

-- Revenues
CREATE INDEX IF NOT EXISTS idx_revenues_branch_date ON revenues(branch_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_revenues_date ON revenues(date DESC);
CREATE INDEX IF NOT EXISTS idx_revenues_created ON revenues(created_at DESC);

-- Revenue contributions
CREATE INDEX IF NOT EXISTS idx_revenue_contributions_revenue ON revenue_employee_contributions(revenue_id);
CREATE INDEX IF NOT EXISTS idx_revenue_contributions_employee ON revenue_employee_contributions(employee_id);

-- Bonus records
CREATE INDEX IF NOT EXISTS idx_bonus_branch_period ON bonus_records(branch_id, year DESC, month);
CREATE INDEX IF NOT EXISTS idx_bonus_status ON bonus_records(status);

-- Advances
CREATE INDEX IF NOT EXISTS idx_advances_employee_period ON advances(employee_id, year DESC, month);
CREATE INDEX IF NOT EXISTS idx_advances_branch_period ON advances(branch_id, year DESC, month);
CREATE INDEX IF NOT EXISTS idx_advances_status ON advances(status);

-- Deductions
CREATE INDEX IF NOT EXISTS idx_deductions_employee_period ON deductions(employee_id, year DESC, month);
CREATE INDEX IF NOT EXISTS idx_deductions_branch_period ON deductions(branch_id, year DESC, month);

-- Payroll records
CREATE INDEX IF NOT EXISTS idx_payroll_branch_period ON payroll_records(branch_id, year DESC, month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_records(status);

-- Employee requests
CREATE INDEX IF NOT EXISTS idx_requests_branch_date ON employee_requests(branch_id, request_date DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status ON employee_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type ON employee_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_requests_employee ON employee_requests(employee_name);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_branch ON notifications(branch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- Views for Reporting
-- =====================================================

-- View: Monthly revenue summary per branch
CREATE VIEW IF NOT EXISTS monthly_revenue_summary AS
SELECT
  branch_id,
  strftime('%Y', date) as year,
  strftime('%m', date) as month,
  COUNT(*) as record_count,
  SUM(cash) as total_cash,
  SUM(network) as total_network,
  SUM(budget) as total_budget,
  SUM(total) as total_revenue,
  SUM(CASE WHEN is_matched = 0 THEN 1 ELSE 0 END) as mismatched_count
FROM revenues
GROUP BY branch_id, year, month
ORDER BY branch_id, year DESC, month DESC;

-- View: Employee payroll summary
CREATE VIEW IF NOT EXISTS employee_payroll_summary AS
SELECT
  e.id as employee_id,
  e.employee_name,
  e.national_id,
  e.branch_id,
  b.name_ar as branch_name,
  e.base_salary,
  e.supervisor_allowance,
  e.incentives,
  (e.base_salary + e.supervisor_allowance + e.incentives) as gross_salary,
  e.is_active,
  e.hire_date
FROM employees e
LEFT JOIN branches b ON e.branch_id = b.id
ORDER BY e.branch_id, e.employee_name;

-- View: Pending requests summary
CREATE VIEW IF NOT EXISTS pending_requests_summary AS
SELECT
  branch_id,
  request_type,
  COUNT(*) as count,
  SUM(CASE WHEN request_type = 'سلفة' THEN advance_amount ELSE 0 END) as total_advances_requested,
  SUM(CASE WHEN request_type = 'صرف متأخرات' THEN dues_amount ELSE 0 END) as total_dues_requested
FROM employee_requests
WHERE status = 'pending'
GROUP BY branch_id, request_type;

-- =====================================================
-- Triggers for Data Integrity
-- =====================================================

-- Auto-calculate revenue match status
CREATE TRIGGER IF NOT EXISTS trg_revenue_calculate_match
AFTER INSERT ON revenues
BEGIN
  UPDATE revenues
  SET calculated_total = (NEW.cash + NEW.network + NEW.budget),
      is_matched = CASE 
        WHEN ABS((NEW.cash + NEW.network + NEW.budget) - NEW.total) < 0.01 
        THEN 1 
        ELSE 0 
      END
  WHERE id = NEW.id;
END;

-- Update employee updated_at on changes
CREATE TRIGGER IF NOT EXISTS trg_employees_update_timestamp
AFTER UPDATE ON employees
BEGIN
  UPDATE employees
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- Update revenue updated_at on changes
CREATE TRIGGER IF NOT EXISTS trg_revenues_update_timestamp
AFTER UPDATE ON revenues
BEGIN
  UPDATE revenues
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Run this migration using Wrangler CLI:
--
-- Local:
--   cd symbolai-worker
--   npx wrangler d1 execute symbolai-financial-db --local --file=./migrations/008_create_financial_tables.sql
--
-- Remote (Production):
--   export CLOUDFLARE_API_TOKEN="your-token-here"
--   npx wrangler d1 execute symbolai-financial-db --remote --file=./migrations/008_create_financial_tables.sql
--
-- Verify:
--   npx wrangler d1 execute symbolai-financial-db --local --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
-- =====================================================
