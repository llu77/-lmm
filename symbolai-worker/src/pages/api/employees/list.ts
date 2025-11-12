import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess, getBranchFilterSQL } from '@/lib/permissions';
import { employeeQueries } from '@/lib/db';

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

  // Check permission to view reports/employees
  const permError = requirePermission(authResult, 'canViewReports');
  if (permError) {
    return permError;
  }

  try {
    const url = new URL(request.url);
    let branchId = url.searchParams.get('branchId');
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    // If no branchId provided, use user's branch (for non-admins)
    if (!branchId) {
      if (!authResult.permissions.canViewAllBranches) {
        branchId = authResult.branchId;
      }
    } else {
      // Validate branch access if branchId is specified
      const branchError = validateBranchAccess(authResult, branchId);
      if (branchError) {
        return branchError;
      }
    }

    // Build query with branch isolation
    let query = `SELECT * FROM employees WHERE 1=1`;
    const params: any[] = [];

    // Apply branch filtering
    if (branchId) {
      query += ` AND branch_id = ?`;
      params.push(branchId);
    } else if (!authResult.permissions.canViewAllBranches) {
      // Non-admin without branch can't see any employees
      return new Response(
        JSON.stringify({
          success: true,
          employees: [],
          count: 0,
          totalSalaryCost: 0
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Filter by active status
    if (!includeInactive) {
      query += ` AND is_active = 1`;
    }

    query += ` ORDER BY employee_name`;

    const stmt = locals.runtime.env.DB.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

    let employees = result.results || [];

    // If includeInactive is false, filter only active employees
    if (!includeInactive) {
      employees = employees.filter((e: any) => e.is_active === 1);
    }

    // Calculate total salary cost
    const totalSalaryCost = employees.reduce((sum: number, e: any) => {
      return sum + (e.base_salary || 0) + (e.supervisor_allowance || 0) + (e.incentives || 0);
    }, 0);

    return new Response(
      JSON.stringify({
        success: true,
        employees,
        count: employees.length,
        totalSalaryCost
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('List employees error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب البيانات' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
