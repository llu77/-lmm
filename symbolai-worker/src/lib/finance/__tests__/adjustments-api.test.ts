import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, call } from './harness';
import { computeBranchPayroll } from '../payroll-data';
import { POST as createAdjustment, AMOUNT_MISMATCH_WARNING } from '../../../pages/api/adjustments/create';
import { GET as listAdjustments } from '../../../pages/api/adjustments/list';
import { POST as cancelAdjustment } from '../../../pages/api/adjustments/cancel';
import { POST as createAdvance } from '../../../pages/api/advances/create';
import { GET as listAdvances } from '../../../pages/api/advances/list';
import { POST as createDeduction, mapDeductionType } from '../../../pages/api/deductions/create';
import { GET as listDeductions } from '../../../pages/api/deductions/list';

const PERIOD = '2026-10';

for (const variant of ['008', 'legacy'] as const) {
  test(`overtime via quantity × rate flows into payroll; cancel removes it (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    const sup = data.users.supervisor.token;

    const created = await call(createAdjustment, env, {
      token: sup,
      body: { employeeId: 'emp_1', period: PERIOD, category: 'overtime', quantity: 20, rate: 50, description: 'ساعات إضافية أكتوبر' },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const adj = created.body.adjustment;
    assert.equal(adj.amount, 1000);
    assert.equal(adj.quantity, 20);
    assert.equal(adj.rate, 50);
    assert.equal(adj.kind, 'earning');
    assert.equal(adj.categoryLabel, 'ساعات إضافية');
    assert.equal(adj.branchId, 'branch_1010');
    assert.equal(adj.employeeName, 'أحمد علي');
    assert.equal(adj.createdByName, 'محمد أحمد');
    assert.deepEqual(created.body.warnings, []);

    let payroll = await computeBranchPayroll(DB as any, 'branch_1010', PERIOD);
    let item = payroll.items.find(i => i.employeeId === 'emp_1')!;
    assert.equal(item.overtime, 1000);
    assert.equal(item.totalEarnings, 4500);
    assert.ok(payroll.activeColumns.includes('overtime'));

    const listed = await call(listAdjustments, env, { token: sup, query: { period: PERIOD } });
    assert.equal(listed.status, 200);
    assert.equal(listed.body.adjustments.length, 1);
    assert.equal(listed.body.locked, false);
    assert.deepEqual({ e: listed.body.summary.earnings, d: listed.body.summary.deductions }, { e: 1000, d: 0 });
    assert.equal(listed.body.summary.byCategory.overtime, 1000);

    const noReason = await call(cancelAdjustment, env, { token: sup, body: { id: adj.id } });
    assert.equal(noReason.status, 400);

    const cancelled = await call(cancelAdjustment, env, { token: sup, body: { id: adj.id, reason: 'أُدخل بالخطأ' } });
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
    assert.equal(cancelled.body.adjustment.status, 'cancelled');
    assert.equal(cancelled.body.adjustment.cancelReason, 'أُدخل بالخطأ');
    assert.equal(cancelled.body.adjustment.cancelledByName, 'محمد أحمد');

    payroll = await computeBranchPayroll(DB as any, 'branch_1010', PERIOD);
    item = payroll.items.find(i => i.employeeId === 'emp_1')!;
    assert.equal(item.overtime, 0);

    const again = await call(cancelAdjustment, env, { token: sup, body: { id: adj.id, reason: 'مرة أخرى' } });
    assert.equal(again.status, 409);

    const active = await call(listAdjustments, env, { token: sup, query: { period: PERIOD } });
    assert.equal(active.body.adjustments.length, 0);
    assert.equal(active.body.summary.earnings, 0);
    const all = await call(listAdjustments, env, { token: sup, query: { period: PERIOD, status: 'all' } });
    assert.equal(all.body.adjustments.length, 1);
    const cancelledOnly = await call(listAdjustments, env, { token: sup, query: { period: PERIOD, status: 'cancelled' } });
    assert.equal(cancelledOnly.body.adjustments.length, 1);

    const audits = DB.query<{ action: string }>(`SELECT action FROM audit_logs WHERE entity_type = 'payroll_adjustment' ORDER BY created_at`);
    assert.deepEqual(audits.map(a => a.action).sort(), ['create', 'update']);
  });
}

test('amount validation: explicit amount wins, halala rounding, bad input rejected', async () => {
  const { env, data } = await setup('008');
  const admin = data.users.admin.token;
  const base = { branchId: 'branch_1010', employeeId: 'emp_2', period: PERIOD };

  const rounded = await call(createAdjustment, env, { token: admin, body: { ...base, category: 'late', quantity: 1.5, rate: 8.33 } });
  assert.equal(rounded.status, 201);
  assert.equal(rounded.body.adjustment.amount, 12.5); // 1.5 × 8.33 = 12.495 → 12.50

  // An explicit amount that 10 × 20 does not explain is kept, without the breakdown.
  const explicit = await call(createAdjustment, env, { token: admin, body: { ...base, category: 'overtime', quantity: 10, rate: 20, amount: '250.75' } });
  assert.equal(explicit.status, 201);
  assert.equal(explicit.body.adjustment.amount, 250.75);
  assert.equal(explicit.body.adjustment.quantity, null);
  assert.equal(explicit.body.adjustment.rate, null);
  assert.deepEqual(explicit.body.warnings, [AMOUNT_MISMATCH_WARNING]);

  for (const body of [
    { ...base, category: 'overtime' },
    { ...base, category: 'overtime', amount: 0 },
    { ...base, category: 'overtime', amount: -5 },
    { ...base, category: 'overtime', amount: '10.123' },
    { ...base, category: 'overtime', quantity: 745, rate: 10 },
    { ...base, category: 'overtime', quantity: 0, rate: 10 },
    { ...base, category: 'overtime', quantity: 5 },
    { ...base, category: 'bogus', amount: 10 },
    { ...base, period: '2026-13', category: 'overtime', amount: 10 },
    { ...base, period: '', category: 'overtime', amount: 10 },
    { ...base, category: 'violation', amount: 10, description: 'x'.repeat(301) },
    { branchId: 'branch_1010', period: PERIOD, category: 'violation', amount: 10 },
  ]) {
    const res = await call(createAdjustment, env, { token: admin, body });
    assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(body).slice(0, 120)} → ${JSON.stringify(res.body)}`);
  }

  // Admins have no branch of their own: they must name one.
  const noBranch = await call(createAdjustment, env, { token: admin, body: { employeeId: 'emp_2', period: PERIOD, category: 'overtime', amount: 10 } });
  assert.equal(noBranch.status, 400);
});

