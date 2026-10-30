// POST /api/adjustments/cancel {id, reason} — cancels an active ledger entry
// (manual or created from an approved employee request) while its month's
// payroll is still open, or when the approved payroll left its employee off
// the sheet (inactive or transferred): such an entry was never paid or
// deducted, so it stays cancellable. The guarded UPDATE re-checks atomically.

import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { logAudit } from '@/lib/permissions';
import { formatMoney } from '@/lib/finance/money';
import { clientIp, fail, financeAuth, ok, readJsonObject, resolveBranchId, str } from '@/lib/finance/http';
import { MAX_DESCRIPTION_LENGTH, loadAdjustment, mapAdjustmentRow } from './create';

/** True when an approved or paid payroll run of the entry's month has its employee on the sheet. */
const ON_LOCKED_SHEET = `EXISTS (
  SELECT 1 FROM payroll_runs pr
  JOIN payroll_run_items pri ON pri.run_id = pr.id
  WHERE pr.branch_id = payroll_adjustments.branch_id
    AND pr.period = payroll_adjustments.period
    AND pr.status IN ('approved', 'paid')
    AND pri.employee_id = payroll_adjustments.employee_id)`;

/**
 * Cancelling the installments of an approved advance does not touch the
 * payout voucher: say so, since the money may still have been paid out.
 */
async function advanceVoucherWarnings(db: D1Database, row: Record<string, unknown>): Promise<string[]> {
  if (row.source_type !== 'request' || row.category !== 'advance' || !row.source_id) return [];
  const vouchers = await db
    .prepare(
      `SELECT voucher_number, status, amount FROM financial_vouchers
       WHERE source_type = 'request' AND source_id = ? AND status != 'cancelled'`,
    )
    .bind(String(row.source_id))
    .all<{ voucher_number: string; status: string; amount: number }>();
  return (vouchers.results ?? []).map(
    v =>
      `سند صرف السلفة ${v.voucher_number} (${formatMoney(Number(v.amount) || 0)}) ما زال ${
        v.status === 'approved' ? 'معتمداً' : 'قائماً'
      } — إن لم تُصرف السلفة فألغِ السند من صفحة السندات، وإن سُدّدت نقداً فأصدر سند قبض بالمبلغ`,
  );
}

export const POST: APIRoute = async context => {
  const auth = await financeAuth(context, ['canGeneratePayroll', 'canManageEmployees']);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);

  const id = str(body.id, 100);
  if (!id) return fail('معرف البند مطلوب', 400);
  const reasonText = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reasonText) return fail('يرجى كتابة سبب الإلغاء', 400);
  if (reasonText.length > MAX_DESCRIPTION_LENGTH) return fail(`سبب الإلغاء طويل جداً (${MAX_DESCRIPTION_LENGTH} حرف كحد أقصى)`, 400);

  try {
    const row = await loadAdjustment(db, id);
    if (!row) return fail('البند غير موجود', 404);
    const branchId = String(row.branch_id ?? '');
    const access = resolveBranchId(session, branchId);
    if (access instanceof Response) return access;

    if (row.status !== 'active') return fail('البند ملغى مسبقاً', 409);
    if (row.payroll_run_id) return fail('البند مرحّل في مسير رواتب — لا يمكن إلغاؤه', 409);
    const onSheet = await db
      .prepare(`SELECT 1 AS hit FROM payroll_adjustments WHERE id = ? AND ${ON_LOCKED_SHEET}`)
      .bind(id)
      .first<{ hit: number }>();
    if (onSheet) return fail('مسير رواتب هذا الشهر معتمد — لا يمكن إلغاء بنوده', 409);

    const [result] = await db.batch([
      db
        .prepare(
          `UPDATE payroll_adjustments
           SET status = 'cancelled', cancelled_by = ?, cancelled_by_name = ?, cancelled_at = datetime('now'), cancel_reason = ?
           WHERE id = ? AND status = 'active' AND payroll_run_id IS NULL
             AND NOT ${ON_LOCKED_SHEET}`,
        )
        .bind(actor.id, actor.displayName, reasonText, id),
    ]);
    if (!result || Number(result.meta?.changes ?? 0) === 0) {
      return fail('تعذر إلغاء البند — ربما اعتُمد مسير الرواتب أو أُلغي البند للتو', 409);
    }

    // The entry is cancelled: what follows must not turn this into an error.
    let updated: Record<string, unknown> | null = null;
    let warnings: string[] = [];
    try {
      updated = await loadAdjustment(db, id);
      warnings = await advanceVoucherWarnings(db, row);
    } catch (error) {
      console.error(`Payroll adjustment ${id} cancelled, but loading its details failed:`, error);
    }
    await logAudit(
      db,
      session,
      'update',
      'payroll_adjustment',
      id,
      {
        action: 'cancel',
        reason: reasonText,
        branchId,
        employeeId: row.employee_id,
        period: row.period,
        category: row.category,
        amount: row.amount,
        sourceType: row.source_type,
        sourceId: row.source_id,
      },
      clientIp(context.request),
      context.request.headers.get('User-Agent') || undefined,
    );

    return ok({ adjustment: mapAdjustmentRow(updated ?? { ...row, status: 'cancelled', cancel_reason: reasonText }), warnings });
  } catch (error) {
    console.error('Cancel payroll adjustment error:', error);
    return fail('حدث خطأ أثناء إلغاء البند', 500);
  }
};
