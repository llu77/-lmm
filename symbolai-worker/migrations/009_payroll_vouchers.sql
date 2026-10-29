-- =====================================================
-- Payroll v2, payroll adjustments ledger, financial vouchers,
-- organization profile, user signatures and in-app notifications.
-- Created: 2026-10-29
--
-- Idempotent: every statement is CREATE ... IF NOT EXISTS, so it is safe to
-- run more than once. The application also applies the same statements on
-- first use (src/lib/finance/schema.ts — keep both in sync; a unit test checks).
--
-- Apply:  wrangler d1 execute DB --remote --file=./migrations/009_payroll_vouchers.sql
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  period TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('earning', 'deduction')),
  category TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  quantity REAL,
  rate REAL,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT,
  installment_no INTEGER,
  installment_count INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  payroll_run_id TEXT,
  created_by TEXT,
  created_by_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  cancelled_by TEXT,
  cancelled_by_name TEXT,
  cancelled_at TEXT,
  cancel_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_branch_period
  ON payroll_adjustments (branch_id, period, status);

CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_employee
  ON payroll_adjustments (employee_id, period);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_adjustments_source
  ON payroll_adjustments (source_type, source_id, period, category)
  WHERE source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS payroll_runs (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  branch_name TEXT,
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
  employee_count INTEGER NOT NULL DEFAULT 0,
  total_earnings REAL NOT NULL DEFAULT 0,
  total_deductions REAL NOT NULL DEFAULT 0,
  total_net REAL NOT NULL DEFAULT 0,
  totals_json TEXT NOT NULL DEFAULT '{}',
  active_columns_json TEXT NOT NULL DEFAULT '[]',
  fingerprint TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_by TEXT,
  created_by_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_by TEXT,
  approved_by_name TEXT,
  approved_at TEXT,
  paid_by TEXT,
  paid_by_name TEXT,
  paid_at TEXT,
  cancelled_by TEXT,
  cancelled_by_name TEXT,
  cancelled_at TEXT,
  cancel_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_runs_open_period
  ON payroll_runs (branch_id, period)
  WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_payroll_runs_branch
  ON payroll_runs (branch_id, period DESC);

CREATE TABLE IF NOT EXISTS payroll_run_items (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  national_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  base_salary REAL NOT NULL DEFAULT 0,
  supervisor_allowance REAL NOT NULL DEFAULT 0,
  incentives REAL NOT NULL DEFAULT 0,
  fixed_salary REAL NOT NULL DEFAULT 0,
  overtime REAL NOT NULL DEFAULT 0,
  bonus REAL NOT NULL DEFAULT 0,
  other_earnings REAL NOT NULL DEFAULT 0,
  total_earnings REAL NOT NULL DEFAULT 0,
  advances REAL NOT NULL DEFAULT 0,
  penalties REAL NOT NULL DEFAULT 0,
  absence_deductions REAL NOT NULL DEFAULT 0,
  other_deductions REAL NOT NULL DEFAULT 0,
  total_deductions REAL NOT NULL DEFAULT 0,
  net_salary REAL NOT NULL DEFAULT 0,
  lines_json TEXT NOT NULL DEFAULT '[]',
  warnings_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_payroll_run_items_run
  ON payroll_run_items (run_id, sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_run_items_employee
  ON payroll_run_items (run_id, employee_id);

CREATE TABLE IF NOT EXISTS financial_vouchers (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  branch_name TEXT,
  voucher_type TEXT NOT NULL CHECK (voucher_type IN ('receipt', 'payment')),
  sequence_no INTEGER NOT NULL,
  voucher_number TEXT NOT NULL,
  voucher_date TEXT NOT NULL,
  party_type TEXT NOT NULL DEFAULT 'other',
  party_name TEXT NOT NULL,
  employee_id TEXT,
  party_id_number TEXT,
  party_phone TEXT,
  amount REAL NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'SAR',
  purpose TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'card', 'mixed')),
  cash_amount REAL NOT NULL DEFAULT 0,
  bank_amount REAL NOT NULL DEFAULT 0,
  cheque_amount REAL NOT NULL DEFAULT 0,
  card_amount REAL NOT NULL DEFAULT 0,
  cheque_number TEXT,
  cheque_date TEXT,
  bank_name TEXT,
  transaction_ref TEXT,
  items_json TEXT,
  subtotal REAL,
  discount REAL,
  vat_rate REAL,
  vat_amount REAL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled')),
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT,
  created_by TEXT,
  created_by_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_by TEXT,
  approved_by_name TEXT,
  approved_at TEXT,
  cancelled_by TEXT,
  cancelled_by_name TEXT,
  cancelled_at TEXT,
  cancel_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_vouchers_number
  ON financial_vouchers (voucher_type, voucher_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_vouchers_source
  ON financial_vouchers (source_type, source_id)
  WHERE source_id IS NOT NULL AND status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_financial_vouchers_branch_date
  ON financial_vouchers (branch_id, voucher_type, voucher_date DESC);

CREATE TABLE IF NOT EXISTS voucher_sequences (
  scope TEXT PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS organization_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_signatures (
  user_id TEXT PRIMARY KEY,
  signature_image TEXT NOT NULL,
  signer_name TEXT,
  signer_title TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  user_id TEXT,
  audience TEXT NOT NULL DEFAULT 'user',
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  related_entity TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user
  ON user_notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_branch
  ON user_notifications (branch_id, audience, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_notifications_dedupe
  ON user_notifications (type, related_entity, user_id, audience)
  WHERE related_entity IS NOT NULL;
