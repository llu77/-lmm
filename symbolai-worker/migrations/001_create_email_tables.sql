-- =====================================================
-- Email System Tables Migration
-- Created: 2025-10-30
-- Description: Email logging and settings for SymbolAI
-- =====================================================

-- =====================================================
-- Table: email_logs
-- Purpose: Track all email sending attempts and delivery status
-- =====================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,

  -- Trigger information
  trigger_type TEXT NOT NULL, -- employee_request_created, product_order_pending, etc.

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'queued', -- queued, sent, failed, rate_limited
  delivery_status TEXT, -- delivered, bounced, complained (from webhook)

  -- Resend integration
  resend_message_id TEXT UNIQUE, -- Message ID from Resend API

  -- Error handling
  error_message TEXT,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT, -- When webhook confirms delivery

  -- Related entities (for tracking)
  user_id TEXT, -- Which user triggered this email
  related_entity_id TEXT, -- ID of request/order/payroll etc.
  branch_id TEXT,

  -- Priority tracking
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical

  -- Rate limiting tracking
  rate_limit_key TEXT -- The rate limit key that was checked
);

-- Indexes for email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_trigger_type ON email_logs(trigger_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_delivery_status ON email_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_message_id ON email_logs(resend_message_id);

-- Composite index for filtering by status and date
CREATE INDEX IF NOT EXISTS idx_email_logs_status_created ON email_logs(status, created_at DESC);

-- Composite index for trigger type and date
CREATE INDEX IF NOT EXISTS idx_email_logs_trigger_created ON email_logs(trigger_type, created_at DESC);

-- =====================================================
-- Table: email_settings
-- Purpose: Store email system configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS email_settings (
  id TEXT PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for fast settings lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_settings_key ON email_settings(setting_key);

-- =====================================================
-- Default Email Settings
-- =====================================================
INSERT OR IGNORE INTO email_settings (id, setting_key, setting_value) VALUES
  -- Email sender configuration
  ('setting_from_email', 'from_email', 'info@symbolai.net'),
  ('setting_from_name', 'from_name', 'SymbolAI'),
  ('setting_reply_to', 'reply_to', 'info@symbolai.net'),
  ('setting_admin_email', 'admin_email', 'admin@symbolai.net'),

  -- System control
  ('setting_global_enable', 'global_enable', '1'),

  -- Rate limits (Global)
  ('setting_rate_limit_global_hourly', 'rate_limit_global_hourly', '100'),
  ('setting_rate_limit_global_daily', 'rate_limit_global_daily', '500'),

  -- Rate limits (Per User)
  ('setting_rate_limit_user_hourly', 'rate_limit_user_hourly', '10'),
  ('setting_rate_limit_user_daily', 'rate_limit_user_daily', '30');

-- =====================================================
-- Trigger Statistics View (Optional)
-- Purpose: Quick access to email statistics by trigger type
-- =====================================================
CREATE VIEW IF NOT EXISTS email_trigger_stats AS
SELECT
  trigger_type,
  COUNT(*) as total_emails,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  SUM(CASE WHEN status = 'rate_limited' THEN 1 ELSE 0 END) as rate_limited_count,
  SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
  SUM(CASE WHEN delivery_status = 'bounced' THEN 1 ELSE 0 END) as bounced_count,
  ROUND(
    CAST(SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) AS REAL) /
    NULLIF(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) * 100,
    2
  ) as delivery_rate_pct
FROM email_logs
GROUP BY trigger_type;

-- =====================================================
-- Daily Email Statistics View (Optional)
-- Purpose: Track email volume and success over time
-- =====================================================
CREATE VIEW IF NOT EXISTS email_daily_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_emails,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  SUM(CASE WHEN status = 'rate_limited' THEN 1 ELSE 0 END) as rate_limited_count,
  ROUND(
    CAST(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS REAL) /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as success_rate_pct
FROM email_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =====================================================
-- Cleanup Old Email Logs (Optional)
-- Purpose: Delete logs older than 90 days
-- Note: Run this as a scheduled job (e.g., monthly cron)
-- =====================================================
-- DELETE FROM email_logs
-- WHERE created_at < datetime('now', '-90 days')
--   AND status != 'failed'; -- Keep failed emails for debugging

-- =====================================================
-- Migration Complete
-- =====================================================
-- Run this migration using Wrangler CLI:
--
-- 1. Apply migration to local D1:
--    wrangler d1 execute DB --local --file=./migrations/001_create_email_tables.sql
--
-- 2. Apply migration to remote D1:
--    wrangler d1 execute DB --remote --file=./migrations/001_create_email_tables.sql
--
-- 3. Verify tables created:
--    wrangler d1 execute DB --local --command="SELECT name FROM sqlite_master WHERE type='table'"
-- =====================================================
