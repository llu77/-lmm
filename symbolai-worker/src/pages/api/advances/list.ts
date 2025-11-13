import type { APIRoute } from 'astro';
import {
  authenticateRequest,
  calculateTotalAmount,
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
  const employeeId = url.searchParams.get('employeeId');
  const month = url.searchParams.get('month');
  const year = url.searchParams.get('year');

  // Build query with filters
  let query = `
    SELECT
      a.*,
      e.employee_name,
      e.national_id,
      e.branch_id
    FROM advances a
    LEFT JOIN employees e ON a.employee_id = e.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (employeeId) {
    query += ` AND a.employee_id = ?`;
    params.push(employeeId);
  }

  if (month) {
    query += ` AND a.month = ?`;
    params.push(month);
  }

  if (year) {
    query += ` AND a.year = ?`;
    params.push(parseInt(year));
  }

  query += ` ORDER BY a.year DESC, a.month DESC, a.created_at DESC`;

  const stmt = locals.runtime.env.DB.prepare(query);
  const result = params.length > 0
    ? await stmt.bind(...params).all()
    : await stmt.all();

  const advances = result.results || [];

  // Calculate total amount
  const total = calculateTotalAmount(advances);

  return createSuccessResponse({
    advances,
    count: advances.length,
    total
  });
});
