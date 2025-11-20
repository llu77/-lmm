/**
 * Astro Middleware
 *
 * Executes on every request before page rendering.
 * Handles authentication, sets context locals, and manages redirects.
 */

import { defineMiddleware } from 'astro:middleware';
import type { User } from './lib/permissions';

/**
 * Authentication Middleware
 *
 * Checks for valid session and populates context.locals with user data.
 * Redirects unauthenticated users to login for protected routes.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { request, locals, cookies, url } = context;

  // Get session from cookie
  const sessionId = cookies.get('session')?.value;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/login',
    '/api/auth/login',
    '/api/auth/logout',
    '/404',
    '/500',
  ];

  // API routes that require authentication
  const apiRoutes = url.pathname.startsWith('/api/');

  // Check if current route is public
  const isPublicRoute =
    publicRoutes.some((route) => url.pathname === route) ||
    url.pathname.startsWith('/_') || // Astro internal routes
    url.pathname.startsWith('/js/'); // Static assets

  // Initialize locals with default values
  locals.user = null;
  locals.isAuthenticated = false;

  // If user has a session, validate it
  if (sessionId && context.locals.runtime?.env?.SESSIONS) {
    try {
      const sessionData = await context.locals.runtime.env.SESSIONS.get(
        `session:${sessionId}`
      );

      if (sessionData) {
        const session = JSON.parse(sessionData);

        // Check if session is expired
        if (session.expiresAt > Date.now()) {
          // Get user from database
          if (context.locals.runtime.env.DB) {
            const user = await context.locals.runtime.env.DB.prepare(
              'SELECT id, username, email, role_id, branch_id, is_active FROM users_new WHERE id = ?'
            )
              .bind(session.userId)
              .first<User>();

            if (user && user.is_active) {
              // Store user in locals for access in pages/API routes
              locals.user = user;
              locals.isAuthenticated = true;
              locals.userId = user.id;
              locals.sessionId = sessionId;
            }
          }
        } else {
          // Session expired, delete it
          await context.locals.runtime.env.SESSIONS.delete(
            `session:${sessionId}`
          );
          cookies.delete('session', { path: '/' });
        }
      }
    } catch (error) {
      console.error('Middleware session error:', error);
      // Continue without authentication
    }
  }

  // Handle authentication for protected routes
  if (!isPublicRoute && !locals.isAuthenticated) {
    // For API routes, return 401
    if (apiRoutes) {
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
    return context.redirect('/auth/login?redirect=' + encodeURIComponent(url.pathname));
  }

  // Continue to the next middleware or route
  const response = await next();

  // =====================================================
  // Security Headers (OWASP 2025 Best Practices)
  // =====================================================

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

  // Cross-Origin Resource Sharing (CORS)
  // Only allow same origin by default
  if (apiRoutes) {
    response.headers.set('Access-Control-Allow-Origin', url.origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
  }

  return response;
});
