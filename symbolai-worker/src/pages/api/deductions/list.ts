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
      d.*,
      e.employee_name,
      e.national_id,
      e.branch_id
    FROM deductions d
    LEFT JOIN employees e ON d.employee_id = e.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (employeeId) {
    query += ` AND d.employee_id = ?`;
    params.push(employeeId);
  }

  if (month) {
    query += ` AND d.month = ?`;
    params.push(month);
  }

  if (year) {
    query += ` AND d.year = ?`;
    params.push(parseInt(year));
  }

  query += ` ORDER BY d.year DESC, d.month DESC, d.created_at DESC`;

  const stmt = locals.runtime.env.DB.prepare(query);
  const result = params.length > 0
    ? await stmt.bind(...params).all()
    : await stmt.all();

  const deductions = result.results || [];

  // Calculate total amount
  const total = calculateTotalAmount(deductions);

  // Extract type from reason field (format: "type: reason")
  const byType = deductions.reduce((acc: any, d: any) => {
    const reasonParts = (d.reason || '').split(':');
    const type = reasonParts.length > 1 ? reasonParts[0].trim() : 'أخرى';
    if (!acc[type]) {
      acc[type] = { count: 0, total: 0 };
    }
    acc[type].count++;
    acc[type].total += d.amount || 0;
    return acc;
  }, {});

  return createSuccessResponse({
    deductions,
    count: deductions.length,
    total,
    byType
  });
});
