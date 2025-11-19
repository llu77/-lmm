// Email Error Handling System
// Comprehensive error handling, retry logic, and fallback notifications

import type { D1Database, Queue, KVNamespace } from '@cloudflare/workers-types';
import { sendEmail, queueEmail } from './email';

// =====================================================
// Interfaces
// =====================================================

export interface EmailError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  originalError?: unknown;
}

export interface EmailRetryConfig {
  maxRetries: number;
  retryDelays: number[]; // in milliseconds
  backoffMultiplier: number;
}

export interface EmailFallbackConfig {
  notifyAdminOnFailure: boolean;
  logToDatabase: boolean;
  createSystemAlert: boolean;
}

// =====================================================
// Error Codes and Classification
// =====================================================

export enum EmailErrorCode {
  // Network errors (retryable)
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  DNS_LOOKUP_FAILED = 'DNS_LOOKUP_FAILED',

  // API errors
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  API_ERROR = 'API_ERROR',

  // Email validation errors (not retryable)
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_TEMPLATE = 'INVALID_TEMPLATE',
  MISSING_VARIABLES = 'MISSING_VARIABLES',

  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  QUEUE_ERROR = 'QUEUE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// =====================================================
// Default Retry Configuration
// =====================================================

const DEFAULT_RETRY_CONFIG: EmailRetryConfig = {
  maxRetries: 3,
  retryDelays: [2000, 5000, 10000], // 2s, 5s, 10s
  backoffMultiplier: 2
};

const DEFAULT_FALLBACK_CONFIG: EmailFallbackConfig = {
  notifyAdminOnFailure: true,
  logToDatabase: true,
  createSystemAlert: true
};

// =====================================================
// Error Classification
// =====================================================

export function classifyError(error: unknown): EmailError {
  const errorMessage = error?.message || String(error);
  const errorCode = error?.code || error?.statusCode;

  // Network errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorCode === 'ETIMEDOUT'
  ) {
    return {
      code: EmailErrorCode.NETWORK_TIMEOUT,
      message: 'انتهت مهلة الاتصال بخادم البريد الإلكتروني',
      severity: 'medium',
      retryable: true,
      originalError: error
    };
  }

  if (
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('connection failed') ||
    errorCode === 'ECONNREFUSED'
  ) {
    return {
      code: EmailErrorCode.CONNECTION_FAILED,
      message: 'فشل الاتصال بخادم البريد الإلكتروني',
      severity: 'high',
      retryable: true,
      originalError: error
    };
  }

  // API errors
  if (errorCode === 401 || errorMessage.includes('unauthorized') || errorMessage.includes('invalid api key')) {
    return {
      code: EmailErrorCode.INVALID_API_KEY,
      message: 'مفتاح API غير صالح - يرجى التحقق من الإعدادات',
      severity: 'critical',
      retryable: false,
      originalError: error
    };
  }

  if (errorCode === 429 || errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return {
      code: EmailErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'تم تجاوز حد الإرسال - سيتم المحاولة لاحقاً',
      severity: 'medium',
      retryable: true,
      originalError: error
    };
  }

  if (errorMessage.includes('quota exceeded') || errorMessage.includes('limit exceeded')) {
    return {
      code: EmailErrorCode.QUOTA_EXCEEDED,
      message: 'تم تجاوز حصة الإرسال الشهرية',
      severity: 'critical',
      retryable: false,
      originalError: error
    };
  }

  // Validation errors
  if (errorMessage.includes('invalid email') || errorMessage.includes('invalid recipient')) {
    return {
      code: EmailErrorCode.INVALID_EMAIL,
      message: 'عنوان بريد إلكتروني غير صالح',
      severity: 'low',
      retryable: false,
      originalError: error
    };
  }

  if (errorMessage.includes('template not found') || errorMessage.includes('invalid template')) {
    return {
      code: EmailErrorCode.INVALID_TEMPLATE,
      message: 'قالب البريد الإلكتروني غير موجود',
      severity: 'high',
      retryable: false,
      originalError: error
    };
  }

  if (errorMessage.includes('missing variable') || errorMessage.includes('required variable')) {
    return {
      code: EmailErrorCode.MISSING_VARIABLES,
      message: 'متغيرات مطلوبة ناقصة في القالب',
      severity: 'medium',
      retryable: false,
      originalError: error
    };
  }

  // Database errors
  if (errorMessage.includes('database') || errorMessage.includes('D1')) {
    return {
      code: EmailErrorCode.DATABASE_ERROR,
      message: 'خطأ في قاعدة البيانات',
      severity: 'high',
      retryable: true,
      originalError: error
    };
  }

  // Queue errors
  if (errorMessage.includes('queue')) {
    return {
      code: EmailErrorCode.QUEUE_ERROR,
      message: 'خطأ في قائمة الانتظار',
      severity: 'medium',
      retryable: true,
      originalError: error
    };
  }

