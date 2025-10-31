# Database Migrations

This directory contains SQL migrations for the SymbolAI Worker system, including Email, RBAC, and seed data.

## Migration Files

| File | Description | Tables Created |
|------|-------------|----------------|
| `001_create_email_tables.sql` | Email system tables | email_logs, email_settings |
| `002_create_branches_and_roles.sql` | RBAC system tables | branches, roles, users_new, audit_logs |
| `003_seed_branches_and_users_hashed.sql` | Seed data (test data) | Populates branches, users, employees |

## Setup Instructions

### 1. Apply Database Migrations (In Order)

**For local development:**
```bash
cd symbolai-worker

# Migration 1: Email System
wrangler d1 execute DB --local --file=./migrations/001_create_email_tables.sql

# Migration 2: RBAC System
wrangler d1 execute DB --local --file=./migrations/002_create_branches_and_roles.sql

# Migration 3: Seed Data (Optional - for testing only)
wrangler d1 execute DB --local --file=./migrations/003_seed_branches_and_users_hashed.sql
```

**For production:**
```bash
cd symbolai-worker

# Migration 1: Email System
wrangler d1 execute DB --remote --file=./migrations/001_create_email_tables.sql

# Migration 2: RBAC System
wrangler d1 execute DB --remote --file=./migrations/002_create_branches_and_roles.sql

# Migration 3: Seed Data (DO NOT use in production - test data only)
# Skip this migration in production or create your own with secure credentials
```

### 2. Configure RBAC System

The RBAC (Role-Based Access Control) system is automatically set up with Migration 2.

**Default Roles Created:**
- `role_admin` - Full system access, all permissions
- `role_supervisor` - Branch manager, can manage their branch only
- `role_partner` - Read-only access to view branch statistics
- `role_employee` - Limited access to submit and view own requests/bonus

**Test Data:** See `SEED_DATA.md` for information about test credentials.

**Create Admin User:**
Use the `/api/users/create` endpoint or create manually:
```sql
-- Replace password_hash with SHA-256 hash of your password
INSERT INTO users_new (id, username, password, email, full_name, role_id, is_active)
VALUES ('admin_user', 'admin', 'your_sha256_hash', 'admin@symbolai.net', 'System Admin', 'role_admin', 1);
```

### 3. Configure Resend API

