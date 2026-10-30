import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, call } from './harness';
import { ensureFinanceSchema } from '../schema';
import { adjustmentInsertStatement } from '../ledger';
import { voucherInsertStatements } from '../vouchers';
import { GET as getVoucher } from '../../../pages/api/vouchers/get';
import { POST as cancelVoucher } from '../../../pages/api/vouchers/cancel';

/** emp_2's approved advance: request filed by u_sup, a PV voucher and two installments. */
async function seedAdvanceVoucher(DB: any) {
  const db = DB as any;
  await ensureFinanceSchema(db);
  DB.raw.exec(`INSERT INTO employee_requests (id, branch_id, user_id, employee_name, request_type, request_date, status)
               VALUES ('req_victim', 'branch_1010', 'u_sup', 'محمد إسماعيل', 'سلفة', '2026-10-01', 'approved')`);
  DB.raw.exec(`INSERT INTO employee_request_meta (request_id, employee_id) VALUES ('req_victim', 'emp_2')`);
  await db.batch([
    ...voucherInsertStatements(db, {
      id: 'vch_victim', branchId: 'branch_1010', branchName: 'فرع لبن', type: 'payment', date: '2026-10-29',
      partyType: 'employee', partyName: 'محمد إسماعيل', employeeId: 'emp_2', partyIdNumber: '1002', amount: 1500,
      currency: 'SAR', purpose: 'سلفة على الراتب', paymentMethod: 'cash', status: 'pending', sourceType: 'request',
      sourceId: 'req_victim', createdBy: 'u_sup', createdByName: 'محمد أحمد',
    }),
    ...['2026-11', '2026-12'].map((period, i) =>
      adjustmentInsertStatement(db, {
        branchId: 'branch_1010', employeeId: 'emp_2', employeeName: 'محمد إسماعيل', period, category: 'advance',
        amount: 750, sourceType: 'request', sourceId: 'req_victim', installmentNo: i + 1, installmentCount: 2,
        createdBy: 'u_sup', createdByName: 'محمد أحمد',
      }),
    ),
  ]);
}

test('a pending or rejected request linked to a colleague does not grant access to their vouchers', async () => {
  const { env, DB, data } = await setup('008');
  await seedAdvanceVoucher(DB);
  const outsider = data.users.employee; // u_emp, not linked to emp_2

  assert.equal((await call(getVoucher, env, { token: outsider.token, query: { id: 'vch_victim' } })).status, 403);

  // The outsider files a request that ends up linked to emp_2 but is not approved.
  for (const status of ['pending', 'rejected']) {
    DB.raw.exec(`DELETE FROM employee_request_meta WHERE request_id = 'req_claim'`);
    DB.raw.exec(`DELETE FROM employee_requests WHERE id = 'req_claim'`);
    DB.raw.exec(`INSERT INTO employee_requests (id, branch_id, user_id, employee_name, request_type, request_date, status)
                 VALUES ('req_claim', 'branch_1010', '${outsider.id}', 'محمد إسماعيل', 'إجازة', '2026-10-02', '${status}')`);
    DB.raw.exec(`INSERT INTO employee_request_meta (request_id, employee_id) VALUES ('req_claim', 'emp_2')`);
    const res = await call(getVoucher, env, { token: outsider.token, query: { id: 'vch_victim' } });
    assert.equal(res.status, 403, `linking request status ${status} must not grant access`);
  }

  // Once staff approved a request linking this user to emp_2, read-only access is allowed.
  DB.raw.exec(`UPDATE employee_requests SET status = 'approved' WHERE id = 'req_claim'`);
  const allowed = await call(getVoucher, env, { token: outsider.token, query: { id: 'vch_victim' } });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.readOnly, true);
});

