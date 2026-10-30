import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, call, type FakeD1 } from './harness';
import { ensureFinanceSchema, getTableColumns, buildAdaptiveInsert } from '../schema';
import { adjustmentInsertStatement, type NewAdjustment } from '../ledger';
import { POST as calculate } from '../../../pages/api/payroll/calculate';
import { POST as save } from '../../../pages/api/payroll/save';
import { GET as list } from '../../../pages/api/payroll/list';
import { GET as get } from '../../../pages/api/payroll/get';
import { POST as approve } from '../../../pages/api/payroll/approve';
import { POST as reopen } from '../../../pages/api/payroll/reopen';
import { POST as pay } from '../../../pages/api/payroll/pay';
import { POST as cancel } from '../../../pages/api/payroll/cancel';

const PERIOD = '2026-10';
const BRANCH = 'branch_1010';

type Ctx = Awaited<ReturnType<typeof setup>>;

function adjustment(overrides: Partial<NewAdjustment> = {}): NewAdjustment {
  return {
    branchId: BRANCH,
    employeeId: 'emp_1',
    employeeName: 'أحمد علي',
    period: PERIOD,
    category: 'overtime',
    amount: 1000,
    quantity: 20,
    rate: 50,
    description: 'ساعات إضافية شهر أكتوبر',
    sourceType: 'manual',
    createdBy: 'u_sup',
    createdByName: 'محمد أحمد',
    ...overrides,
  };
}

/** Inserts a ledger entry the way the adjustments API does; returns rows changed (0 when the period is locked). */
async function addAdjustment(DB: FakeD1, overrides: Partial<NewAdjustment> = {}): Promise<number> {
  const db = DB as any;
  await ensureFinanceSchema(db);
  const [result] = await db.batch([adjustmentInsertStatement(db, adjustment(overrides))]);
  return Number(result.meta.changes);
}

/** Inserts a row into a legacy table whatever its shape (only the columns it has). */
async function insertLegacy(DB: FakeD1, table: string, values: Record<string, unknown>) {
  const columns = await getTableColumns(DB as any, table);
  const { sql, params } = buildAdaptiveInsert(table, columns, values);
  DB.raw.prepare(sql).run(...(params as any[]));
}

const as = (ctx: Ctx, user: keyof Ctx['data']['users']) => ctx.data.users[user].token;

async function saveDraft(ctx: Ctx, user: keyof Ctx['data']['users'] = 'supervisor') {
  const res = await call(save, ctx.env, { token: as(ctx, user), body: { branchId: BRANCH, period: PERIOD } });
  assert.ok(res.status === 201 || res.status === 200, JSON.stringify(res.body));
  return res.body.run as { id: string; status: string; fingerprint: string };
}

