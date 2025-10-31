import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess } from '@/lib/permissions';

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

  // Check permission to manage orders
  const permError = requirePermission(authResult, 'canManageOrders');
  if (permError) {
    return permError;
  }

  try {
    const url = new URL(request.url);
    let branchId = url.searchParams.get('branchId');
    const status = url.searchParams.get('status');
    const employeeName = url.searchParams.get('employeeName');
    const isDraft = url.searchParams.get('isDraft');

    // If no branchId provided, use user's branch
    if (!branchId) {
      branchId = authResult.permissions.branchId;
    }

    // Validate branch access if branchId is specified
    if (branchId) {
      const branchError = validateBranchAccess(authResult, branchId);
      if (branchError) {
        return branchError;
      }
    }

    let query = `
      SELECT *
      FROM product_orders
      WHERE 1=1
    `;
    const params: any[] = [];

    if (branchId) {
      query += ` AND branch_id = ?`;
      params.push(branchId);
    }

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (employeeName) {
      query += ` AND employee_name LIKE ?`;
      params.push(`%${employeeName}%`);
    }

    if (isDraft !== null && isDraft !== undefined && isDraft !== '') {
      query += ` AND is_draft = ?`;
      params.push(isDraft === 'true' ? 1 : 0);
    }

    query += ` ORDER BY created_at DESC`;

    const stmt = locals.runtime.env.DB.prepare(query);
    const result = params.length > 0
      ? await stmt.bind(...params).all()
      : await stmt.all();

    const orders = (result.results || []).map((order: any) => ({
      ...order,
      products: JSON.parse(order.products || '[]')
    }));

    // Calculate statistics
    const stats = {
      total: orders.length,
      draft: orders.filter((o: any) => o.is_draft === 1).length,
      pending: orders.filter((o: any) => o.status === 'pending').length,
      approved: orders.filter((o: any) => o.status === 'approved').length,
      rejected: orders.filter((o: any) => o.status === 'rejected').length,
      completed: orders.filter((o: any) => o.status === 'completed').length,
      totalValue: orders.reduce((sum: number, o: any) => sum + (o.grand_total || 0), 0)
    };

    return new Response(
      JSON.stringify({
        success: true,
        orders,
        stats
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('List orders error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب البيانات' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