  // Unknown errors
  return {
    code: EmailErrorCode.UNKNOWN_ERROR,
    message: errorMessage || 'خطأ غير معروف في نظام البريد الإلكتروني',
    severity: 'medium',
    retryable: true,
    originalError: error
  };
}

// =====================================================
// Retry Logic with Exponential Backoff
// =====================================================

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: EmailRetryConfig = DEFAULT_RETRY_CONFIG,
  context?: string
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const classifiedError = classifyError(error);

      console.error(`Email operation failed (attempt ${attempt + 1}/${config.maxRetries + 1}):`, {
        context,
        error: classifiedError.message,
        code: classifiedError.code,
        retryable: classifiedError.retryable
      });

      // Don't retry if error is not retryable
      if (!classifiedError.retryable) {
        throw classifiedError;
      }

      // Don't retry if this was the last attempt
      if (attempt >= config.maxRetries) {
        throw classifiedError;
      }

      // Calculate delay for next retry
      const baseDelay = config.retryDelays[attempt] || config.retryDelays[config.retryDelays.length - 1];
      const delay = baseDelay * Math.pow(config.backoffMultiplier, attempt);

      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================
// Fallback Notification System
// =====================================================

export interface Env {
  DB: D1Database;
  EMAIL_QUEUE: Queue;
  SESSIONS: KVNamespace;
  EMAIL_RATE_LIMITS: KVNamespace;
  RESEND_API_KEY: string;
  ADMIN_EMAIL: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
}

export async function handleEmailFailure(
  env: Env,
  emailError: EmailError,
  context: {
    to: string;
    subject: string;
    triggerType?: string;
    userId?: string;
    relatedEntityId?: string;
  },
  config: EmailFallbackConfig = DEFAULT_FALLBACK_CONFIG
): Promise<void> {
  console.error('Email failure handled:', {
    error: emailError,
    context
  });

  // 1. Log to database
  if (config.logToDatabase) {
    try {
      await logEmailFailure(env.DB, emailError, context);
    } catch (dbError) {
      console.error('Failed to log email failure to database:', dbError);
    }
  }

  // 2. Create system alert for critical errors
  if (config.createSystemAlert && emailError.severity === 'critical') {
    try {
      await createSystemAlert(env.DB, emailError, context);
    } catch (alertError) {
      console.error('Failed to create system alert:', alertError);
    }
  }

  // 3. Notify admin for high/critical severity
  if (config.notifyAdminOnFailure && ['high', 'critical'].includes(emailError.severity)) {
    try {
      await notifyAdminOfFailure(env, emailError, context);
    } catch (notifyError) {
      console.error('Failed to notify admin of email failure:', notifyError);
    }
  }
}

async function logEmailFailure(
  db: D1Database,
  emailError: EmailError,
  context: any
): Promise<void> {
  const logId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await db.prepare(`
    INSERT INTO email_logs (id, to_email, subject, trigger_type, status, error_message, user_id, related_entity_id, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    logId,
    context.to,
    context.subject,
    context.triggerType || 'unknown',
    'failed',
    `[${emailError.code}] ${emailError.message}`,
    context.userId || null,
    context.relatedEntityId || null,
    emailError.severity
  ).run();
}

async function createSystemAlert(
  db: D1Database,
  emailError: EmailError,
  context: any
): Promise<void> {
  const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Check if notifications table exists, if not skip
  try {
    await db.prepare(`
      INSERT INTO notifications (id, branch_id, type, severity, title, message, action_required, related_entity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      alertId,
      null, // System-wide alert
      'email_failure',
      emailError.severity,
      '⚠️ فشل نظام البريد الإلكتروني',
      `فشل إرسال بريد إلكتروني: ${emailError.message}\nالمستلم: ${context.to}\nالموضوع: ${context.subject}`,
      1, // Action required
      context.relatedEntityId || null
    ).run();
  } catch (error) {
    // Table might not exist, skip silently
    console.log('Notifications table not available for alert creation');
  }
}

