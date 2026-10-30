// GET /api/employees/list?branchId[&activeOnly=1][&includeInactive=1]
// Branch-bound users (supervisors, partners) only ever see their own branch;
// a different branchId is a 403. Users who see all branches get the branch they
// ask for, or every branch when they ask for none. Active employees only unless
// includeInactive is set. Salary and ID columns are returned only to payroll /
// HR roles and the manager (partners get names only).

import type { APIRoute } from 'astro';
import { canAccessBranch } from '@/lib/permissions';
import { fromMinor, toMinor } from '@/lib/finance/money';
import { canApproveFinance, fail, financeAuth, ok } from '@/lib/finance/http';

const TRUE_VALUES = new Set(['1', 'true', 'yes']);

export const GET: APIRoute = async context => {
  const auth = await financeAuth(context, [
    'canViewReports',
    'canManageEmployees',
    'canGeneratePayroll',
    'canManageBonus',
    'canManageRequests',
    'canApproveRequests',
  ]);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;
  const p = session.permissions;

  const url = new URL(context.request.url);
  const requested = (url.searchParams.get('branchId') ?? '').trim();
  const activeOnly = TRUE_VALUES.has((url.searchParams.get('activeOnly') ?? '').toLowerCase());
  const includeInactive = !activeOnly && TRUE_VALUES.has((url.searchParams.get('includeInactive') ?? '').toLowerCase());
  const showSalary = p.canManageEmployees || p.canGeneratePayroll || canApproveFinance(session);

  let branchId: string | null;
  if (requested) {
    if (!canAccessBranch(session, requested)) return fail('لا يمكنك الوصول إلى بيانات هذا الفرع', 403);
    branchId = requested;
  } else if (p.canViewAllBranches) {
    branchId = null; // every branch
  } else if (session.branchId) {
    branchId = session.branchId;
  } else {
    return ok({ branchId: null, employees: [], count: 0, activeCount: 0, totalSalaryCost: showSalary ? 0 : null });
  }

  try {
    const where: string[] = [];
    const params: unknown[] = [];
    if (branchId) {
      where.push('branch_id = ?');
      params.push(branchId);
    }
    if (!includeInactive) where.push('is_active = 1');
    const sql = `SELECT * FROM employees${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY is_active DESC, employee_name`;
    const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
    const rows = result.results ?? [];

    let totalMinor = 0;
    let activeCount = 0;
    for (const row of rows) {
      if (Number(row.is_active) !== 1) continue;
      activeCount++;
      totalMinor += toMinor(row.base_salary) + toMinor(row.supervisor_allowance) + toMinor(row.incentives);
    }

    const employees = showSalary
      ? rows
      : rows.map(row => ({
          id: row.id,
          branch_id: row.branch_id,
          employee_name: row.employee_name,
          is_active: row.is_active,
        }));

    return ok({
      branchId,
      employees,
      count: employees.length,
      activeCount,
      totalSalaryCost: showSalary ? fromMinor(totalMinor) : null,
    });
  } catch (error) {
    console.error('List employees error:', error);
    return fail('حدث خطأ أثناء تحميل الموظفين', 500);
  }
};
