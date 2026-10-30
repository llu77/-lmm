import type { APIRoute } from 'astro';
import { logAudit } from '@/lib/permissions';
import { clientIp, fail, getBranchName, newId, ok, readJsonObject, resolveBranchId } from '@/lib/finance/http';
import { computeBranchPayroll, getOpenRun } from '@/lib/finance/payroll-data';
import { periodLabelAr } from '@/lib/finance/catalog';
import { formatMoney } from '@/lib/finance/money';
import { notifyByPermission } from '@/lib/finance/notify';
import {
  isUniqueViolation,
  itemInsertStatement,
  loadRun,
  payrollAuth,
  readPeriodInput,
  runHeaderValues,
  serializeRun,
  statusMessage,
} from '@/lib/finance/payroll-runs';

// POST /api/payroll/save {branchId, period}
// Recomputes the sheet on the server and creates the period's draft run, or
// refreshes the existing draft. Approved/paid runs are never touched.
export const POST: APIRoute = async context => {
  const auth = await payrollAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);
  const branchId = resolveBranchId(session, body.branchId);
  if (branchId instanceof Response) return branchId;
  const period = readPeriodInput(body.period, body.month, body.year);
  if (!period) return fail('الفترة غير صحيحة — اختر الشهر والسنة', 400);

  try {
    const existing = await getOpenRun(db, branchId, period);
    if (existing && existing.status !== 'draft') {
      return fail(statusMessage(existing.status), 409, { run: serializeRun(existing) });
    }

    const computation = await computeBranchPayroll(db, branchId, period);
    if (computation.employeeCount === 0) {
      return fail('لا يوجد موظفون نشطون في هذا الفرع — لا يمكن حفظ مسير رواتب فارغ', 422);
    }

    const branchName = await getBranchName(db, branchId);
    const header = runHeaderValues(computation);
    const itemStatements = (runId: string) =>
      computation.items.map((item, index) => itemInsertStatement(db, runId, item, index + 1));

    let runId: string;
    let created: boolean;
    if (existing) {
      runId = existing.id;
      created = false;
      const results = await db.batch([
        db
          .prepare(
            `UPDATE payroll_runs
             SET branch_name = ?, employee_count = ?, total_earnings = ?, total_deductions = ?, total_net = ?,
                 totals_json = ?, active_columns_json = ?, fingerprint = ?, updated_at = datetime('now')
             WHERE id = ? AND status = 'draft'`,
          )
          .bind(
            branchName,
            header.employeeCount,
            header.totalEarnings,
            header.totalDeductions,
            header.totalNet,
            header.totalsJson,
            header.activeColumnsJson,
            header.fingerprint,
            runId,
          ),
        db
          .prepare(`DELETE FROM payroll_run_items WHERE run_id = ? AND EXISTS (SELECT 1 FROM payroll_runs WHERE id = ? AND status = 'draft')`)
          .bind(runId, runId),
        ...itemStatements(runId),
      ]);
      if (!results[0]?.meta?.changes) {
        return fail('تغيرت حالة مسير الرواتب أثناء الحفظ — أعد تحميل الصفحة', 409);
      }
    } else {
      runId = newId('run');
      created = true;
      try {
        await db.batch([
          db
            .prepare(
              `INSERT INTO payroll_runs
                 (id, branch_id, branch_name, period, status, employee_count, total_earnings, total_deductions, total_net,
                  totals_json, active_columns_json, fingerprint, created_by, created_by_name)
               VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              runId,
              branchId,
              branchName,
              period,
              header.employeeCount,
              header.totalEarnings,
              header.totalDeductions,
              header.totalNet,
              header.totalsJson,
              header.activeColumnsJson,
              header.fingerprint,
              actor.id,
              actor.displayName,
            ),
          ...itemStatements(runId),
        ]);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return fail('يوجد مسير رواتب مفتوح لهذه الفترة بالفعل — أعد تحميل الصفحة', 409);
        }
        throw error;
      }
    }

    const run = await loadRun(db, runId);
    if (!run) return fail('تعذر قراءة مسير الرواتب بعد الحفظ', 500);

    await logAudit(
      db,
      session,
      created ? 'create' : 'update',
      'payroll_run',
      runId,
      {
        operation: created ? 'create_draft' : 'refresh_draft',
        branchId,
        period,
        employeeCount: header.employeeCount,
        totalNet: header.totalNet,
        fingerprint: header.fingerprint,
      },
      clientIp(context.request),
      context.request.headers.get('User-Agent') || undefined,
    );

    if (created) {
      await notifyByPermission(
        db,
        branchId,
        'can_manage_settings',
        {
          type: 'payroll_draft',
          severity: 'info',
          title: 'مسير رواتب بانتظار الاعتماد',
          message: `${branchName} — ${periodLabelAr(period)}: ${header.employeeCount} موظف، الصافي ${formatMoney(header.totalNet)}. أعدّه ${actor.displayName}.`,
          link: `/payroll?branchId=${encodeURIComponent(branchId)}&period=${period}`,
          relatedEntity: `payroll_run:${runId}`,
        },
        { excludeUserId: actor.id },
      );
    }

    return ok(
      {
        created,
        run: serializeRun(run),
        warnings: computation.items.flatMap(item => item.warnings.map(w => `${item.employeeName}: ${w}`)),
        message: created ? 'تم حفظ مسير الرواتب كمسودة' : 'تم تحديث المسودة بآخر البيانات',
      },
      created ? 201 : 200,
    );
  } catch (error) {
    console.error('Payroll save failed:', error);
    return fail('حدث خطأ أثناء حفظ مسير الرواتب', 500);
  }
};