async function approvedRun(ctx: Ctx) {
  const run = await saveDraft(ctx);
  const res = await call(approve, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return run;
}

for (const variant of ['008', 'legacy'] as const) {
  test(`calculate shows a 1000 overtime entry in items, totals and active columns (${variant})`, async () => {
    const ctx = await setup(variant);
    assert.equal(await addAdjustment(ctx.DB), 1);

    const res = await call(calculate, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, period: PERIOD } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const body = res.body;
    assert.equal(body.employeeCount, 2);
    assert.equal(body.periodLabelAr, 'أكتوبر 2026');
    assert.equal(body.branchName, 'فرع لبن');
    const emp1 = body.items.find((i: any) => i.employeeId === 'emp_1');
    assert.equal(emp1.overtime, 1000);
    assert.equal(emp1.fixedSalary, 3500);
    assert.equal(emp1.totalEarnings, 4500);
    assert.equal(emp1.netSalary, 4500);
    assert.equal(emp1.lines.length, 1);
    assert.equal(emp1.lines[0].quantity, 20);
    assert.equal(emp1.lines[0].rate, 50);
    assert.equal(emp1.dailyRate, 116.67);
    assert.ok(emp1.overtimeHourlyRate > 0);
    assert.equal(body.totals.overtime, 1000);
    assert.equal(body.totals.netSalary, 4500 + 2000);
    assert.ok(body.activeColumns.includes('overtime'));
    assert.equal(body.run, null);
    assert.equal(body.locked, false);
    assert.equal(body.stale, false);
  });

  test(`approved advances, legacy advances and approved bonus records flow into net salary (${variant})`, async () => {
    const ctx = await setup(variant);
    // Advance request approved → ledger entry (installment) for emp_2.
    await addAdjustment(ctx.DB, {
      employeeId: 'emp_2', employeeName: 'محمد إسماعيل', category: 'advance', amount: 500,
      quantity: null, rate: null, description: 'سلفة', sourceType: 'request', sourceId: 'req_1',
      installmentNo: 1, installmentCount: 2,
    });
    // Old advances page row for emp_1 (both table shapes).
    await insertLegacy(ctx.DB, 'advances', {
      id: 'adv_old', employee_id: 'emp_1', employee_name: 'أحمد علي', branch_id: BRANCH, amount: 200,
      month: '10', year: 2026, reason: 'سلفة قديمة', description: 'سلفة قديمة', request_date: '2026-10-01', status: 'approved',
    });
    // Approved weekly bonus (35) and a draft one that must be ignored.
    const bonus = (id: string, approved: boolean, amount: number, week: number) => ({
      id, branch_id: BRANCH, month: 'أكتوبر', year: 2026, week_number: week, start_date: '2026-10-01', end_date: '2026-10-07',
      employee_bonuses: JSON.stringify([{ employeeId: 'emp_1', employeeName: 'أحمد علي', totalRevenue: 12000, bonusAmount: amount }]),
      total_paid: amount, total_bonus_paid: amount,
      status: approved ? 'approved' : 'draft', approved_by: approved ? 'u_admin' : null,
    });
    await insertLegacy(ctx.DB, 'bonus_records', bonus('bonus_ok', true, 35, 1));
    await insertLegacy(ctx.DB, 'bonus_records', bonus('bonus_draft', false, 99, 2));

    const res = await call(calculate, ctx.env, { token: as(ctx, 'admin'), body: { branchId: BRANCH, period: PERIOD } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const emp1 = res.body.items.find((i: any) => i.employeeId === 'emp_1');
    const emp2 = res.body.items.find((i: any) => i.employeeId === 'emp_2');
    assert.equal(emp2.advances, 500);
    assert.equal(emp2.netSalary, 1500);
    assert.ok(emp2.lines[0].description.includes('قسط 1/2'));
    assert.equal(emp1.bonus, 35);
    assert.equal(emp1.advances, 200);
    assert.equal(emp1.netSalary, 3500 + 35 - 200);
    assert.deepEqual([...res.body.activeColumns].sort(), ['advances', 'bonus']);
    assert.equal(res.body.totals.totalDeductions, 700);
  });

  test(`full flow: save → approve → pay with vouchers (${variant})`, async () => {
    const ctx = await setup(variant);
    await addAdjustment(ctx.DB);
    const run = await approvedRun(ctx);
    const res = await call(pay, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id, paymentMethod: 'cash' } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.run.status, 'paid');
    assert.equal(res.body.created.length, 2);
    const vouchers = ctx.DB.query<any>(`SELECT * FROM financial_vouchers ORDER BY sequence_no`);
    assert.deepEqual(vouchers.map(v => v.voucher_number), ['PV-2026-00001', 'PV-2026-00002']);
    assert.ok(vouchers.every(v => v.status === 'approved' && v.payment_method === 'cash' && v.cash_amount === v.amount));
  });
}

test('save creates a draft and a second save refreshes the same draft', async () => {
  const ctx = await setup('008');
  const first = await call(save, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, period: PERIOD } });
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.equal(first.body.created, true);
  const run = first.body.run;
  assert.equal(run.status, 'draft');
  assert.equal(run.createdByName, 'محمد أحمد');
  assert.equal(run.branchName, 'فرع لبن');
  assert.equal(run.totalNet, 5500);
  assert.equal(ctx.DB.query('SELECT * FROM payroll_run_items WHERE run_id = ?', run.id).length, 2);

  await addAdjustment(ctx.DB); // overtime 1000
  const calc = await call(calculate, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, period: PERIOD } });
  assert.equal(calc.body.run.id, run.id);
  assert.equal(calc.body.stale, true);

  const second = await call(save, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, period: PERIOD } });
  assert.equal(second.status, 200, JSON.stringify(second.body));
  assert.equal(second.body.created, false);
  assert.equal(second.body.run.id, run.id);
  assert.equal(second.body.run.totalNet, 6500);
  assert.deepEqual(second.body.run.activeColumns, ['overtime']);
  assert.equal(ctx.DB.query('SELECT * FROM payroll_runs').length, 1);
  const items = ctx.DB.query<any>('SELECT * FROM payroll_run_items WHERE run_id = ? ORDER BY sort_order', run.id);
  assert.equal(items.length, 2);
  const emp1 = items.find(i => i.employee_id === 'emp_1');
  assert.equal(emp1.overtime, 1000);
  assert.equal(emp1.national_id, '1001');
  assert.equal(JSON.parse(emp1.lines_json)[0].category, 'overtime');

  const after = await call(calculate, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, period: PERIOD } });
  assert.equal(after.body.stale, false);

  // Admins were told a draft awaits approval (once, not on refresh).
  const notes = ctx.DB.query<any>(`SELECT * FROM user_notifications WHERE type = 'payroll_draft'`).map(n => n.user_id);
  assert.ok(notes.includes('u_admin'));
  assert.ok(!notes.includes('u_sup') && !notes.includes('u_partner'));
  assert.equal(new Set(notes).size, notes.length, 'one notification per admin');

  // Audit trail
  const audit = ctx.DB.query<any>(`SELECT action FROM audit_logs WHERE entity_type = 'payroll_run' ORDER BY created_at, rowid`);
  assert.deepEqual(audit.map(a => a.action), ['create', 'update']);
});

