import type { APIRoute } from 'astro';
import type { D1PreparedStatement } from '@cloudflare/workers-types';
import { logAudit } from '@/lib/permissions';
import { canApproveFinance, clientIp, fail, ok, readJsonObject, str } from '@/lib/finance/http';
import { loadRun, loadRunForUser, payrollAuth, serializeRun } from '@/lib/finance/payroll-runs';

// POST /api/payroll/cancel {id, reason}
// Drafts: payroll generators. Approved runs: the manager only (unlocks the
// period's ledger entries). Paid runs cannot be cancelled.
export const POST: APIRoute = async context => {
  const auth = await payrollAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);
  const run = await loadRunForUser(auth, body.id);
  if (run instanceof Response) return run;

  const reason = str(body.reason, 500);
  if (reason.length < 3) return fail('يرجى كتابة سبب الإلغاء', 400);

  if (run.status === 'paid') return fail('لا يمكن إلغاء مسير رواتب تم صرفه', 409);
  if (run.status === 'cancelled') return fail('مسير الرواتب ملغي بالفعل', 409);
  if (run.status === 'approved' && !canApproveFinance(session)) {
    return fail('إلغاء مسير رواتب معتمد من صلاحيات المدير فقط', 403);
  }

  try {
    const statements: D1PreparedStatement[] = [
      db
        .prepare(
          `UPDATE payroll_runs
           SET status = 'cancelled', cancelled_by = ?, cancelled_by_name = ?, cancelled_at = datetime('now'),
               cancel_reason = ?, updated_at = datetime('now')
           WHERE id = ? AND status = ?`,
        )
        .bind(actor.id, actor.displayName, reason, run.id, run.status),
      // Approved runs locked the ledger entries; release them (no-op for drafts).
      db
        .prepare(
          `UPDATE payroll_adjustments SET payroll_run_id = NULL
           WHERE payroll_run_id = ? AND EXISTS (SELECT 1 FROM payroll_runs WHERE id = ? AND status = 'cancelled')`,
        )
        .bind(run.id, run.id),
    ];
    const results = await db.batch(statements);
    if (!results[0]?.meta?.changes) return fail('تغيرت حالة مسير الرواتب — أعد تحميل الصفحة', 409);

    const cancelled = await loadRun(db, run.id);
    if (!cancelled) return fail('تعذر قراءة مسير الرواتب', 500);

    await logAudit(
      db,
      session,
      'update',
      'payroll_run',
      run.id,
      { operation: 'cancel', previousStatus: run.status, branchId: run.branch_id, period: run.period, reason },
      clientIp(context.request),
      context.request.headers.get('User-Agent') || undefined,
    );

    return ok({
      run: serializeRun(cancelled),
      unlockedAdjustments: Number(results[1]?.meta?.changes ?? 0),
      message: 'تم إلغاء مسير الرواتب',
    });
  } catch (error) {
    console.error('Payroll cancel failed:', error);
    return fail('حدث خطأ أثناء إلغاء مسير الرواتب', 500);
  }
};
