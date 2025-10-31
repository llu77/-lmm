import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission } from '@/lib/permissions';

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

  // Check permission to view reports (needed to view deductions)
  const permError = requirePermission(authResult, 'canViewReports');
  if (permError) {
    return permError;
  }

  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');

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

    // Calculate total
    const total = deductions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);

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

    return new Response(
      JSON.stringify({
        success: true,
        deductions,
        count: deductions.length,
        total,
        byType
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('List deductions error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب البيانات' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
