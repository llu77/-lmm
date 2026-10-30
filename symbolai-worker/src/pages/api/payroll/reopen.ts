import type { APIRoute } from 'astro';
import { logAudit } from '@/lib/permissions';
import { clientIp, fail, ok, optStr, readJsonObject } from '@/lib/finance/http';
import { loadRun, loadRunForUser, payrollAuth, serializeRun } from '@/lib/finance/payroll-runs';

// POST /api/payroll/reopen {id, reason?}   (manager only)
// Returns an approved (not yet paid) run to draft and unlocks its ledger entries.
export const POST: APIRoute = async context => {
  const auth = await payrollAuth(context, 'approve');
  if (auth instanceof Response) return auth;
  const { session, db } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);
  const run = await loadRunForUser(auth, body.id);
  if (run instanceof Response) return run;

  if (run.status === 'paid') return fail('لا يمكن إعادة فتح مسير رواتب تم صرفه', 409);
  if (run.status !== 'approved') return fail('إعادة الفتح متاحة لمسيرات الرواتب المعتمدة فقط', 409);
  const reason = optStr(body.reason, 500);

  try {
    const results = await db.batch([
      db
        .prepare(
          `UPDATE payroll_runs
           SET status = 'draft', approved_by = NULL, approved_by_name = NULL, approved_at = NULL, updated_at = datetime('now')
           WHERE id = ? AND status = 'approved'`,
        )
        .bind(run.id),
      db
        .prepare(
          `UPDATE payroll_adjustments SET payroll_run_id = NULL
           WHERE payroll_run_id = ? AND EXISTS (SELECT 1 FROM payroll_runs WHERE id = ? AND status = 'draft')`,
        )
        .bind(run.id, run.id),
    ]);
    if (!results[0]?.meta?.changes) return fail('تغيرت حالة مسير الرواتب — أعد تحميل الصفحة', 409);

    const reopened = await loadRun(db, run.id);
    if (!reopened) return fail('تعذر قراءة مسير الرواتب', 500);

    await logAudit(
      db,
      session,
      'update',
      'payroll_run',
      run.id,
      { operation: 'reopen', branchId: run.branch_id, period: run.period, reason, previousApprover: run.approved_by_name },
      clientIp(context.request),
      context.request.headers.get('User-Agent') || undefined,
    );

    return ok({
      run: serializeRun(reopened),
      unlockedAdjustments: Number(results[1]?.meta?.changes ?? 0),
      message: 'تمت إعادة فتح المسير كمسودة — حدّث المسودة بعد التعديل ثم أعد اعتمادها',
    });
  } catch (error) {
    console.error('Payroll reopen failed:', error);
    return fail('حدث خطأ أثناء إعادة فتح مسير الرواتب', 500);
  }
};
