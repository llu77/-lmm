import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess, logAudit, getClientIP } from '@/lib/permissions';
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

  // Check permission to generate payroll
  const permError = requirePermission(authResult, 'canGeneratePayroll');
  if (permError) {
    return permError;
  }

  try {
    const {
      branchId,
      month,
      year,
      payrollData,
      totals
    } = await request.json();

    // Validation
    if (!branchId || !month || !year || !payrollData || !Array.isArray(payrollData)) {
      return new Response(
        JSON.stringify({ error: 'البيانات المطلوبة ناقصة' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate branch access
    const branchError = validateBranchAccess(authResult, branchId);
    if (branchError) {
      return branchError;
    }

    // Check if payroll already exists for this month/year
    const existingPayroll = await locals.runtime.env.DB.prepare(`
      SELECT id FROM payroll_records
      WHERE branch_id = ? AND month = ? AND year = ?
    `).bind(branchId, month, parseInt(year)).first();

    if (existingPayroll) {
      return new Response(
        JSON.stringify({ error: 'سجل الرواتب لهذا الشهر موجود بالفعل' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Save payroll record
    const payrollId = generateId();
    const { username } = authResult.permissions;
    const employeesJson = JSON.stringify(payrollData);

    await locals.runtime.env.DB.prepare(`
      INSERT INTO payroll_records (
        id,
        branch_id,
        month,
        year,
        employees,
        total_net_salary,
        generated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      payrollId,
      branchId,
      month,
      parseInt(year),
      employeesJson,
      totals?.totalNetSalary || 0,
      username || 'admin'
    ).run();

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'create',
      'payroll_record',
      payrollId,
      { branchId, month, year, totalNetSalary: totals?.totalNetSalary, employeeCount: payrollData.length },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        payrollId,
        message: 'تم حفظ سجل الرواتب بنجاح'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Save payroll error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء حفظ سجل الرواتب' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