test('cancelling an advance voucher warns about installments still scheduled in payroll', async () => {
  const { env, DB, data } = await setup('008');
  await seedAdvanceVoucher(DB);
  const res = await call(cancelVoucher, env, { token: data.users.supervisor.token, body: { id: 'vch_victim', reason: 'لم تُصرف' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.voucher.status, 'cancelled');
  assert.equal(res.body.warnings.length, 1);
  assert.match(res.body.warnings[0], /نوفمبر 2026/);
  assert.match(res.body.warnings[0], /ديسمبر 2026/);

  // A manual voucher has nothing to warn about.
  const db = DB as any;
  await db.batch(voucherInsertStatements(db, {
    id: 'vch_manual', branchId: 'branch_1010', branchName: 'فرع لبن', type: 'payment', date: '2026-10-29',
    partyType: 'other', partyName: 'مورد', amount: 100, currency: 'SAR', purpose: 'مشتريات', paymentMethod: 'cash',
    status: 'pending', sourceType: 'manual', createdBy: 'u_sup', createdByName: 'محمد أحمد',
  }));
  const manual = await call(cancelVoucher, env, { token: data.users.supervisor.token, body: { id: 'vch_manual', reason: 'خطأ' } });
  assert.equal(manual.status, 200);
  assert.deepEqual(manual.body.warnings, []);
});

test('missing vouchers: staff get 404, outsiders get 403 without learning the id exists', async () => {
  const { env, DB, data } = await setup('008');
  await ensureFinanceSchema(DB as any);
  const staff = await call(getVoucher, env, { token: data.users.supervisor.token, query: { id: 'vch_nope' } });
  assert.equal(staff.status, 404);
  const outsider = await call(getVoucher, env, { token: data.users.employee.token, query: { id: 'vch_nope' } });
  assert.equal(outsider.status, 403);
  const noId = await call(getVoucher, env, { token: data.users.supervisor.token, query: {} });
  assert.equal(noId.status, 400);
  const cancelMissing = await call(cancelVoucher, env, { token: data.users.supervisor.token, body: { id: 'vch_nope', reason: 'x' } });
  assert.equal(cancelMissing.status, 404);
  const cancelNoBody = await call(cancelVoucher, env, { token: data.users.supervisor.token, body: {} });
  assert.equal(cancelNoBody.status, 400);
});

test('an approved request with no linked employee grants nothing beyond its own voucher', async () => {
  const { env, DB, data } = await setup('008');
  await seedAdvanceVoucher(DB);
  const outsider = data.users.employee;
  DB.raw.exec(`INSERT INTO employee_requests (id, branch_id, user_id, employee_name, request_type, request_date, status)
               VALUES ('req_unlinked', 'branch_1010', '${outsider.id}', 'أحمد علي', 'إجازة', '2026-10-03', 'approved')`);
  DB.raw.exec(`INSERT INTO employee_request_meta (request_id, employee_id) VALUES ('req_unlinked', NULL)`);
  assert.equal((await call(getVoucher, env, { token: outsider.token, query: { id: 'vch_victim' } })).status, 403);
});

test('approving payroll does not lock entries of employees missing from the sheet', async () => {
  const { env, DB, data } = await setup('008');
  const db = DB as any;
  await ensureFinanceSchema(db);
  const entry = (employeeId: string, employeeName: string) =>
    adjustmentInsertStatement(db, {
      branchId: 'branch_1010', employeeId, employeeName, period: '2026-11', category: 'advance', amount: 500,
      sourceType: 'manual', createdBy: 'u_sup', createdByName: 'محمد أحمد',
    });
  await db.batch([entry('emp_1', 'أحمد علي'), entry('emp_2', 'محمد إسماعيل')]);
  DB.raw.exec(`UPDATE employees SET is_active = 0 WHERE id = 'emp_2'`); // emp_2 leaves before payroll

  const { POST: savePayroll } = await import('../../../pages/api/payroll/save');
  const { POST: approvePayroll } = await import('../../../pages/api/payroll/approve');
  const saved = await call(savePayroll, env, { token: data.users.supervisor.token, body: { branchId: 'branch_1010', period: '2026-11' } });
  assert.equal(saved.status < 300, true, JSON.stringify(saved.body));
  const runId = saved.body.run.id;
  const approved = await call(approvePayroll, env, { token: data.users.admin.token, body: { id: runId } });
  assert.equal(approved.status, 200, JSON.stringify(approved.body));

  const rows = DB.query<{ employee_id: string; payroll_run_id: string | null }>(
    `SELECT employee_id, payroll_run_id FROM payroll_adjustments ORDER BY employee_id`,
  );
  assert.deepEqual(rows, [
    { employee_id: 'emp_1', payroll_run_id: runId },
    { employee_id: 'emp_2', payroll_run_id: null },
  ]);
});

test('partners see manual vouchers only: salary and advance vouchers stay hidden', async () => {
  const { env, DB, data } = await setup('008');
  await seedAdvanceVoucher(DB); // request-sourced voucher vch_victim
  const db = DB as any;
  await db.batch([
    ...voucherInsertStatements(db, {
      id: 'vch_salary', branchId: 'branch_1010', branchName: 'فرع لبن', type: 'payment', date: '2026-10-29',
      partyType: 'employee', partyName: 'أحمد علي', employeeId: 'emp_1', amount: 3500, currency: 'SAR',
      purpose: 'راتب شهر أكتوبر 2026', paymentMethod: 'bank_transfer', status: 'approved', sourceType: 'payroll',
      sourceId: 'run1:emp_1', createdBy: 'u_admin', createdByName: 'المدير العام', approvedBy: 'u_admin', approvedByName: 'المدير العام',
    }),
    ...voucherInsertStatements(db, {
      id: 'vch_supplier', branchId: 'branch_1010', branchName: 'فرع لبن', type: 'payment', date: '2026-10-29',
      partyType: 'supplier', partyName: 'مورد', amount: 250, currency: 'SAR', purpose: 'مشتريات',
      paymentMethod: 'cash', status: 'approved', sourceType: 'manual', createdBy: 'u_sup', createdByName: 'محمد أحمد',
      approvedBy: 'u_admin', approvedByName: 'المدير العام',
    }),
  ]);
  const { GET: listVouchers } = await import('../../../pages/api/vouchers/list');

  const partner = data.users.partner;
  const list = await call(listVouchers, env, { token: partner.token, query: { branchId: 'branch_1010', type: 'payment' } });
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.vouchers.map((v: any) => v.id), ['vch_supplier']);
  assert.equal(list.body.summary.payment.totalApproved, 250);
  for (const id of ['vch_salary', 'vch_victim']) {
    const res = await call(getVoucher, env, { token: partner.token, query: { id } });
    assert.equal(res.status, 403, id);
  }
  assert.equal((await call(getVoucher, env, { token: partner.token, query: { id: 'vch_supplier' } })).status, 200);

  // Payroll staff still see everything.
  const sup = await call(listVouchers, env, { token: data.users.supervisor.token, query: { branchId: 'branch_1010', type: 'payment' } });
  assert.equal(sup.body.vouchers.length, 3);
});
