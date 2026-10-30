import type { APIRoute } from 'astro';
import { logAudit, getClientIP } from '@/lib/permissions';
import {
  financeAuth,
  ok,
  fail,
  readJsonObject,
  resolveBranchId,
  getBranchName,
  canApproveFinance,
  newId,
} from '@/lib/finance/http';
import { parsePeriod, periodLabelAr } from '@/lib/finance/catalog';
import { isPeriodLocked } from '@/lib/finance/payroll-data';
import { findRecipients, notifyByPermission, notifyUsers } from '@/lib/finance/notify';
import {
  attachUserNames,
  bonusNotificationText,
  bonusPageLink,
  computeWeekBonus,
  findWeekRecords,
  getBonusRecordById,
  getBonusSchema,
  getBonusTiers,
  isFinalStatus,
  isWeekComplete,
  parseWeekNumber,
  submissionStatements,
  weekRange,
} from '@/lib/finance/bonus';

/**
 * "إرسال للاعتماد": recomputes the week's bonus on the server from the cashier
 * revenues and stores it as a pending request for the manager (replacing any
 * earlier pending/rejected request of that week). The manager may pass
 * `approve: true` to submit and approve in one step.
 * Body: {branchId, period: 'YYYY-MM', week: 1-5, approve?: boolean}
 */
export const POST: APIRoute = async context => {
  const auth = await financeAuth(context, ['canManageBonus', 'canManageSettings']);
  if (auth instanceof Response) return auth;
  const { db, session, actor } = auth;
  const isManager = canApproveFinance(session);
  if (!session.permissions.canManageBonus && !isManager) return fail('صلاحيات غير كافية لإرسال البونص', 403);

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);

  const approve = body.approve === true;
  if (approve && !isManager) return fail('اعتماد البونص من صلاحيات المدير فقط', 403);

  const branchId = resolveBranchId(session, body.branchId);
  if (branchId instanceof Response) return branchId;

  const period = typeof body.period === 'string' ? body.period.trim() : '';
  if (!parsePeriod(period)) return fail('الشهر غير صالح — استخدم الصيغة YYYY-MM', 400);
  const week = parseWeekNumber(body.week ?? body.weekNumber);
  if (week === null) return fail('رقم الأسبوع يجب أن يكون بين 1 و 5', 400);
  const range = weekRange(period, week);
  if (!range) return fail(`${periodLabelAr(period)} لا يحتوي على أسبوع خامس`, 400);
  if (!isWeekComplete(range)) {
    return fail(`لا يمكن إرسال بونص الأسبوع ${week} قبل انتهائه — آخر أيامه ${range.end}`, 400, { incomplete: true });
  }

  try {
    if (await isPeriodLocked(db, branchId, period)) {
      return fail(`مسير رواتب ${periodLabelAr(period)} معتمد — لا يمكن تعديل البونص`, 409, { locked: true });
    }
    const existing = await findWeekRecords(db, branchId, period, week);
    if (existing.some(r => isFinalStatus(r.status))) return fail('بونص هذا الأسبوع معتمد بالفعل', 409);

    const { tiers } = await getBonusTiers(db);
    const computation = await computeWeekBonus(db, branchId, period, week, tiers);
    if (!computation) return fail(`${periodLabelAr(period)} لا يحتوي على أسبوع خامس`, 400);
    if (computation.revenueRowCount === 0) {
      return fail('لا توجد إيرادات مسجلة لهذا الأسبوع — تأكد من وصول إيرادات الكاشير أولاً', 400);
    }

    const schema = await getBonusSchema(db);
    const id = newId('bonus');
    const { statements, insertIndex } = submissionStatements(db, schema, {
      id,
      computation,
      actorId: actor.id,
      actorName: actor.displayName,
      approve,
    });

    let changes = 0;
    try {
      const results = await db.batch(statements);
      changes = Number(results[insertIndex]?.meta?.changes ?? 0);
    } catch (error) {
      if (/UNIQUE|constraint/i.test(String((error as Error)?.message ?? error))) {
        return fail('تم تحديث بونص هذا الأسبوع للتو من مستخدم آخر — أعد تحميل الصفحة', 409);
      }
      throw error;
    }
    if (changes !== 1) return fail('تعذر الحفظ: تم اعتماد بونص هذا الأسبوع أو قفل مسير الرواتب للتو', 409);

    const record = await getBonusRecordById(db, id);
    if (record) await attachUserNames(db, [record]);
    const branchName = await getBranchName(db, branchId);

    await logAudit(
      db,
      session,
      'create',
      'bonus_record',
      id,
      {
        branchId,
        period,
        week,
        totalBonus: computation.totalBonus,
        eligible: computation.eligibleCount,
        status: approve ? 'approved' : 'pending',
        replaced: existing.map(r => ({ id: r.id, status: r.status, total: r.total })),
      },
      getClientIP(context.request),
      context.request.headers.get('User-Agent') || undefined,
    );

    const link = bonusPageLink(branchId, period, week);
    const info = { week, period, branchName, total: computation.totalBonus };
    if (approve) {
      const recipients = (await findRecipients(db, branchId, 'can_manage_bonus', { includeAllBranchUsers: false })).filter(
        uid => uid !== actor.id,
      );
      await notifyUsers(db, recipients, {
        type: 'bonus_approved',
        severity: 'success',
        ...bonusNotificationText('approved', info),
        link,
        relatedEntity: id,
        branchId,
      });
    } else {
      await notifyByPermission(
        db,
        branchId,
        'can_manage_settings',
        { type: 'bonus_submitted', severity: 'info', ...bonusNotificationText('submitted', info), link, relatedEntity: id },
        { excludeUserId: actor.id },
      );
    }

    return ok(
      {
        record,
        computation,
        message: approve
          ? `تم اعتماد بونص الأسبوع ${week} وسيُضاف إلى مسير رواتب ${periodLabelAr(period)}`
          : `تم إرسال بونص الأسبوع ${week} لاعتماد المدير`,
      },
      201,
    );
  } catch (error) {
    console.error('Save bonus error:', error);
    return fail('حدث خطأ أثناء حفظ البونص', 500);
  }
};
