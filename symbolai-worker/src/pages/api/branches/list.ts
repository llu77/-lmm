import type { APIRoute } from 'astro';
import {
  authenticateRequest,
  createSuccessResponse,
  createErrorResponse,
  createForbiddenError,
  withErrorHandling
} from '@/lib/api-helpers';

export const GET: APIRoute = withErrorHandling(async ({ request, locals }) => {
  // Authenticate request
  const authResult = await authenticateRequest({
    kv: locals.runtime.env.SESSIONS,
    db: locals.runtime.env.DB,
    request
  });

  if (authResult instanceof Response) {
    return authResult;
  }

  // Admin can see all branches, others only their own
  let query = `SELECT * FROM branches WHERE 1=1`;
  const params: any[] = [];

  if (!authResult.permissions.canViewAllBranches) {
    if (!authResult.branchId) {
      return createForbiddenError('لا يوجد فرع محدد للمستخدم');
    }
    query += ` AND id = ?`;
    params.push(authResult.branchId);
  }

  query += ` ORDER BY name_ar`;

  const stmt = locals.runtime.env.DB.prepare(query);
  const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all();

  return createSuccessResponse({
    branches: result.results || []
  });
});