test('save refuses an empty sheet, bad input and a locked period', async () => {
  const ctx = await setup('008');
  const bad = await call(save, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, period: '2026-13' } });
  assert.equal(bad.status, 400);

  ctx.DB.raw.exec(`UPDATE employees SET is_active = 0 WHERE branch_id = '${BRANCH}'`);
  const empty = await call(save, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, period: PERIOD } });
  assert.equal(empty.status, 422);
  assert.match(empty.body.error, /فارغ/);
  ctx.DB.raw.exec(`UPDATE employees SET is_active = 1`);

  const run = await approvedRun(ctx);
  const locked = await call(save, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, period: PERIOD } });
  assert.equal(locked.status, 409);
  assert.equal(locked.body.run.id, run.id);
});

test('legacy {month, year} input is accepted', async () => {
  const ctx = await setup('008');
  const res = await call(calculate, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, month: 'أكتوبر', year: 2026 } });
  assert.equal(res.status, 200);
  assert.equal(res.body.period, PERIOD);
});

test('branch scoping: a supervisor of another branch gets 403 everywhere', async () => {
  const ctx = await setup('008');
  const run = await saveDraft(ctx);
  const token = as(ctx, 'otherSupervisor');
  const body = { branchId: BRANCH, period: PERIOD };
  assert.equal((await call(calculate, ctx.env, { token, body })).status, 403);
  assert.equal((await call(save, ctx.env, { token, body })).status, 403);
  assert.equal((await call(list, ctx.env, { token, query: { branchId: BRANCH } })).status, 403);
  assert.equal((await call(get, ctx.env, { token, query: { id: run.id } })).status, 403);
  assert.equal((await call(pay, ctx.env, { token, body: { id: run.id } })).status, 403);
  assert.equal((await call(cancel, ctx.env, { token, body: { id: run.id, reason: 'خطأ في المسير' } })).status, 403);
  // Their own branch works and never leaks branch_1010 rows.
  const own = await call(list, ctx.env, { token, query: {} });
  assert.equal(own.status, 200);
  assert.equal(own.body.branchId, 'branch_2020');
  assert.equal(own.body.runs.length, 0);
});

test('partners and employees cannot see payroll', async () => {
  const ctx = await setup('008');
  const run = await saveDraft(ctx);
  for (const user of ['partner', 'employee'] as const) {
    const token = as(ctx, user);
    assert.equal((await call(calculate, ctx.env, { token, body: { branchId: BRANCH, period: PERIOD } })).status, 403);
    assert.equal((await call(list, ctx.env, { token, query: { branchId: BRANCH } })).status, 403);
    assert.equal((await call(get, ctx.env, { token, query: { id: run.id } })).status, 403);
    assert.equal((await call(save, ctx.env, { token, body: { branchId: BRANCH, period: PERIOD } })).status, 403);
  }
  assert.equal((await call(calculate, ctx.env, { body: { branchId: BRANCH, period: PERIOD } })).status, 401);
});

test('approve: supervisor gets 403; admin approves and locks the ledger', async () => {
  const ctx = await setup('008');
  await addAdjustment(ctx.DB);
  const run = await saveDraft(ctx);

  const denied = await call(approve, ctx.env, { token: as(ctx, 'supervisor'), body: { id: run.id } });
  assert.equal(denied.status, 403);

  const res = await call(approve, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.run.status, 'approved');
  assert.equal(res.body.run.approvedByName, 'المدير العام');
  assert.ok(res.body.run.approvedAt);
  assert.equal(res.body.lockedAdjustments, 1);
  assert.equal(ctx.DB.one<any>('SELECT payroll_run_id FROM payroll_adjustments')!.payroll_run_id, run.id);

  // The period is closed: new ledger entries are silently refused by the guarded insert.
  assert.equal(await addAdjustment(ctx.DB, { amount: 5 }), 0);
  assert.equal(ctx.DB.query('SELECT * FROM payroll_adjustments').length, 1);

  const calc = await call(calculate, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, period: PERIOD } });
  assert.equal(calc.body.locked, true);
  assert.equal(calc.body.run.status, 'approved');

  // Creator (supervisor) is notified.
  const notes = ctx.DB.query<any>(`SELECT user_id FROM user_notifications WHERE type = 'payroll_approved'`);
  assert.deepEqual(notes.map(n => n.user_id), ['u_sup']);

  const again = await call(approve, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
  assert.equal(again.status, 409);
});