async function notifyAdminOfFailure(
  env: Env,
  emailError: EmailError,
  context: any
): Promise<void> {
  // Don't send email notification if the error is with the email system itself
  // to avoid infinite loops
  if (emailError.code === EmailErrorCode.INVALID_API_KEY || emailError.code === EmailErrorCode.QUOTA_EXCEEDED) {
    console.error('Cannot notify admin via email - email system is down');
    return;
  }

  try {
    // Use a simple direct email to admin (bypass rate limiting)
    await queueEmail(env, {
      to: env.ADMIN_EMAIL || 'admin@symbolai.net',
      subject: `🚨 تنبيه: فشل نظام البريد الإلكتروني`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">⚠️ تنبيه فشل البريد الإلكتروني</h2>
          </div>
          <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <div style="background: #fee2e2; border-right: 4px solid #dc2626; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 0; font-weight: bold; color: #991b1b;">رمز الخطأ: ${emailError.code}</p>
              <p style="margin: 10px 0 0 0; color: #7f1d1d;">${emailError.message}</p>
            </div>

            <h3 style="color: #374151;">تفاصيل البريد الفاشل:</h3>
            <ul style="color: #6b7280;">
              <li><strong>المستلم:</strong> ${context.to}</li>
              <li><strong>الموضوع:</strong> ${context.subject}</li>
              <li><strong>نوع التريقر:</strong> ${context.triggerType || 'غير محدد'}</li>
              <li><strong>الخطورة:</strong> ${emailError.severity === 'critical' ? '🔴 حرج' : emailError.severity === 'high' ? '🟠 عالي' : emailError.severity === 'medium' ? '🟡 متوسط' : '🟢 منخفض'}</li>
            </ul>

            <h3 style="color: #374151;">الإجراءات المطلوبة:</h3>
            <ul style="color: #6b7280;">
              ${emailError.code === EmailErrorCode.INVALID_API_KEY ? '<li>تحقق من مفتاح Resend API في إعدادات Worker</li>' : ''}
              ${emailError.code === EmailErrorCode.QUOTA_EXCEEDED ? '<li>تحقق من حصة الإرسال في حساب Resend</li>' : ''}
              ${emailError.code === EmailErrorCode.RATE_LIMIT_EXCEEDED ? '<li>راجع حدود الإرسال في الإعدادات</li>' : ''}
              ${emailError.retryable ? '<li>سيتم إعادة المحاولة تلقائياً</li>' : '<li>تتطلب تدخل يدوي - الخطأ غير قابل لإعادة المحاولة</li>'}
            </ul>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin-top: 20px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                التاريخ: ${new Date().toLocaleString('ar-EG')}<br>
                يمكنك مراجعة سجل البريد الإلكتروني الكامل في: <a href="https://symbolai.net/email-settings">إعدادات البريد</a>
              </p>
            </div>
          </div>
        </div>
      `,
      text: `تنبيه فشل البريد الإلكتروني\n\nرمز الخطأ: ${emailError.code}\nالرسالة: ${emailError.message}\n\nالمستلم: ${context.to}\nالموضوع: ${context.subject}\nالخطورة: ${emailError.severity}`
    });
  } catch (fallbackError) {
    console.error('Failed to send admin notification email:', fallbackError);
  }
}

// =====================================================
// Wrapped Email Functions with Error Handling
// =====================================================

export async function sendEmailWithErrorHandling(
  env: Env,
  params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    triggerType?: string;
    userId?: string;
    relatedEntityId?: string;
  },
  retryConfig: EmailRetryConfig = DEFAULT_RETRY_CONFIG,
  fallbackConfig: EmailFallbackConfig = DEFAULT_FALLBACK_CONFIG
): Promise<{ success: boolean; error?: EmailError }> {
  try {
    const result = await retryWithBackoff(
      () => sendEmail(env, params),
      retryConfig,
      `Send email to ${params.to}`
    );

    return { success: true };
  } catch (error) {
    const emailError = classifyError(error);

    await handleEmailFailure(
      env,
      emailError,
      {
        to: params.to,
        subject: params.subject,
        triggerType: params.triggerType,
        userId: params.userId,
        relatedEntityId: params.relatedEntityId
      },
      fallbackConfig
    );

    return { success: false, error: emailError };
  }
}

// =====================================================
// Email Health Check
// =====================================================

export async function checkEmailSystemHealth(env: Env): Promise<{
  healthy: boolean;
  issues: string[];
  warnings: string[];
}> {
  const issues: string[] = [];
  const warnings: string[] = [];

  // 1. Check API key is configured
  if (!env.RESEND_API_KEY) {
    issues.push('مفتاح Resend API غير مكوّن');
  }

  // 2. Check recent failures in database
  try {
    const recentFailures = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM email_logs
      WHERE status = 'failed'
      AND created_at > datetime('now', '-1 hour')
    `).first();

    const failureCount = recentFailures?.count as number || 0;

    if (failureCount > 10) {
      warnings.push(`عدد كبير من الفشل في الساعة الأخيرة: ${failureCount}`);
    } else if (failureCount > 20) {
      issues.push(`عدد كبير جداً من الفشل في الساعة الأخيرة: ${failureCount}`);
    }
  } catch (error) {
    warnings.push('لا يمكن التحقق من سجل الأخطاء');
  }

  // 3. Check rate limit status
  try {
    const now = new Date();
    const hourKey = `email:global:hour:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
    const hourCount = await env.EMAIL_RATE_LIMITS.get(hourKey);

    if (hourCount && parseInt(hourCount) > 90) {
      warnings.push(`اقتراب من حد الإرسال الساعي: ${hourCount}/100`);
    }
  } catch (error) {
    warnings.push('لا يمكن التحقق من حد الإرسال');
  }

  return {
    healthy: issues.length === 0,
    issues,
    warnings
  };
}
