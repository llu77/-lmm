import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess } from '@/lib/permissions';
import { employeeRequestQueries } from '@/lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  // Check authentication with permissions
  const authResult = await requireAuthWithPermissions(
    locals.runtime.env.SESSIONS,
    locals.runtime.env.DB,
    request
  );

  if (authResult instanceof Response) {
    return authResult;
  }

  // Check permission to manage requests
  const permError = requirePermission(authResult, 'canManageRequests');
  if (permError) {
    return permError;
  }

  try {
    const url = new URL(request.url);
    let branchId = url.searchParams.get('branchId');
    const status = url.searchParams.get('status'); // optional filter

    // If no branchId provided, use user's branch
    if (!branchId) {
      branchId = authResult.permissions.branchId || 'BR001';
    }

    // Validate branch access
    const branchError = validateBranchAccess(authResult, branchId);
    if (branchError) {
      return branchError;
    }

    const result = await employeeRequestQueries.getByBranch(
      locals.runtime.env.DB,
      branchId,
      status && status !== 'all' ? status : undefined
    );

    const requests = result.results || [];

    // Count by status
    const pending = requests.filter((r: any) => r.status === 'pending').length;
    const approved = requests.filter((r: any) => r.status === 'approved').length;
    const rejected = requests.filter((r: any) => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({
        success: true,
        requests,
        count: requests.length,
        stats: { pending, approved, rejected }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Get all requests error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب البيانات' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
