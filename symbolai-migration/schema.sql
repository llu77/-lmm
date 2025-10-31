-- =========================================
-- symbolai D1 Database Schema
-- Financial Management System
-- 18 Tables - Zero Convex Dependencies
-- =========================================

-- 1. users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  token_identifier TEXT UNIQUE,
  name TEXT,
  email TEXT,
  username TEXT UNIQUE,
  bio TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'employee', -- admin, employee, manager
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_token ON users(token_identifier);
CREATE INDEX idx_users_username ON users(username);

-- 2. branches
CREATE TABLE branches (
  id TEXT PRIMARY KEY,
  branch_id TEXT UNIQUE NOT NULL,
  branch_name TEXT NOT NULL,
  supervisor_email TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branches_branch_id ON branches(branch_id);
CREATE INDEX idx_branches_active ON branches(is_active);

-- 3. employees
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  national_id TEXT UNIQUE,
  base_salary REAL NOT NULL,
  supervisor_allowance REAL DEFAULT 0,
  incentives REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

CREATE INDEX idx_employees_branch ON employees(branch_id);
CREATE INDEX idx_employees_name ON employees(employee_name);
CREATE INDEX idx_employees_branch_active ON employees(branch_id, is_active);

-- 4. revenues
CREATE TABLE revenues (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  date TEXT NOT NULL,
  cash REAL DEFAULT 0,
  network REAL DEFAULT 0,
  budget REAL DEFAULT 0,
  total REAL NOT NULL,
  calculated_total REAL,
  is_matched INTEGER DEFAULT 1,
  employees TEXT, -- JSON array: [{"name": "...", "revenue": 100}]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

CREATE INDEX idx_revenues_date ON revenues(date);
CREATE INDEX idx_revenues_branch ON revenues(branch_id);
CREATE INDEX idx_revenues_branch_date ON revenues(branch_id, date);

-- 5. expenses
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  description TEXT,
  date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_branch ON expenses(branch_id);
CREATE INDEX idx_expenses_branch_date ON expenses(branch_id, date);

-- 6. bonus_records
CREATE TABLE bonus_records (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  week_number INTEGER NOT NULL, -- 1-5
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  employee_bonuses TEXT NOT NULL, -- JSON array
  total_bonus_paid REAL NOT NULL,
  approved_by TEXT,
  approved_at DATETIME,
  revenue_snapshot TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

CREATE INDEX idx_bonus_branch_date ON bonus_records(branch_id, month, year);
CREATE INDEX idx_bonus_branch ON bonus_records(branch_id);

-- 7. product_orders
CREATE TABLE product_orders (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  products TEXT NOT NULL, -- JSON array
  grand_total REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- draft, pending, approved, rejected, completed
  is_draft INTEGER DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

CREATE INDEX idx_orders_status ON product_orders(status);
CREATE INDEX idx_orders_branch ON product_orders(branch_id);
CREATE INDEX idx_orders_draft ON product_orders(is_draft);
CREATE INDEX idx_orders_employee ON product_orders(employee_name);

-- 8. employee_orders
CREATE TABLE employee_orders (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  request_type TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  requested_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

CREATE INDEX idx_employee_orders_status ON employee_orders(status);
CREATE INDEX idx_employee_orders_branch ON employee_orders(branch_id);

-- 9. employee_requests
CREATE TABLE employee_requests (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  national_id TEXT,
  request_type TEXT NOT NULL, -- سلفة, إجازة, صرف متأخرات, etc.
  status TEXT DEFAULT 'pending',
  request_date TEXT NOT NULL,
  advance_amount REAL,
  vacation_date TEXT,
  dues_amount REAL,
  permission_date TEXT,
  violation_date TEXT,
  violation_description TEXT,
  resignation_date TEXT,
  resignation_reason TEXT,
  admin_response TEXT,
  response_date TEXT,
  user_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

CREATE INDEX idx_requests_branch ON employee_requests(branch_id);
CREATE INDEX idx_requests_status ON employee_requests(status);
CREATE INDEX idx_requests_employee ON employee_requests(employee_name);
CREATE INDEX idx_requests_user ON employee_requests(user_id);

-- 10. advances
CREATE TABLE advances (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  amount REAL NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,
  recorded_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX idx_advances_employee ON advances(employee_id);
CREATE INDEX idx_advances_month_year ON advances(month, year);
CREATE INDEX idx_advances_employee_month ON advances(employee_id, month, year);

-- 11. deductions
CREATE TABLE deductions (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  amount REAL NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  reason TEXT,
  recorded_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX idx_deductions_employee ON deductions(employee_id);
CREATE INDEX idx_deductions_month_year ON deductions(month, year);
CREATE INDEX idx_deductions_employee_month ON deductions(employee_id, month, year);

-- 12. payroll_records
CREATE TABLE payroll_records (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  employees TEXT NOT NULL, -- JSON array with salary breakdown
  total_net_salary REAL NOT NULL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  generated_by TEXT,
  pdf_url TEXT,
  email_sent INTEGER DEFAULT 0,
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

CREATE INDEX idx_payroll_branch_month ON payroll_records(branch_id, month, year);
CREATE INDEX idx_payroll_month_year ON payroll_records(month, year);

-- 13. notifications
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium', -- low, medium, high, critical
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  ai_generated INTEGER DEFAULT 0,
  action_required INTEGER DEFAULT 0,
  related_entity TEXT,
  is_read INTEGER DEFAULT 0,
  is_dismissed INTEGER DEFAULT 0,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_branch ON notifications(branch_id);
CREATE INDEX idx_notifications_branch_read ON notifications(branch_id, is_read);
CREATE INDEX idx_notifications_severity ON notifications(severity);

-- 14. backups
CREATE TABLE backups (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL, -- daily-automatic, manual
  data_snapshot TEXT NOT NULL, -- JSON with all data
  revenues_data TEXT,
  expenses_data TEXT,
  product_orders_data TEXT,
  employee_requests_data TEXT,
  bonus_records_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_backups_date ON backups(date);
CREATE INDEX idx_backups_type ON backups(type);

-- 15. email_logs
CREATE TABLE email_logs (
  id TEXT PRIMARY KEY,
  to_addresses TEXT NOT NULL, -- JSON array
  subject TEXT NOT NULL,
  status TEXT NOT NULL, -- sent, failed
  email_id TEXT,
  error TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);

-- 16. email_settings
CREATE TABLE email_settings (
  id TEXT PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_settings_key ON email_settings(setting_key);

-- 17. zapier_webhooks
CREATE TABLE zapier_webhooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  last_triggered DATETIME,
  trigger_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_active ON zapier_webhooks(is_active);

-- 18. zapier_logs
CREATE TABLE zapier_logs (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  status TEXT NOT NULL, -- success, failed
  response_code INTEGER,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (webhook_id) REFERENCES zapier_webhooks(id)
);

CREATE INDEX idx_zapier_logs_webhook ON zapier_logs(webhook_id);
CREATE INDEX idx_zapier_logs_status ON zapier_logs(status);
