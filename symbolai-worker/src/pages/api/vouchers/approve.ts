import type { APIRoute } from 'astro';
import { logAudit } from '@/lib/permissions';
import { financeAuth, ok, fail, readJsonObject, str, canApproveFinance, clientIp } from '@/lib/finance/http';
import { notifyUsers } from '@/lib/finance/notify';
import { VOUCHER_VIEW_FLAGS, loadScopedVoucher, loadVoucherRow, mapVoucherRow, voucherActions } from './get';
import { voucherSummaryText } from './create';

// POST /api/vouchers/approve {id} — the manager (canApproveFinance) approves a
// pending voucher; his saved signature and the company stamp then appear on
// the printed voucher.
export const POST: APIRoute = async context => {
  const auth = await financeAuth(context, VOUCHER_VIEW_FLAGS);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;

  if (!canApproveFinance(session)) return fail('اعتماد السندات من صلاحيات المدير فقط', 403);

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);
  const id = str(body.id, 100);
  if (!id) return fail('معرّف السند مطلوب', 400);

  try {
    const row = await loadScopedVoucher(db, session, id);
    if (row instanceof Response) return row;
    const existing = mapVoucherRow(row);
    if (existing.status === 'approved') return fail('السند معتمد مسبقاً', 409);
    if (existing.status === 'cancelled') return fail('لا يمكن اعتماد سند ملغي', 409);

    const result = await db
      .prepare(
        `UPDATE financial_vouchers
         SET status = 'approved', approved_by = ?, approved_by_name = ?, approved_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ? AND status = 'pending'`,
      )
      .bind(actor.id, actor.displayName, id)
      .run();
    if (Number(result.meta?.changes ?? 0) === 0) {
      return fail('تغيرت حالة السند — أعد تحميل الصفحة', 409);
    }

    const updated = await loadVoucherRow(db, id);
    if (!updated) return fail('تعذر قراءة السند بعد الاعتماد', 500);
    const saved = mapVoucherRow(updated);

    await logAudit(
      db,
      session,
      'update',
      'voucher',
      id,
      { action: 'approve', number: saved.number, amount: saved.amount },
      clientIp(context.request),
      context.request.headers.get('User-Agent') ?? undefined,
    );

    if (saved.createdBy && saved.createdBy !== actor.id) {
      await notifyUsers(db, [saved.createdBy], {
        type: 'voucher_approved',
        title: 'تم اعتماد السند',
        message: `تم اعتماد ${voucherSummaryText(saved.type, saved.number, saved.amount, saved.currency, saved.partyName)} من قبل ${actor.displayName}`,
        severity: 'success',
        link: `/vouchers/print/${saved.id}`,
        relatedEntity: saved.id,
        branchId: saved.branchId,
      });
    }

    return ok({ voucher: saved, actions: voucherActions(session, saved) });
  } catch (error) {
    console.error('Voucher approve failed:', error);
    return fail('حدث خطأ أثناء اعتماد السند', 500);
  }
};
