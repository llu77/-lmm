import type { APIRoute } from 'astro';
import { canAccessBranch, logAudit, getClientIP } from '@/lib/permissions';
import { financeAuth, ok, fail, readJsonObject, str, getBranchName, canApproveFinance } from '@/lib/finance/http';
import { findRecipients, notifyUsers } from '@/lib/finance/notify';
import {
  bonusNotificationText,
  bonusPageLink,
  getBonusRecordById,
  getBonusSchema,
  rejectStatement,
} from '@/lib/finance/bonus';

/**
 * Manager rejection of a pending weekly bonus, with a reason sent to the
 * branch. On the legacy schema (no status column) the request row is deleted.
 * Body: {id, reason}
 */
export const POST: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { db, session, actor } = auth;
  if (!canApproveFinance(session)) return fail('رفض البونص من صلاحيات المدير فقط', 403);

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);
  const id = str(body.id, 120);
  if (!id) return fail('معرف طلب البونص مطلوب', 400);
  const reason = str(body.reason, 500);
  if (reason.length < 3) return fail('يرجى كتابة سبب الرفض', 400);

  try {
    const record = await getBonusRecordById(db, id);
    if (!record) return fail('طلب البونص غير موجود — حدّث الصفحة', 404);
    if (!canAccessBranch(session, record.branchId)) return fail('لا يمكنك الوصول إلى بيانات هذا الفرع', 403);
    if (record.status !== 'pending') {
      return fail(record.status === 'rejected' ? 'تم رفض هذا الطلب مسبقاً' : 'لا يمكن رفض بونص معتمد', 409);
    }

    const schema = await getBonusSchema(db);
    const result = await rejectStatement(db, schema, id, reason).run();
    if (!Number(result.meta?.changes ?? 0)) return fail('تعذر الرفض: تغيرت حالة الطلب — حدّث الصفحة', 409);

    const branchName = await getBranchName(db, record.branchId);
    await logAudit(
      db,
      session,
      schema.hasStatus ? 'update' : 'delete',
      'bonus_record',
      id,
      {
        action: 'reject',
        reason,
        branchId: record.branchId,
        period: record.period,
        week: record.week,
        total: record.total,
        // Legacy rows are deleted on rejection: keep what was rejected.
        ...(schema.hasStatus ? {} : { deletedRecord: { entries: record.entries, submittedBy: record.submittedBy, submittedAt: record.submittedAt } }),
      },
      getClientIP(context.request),
      context.request.headers.get('User-Agent') || undefined,
    );

    const branchManagers = await findRecipients(db, record.branchId, 'can_manage_bonus', { includeAllBranchUsers: false });
    const recipients = [...branchManagers, ...(record.submittedBy ? [record.submittedBy] : [])].filter(uid => uid !== actor.id);
    await notifyUsers(db, recipients, {
      type: 'bonus_rejected',
      severity: 'warning',
      ...bonusNotificationText('rejected', {
        week: record.week,
        period: record.period ?? '',
        branchName,
        total: record.total,
        reason,
      }),
      link: record.period ? bonusPageLink(record.branchId, record.period, record.week) : '/bonus',
      relatedEntity: id,
      branchId: record.branchId,
    });

    return ok({
      id,
      status: 'rejected',
      deleted: !schema.hasStatus,
      message: `تم رفض بونص الأسبوع ${record.week} وإبلاغ الفرع بالسبب`,
    });
  } catch (error) {
    console.error('Reject bonus error:', error);
    return fail('حدث خطأ أثناء رفض البونص', 500);
  }
};
