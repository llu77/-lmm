import type { APIRoute } from 'astro';
import { getSessionTokenFromCookie, getSession } from '@/lib/session';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Check if runtime bindings are available
    if (!locals.runtime?.env?.SESSIONS) {
      return new Response(
        JSON.stringify({ authenticated: false }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const cookieHeader = request.headers.get('Cookie');
    const token = getSessionTokenFromCookie(cookieHeader);

    if (!token) {
      return new Response(
        JSON.stringify({ authenticated: false }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const session = await getSession(locals.runtime.env.SESSIONS, token);

    if (!session) {
      return new Response(
        JSON.stringify({ authenticated: false }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        authenticated: true,
        user: {
          userId: session.userId,
          username: session.username,
          role: session.role
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Session check error:', error);
    return new Response(
      JSON.stringify({ authenticated: false }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
