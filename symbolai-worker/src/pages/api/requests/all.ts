// GET /api/requests/all?branchId&status&type — the branch's employee requests
// for supervisors and approvers, newest first, with status statistics over
// the whole branch (unfiltered) and the default month for payroll postings.

import type { APIRoute } from 'astro';
import { financeAuth, ok, fail, resolveBranchId, getBranchName } from '@/lib/finance/http';
import { REQUEST_TYPES, currentPeriod } from '@/lib/finance/catalog';
import { firstOpenPeriod } from '@/lib/finance/ledger';
import { REQUEST_STATUSES, loadRequests } from './_lib';

export const GET: APIRoute = async context => {
  const auth = await financeAuth(context, ['canManageRequests', 'canApproveRequests']);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;

  const url = new URL(context.request.url);
  const branchId = resolveBranchId(session, url.searchParams.get('branchId'));
  if (branchId instanceof Response) return branchId;

  const status = (url.searchParams.get('status') ?? '').trim();
  if (status && status !== 'all' && !(REQUEST_STATUSES as readonly string[]).includes(status)) return fail('حالة الطلب غير صحيحة');
  const type = (url.searchParams.get('type') ?? '').trim();
  if (type && type !== 'all' && !(REQUEST_TYPES as readonly string[]).includes(type)) return fail('نوع الطلب غير صحيح');
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 500, 1), 2000);

  try {
    const where = ['r.branch_id = ?'];
    const params: unknown[] = [branchId];
    if (status && status !== 'all') {
      where.push('r.status = ?');
      params.push(status);
    }
    if (type && type !== 'all') {
      where.push('r.request_type = ?');
      params.push(type);
    }

    const [requests, statRows, defaultPeriod, branchName] = await Promise.all([
      loadRequests(db, where.join(' AND '), params, limit),
      db
        .prepare(`SELECT status, request_type, COUNT(*) AS n FROM employee_requests WHERE branch_id = ? GROUP BY status, request_type`)
        .bind(branchId)
        .all<{ status: string | null; request_type: string; n: number }>(),
      firstOpenPeriod(db, branchId, currentPeriod()),
      getBranchName(db, branchId),
    ]);

    const stats = { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0, byType: {} as Record<string, number> };
    for (const row of statRows.results ?? []) {
      const n = Number(row.n) || 0;
      const s = row.status ?? 'pending';
      stats.total += n;
      if (s === 'pending' || s === 'approved' || s === 'rejected' || s === 'cancelled') stats[s] += n;
      stats.byType[row.request_type] = (stats.byType[row.request_type] ?? 0) + n;
    }

    return ok({ branchId, branchName, requests, count: requests.length, stats, defaultPeriod });
  } catch (error) {
    console.error('List branch requests error:', error);
    return fail('حدث خطأ أثناء جلب الطلبات', 500);
  }
};
