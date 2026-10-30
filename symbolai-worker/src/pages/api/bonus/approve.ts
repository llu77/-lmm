import type { APIRoute } from 'astro';
import { canAccessBranch, logAudit, getClientIP } from '@/lib/permissions';
import { financeAuth, ok, fail, readJsonObject, str, getBranchName, canApproveFinance } from '@/lib/finance/http';
import { periodLabelAr } from '@/lib/finance/catalog';
import { toMinor } from '@/lib/finance/money';
import { adjustmentInsertStatement, firstOpenPeriod } from '@/lib/finance/ledger';
import { findRecipients, notifyUsers } from '@/lib/finance/notify';
import {
  approvalInsertGuard,
  approveStatement,
  attachRolloverPeriods,
  attachUserNames,
  bonusFingerprint,
  bonusNotificationText,
  bonusPageLink,
  bonusRolloverAdjustments,
  computeWeekBonus,
  findWeekRecords,
  getBonusRecordById,
  getBonusSchema,
  getBonusTiers,
  isFinalStatus,
  weekRange,
} from '@/lib/finance/bonus';

/**
 * Manager approval of a pending weekly bonus. The week is recomputed first: if
 * the revenues (or tiers) changed since submission the request is stale (409)
 * and must be resubmitted. A week that already has another approved row
 * cannot be approved twice (409).
 *
 * Where the bonus is paid:
 * - the week's month payroll is still open → payroll reads the approved
 *   bonus_records row directly (nothing else is written);
 * - that payroll is already approved/paid → the bonus rolls over to the first
 *   open payroll month as 'bonus' ledger entries (source 'bonus_record',
 *   `${recordId}:${employeeId}`), written in the same batch as the approval.
 * Body: {id}
 */
export const POST: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { db, session, actor } = auth;
  if (!canApproveFinance(session)) return fail('اعتماد البونص من صلاحيات المدير فقط', 403);

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);
  const id = str(body.id, 120);
  if (!id) return fail('معرف طلب البونص مطلوب', 400);

  try {
    const record = await getBonusRecordById(db, id);
    if (!record) return fail('طلب البونص غير موجود — ربما أُعيد إرساله، حدّث الصفحة', 404);
    if (!canAccessBranch(session, record.branchId)) return fail('لا يمكنك الوصول إلى بيانات هذا الفرع', 403);
    if (record.status === 'rejected') return fail('تم رفض هذا الطلب — يجب إعادة إرساله أولاً', 409);
    if (record.status !== 'pending') return fail('بونص هذا الأسبوع معتمد بالفعل', 409);
    if (!record.period || !weekRange(record.period, record.week)) return fail('فترة طلب البونص غير صالحة', 409);

    const period = record.period;
    const siblings = await findWeekRecords(db, record.branchId, period, record.week);
    if (siblings.some(r => r.id !== id && isFinalStatus(r.status))) {
      return fail('يوجد بونص معتمد آخر لهذا الأسبوع — لا يمكن اعتماد طلب مكرر. حدّث الصفحة', 409, { duplicate: true });
    }

    const { tiers } = await getBonusTiers(db);
    const computation = await computeWeekBonus(db, record.branchId, period, record.week, tiers);
    if (!computation) return fail('فترة طلب البونص غير صالحة', 409);
    if (
      toMinor(computation.totalBonus) !== toMinor(record.total) ||
      bonusFingerprint(computation.employees) !== bonusFingerprint(record.entries)
    ) {
      return fail(
        'تغيّرت إيرادات هذا الأسبوع أو شرائح البونص منذ إرسال الطلب — راجع الأرقام الجديدة وأعد الإرسال للاعتماد',
        409,
        { stale: true, storedTotal: record.total, currentTotal: computation.totalBonus },
      );
    }

    const schema = await getBonusSchema(db);
    // The week's own payroll if it is still open, else the first open month after it.
    const payrollPeriod = await firstOpenPeriod(db, record.branchId, period);
    const rolledOver = payrollPeriod !== period;
    const rolloverStatements = rolledOver
      ? bonusRolloverAdjustments({
          recordId: id,
          branchId: record.branchId,
          period,
          week: record.week,
          payrollPeriod,
          // Same lines as the stored request (fingerprints match), with guaranteed employee ids.
          entries: computation.employees,
          actorId: actor.id,
          actorName: actor.displayName,
        }).map(adj => adjustmentInsertStatement(db, adj, approvalInsertGuard(schema, record)))
      : [];
    // Ledger inserts first: they carry the same guards as the approval, so all land or none do.
    const results = await db.batch([...rolloverStatements, approveStatement(db, schema, record, actor.id, payrollPeriod)]);
    if (!Number(results[results.length - 1]?.meta?.changes ?? 0)) {
      return fail('تعذر الاعتماد: تغيرت حالة الطلب أو اعتُمد بونص آخر لهذا الأسبوع أو تم قفل مسير الرواتب للتو — حدّث الصفحة', 409);
    }

    const updated = (await getBonusRecordById(db, id)) ?? record;
    await Promise.all([attachUserNames(db, [updated]), attachRolloverPeriods(db, [updated])]);
    const branchName = await getBranchName(db, record.branchId);

    await logAudit(
      db,
      session,
      'update',
      'bonus_record',
      id,
      {
        action: 'approve',
        branchId: record.branchId,
        period,
        week: record.week,
        total: record.total,
        ...(rolledOver ? { rolledOverTo: payrollPeriod, ledgerEntries: rolloverStatements.length } : {}),
      },
      getClientIP(context.request),
      context.request.headers.get('User-Agent') || undefined,
    );

    const branchManagers = await findRecipients(db, record.branchId, 'can_manage_bonus', { includeAllBranchUsers: false });
    const recipients = [...branchManagers, ...(record.submittedBy ? [record.submittedBy] : [])].filter(uid => uid !== actor.id);
    await notifyUsers(db, recipients, {
      type: 'bonus_approved',
      severity: 'success',
      ...bonusNotificationText('approved', { week: record.week, period, branchName, total: record.total, payrollPeriod }),
      link: bonusPageLink(record.branchId, period, record.week),
      relatedEntity: id,
      branchId: record.branchId,
    });

    return ok({
      record: updated,
      payrollPeriod,
      rolledOver,
      message: rolledOver
        ? `تم اعتماد بونص الأسبوع ${record.week} — مسير رواتب ${periodLabelAr(period)} معتمد مسبقاً، لذلك أُضيف البونص إلى مسير رواتب ${periodLabelAr(payrollPeriod)}`
        : `تم اعتماد بونص الأسبوع ${record.week} وسيُضاف تلقائياً إلى مسير رواتب ${periodLabelAr(period)}`,
    });
  } catch (error) {
    console.error('Approve bonus error:', error);
    return fail('حدث خطأ أثناء اعتماد البونص', 500);
  }
};
