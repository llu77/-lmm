/**
 * Authentication Middleware for Cloudflare Workers
 * LMM System - Static Token Authentication
 * 
 * @author llu77
 * @date 2025-11-15
 * @version 2.0.0
 */

import { validateStaticToken, type AdminAccount, hasPermission, hasBranchAccess, type BranchType } from './static-tokens';

// ============================================
// Types & Interfaces
// ============================================

export interface AuthRequest extends Request {
  user?: AdminAccount;
}

export interface AuthMiddlewareOptions {
  requiredPermissions?: string[];
  requiredBranch?: BranchType;
  requireAllPermissions?: boolean;
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowSeconds: number;
  blockDurationSeconds: number;
}

// ============================================
// Authentication Middleware
// ============================================

/**
 * Main authentication middleware
 * Validates token and attaches user to request context
 */
export async function authMiddleware(
  request: Request,
  env: any,
  ctx: ExecutionContext
): Promise<Response | { user: AdminAccount }> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return unauthorizedResponse('Missing authorization header');
    }

    // Validate Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse('Invalid authorization format. Use: Bearer <token>');
    }

    const token = authHeader.substring(7).trim();

    // Validate token
    const validationResult = await validateStaticToken(token, env);

    if (!validationResult.valid || !validationResult.user) {
      // Log failed attempt
      await logAuditEvent(env, {
        action: 'LOGIN_FAILED',
        ip: request.headers.get('CF-Connecting-IP') || 'unknown',
        userAgent: request.headers.get('User-Agent') || 'unknown',
        timestamp: new Date().toISOString(),
        error: validationResult.error
      });

      return unauthorizedResponse(validationResult.error || 'Invalid token');
    }

    // Log successful authentication
    await logAuditEvent(env, {
      action: 'LOGIN_SUCCESS',
      username: validationResult.user.username,
      ip: request.headers.get('CF-Connecting-IP') || 'unknown',
      userAgent: request.headers.get('User-Agent') || 'unknown',
      timestamp: new Date().toISOString()
    });

    // Return user for context
    return { user: validationResult.user };

  } catch (error) {
    console.error('Authentication error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Authentication service error',
        message: 'حدث خطأ في عملية المصادقة'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders()
        }
      }
    );
  }
}

/**
 * Permission checking middleware
 * Verifies user has required permissions
 */
export function requirePermissions(
  user: AdminAccount,
  options: AuthMiddlewareOptions
): Response | null {
  // Check required permissions
  if (options.requiredPermissions && options.requiredPermissions.length > 0) {
    const hasRequiredPerms = options.requireAllPermissions
      ? options.requiredPermissions.every(p => hasPermission(user, p))
      : options.requiredPermissions.some(p => hasPermission(user, p));

    if (!hasRequiredPerms) {
      return forbiddenResponse(
        'Insufficient permissions',
        `المطلوب: ${options.requiredPermissions.join(', ')}`,
        user.permissions
      );
    }
  }

  // Check branch access
  if (options.requiredBranch && !hasBranchAccess(user, options.requiredBranch)) {
    return forbiddenResponse(
      'Branch access denied',
      `ليس لديك صلاحية الوصول لفرع ${options.requiredBranch}`,
      []
    );
  }

  return null; // No issues, proceed
}

// ============================================
// Rate Limiting
// ============================================

/**
 * Rate limiting middleware using Cloudflare KV
 */
