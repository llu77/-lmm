import type { APIRoute } from 'astro';
import { logAudit } from '@/lib/permissions';
import { financeAuth, ok, fail, readJsonObject, str, canApproveFinance, clientIp } from '@/lib/finance/http';
import { notifyUsers } from '@/lib/finance/notify';
import { VOUCHER_WRITE_FLAGS, canCreateVoucherType, loadScopedVoucher, loadVoucherRow, mapVoucherRow, voucherActions } from './get';
import { voucherSummaryText } from './create';
import { periodLabelAr } from '@/lib/finance/catalog';
import { formatMoney, type CurrencyCode } from '@/lib/finance/money';

// POST /api/vouchers/cancel {id, reason}
//  - pending: its creator, or anyone allowed to create that voucher type
//  - approved: the manager only (canApproveFinance), with a reason
// The number is kept (cancelled vouchers stay in the sequence for audit).
export const POST: APIRoute = async context => {
  const auth = await financeAuth(context, VOUCHER_WRITE_FLAGS);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);
  const id = str(body.id, 100);
  if (!id) return fail('معرّف السند مطلوب', 400);
  const rawReason = typeof body.reason === 'string' ? body.reason.replace(/\s+/g, ' ').trim() : '';
  if (rawReason.length > 300) return fail('سبب الإلغاء طويل جداً (الحد الأقصى 300 حرف)', 400);

  try {
    const row = await loadScopedVoucher(db, session, id);
    if (row instanceof Response) return row;
    const existing = mapVoucherRow(row);

    if (existing.status === 'cancelled') return fail('السند ملغي مسبقاً', 409);
    if (existing.status === 'approved') {
      if (!canApproveFinance(session)) return fail('إلغاء السندات المعتمدة من صلاحيات المدير فقط', 403);
      if (rawReason.length < 3) return fail('يرجى كتابة سبب إلغاء السند المعتمد', 400);
    } else {
      const isCreator = existing.createdBy !== null && existing.createdBy === actor.id;
      if (!isCreator && !canCreateVoucherType(session, existing.type)) {
        return fail('ليست لديك صلاحية إلغاء هذا السند', 403);
      }
    }

    const result = await db
      .prepare(
        `UPDATE financial_vouchers
         SET status = 'cancelled', cancelled_by = ?, cancelled_by_name = ?, cancelled_at = datetime('now'),
             cancel_reason = ?, updated_at = datetime('now')
         WHERE id = ? AND status = ?`,
      )
      .bind(actor.id, actor.displayName, rawReason || null, id, existing.status)
      .run();
    if (Number(result.meta?.changes ?? 0) === 0) {
      return fail('تغيرت حالة السند — أعد تحميل الصفحة', 409);
    }

    const updated = await loadVoucherRow(db, id);
    if (!updated) return fail('تعذر قراءة السند بعد الإلغاء', 500);
    const saved = mapVoucherRow(updated);

    await logAudit(
      db,
      session,
      'update',
      'voucher',
      id,
      { action: 'cancel', number: saved.number, previousStatus: existing.status, reason: rawReason || null },
      clientIp(context.request),
      context.request.headers.get('User-Agent') ?? undefined,
    );

    if (saved.createdBy && saved.createdBy !== actor.id) {
      await notifyUsers(db, [saved.createdBy], {
        type: 'voucher_cancelled',
        title: 'تم إلغاء السند',
        message: `تم إلغاء ${voucherSummaryText(saved.type, saved.number, saved.amount, saved.currency, saved.partyName)} بواسطة ${actor.displayName}${rawReason ? ` — السبب: ${rawReason}` : ''}`,
        severity: 'warning',
        link: `/vouchers/print/${saved.id}`,
        relatedEntity: saved.id,
        branchId: saved.branchId,
      });
    }

    // Cancelling an advance voucher does not touch its payroll installments
    // (the cash may already have been handed over). Tell the user what is
    // still scheduled so they can cancel it on the adjustments page if the
    // advance was never paid out.
    const warnings: string[] = [];
    if (saved.sourceType === 'request' && saved.sourceId) {
      try {
        const pending = await db
          .prepare(
            `SELECT period, amount FROM payroll_adjustments
             WHERE source_type = 'request' AND source_id = ? AND status = 'active' AND payroll_run_id IS NULL
             ORDER BY period`,
          )
          .bind(saved.sourceId)
          .all<{ period: string; amount: number }>();
        const rows = pending.results ?? [];
        if (rows.length > 0) {
          const list = rows.map(r => `${periodLabelAr(r.period)}: ${formatMoney(Number(r.amount) || 0, saved.currency as CurrencyCode)}`).join('، ');
          warnings.push(
            `أقساط هذه السلفة ما زالت مجدولة للخصم من الراتب (${list}). إن لم تُصرف السلفة فعلاً فألغِ الأقساط من صفحة المستحقات والاستقطاعات.`,
          );
        }
      } catch (error) {
        console.error('Failed to load installments of cancelled request voucher:', error);
      }
    }

    return ok({ voucher: saved, actions: voucherActions(session, saved), warnings });
  } catch (error) {
    console.error('Voucher cancel failed:', error);
    return fail('حدث خطأ أثناء إلغاء السند', 500);
  }
};
