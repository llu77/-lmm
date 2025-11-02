/**
 * SymbolAI Email System - Core Functions
 * Powered by Resend API + Cloudflare Workers
 */

import { generateId } from './db';

export interface EmailParams {
  to: string | string[];
  cc?: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  triggerType: string;
  relatedEntityId?: string;
  userId?: string;
  scheduledAt?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string; // base64
  contentType: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  emailLogId?: string;
  error?: string;
  rateLimited?: boolean;
  retryAfter?: number;
}

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  EMAIL_QUEUE?: Queue;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
  ADMIN_EMAIL: string;
}

/**
 * 1. Send Email Directly with Rate Limiting
 */
export async function sendEmail(env: Env, params: EmailParams): Promise<EmailResult> {
  try {
    // Check rate limiting
    if (params.userId) {
      const rateLimitCheck = await checkRateLimit(env, {
        userId: params.userId,
        triggerType: params.triggerType
      });

      if (!rateLimitCheck.allowed) {
        // Log rate limited attempt
        await logEmail(env, {
          ...params,
          status: 'rate_limited',
          error: rateLimitCheck.reason
        });

        return {
          success: false,
          rateLimited: true,
          error: rateLimitCheck.reason,
          retryAfter: rateLimitCheck.retryAfter
        };
      }
    }

    // Get email settings
    const settings = await getEmailSettings(env);
    if (!settings.global_enable) {
      return {
        success: false,
        error: 'Email system is disabled'
      };
    }

    // Prepare email
    const toAddresses = Array.isArray(params.to) ? params.to : [params.to];
    const ccAddresses = params.cc || [];

    // Send via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${settings.from_name} <${settings.from_email}>`,
        to: toAddresses,
        cc: ccAddresses.length > 0 ? ccAddresses : undefined,
        subject: params.subject,
        html: params.html,
        text: params.text || stripHtml(params.html),
        attachments: params.attachments,
        reply_to: settings.reply_to
      })
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email');
    }

    // Increment rate limit counters
    if (params.userId) {
      await incrementRateLimit(env, {
        userId: params.userId,
        triggerType: params.triggerType
      });
    }

    // Log successful send
    const emailLogId = await logEmail(env, {
      ...params,
      status: 'sent',
      messageId: data.id
    });

    return {
      success: true,
      messageId: data.id,
      emailLogId
    };

  } catch (error) {
    console.error('Send email error:', error);

    // Log failed send
    await logEmail(env, {
      ...params,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 2. Send Template Email
 */
export async function sendTemplateEmail(
  env: Env,
  params: {
    to: string | string[];
    cc?: string[];
    templateId: string;
    variables: Record<string, any>;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    triggerType: string;
    userId?: string;
    relatedEntityId?: string;
  }
): Promise<EmailResult> {
  try {
    // Render template
    const rendered = await renderTemplate(params.templateId, params.variables);

    if (!rendered) {
      return {
        success: false,
        error: `Template ${params.templateId} not found`
      };
    }

    // Send email
    return await sendEmail(env, {
      to: params.to,
      cc: params.cc,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      priority: params.priority,
      triggerType: params.triggerType,
      userId: params.userId,
      relatedEntityId: params.relatedEntityId
    });

  } catch (error) {
    console.error('Send template email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 3. Queue Email for Later Processing
 */
export async function queueEmail(env: Env, params: EmailParams): Promise<string> {
  const emailLogId = generateId();

  // Log as queued
  await logEmail(env, {
    ...params,
    status: 'queued',
    emailLogId
  });

  // Add to queue if available
  if (env.EMAIL_QUEUE) {
    await env.EMAIL_QUEUE.send({
      emailLogId,
      params
    });
  }

  return emailLogId;
}

/**
 * 4. Process Email Queue (Batch)
 */
export async function processEmailQueue(
  env: Env,
  batchSize: number = 10
): Promise<{ processed: number; failed: number; remaining: number }> {
  try {
    // Get queued emails
    const result = await env.DB.prepare(`
      SELECT *
      FROM email_logs
      WHERE status = 'queued'
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        created_at ASC
      LIMIT ?
    `).bind(batchSize).all();

    const queuedEmails = result.results || [];
    let processed = 0;
    let failed = 0;

    for (const email of queuedEmails) {
      try {
        const params: EmailParams = {
          to: JSON.parse(email.to_addresses as string),
          cc: email.cc_addresses ? JSON.parse(email.cc_addresses as string) : undefined,
          subject: email.subject as string,
          html: email.template_variables ?
            (await renderTemplate(
              email.template_id as string,
              JSON.parse(email.template_variables as string)
            ))?.html || '' : '',
          priority: email.priority as any,
          triggerType: email.trigger_type as string,
          userId: email.user_id as string,
          relatedEntityId: email.related_entity_id as string
        };

        const result = await sendEmail(env, params);

        if (result.success) {
          // Update status to sent
          await env.DB.prepare(`
            UPDATE email_logs
            SET status = 'sent', sent_at = ?, resend_message_id = ?
            WHERE id = ?
          `).bind(new Date().toISOString(), result.messageId, email.id).run();
          processed++;
        } else {
          // Increment retry count
          const retryCount = (email.retry_count as number) + 1;

          if (retryCount >= 3) {
            // Max retries reached, mark as failed
            await env.DB.prepare(`
              UPDATE email_logs
              SET status = 'failed', retry_count = ?, error = ?
              WHERE id = ?
            `).bind(retryCount, result.error, email.id).run();
            failed++;
          } else {
            // Keep in queue for retry
            await env.DB.prepare(`
              UPDATE email_logs
              SET retry_count = ?, error = ?
              WHERE id = ?
            `).bind(retryCount, result.error, email.id).run();
          }
        }
      } catch (error) {
        console.error('Process queue item error:', error);
        failed++;
      }
    }

    // Count remaining
    const remainingResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM email_logs
      WHERE status = 'queued'
    `).first();

    return {
      processed,
      failed,
      remaining: (remainingResult?.count as number) || 0
    };

  } catch (error) {
    console.error('Process email queue error:', error);
    return { processed: 0, failed: 0, remaining: 0 };
  }
}

/**
 * 5. Check Rate Limit
 */
export async function checkRateLimit(
  env: Env,
  params: { userId: string; triggerType: string }
): Promise<{ allowed: boolean; reason?: string; retryAfter?: number }> {
  const now = new Date();
  const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
  const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Get settings
  const settings = await getEmailSettings(env);

  // Check global limits
  const globalHourKey = `email:global:hour:${hourKey}`;
  const globalDayKey = `email:global:day:${dayKey}`;

  const globalHourCount = await env.SESSIONS.get(globalHourKey);
  const globalDayCount = await env.SESSIONS.get(globalDayKey);

  if (globalHourCount && parseInt(globalHourCount) >= settings.rate_limit_global_hourly) {
    return {
      allowed: false,
      reason: 'Global hourly rate limit exceeded',
      retryAfter: 3600
    };
  }

  if (globalDayCount && parseInt(globalDayCount) >= settings.rate_limit_global_daily) {
    return {
      allowed: false,
      reason: 'Global daily rate limit exceeded',
      retryAfter: 86400
    };
  }

  // Check user limits
  const userHourKey = `email:user:${params.userId}:hour:${hourKey}`;
  const userDayKey = `email:user:${params.userId}:day:${dayKey}`;

  const userHourCount = await env.SESSIONS.get(userHourKey);
  const userDayCount = await env.SESSIONS.get(userDayKey);

  if (userHourCount && parseInt(userHourCount) >= settings.rate_limit_user_hourly) {
    return {
      allowed: false,
      reason: 'User hourly rate limit exceeded',
      retryAfter: 3600
    };
  }

  if (userDayCount && parseInt(userDayCount) >= settings.rate_limit_user_daily) {
    return {
      allowed: false,
      reason: 'User daily rate limit exceeded',
      retryAfter: 86400
    };
  }

  // Check trigger-specific limits
  const triggerLimits = getTriggerRateLimits(params.triggerType);

  if (triggerLimits.hourly) {
    const triggerHourKey = `email:trigger:${params.triggerType}:${params.userId}:hour:${hourKey}`;
    const triggerHourCount = await env.SESSIONS.get(triggerHourKey);

    if (triggerHourCount && parseInt(triggerHourCount) >= triggerLimits.hourly) {
      return {
        allowed: false,
        reason: `Trigger hourly rate limit exceeded (${triggerLimits.hourly}/hour)`,
        retryAfter: 3600
      };
    }
  }

  if (triggerLimits.daily) {
    const triggerDayKey = `email:trigger:${params.triggerType}:${params.userId}:day:${dayKey}`;
    const triggerDayCount = await env.SESSIONS.get(triggerDayKey);

    if (triggerDayCount && parseInt(triggerDayCount) >= triggerLimits.daily) {
      return {
        allowed: false,
        reason: `Trigger daily rate limit exceeded (${triggerLimits.daily}/day)`,
        retryAfter: 86400
      };
    }
  }

  return { allowed: true };
}

/**
 * 6. Increment Rate Limit Counters
 */
export async function incrementRateLimit(
  env: Env,
  params: { userId: string; triggerType: string }
): Promise<void> {
  const now = new Date();
  const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
  const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Increment global counters
  const globalHourKey = `email:global:hour:${hourKey}`;
  const globalDayKey = `email:global:day:${dayKey}`;

  await incrementKVCounter(env.SESSIONS, globalHourKey, 3600);
  await incrementKVCounter(env.SESSIONS, globalDayKey, 86400);

  // Increment user counters
  const userHourKey = `email:user:${params.userId}:hour:${hourKey}`;
  const userDayKey = `email:user:${params.userId}:day:${dayKey}`;

  await incrementKVCounter(env.SESSIONS, userHourKey, 3600);
  await incrementKVCounter(env.SESSIONS, userDayKey, 86400);

  // Increment trigger counters
  const triggerHourKey = `email:trigger:${params.triggerType}:${params.userId}:hour:${hourKey}`;
  const triggerDayKey = `email:trigger:${params.triggerType}:${params.userId}:day:${dayKey}`;

  await incrementKVCounter(env.SESSIONS, triggerHourKey, 3600);
  await incrementKVCounter(env.SESSIONS, triggerDayKey, 86400);
}

/**
 * 7. Render Template with Variables
 */
export async function renderTemplate(
  templateId: string,
  variables: Record<string, any>
): Promise<{ html: string; text: string; subject: string } | null> {
  // Import templates dynamically
  const { EMAIL_TEMPLATES } = await import('./email-templates');

  const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    return null;
  }

  // Replace variables in subject
  let subject = template.subject;
  for (const [key, value] of Object.entries(variables)) {
    subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }

  // Replace variables in HTML
  let html = template.htmlTemplate;
  for (const [key, value] of Object.entries(variables)) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }

  // Replace variables in text
  let text = template.textTemplate;
  for (const [key, value] of Object.entries(variables)) {
    text = text.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }

  return { html, text, subject };
}

/**
 * 8. Send Batch Emails (For Payroll)
 */
export async function sendBatchEmails(
  env: Env,
  params: {
    emails: EmailParams[];
    batchSize?: number;
    delayBetweenBatches?: number;
  }
): Promise<{ sent: number; failed: number; queued: number }> {
  const batchSize = params.batchSize || 100;
  const delayMs = params.delayBetweenBatches || 1000;

  let sent = 0;
  let failed = 0;
  let queued = 0;

  // Process in batches
  for (let i = 0; i < params.emails.length; i += batchSize) {
    const batch = params.emails.slice(i, i + batchSize);

    for (const email of batch) {
      try {
        const result = await sendEmail(env, email);

        if (result.success) {
          sent++;
        } else if (result.rateLimited) {
          // Queue for later
          await queueEmail(env, email);
          queued++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('Batch email error:', error);
        failed++;
      }
    }

    // Delay between batches to avoid rate limits
    if (i + batchSize < params.emails.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { sent, failed, queued };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function logEmail(
  env: Env,
  params: EmailParams & {
    status: string;
    messageId?: string;
    error?: string;
    emailLogId?: string;
  }
): Promise<string> {
  const id = params.emailLogId || generateId();

  try {
    await env.DB.prepare(`
      INSERT INTO email_logs (
        id,
        to_addresses,
        cc_addresses,
        subject,
        trigger_type,
        related_entity_id,
        priority,
        status,
        resend_message_id,
        error,
        user_id,
        scheduled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      JSON.stringify(Array.isArray(params.to) ? params.to : [params.to]),
      params.cc ? JSON.stringify(params.cc) : null,
      params.subject,
      params.triggerType,
      params.relatedEntityId || null,
      params.priority || 'medium',
      params.status,
      params.messageId || null,
      params.error || null,
      params.userId || null,
      params.scheduledAt || null
    ).run();
  } catch (error) {
    console.error('Log email error:', error);
  }

  return id;
}

async function getEmailSettings(env: Env): Promise<{
  from_email: string;
  from_name: string;
  reply_to: string;
  global_enable: boolean;
  rate_limit_global_hourly: number;
  rate_limit_global_daily: number;
  rate_limit_user_hourly: number;
  rate_limit_user_daily: number;
}> {
  const settings = await env.DB.prepare(`
    SELECT setting_key, setting_value
    FROM email_settings
  `).all();

  const settingsMap = (settings.results || []).reduce((acc: any, row: any) => {
    acc[row.setting_key] = row.setting_value;
    return acc;
  }, {});

  return {
    from_email: settingsMap.from_email || 'info@symbolai.net',
    from_name: settingsMap.from_name || 'SymbolAI',
    reply_to: settingsMap.reply_to || 'no-reply@symbolai.net',
    global_enable: settingsMap.global_enable === 'true',
    rate_limit_global_hourly: parseInt(settingsMap.rate_limit_global_hourly || '100'),
    rate_limit_global_daily: parseInt(settingsMap.rate_limit_global_daily || '500'),
    rate_limit_user_hourly: parseInt(settingsMap.rate_limit_user_hourly || '10'),
    rate_limit_user_daily: parseInt(settingsMap.rate_limit_user_daily || '30')
  };
}

function getTriggerRateLimits(triggerType: string): { hourly?: number; daily?: number } {
  const limits: Record<string, { hourly?: number; daily?: number }> = {
    'employee_request_created': { hourly: 10 },
    'employee_request_responded': {},
    'product_order_pending': { hourly: 20 },
    'product_order_approved': {},
    'product_order_rejected': {},
    'product_order_completed': {},
    'payroll_generated': { daily: 1 },
    'payroll_reminder': { daily: 1 },
    'bonus_approved': { daily: 1 },
    'bonus_reminder': { daily: 1 },
    'backup_completed': { daily: 1 },
    'backup_failed': { daily: 3 },
    'revenue_mismatch': { daily: 5 },
    'large_expense': { daily: 10 }
  };

  return limits[triggerType] || {};
}

async function incrementKVCounter(kv: KVNamespace, key: string, expirationTtl: number): Promise<void> {
  const current = await kv.get(key);
  const newValue = current ? parseInt(current) + 1 : 1;
  await kv.put(key, String(newValue), { expirationTtl });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
