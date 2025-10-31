import type { APIRoute } from 'astro';
import { requireAuthWithPermissions } from '@/lib/permissions';

export const GET: APIRoute = async ({ request, locals }) => {
  // Check authentication and permissions
  const authResult = await requireAuthWithPermissions(
    locals.runtime.env.SESSIONS,
    locals.runtime.env.DB,
    request
  );

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    // Admin can see all branches, others only their own
    let query = `SELECT * FROM branches WHERE 1=1`;
    const params: any[] = [];

    if (!authResult.permissions.canViewAllBranches) {
      if (!authResult.branchId) {
        return new Response(
          JSON.stringify({ error: 'لا يوجد فرع محدد للمستخدم' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      query += ` AND id = ?`;
      params.push(authResult.branchId);
    }

    query += ` ORDER BY name_ar`;

    const stmt = locals.runtime.env.DB.prepare(query);
    const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all();

    return new Response(
      JSON.stringify({
        success: true,
        branches: result.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('List branches error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب الفروع' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
