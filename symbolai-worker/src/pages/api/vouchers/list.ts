import type { APIRoute } from 'astro';
import { financeAuth, ok, fail, isIsoDate, resolveBranchId, canApproveFinance } from '@/lib/finance/http';
import { getOrganizationProfile } from '@/lib/finance/documents';
import { fromMinor } from '@/lib/finance/money';
import type { VoucherType } from '@/lib/finance/catalog';
import { VOUCHER_VIEW_FLAGS, canCreateVoucherType, canSeePayVouchers, isVoucherType, mapVoucherRow, voucherActions } from './get';

const STATUSES = new Set(['pending', 'approved', 'cancelled']);
const SOURCES = new Set(['manual', 'payroll', 'request']);

/** Escapes LIKE wildcards; use with ESCAPE '\'. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, ch => `\\${ch}`);
}

interface TypeSummary {
  count: number;
  approvedCount: number;
  totalApproved: number;
  pendingCount: number;
  totalPending: number;
  cancelledCount: number;
}

function emptySummary(): TypeSummary {
  return { count: 0, approvedCount: 0, totalApproved: 0, pendingCount: 0, totalPending: 0, cancelledCount: 0 };
}

// GET /api/vouchers/list?branchId&type&status&from&to&q&source&sourceId&employeeId&limit&offset
// rows: vouchers matching every filter (paged). summary: per type, matching
// every filter except type/status (so both tabs can show their totals).
// summary.count = active vouchers (pending + approved).
export const GET: APIRoute = async context => {
  const auth = await financeAuth(context, VOUCHER_VIEW_FLAGS);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;
  const params = new URL(context.request.url).searchParams;

  const branchId = resolveBranchId(session, params.get('branchId'));
  if (branchId instanceof Response) return branchId;

  const base: string[] = ['branch_id = ?'];
  const baseParams: unknown[] = [branchId];
  // Salary and advance vouchers carry per-employee pay: hidden from users
  // without payroll access (e.g. partners), totals included.
  if (!canSeePayVouchers(session)) base.push(`source_type = 'manual'`);

  const from = (params.get('from') ?? '').trim();
  const to = (params.get('to') ?? '').trim();
  if (from && !isIsoDate(from)) return fail('تاريخ البداية غير صحيح', 400);
  if (to && !isIsoDate(to)) return fail('تاريخ النهاية غير صحيح', 400);
  if (from && to && from > to) return fail('تاريخ البداية بعد تاريخ النهاية', 400);
  if (from) {
    base.push('voucher_date >= ?');
    baseParams.push(from);
  }
  if (to) {
    base.push('voucher_date <= ?');
    baseParams.push(to);
  }

  const q = (params.get('q') ?? '').trim();
  if (q.length > 100) return fail('نص البحث طويل جداً', 400);
  if (q) {
    const like = `%${escapeLike(q)}%`;
    base.push(
      `(voucher_number LIKE ? ESCAPE '\\' OR party_name LIKE ? ESCAPE '\\' OR purpose LIKE ? ESCAPE '\\' OR party_id_number LIKE ? ESCAPE '\\')`,
    );
    baseParams.push(like, like, like, like);
  }

  const source = (params.get('source') ?? '').trim();
  const sourceId = (params.get('sourceId') ?? '').trim();
  if (source) {
    if (!SOURCES.has(source)) return fail('مصدر السند غير صحيح', 400);
    base.push('source_type = ?');
    baseParams.push(source);
  }
  if (sourceId) {
    if (!source) return fail('يرجى تحديد مصدر السند مع المعرّف', 400);
    if (sourceId.length > 200) return fail('معرّف المصدر غير صحيح', 400);
    if (source === 'payroll') {
      // Payroll vouchers use `${runId}:${employeeId}`; the link passes the run id.
      base.push(`(source_id = ? OR source_id LIKE ? ESCAPE '\\')`);
      baseParams.push(sourceId, `${escapeLike(sourceId)}:%`);
    } else {
      base.push('source_id = ?');
      baseParams.push(sourceId);
    }
  }

  const employeeId = (params.get('employeeId') ?? '').trim();
  if (employeeId) {
    base.push('employee_id = ?');
    baseParams.push(employeeId.slice(0, 100));
  }

  const filtered = [...base];
  const filteredParams = [...baseParams];
  const type = (params.get('type') ?? '').trim();
  if (type) {
    if (!isVoucherType(type)) return fail('نوع السند غير صحيح', 400);
    filtered.push('voucher_type = ?');
    filteredParams.push(type);
  }
  const status = (params.get('status') ?? '').trim();
  if (status && status !== 'all') {
    if (status === 'active') {
      filtered.push(`status != 'cancelled'`);
    } else if (STATUSES.has(status)) {
      filtered.push('status = ?');
      filteredParams.push(status);
    } else {
      return fail('حالة السند غير صحيحة', 400);
    }
  }

  const limitRaw = Number(params.get('limit') ?? 50);
  const offsetRaw = Number(params.get('offset') ?? 0);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 200) : 50;
  const offset = Number.isFinite(offsetRaw) ? Math.min(Math.max(Math.floor(offsetRaw), 0), 1_000_000) : 0;

  try {
    const where = filtered.join(' AND ');
    const [rowsResult, countRow, summaryResult, org] = await Promise.all([
      db
        .prepare(
          `SELECT * FROM financial_vouchers WHERE ${where}
           ORDER BY voucher_date DESC, created_at DESC, sequence_no DESC
           LIMIT ? OFFSET ?`,
        )
        .bind(...filteredParams, limit, offset)
        .all<Record<string, unknown>>(),
      db
        .prepare(`SELECT COUNT(*) AS c FROM financial_vouchers WHERE ${where}`)
        .bind(...filteredParams)
        .first<{ c: number }>(),
      db
        .prepare(
          `SELECT voucher_type, status, COUNT(*) AS c, SUM(CAST(ROUND(amount * 100) AS INTEGER)) AS minor
           FROM financial_vouchers WHERE ${base.join(' AND ')}
           GROUP BY voucher_type, status`,
        )
        .bind(...baseParams)
        .all<{ voucher_type: string; status: string; c: number; minor: number | null }>(),
      getOrganizationProfile(db),
    ]);

    const summary: Record<VoucherType, TypeSummary> = { receipt: emptySummary(), payment: emptySummary() };
    for (const r of summaryResult.results ?? []) {
      if (!isVoucherType(r.voucher_type)) continue;
      const s = summary[r.voucher_type];
      const count = Number(r.c) || 0;
      const total = fromMinor(Number(r.minor) || 0);
      if (r.status === 'approved') {
        s.approvedCount += count;
        s.totalApproved = total;
      } else if (r.status === 'pending') {
        s.pendingCount += count;
        s.totalPending = total;
      } else if (r.status === 'cancelled') {
        s.cancelledCount += count;
      }
    }
    for (const s of Object.values(summary)) s.count = s.approvedCount + s.pendingCount;

    const vouchers = (rowsResult.results ?? []).map(row => {
      const v = mapVoucherRow(row, { includeItems: false });
      return { ...v, actions: voucherActions(session, v) };
    });

    return ok({
      branchId,
      vouchers,
      total: Number(countRow?.c) || 0,
      limit,
      offset,
      summary,
      currency: org.currency,
      permissions: {
        createReceipt: canCreateVoucherType(session, 'receipt'),
        createPayment: canCreateVoucherType(session, 'payment'),
        approve: canApproveFinance(session),
      },
    });
  } catch (error) {
    console.error('Voucher list failed:', error);
    return fail('تعذر تحميل السندات', 500);
  }
};
