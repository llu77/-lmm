import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, call } from './harness';
import { POST as create } from '../../../pages/api/vouchers/create';
import { POST as update } from '../../../pages/api/vouchers/update';
import { POST as approve } from '../../../pages/api/vouchers/approve';
import { POST as cancel } from '../../../pages/api/vouchers/cancel';
import { GET as list } from '../../../pages/api/vouchers/list';
import { GET as get, buildVoucherPrintModel, mapVoucherRow } from '../../../pages/api/vouchers/get';
import { todayIso } from '../catalog';
import { voucherInsertStatements, type NewVoucher } from '../vouchers';
import { ensureFinanceSchema } from '../schema';

const today = todayIso();
const year = today.slice(0, 4);

function paymentBody(overrides: Record<string, unknown> = {}) {
  return {
    type: 'payment',
    branchId: 'branch_1010',
    date: today,
    partyType: 'employee',
    employeeId: 'emp_2',
    purpose: 'راتب شهر أكتوبر',
    paymentMethod: 'mixed',
    amount: 2000,
    cashAmount: 500,
    bankAmount: 1500,
    bankName: 'مصرف الراجحي',
    transactionRef: 'TRX-778',
    ...overrides,
  };
}

function receiptBody(overrides: Record<string, unknown> = {}) {
  return {
    type: 'receipt',
    branchId: 'branch_1010',
    date: today,
    partyType: 'customer',
    partyName: 'شركة الأفق',
    partyPhone: '0555123456',
    purpose: 'دفعة من قيمة طلبية',
    paymentMethod: 'cash',
    amount: '750.25',
    ...overrides,
  };
}