test('branch scoping, inactive employees and permissions', async () => {
  const { env, DB, data } = await setup('008');
  const sup = data.users.supervisor.token;

  // Employee of another branch, without and with naming that branch.
  const cross = await call(createAdjustment, env, { token: sup, body: { employeeId: 'emp_3', period: PERIOD, category: 'overtime', amount: 100 } });
  assert.equal(cross.status, 404);
  const otherBranch = await call(createAdjustment, env, { token: sup, body: { branchId: 'branch_2020', employeeId: 'emp_3', period: PERIOD, category: 'overtime', amount: 100 } });
  assert.equal(otherBranch.status, 403);
  const adminMismatch = await call(createAdjustment, env, { token: data.users.admin.token, body: { branchId: 'branch_1010', employeeId: 'emp_3', period: PERIOD, category: 'overtime', amount: 100 } });
  assert.equal(adminMismatch.status, 404);

  DB.raw.exec(`UPDATE employees SET is_active = 0 WHERE id = 'emp_2'`);
  const inactive = await call(createAdjustment, env, { token: sup, body: { employeeId: 'emp_2', period: PERIOD, category: 'violation', amount: 50 } });
  assert.equal(inactive.status, 400);

  for (const role of ['partner', 'employee'] as const) {
    const token = data.users[role].token;
    const create = await call(createAdjustment, env, { token, body: { employeeId: 'emp_1', period: PERIOD, category: 'overtime', amount: 100 } });
    assert.equal(create.status, 403, role);
    const list = await call(listAdjustments, env, { token, query: { period: PERIOD } });
    assert.equal(list.status, 403, role);
    assert.equal((await call(listAdvances, env, { token, query: { period: PERIOD } })).status, 403, role);
    assert.equal((await call(listDeductions, env, { token, query: { period: PERIOD } })).status, 403, role);
    assert.equal((await call(cancelAdjustment, env, { token, body: { id: 'x', reason: 'r' } })).status, 403, role);
  }
  assert.equal((await call(listAdjustments, env, {})).status, 401);

  // Supervisor of the other branch cannot list or cancel this branch's entries.
  const own = await call(createAdjustment, env, { token: sup, body: { employeeId: 'emp_1', period: PERIOD, category: 'overtime', amount: 100 } });
  assert.equal(own.status, 201);
  const sup2 = data.users.otherSupervisor.token;
  assert.equal((await call(listAdjustments, env, { token: sup2, query: { branchId: 'branch_1010', period: PERIOD } })).status, 403);
  const sup2List = await call(listAdjustments, env, { token: sup2, query: { period: PERIOD } });
  assert.equal(sup2List.status, 200);
  assert.equal(sup2List.body.adjustments.length, 0);
  const sup2Cancel = await call(cancelAdjustment, env, { token: sup2, body: { id: own.body.adjustment.id, reason: 'لا' } });
  assert.equal(sup2Cancel.status, 403);
  assert.equal(DB.one<{ status: string }>('SELECT status FROM payroll_adjustments WHERE id = ?', own.body.adjustment.id)!.status, 'active');

  // Admin sees it when naming the branch, and must name one.
  const admin = data.users.admin.token;
  assert.equal((await call(listAdjustments, env, { token: admin, query: { period: PERIOD } })).status, 400);
  const adminList = await call(listAdjustments, env, { token: admin, query: { branchId: 'branch_1010', period: PERIOD } });
  assert.equal(adminList.body.adjustments.length, 1);
  assert.equal((await call(listAdjustments, env, { token: admin, query: { branchId: 'branch_1010' } })).status, 400);
  assert.equal((await call(listAdjustments, env, { token: admin, query: { branchId: 'branch_1010', period: PERIOD, category: 'nope' } })).status, 400);
});

