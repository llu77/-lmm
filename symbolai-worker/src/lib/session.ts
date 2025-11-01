// Session management using Cloudflare KV
// Replaces Convex Auth

import type { KVNamespace } from '@cloudflare/workers-types';

export interface Session {
  userId: string;
  username: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

export interface SessionEnv {
  SESSIONS: KVNamespace;
  SESSION_SECRET?: string;
}

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Generate session token
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Create a new session
export async function createSession(
  kv: KVNamespace,
  userId: string,
  username: string,
  role: string
): Promise<string> {
  const token = generateSessionToken();
  const now = Date.now();

  const session: Session = {
    userId,
    username,
    role,
    createdAt: now,
    expiresAt: now + SESSION_DURATION
  };

  // Store session in KV with expiration
  await kv.put(`session:${token}`, JSON.stringify(session), {
    expirationTtl: SESSION_DURATION / 1000 // Convert to seconds
  });

  // Track session for this user (for concurrent session management)
  await trackUserSession(kv, userId, token);

  return token;
}

/**
 * Rotate session on login (prevents session fixation)
 * Deletes old session and creates a new one
 */
export async function rotateSessionOnLogin(
  kv: KVNamespace,
  oldToken: string | null,
  userId: string,
  username: string,
  role: string
): Promise<string> {
  // Delete old session if exists
  if (oldToken) {
    await deleteSession(kv, oldToken);
    await removeUserSession(kv, userId, oldToken);
  }

  // Create new session with new token
  return await createSession(kv, userId, username, role);
}

/**
 * Track user sessions (for concurrent session limit and security)
 */
async function trackUserSession(
  kv: KVNamespace,
  userId: string,
  token: string
): Promise<void> {
  try {
    const sessionsKey = `user_sessions:${userId}`;
    const existingData = await kv.get(sessionsKey, 'text');

    let sessions: string[] = existingData ? JSON.parse(existingData) : [];

    // Add new session
    sessions.push(token);

    // Keep only last 5 sessions (limit concurrent sessions)
    if (sessions.length > 5) {
      const oldSession = sessions.shift();
      if (oldSession) {
        await deleteSession(kv, oldSession);
      }
    }

    // Store updated sessions list
    await kv.put(sessionsKey, JSON.stringify(sessions), {
      expirationTtl: SESSION_DURATION / 1000
    });
  } catch (error) {
    console.error('Failed to track user session:', error);
    // Don't fail session creation if tracking fails
  }
}

/**
 * Remove session from user's session list
 */
async function removeUserSession(
  kv: KVNamespace,
  userId: string,
  token: string
): Promise<void> {
  try {
    const sessionsKey = `user_sessions:${userId}`;
    const existingData = await kv.get(sessionsKey, 'text');

    if (existingData) {
      let sessions: string[] = JSON.parse(existingData);
      sessions = sessions.filter(t => t !== token);

      if (sessions.length > 0) {
        await kv.put(sessionsKey, JSON.stringify(sessions), {
          expirationTtl: SESSION_DURATION / 1000
        });
      } else {
        await kv.delete(sessionsKey);
      }
    }
  } catch (error) {
    console.error('Failed to remove user session:', error);
  }
}

/**
 * Invalidate all sessions for a user
 * Use when password is changed or account is compromised
 */
export async function invalidateUserSessions(
  kv: KVNamespace,
  userId: string
): Promise<void> {
  try {
    const sessionsKey = `user_sessions:${userId}`;
    const existingData = await kv.get(sessionsKey, 'text');

    if (existingData) {
      const sessions: string[] = JSON.parse(existingData);

      // Delete all sessions
      for (const token of sessions) {
        await deleteSession(kv, token);
      }

      // Delete sessions list
      await kv.delete(sessionsKey);
    }
  } catch (error) {
    console.error('Failed to invalidate user sessions:', error);
  }
}

// Get session from token
export async function getSession(
  kv: KVNamespace,
  token: string
): Promise<Session | null> {
  const sessionData = await kv.get(`session:${token}`, 'text');

  if (!sessionData) {
    return null;
  }

  try {
    const session: Session = JSON.parse(sessionData);

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      await deleteSession(kv, token);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

// Delete session (logout)
export async function deleteSession(kv: KVNamespace, token: string): Promise<void> {
  await kv.delete(`session:${token}`);
}

// Extract session token from cookies
export function getSessionTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('session='));

  if (!sessionCookie) return null;

  return sessionCookie.split('=')[1];
}

// Create session cookie string
export function createSessionCookie(token: string, maxAge: number = SESSION_DURATION / 1000): string {
  return `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

// Delete session cookie string
export function deleteSessionCookie(): string {
  return 'session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
}

// Middleware: Require authentication
export async function requireAuth(
  kv: KVNamespace,
  request: Request
): Promise<Session | Response> {
  const cookieHeader = request.headers.get('Cookie');
  const token = getSessionTokenFromCookie(cookieHeader);

  if (!token) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'Location': '/auth/login'
      }
    });
  }

  const session = await getSession(kv, token);

  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'Location': '/auth/login',
        'Set-Cookie': deleteSessionCookie()
      }
    });
  }

  return session;
}

// Middleware: Require admin role
export async function requireAdmin(
  kv: KVNamespace,
  request: Request
): Promise<Session | Response> {
  const result = await requireAuth(kv, request);

  if (result instanceof Response) {
    return result;
  }

  if (result.role !== 'admin') {
    return new Response('Forbidden: Admin access required', {
      status: 403
    });
  }

  return result;
}
