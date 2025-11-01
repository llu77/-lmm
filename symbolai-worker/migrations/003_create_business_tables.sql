-- Migration 004: Create Core Business Tables
-- This migration creates all the essential business tables referenced throughout the codebase
-- Must be run BEFORE migration 003 (seed data) since seed data references these tables

-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  national_id TEXT,
  base_salary REAL NOT NULL DEFAULT 0,
  supervisor_allowance REAL NOT NULL DEFAULT 0,
  incentives REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_national_id ON employees(national_id);

-- ============================================================================
-- REVENUES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS revenues (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  date TEXT NOT NULL,
  cash REAL NOT NULL DEFAULT 0,
  network REAL NOT NULL DEFAULT 0,
  budget REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  calculated_total REAL NOT NULL DEFAULT 0,
  is_matched INTEGER NOT NULL DEFAULT 1,
  employees TEXT, -- JSON array of employee data
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_revenues_branch ON revenues(branch_id);
CREATE INDEX IF NOT EXISTS idx_revenues_date ON revenues(date);
CREATE INDEX IF NOT EXISTS idx_revenues_branch_date ON revenues(branch_id, date);

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  description TEXT,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_expenses_branch ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_date ON expenses(branch_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- ============================================================================
-- EMPLOYEE REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_requests (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  national_id TEXT,
  request_type TEXT NOT NULL, -- 'advance', 'vacation', 'dues', 'permission', 'violation', 'resignation'
  request_date TEXT NOT NULL,
  user_id TEXT,

  -- Request-specific fields
  advance_amount REAL,
  vacation_date TEXT,
  dues_amount REAL,
  permission_date TEXT,
  violation_date TEXT,
  violation_description TEXT,
  resignation_date TEXT,
  resignation_reason TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_response TEXT,
  response_date TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users_new(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_employee_requests_branch ON employee_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_employee_requests_user ON employee_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_requests_status ON employee_requests(status);
CREATE INDEX IF NOT EXISTS idx_employee_requests_type ON employee_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_employee_requests_date ON employee_requests(request_date);

-- ============================================================================
-- PRODUCT ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_orders (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  products TEXT NOT NULL, -- JSON array of products with quantities and prices
  grand_total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'completed', 'cancelled'
  is_draft INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_orders_branch ON product_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_employee ON product_orders(employee_name);
CREATE INDEX IF NOT EXISTS idx_product_orders_status ON product_orders(status);
CREATE INDEX IF NOT EXISTS idx_product_orders_draft ON product_orders(is_draft);
CREATE INDEX IF NOT EXISTS idx_product_orders_created ON product_orders(created_at);

-- ============================================================================
-- EMPLOYEE ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_orders (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  request_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  requested_by TEXT NOT NULL,
  assigned_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_employee_orders_branch ON employee_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_employee_orders_status ON employee_orders(status);
CREATE INDEX IF NOT EXISTS idx_employee_orders_priority ON employee_orders(priority);

-- ============================================================================
-- BONUS RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bonus_records (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  employee_bonuses TEXT NOT NULL, -- JSON array of {employeeId, employeeName, bonusAmount}
  total_bonus_paid REAL NOT NULL,
  revenue_snapshot TEXT, -- JSON snapshot of revenue data for the week
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users_new(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bonus_records_branch ON bonus_records(branch_id);
CREATE INDEX IF NOT EXISTS idx_bonus_records_period ON bonus_records(branch_id, month, year);
CREATE INDEX IF NOT EXISTS idx_bonus_records_week ON bonus_records(week_number);

-- ============================================================================
-- ADVANCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS advances (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  amount REAL NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,
  recorded_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users_new(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_advances_employee ON advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_advances_period ON advances(employee_id, month, year);

-- ============================================================================
-- DEDUCTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS deductions (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  amount REAL NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  reason TEXT,
  recorded_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users_new(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_deductions_employee ON deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_deductions_period ON deductions(employee_id, month, year);

-- ============================================================================
-- PAYROLL RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_records (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  employees TEXT NOT NULL, -- JSON array of employee payroll details
  total_net_salary REAL NOT NULL,
  generated_by TEXT,
  pdf_url TEXT,
  email_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (generated_by) REFERENCES users_new(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payroll_records_branch ON payroll_records(branch_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(branch_id, month, year);
CREATE INDEX IF NOT EXISTS idx_payroll_records_email_sent ON payroll_records(email_sent);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  branch_id TEXT, -- NULL for system-wide notifications
  type TEXT NOT NULL, -- 'revenue', 'expense', 'payroll', 'request', 'system', 'email', 'backup'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  ai_generated INTEGER NOT NULL DEFAULT 0,
  action_required INTEGER NOT NULL DEFAULT 0,
  related_entity TEXT, -- ID of related entity (revenue_id, request_id, etc.)
  is_read INTEGER NOT NULL DEFAULT 0,
  is_dismissed INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_branch ON notifications(branch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_dismissed ON notifications(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- ============================================================================
-- BACKUPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'manual'
  data_snapshot TEXT NOT NULL, -- JSON snapshot of critical system data
  revenues_data TEXT, -- JSON snapshot of revenues
  expenses_data TEXT, -- JSON snapshot of expenses
  product_orders_data TEXT, -- JSON snapshot of orders
  employee_requests_data TEXT, -- JSON snapshot of requests
  bonus_records_data TEXT, -- JSON snapshot of bonuses
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_backups_date ON backups(date);
CREATE INDEX IF NOT EXISTS idx_backups_type ON backups(type);

-- ============================================================================
-- ZAPIER WEBHOOKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS zapier_webhooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'revenue_created', 'payroll_generated', 'request_submitted', etc.
  is_active INTEGER NOT NULL DEFAULT 1,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  last_triggered TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_zapier_webhooks_active ON zapier_webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_zapier_webhooks_event ON zapier_webhooks(event_type);

-- ============================================================================
-- ZAPIER LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS zapier_logs (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON payload sent
  status TEXT NOT NULL, -- 'success', 'failure', 'timeout'
  response_code INTEGER,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (webhook_id) REFERENCES zapier_webhooks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_zapier_logs_webhook ON zapier_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_zapier_logs_status ON zapier_logs(status);
CREATE INDEX IF NOT EXISTS idx_zapier_logs_created ON zapier_logs(created_at);

-- ============================================================================
-- VIEWS FOR CONVENIENCE
-- ============================================================================

-- View: Active employees with their current details
CREATE VIEW IF NOT EXISTS active_employees AS
SELECT
  e.id,
  e.branch_id,
  b.name AS branch_name,
  e.employee_name,
  e.national_id,
  e.base_salary,
  e.supervisor_allowance,
  e.incentives,
  (e.base_salary + e.supervisor_allowance + e.incentives) AS total_monthly_salary,
  e.created_at
FROM employees e
JOIN branches b ON e.branch_id = b.id
WHERE e.is_active = 1
ORDER BY e.employee_name;

-- View: Monthly financial summary per branch
CREATE VIEW IF NOT EXISTS monthly_financial_summary AS
SELECT
  branch_id,
  strftime('%Y-%m', date) AS month,
  SUM(cash) AS total_cash,
  SUM(network) AS total_network,
  SUM(budget) AS total_budget,
  SUM(total) AS total_revenue,
  COUNT(*) AS revenue_entry_count
FROM revenues
GROUP BY branch_id, strftime('%Y-%m', date)
ORDER BY month DESC;

-- View: Pending employee requests summary
CREATE VIEW IF NOT EXISTS pending_requests_summary AS
SELECT
  branch_id,
  request_type,
  COUNT(*) AS pending_count,
  MIN(created_at) AS oldest_request
FROM employee_requests
WHERE status = 'pending'
GROUP BY branch_id, request_type
ORDER BY oldest_request;

-- View: Payroll history summary
CREATE VIEW IF NOT EXISTS payroll_history_summary AS
SELECT
  pr.branch_id,
  b.name AS branch_name,
  pr.month,
  pr.year,
  pr.total_net_salary,
  pr.email_sent,
  pr.created_at AS generated_at,
  u.username AS generated_by_user
FROM payroll_records pr
JOIN branches b ON pr.branch_id = b.id
LEFT JOIN users_new u ON pr.generated_by = u.id
ORDER BY pr.year DESC, pr.month DESC;
