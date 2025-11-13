import type { APIRoute } from 'astro';
import { getSessionTokenFromCookie, deleteSession, deleteSessionCookie } from '@/lib/session';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const cookieHeader = request.headers.get('Cookie');
    const token = getSessionTokenFromCookie(cookieHeader);

    if (token && locals.runtime?.env?.SESSIONS) {
      // Delete session from KV
      await deleteSession(locals.runtime.env.SESSIONS, token);
    }

    // Return success with cookie deletion
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': deleteSessionCookie()
        }
      }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء تسجيل الخروج' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
