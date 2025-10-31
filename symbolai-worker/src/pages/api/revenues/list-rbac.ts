import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, getBranchFilterSQL, validateBranchAccess } from '@/lib/permissions';

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

  // Check permission to view reports
  const permError = requirePermission(authResult, 'canViewReports');
  if (permError) {
    return permError;
  }

  try {
    const url = new URL(request.url);
    const requestedBranchId = url.searchParams.get('branchId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const defaultEndDate = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Build query with branch isolation
    let query = `SELECT * FROM revenues WHERE date >= ? AND date <= ?`;
    const params: any[] = [defaultStartDate, defaultEndDate];

    // Apply branch filtering based on user permissions
    if (requestedBranchId) {
      // Validate access to requested branch
      const branchError = validateBranchAccess(authResult, requestedBranchId);
      if (branchError) {
        return branchError;
      }
      query += ` AND branch_id = ?`;
      params.push(requestedBranchId);
    } else {
      // Auto-apply branch filter for non-admin users
      const { clause, params: branchParams } = getBranchFilterSQL(authResult);
      if (clause) {
        query += ` ${clause}`;
        params.push(...branchParams);
      } else if (!authResult.permissions.canViewAllBranches && authResult.branchId) {
        // Fallback: use session branchId
        query += ` AND branch_id = ?`;
        params.push(authResult.branchId);
      }
    }

    query += ` ORDER BY date DESC`;

    const stmt = locals.runtime.env.DB.prepare(query);
    const result = await stmt.bind(...params).all();

    return new Response(
      JSON.stringify({
        success: true,
        revenues: result.results || [],
        count: result.results?.length || 0,
        userBranch: authResult.branchId,
        canViewAllBranches: authResult.permissions.canViewAllBranches
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('List revenues error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب البيانات' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