export async function rateLimitMiddleware(
  request: Request,
  env: any,
  config: RateLimitConfig = {
    maxAttempts: 5,
    windowSeconds: 900, // 15 minutes
    blockDurationSeconds: 3600 // 1 hour
  }
): Promise<Response | null> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitKey = `rate_limit:${ip}`;

  try {
    // Get current rate limit data
    const rateLimitData = await env.RATE_LIMIT?.get(rateLimitKey, { type: 'json' });

    const now = Date.now();
    let attempts = 0;
    let firstAttempt = now;
    let blockedUntil = 0;

    if (rateLimitData) {
      attempts = rateLimitData.attempts || 0;
      firstAttempt = rateLimitData.firstAttempt || now;
      blockedUntil = rateLimitData.blockedUntil || 0;
    }

    // Check if currently blocked
    if (blockedUntil > now) {
      const remainingSeconds = Math.ceil((blockedUntil - now) / 1000);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many attempts',
          message: `تم حظرك مؤقتاً. حاول مرة أخرى بعد ${remainingSeconds} ثانية`,
          retryAfter: remainingSeconds
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': remainingSeconds.toString(),
            ...securityHeaders()
          }
        }
      );
    }

    // Check if window has expired
    const windowExpired = (now - firstAttempt) > (config.windowSeconds * 1000);
    
    if (windowExpired) {
      // Reset counter
      attempts = 1;
      firstAttempt = now;
    } else {
      attempts += 1;
    }

    // Check if max attempts exceeded
    if (attempts > config.maxAttempts) {
      blockedUntil = now + (config.blockDurationSeconds * 1000);
      
      // Update KV with block info
      await env.RATE_LIMIT?.put(
        rateLimitKey,
        JSON.stringify({
          attempts,
          firstAttempt,
          blockedUntil
        }),
        { expirationTtl: config.blockDurationSeconds }
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many attempts',
          message: `تم تجاوز الحد الأقصى من المحاولات. تم حظرك لمدة ${config.blockDurationSeconds / 60} دقيقة`,
          retryAfter: config.blockDurationSeconds
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': config.blockDurationSeconds.toString(),
            ...securityHeaders()
          }
        }
      );
    }

    // Update rate limit data
    await env.RATE_LIMIT?.put(
      rateLimitKey,
      JSON.stringify({
        attempts,
        firstAttempt,
        blockedUntil: 0
      }),
      { expirationTtl: config.windowSeconds }
    );

    return null; // No rate limit issue

  } catch (error) {
    console.error('Rate limit error:', error);
    // Don't block on rate limit errors
    return null;
  }
}

// ============================================
// Audit Logging
// ============================================

/**
 * Logs authentication events to D1 Database
 */
export async function logAuditEvent(env: any, event: any): Promise<void> {
  if (!env.DB) {
    console.warn('D1 database not available for audit logging');
    return;
  }

  try {
    await env.DB.prepare(`
      INSERT INTO audit_logs (
        username,
        action,
        ip_address,
        user_agent,
        timestamp,
        metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      event.username || 'anonymous',
      event.action,
      event.ip,
      event.userAgent,
      event.timestamp,
      JSON.stringify(event)
    ).run();
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - logging should not break authentication
  }
}

// ============================================
// Response Helpers
// ============================================

/**
 * Returns a 401 Unauthorized response
 */
function unauthorizedResponse(message: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Unauthorized',
      message: message,
      messageAr: 'غير مصرح - يرجى تسجيل الدخول'
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer',
        ...securityHeaders()
      }
    }
  );
}
/**
 * Returns a 403 Forbidden response
 */
function forbiddenResponse(
  error: string,
  messageAr: string,
  userPermissions: string[]
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Forbidden',
      message: error,
      messageAr: messageAr,
      yourPermissions: userPermissions
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        ...securityHeaders()
      }
    }
  );
}

/**
 * Security headers for all responses
 */
function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
}
// ============================================
// Session Management
// ============================================
/**
 * Creates a session in KV namespace
 */
export async function createSession(
  env: any,
  user: AdminAccount,
  expirationMinutes: number = 480 // 8 hours
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const sessionData = {
    user,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString(),
    lastActivity: new Date().toISOString()
  };

  await env.SESSIONS?.put(
    `session:${sessionId}`,
    JSON.stringify(sessionData),
    { expirationTtl: expirationMinutes * 60 }
  );

  return sessionId;
}
/**
 * Validates and retrieves a session
 */
export async function getSession(
  env: any,
  sessionId: string
): Promise<AdminAccount | null> {
  const sessionData = await env.SESSIONS?.get(`session:${sessionId}`, { type: 'json' });

  if (!sessionData || !sessionData.user) {
    return null;
  }

  // Check expiration
  const expiresAt = new Date(sessionData.expiresAt);
  if (expiresAt < new Date()) {
    await env.SESSIONS?.delete(`session:${sessionId}`);
    return null;
  }

  // Update last activity
  sessionData.lastActivity = new Date().toISOString();
  await env.SESSIONS?.put(
    `session:${sessionId}`,
    JSON.stringify(sessionData)
  );

  return sessionData.user;
}
/**
 * Deletes a session (logout)
 */
export async function deleteSession(
  env: any,
  sessionId: string
): Promise<void> {
  await env.SESSIONS?.delete(`session:${sessionId}`);
}