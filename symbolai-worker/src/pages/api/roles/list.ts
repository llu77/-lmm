import type { APIRoute } from 'astro';
import { requireAuthWithPermissions } from '@/lib/permissions';

export const GET: APIRoute = async ({ request, locals }) => {
  // Check authentication
  const authResult = await requireAuthWithPermissions(
    locals.runtime.env.SESSIONS,
    locals.runtime.env.DB,
    request
  );

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    // Get all roles
    const result = await locals.runtime.env.DB.prepare(`
      SELECT * FROM roles ORDER BY
        CASE name
          WHEN 'admin' THEN 1
          WHEN 'supervisor' THEN 2
          WHEN 'partner' THEN 3
          WHEN 'employee' THEN 4
          ELSE 5
        END
    `).all();

    return new Response(
      JSON.stringify({
        success: true,
        roles: result.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('List roles error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب الأدوار' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