1. Sign up at [Resend](https://resend.com)
2. Get your API key from the dashboard
3. Add to `wrangler.toml`:
```toml
[vars]
RESEND_API_KEY = "re_xxxxxxxxxxxxx"
```

Or use secrets for production:
```bash
wrangler secret put RESEND_API_KEY
```

### 4. Setup Resend Webhook

1. Go to Resend Dashboard → Webhooks
2. Add endpoint: `https://symbolai.net/api/webhooks/resend`
3. Select events:
   - `email.delivered`
   - `email.bounced`
   - `email.complained`
4. Copy the webhook signing secret
5. Add to `wrangler.toml`:
```toml
[vars]
RESEND_WEBHOOK_SECRET = "whsec_xxxxxxxxxxxxx"
```

### 5. Configure Email Queue

Create the email queue in Cloudflare:

```bash
wrangler queues create email-queue
```

The queue configuration is already in `wrangler.toml`:
```toml
[[queues.producers]]
queue = "email-queue"
binding = "EMAIL_QUEUE"

[[queues.consumers]]
queue = "email-queue"
max_batch_size = 10
max_batch_timeout = 30
max_retries = 3
```

### 6. Setup Cron Triggers

Cron triggers are configured in `wrangler.toml` for:
- Daily backup emails (2 AM)
- Payroll reminders (25th at 9 AM)
- Bonus reminders (Saturdays at 10 AM)
- Log cleanup (1st of month at 3 AM)

No additional setup needed.

### 7. Configure KV Namespace for Rate Limiting

Create KV namespace for rate limit counters:

```bash
wrangler kv:namespace create "EMAIL_RATE_LIMITS"
```

Add the ID to `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "EMAIL_RATE_LIMITS"
id = "your-kv-namespace-id"
```

### 8. Update Email Settings

After deployment, visit `/email-settings` in the app to configure:
- Sender email and name
- Reply-to address
- Admin email
- Rate limit thresholds
- Enable/disable email system

## Database Schema

### email_logs Table

Tracks all email sending attempts and delivery status.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| to_email | TEXT | Recipient email |
| subject | TEXT | Email subject |
| trigger_type | TEXT | Type of trigger (see below) |
| status | TEXT | queued, sent, failed, rate_limited |
| delivery_status | TEXT | delivered, bounced, complained |
| resend_message_id | TEXT | Resend API message ID |
| error_message | TEXT | Error details if failed |
| created_at | TEXT | Timestamp created |
| delivered_at | TEXT | Timestamp delivered |
| user_id | TEXT | User who triggered |
| related_entity_id | TEXT | Related order/request ID |
| branch_id | TEXT | Branch ID |
| priority | TEXT | low, medium, high, critical |
| rate_limit_key | TEXT | Rate limit key used |

### email_settings Table

Stores email system configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| setting_key | TEXT | Setting name (unique) |
| setting_value | TEXT | Setting value |
| created_at | TEXT | Timestamp created |
| updated_at | TEXT | Timestamp updated |

### Default Settings

| Setting Key | Default Value | Description |
|-------------|---------------|-------------|
| from_email | info@symbolai.net | Sender email |
| from_name | SymbolAI | Sender name |
| reply_to | info@symbolai.net | Reply-to address |
| admin_email | admin@symbolai.net | Admin notifications |
| global_enable | 1 | Enable email system |
| rate_limit_global_hourly | 100 | Global hourly limit |
| rate_limit_global_daily | 500 | Global daily limit |
| rate_limit_user_hourly | 10 | Per-user hourly limit |
| rate_limit_user_daily | 30 | Per-user daily limit |

## Email Triggers

The system includes 14 automated email triggers:

### Employee Requests
- `employee_request_created` - New employee request submitted
- `employee_request_responded` - Request approved/rejected

### Product Orders
- `product_order_pending` - New order awaiting approval
- `product_order_approved` - Order approved by admin
- `product_order_rejected` - Order rejected
- `product_order_completed` - Order fulfilled

### Payroll & Bonuses
- `payroll_generated` - Monthly payroll created (batch)
- `payroll_reminder` - Reminder on 25th of month
- `bonus_approved` - Bonus awarded to employee
- `bonus_reminder` - Weekly bonus reminder

### Financial Alerts
- `revenue_mismatch` - Revenue calculation mismatch
- `large_expense` - Expense > 1000 ج.م

### System Notifications
- `backup_completed` - Daily backup success
- `backup_failed` - Backup failure alert

## Rate Limiting

Three-level rate limiting system:

1. **Global Limits**: Entire system (100/hour, 500/day)
2. **Per-User Limits**: Individual users (10/hour, 30/day)
3. **Per-Trigger Limits**: Custom per trigger type

Rate limit counters are stored in Cloudflare KV with automatic expiration.

## Testing

### Verify Migration
```bash
wrangler d1 execute DB --local --command="SELECT name FROM sqlite_master WHERE type='table'"
```

Expected output:
- email_logs
- email_settings

### Send Test Email

Visit `/email-settings` and use the "إرسال تجريبي" (Test Send) button.

### View Email Logs

Visit `/email-settings` to see:
- Email statistics dashboard
- Hourly sending trends
- Top triggers
- Email logs with filtering
- Delivery status tracking

## Maintenance

### Clean Old Logs

Uncomment and run the cleanup query in the migration file:

```sql
DELETE FROM email_logs
WHERE created_at < datetime('now', '-90 days')
  AND status != 'failed';
```

Or create a cron job to run monthly.

### Monitor Rate Limits

Check KV namespace for rate limit keys:
```
email:global:hour:YYYY-MM-DD-HH
email:global:day:YYYY-MM-DD
email:user:{userId}:hour:YYYY-MM-DD-HH
email:user:{userId}:day:YYYY-MM-DD
```

### Monitor Delivery Rates

Query the `email_trigger_stats` view:
```sql
SELECT * FROM email_trigger_stats ORDER BY total_emails DESC;
```

## Troubleshooting

### Emails not sending

1. Check global enable setting in `/email-settings`
2. Verify RESEND_API_KEY is set correctly
3. Check rate limits in dashboard
4. Review error_message in email_logs table

### Webhook not updating delivery status

1. Verify webhook is configured in Resend dashboard
2. Check RESEND_WEBHOOK_SECRET is set
3. Test webhook endpoint: POST to `/api/webhooks/resend`

### High bounce rate

1. Verify email addresses are valid
2. Check SPF/DKIM records for domain
3. Review bounced emails in Resend dashboard

## Support

For issues or questions, check:
- Resend documentation: https://resend.com/docs
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Cloudflare Queues: https://developers.cloudflare.com/queues/