test('approve refuses a stale draft until it is refreshed', async () => {
  const ctx = await setup('008');
  const run = await saveDraft(ctx);
  await addAdjustment(ctx.DB, { category: 'violation', amount: 100, quantity: null, rate: null, description: 'مخالفة' });

  const stale = await call(approve, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.stale, true);
  assert.equal(stale.body.error, 'تغيرت بيانات الرواتب منذ إعداد المسودة — حدّث المسودة ثم اعتمد');
  assert.equal(ctx.DB.one<any>('SELECT status FROM payroll_runs')!.status, 'draft');

  await saveDraft(ctx);
  const ok = await call(approve, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const item = ctx.DB.one<any>(`SELECT * FROM payroll_run_items WHERE employee_id = 'emp_1'`)!;
  assert.equal(item.penalties, 100);
  assert.equal(item.net_salary, 3400);
});

test('approve fails if a ledger entry lands between the check and the approval', async () => {
  const ctx = await setup('008');
  const run = await saveDraft(ctx);
  const original = ctx.DB.batch.bind(ctx.DB);
  (ctx.DB as any).batch = async (statements: any[]) => {
    (ctx.DB as any).batch = original;
    await original([adjustmentInsertStatement(ctx.DB as any, adjustment({ amount: 10 }))]);
    return original(statements);
  };
  const res = await call(approve, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
  assert.equal(res.status, 409);
  assert.equal(res.body.stale, true);
  assert.equal(ctx.DB.one<any>('SELECT status FROM payroll_runs')!.status, 'draft');
  assert.equal(ctx.DB.one<any>('SELECT payroll_run_id FROM payroll_adjustments')!.payroll_run_id, null);
});

test('approve refuses negative net salaries', async () => {
  const ctx = await setup('008');
  await addAdjustment(ctx.DB, { employeeId: 'emp_2', employeeName: 'محمد إسماعيل', category: 'advance', amount: 2500, quantity: null, rate: null });
  const run = await saveDraft(ctx);
  const res = await call(approve, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
  assert.equal(res.status, 422);
  assert.deepEqual(res.body.employees, ['emp_2']);
});

test('save races: a concurrent open run turns into 409, not a 500', async () => {
  const ctx = await setup('008');
  await ensureFinanceSchema(ctx.DB as any);
  const original = ctx.DB.batch.bind(ctx.DB);
  (ctx.DB as any).batch = async (statements: any[]) => {
    (ctx.DB as any).batch = original;
    ctx.DB.raw.exec(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('run_other', '${BRANCH}', '${PERIOD}', 'draft')`);
    return original(statements);
  };
  const res = await call(save, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, period: PERIOD } });
  assert.equal(res.status, 409);
  assert.equal(ctx.DB.query('SELECT * FROM payroll_runs').length, 1);
  assert.equal(ctx.DB.query('SELECT * FROM payroll_run_items').length, 0);
});

test('reopen: admin only, approved → draft, unlocks the ledger; refused when paid', async () => {
  const ctx = await setup('008');
  await addAdjustment(ctx.DB);
  const run = await approvedRun(ctx);

  assert.equal((await call(reopen, ctx.env, { token: as(ctx, 'supervisor'), body: { id: run.id } })).status, 403);
  const res = await call(reopen, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id, reason: 'تصحيح' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.run.status, 'draft');
  assert.equal(res.body.run.approvedBy, null);
  assert.equal(res.body.unlockedAdjustments, 1);
  assert.equal(ctx.DB.one<any>('SELECT payroll_run_id FROM payroll_adjustments')!.payroll_run_id, null);
  assert.equal(await addAdjustment(ctx.DB, { amount: 5 }), 1, 'period is open again');

  assert.equal((await call(reopen, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } })).status, 409, 'drafts cannot be reopened');

  await saveDraft(ctx);
  await call(approve, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
  await call(pay, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
  const paid = await call(reopen, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
  assert.equal(paid.status, 409);
});

test('pay: requires approval, issues numbered payment vouchers and is idempotent', async () => {
  const ctx = await setup('008');
  await addAdjustment(ctx.DB);
  const draft = await saveDraft(ctx);
  const early = await call(pay, ctx.env, { token: as(ctx, 'supervisor'), body: { id: draft.id } });
  assert.equal(early.status, 409);

  await call(approve, ctx.env, { token: as(ctx, 'admin'), body: { id: draft.id } });
  assert.equal((await call(pay, ctx.env, { token: as(ctx, 'supervisor'), body: { id: draft.id, paymentMethod: 'cheque' } })).status, 400);

  const res = await call(pay, ctx.env, { token: as(ctx, 'supervisor'), body: { id: draft.id } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.run.status, 'paid');
  assert.equal(res.body.run.paidByName, 'محمد أحمد');
  assert.equal(res.body.created.length, 2);
  assert.deepEqual(res.body.created.map((v: any) => v.voucherNumber).sort(), ['PV-2026-00001', 'PV-2026-00002']);

  const v1 = ctx.DB.one<any>(`SELECT * FROM financial_vouchers WHERE employee_id = 'emp_1'`)!;
  assert.equal(v1.voucher_type, 'payment');
  assert.equal(v1.party_type, 'employee');
  assert.equal(v1.party_name, 'أحمد علي');
  assert.equal(v1.party_id_number, '1001');
  assert.equal(v1.amount, 4500);
  assert.equal(v1.purpose, 'راتب شهر أكتوبر 2026');
  assert.equal(v1.source_type, 'payroll');
  assert.equal(v1.source_id, `${draft.id}:emp_1`);
  assert.equal(v1.payment_method, 'bank_transfer');
  assert.equal(v1.bank_amount, 4500);
  assert.equal(v1.status, 'pending', 'a supervisor cannot approve vouchers');
  assert.equal(v1.approved_by, null);
  assert.equal(v1.branch_name, 'فرع لبن');
  // The manager is asked to approve the pending vouchers.
  const pending = ctx.DB.query<any>(`SELECT user_id FROM user_notifications WHERE type = 'payroll_vouchers_pending'`).map(n => n.user_id);
  assert.ok(pending.includes('u_admin') && !pending.includes('u_sup'));

  const again = await call(pay, ctx.env, { token: as(ctx, 'supervisor'), body: { id: draft.id } });
  assert.equal(again.status, 200);
  assert.equal(again.body.created.length, 0);
  assert.equal(again.body.vouchers.length, 2);
  assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 2);
  assert.equal(ctx.DB.one<any>(`SELECT last_number FROM voucher_sequences WHERE scope = 'payment:2026'`)!.last_number, 2);

  // A cancelled voucher is re-issued (with a new number) on the next call.
  ctx.DB.raw.exec(`UPDATE financial_vouchers SET status = 'cancelled' WHERE employee_id = 'emp_2'`);
  const regen = await call(pay, ctx.env, { token: as(ctx, 'admin'), body: { id: draft.id } });
  assert.equal(regen.body.created.length, 1);
  assert.equal(regen.body.created[0].voucherNumber, 'PV-2026-00003');
  assert.equal(regen.body.created[0].status, 'approved');

  const got = await call(get, ctx.env, { token: as(ctx, 'supervisor'), query: { id: draft.id } });
  assert.equal(got.body.run.voucherCount, 2);
});

test('pay without vouchers, then issue them later', async () => {
  const ctx = await setup('008');
  const run = await approvedRun(ctx);
  const res = await call(pay, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id, generateVouchers: false } });
  assert.equal(res.status, 200);
  assert.equal(res.body.run.status, 'paid');
  assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 0);
  const later = await call(pay, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id, generateVouchers: true, paymentMethod: 'cash' } });
  assert.equal(later.body.created.length, 2);
});

test('pay skips employees with zero net', async () => {
  const ctx = await setup('008');
  await addAdjustment(ctx.DB, { employeeId: 'emp_2', employeeName: 'محمد إسماعيل', category: 'unpaid_leave', amount: 2000, quantity: 30, rate: 66.67 });
  const run = await approvedRun(ctx);
  const res = await call(pay, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
  assert.equal(res.body.created.length, 1);
  assert.deepEqual(res.body.skipped.map((s: any) => s.employeeId), ['emp_2']);
});

test('cancel rules: reason required, drafts by supervisor, approved by admin only, paid never', async () => {
  const ctx = await setup('008');
  const draft = await saveDraft(ctx);
  assert.equal((await call(cancel, ctx.env, { token: as(ctx, 'supervisor'), body: { id: draft.id } })).status, 400);
  const res = await call(cancel, ctx.env, { token: as(ctx, 'supervisor'), body: { id: draft.id, reason: 'إعادة الإعداد' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.run.status, 'cancelled');
  assert.equal(res.body.run.cancelReason, 'إعادة الإعداد');
  assert.equal((await call(cancel, ctx.env, { token: as(ctx, 'supervisor'), body: { id: draft.id, reason: 'مرة أخرى' } })).status, 409);

  // A new draft can be created after cancelling.
  await addAdjustment(ctx.DB);
  const second = await approvedRun(ctx);
  assert.notEqual(second.id, draft.id);
  assert.equal((await call(cancel, ctx.env, { token: as(ctx, 'supervisor'), body: { id: second.id, reason: 'خطأ' } })).status, 403);
  const byAdmin = await call(cancel, ctx.env, { token: as(ctx, 'admin'), body: { id: second.id, reason: 'خطأ في الاعتماد' } });
  assert.equal(byAdmin.status, 200);
  assert.equal(byAdmin.body.unlockedAdjustments, 1);
  assert.equal(ctx.DB.one<any>('SELECT payroll_run_id FROM payroll_adjustments')!.payroll_run_id, null);
  assert.equal(await addAdjustment(ctx.DB, { amount: 7 }), 1, 'period open again');

  const third = await approvedRun(ctx);
  await call(pay, ctx.env, { token: as(ctx, 'admin'), body: { id: third.id } });
  assert.equal((await call(cancel, ctx.env, { token: as(ctx, 'admin'), body: { id: third.id, reason: 'خطأ' } })).status, 409);
});

test('list and get return runs with totals, parsed lines and vouchers', async () => {
  const ctx = await setup('008');
  await addAdjustment(ctx.DB);
  const october = await approvedRun(ctx);
  await call(pay, ctx.env, { token: as(ctx, 'admin'), body: { id: october.id } });
  const nov = await call(save, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, period: '2026-11' } });
  assert.equal(nov.status, 201);
  await call(save, ctx.env, { token: as(ctx, 'admin'), body: { branchId: BRANCH, period: '2025-12' } });

  const res = await call(list, ctx.env, { token: as(ctx, 'supervisor'), query: { branchId: BRANCH, year: '2026' } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.runs.map((r: any) => r.period), ['2026-11', '2026-10']);
  const oct = res.body.runs[1];
  assert.equal(oct.status, 'paid');
  assert.equal(oct.voucherCount, 2);
  assert.equal(oct.totals.overtime, 1000);
  assert.equal(oct.statusLabel, 'مدفوع');
  assert.ok(oct.reference.startsWith('PAY-202610-'));
  const all = await call(list, ctx.env, { token: as(ctx, 'admin'), query: { branchId: BRANCH } });
  assert.equal(all.body.runs.length, 3);
  assert.equal((await call(list, ctx.env, { token: as(ctx, 'admin'), query: { branchId: BRANCH, year: '26' } })).status, 400);

  const got = await call(get, ctx.env, { token: as(ctx, 'admin'), query: { id: october.id } });
  assert.equal(got.status, 200);
  assert.equal(got.body.items.length, 2);
  const emp1 = got.body.items.find((i: any) => i.employeeId === 'emp_1');
  assert.equal(emp1.overtime, 1000);
  assert.equal(emp1.lines[0].labelAr, 'ساعات إضافية');
  assert.deepEqual(got.body.activeColumns, ['overtime']);
  assert.equal(got.body.totals.netSalary, 6500);
  assert.equal(got.body.vouchers.length, 2);
  assert.equal((await call(get, ctx.env, { token: as(ctx, 'admin'), query: { id: 'nope' } })).status, 404);
  assert.equal((await call(get, ctx.env, { token: as(ctx, 'admin'), query: {} })).status, 400);
});

test('calculate lists entries of employees who are not on the sheet', async () => {
  const ctx = await setup('008');
  await addAdjustment(ctx.DB, { employeeId: 'emp_2', employeeName: 'محمد إسماعيل', amount: 300 });
  ctx.DB.raw.exec(`UPDATE employees SET is_active = 0 WHERE id = 'emp_2'`);
  const res = await call(calculate, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, period: PERIOD } });
  assert.equal(res.body.employeeCount, 1);
  assert.equal(res.body.orphans.length, 1);
  assert.equal(res.body.orphans[0].employeeName, 'محمد إسماعيل');
  assert.equal(res.body.orphans[0].reason, 'inactive');
  assert.equal(res.body.totals.overtime, 0);
});

test('quick-add contract: /api/adjustments/create (hours × rate) feeds the sheet and is refused once approved', async () => {
  const ctx = await setup('008');
  const { POST: createAdjustment } = await import('../../../pages/api/adjustments/create');
  const token = as(ctx, 'supervisor');
  const created = await call(createAdjustment, ctx.env, {
    token,
    body: { branchId: BRANCH, employeeId: 'emp_2', period: PERIOD, category: 'overtime', quantity: 40, rate: 25, description: 'عمل إضافي' },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const calc = await call(calculate, ctx.env, { token, body: { branchId: BRANCH, period: PERIOD } });
  const emp2 = calc.body.items.find((i: any) => i.employeeId === 'emp_2');
  assert.equal(emp2.overtime, 1000);
  assert.equal(emp2.lines[0].quantity, 40);
  assert.ok(calc.body.activeColumns.includes('overtime'));

  await approvedRun(ctx);
  const late = await call(createAdjustment, ctx.env, {
    token,
    body: { branchId: BRANCH, employeeId: 'emp_2', period: PERIOD, category: 'overtime', amount: 50 },
  });
  assert.equal(late.status, 409);
  const item = ctx.DB.one<any>(`SELECT overtime FROM payroll_run_items WHERE employee_id = 'emp_2'`)!;
  assert.equal(item.overtime, 1000);
});

// ---------------------------------------------------------------------------
// Review fixes: bonus race guard, pay race, D1 errors
// ---------------------------------------------------------------------------

function bonusRow(id: string, week: number, approved: boolean, amount = 35) {
  return {
    id, branch_id: BRANCH, month: '10', year: 2026, week_number: week, start_date: '2026-10-01', end_date: '2026-10-07',
    employee_bonuses: JSON.stringify([{ employeeId: 'emp_1', employeeName: 'أحمد علي', totalRevenue: 12000, bonusAmount: amount }]),
    total_paid: amount, total_bonus_paid: amount,
    status: approved ? 'approved' : 'pending', approved_by: approved ? 'u_admin' : null,
    approved_at: approved ? '2026-10-08 10:00:00' : null,
  };
}

/** Runs `between` right before the next db.batch (i.e. after the handler's checks, before its write). */
function beforeNextBatch(ctx: Ctx, between: () => Promise<void> | void) {
  const original = ctx.DB.batch.bind(ctx.DB);
  (ctx.DB as any).batch = async (statements: any[]) => {
    (ctx.DB as any).batch = original;
    await between();
    return original(statements);
  };
}

const auditOperations = (ctx: Ctx) =>
  ctx.DB.query<any>(`SELECT details FROM audit_logs WHERE entity_type = 'payroll_run' ORDER BY rowid`).map(a => JSON.parse(a.details));

for (const variant of ['008', 'legacy'] as const) {
  test(`approve fails if a weekly bonus is approved between the check and the approval (${variant})`, async () => {
    const ctx = await setup(variant);
    await addAdjustment(ctx.DB);
    const run = await saveDraft(ctx);
    beforeNextBatch(ctx, () => insertLegacy(ctx.DB, 'bonus_records', bonusRow('b_mid', 1, true)));

    const res = await call(approve, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
    assert.equal(res.status, 409, JSON.stringify(res.body));
    assert.equal(res.body.stale, true);
    assert.equal(ctx.DB.one<any>('SELECT status FROM payroll_runs')!.status, 'draft');
    assert.equal(ctx.DB.one<any>('SELECT payroll_run_id FROM payroll_adjustments')!.payroll_run_id, null, 'ledger stays unlocked');

    // Refreshing the draft picks the bonus up; approval then goes through.
    await saveDraft(ctx);
    const ok = await call(approve, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ctx.DB.one<any>(`SELECT bonus FROM payroll_run_items WHERE employee_id = 'emp_1'`)!.bonus, 35);
  });

  test(`approve is not blocked by a bonus saved as pending mid-approval, nor by approved bonuses already on the draft (${variant})`, async () => {
    const ctx = await setup(variant);
    await insertLegacy(ctx.DB, 'bonus_records', bonusRow('b_before', 1, true));
    const run = await saveDraft(ctx);
    beforeNextBatch(ctx, () => insertLegacy(ctx.DB, 'bonus_records', bonusRow('b_pending', 2, false, 50)));
    const res = await call(approve, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(ctx.DB.one<any>(`SELECT bonus FROM payroll_run_items WHERE employee_id = 'emp_1'`)!.bonus, 35);
  });
}

test('pay race: another request pays the run mid-pay → the vouchers are issued, audited and notified (200)', async () => {
  const ctx = await setup('008');
  const run = await approvedRun(ctx);
  beforeNextBatch(ctx, () => {
    // The other tab's "pay without vouchers" commits first.
    ctx.DB.raw
      .prepare(`UPDATE payroll_runs SET status = 'paid', paid_by = 'u_admin', paid_by_name = 'المدير العام', paid_at = datetime('now') WHERE id = ?`)
      .run(run.id);
  });
  const res = await call(pay, ctx.env, { token: as(ctx, 'supervisor'), body: { id: run.id, generateVouchers: true } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.run.status, 'paid');
  assert.equal(res.body.run.paidByName, 'المدير العام', 'the other request paid it');
  assert.equal(res.body.created.length, 2);
  assert.equal(res.body.run.voucherCount, 2);
  assert.match(res.body.message, /سند صرف ناقص/);
  assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 2);

  const last = auditOperations(ctx).at(-1);
  assert.equal(last.operation, 'generate_missing_vouchers');
  assert.equal(last.vouchers.length, 2);
  const pending = ctx.DB.query<any>(`SELECT user_id FROM user_notifications WHERE type = 'payroll_vouchers_pending'`).map(n => n.user_id);
  assert.ok(pending.includes('u_admin'));

  // Idempotent afterwards.
  const again = await call(pay, ctx.env, { token: as(ctx, 'supervisor'), body: { id: run.id } });
  assert.equal(again.status, 200);
  assert.equal(again.body.created.length, 0);
  assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 2);
});

test('pay race without vouchers: the run was paid meanwhile → 200 "already paid", nothing issued', async () => {
  const ctx = await setup('008');
  const run = await approvedRun(ctx);
  const auditsBefore = auditOperations(ctx).length;
  beforeNextBatch(ctx, () => {
    ctx.DB.raw.prepare(`UPDATE payroll_runs SET status = 'paid', paid_by = 'u_admin' WHERE id = ?`).run(run.id);
  });
  const res = await call(pay, ctx.env, { token: as(ctx, 'supervisor'), body: { id: run.id, generateVouchers: false } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.run.status, 'paid');
  assert.equal(res.body.created.length, 0);
  assert.equal(res.body.message, 'المسير مصروف مسبقاً');
  assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 0);
  assert.equal(auditOperations(ctx).length, auditsBefore);
});

test('pay race: the run was cancelled meanwhile → 409 and no vouchers', async () => {
  const ctx = await setup('008');
  const run = await approvedRun(ctx);
  beforeNextBatch(ctx, () => {
    ctx.DB.raw.prepare(`UPDATE payroll_runs SET status = 'cancelled' WHERE id = ?`).run(run.id);
  });
  const res = await call(pay, ctx.env, { token: as(ctx, 'admin'), body: { id: run.id } });
  assert.equal(res.status, 409);
  assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 0);
});

test('pay without vouchers, then with vouchers on the paid run: issued, audited, 200, idempotent', async () => {
  const ctx = await setup('008');
  const run = await approvedRun(ctx);
  const first = await call(pay, ctx.env, { token: as(ctx, 'supervisor'), body: { id: run.id, generateVouchers: false } });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.run.status, 'paid');
  assert.equal(first.body.created.length, 0);

  const second = await call(pay, ctx.env, { token: as(ctx, 'supervisor'), body: { id: run.id, generateVouchers: true } });
  assert.equal(second.status, 200, JSON.stringify(second.body));
  assert.equal(second.body.created.length, 2);
  assert.equal(second.body.run.paidByName, 'محمد أحمد', 'paid stamp unchanged');
  const ops = auditOperations(ctx).map(a => a.operation);
  assert.deepEqual(ops.slice(-2), ['pay', 'generate_missing_vouchers']);
  assert.equal(auditOperations(ctx).at(-1).vouchers.length, 2);
  assert.ok(ctx.DB.query<any>(`SELECT user_id FROM user_notifications WHERE type = 'payroll_vouchers_pending'`).some(n => n.user_id === 'u_admin'));

  const third = await call(pay, ctx.env, { token: as(ctx, 'supervisor'), body: { id: run.id, generateVouchers: true } });
  assert.equal(third.status, 200);
  assert.equal(third.body.created.length, 0);
  assert.equal(third.body.message, 'جميع سندات الصرف صادرة مسبقاً');
  assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 2);
  const noVouchers = await call(pay, ctx.env, { token: as(ctx, 'supervisor'), body: { id: run.id, generateVouchers: false } });
  assert.equal(noVouchers.status, 200);
  assert.equal(noVouchers.body.vouchers.length, 2);
});

test('D1 errors while loading the run return a JSON 500, not an exception', async () => {
  const ctx = await setup('008');
  const draft = await saveDraft(ctx);
  const paid = await call(save, ctx.env, { token: as(ctx, 'supervisor'), body: { branchId: BRANCH, period: '2026-09' } });
  await call(approve, ctx.env, { token: as(ctx, 'admin'), body: { id: paid.body.run.id } });
  await call(pay, ctx.env, { token: as(ctx, 'admin'), body: { id: paid.body.run.id } });

  const original = ctx.DB.prepare.bind(ctx.DB);
  const failing = (pattern: RegExp) => {
    (ctx.DB as any).prepare = (sql: string) => {
      if (!pattern.test(sql)) return original(sql);
      const broken: any = {
        bind: () => broken,
        first: async () => { throw new Error('D1_ERROR: network connection lost'); },
        all: async () => { throw new Error('D1_ERROR: network connection lost'); },
        run: async () => { throw new Error('D1_ERROR: network connection lost'); },
      };
      return broken;
    };
  };
  const quiet = console.error;
  console.error = () => {};
  try {
    failing(/^SELECT \* FROM payroll_runs WHERE id = \?$/);
    const cases: Array<[string, any, any]> = [
      ['approve', approve, { token: as(ctx, 'admin'), body: { id: draft.id } }],
      ['reopen', reopen, { token: as(ctx, 'admin'), body: { id: draft.id } }],
      ['pay', pay, { token: as(ctx, 'admin'), body: { id: draft.id } }],
      ['cancel', cancel, { token: as(ctx, 'admin'), body: { id: draft.id, reason: 'خطأ في المسير' } }],
      ['get', get, { token: as(ctx, 'admin'), query: { id: draft.id } }],
    ];
    for (const [name, handler, options] of cases) {
      const res = await call(handler, ctx.env, options);
      assert.equal(res.status, 500, `${name}: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.success, false, name);
      assert.ok(typeof res.body.error === 'string' && res.body.error.length > 0, name);
    }

    // Already-paid run without vouchers: the voucher lookup fails.
    (ctx.DB as any).prepare = original;
    failing(/FROM financial_vouchers WHERE/);
    const res = await call(pay, ctx.env, { token: as(ctx, 'admin'), body: { id: paid.body.run.id, generateVouchers: false } });
    assert.equal(res.status, 500, JSON.stringify(res.body));
    assert.equal(res.body.success, false);
  } finally {
    (ctx.DB as any).prepare = original;
    console.error = quiet;
  }
  assert.equal(ctx.DB.one<any>('SELECT status FROM payroll_runs WHERE id = ?', draft.id)!.status, 'draft');
});
