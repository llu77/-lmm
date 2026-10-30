// GET /api/requests/my?status — the signed-in user's requests, newest first,
// including the payroll effect of approved ones: the requests they filed plus
// those a supervisor filed about their employee record (e.g. a violation or
// an advance entered on their behalf).

import type { APIRoute } from 'astro';
import { financeAuth, ok, fail } from '@/lib/finance/http';
import { REQUEST_STATUSES, loadBranchEmployees, loadRequests, matchEmployee } from './_lib';

export const GET: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;

  const url = new URL(context.request.url);
  const status = (url.searchParams.get('status') ?? '').trim();
  if (status && status !== 'all' && !(REQUEST_STATUSES as readonly string[]).includes(status)) return fail('حالة الطلب غير صحيحة');

  try {
    let selfEmployeeId: string | null = null;
    if (session.branchId && actor.displayName !== actor.username) {
      const employees = await loadBranchEmployees(db, session.branchId);
      selfEmployeeId = matchEmployee(employees, [actor.displayName])?.id ?? null;
    }

    const all = selfEmployeeId
      ? await loadRequests(db, '(r.user_id = ? OR (m.employee_id = ? AND r.branch_id = ?))', [actor.id, selfEmployeeId, session.branchId], 500)
      : await loadRequests(db, 'r.user_id = ?', [actor.id], 500);

    const stats = { total: all.length, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    for (const r of all) {
      if (r.status === 'pending' || r.status === 'approved' || r.status === 'rejected' || r.status === 'cancelled') stats[r.status]++;
    }
    const requests = status && status !== 'all' ? all.filter(r => r.status === status) : all;
    return ok({ requests, count: requests.length, stats, selfEmployeeId });
  } catch (error) {
    console.error('Get my requests error:', error);
    return fail('حدث خطأ أثناء جلب الطلبات', 500);
  }
};
