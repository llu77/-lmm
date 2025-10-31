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

  // Check permission to manage employees
  const permError = requirePermission(authResult, 'canManageEmployees');
  if (permError) {
    return permError;
  }

  try {
    const {
      branchId,
      employeeName,
      nationalId,
      baseSalary,
      supervisorAllowance = 0,
      incentives = 0
    } = await request.json();

    // Validation
    if (!branchId || !employeeName || baseSalary === undefined) {
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

    // Create employee record
    const employeeId = generateId();
    const parsedBaseSalary = parseFloat(baseSalary);
    const parsedSupervisorAllowance = parseFloat(supervisorAllowance) || 0;
    const parsedIncentives = parseFloat(incentives) || 0;

    await locals.runtime.env.DB.prepare(`
      INSERT INTO employees (id, branch_id, employee_name, national_id, base_salary, supervisor_allowance, incentives, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      employeeId,
      branchId,
      employeeName,
      nationalId || null,
      parsedBaseSalary,
      parsedSupervisorAllowance,
      parsedIncentives
    ).run();

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'create',
      'employee',
      employeeId,
      { branchId, employeeName, baseSalary: parsedBaseSalary },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        employee: {
          id: employeeId
        }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Create employee error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء إضافة الموظف' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