test('locked period refuses new entries and cancellations', async () => {
  const { env, DB, data } = await setup('008');
  const sup = data.users.supervisor.token;
  const first = await call(createAdjustment, env, { token: sup, body: { employeeId: 'emp_1', period: PERIOD, category: 'advance', amount: 300 } });
  assert.equal(first.status, 201);

  DB.raw.exec(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('run_1', 'branch_1010', '${PERIOD}', 'approved')`);
  const locked = await call(createAdjustment, env, { token: sup, body: { employeeId: 'emp_1', period: PERIOD, category: 'overtime', amount: 100 } });
  assert.equal(locked.status, 409);
  assert.equal(locked.body.error, 'مسير رواتب هذا الشهر معتمد — لا يمكن إضافة بنود');

  const cancel = await call(cancelAdjustment, env, { token: sup, body: { id: first.body.adjustment.id, reason: 'خطأ' } });
  assert.equal(cancel.status, 409);

  const listed = await call(listAdjustments, env, { token: sup, query: { period: PERIOD } });
  assert.equal(listed.body.locked, true);
  assert.deepEqual(listed.body.payrollRun, { id: 'run_1', status: 'approved' });

  // The next month is still open.
  const next = await call(createAdjustment, env, { token: sup, body: { employeeId: 'emp_1', period: '2026-11', category: 'overtime', amount: 100 } });
  assert.equal(next.status, 201);

  // Entries already attached to a payroll run cannot be cancelled even if the run was reopened.
  DB.raw.exec(`UPDATE payroll_runs SET status = 'draft'`);
  DB.raw.exec(`UPDATE payroll_adjustments SET payroll_run_id = 'run_1' WHERE id = '${first.body.adjustment.id}'`);
  const attached = await call(cancelAdjustment, env, { token: sup, body: { id: first.body.adjustment.id, reason: 'خطأ' } });
  assert.equal(attached.status, 409);
});

test('an approval racing the insert is caught by the guarded INSERT (409)', async () => {
  const { env, DB, data } = await setup('008');
  const originalBatch = DB.batch.bind(DB);
  (DB as any).batch = async (statements: any[]) => {
    if (statements.some(s => /INSERT INTO payroll_adjustments/.test(s.sql))) {
      DB.raw.exec(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('run_race', 'branch_1010', '${PERIOD}', 'approved')`);
    }
    return originalBatch(statements);
  };
  const res = await call(createAdjustment, env, { token: data.users.supervisor.token, body: { employeeId: 'emp_1', period: PERIOD, category: 'overtime', amount: 100 } });
  assert.equal(res.status, 409);
  assert.equal(DB.query('SELECT * FROM payroll_adjustments').length, 0);
});

