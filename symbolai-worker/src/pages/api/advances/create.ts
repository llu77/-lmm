// POST /api/advances/create {employeeId, amount, month, year, notes}
// Backward-compatible wrapper: records the advance in the payroll adjustments
// ledger (category 'advance') so it is deducted in that month's payroll.
// New code should call /api/adjustments/create directly.

import type { APIRoute } from 'astro';
import { canAccessBranch } from '@/lib/permissions';
import { parseMonth, toPeriod } from '@/lib/finance/catalog';
import { getBranchEmployee } from '@/lib/finance/ledger';
import { fail, financeAuth, ok, readJsonObject, str, type FinanceContext } from '@/lib/finance/http';
import { createAdjustment } from '../adjustments/create';

export interface LegacyTarget {
  employee: NonNullable<Awaited<ReturnType<typeof getBranchEmployee>>>;
  period: string;
  month: number;
  year: number;
}

/** Shared by the advances/deductions wrappers: employee (branch-checked) + month/year → period. */
export async function resolveLegacyTarget(auth: FinanceContext, body: Record<string, unknown>): Promise<LegacyTarget | Response> {
  const employeeId = str(body.employeeId, 100);
  if (!employeeId) return fail('يرجى اختيار الموظف', 400);
  const month = parseMonth(typeof body.month === 'number' ? body.month : str(body.month, 20));
  const year = typeof body.year === 'number' ? body.year : Number(str(body.year, 10));
  if (!month || !Number.isInteger(year) || year < 2000 || year > 2100) return fail('يرجى تحديد الشهر والسنة', 400);
  const employee = await getBranchEmployee(auth.db, employeeId);
  if (!employee || !canAccessBranch(auth.session, employee.branchId)) return fail('الموظف غير موجود', 404);
  return { employee, period: toPeriod(year, month), month, year };
}

export const POST: APIRoute = async context => {
  const auth = await financeAuth(context, ['canGeneratePayroll', 'canManageEmployees']);
  if (auth instanceof Response) return auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);

  try {
    const target = await resolveLegacyTarget(auth, body);
    if (target instanceof Response) return target;

    const result = await createAdjustment(
      auth,
      context.request,
      {
        branchId: target.employee.branchId,
        employeeId: target.employee.id,
        period: target.period,
        category: 'advance',
        amount: body.amount,
        description: body.notes ?? body.description,
      },
      'advances/create',
    );
    if (!result.ok) return result.response;

    const { adjustment, warnings } = result;
    return ok(
      {
        advance: {
          id: adjustment.id,
          employeeId: adjustment.employeeId,
          employeeName: adjustment.employeeName,
          amount: adjustment.amount,
          month: target.month,
          year: target.year,
          period: adjustment.period,
          description: adjustment.description,
        },
        adjustment,
        warnings,
      },
      201,
    );
  } catch (error) {
    console.error('Create advance error:', error);
    return fail('حدث خطأ أثناء إضافة السلفة', 500);
  }
};
