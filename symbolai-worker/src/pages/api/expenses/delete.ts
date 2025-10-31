import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess, logAudit, getClientIP } from '@/lib/permissions';

export const DELETE: APIRoute = async ({ request, locals }) => {
  // Check authentication with permissions
  const authResult = await requireAuthWithPermissions(
    locals.runtime.env.SESSIONS,
    locals.runtime.env.DB,
    request
  );

  if (authResult instanceof Response) {
    return authResult;
  }

  // Check permission to add expense (same permission for create/delete)
  const permError = requirePermission(authResult, 'canAddExpense');
  if (permError) {
    return permError;
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'معرف المصروف مطلوب' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get expense to check branch access
    const expense = await locals.runtime.env.DB.prepare(
      `SELECT branch_id, title, amount FROM expenses WHERE id = ?`
    ).bind(id).first();

    if (!expense) {
      return new Response(
        JSON.stringify({ error: 'المصروف غير موجود' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate branch access
    const branchError = validateBranchAccess(authResult, expense.branch_id as string);
    if (branchError) {
      return branchError;
    }

    // Delete expense
    await locals.runtime.env.DB.prepare(
      `DELETE FROM expenses WHERE id = ?`
    ).bind(id).run();

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'delete',
      'expense',
      id,
      { branchId: expense.branch_id, title: expense.title, amount: expense.amount },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Delete expense error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء حذف المصروف' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
