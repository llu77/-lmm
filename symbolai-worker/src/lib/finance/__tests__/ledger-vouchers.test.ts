import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './harness';
import { ensureFinanceSchema } from '../schema';
import { adjustmentInsertStatement, findLockedPeriod, firstOpenPeriod, planInstallments } from '../ledger';
import { normalizePaymentSplit, voucherInsertStatements, type NewVoucher } from '../vouchers';

const base = {
  branchId: 'branch_1010', employeeId: 'emp_1', employeeName: 'أحمد علي', period: '2026-10',
  createdBy: 'u_sup', createdByName: 'محمد أحمد',
};

async function ready() {
  const ctx = await setup('008');
  await ensureFinanceSchema(ctx.DB as any);
  return ctx;
}

test('adjustment insert is blocked once the period payroll is approved', async () => {
  const { DB } = await ready();
  const db = DB as any;
  await db.batch([adjustmentInsertStatement(db, { ...base, category: 'overtime', amount: 1000, sourceType: 'manual' })]);
  assert.equal(DB.query('SELECT * FROM payroll_adjustments').length, 1);

  DB.raw.exec(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('r', 'branch_1010', '2026-10', 'approved')`);
  const [res] = await db.batch([adjustmentInsertStatement(db, { ...base, category: 'overtime', amount: 5, sourceType: 'manual' })]);
  assert.equal(res.meta.changes, 0);
  assert.equal(DB.query('SELECT * FROM payroll_adjustments').length, 1);
  assert.equal(await findLockedPeriod(db, 'branch_1010', ['2026-09', '2026-10']), '2026-10');
  assert.equal(await firstOpenPeriod(db, 'branch_1010', '2026-10'), '2026-11');
  assert.equal(await firstOpenPeriod(db, 'branch_1010', '2026-12'), '2026-12');
});

test('request-sourced adjustments are idempotent', async () => {
  const { DB } = await ready();
  const db = DB as any;
  const adj = { ...base, category: 'advance' as const, amount: 500, sourceType: 'request' as const, sourceId: 'req_1' };
  await db.batch([adjustmentInsertStatement(db, adj)]);
  await db.batch([adjustmentInsertStatement(db, adj)]);
  assert.equal(DB.query('SELECT * FROM payroll_adjustments').length, 1);
});

test('custom guard can veto the insert', async () => {
  const { DB } = await ready();
  const db = DB as any;
  await db.batch([adjustmentInsertStatement(db, { ...base, category: 'violation', amount: 50, sourceType: 'manual' }, { sql: '1 = ?', params: [0] })]);
  assert.equal(DB.query('SELECT * FROM payroll_adjustments').length, 0);
});

test('installment plan spans consecutive months and sums exactly', () => {
  const plan = planInstallments(1000, 3, '2026-11');
  assert.deepEqual(plan.map(p => p.period), ['2026-11', '2026-12', '2027-01']);
  assert.deepEqual(plan.map(p => p.amount), [333.33, 333.33, 333.34]);
  assert.equal(planInstallments(100, 0, '2026-01').length, 1);
  assert.equal(planInstallments(100, 99, '2026-01').length, 24);
});

function voucher(overrides: Partial<NewVoucher> = {}): NewVoucher {
  return {
    branchId: 'branch_1010', branchName: 'فرع لبن', type: 'payment', date: '2026-10-29',
    partyType: 'employee', partyName: 'محمد إسماعيل', amount: 2000, currency: 'SAR', purpose: 'راتب',
    paymentMethod: 'cash', status: 'pending', sourceType: 'manual', createdBy: 'u_admin', createdByName: 'المدير العام',
    ...overrides,
  };
}

test('voucher numbers are sequential per type and year', async () => {
  const { DB } = await ready();
  const db = DB as any;
  await db.batch([...voucherInsertStatements(db, voucher()), ...voucherInsertStatements(db, voucher()), ...voucherInsertStatements(db, voucher({ type: 'receipt' }))]);
  await db.batch(voucherInsertStatements(db, voucher({ date: '2027-01-02' })));
  const numbers = DB.query<{ voucher_number: string }>('SELECT voucher_number FROM financial_vouchers ORDER BY created_at, rowid').map(r => r.voucher_number);
  assert.deepEqual(numbers, ['PV-2026-00001', 'PV-2026-00002', 'RV-2026-00001', 'PV-2027-00001']);
});

test('voucher generation for the same source is idempotent and burns no number', async () => {
  const { DB } = await ready();
  const db = DB as any;
  const v = voucher({ sourceType: 'payroll', sourceId: 'run1:emp_1' });
  await db.batch(voucherInsertStatements(db, v));
  await db.batch(voucherInsertStatements(db, { ...v, id: undefined }));
  assert.equal(DB.query('SELECT * FROM financial_vouchers').length, 1);
  assert.equal(DB.one<{ last_number: number }>(`SELECT last_number FROM voucher_sequences WHERE scope = 'payment:2026'`)!.last_number, 1);
  DB.raw.exec(`UPDATE financial_vouchers SET status = 'cancelled'`);
  await db.batch(voucherInsertStatements(db, { ...v, id: undefined }));
  assert.equal(DB.query(`SELECT * FROM financial_vouchers WHERE status != 'cancelled'`).length, 1);
});

test('approved vouchers record approver and time', async () => {
  const { DB } = await ready();
  const db = DB as any;
  await db.batch(voucherInsertStatements(db, voucher({ status: 'approved', approvedBy: 'u_admin', approvedByName: 'المدير العام' })));
  const row = DB.one<Record<string, unknown>>('SELECT * FROM financial_vouchers')!;
  assert.equal(row.approved_by, 'u_admin');
  assert.ok(row.approved_at);
});

test('payment split validation', () => {
  const mixed = voucher({ paymentMethod: 'mixed', cashAmount: 500, bankAmount: 1500 });
  assert.equal(normalizePaymentSplit(mixed), null);
  assert.equal(normalizePaymentSplit(voucher({ paymentMethod: 'mixed', cashAmount: 500, bankAmount: 1000 }))?.includes('لا يساوي'), true);
  assert.ok(normalizePaymentSplit(voucher({ paymentMethod: 'mixed', cashAmount: 2000 })));
  assert.ok(normalizePaymentSplit(voucher({ paymentMethod: 'cheque' })));
  const cash = voucher({ paymentMethod: 'cash', bankAmount: 99 });
  assert.equal(normalizePaymentSplit(cash), null);
  assert.equal(cash.cashAmount, 2000);
  assert.equal(cash.bankAmount, 0);
});
