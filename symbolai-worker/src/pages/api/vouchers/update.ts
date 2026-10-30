import type { APIRoute } from 'astro';
import { logAudit } from '@/lib/permissions';
import { financeAuth, ok, fail, readJsonObject, str, canApproveFinance, clientIp } from '@/lib/finance/http';
import { getOrganizationProfile } from '@/lib/finance/documents';
import { notifyUsers } from '@/lib/finance/notify';
import {
  VOUCHER_WRITE_FLAGS,
  canCreateVoucherType,
  loadScopedVoucher,
  loadVoucherRow,
  mapVoucherRow,
  voucherActions,
} from './get';
import { parseVoucherInput, voucherSummaryText, type LockedVoucherFields } from './create';

// POST /api/vouchers/update — edits a PENDING voucher in place (number, type,
// branch and currency never change). System-generated vouchers (payroll /
// requests) keep their party and amount; only payment details, date, purpose
// and notes can be corrected.
export const POST: APIRoute = async context => {
  const auth = await financeAuth(context, VOUCHER_WRITE_FLAGS);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);
  const id = str(body.id, 100);
  if (!id) return fail('معرّف السند مطلوب', 400);

  try {
    const row = await loadScopedVoucher(db, session, id);
    if (row instanceof Response) return row;
    const existing = mapVoucherRow(row);

    if (!canCreateVoucherType(session, existing.type)) {
      return fail('ليست لديك صلاحية تعديل هذا النوع من السندات', 403);
    }
    if (existing.status !== 'pending') {
      return fail(
        existing.status === 'approved' ? 'لا يمكن تعديل سند معتمد — يمكن للمدير إلغاؤه وإصدار سند جديد' : 'لا يمكن تعديل سند ملغي',
        409,
      );
    }

    const locked: LockedVoucherFields | undefined =
      existing.sourceType !== 'manual'
        ? {
            partyType: existing.partyType,
            partyName: existing.partyName,
            employeeId: existing.employeeId,
            amount: existing.amount,
            items: existing.items.length ? existing.items : null,
            subtotal: existing.subtotal,
            discount: existing.discount,
            vatRate: existing.vatRate,
            vatAmount: existing.vatAmount,
          }
        : undefined;

    const org = await getOrganizationProfile(db);
    const parsed = await parseVoucherInput(db, body, { branchId: existing.branchId, org, type: existing.type, locked });
    if ('error' in parsed) return fail(parsed.error, parsed.status);
    const input = parsed.value;

    // The number embeds the year (PV-2026-00012): the date must stay in that year.
    const numberYear = /-(\d{4})-/.exec(existing.number)?.[1] ?? existing.date.slice(0, 4);
    if (input.date.slice(0, 4) !== numberYear) {
      return fail(`لا يمكن نقل السند إلى سنة أخرى — رقم السند مرتبط بسنة ${numberYear}`, 400);
    }

    const approveNow = body.approveNow === true && canApproveFinance(session);
    const status = approveNow ? 'approved' : 'pending';

    const result = await db
      .prepare(
        `UPDATE financial_vouchers SET
           voucher_date = ?, party_type = ?, party_name = ?, employee_id = ?, party_id_number = ?, party_phone = ?,
           amount = ?, purpose = ?, payment_method = ?, cash_amount = ?, bank_amount = ?, cheque_amount = ?, card_amount = ?,
           cheque_number = ?, cheque_date = ?, bank_name = ?, transaction_ref = ?,
           items_json = ?, subtotal = ?, discount = ?, vat_rate = ?, vat_amount = ?, notes = ?,
           status = ?, approved_by = ?, approved_by_name = ?,
           approved_at = CASE WHEN ? = 'approved' THEN datetime('now') ELSE NULL END,
           updated_at = datetime('now')
         WHERE id = ? AND status = 'pending'`,
      )
      .bind(
        input.date,
        input.partyType,
        input.partyName,
        input.employeeId,
        input.partyIdNumber,
        input.partyPhone,
        input.amount,
        input.purpose,
        input.paymentMethod,
        input.cashAmount,
        input.bankAmount,
        input.chequeAmount,
        input.cardAmount,
        input.chequeNumber,
        input.chequeDate,
        input.bankName,
        input.transactionRef,
        input.items && input.items.length ? JSON.stringify(input.items) : null,
        input.subtotal,
        input.discount,
        input.vatRate,
        input.vatAmount,
        input.notes,
        status,
        approveNow ? actor.id : null,
        approveNow ? actor.displayName : null,
        status,
        id,
      )
      .run();

    if (Number(result.meta?.changes ?? 0) === 0) {
      return fail('تغيرت حالة السند أثناء التعديل — أعد تحميل الصفحة', 409);
    }

    const updatedRow = await loadVoucherRow(db, id);
    if (!updatedRow) return fail('تعذر قراءة السند بعد الحفظ', 500);
    const saved = mapVoucherRow(updatedRow);

    await logAudit(
      db,
      session,
      'update',
      'voucher',
      id,
      {
        number: saved.number,
        approvedNow: approveNow,
        before: { amount: existing.amount, partyName: existing.partyName, date: existing.date, paymentMethod: existing.paymentMethod },
        after: { amount: saved.amount, partyName: saved.partyName, date: saved.date, paymentMethod: saved.paymentMethod },
      },
      clientIp(context.request),
      context.request.headers.get('User-Agent') ?? undefined,
    );

    if (approveNow && saved.createdBy && saved.createdBy !== actor.id) {
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
    console.error('Voucher update failed:', error);
    return fail('حدث خطأ أثناء تعديل السند', 500);
  }
};
