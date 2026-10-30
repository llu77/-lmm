// POST /api/adjustments/cancel {id, reason} — cancels an active ledger entry
// (manual or created from an approved employee request) while its month's
// payroll is still open. The guarded UPDATE re-checks everything atomically.

import type { APIRoute } from 'astro';
import { logAudit } from '@/lib/permissions';
import { isPeriodLocked } from '@/lib/finance/payroll-data';
import { clientIp, fail, financeAuth, ok, readJsonObject, resolveBranchId, str } from '@/lib/finance/http';
import { MAX_DESCRIPTION_LENGTH, loadAdjustment, mapAdjustmentRow } from './create';

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
    if (await isPeriodLocked(db, branchId, String(row.period))) {
      return fail('مسير رواتب هذا الشهر معتمد — لا يمكن إلغاء بنوده', 409);
    }

    const [result] = await db.batch([
      db
        .prepare(
          `UPDATE payroll_adjustments
           SET status = 'cancelled', cancelled_by = ?, cancelled_by_name = ?, cancelled_at = datetime('now'), cancel_reason = ?
           WHERE id = ? AND status = 'active' AND payroll_run_id IS NULL
             AND NOT EXISTS (
               SELECT 1 FROM payroll_runs pr
               WHERE pr.branch_id = payroll_adjustments.branch_id
                 AND pr.period = payroll_adjustments.period
                 AND pr.status IN ('approved', 'paid'))`,
        )
        .bind(actor.id, actor.displayName, reasonText, id),
    ]);
    if (!result || Number(result.meta?.changes ?? 0) === 0) {
      return fail('تعذر إلغاء البند — ربما اعتُمد مسير الرواتب أو أُلغي البند للتو', 409);
    }

    const updated = await loadAdjustment(db, id);
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

    return ok({ adjustment: mapAdjustmentRow(updated ?? { ...row, status: 'cancelled', cancel_reason: reasonText }) });
  } catch (error) {
    console.error('Cancel payroll adjustment error:', error);
    return fail('حدث خطأ أثناء إلغاء البند', 500);
  }
};
