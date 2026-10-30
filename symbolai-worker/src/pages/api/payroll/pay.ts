import type { APIRoute } from 'astro';
import type { D1PreparedStatement } from '@cloudflare/workers-types';
import { logAudit } from '@/lib/permissions';
import { canApproveFinance, clientIp, fail, newId, ok, readJsonObject } from '@/lib/finance/http';
import { periodLabelAr, todayIso } from '@/lib/finance/catalog';
import { formatAmount, formatMoney, toMinor } from '@/lib/finance/money';
import { getOrganizationProfile } from '@/lib/finance/documents';
import { normalizePaymentSplit, voucherInsertStatements, type NewVoucher } from '@/lib/finance/vouchers';
import { notifyByPermission, notifyUsers } from '@/lib/finance/notify';
import {
  loadRun,
  loadRunForUser,
  loadRunItems,
  loadRunVouchers,
  payrollAuth,
  payrollVoucherSourceId,
  serializeRun,
} from '@/lib/finance/payroll-runs';

const PAY_METHODS = ['cash', 'bank_transfer'] as const;
type PayMethod = (typeof PAY_METHODS)[number];

// POST /api/payroll/pay {id, paymentMethod?: 'cash'|'bank_transfer', generateVouchers?: boolean}
// Marks an approved run as paid and issues one payment voucher (سند صرف) per
// employee with a positive net. On an already-paid run it only issues the
// vouchers that are missing (e.g. after one was cancelled). Idempotent.
export const POST: APIRoute = async context => {
  const auth = await payrollAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);

  const method = body.paymentMethod === undefined || body.paymentMethod === null || body.paymentMethod === ''
    ? 'bank_transfer'
    : body.paymentMethod;
  if (!PAY_METHODS.includes(method as PayMethod)) return fail('طريقة الصرف غير صحيحة — اختر نقداً أو حوالة بنكية', 400);
  const paymentMethod = method as PayMethod;
  if (body.generateVouchers !== undefined && typeof body.generateVouchers !== 'boolean') {
    return fail('قيمة إصدار السندات غير صحيحة', 400);
  }
  const generateVouchers = body.generateVouchers !== false;

  const run = await loadRunForUser(auth, body.id);
  if (run instanceof Response) return run;
  if (run.status === 'draft') return fail('يجب أن يعتمد المدير مسير الرواتب قبل الصرف', 409);
  if (run.status === 'cancelled') return fail('مسير الرواتب ملغي', 409);
  if (run.status === 'paid' && !generateVouchers) {
    return ok({ run: serializeRun(run), created: [], vouchers: await loadRunVouchers(db, run.id), message: 'المسير مصروف مسبقاً' });
  }

  try {
    const [items, org] = await Promise.all([loadRunItems(db, run.id), getOrganizationProfile(db)]);
    const approver = canApproveFinance(session);
    const statements: D1PreparedStatement[] = [];

    if (run.status === 'approved') {
      statements.push(
        db
          .prepare(
            `UPDATE payroll_runs
             SET status = 'paid', paid_by = ?, paid_by_name = ?, paid_at = datetime('now'), updated_at = datetime('now')
             WHERE id = ? AND status = 'approved'`,
          )
          .bind(actor.id, actor.displayName, run.id),
      );
    }

    const planned: string[] = [];
    const skipped: Array<{ employeeId: string; employeeName: string; netSalary: number }> = [];
    if (generateVouchers) {
      const date = todayIso();
      const purpose = `راتب شهر ${periodLabelAr(run.period)}`;
      const guard = { sql: `EXISTS (SELECT 1 FROM payroll_runs WHERE id = ? AND status = 'paid')`, params: [run.id] };
      for (const item of items) {
        if (toMinor(item.netSalary) <= 0) {
          skipped.push({ employeeId: item.employeeId, employeeName: item.employeeName, netSalary: item.netSalary });
          continue;
        }
        const id = newId('vch');
        const voucher: NewVoucher = {
          id,
          branchId: run.branch_id,
          branchName: run.branch_name,
          type: 'payment',
          date,
          partyType: 'employee',
          partyName: item.employeeName,
          employeeId: item.employeeId,
          partyIdNumber: item.nationalId,
          amount: item.netSalary,
          currency: org.currency,
          purpose,
          paymentMethod,
          notes: `مسير رواتب ${run.branch_name ?? ''} — إجمالي المستحقات ${formatAmount(item.totalEarnings)}، إجمالي الاستقطاعات ${formatAmount(item.totalDeductions)}`,
          status: approver ? 'approved' : 'pending',
          sourceType: 'payroll',
          sourceId: payrollVoucherSourceId(run.id, item.employeeId),
          createdBy: actor.id,
          createdByName: actor.displayName,
          approvedBy: approver ? actor.id : null,
          approvedByName: approver ? actor.displayName : null,
        };
        const splitError = normalizePaymentSplit(voucher);
        if (splitError) return fail(splitError, 400);
        planned.push(id);
        statements.push(...voucherInsertStatements(db, voucher, guard));
      }
    }

    if (statements.length > 0) {
      const results = await db.batch(statements);
      if (run.status === 'approved' && !results[0]?.meta?.changes) {
        return fail('تغيرت حالة مسير الرواتب — أعد تحميل الصفحة', 409);
      }
    }

    const [updated, vouchers] = await Promise.all([loadRun(db, run.id), loadRunVouchers(db, run.id)]);
    if (!updated) return fail('تعذر قراءة مسير الرواتب', 500);
    const plannedIds = new Set(planned);
    const created = vouchers
      .filter(v => plannedIds.has(v.id))
      .map(v => ({ id: v.id, voucherNumber: v.voucherNumber, employeeId: v.employeeId, partyName: v.partyName, amount: v.amount, status: v.status }));

    await logAudit(
      db,
      session,
      'update',
      'payroll_run',
      run.id,
      {
        operation: run.status === 'approved' ? 'pay' : 'generate_missing_vouchers',
        branchId: run.branch_id,
        period: run.period,
        paymentMethod,
        vouchers: created.map(v => v.voucherNumber),
      },
      clientIp(context.request),
      context.request.headers.get('User-Agent') || undefined,
    );

    if (created.length > 0 && !approver) {
      const total = created.reduce((sum, v) => sum + toMinor(v.amount), 0) / 100;
      await notifyByPermission(
        db,
        run.branch_id,
        'can_manage_settings',
        {
          type: 'payroll_vouchers_pending',
          severity: 'warning',
          title: 'سندات صرف رواتب بانتظار الاعتماد',
          message: `${run.branch_name ?? ''} — ${periodLabelAr(run.period)}: ${created.length} سند صرف بإجمالي ${formatMoney(total, org.currency)} أصدرها ${actor.displayName}.`,
          link: `/vouchers?type=payment&source=payroll&sourceId=${encodeURIComponent(run.id)}&branchId=${encodeURIComponent(run.branch_id)}`,
          relatedEntity: `payroll_run:${run.id}:vouchers:${created[0].voucherNumber}`,
        },
        { excludeUserId: actor.id },
      );
    }
    if (run.status === 'approved' && run.created_by && run.created_by !== actor.id) {
      await notifyUsers(db, [run.created_by], {
        type: 'payroll_paid',
        severity: 'success',
        title: 'تم صرف الرواتب',
        message: `${run.branch_name ?? ''} — ${periodLabelAr(run.period)}: تم صرف الرواتب بواسطة ${actor.displayName}.`,
        link: `/payroll?branchId=${encodeURIComponent(run.branch_id)}&period=${run.period}`,
        relatedEntity: `payroll_run:${run.id}:paid`,
        branchId: run.branch_id,
      });
    }

    return ok({
      run: serializeRun({ ...updated, voucher_count: vouchers.filter(v => v.status !== 'cancelled').length }),
      created,
      vouchers,
      skipped,
      message:
        run.status === 'approved'
          ? created.length
            ? `تم صرف الرواتب وإصدار ${created.length} سند صرف`
            : 'تم تسجيل صرف الرواتب'
          : created.length
            ? `تم إصدار ${created.length} سند صرف ناقص`
            : 'جميع سندات الصرف صادرة مسبقاً',
    });
  } catch (error) {
    console.error('Payroll pay failed:', error);
    return fail('حدث خطأ أثناء صرف الرواتب', 500);
  }
};
