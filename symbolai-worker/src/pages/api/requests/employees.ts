// GET /api/requests/employees?branchId — active employees of a branch for the
// request pickers. Supervisors/approvers get the full list (with the daily
// rate used for unpaid-leave deductions); self-service users only get the
// employee record that matches their own account.

import type { APIRoute } from 'astro';
import { financeAuth, ok, fail, resolveBranchId } from '@/lib/finance/http';
import { fromMinor, toMinor } from '@/lib/finance/money';
import { employeeDailyRate, loadBranchEmployees, matchEmployee } from './_lib';

export const GET: APIRoute = async context => {
  const auth = await financeAuth(context, ['canManageRequests', 'canManageEmployees', 'canApproveRequests', 'canSubmitRequests']);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;
  const p = session.permissions;

  const url = new URL(context.request.url);
  const branchId = resolveBranchId(session, url.searchParams.get('branchId'));
  if (branchId instanceof Response) return branchId;

  try {
    const employees = await loadBranchEmployees(db, branchId);
    // Same rule as /api/requests/create: only the account's full name identifies its employee record.
    const self = actor.displayName !== actor.username ? matchEmployee(employees, [actor.displayName]) : null;
    const fullList = p.canManageRequests || p.canManageEmployees || p.canApproveRequests;

    if (!fullList) {
      return ok({
        branchId,
        selfEmployeeId: self?.id ?? null,
        employees: self ? [{ id: self.id, name: self.name, nationalId: self.nationalId }] : [],
      });
    }

    return ok({
      branchId,
      selfEmployeeId: self?.id ?? null,
      employees: employees.map(e => ({
        id: e.id,
        name: e.name,
        nationalId: e.nationalId,
        fixedSalary: fromMinor(toMinor(e.baseSalary) + toMinor(e.supervisorAllowance) + toMinor(e.incentives)),
        dailyRate: employeeDailyRate(e),
      })),
    });
  } catch (error) {
    console.error('List request employees error:', error);
    return fail('حدث خطأ أثناء جلب الموظفين', 500);
  }
};
