import type { APIRoute } from 'astro';
import {
  authenticateRequest,
  resolveBranchFilter,
  buildBranchFilteredQuery,
  createSuccessResponse,
  withErrorHandling
} from '@/lib/api-helpers';

export const GET: APIRoute = withErrorHandling(async ({ request, locals }) => {
  // Authenticate request with required permission
  const authResult = await authenticateRequest({
    kv: locals.runtime.env.SESSIONS,
    db: locals.runtime.env.DB,
    request,
    requiredPermission: 'canViewReports'
  });

  if (authResult instanceof Response) {
    return authResult;
  }

  // Extract query parameters
  const url = new URL(request.url);
  const requestedBranchId = url.searchParams.get('branchId');
  const month = url.searchParams.get('month');
  const year = url.searchParams.get('year');

  // Resolve branch filtering (use session branch if not provided)
  const branchId = await resolveBranchFilter({
    session: authResult,
    requestedBranchId: requestedBranchId || authResult.branchId
  });

  if (branchId instanceof Response) {
    return branchId;
  }

  // Build query with branch filtering
  let baseQuery = `SELECT * FROM payroll_records WHERE 1=1`;
  const { baseQuery: query, params } = buildBranchFilteredQuery(
    baseQuery,
    authResult,
    branchId
  );

  let finalQuery = query;

  // Add month and year filters
  if (month) {
    finalQuery += ` AND month = ?`;
    params.push(month);
  }

  if (year) {
    finalQuery += ` AND year = ?`;
    params.push(parseInt(year));
  }

  finalQuery += ` ORDER BY year DESC, month DESC, generated_at DESC`;

  const stmt = locals.runtime.env.DB.prepare(finalQuery);
  const result = params.length > 0
    ? await stmt.bind(...params).all()
    : await stmt.all();

  const payrollRecords = (result.results || []).map((record: any) => ({
    ...record,
    employees: JSON.parse(record.employees || '[]')
  }));

  // Calculate statistics
  const stats = {
    totalRecords: payrollRecords.length,
    totalPaid: payrollRecords.reduce((sum: number, r: any) => sum + (r.total_net_salary || 0), 0),
    totalEmployees: payrollRecords.reduce((sum: number, r: any) => sum + r.employees.length, 0)
  };

  return createSuccessResponse({
    payrollRecords,
    stats
  });
});