test('request-sourced entries can be cancelled and keep their source', async () => {
  const { env, DB, data } = await setup('008');
  const { ensureFinanceSchema } = await import('../schema');
  await ensureFinanceSchema(DB as any);
  DB.raw.exec(`INSERT INTO payroll_adjustments (id, branch_id, employee_id, employee_name, period, kind, category, amount, source_type, source_id, installment_no, installment_count, created_by_name)
               VALUES ('adj_req', 'branch_1010', 'emp_2', 'محمد إسماعيل', '${PERIOD}', 'deduction', 'advance', 250, 'request', 'req_9', 1, 4, 'محمد أحمد')`);
  const listed = await call(listAdjustments, env, { token: data.users.supervisor.token, query: { period: PERIOD, employeeId: 'emp_2' } });
  const row = listed.body.adjustments[0];
  assert.equal(row.sourceType, 'request');
  assert.equal(row.sourceId, 'req_9');
  assert.equal(row.installmentNo, 1);
  assert.equal(row.installmentCount, 4);
  const res = await call(cancelAdjustment, env, { token: data.users.supervisor.token, body: { id: 'adj_req', reason: 'سُددت نقداً' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.adjustment.sourceType, 'request');
});

test('deductions above half the fixed salary produce a warning, not a block', async () => {
  const { env, data } = await setup('008');
  const sup = data.users.supervisor.token;
  // emp_2: fixed salary 2000.
  const a = await call(createAdjustment, env, { token: sup, body: { employeeId: 'emp_2', period: PERIOD, category: 'advance', amount: 900 } });
  assert.equal(a.status, 201);
  assert.equal(a.body.warnings.length, 0);
  const b = await call(createAdjustment, env, { token: sup, body: { employeeId: 'emp_2', period: PERIOD, category: 'absence', quantity: 2, rate: 66.67 } });
  assert.equal(b.status, 201);
  assert.equal(b.body.adjustment.amount, 133.34);
  assert.equal(b.body.warnings.length, 1);
  assert.match(b.body.warnings[0], /50%/);
  const earning = await call(createAdjustment, env, { token: sup, body: { employeeId: 'emp_2', period: PERIOD, category: 'bonus', amount: 10 } });
  assert.equal(earning.body.warnings.length, 0);

  const listed = await call(listAdjustments, env, { token: sup, query: { period: PERIOD } });
  assert.equal(listed.body.summary.deductions, 1033.34);
  assert.equal(listed.body.summary.earnings, 10);
  assert.equal(listed.body.summary.count, 3);
  const deductionsOnly = await call(listAdjustments, env, { token: sup, query: { period: PERIOD, kind: 'deduction' } });
  assert.equal(deductionsOnly.body.adjustments.length, 2);
});

for (const variant of ['008', 'legacy'] as const) {
  test(`advances/deductions compat wrappers write to the ledger (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    const sup = data.users.supervisor.token;

    const adv = await call(createAdvance, env, { token: sup, body: { employeeId: 'emp_1', amount: 500, month: '10', year: 2026, notes: 'سلفة شخصية' } });
    assert.equal(adv.status, 201, JSON.stringify(adv.body));
    assert.equal(adv.body.advance.amount, 500);
    assert.equal(adv.body.advance.month, 10);
    const row = DB.one<Record<string, unknown>>('SELECT * FROM payroll_adjustments WHERE id = ?', adv.body.advance.id)!;
    assert.equal(row.category, 'advance');
    assert.equal(row.kind, 'deduction');
    assert.equal(row.period, PERIOD);
    assert.equal(row.branch_id, 'branch_1010');
    assert.equal(row.description, 'سلفة شخصية');

    // Arabic month names are accepted too.
    const arabicMonth = await call(createAdvance, env, { token: sup, body: { employeeId: 'emp_2', amount: '150.50', month: 'نوفمبر', year: '2026' } });
    assert.equal(arabicMonth.status, 201);
    assert.equal(arabicMonth.body.adjustment.period, '2026-11');

    const crossBranch = await call(createAdvance, env, { token: sup, body: { employeeId: 'emp_3', amount: 100, month: 10, year: 2026 } });
    assert.equal(crossBranch.status, 404);
    const partner = await call(createAdvance, env, { token: data.users.partner.token, body: { employeeId: 'emp_1', amount: 100, month: 10, year: 2026 } });
    assert.equal(partner.status, 403);
    const badMonth = await call(createAdvance, env, { token: sup, body: { employeeId: 'emp_1', amount: 100, month: 13, year: 2026 } });
    assert.equal(badMonth.status, 400);

    const ded = await call(createDeduction, env, { token: sup, body: { employeeId: 'emp_1', amount: 75, month: 10, year: 2026, deductionType: 'غياب', reason: 'يوم 5' } });
    assert.equal(ded.status, 201);
    assert.equal(ded.body.adjustment.category, 'absence');
    const insurance = await call(createDeduction, env, { token: sup, body: { employeeId: 'emp_1', amount: 40, month: 10, year: 2026, deductionType: 'تأمينات', reason: 'اشتراك' } });
    assert.equal(insurance.body.adjustment.category, 'other_deduction');
    assert.equal(insurance.body.adjustment.description, 'تأمينات: اشتراك');

    const payroll = await computeBranchPayroll(DB as any, 'branch_1010', PERIOD);
    const item = payroll.items.find(i => i.employeeId === 'emp_1')!;
    assert.equal(item.advances, 500);
    assert.equal(item.absenceDeductions, 75);
    assert.equal(item.otherDeductions, 40);

    const advList = await call(listAdvances, env, { token: sup, query: { month: '10', year: '2026' } });
    assert.equal(advList.status, 200);
    assert.equal(advList.body.count, 1);
    assert.equal(advList.body.total, 500);
    assert.equal(advList.body.advances[0].employee_name, 'أحمد علي');
    assert.equal(advList.body.advances[0].source, 'ledger');
    const yearList = await call(listAdvances, env, { token: sup, query: { year: '2026' } });
    assert.equal(yearList.body.count, 2);
    assert.equal(yearList.body.total, 650.5);

    const dedList = await call(listDeductions, env, { token: sup, query: { period: PERIOD } });
    assert.equal(dedList.status, 200);
    assert.equal(dedList.body.count, 2);
    assert.equal(dedList.body.total, 115);
    assert.equal(dedList.body.byType['غياب'].total, 75);
  });
}

test('legacy advances/deductions rows are listed read-only (legacy schema)', async () => {
  const { env, DB, data } = await setup('legacy');
  DB.raw.exec(`INSERT INTO advances (id, employee_id, employee_name, amount, month, year, description, recorded_by)
               VALUES ('old_adv_1', 'emp_1', 'أحمد علي', 400, 'أكتوبر', 2026, 'سلفة قديمة', 'sup')`);
  DB.raw.exec(`INSERT INTO deductions (id, employee_id, employee_name, amount, month, year, reason, recorded_by)
               VALUES ('old_ded_1', 'emp_2', 'محمد إسماعيل', 60, '10', 2026, 'تأخير: 3 أيام', 'sup')`);
  DB.raw.exec(`INSERT INTO advances (id, employee_id, employee_name, amount, month, year, description, recorded_by)
               VALUES ('old_adv_other', 'emp_3', 'خالد سالم', 999, '10', 2026, 'فرع آخر', 'sup2')`);
  const sup = data.users.supervisor.token;

  const listed = await call(listAdjustments, env, { token: sup, query: { period: PERIOD } });
  assert.equal(listed.status, 200, JSON.stringify(listed.body));
  assert.equal(listed.body.adjustments.length, 0);
  const legacy = [...listed.body.legacy].sort((a: any, b: any) => a.id.localeCompare(b.id));
  assert.deepEqual(
    legacy.map((l: any) => [l.id, l.employeeId, l.employeeName, l.category, l.amount, l.table]),
    [
      ['advances:old_adv_1', 'emp_1', 'أحمد علي', 'advance', 400, 'advances'],
      ['deductions:old_ded_1', 'emp_2', 'محمد إسماعيل', 'other_deduction', 60, 'deductions'],
    ],
  );
  assert.equal(listed.body.summary.deductions, 460);

  const filtered = await call(listAdjustments, env, { token: sup, query: { period: PERIOD, employeeId: 'emp_2' } });
  assert.equal(filtered.body.legacy.length, 1);
  const earningsOnly = await call(listAdjustments, env, { token: sup, query: { period: PERIOD, kind: 'earning' } });
  assert.equal(earningsOnly.body.legacy.length, 0);

  const advList = await call(listAdvances, env, { token: sup, query: { period: PERIOD } });
  assert.equal(advList.body.count, 1);
  assert.equal(advList.body.advances[0].source, 'legacy');
  assert.equal(advList.body.advances[0].employee_name, 'أحمد علي');
  const dedList = await call(listDeductions, env, { token: sup, query: { period: PERIOD } });
  assert.equal(dedList.body.count, 1);
  assert.equal(dedList.body.deductions[0].reason, 'تأخير: 3 أيام');

  // The other branch's supervisor sees only their own legacy row.
  const other = await call(listAdjustments, env, { token: data.users.otherSupervisor.token, query: { period: PERIOD } });
  assert.deepEqual(other.body.legacy.map((l: any) => l.id), ['advances:old_adv_other']);
});

test('deduction type mapping', () => {
  assert.equal(mapDeductionType('غياب'), 'absence');
  assert.equal(mapDeductionType('تأخير'), 'late');
  assert.equal(mapDeductionType('مخالفة'), 'violation');
  assert.equal(mapDeductionType('جزاء إداري'), 'violation');
  assert.equal(mapDeductionType('تأمينات'), 'other_deduction');
  assert.equal(mapDeductionType(''), 'other_deduction');
  assert.equal(mapDeductionType('unpaid_leave'), 'unpaid_leave');
  assert.equal(mapDeductionType('advance'), 'other_deduction');
});

test('a failure after the insert commits still answers 201 and records the entry once', async () => {
  const { env, DB, data } = await setup('008');
  const originalPrepare = DB.prepare.bind(DB);
  let committed = false;
  const originalBatch = DB.batch.bind(DB);
  (DB as any).batch = async (statements: any[]) => {
    const result = await originalBatch(statements);
    if (statements.some(s => /INSERT INTO payroll_adjustments/.test(s.sql))) committed = true;
    return result;
  };
  (DB as any).prepare = (sql: string) => {
    if (committed && !/^\s*INSERT/i.test(sql)) throw new Error('D1 unavailable');
    return originalPrepare(sql);
  };
  const res = await call(createAdjustment, env, {
    token: data.users.supervisor.token,
    body: { employeeId: 'emp_2', period: PERIOD, category: 'advance', amount: 1500 },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.adjustment.amount, 1500);
  assert.equal(res.body.adjustment.employeeName, 'محمد إسماعيل');
  assert.deepEqual(res.body.warnings, []);
  (DB as any).prepare = originalPrepare;
  assert.equal(DB.query('SELECT * FROM payroll_adjustments').length, 1);
});

for (const variant of ['008', 'legacy'] as const) {
  test(`summary describes what payroll deducts whatever the status filter (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    const sup = data.users.supervisor.token;
    if (variant === 'legacy') {
      DB.raw.exec(`INSERT INTO advances (id, employee_id, employee_name, amount, month, year, description, recorded_by)
                   VALUES ('old_adv_1', 'emp_1', 'أحمد علي', 400, '10', 2026, 'سلفة قديمة', 'sup')`);
    }
    const kept = await call(createAdjustment, env, { token: sup, body: { employeeId: 'emp_1', period: PERIOD, category: 'violation', amount: 100 } });
    const dropped = await call(createAdjustment, env, { token: sup, body: { employeeId: 'emp_1', period: PERIOD, category: 'late', amount: 30 } });
    assert.equal(kept.status, 201);
    await call(cancelAdjustment, env, { token: sup, body: { id: dropped.body.adjustment.id, reason: 'خطأ' } });

    const legacyTotal = variant === 'legacy' ? 400 : 0;
    const summaries = [];
    for (const status of ['active', 'cancelled', 'all']) {
      const res = await call(listAdjustments, env, { token: sup, query: { period: PERIOD, status } });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      summaries.push(res.body.summary);
      // Legacy rows cannot be cancelled: never listed under "cancelled".
      assert.equal(res.body.legacy.length, status === 'cancelled' ? 0 : legacyTotal ? 1 : 0, status);
    }
    for (const s of summaries) {
      assert.deepEqual(s, summaries[0]);
      assert.equal(s.deductions, 100 + legacyTotal);
    }
  });
}
