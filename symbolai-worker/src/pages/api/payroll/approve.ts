import type { APIRoute } from 'astro';
import { logAudit } from '@/lib/permissions';
import { clientIp, fail, ok, readJsonObject } from '@/lib/finance/http';
import { computeBranchPayroll } from '@/lib/finance/payroll-data';
import { periodLabelAr } from '@/lib/finance/catalog';
import { formatMoney, toMinor } from '@/lib/finance/money';
import { notifyByPermission, notifyUsers } from '@/lib/finance/notify';
import {
  LEDGER_DIGEST_SQL,
  bonusDigest,
  ledgerDigest,
  loadRun,
  loadRunForUser,
  payrollAuth,
  serializeRun,
  statusMessage,
} from '@/lib/finance/payroll-runs';

const STALE_MESSAGE = 'تغيرت بيانات الرواتب منذ إعداد المسودة — حدّث المسودة ثم اعتمد';

// POST /api/payroll/approve {id}   (manager only)
// Approves a draft whose saved sheet still matches the live data, and locks
// the period's ledger entries to the run.
export const POST: APIRoute = async context => {
  const auth = await payrollAuth(context, 'approve');
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);

  try {
    const run = await loadRunForUser(auth, body.id);
    if (run instanceof Response) return run;
    if (run.status !== 'draft') return fail(statusMessage(run.status), 409, { run: serializeRun(run) });

    // Read the ledger and bonus digests before recomputing: any ledger entry
    // added or cancelled, or any weekly bonus approved, after this point makes
    // the guarded UPDATE below a no-op.
    const [digest, bonus] = await Promise.all([
      ledgerDigest(db, run.branch_id, run.period),
      bonusDigest(db, run.branch_id, run.period),
    ]);
    const live = await computeBranchPayroll(db, run.branch_id, run.period);
    if (live.fingerprint !== run.fingerprint) return fail(STALE_MESSAGE, 409, { stale: true });
    if (live.employeeCount === 0) return fail('المسير لا يحتوي على موظفين نشطين', 422);

    const negative = live.items.filter(item => toMinor(item.netSalary) < 0);
    if (negative.length) {
      return fail(
        `لا يمكن اعتماد المسير: صافي راتب ${negative.map(i => i.employeeName).join('، ')} بالسالب — عدّل الاستقطاعات (مثلاً أجّل قسط السلفة) ثم حدّث المسودة`,
        422,
        { employees: negative.map(i => i.employeeId) },
      );
    }

    const results = await db.batch([
      db
        .prepare(
          `UPDATE payroll_runs
           SET status = 'approved', approved_by = ?, approved_by_name = ?, approved_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ? AND status = 'draft' AND fingerprint = ? AND ${LEDGER_DIGEST_SQL} = ?${bonus ? ` AND ${bonus.sql} = ?` : ''}`,
        )
        .bind(
          actor.id,
          actor.displayName,
          run.id,
          run.fingerprint,
          run.branch_id,
          run.period,
          digest,
          ...(bonus ? [...bonus.params, bonus.value] : []),
        ),
      db
        .prepare(
          // Only entries of employees on this sheet are posted. Entries of
          // inactive or transferred employees (orphans) stay open so they can
          // still be cancelled or moved instead of silently vanishing.
          `UPDATE payroll_adjustments SET payroll_run_id = ?
           WHERE branch_id = ? AND period = ? AND status = 'active' AND payroll_run_id IS NULL
             AND employee_id IN (SELECT employee_id FROM payroll_run_items WHERE run_id = ?)
             AND EXISTS (SELECT 1 FROM payroll_runs WHERE id = ? AND status = 'approved')`,
        )
        .bind(run.id, run.branch_id, run.period, run.id, run.id),
    ]);
    if (!results[0]?.meta?.changes) {
      return fail('تغيرت بيانات الرواتب أثناء الاعتماد — حدّث المسودة ثم أعد المحاولة', 409, { stale: true });
    }
    const lockedAdjustments = Number(results[1]?.meta?.changes ?? 0);

    const approved = await loadRun(db, run.id);
    if (!approved) return fail('تعذر قراءة مسير الرواتب بعد الاعتماد', 500);

    await logAudit(
      db,
      session,
      'update',
      'payroll_run',
      run.id,
      { operation: 'approve', branchId: run.branch_id, period: run.period, totalNet: run.total_net, lockedAdjustments },
      clientIp(context.request),
      context.request.headers.get('User-Agent') || undefined,
    );

    const payload = {
      type: 'payroll_approved',
      severity: 'success' as const,
      title: 'تم اعتماد مسير الرواتب',
      message: `${run.branch_name ?? ''} — ${periodLabelAr(run.period)}: اعتمد ${actor.displayName} المسير بصافي ${formatMoney(Number(run.total_net) || 0)}. يمكن الآن صرف الرواتب وإصدار سندات الصرف.`,
      link: `/payroll?branchId=${encodeURIComponent(run.branch_id)}&period=${run.period}`,
      relatedEntity: `payroll_run:${run.id}:approved:${approved.approved_at ?? ''}`,
      branchId: run.branch_id,
    };
    await notifyByPermission(db, run.branch_id, 'can_generate_payroll', payload, {
      excludeUserId: actor.id,
      includeAllBranchUsers: false,
    });
    if (run.created_by && run.created_by !== actor.id) await notifyUsers(db, [run.created_by], payload);

    return ok({ run: serializeRun(approved), lockedAdjustments, message: 'تم اعتماد مسير الرواتب' });
  } catch (error) {
    console.error('Payroll approve failed:', error);
    return fail('حدث خطأ أثناء اعتماد مسير الرواتب', 500);
  }
};
