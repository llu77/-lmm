import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';
import { checkEmailSystemHealth } from '@/lib/email-error-handler';

export const GET: APIRoute = async ({ request, locals }) => {
  // Only admin can check email system health
  const authResult = await requireAdminRole(
    locals.runtime.env.SESSIONS,
    locals.runtime.env.DB,
    request
  );

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const health = await checkEmailSystemHealth(locals.runtime.env);

    return new Response(
      JSON.stringify({
        success: true,
        health
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Email health check error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'حدث خطأ أثناء فحص صحة نظام البريد الإلكتروني'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
