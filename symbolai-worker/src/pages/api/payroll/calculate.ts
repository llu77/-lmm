import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess } from '@/lib/permissions';
import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter';

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

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    request,
    locals.runtime.env.KV || locals.runtime.env.SESSIONS,
    RATE_LIMIT_PRESETS.financial_critical
  );
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { branchId, month, year } = await request.json();

    // Validation
    if (!branchId || !month || !year) {
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

    // Get all active employees
    const employeesResult = await locals.runtime.env.DB.prepare(`
      SELECT
        id,
        employee_name,
        national_id,
        base_salary,
        supervisor_allowance,
        incentives
      FROM employees
      WHERE branch_id = ? AND is_active = 1
    `).bind(branchId).all();

    const employees = employeesResult.results || [];

    if (employees.length === 0) {
      return new Response(
        JSON.stringify({ error: 'لا يوجد موظفين نشطين في هذا الفرع' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get bonus records for this month/year
    const bonusResult = await locals.runtime.env.DB.prepare(`
      SELECT employee_bonuses
      FROM bonus_records
      WHERE branch_id = ? AND month = ? AND year = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(branchId, month, parseInt(year)).first();

    const bonusData: { [key: string]: number } = {};
    if (bonusResult) {
      try {
        const bonuses = JSON.parse(bonusResult.employee_bonuses as string);
        bonuses.forEach((b: any) => {
          bonusData[b.employeeName] = b.bonusAmount || 0;
        });
      } catch (e) {
        console.error('Error parsing bonus data:', e);
      }
    }

    // Get advances for this month/year
    const advancesResult = await locals.runtime.env.DB.prepare(`
      SELECT employee_id, SUM(amount) as total_advances
      FROM advances
      WHERE month = ? AND year = ?
      GROUP BY employee_id
    `).bind(month, parseInt(year)).all();

    const advancesData: { [key: string]: number } = {};
    (advancesResult.results || []).forEach((a: any) => {
      advancesData[a.employee_id] = a.total_advances || 0;
    });

    // Get deductions for this month/year
    const deductionsResult = await locals.runtime.env.DB.prepare(`
      SELECT employee_id, SUM(amount) as total_deductions
      FROM deductions
      WHERE month = ? AND year = ?
      GROUP BY employee_id
    `).bind(month, parseInt(year)).all();

    const deductionsData: { [key: string]: number } = {};
    (deductionsResult.results || []).forEach((d: any) => {
      deductionsData[d.employee_id] = d.total_deductions || 0;
    });

    // Calculate payroll for each employee
    const payrollData = employees.map((emp: any) => {
      const baseSalary = emp.base_salary || 0;
      const supervisorAllowance = emp.supervisor_allowance || 0;
      const incentives = emp.incentives || 0;
      const bonus = bonusData[emp.employee_name] || 0;
      const advances = advancesData[emp.id] || 0;
      const deductions = deductionsData[emp.id] || 0;

      const grossSalary = baseSalary + supervisorAllowance + incentives;
      const totalEarnings = grossSalary + bonus;
      const totalDeductions = advances + deductions;
      const netSalary = totalEarnings - totalDeductions;

      return {
        employeeId: emp.id,
        employeeName: emp.employee_name,
        nationalId: emp.national_id,
        baseSalary,
        supervisorAllowance,
        incentives,
        bonus,
        grossSalary,
        totalEarnings,
        advances,
        deductions,
        totalDeductions,
        netSalary
      };
    });

    // Calculate totals
    const totals = payrollData.reduce((acc, emp) => ({
      totalGrossSalary: acc.totalGrossSalary + emp.grossSalary,
      totalBonus: acc.totalBonus + emp.bonus,
      totalEarnings: acc.totalEarnings + emp.totalEarnings,
      totalAdvances: acc.totalAdvances + emp.advances,
      totalDeductions: acc.totalDeductions + emp.totalDeductions,
      totalNetSalary: acc.totalNetSalary + emp.netSalary
    }), {
      totalGrossSalary: 0,
      totalBonus: 0,
      totalEarnings: 0,
      totalAdvances: 0,
      totalDeductions: 0,
      totalNetSalary: 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        payrollData,
        totals,
        month,
        year: parseInt(year),
        branchId,
        employeeCount: employees.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Calculate payroll error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء حساب الرواتب' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
