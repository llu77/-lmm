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

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  return response;
});
