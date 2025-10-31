import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, logAudit, getClientIP } from '@/lib/permissions';
import { generateId } from '@/lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  // Check authentication with permissions
  const authResult = await requireAuthWithPermissions(
    locals.runtime.env.SESSIONS,
    locals.runtime.env.DB,
    request
  );

  if (authResult instanceof Response) {
    return authResult;
  }

  // Check permission to manage employees (needed for deductions)
  const permError = requirePermission(authResult, 'canManageEmployees');
  if (permError) {
    return permError;
  }

  try {
    const {
      employeeId,
      amount,
      month,
      year,
      deductionType,
      reason
    } = await request.json();

    // Validation
    if (!employeeId || amount === undefined || !month || !year) {
      return new Response(
        JSON.stringify({ error: 'البيانات المطلوبة ناقصة' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate amount is positive
    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'المبلغ يجب أن يكون أكبر من صفر' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get employee name
    const employeeResult = await locals.runtime.env.DB.prepare(
      `SELECT employee_name FROM employees WHERE id = ?`
    ).bind(employeeId).first();

    if (!employeeResult) {
      return new Response(
        JSON.stringify({ error: 'الموظف غير موجود' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create deduction record
    const deductionId = generateId();
    const { username } = authResult.permissions;

    // Combine deductionType with reason if both exist
    const fullReason = deductionType
      ? `${deductionType}${reason ? ': ' + reason : ''}`
      : reason || '';

    await locals.runtime.env.DB.prepare(`
      INSERT INTO deductions (
        id, employee_id, employee_name, amount, month, year, reason, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      deductionId,
      employeeId,
      employeeResult.employee_name,
      parsedAmount,
      month,
      parseInt(year),
      fullReason,
      username || 'admin'
    ).run();

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'create',
      'deduction',
      deductionId,
      { employeeId, amount: parsedAmount, month, year, deductionType },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        deduction: {
          id: deductionId,
          employeeId,
          employeeName: employeeResult.employee_name,
          amount: parsedAmount,
          month,
          year: parseInt(year),
          reason: fullReason
        }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Create deduction error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء إضافة الخصم' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
