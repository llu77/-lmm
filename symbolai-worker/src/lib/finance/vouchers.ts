// Receipt (سند قبض) and payment (سند صرف) vouchers: validation and the
// statements that number and insert them atomically. Numbers are sequential
// per voucher type per year (RV-2026-00001, PV-2026-00001). Server-only.

import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import { VOUCHER_TYPES, type PaymentMethod, type VoucherType } from './catalog';
import { toMinor, fromMinor, type CurrencyCode } from './money';
import { newId } from './http';
import type { SqlGuard } from './ledger';

export interface VoucherItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface NewVoucher {
  id?: string;
  branchId: string;
  branchName: string | null;
  type: VoucherType;
  date: string; // YYYY-MM-DD
  partyType: 'employee' | 'customer' | 'supplier' | 'other';
  partyName: string;
  employeeId?: string | null;
  partyIdNumber?: string | null;
  partyPhone?: string | null;
  amount: number;
  currency: CurrencyCode;
  purpose: string;
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  bankAmount?: number;
  chequeAmount?: number;
  cardAmount?: number;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  bankName?: string | null;
  transactionRef?: string | null;
  items?: VoucherItem[] | null;
  subtotal?: number | null;
  discount?: number | null;
  vatRate?: number | null;
  vatAmount?: number | null;
  notes?: string | null;
  status: 'pending' | 'approved';
  sourceType: 'manual' | 'payroll' | 'request';
  sourceId?: string | null;
  createdBy: string;
  createdByName: string;
  approvedBy?: string | null;
  approvedByName?: string | null;
}

/**
 * Normalizes the payment split: single methods put the whole amount in their
 * bucket; 'mixed' must have buckets that sum exactly to the amount.
 * Returns an Arabic error message, or null when valid.
 */
export function normalizePaymentSplit(v: NewVoucher): string | null {
  const total = toMinor(v.amount);
  const buckets = {
    cash: toMinor(v.cashAmount ?? 0),
    bank: toMinor(v.bankAmount ?? 0),
    cheque: toMinor(v.chequeAmount ?? 0),
    card: toMinor(v.cardAmount ?? 0),
  };
  if (Object.values(buckets).some(b => b < 0)) return 'مبالغ طريقة الدفع لا يمكن أن تكون سالبة';

  switch (v.paymentMethod) {
    case 'cash':
      Object.assign(buckets, { cash: total, bank: 0, cheque: 0, card: 0 });
      break;
    case 'bank_transfer':
      Object.assign(buckets, { cash: 0, bank: total, cheque: 0, card: 0 });
      break;
    case 'cheque':
      Object.assign(buckets, { cash: 0, bank: 0, cheque: total, card: 0 });
      break;
    case 'card':
      Object.assign(buckets, { cash: 0, bank: 0, cheque: 0, card: total });
      break;
    case 'mixed': {
      const sum = buckets.cash + buckets.bank + buckets.cheque + buckets.card;
      if (sum !== total) return `مجموع مبالغ طرق الدفع (${fromMinor(sum)}) لا يساوي مبلغ السند (${fromMinor(total)})`;
      if (Object.values(buckets).filter(b => b > 0).length < 2) return 'الدفع المختلط يتطلب طريقتين على الأقل';
      break;
    }
    default:
      return 'طريقة الدفع غير صحيحة';
  }
  if ((v.paymentMethod === 'cheque' || buckets.cheque > 0) && !v.chequeNumber) return 'رقم الشيك مطلوب';

  v.cashAmount = fromMinor(buckets.cash);
  v.bankAmount = fromMinor(buckets.bank);
  v.chequeAmount = fromMinor(buckets.cheque);
  v.cardAmount = fromMinor(buckets.card);
  return null;
}

/**
 * Two statements for a db.batch(): bump the yearly sequence, then insert the
 * voucher reading the new number. Both are skipped when the guard fails or
 * when a live voucher already exists for the same source (idempotent
 * generation never burns a number).
 */
export function voucherInsertStatements(db: D1Database, v: NewVoucher, guard?: SqlGuard): D1PreparedStatement[] {
  const year = v.date.slice(0, 4);
  const scope = `${v.type}:${year}`;
  const prefix = `${VOUCHER_TYPES[v.type].prefix}-${year}-`;

  const conditions: string[] = [];
  const conditionParams: unknown[] = [];
  if (v.sourceId) {
    conditions.push(`NOT EXISTS (SELECT 1 FROM financial_vouchers fv WHERE fv.source_type = ? AND fv.source_id = ? AND fv.status != 'cancelled')`);
    conditionParams.push(v.sourceType, v.sourceId);
  }
  if (guard) {
    conditions.push(`(${guard.sql})`);
    conditionParams.push(...guard.params);
  }
  const where = conditions.length ? conditions.join(' AND ') : '1';

  const bump = db
    .prepare(
      `INSERT INTO voucher_sequences (scope, last_number)
       SELECT ?, 1 WHERE ${where}
       ON CONFLICT(scope) DO UPDATE SET last_number = last_number + 1`,
    )
    .bind(scope, ...conditionParams);

  const insert = db
    .prepare(
      `INSERT INTO financial_vouchers
         (id, branch_id, branch_name, voucher_type, sequence_no, voucher_number, voucher_date,
          party_type, party_name, employee_id, party_id_number, party_phone,
          amount, currency, purpose, payment_method, cash_amount, bank_amount, cheque_amount, card_amount,
          cheque_number, cheque_date, bank_name, transaction_ref,
          items_json, subtotal, discount, vat_rate, vat_amount, notes, status, source_type, source_id,
          created_by, created_by_name, approved_by, approved_by_name, approved_at)
       SELECT ?, ?, ?, ?, s.last_number, ? || printf('%05d', s.last_number), ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, CASE WHEN ? = 'approved' THEN datetime('now') ELSE NULL END
       FROM voucher_sequences s
       WHERE s.scope = ? AND ${where}`,
    )
    .bind(
      v.id ?? newId('vch'),
      v.branchId,
      v.branchName,
      v.type,
      prefix,
      v.date,
      v.partyType,
      v.partyName,
      v.employeeId ?? null,
      v.partyIdNumber ?? null,
      v.partyPhone ?? null,
      v.amount,
      v.currency,
      v.purpose,
      v.paymentMethod,
      v.cashAmount ?? 0,
      v.bankAmount ?? 0,
      v.chequeAmount ?? 0,
      v.cardAmount ?? 0,
      v.chequeNumber ?? null,
      v.chequeDate ?? null,
      v.bankName ?? null,
      v.transactionRef ?? null,
      v.items && v.items.length ? JSON.stringify(v.items) : null,
      v.subtotal ?? null,
      v.discount ?? null,
      v.vatRate ?? null,
      v.vatAmount ?? null,
      v.notes ?? null,
      v.status,
      v.sourceType,
      v.sourceId ?? null,
      v.createdBy,
      v.createdByName,
      v.status === 'approved' ? (v.approvedBy ?? null) : null,
      v.status === 'approved' ? (v.approvedByName ?? null) : null,
      v.status,
      scope,
      ...conditionParams,
    );

  return [bump, insert];
}
