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

  // Check permission to manage employees (needed for advances)
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
      notes
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

    // Create advance record
    const advanceId = generateId();
    const { username } = authResult.permissions;

    await locals.runtime.env.DB.prepare(`
      INSERT INTO advances (
        id, employee_id, employee_name, amount, month, year, description, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      advanceId,
      employeeId,
      employeeResult.employee_name,
      parsedAmount,
      month,
      parseInt(year),
      notes || '',
      username || 'admin'
    ).run();

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'create',
      'advance',
      advanceId,
      { employeeId, amount: parsedAmount, month, year },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        advance: {
          id: advanceId,
          employeeId,
          employeeName: employeeResult.employee_name,
          amount: parsedAmount,
          month,
          year: parseInt(year),
          description: notes
        }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Create advance error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء إضافة السلفة' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