for (const variant of ['008', 'legacy'] as const) {
  test(`payment voucher with a mixed split is numbered and notifies the manager (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    const res = await call(create, env, { token: data.users.supervisor.token, body: paymentBody() });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const v = res.body.voucher;
    assert.equal(v.number, `PV-${year}-00001`);
    assert.equal(v.status, 'pending');
    assert.equal(v.partyName, 'محمد إسماعيل');
    assert.equal(v.partyIdNumber, '1002');
    assert.equal(v.employeeId, 'emp_2');
    assert.equal(v.amount, 2000);
    assert.deepEqual(v.split, { cash: 500, bank: 1500, cheque: 0, card: 0 });
    assert.equal(v.bankName, 'مصرف الراجحي');
    assert.equal(v.transactionRef, 'TRX-778');
    assert.equal(v.branchName, 'فرع لبن');
    assert.equal(v.createdByName, 'محمد أحمد');
    assert.equal(v.currency, 'SAR');
    assert.deepEqual(res.body.actions, { print: true, edit: true, approve: false, cancel: true });

    // Every manager (admin role: all branches + settings) is told; the supervisor is not.
    const ntf = DB.query<Record<string, unknown>>(`SELECT * FROM user_notifications WHERE type = 'voucher_pending' ORDER BY user_id`);
    assert.deepEqual(ntf.map(n => n.user_id), ['u_admin', 'user_admin']);
    assert.equal(ntf[0].related_entity, v.id);
    assert.equal(ntf[0].branch_id, 'branch_1010');
    assert.match(String(ntf[0].message), /PV-\d{4}-00001/);
    assert.match(String(ntf[0].link), /^\/vouchers\?type=payment&branchId=branch_1010&q=PV-/);

    const second = await call(create, env, { token: data.users.supervisor.token, body: paymentBody({ paymentMethod: 'cash' }) });
    assert.equal(second.body.voucher.number, `PV-${year}-00002`);
    assert.deepEqual(second.body.voucher.split, { cash: 2000, bank: 0, cheque: 0, card: 0 });
    // Bank details are dropped when no bank bucket is used.
    assert.equal(second.body.voucher.bankName, null);
    assert.equal(second.body.voucher.transactionRef, null);
  });

  test(`employee parties must belong to the voucher branch (${variant})`, async () => {
    const { env, data } = await setup(variant);
    const res = await call(create, env, { token: data.users.supervisor.token, body: paymentBody({ employeeId: 'emp_3' }) });
    assert.equal(res.status, 400);
    const missing = await call(create, env, { token: data.users.supervisor.token, body: paymentBody({ employeeId: '' }) });
    assert.equal(missing.status, 400);
  });
}

test('receipt by a supervisor is allowed; partners and employees cannot create', async () => {
  const { env, data } = await setup('008');
  const res = await call(create, env, { token: data.users.supervisor.token, body: receiptBody() });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.voucher.number, `RV-${year}-00001`);
  assert.equal(res.body.voucher.amount, 750.25);
  assert.equal(res.body.voucher.partyPhone, '0555123456');

  const partner = await call(create, env, { token: data.users.partner.token, body: receiptBody() });
  assert.equal(partner.status, 403);
  const employee = await call(create, env, { token: data.users.employee.token, body: paymentBody() });
  assert.equal(employee.status, 403);

  // Partners may view (read-only actions), employees may not.
  const partnerList = await call(list, env, { token: data.users.partner.token });
  assert.equal(partnerList.status, 200);
  assert.equal(partnerList.body.vouchers.length, 1);
  assert.deepEqual(partnerList.body.vouchers[0].actions, { print: true, edit: false, approve: false, cancel: false });
  assert.deepEqual(partnerList.body.permissions, { createReceipt: false, createPayment: false, approve: false });
  const employeeList = await call(list, env, { token: data.users.employee.token });
  assert.equal(employeeList.status, 403);
});

test('input validation: split, amount, date, party', async () => {
  const { env, data } = await setup('008');
  const t = data.users.supervisor.token;

  const mismatch = await call(create, env, { token: t, body: paymentBody({ cashAmount: 500, bankAmount: 1000 }) });
  assert.equal(mismatch.status, 400);
  assert.match(mismatch.body.error, /لا يساوي/);

  const oneBucket = await call(create, env, { token: t, body: paymentBody({ cashAmount: 2000, bankAmount: 0 }) });
  assert.equal(oneBucket.status, 400);

  const chequeNoNumber = await call(create, env, { token: t, body: paymentBody({ paymentMethod: 'cheque' }) });
  assert.equal(chequeNoNumber.status, 400);

  const badAmount = await call(create, env, { token: t, body: receiptBody({ amount: '12.345' }) });
  assert.equal(badAmount.status, 400);
  const zero = await call(create, env, { token: t, body: receiptBody({ amount: 0 }) });
  assert.equal(zero.status, 400);

  const future = new Date(`${today}T00:00:00Z`);
  future.setUTCDate(future.getUTCDate() + 2);
  const tooLate = await call(create, env, { token: t, body: receiptBody({ date: future.toISOString().slice(0, 10) }) });
  assert.equal(tooLate.status, 400);
  const badDate = await call(create, env, { token: t, body: receiptBody({ date: '2026-02-30' }) });
  assert.equal(badDate.status, 400);

  const noName = await call(create, env, { token: t, body: receiptBody({ partyName: '  ' }) });
  assert.equal(noName.status, 400);
  const longName = await call(create, env, { token: t, body: receiptBody({ partyName: 'x'.repeat(151) }) });
  assert.equal(longName.status, 400);
  const noPurpose = await call(create, env, { token: t, body: receiptBody({ purpose: '' }) });
  assert.equal(noPurpose.status, 400);
  const badType = await call(create, env, { token: t, body: receiptBody({ type: 'journal' }) });
  assert.equal(badType.status, 400);
  const badParty = await call(create, env, { token: t, body: receiptBody({ partyType: 'friend' }) });
  assert.equal(badParty.status, 400);

  const cheque = await call(create, env, {
    token: t,
    body: receiptBody({ paymentMethod: 'cheque', chequeNumber: '000123', chequeDate: today, bankName: 'البنك الأهلي', transactionRef: 'IGNORED' }),
  });
  assert.equal(cheque.status, 201, JSON.stringify(cheque.body));
  assert.equal(cheque.body.voucher.chequeNumber, '000123');
  assert.equal(cheque.body.voucher.bankName, 'البنك الأهلي');
  assert.equal(cheque.body.voucher.transactionRef, null);
});

test('items: totals, discount and VAT are computed on the server', async () => {
  const { env, DB, data } = await setup('008');
  const res = await call(create, env, {
    token: data.users.supervisor.token,
    body: receiptBody({
      amount: 1, // ignored when items are given
      items: [
        { description: 'تصميم شعار', quantity: 2, unitPrice: '100.50' },
        { description: 'رسوم طباعة', quantity: '1', unitPrice: 50 },
      ],
      discount: 1,
      applyVat: true,
    }),
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const v = res.body.voucher;
  assert.equal(v.subtotal, 251);
  assert.equal(v.discount, 1);
  assert.equal(v.vatRate, 15);
  assert.equal(v.vatAmount, 37.5);
  assert.equal(v.amount, 287.5);
  assert.equal(v.itemCount, 2);
  assert.deepEqual(v.items.map((i: { total: number }) => i.total), [201, 50]);

  const stored = DB.one<{ amount: number; items_json: string }>('SELECT amount, items_json FROM financial_vouchers WHERE id = ?', v.id)!;
  assert.equal(stored.amount, 287.5);
  assert.equal(JSON.parse(stored.items_json).length, 2);

  const custom = await call(create, env, {
    token: data.users.supervisor.token,
    body: receiptBody({ items: [{ description: 'بند', quantity: 3, unitPrice: '33.33' }], vatRate: 5 }),
  });
  assert.equal(custom.body.voucher.subtotal, 99.99);
  assert.equal(custom.body.voucher.vatAmount, 5);
  assert.equal(custom.body.voucher.amount, 104.99);

  const noVat = await call(create, env, {
    token: data.users.supervisor.token,
    body: receiptBody({ items: [{ description: 'بند', quantity: 1, unitPrice: 10 }], applyVat: false, vatRate: 15 }),
  });
  assert.equal(noVat.body.voucher.vatAmount, 0);
  assert.equal(noVat.body.voucher.amount, 10);

  const bigDiscount = await call(create, env, {
    token: data.users.supervisor.token,
    body: receiptBody({ items: [{ description: 'بند', quantity: 1, unitPrice: 10 }], discount: 11 }),
  });
  assert.equal(bigDiscount.status, 400);
  const badQty = await call(create, env, {
    token: data.users.supervisor.token,
    body: receiptBody({ items: [{ description: 'بند', quantity: 0, unitPrice: 10 }] }),
  });
  assert.equal(badQty.status, 400);
  const tooMany = await call(create, env, {
    token: data.users.supervisor.token,
    body: receiptBody({ items: Array.from({ length: 31 }, () => ({ description: 'x', quantity: 1, unitPrice: 1 })) }),
  });
  assert.equal(tooMany.status, 400);
  const allFree = await call(create, env, {
    token: data.users.supervisor.token,
    body: receiptBody({ items: [{ description: 'هدية', quantity: 1, unitPrice: 0 }] }),
  });
  assert.equal(allFree.status, 400);
});

test('approval is for the manager only and records the approver', async () => {
  const { env, DB, data } = await setup('008');
  const created = await call(create, env, { token: data.users.supervisor.token, body: paymentBody() });
  const id = created.body.voucher.id;

  const bySupervisor = await call(approve, env, { token: data.users.supervisor.token, body: { id } });
  assert.equal(bySupervisor.status, 403);

  const byAdmin = await call(approve, env, { token: data.users.admin.token, body: { id } });
  assert.equal(byAdmin.status, 200, JSON.stringify(byAdmin.body));
  assert.equal(byAdmin.body.voucher.status, 'approved');
  const row = DB.one<Record<string, unknown>>('SELECT * FROM financial_vouchers WHERE id = ?', id)!;
  assert.equal(row.approved_by, 'u_admin');
  assert.equal(row.approved_by_name, 'المدير العام');
  assert.ok(row.approved_at);

  const ntf = DB.query<Record<string, unknown>>(`SELECT * FROM user_notifications WHERE type = 'voucher_approved'`);
  assert.equal(ntf.length, 1);
  assert.equal(ntf[0].user_id, 'u_sup');
  assert.equal(ntf[0].link, `/vouchers/print/${id}`);

  const again = await call(approve, env, { token: data.users.admin.token, body: { id } });
  assert.equal(again.status, 409);
  const missing = await call(approve, env, { token: data.users.admin.token, body: { id: 'nope' } });
  assert.equal(missing.status, 404);
});

test('approveNow: immediate approval for the manager only', async () => {
  const { env, data } = await setup('008');
  const admin = await call(create, env, { token: data.users.admin.token, body: paymentBody({ approveNow: true }) });
  assert.equal(admin.status, 201);
  assert.equal(admin.body.voucher.status, 'approved');
  assert.equal(admin.body.voucher.approvedBy, 'u_admin');

  const sup = await call(create, env, { token: data.users.supervisor.token, body: paymentBody({ approveNow: true }) });
  assert.equal(sup.body.voucher.status, 'pending');
  assert.equal(sup.body.voucher.approvedBy, null);

  // Admins must name a branch.
  const noBranch = await call(create, env, { token: data.users.admin.token, body: paymentBody({ branchId: '' }) });
  assert.equal(noBranch.status, 400);
});

test('update: pending only, keeps the number, same year, no type change', async () => {
  const { env, data } = await setup('008');
  const t = data.users.supervisor.token;
  const created = await call(create, env, { token: t, body: receiptBody() });
  const id = created.body.voucher.id;

  const edited = await call(update, env, {
    token: t,
    body: { ...receiptBody({ amount: 900, purpose: 'دفعة معدلة', paymentMethod: 'card', transactionRef: 'POS-1' }), id },
  });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));
  assert.equal(edited.body.voucher.number, created.body.voucher.number);
  assert.equal(edited.body.voucher.amount, 900);
  assert.equal(edited.body.voucher.purpose, 'دفعة معدلة');
  assert.equal(edited.body.voucher.paymentMethod, 'card');
  assert.equal(edited.body.voucher.transactionRef, 'POS-1');

  const typeChange = await call(update, env, { token: t, body: { ...receiptBody({ type: 'payment' }), id } });
  assert.equal(typeChange.status, 400);

  const otherYear = `${Number(year) - 1}-12-31`;
  const yearChange = await call(update, env, { token: t, body: { ...receiptBody({ date: otherYear }), id } });
  assert.equal(yearChange.status, 400);

  await call(approve, env, { token: data.users.admin.token, body: { id } });
  const afterApproval = await call(update, env, { token: data.users.admin.token, body: { ...receiptBody(), id } });
  assert.equal(afterApproval.status, 409);

  const partner = await call(update, env, { token: data.users.partner.token, body: { ...receiptBody(), id } });
  assert.equal(partner.status, 403);
});

test('cancel rules: pending by creator, approved by manager with a reason', async () => {
  const { env, DB, data } = await setup('008');
  const sup = data.users.supervisor.token;
  const admin = data.users.admin.token;

  const pending = await call(create, env, { token: sup, body: receiptBody() });
  const ok1 = await call(cancel, env, { token: sup, body: { id: pending.body.voucher.id } });
  assert.equal(ok1.status, 200, JSON.stringify(ok1.body));
  assert.equal(ok1.body.voucher.status, 'cancelled');
  const again = await call(cancel, env, { token: sup, body: { id: pending.body.voucher.id, reason: 'مكرر' } });
  assert.equal(again.status, 409);

  const approvedV = await call(create, env, { token: sup, body: paymentBody() });
  const id = approvedV.body.voucher.id;
  await call(approve, env, { token: admin, body: { id } });
  const bySup = await call(cancel, env, { token: sup, body: { id, reason: 'خطأ في المبلغ' } });
  assert.equal(bySup.status, 403);
  const noReason = await call(cancel, env, { token: admin, body: { id } });
  assert.equal(noReason.status, 400);
  const byAdmin = await call(cancel, env, { token: admin, body: { id, reason: 'خطأ في المبلغ' } });
  assert.equal(byAdmin.status, 200);
  const row = DB.one<Record<string, unknown>>('SELECT * FROM financial_vouchers WHERE id = ?', id)!;
  assert.equal(row.status, 'cancelled');
  assert.equal(row.cancel_reason, 'خطأ في المبلغ');
  assert.equal(row.cancelled_by, 'u_admin');
  assert.equal(row.voucher_number, `PV-${year}-00001`);
  // The creator hears about it.
  assert.equal(DB.query(`SELECT * FROM user_notifications WHERE type = 'voucher_cancelled' AND user_id = 'u_sup'`).length, 1);

  // Partners cannot cancel anything.
  const third = await call(create, env, { token: sup, body: receiptBody() });
  const partner = await call(cancel, env, { token: data.users.partner.token, body: { id: third.body.voucher.id, reason: 'x y z' } });
  assert.equal(partner.status, 403);
});

test('branch scoping on get/update/approve/cancel/list', async () => {
  const { env, data } = await setup('008');
  const other = await call(create, env, {
    token: data.users.admin.token,
    body: paymentBody({ branchId: 'branch_2020', employeeId: 'emp_3' }),
  });
  assert.equal(other.status, 201, JSON.stringify(other.body));
  const id = other.body.voucher.id;
  const sup = data.users.supervisor.token;

  assert.equal((await call(get, env, { token: sup, query: { id } })).status, 403);
  assert.equal((await call(update, env, { token: sup, body: { ...paymentBody(), id } })).status, 403);
  assert.equal((await call(cancel, env, { token: sup, body: { id, reason: 'xxx' } })).status, 403);
  assert.equal((await call(list, env, { token: sup, query: { branchId: 'branch_2020' } })).status, 403);

  const own = await call(get, env, { token: data.users.otherSupervisor.token, query: { id } });
  assert.equal(own.status, 200);
  assert.equal(own.body.voucher.partyName, 'خالد سالم');
  assert.equal(own.body.voucher.createdByDisplayName, 'المدير العام');
  assert.match(own.body.voucher.amountInWordsAr, /ألفان/);
  assert.equal((await call(get, env, { token: sup, query: { id: 'missing' } })).status, 404);

  // A supervisor creating for another branch is refused.
  const cross = await call(create, env, { token: sup, body: paymentBody({ branchId: 'branch_2020', employeeId: 'emp_3' }) });
  assert.equal(cross.status, 403);
});

test('list: filters, search escaping, paging and per-type summary', async () => {
  const { env, DB, data } = await setup('008');
  const sup = data.users.supervisor.token;
  const admin = data.users.admin.token;
  const p1 = await call(create, env, { token: sup, body: paymentBody() }); // 2000 pending
  const p2 = await call(create, env, { token: sup, body: paymentBody({ paymentMethod: 'cash', amount: 300, purpose: 'سلفة 100%' }) });
  await call(approve, env, { token: admin, body: { id: p2.body.voucher.id } }); // 300 approved
  const r1 = await call(create, env, { token: sup, body: receiptBody({ amount: 1000 }) });
  await call(approve, env, { token: admin, body: { id: r1.body.voucher.id } }); // 1000 approved
  const r2 = await call(create, env, { token: sup, body: receiptBody({ amount: 50 }) });
  await call(cancel, env, { token: sup, body: { id: r2.body.voucher.id } });

  // Payroll-generated vouchers (as stream A writes them).
  const db = DB as any;
  const sys = (sourceId: string, partyName: string): NewVoucher => ({
    branchId: 'branch_1010', branchName: 'فرع لبن', type: 'payment', date: today, partyType: 'employee', partyName,
    amount: 100, currency: 'SAR', purpose: 'راتب', paymentMethod: 'bank_transfer', bankAmount: 100, status: 'pending',
    sourceType: 'payroll', sourceId, createdBy: 'u_admin', createdByName: 'المدير العام',
  });
  await db.batch(voucherInsertStatements(db, sys('run1:emp_1', 'أحمد علي')));
  await db.batch(voucherInsertStatements(db, sys('run10:emp_2', 'محمد إسماعيل')));

  const payments = await call(list, env, { token: sup, query: { type: 'payment' } });
  assert.equal(payments.status, 200);
  assert.equal(payments.body.total, 4);
  assert.ok(payments.body.vouchers.every((v: { type: string }) => v.type === 'payment'));
  assert.equal(payments.body.summary.payment.totalApproved, 300);
  assert.equal(payments.body.summary.payment.totalPending, 2200);
  assert.equal(payments.body.summary.payment.count, 4);
  assert.equal(payments.body.summary.receipt.totalApproved, 1000);
  assert.equal(payments.body.summary.receipt.cancelledCount, 1);
  assert.equal(payments.body.summary.receipt.count, 1);

  const pendingOnly = await call(list, env, { token: sup, query: { type: 'payment', status: 'pending' } });
  assert.equal(pendingOnly.body.total, 3);

  const byNumber = await call(list, env, { token: sup, query: { q: p1.body.voucher.number } });
  assert.equal(byNumber.body.total, 1);
  assert.equal(byNumber.body.vouchers[0].id, p1.body.voucher.id);

  const percent = await call(list, env, { token: sup, query: { q: '%' } });
  assert.equal(percent.body.total, 1); // only "سلفة 100%", the wildcard is escaped
  const underscore = await call(list, env, { token: sup, query: { q: '_' } });
  assert.equal(underscore.body.total, 0);

  const payrollRun = await call(list, env, { token: sup, query: { source: 'payroll', sourceId: 'run1' } });
  assert.equal(payrollRun.body.total, 1);
  assert.equal(payrollRun.body.vouchers[0].partyName, 'أحمد علي');
  const allPayroll = await call(list, env, { token: sup, query: { source: 'payroll' } });
  assert.equal(allPayroll.body.total, 2);

  const range = await call(list, env, { token: sup, query: { from: '2000-01-01', to: '2000-12-31' } });
  assert.equal(range.body.total, 0);
  assert.equal(range.body.summary.payment.count, 0);
  assert.equal((await call(list, env, { token: sup, query: { from: 'yesterday' } })).status, 400);
  assert.equal((await call(list, env, { token: sup, query: { status: 'weird' } })).status, 400);

  const paged = await call(list, env, { token: sup, query: { limit: '2', offset: '0' } });
  assert.equal(paged.body.vouchers.length, 2);
  assert.equal(paged.body.total, 6);
  const paged2 = await call(list, env, { token: sup, query: { limit: '2', offset: '4' } });
  assert.equal(paged2.body.vouchers.length, 2);

  // Admins must pick a branch; supervisors default to theirs.
  assert.equal((await call(list, env, { token: admin })).status, 400);
  assert.equal((await call(list, env, { token: admin, query: { branchId: 'branch_1010' } })).body.total, 6);
});

test('system-generated vouchers keep their party and amount when edited', async () => {
  const { env, DB, data } = await setup('008');
  const db = DB as any;
  await ensureFinanceSchema(db);
  await db.batch(
    voucherInsertStatements(db, {
      id: 'vch_sys', branchId: 'branch_1010', branchName: 'فرع لبن', type: 'payment', date: today, partyType: 'employee',
      partyName: 'أحمد علي', employeeId: 'emp_1', amount: 3500, currency: 'SAR', purpose: 'صافي راتب', paymentMethod: 'bank_transfer',
      bankAmount: 3500, status: 'pending', sourceType: 'payroll', sourceId: 'run9:emp_1', createdBy: 'u_admin', createdByName: 'المدير العام',
    }),
  );
  const changeAmount = await call(update, env, {
    token: data.users.supervisor.token,
    body: { id: 'vch_sys', amount: 10, purpose: 'صافي راتب', paymentMethod: 'cash' },
  });
  assert.equal(changeAmount.status, 409);

  const split = await call(update, env, {
    token: data.users.supervisor.token,
    body: { id: 'vch_sys', purpose: 'صافي راتب أكتوبر', paymentMethod: 'mixed', cashAmount: 500, bankAmount: 3000, partyName: 'شخص آخر' },
  });
  assert.equal(split.status, 200, JSON.stringify(split.body));
  assert.equal(split.body.voucher.amount, 3500);
  assert.equal(split.body.voucher.partyName, 'أحمد علي');
  assert.deepEqual(split.body.voucher.split, { cash: 500, bank: 3000, cheque: 0, card: 0 });
  assert.equal(split.body.voucher.sourceId, 'run9:emp_1');
});

test('print model: words, payment breakdown, signatures and stamp only after approval', async () => {
  const { env, DB, data } = await setup('008');
  const created = await call(create, env, { token: data.users.supervisor.token, body: paymentBody() });
  const id = created.body.voucher.id;
  const sigs = new Map([
    ['u_sup', { userId: 'u_sup', image: 'data:image/png;base64,AAAA', signerName: 'محمد أحمد', signerTitle: 'محاسب', updatedAt: '' }],
    ['u_admin', { userId: 'u_admin', image: 'data:image/png;base64,BBBB', signerName: 'المدير العام', signerTitle: 'المدير', updatedAt: '' }],
  ]);
  const org = { companyNameAr: 'مؤسسة تدرج' };

  const pendingRow = DB.one<Record<string, unknown>>('SELECT * FROM financial_vouchers WHERE id = ?', id)!;
  const pending = buildVoucherPrintModel(mapVoucherRow(pendingRow), org, sigs);
  assert.equal(pending.titleAr, 'سند صرف');
  assert.equal(pending.titleEn, 'Payment Voucher');
  assert.equal(pending.watermark, 'بانتظار الاعتماد');
  assert.equal(pending.amountText, '2,000.00');
  const labels = pending.rows.map(r => r.en);
  assert.deepEqual(labels, ['Paid to', 'ID / Mobile', 'Amount', 'Amount in words', 'Being for', 'Payment method', 'Bank', 'Transaction ID']);
  assert.equal(pending.rows.find(r => r.en === 'Amount in words')!.value, 'فقط ألفان ريال سعودي لا غير');
  assert.equal(pending.rows.find(r => r.en === 'Amount in words')!.sub, 'Two Thousand Saudi Riyals Only');
  assert.equal(pending.rows.find(r => r.en === 'Payment method')!.value, 'نقداً 500.00 ر.س  •  حوالة بنكية 1,500.00 ر.س');
  assert.equal(pending.slots.length, 3);
  assert.equal(pending.slots[0].titleAr, 'المحاسب');
  assert.equal(pending.slots[0].signatureImage, 'data:image/png;base64,AAAA');
  assert.equal(pending.slots[1].name, 'محمد إسماعيل');
  assert.equal(pending.slots[1].handwritten, true);
  assert.equal(pending.slots[2].stamp, false);
  assert.equal(pending.slots[2].signatureImage, null);
  assert.equal(pending.items.length, 0);
  assert.equal(pending.totals.length, 0);

  await call(approve, env, { token: data.users.admin.token, body: { id } });
  const approvedRow = DB.one<Record<string, unknown>>('SELECT * FROM financial_vouchers WHERE id = ?', id)!;
  const approved = buildVoucherPrintModel(mapVoucherRow(approvedRow), org, sigs);
  assert.equal(approved.watermark, null);
  assert.equal(approved.slots[2].stamp, true);
  assert.equal(approved.slots[2].signatureImage, 'data:image/png;base64,BBBB');
  assert.equal(approved.slots[2].name, 'المدير العام');
  assert.match(approved.statusLine, /^معتمد من المدير العام/);

  const receipt = await call(create, env, {
    token: data.users.supervisor.token,
    body: receiptBody({ items: [{ description: 'خدمة', quantity: 1, unitPrice: 100 }], applyVat: true }),
  });
  const rRow = DB.one<Record<string, unknown>>('SELECT * FROM financial_vouchers WHERE id = ?', receipt.body.voucher.id)!;
  const rModel = buildVoucherPrintModel(mapVoucherRow(rRow), org, new Map());
  assert.equal(rModel.slots[0].titleAr, 'أمين الصندوق');
  assert.equal(rModel.slots[1].titleAr, 'الدافع');
  assert.equal(rModel.rows[0].en, 'Received from');
  assert.deepEqual(rModel.totals.map(t => t.en), ['Sub-total', 'VAT (15%)', 'Total']);
  assert.equal(rModel.totals[2].value, '115.00 SAR');
  assert.equal(rModel.rows.find(r => r.en === 'Payment method')!.value, 'نقداً');
});

for (const variant of ['008', 'legacy'] as const) {
  test(`request vouchers are readable (read-only) by the employee who filed the request (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    const db = DB as any;
    await ensureFinanceSchema(db);
    // A second employee account (no finance permissions).
    DB.raw.exec(`INSERT INTO users_new (id, username, password, full_name, role_id, branch_id, is_active)
                 VALUES ('u_emp2', 'emp2', 'x', 'محمد إسماعيل', 'role_employee', 'branch_1010', 1)`);
    await env.SESSIONS.put('session:tok_u_emp2', JSON.stringify({ userId: 'u_emp2', username: 'emp2', role: 'employee', createdAt: Date.now(), expiresAt: Date.now() + 3_600_000 }));

    // u_emp filed an advance request for emp_1; the requests stream issued its payment voucher.
    DB.raw.exec(`INSERT INTO employee_requests (id, branch_id, user_id, employee_name, request_type, request_date, status)
                 VALUES ('req_1', 'branch_1010', 'u_emp', 'أحمد علي', 'سلفة', '${today}', 'approved')`);
    DB.raw.exec(`INSERT INTO employee_request_meta (request_id, employee_id) VALUES ('req_1', 'emp_1')`);
    const advance = (id: string, sourceId: string, sourceType: 'request' | 'manual' = 'request'): NewVoucher => ({
      id, branchId: 'branch_1010', branchName: 'فرع لبن', type: 'payment', date: today, partyType: 'employee',
      partyName: 'أحمد علي', employeeId: 'emp_1', amount: 1000, currency: 'SAR', purpose: 'سلفة', paymentMethod: 'cash',
      status: 'approved', approvedBy: 'u_admin', approvedByName: 'المدير العام',
      sourceType, sourceId, createdBy: 'u_sup', createdByName: 'محمد أحمد',
    });
    await db.batch(voucherInsertStatements(db, advance('vch_req1', 'req_1')));

    const own = await call(get, env, { token: data.users.employee.token, query: { id: 'vch_req1' } });
    assert.equal(own.status, 200, JSON.stringify(own.body));
    assert.equal(own.body.voucher.number, `PV-${year}-00001`);
    assert.equal(own.body.readOnly, true);
    assert.deepEqual(own.body.actions, { print: true, edit: false, approve: false, cancel: false });
    // The print model builds from the same row.
    const model = buildVoucherPrintModel(mapVoucherRow(DB.one<Record<string, unknown>>('SELECT * FROM financial_vouchers WHERE id = ?', 'vch_req1')!), { companyNameAr: 'x' }, new Map());
    assert.equal(model.slots[2].stamp, true);

    // Another employee: 403 (and no hint whether the id exists).
    const other = await call(get, env, { token: 'tok_u_emp2', query: { id: 'vch_req1' } });
    assert.equal(other.status, 403);
    assert.equal((await call(get, env, { token: 'tok_u_emp2', query: { id: 'does-not-exist' } })).status, 403);

    // Still strictly read-only and limited to request vouchers.
    assert.equal((await call(cancel, env, { token: data.users.employee.token, body: { id: 'vch_req1', reason: 'xxx' } })).status, 403);
    assert.equal((await call(update, env, { token: data.users.employee.token, body: { id: 'vch_req1', purpose: 'x' } })).status, 403);
    assert.equal((await call(list, env, { token: data.users.employee.token })).status, 403);
    await db.batch(voucherInsertStatements(db, advance('vch_manual', '', 'manual')));
    assert.equal((await call(get, env, { token: data.users.employee.token, query: { id: 'vch_manual' } })).status, 403);

    // (a) the employee the voucher pays, even when a supervisor filed that request.
    DB.raw.exec(`INSERT INTO employee_requests (id, branch_id, user_id, employee_name, request_type, request_date, status)
                 VALUES ('req_2', 'branch_1010', 'u_sup', 'أحمد علي', 'سلفة', '${today}', 'approved')`);
    DB.raw.exec(`INSERT INTO employee_request_meta (request_id, employee_id) VALUES ('req_2', 'emp_1')`);
    await db.batch(voucherInsertStatements(db, advance('vch_req2', 'req_2')));
    assert.equal((await call(get, env, { token: data.users.employee.token, query: { id: 'vch_req2' } })).status, 200);
    assert.equal((await call(get, env, { token: 'tok_u_emp2', query: { id: 'vch_req2' } })).status, 403);

    // Staff rules are unchanged: the other branch's supervisor still gets 403.
    assert.equal((await call(get, env, { token: data.users.otherSupervisor.token, query: { id: 'vch_req1' } })).status, 403);
    assert.equal((await call(get, env, { token: data.users.supervisor.token, query: { id: 'vch_req1' } })).body.readOnly, false);
  });
}
