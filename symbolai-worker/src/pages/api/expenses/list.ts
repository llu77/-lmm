import type { APIRoute } from 'astro';
import {
  requireAuthWithPermissions,
  requirePermission,
  validateBranchAccess,
  getBranchFilterSQL,
  logAudit
} from '@/lib/permissions';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication and load permissions
    const authResult = await requireAuthWithPermissions(locals.runtime.env.SESSIONS, request, locals.runtime.env.DB);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user, permissions } = authResult;

    // Check permission to view reports
    const permCheck = await requirePermission(permissions, 'can_view_reports');
    if (permCheck instanceof Response) {
      return permCheck;
    }

    const url = new URL(request.url);
    const branchId = url.searchParams.get('branchId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const category = url.searchParams.get('category');

    // Validate branch access if branchId is provided
    if (branchId) {
      const branchCheck = await validateBranchAccess(user, permissions, branchId, locals.runtime.env.DB);
      if (branchCheck instanceof Response) {
        return branchCheck;
      }
    }

    // Get branch filter SQL
    const branchFilter = getBranchFilterSQL(user, permissions);

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Build query with branch filter
    const query = `
      SELECT * FROM expenses
      WHERE date >= ? AND date <= ?
      ${branchFilter ? `AND ${branchFilter}` : ''}
      ${category && category !== 'all' ? 'AND category = ?' : ''}
      ORDER BY date DESC
    `;

    const bindings = [
      startDate || defaultStartDate,
      endDate || defaultEndDate
    ];
    if (category && category !== 'all') {
      bindings.push(category);
    }

    const result = await locals.runtime.env.DB.prepare(query)
      .bind(...bindings)
      .all();

    const expenses = result.results || [];

    // Calculate stats by category
    const statsByCategory: { [key: string]: { count: number; total: number } } = {};
    expenses.forEach((e: any) => {
      const cat = e.category || 'أخرى';
      if (!statsByCategory[cat]) {
        statsByCategory[cat] = { count: 0, total: 0 };
      }
      statsByCategory[cat].count++;
      statsByCategory[cat].total += e.amount;
    });

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      user.id,
      'view',
      'expenses',
      { count: expenses.length, branchId, category }
    );

    return new Response(
      JSON.stringify({
        success: true,
        expenses,
        count: expenses.length,
        statsByCategory
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('List expenses error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب البيانات' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
