import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, validateBranchAccess } from '@/lib/permissions';

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
    // Get branch ID from query params
    const url = new URL(request.url);
    const branchId = url.searchParams.get('branchId');

    if (!branchId) {
      return new Response(
        JSON.stringify({ error: 'معرف الفرع مطلوب' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user can access this branch
    const accessError = validateBranchAccess(authResult, branchId);
    if (accessError) {
      return accessError;
    }

    // Get branch statistics
    const stats = await locals.runtime.env.DB.prepare(`
      SELECT * FROM branch_statistics WHERE id = ?
    `).bind(branchId).first();

    if (!stats) {
      return new Response(
        JSON.stringify({ error: 'الفرع غير موجود' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Get branch stats error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب إحصائيات الفرع' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
