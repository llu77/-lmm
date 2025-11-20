/**
 * Enhanced Astro Middleware (Cloudflare Pages 2025 Best Practices)
 *
 * Features:
 * - Session-based authentication
 * - CORS preflight handling (OPTIONS requests)
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - Structured logging with request context
 * - Proper error handling
 *
 * @see https://developers.cloudflare.com/pages/functions/
 * @see https://developers.cloudflare.com/pages/functions/examples/cors-headers/
 * @author SymbolAI Security Team
 * @date 2025-11-20
 */

import { defineMiddleware } from 'astro:middleware';
import type { User } from './lib/permissions';
import { createLogger, extractRequestContext } from './lib/logger';

// =====================================================
// Configuration
// =====================================================

/**
 * Allowed origins for CORS
 * Configure based on your production environment
 */
const ALLOWED_ORIGINS = [
  'https://symbolai.net',
  'https://*.symbolai.net',
];

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/404',
  '/500',
];

// =====================================================
// Helper Functions
// =====================================================

/**
 * Check if origin is allowed for CORS
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // In development, allow localhost
  if (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('workers.dev')
  ) {
    return true;
  }

  // Check against allowed origins (support wildcards)
  return ALLOWED_ORIGINS.some((allowed) => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*.', '');
      return origin.endsWith(pattern);
    }
    return origin === allowed;
  });
}

/**
 * Check if route is public
 */
function isPublicRoute(pathname: string): boolean {
  return (
    PUBLIC_ROUTES.some((route) => pathname === route) ||
    pathname.startsWith('/_') || // Astro internal routes
    pathname.startsWith('/js/') || // Static assets
    pathname.startsWith('/css/') ||
    pathname.startsWith('/assets/')
  );
}

// =====================================================
// Main Middleware
// =====================================================

/**
 * Authentication & Security Middleware
 *
 * Flow:
 * 1. Create request logger with context
 * 2. Handle CORS preflight (OPTIONS)
 * 3. Validate session if present
 * 4. Check route permissions
 * 5. Process request
 * 6. Apply security headers
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { request, locals, cookies, url } = context;
  const startTime = Date.now();

  // Create logger with request context
  const requestLogger = createLogger(
    extractRequestContext(request, url),
    locals.runtime?.env?.ENVIRONMENT || 'production'
  );

  // =====================================================
  // 1. CORS Preflight Handling (OPTIONS requests)
  // =====================================================
  // Must be handled BEFORE calling next()
  // See: https://developers.cloudflare.com/pages/functions/examples/cors-headers/
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('Origin');

    if (isOriginAllowed(origin)) {
      requestLogger.debug('CORS preflight request', { origin });

      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers':
            'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400', // 24 hours
        },
      });
    }

    // Origin not allowed
    requestLogger.warn('CORS preflight rejected', { origin });
    return new Response(null, { status: 403 });
  }

  // =====================================================
  // 2. Session Validation
  // =====================================================

  const sessionId = cookies.get('session')?.value;
  const apiRoute = url.pathname.startsWith('/api/');
  const publicRoute = isPublicRoute(url.pathname);

  // Initialize locals with default values
  locals.user = null;
  locals.isAuthenticated = false;

  // Validate session if present
  if (sessionId && locals.runtime?.env?.SESSIONS) {
    try {
      const sessionData = await locals.runtime.env.SESSIONS.get(
        `session:${sessionId}`
      );

      if (sessionData) {
        const session = JSON.parse(sessionData);

        // Check if session is expired
        if (session.expiresAt > Date.now()) {
          // Get user from database
          if (locals.runtime.env.DB) {
            const user = await locals.runtime.env.DB.prepare(
              'SELECT id, username, email, role_id, branch_id, is_active FROM users_new WHERE id = ?'
            )
              .bind(session.userId)
              .first<User>();

            if (user && user.is_active) {
              locals.user = user;
              locals.isAuthenticated = true;
              locals.userId = user.id;
              locals.sessionId = sessionId;

              requestLogger.debug('User authenticated', {
                userId: user.id,
                username: user.username,
              });
            }
          }
        } else {
          // Session expired, delete it
          await locals.runtime.env.SESSIONS.delete(`session:${sessionId}`);
          cookies.delete('session', { path: '/' });
          requestLogger.info('Session expired and deleted', { sessionId });
        }
      }
    } catch (error) {
      requestLogger.error(
        'Session validation error',
        error instanceof Error ? error : undefined,
        { sessionId }
      );
      // Continue without authentication
    }
  }

  // =====================================================
  // 3. Authorization Check
  // =====================================================

  if (!publicRoute && !locals.isAuthenticated) {
    requestLogger.warn('Unauthorized access attempt', {
      path: url.pathname,
      hasSession: !!sessionId,
    });

    // For API routes, return 401 JSON
    if (apiRoute) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // For page routes, redirect to login
    return context.redirect(
      '/auth/login?redirect=' + encodeURIComponent(url.pathname)
    );
  }

  // =====================================================
  // 4. Process Request
  // =====================================================

  let response: Response;
  try {
    response = await next();
  } catch (error) {
    requestLogger.error(
      'Request processing error',
      error instanceof Error ? error : undefined
    );

    // Return 500 error
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'An error occurred while processing your request',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // =====================================================
  // 5. Apply Security Headers
  // =====================================================
  // See: OWASP Secure Headers Project
  // https://owasp.org/www-project-secure-headers/

  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // HTTP Strict Transport Security (HSTS)
  // Force HTTPS for 1 year, include subdomains, allow preload
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Content Security Policy (CSP)
  // Restrict resource loading to prevent XSS attacks
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-* needed for Astro/React
    "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for styled components
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.anthropic.com https://*.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
  response.headers.set('Content-Security-Policy', cspDirectives);

  // X-XSS-Protection (legacy, but still useful for older browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // =====================================================
  // 6. CORS Headers (for actual requests, not preflight)
  // =====================================================

  if (apiRoute) {
    const origin = request.headers.get('Origin');

    if (isOriginAllowed(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With'
      );
    }
  }

  // =====================================================
  // 7. Request Logging
  // =====================================================

  const duration = Date.now() - startTime;
  requestLogger.info('Request completed', {
    status: response.status,
    duration: `${duration}ms`,
    authenticated: locals.isAuthenticated,
  });

  return response;
});
