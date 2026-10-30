// Stream C — employee requests with automatic payroll posting.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, call } from './harness';
import { computeBranchPayroll } from '../payroll-data';
import { dailyRate } from '../payroll-engine';
import { addMonths, currentPeriod, periodLabelAr, todayIso } from '../catalog';
import { POST as createRequest } from '../../../pages/api/requests/create';
import { POST as respondRequest, PUT as respondRequestPut } from '../../../pages/api/requests/respond';
import { GET as listAll } from '../../../pages/api/requests/all';
import { GET as listMine } from '../../../pages/api/requests/my';
import { GET as listEmployees } from '../../../pages/api/requests/employees';
import { POST as cancelRequest } from '../../../pages/api/requests/cancel';

type Ctx = Awaited<ReturnType<typeof setup>>;

const VARIANTS = ['008', 'legacy'] as const;

async function create(ctx: Ctx, who: keyof Ctx['data']['users'], body: Record<string, unknown>) {
  return call(createRequest, ctx.env, { token: ctx.data.users[who].token, body });
}

async function respond(ctx: Ctx, who: keyof Ctx['data']['users'], body: Record<string, unknown>) {
  return call(respondRequest, ctx.env, { token: ctx.data.users[who].token, body });
}

function adjustments(ctx: Ctx, sourceId: string) {
  return ctx.DB.query<Record<string, any>>(
    `SELECT * FROM payroll_adjustments WHERE source_type = 'request' AND source_id = ? ORDER BY period`,
    sourceId,
  );
}

function requestRow(ctx: Ctx, id: string) {
  return ctx.DB.one<Record<string, any>>('SELECT * FROM employee_requests WHERE id = ?', id)!;
}

/** Adds a user account (and session) to the seeded database; returns its session token. */
async function addUser(ctx: Ctx, id: string, username: string, fullName: string | null, roleId: string, branchId: string | null) {
  ctx.DB.raw
    .prepare(`INSERT INTO users_new (id, username, password, full_name, role_id, branch_id, is_active) VALUES (?, ?, 'x', ?, ?, ?, 1)`)
    .run(id, username, fullName, roleId, branchId);
  const token = `tok_${id}`;
  await ctx.env.SESSIONS.put(
    `session:${token}`,
    JSON.stringify({ userId: id, username, role: 'employee', createdAt: Date.now(), expiresAt: Date.now() + 3_600_000 }),
  );
  return token;
}

function addEmployee(ctx: Ctx, id: string, name: string, nationalId: string, baseSalary: number) {
  ctx.DB.raw
    .prepare(`INSERT INTO employees (id, branch_id, employee_name, national_id, base_salary, supervisor_allowance, incentives, is_active)
              VALUES (?, 'branch_1010', ?, ?, ?, 0, 0, 1)`)
    .run(id, name, nationalId, baseSalary);
}

for (const variant of VARIANTS) {
  test(`[${variant}] employee advance is auto-linked, approved in 2 installments, deducted in payroll, with one payment voucher`, async () => {
    const ctx = await setup(variant);
    const created = await create(ctx, 'employee', { requestType: 'سلفة', advanceAmount: 1000, installments: 2, reason: 'ظرف طارئ' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.requestId as string;
    assert.match(id, /^req_/);
    assert.deepEqual(created.body.linkedEmployee, { id: 'emp_1', name: 'أحمد علي' });

    const row = requestRow(ctx, id);
    assert.equal(row.branch_id, 'branch_1010');
    assert.equal(row.user_id, 'u_emp');
    assert.equal(row.status, 'pending');
    assert.equal(row.advance_amount, 1000);
    assert.equal(row.resignation_reason, null, 'reason must not be stored as resignation reason');
    const meta = ctx.DB.one<Record<string, any>>('SELECT * FROM employee_request_meta WHERE request_id = ?', id)!;
    assert.equal(meta.employee_id, 'emp_1');
    assert.equal(meta.reason, 'ظرف طارئ');
    assert.equal(meta.requested_installments, 2);

    // approvers of the branch were notified, the requester was not
    const notified = ctx.DB.query<{ user_id: string }>(`SELECT user_id FROM user_notifications WHERE type = 'request_created' AND related_entity = ?`, id).map(r => r.user_id).sort();
    assert.ok(notified.includes('u_admin') && notified.includes('u_sup'));
    assert.ok(!notified.includes('u_emp') && !notified.includes('u_sup2') && !notified.includes('u_partner'));

    const approved = await respond(ctx, 'supervisor', {
      id,
      status: 'approved',
      financial: { installments: 2, startPeriod: '2026-11', createVoucher: true, paymentMethod: 'cash' },
    });
    assert.equal(approved.status, 200, JSON.stringify(approved.body));

    const ledger = adjustments(ctx, id);
    assert.equal(ledger.length, 2);
    assert.deepEqual(ledger.map(a => a.period), ['2026-11', '2026-12']);
    assert.deepEqual(ledger.map(a => a.amount), [500, 500]);
    assert.ok(ledger.every(a => a.category === 'advance' && a.kind === 'deduction' && a.employee_id === 'emp_1' && a.status === 'active'));
    assert.deepEqual(ledger.map(a => [a.installment_no, a.installment_count]), [[1, 2], [2, 2]]);
    assert.ok(String(ledger[0].description).includes('سلفة — طلب رقم'));

    const payroll = await computeBranchPayroll(ctx.DB as any, 'branch_1010', '2026-11');
    const item = payroll.items.find(i => i.employeeId === 'emp_1')!;
    assert.equal(item.advances, 500);
    assert.equal(item.netSalary, 3500 - 500);
    const december = await computeBranchPayroll(ctx.DB as any, 'branch_1010', '2026-12');
    assert.equal(december.items.find(i => i.employeeId === 'emp_1')!.advances, 500);

    const vouchers = ctx.DB.query<Record<string, any>>('SELECT * FROM financial_vouchers');
    assert.equal(vouchers.length, 1);
    const voucher = vouchers[0];
    assert.equal(voucher.voucher_type, 'payment');
    assert.equal(voucher.voucher_number, `PV-${todayIso().slice(0, 4)}-00001`);
    assert.equal(voucher.amount, 1000);
    assert.equal(voucher.source_type, 'request');
    assert.equal(voucher.source_id, id);
    assert.equal(voucher.employee_id, 'emp_1');
    assert.equal(voucher.party_name, 'أحمد علي');
    assert.equal(voucher.purpose, 'سلفة على الراتب');
    assert.equal(voucher.status, 'pending', 'a supervisor cannot approve vouchers');

    const updated = requestRow(ctx, id);
    assert.equal(updated.status, 'approved');
    if (variant === '008') {
      assert.equal(updated.response_notes, 'تمت الموافقة');
      assert.ok(updated.responded_at);
      assert.equal(updated.responded_by, 'u_sup');
    } else {
      assert.equal(updated.admin_response, 'تمت الموافقة');
      assert.ok(updated.response_date);
    }

    // the response carries the normalized request with the posted effect
    const fin = approved.body.request.meta.financial;
    assert.equal(fin.employeeId, 'emp_1');
    assert.equal(fin.adjustments.length, 2);
    assert.equal(fin.voucher.number, voucher.voucher_number);
    assert.ok(approved.body.effects.some((l: string) => l.includes('نوفمبر 2026') && l.includes('قسط 1 من 2')));

    // requester notified with the financial summary
    const note = ctx.DB.one<Record<string, any>>(`SELECT * FROM user_notifications WHERE type = 'request_responded' AND user_id = 'u_emp'`)!;
    assert.ok(String(note.message).includes('500.00'));

    // a second approval is refused and posts nothing
    const again = await respond(ctx, 'supervisor', { id, status: 'approved', financial: { installments: 2, startPeriod: '2026-11' } });
    assert.equal(again.status, 409);
    const viaPut = await call(respondRequestPut, ctx.env, { token: ctx.data.users.admin.token, body: { id, status: 'rejected', adminResponse: 'x' } });
    assert.equal(viaPut.status, 409);
    assert.equal(adjustments(ctx, id).length, 2);
    assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 1);

    // the employee sees the effect on /my-requests
    const mine = await call(listMine, ctx.env, { token: ctx.data.users.employee.token });
    assert.equal(mine.status, 200);
    assert.equal(mine.body.requests.length, 1);
    assert.equal(mine.body.requests[0].status, 'approved');
    assert.equal(mine.body.requests[0].meta.financial.voucher.number, voucher.voucher_number);
    assert.equal(mine.body.requests[0].adminResponse, 'تمت الموافقة');
  });

  test(`[${variant}] concurrent approvals post exactly one set of ledger rows and one voucher`, async () => {
    const ctx = await setup(variant);
    const created = await create(ctx, 'employee', { requestType: 'سلفة', advanceAmount: '600', installments: 3 });
    const id = created.body.requestId;
    const body = { id, status: 'approved', financial: { startPeriod: '2026-11' } };
    const [a, b] = await Promise.all([respond(ctx, 'supervisor', body), respond(ctx, 'admin', body)]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    assert.equal(adjustments(ctx, id).length, 3);
    assert.deepEqual(adjustments(ctx, id).map(r => r.amount), [200, 200, 200]);
    assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 1);
    assert.equal(ctx.DB.one<{ last_number: number }>(`SELECT last_number FROM voucher_sequences`)!.last_number, 1);
  });

  test(`[${variant}] guards inside the batch: a decision or payroll approval that lands first leaves nothing half-posted`, async () => {
    const ctx = await setup(variant);
    const db = ctx.DB as any;
    const original = db.batch.bind(db);
    // Runs `sneak` right before the approval batch executes (after all pre-checks passed).
    const raceWith = (sneak: () => void) => {
      db.batch = async (statements: Array<{ sql: string }>) => {
        if (statements.some(s => s.sql.includes('payroll_adjustments'))) {
          db.batch = original;
          sneak();
        }
        return original(statements);
      };
    };

    const first = await create(ctx, 'employee', { requestType: 'سلفة', advanceAmount: 900, installments: 3 });
    const id1 = first.body.requestId;
    raceWith(() => ctx.DB.raw.exec(`UPDATE employee_requests SET status = 'rejected' WHERE id = '${id1}'`));
    const lost = await respond(ctx, 'supervisor', { id: id1, status: 'approved', financial: { startPeriod: '2026-11' } });
    assert.equal(lost.status, 409);
    assert.equal(adjustments(ctx, id1).length, 0);
    assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 0);
    assert.equal(ctx.DB.query('SELECT * FROM voucher_sequences').length, 0);
    assert.equal(requestRow(ctx, id1).status, 'rejected');

    const second = await create(ctx, 'employee', { requestType: 'سلفة', advanceAmount: 900, installments: 3 });
    const id2 = second.body.requestId;
    raceWith(() => ctx.DB.raw.exec(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('run_jan', 'branch_1010', '2027-01', 'approved')`));
    const locked = await respond(ctx, 'supervisor', { id: id2, status: 'approved', financial: { startPeriod: '2026-11' } });
    assert.equal(locked.status, 409);
    assert.ok(String(locked.body.error).includes('يناير 2027'));
    assert.equal(adjustments(ctx, id2).length, 0, 'no installment may land in the still-open months either');
    assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 0);
    assert.equal(requestRow(ctx, id2).status, 'pending');
    const meta = ctx.DB.one<Record<string, any>>('SELECT * FROM employee_request_meta WHERE request_id = ?', id2)!;
    assert.equal(meta.financial_json, null);
  });

  test(`[${variant}] approval is refused for other branches, partners and employees`, async () => {
    const ctx = await setup(variant);
    const created = await create(ctx, 'employee', { requestType: 'سلفة', advanceAmount: 300 });
    const id = created.body.requestId;
    const other = await respond(ctx, 'otherSupervisor', { id, status: 'approved' });
    assert.equal(other.status, 403);
    const partner = await respond(ctx, 'partner', { id, status: 'approved' });
    assert.equal(partner.status, 403);
    const self = await respond(ctx, 'employee', { id, status: 'approved' });
    assert.equal(self.status, 403);
    const anon = await call(respondRequest, ctx.env, { body: { id, status: 'approved' } });
    assert.equal(anon.status, 401);
    const missing = await respond(ctx, 'supervisor', { id: 'req_missing', status: 'approved' });
    assert.equal(missing.status, 404);
    assert.equal(requestRow(ctx, id).status, 'pending');
    assert.equal(ctx.DB.query('SELECT * FROM payroll_adjustments').length, 0);

    // admin may decide for any branch; default start month = first open month
    const byAdmin = await respond(ctx, 'admin', { id, status: 'approved', financial: { createVoucher: true } });
    assert.equal(byAdmin.status, 200, JSON.stringify(byAdmin.body));
    const ledger = adjustments(ctx, id);
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].period, currentPeriod());
    const voucher = ctx.DB.one<Record<string, any>>('SELECT * FROM financial_vouchers')!;
    assert.equal(voucher.status, 'approved', 'the manager approves the voucher together with the request');
    assert.equal(voucher.approved_by, 'u_admin');
  });

  test(`[${variant}] a locked payroll month refuses the approval and writes nothing`, async () => {
    const ctx = await setup(variant);
    const created = await create(ctx, 'employee', { requestType: 'سلفة', advanceAmount: 1000, installments: 2 });
    const id = created.body.requestId;
    await call(listAll, ctx.env, { token: ctx.data.users.supervisor.token }); // provisions finance tables
    ctx.DB.raw.exec(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('run_dec', 'branch_1010', '2026-12', 'approved')`);

    const res = await respond(ctx, 'supervisor', { id, status: 'approved', financial: { installments: 2, startPeriod: '2026-11' } });
    assert.equal(res.status, 409);
    assert.ok(String(res.body.error).includes('ديسمبر 2026'));
    assert.equal(ctx.DB.query('SELECT * FROM payroll_adjustments').length, 0);
    assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 0);
    assert.equal(ctx.DB.query('SELECT * FROM voucher_sequences').length, 0);
    assert.equal(requestRow(ctx, id).status, 'pending');
    const meta = ctx.DB.one<Record<string, any>>('SELECT * FROM employee_request_meta WHERE request_id = ?', id)!;
    assert.equal(meta.financial_json, null);

    // a month that is open works
    const ok = await respond(ctx, 'supervisor', { id, status: 'approved', financial: { installments: 2, startPeriod: '2027-01' } });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.deepEqual(adjustments(ctx, id).map(a => a.period), ['2027-01', '2027-02']);
  });

  test(`[${variant}] rejection requires a reason and writes it into the deployment's response column`, async () => {
    const ctx = await setup(variant);
    const created = await create(ctx, 'employee', { requestType: 'سلفة', advanceAmount: 250 });
    const id = created.body.requestId;
    const noReason = await respond(ctx, 'supervisor', { id, status: 'rejected', adminResponse: '  ' });
    assert.equal(noReason.status, 400);
    const tooLong = await respond(ctx, 'supervisor', { id, status: 'approved', adminResponse: 'x'.repeat(501) });
    assert.equal(tooLong.status, 400);
    const badStatus = await respond(ctx, 'supervisor', { id, status: 'maybe' });
    assert.equal(badStatus.status, 400);

    const res = await respond(ctx, 'supervisor', { id, status: 'rejected', adminResponse: 'الميزانية لا تسمح هذا الشهر' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const row = requestRow(ctx, id);
    assert.equal(row.status, 'rejected');
    if (variant === '008') {
      assert.equal(row.response_notes, 'الميزانية لا تسمح هذا الشهر');
      assert.ok(row.responded_at);
      assert.equal(row.responded_by, 'u_sup');
    } else {
      assert.equal(row.admin_response, 'الميزانية لا تسمح هذا الشهر');
      assert.ok(row.response_date);
    }
    assert.equal(ctx.DB.query('SELECT * FROM payroll_adjustments').length, 0);
    assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 0);
    const meta = ctx.DB.one<Record<string, any>>('SELECT * FROM employee_request_meta WHERE request_id = ?', id)!;
    assert.equal(meta.responded_by_name, 'محمد أحمد');
    const note = ctx.DB.one<Record<string, any>>(`SELECT * FROM user_notifications WHERE type = 'request_responded' AND user_id = 'u_emp'`)!;
    assert.equal(note.title, 'تم رفض طلبك');

    const mine = await call(listMine, ctx.env, { token: ctx.data.users.employee.token, query: { status: 'rejected' } });
    assert.equal(mine.body.requests[0].adminResponse, 'الميزانية لا تسمح هذا الشهر');
    assert.equal(mine.body.requests[0].meta.respondedByName, 'محمد أحمد');
  });

  test(`[${variant}] approved arrears become a payroll earning`, async () => {
    const ctx = await setup(variant);
    const created = await create(ctx, 'employee', { requestType: 'صرف متأخرات', duesAmount: '750.50', reason: 'فروقات رواتب سابقة' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.requestId;
    const res = await respond(ctx, 'supervisor', { id, status: 'approved', financial: { startPeriod: '2026-11' } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const [row] = adjustments(ctx, id);
    assert.equal(row.category, 'dues');
    assert.equal(row.kind, 'earning');
    assert.equal(row.amount, 750.5);
    const payroll = await computeBranchPayroll(ctx.DB as any, 'branch_1010', '2026-11');
    const item = payroll.items.find(i => i.employeeId === 'emp_1')!;
    assert.equal(item.otherEarnings, 750.5);
    assert.equal(item.netSalary, 3500 + 750.5);
    assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 0, 'no voucher for arrears');
  });

  test(`[${variant}] unpaid leave deducts days × daily rate in the leave month; paid leave posts nothing`, async () => {
    const ctx = await setup(variant);
    const bad = await create(ctx, 'employee', { requestType: 'إجازة', leaveType: 'unpaid', leaveStart: '2026-11-12', leaveEnd: '2026-11-10' });
    assert.equal(bad.status, 400);
    const badType = await create(ctx, 'employee', { requestType: 'إجازة', leaveType: 'holiday', leaveStart: '2026-11-10', leaveEnd: '2026-11-12' });
    assert.equal(badType.status, 400);

    const created = await create(ctx, 'employee', { requestType: 'إجازة', leaveType: 'unpaid', leaveStart: '2026-11-10', leaveEnd: '2026-11-12' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.requestId;
    const meta = ctx.DB.one<Record<string, any>>('SELECT * FROM employee_request_meta WHERE request_id = ?', id)!;
    assert.equal(meta.leave_days, 3);
    assert.equal(meta.leave_type, 'unpaid');
    assert.equal(requestRow(ctx, id).vacation_date, '2026-11-10 إلى 2026-11-12');

    const tooMany = await respond(ctx, 'supervisor', { id, status: 'approved', financial: { unpaidDays: 4 } });
    assert.equal(tooMany.status, 400);

    const res = await respond(ctx, 'supervisor', { id, status: 'approved' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const rate = dailyRate({ baseSalary: 3000, supervisorAllowance: 500, incentives: 0 });
    assert.equal(rate, 116.67);
    const [row] = adjustments(ctx, id);
    assert.equal(row.category, 'unpaid_leave');
    assert.equal(row.period, '2026-11');
    assert.equal(row.quantity, 3);
    assert.equal(row.rate, rate);
    assert.equal(row.amount, 350.01);
    const payroll = await computeBranchPayroll(ctx.DB as any, 'branch_1010', '2026-11');
    assert.equal(payroll.items.find(i => i.employeeId === 'emp_1')!.absenceDeductions, 350.01);

    const annual = await create(ctx, 'employee', { requestType: 'إجازة', leaveType: 'annual', leaveStart: '2026-11-20', leaveEnd: '2026-11-21' });
    const annualRes = await respond(ctx, 'supervisor', { id: annual.body.requestId, status: 'approved' });
    assert.equal(annualRes.status, 200);
    assert.equal(adjustments(ctx, annual.body.requestId).length, 0);
    assert.equal(annualRes.body.financial, null);

    // an annual leave partially unpaid by the approver's decision
    const partial = await create(ctx, 'employee', { requestType: 'إجازة', leaveType: 'annual', leaveStart: '2026-12-01', leaveEnd: '2026-12-05' });
    const partialRes = await respond(ctx, 'supervisor', { id: partial.body.requestId, status: 'approved', financial: { unpaidDays: 1.5 } });
    assert.equal(partialRes.status, 200, JSON.stringify(partialRes.body));
    const [p] = adjustments(ctx, partial.body.requestId);
    assert.equal(p.period, '2026-12');
    assert.equal(p.amount, 175.01); // 1.5 × 116.67 = 175.005 → 175.01
  });

  test(`[${variant}] violations are filed by supervisors only and post an optional penalty`, async () => {
    const ctx = await setup(variant);
    const byEmployee = await create(ctx, 'employee', { requestType: 'مخالفة', violationDate: '2026-10-20', violationDescription: 'تأخير' });
    assert.equal(byEmployee.status, 403);

    const byOtherBranch = await create(ctx, 'otherSupervisor', { requestType: 'مخالفة', branchId: 'branch_1010', employeeId: 'emp_2', violationDate: '2026-10-20', violationDescription: 'x' });
    assert.equal(byOtherBranch.status, 403);
    const wrongEmployee = await create(ctx, 'supervisor', { requestType: 'مخالفة', employeeId: 'emp_3', violationDate: '2026-10-20', violationDescription: 'x' });
    assert.equal(wrongEmployee.status, 400);

    const created = await create(ctx, 'supervisor', { requestType: 'مخالفة', employeeId: 'emp_2', violationDate: '2026-10-20', violationDescription: 'عدم الالتزام بالزي' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.requestId;
    const row = requestRow(ctx, id);
    assert.equal(row.employee_name, 'محمد إسماعيل');
    assert.equal(row.national_id, '1002');

    // the supervisor who filed it cannot decide it — the manager does
    const ownDecision = await respond(ctx, 'supervisor', { id, status: 'approved', financial: { amount: 100, startPeriod: '2026-11' } });
    assert.equal(ownDecision.status, 403);
    const res = await respond(ctx, 'admin', { id, status: 'approved', financial: { amount: 100, startPeriod: '2026-11' } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const [adj] = adjustments(ctx, id);
    assert.equal(adj.category, 'violation');
    assert.equal(adj.employee_id, 'emp_2');
    assert.equal(adj.amount, 100);

    // warning only (no amount) posts nothing
    const warning = await create(ctx, 'supervisor', { requestType: 'مخالفة', employeeId: 'emp_2', violationDate: '2026-10-21', violationDescription: 'تنبيه' });
    const warnRes = await respond(ctx, 'admin', { id: warning.body.requestId, status: 'approved', financial: { amount: 0 } });
    assert.equal(warnRes.status, 200);
    assert.equal(adjustments(ctx, warning.body.requestId).length, 0);
  });

  test(`[${variant}] financial approval requires an active employee of the request's branch`, async () => {
    const ctx = await setup(variant);
    const created = await create(ctx, 'supervisor', { requestType: 'سلفة', employeeName: 'عامل غير مسجل', advanceAmount: 400 });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.linkedEmployee, null);
    const id = created.body.requestId;

    const unlinked = await respond(ctx, 'admin', { id, status: 'approved' });
    assert.equal(unlinked.status, 400);
    assert.ok(String(unlinked.body.error).includes('موظف'));
    const otherBranch = await respond(ctx, 'admin', { id, status: 'approved', financial: { employeeId: 'emp_3' } });
    assert.equal(otherBranch.status, 400);
    ctx.DB.raw.exec(`UPDATE employees SET is_active = 0 WHERE id = 'emp_2'`);
    const inactive = await respond(ctx, 'admin', { id, status: 'approved', financial: { employeeId: 'emp_2' } });
    assert.equal(inactive.status, 400);
    ctx.DB.raw.exec(`UPDATE employees SET is_active = 1 WHERE id = 'emp_2'`);
    assert.equal(ctx.DB.query('SELECT * FROM payroll_adjustments').length, 0);

    const linked = await respond(ctx, 'admin', { id, status: 'approved', financial: { employeeId: 'emp_2', createVoucher: false, startPeriod: '2026-11' } });
    assert.equal(linked.status, 200, JSON.stringify(linked.body));
    const [adj] = adjustments(ctx, id);
    assert.equal(adj.employee_id, 'emp_2');
    assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 0);
    const meta = ctx.DB.one<Record<string, any>>('SELECT * FROM employee_request_meta WHERE request_id = ?', id)!;
    assert.equal(meta.employee_id, 'emp_2');
    const fin = JSON.parse(meta.financial_json);
    assert.equal(fin.adjustments[0].id, adj.id);
    assert.equal(fin.voucher, null);
  });

  test(`[${variant}] resignation approval can deactivate the employee; supervisors cannot approve their own requests`, async () => {
    const ctx = await setup(variant);
    const created = await create(ctx, 'employee', { requestType: 'استقالة', resignationDate: '2026-11-30', resignationReason: 'ظروف عائلية' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(requestRow(ctx, created.body.requestId).resignation_reason, 'ظروف عائلية');
    const res = await respond(ctx, 'supervisor', { id: created.body.requestId, status: 'approved', financial: { deactivateEmployee: true } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(ctx.DB.one<{ is_active: number }>(`SELECT is_active FROM employees WHERE id = 'emp_1'`)!.is_active, 0);
    assert.equal(res.body.financial.deactivatedEmployee, true);

    const own = await create(ctx, 'supervisor', { requestType: 'صرف متأخرات', duesAmount: 100 });
    assert.equal(own.status, 201);
    const selfApprove = await respond(ctx, 'supervisor', { id: own.body.requestId, status: 'approved' });
    assert.equal(selfApprove.status, 403);
  });

  test(`[${variant}] request validation`, async () => {
    const ctx = await setup(variant);
    const cases: Array<[Record<string, unknown>, number]> = [
      [{ requestType: 'قرض' }, 400],
      [{ requestType: 'سلفة' }, 400],
      [{ requestType: 'سلفة', advanceAmount: -5 }, 400],
      [{ requestType: 'سلفة', advanceAmount: '10.123' }, 400],
      [{ requestType: 'سلفة', advanceAmount: 100, installments: 25 }, 400],
      [{ requestType: 'إجازة', leaveStart: '2026-02-30', leaveEnd: '2026-03-01' }, 400],
      [{ requestType: 'صرف متأخرات', duesAmount: 0 }, 400],
      [{ requestType: 'استئذان', permissionDate: '2026-11-01', permissionHours: 9 }, 400],
      [{ requestType: 'استئذان', permissionDate: '2026-11-01', permissionHours: 0 }, 400],
      [{ requestType: 'استئذان', permissionDate: '2026-11-01', permissionTime: '25:00', permissionHours: 2 }, 400],
      [{ requestType: 'استقالة', resignationDate: '2026-11-01' }, 400],
      [{ requestType: 'استئذان', permissionDate: '2026-11-01', permissionTime: '13:30', permissionHours: 2.5 }, 201],
      [{ requestType: 'سلفة', advanceAmount: 100, branchId: 'branch_2020' }, 403],
    ];
    for (const [body, status] of cases) {
      const res = await create(ctx, 'employee', body);
      assert.equal(res.status, status, `${JSON.stringify(body)} → ${JSON.stringify(res.body)}`);
    }
    const partner = await create(ctx, 'partner', { requestType: 'سلفة', advanceAmount: 100 });
    assert.equal(partner.status, 403);
    const adminNoBranch = await create(ctx, 'admin', { requestType: 'سلفة', advanceAmount: 100 });
    assert.equal(adminNoBranch.status, 400);
    const forOther = await create(ctx, 'employee', { requestType: 'سلفة', advanceAmount: 100, employeeId: 'emp_2' });
    assert.equal(forOther.status, 403);

    const permission = ctx.DB.one<Record<string, any>>(`SELECT * FROM employee_requests WHERE request_type = 'استئذان'`)!;
    assert.equal(permission.permission_date, '2026-11-01 13:30');
    const meta = ctx.DB.one<Record<string, any>>('SELECT * FROM employee_request_meta WHERE request_id = ?', permission.id)!;
    assert.equal(meta.permission_hours, 2.5);

    // a permission approved with a lateness deduction
    const res = await respond(ctx, 'supervisor', { id: permission.id, status: 'approved', financial: { amount: '40', startPeriod: '2026-11' } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(adjustments(ctx, permission.id)[0].category, 'late');
  });

  test(`[${variant}] branch listing, filters, stats and scoping`, async () => {
    const ctx = await setup(variant);
    const a = await create(ctx, 'employee', { requestType: 'سلفة', advanceAmount: 100 });
    await create(ctx, 'employee', { requestType: 'صرف متأخرات', duesAmount: 200 });
    await create(ctx, 'otherSupervisor', { requestType: 'مخالفة', employeeId: 'emp_3', violationDate: '2026-10-01', violationDescription: 'x' });
    await respond(ctx, 'supervisor', { id: a.body.requestId, status: 'rejected', adminResponse: 'لا' });

    const sup = await call(listAll, ctx.env, { token: ctx.data.users.supervisor.token });
    assert.equal(sup.status, 200, JSON.stringify(sup.body));
    assert.equal(sup.body.branchId, 'branch_1010');
    assert.equal(sup.body.requests.length, 2);
    assert.equal(sup.body.requests[0].requestType, 'صرف متأخرات', 'newest first');
    assert.deepEqual(
      { total: sup.body.stats.total, pending: sup.body.stats.pending, rejected: sup.body.stats.rejected, approved: sup.body.stats.approved },
      { total: 2, pending: 1, rejected: 1, approved: 0 },
    );
    assert.equal(sup.body.defaultPeriod, currentPeriod());
    const req = sup.body.requests[1];
    assert.equal(req.employeeName, 'أحمد علي');
    assert.equal(req.requesterName, 'أحمد علي');
    assert.equal(req.meta.employeeId, 'emp_1');
    assert.equal(req.adminResponse, 'لا');

    const filtered = await call(listAll, ctx.env, { token: ctx.data.users.supervisor.token, query: { status: 'pending', type: 'صرف متأخرات' } });
    assert.equal(filtered.body.requests.length, 1);
    assert.equal(filtered.body.stats.total, 2, 'stats ignore the filters');

    const crossBranch = await call(listAll, ctx.env, { token: ctx.data.users.supervisor.token, query: { branchId: 'branch_2020' } });
    assert.equal(crossBranch.status, 403);
    const adminNoBranch = await call(listAll, ctx.env, { token: ctx.data.users.admin.token });
    assert.equal(adminNoBranch.status, 400);
    const adminOther = await call(listAll, ctx.env, { token: ctx.data.users.admin.token, query: { branchId: 'branch_2020' } });
    assert.equal(adminOther.body.requests.length, 1);
    assert.equal(adminOther.body.requests[0].requestType, 'مخالفة');
    const employee = await call(listAll, ctx.env, { token: ctx.data.users.employee.token });
    assert.equal(employee.status, 403);
    const partner = await call(listAll, ctx.env, { token: ctx.data.users.partner.token });
    assert.equal(partner.status, 403);
  });

  test(`[${variant}] requester can withdraw a pending request only`, async () => {
    const ctx = await setup(variant);
    const a = await create(ctx, 'employee', { requestType: 'سلفة', advanceAmount: 100 });
    const id = a.body.requestId;
    const notMine = await call(cancelRequest, ctx.env, { token: ctx.data.users.supervisor.token, body: { id } });
    assert.equal(notMine.status, 403);
    const res = await call(cancelRequest, ctx.env, { token: ctx.data.users.employee.token, body: { id } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(requestRow(ctx, id).status, 'cancelled');
    const again = await call(cancelRequest, ctx.env, { token: ctx.data.users.employee.token, body: { id } });
    assert.equal(again.status, 409);
    const approve = await respond(ctx, 'supervisor', { id, status: 'approved' });
    assert.equal(approve.status, 409);
    assert.equal(ctx.DB.query('SELECT * FROM payroll_adjustments').length, 0);

    const mine = await call(listMine, ctx.env, { token: ctx.data.users.employee.token });
    assert.equal(mine.body.stats.cancelled, 1);
  });

  test(`[${variant}] requests filed on an employee's behalf show up and notify that employee`, async () => {
    const ctx = await setup(variant);
    const created = await create(ctx, 'supervisor', { requestType: 'مخالفة', employeeId: 'emp_1', violationDate: '2026-10-15', violationDescription: 'غياب بدون إذن' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.requestId;

    const mine = await call(listMine, ctx.env, { token: ctx.data.users.employee.token });
    assert.equal(mine.status, 200);
    assert.equal(mine.body.selfEmployeeId, 'emp_1');
    assert.equal(mine.body.requests.length, 1);
    assert.equal(mine.body.requests[0].requesterName, 'محمد أحمد');
    const withdraw = await call(cancelRequest, ctx.env, { token: ctx.data.users.employee.token, body: { id } });
    assert.equal(withdraw.status, 403);

    const res = await respond(ctx, 'admin', { id, status: 'approved', financial: { amount: 150, startPeriod: '2026-11' } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const recipients = ctx.DB.query<{ user_id: string }>(`SELECT user_id FROM user_notifications WHERE type = 'request_responded' AND related_entity = ?`, id)
      .map(r => r.user_id)
      .sort();
    assert.deepEqual(recipients, ['u_emp', 'u_sup']);

    // other employees do not see it
    const partnerView = await call(listMine, ctx.env, { token: ctx.data.users.partner.token });
    assert.equal(partnerView.body.requests.length, 0);
  });

  test(`[${variant}] employee picker: full list for supervisors, self only for employees`, async () => {
    const ctx = await setup(variant);
    const sup = await call(listEmployees, ctx.env, { token: ctx.data.users.supervisor.token });
    assert.equal(sup.status, 200);
    assert.deepEqual(sup.body.employees.map((e: any) => e.id).sort(), ['emp_1', 'emp_2']);
    const emp1 = sup.body.employees.find((e: any) => e.id === 'emp_1');
    assert.equal(emp1.dailyRate, 116.67);
    assert.equal(emp1.fixedSalary, 3500);

    const self = await call(listEmployees, ctx.env, { token: ctx.data.users.employee.token });
    assert.equal(self.status, 200);
    assert.deepEqual(self.body.employees, [{ id: 'emp_1', name: 'أحمد علي', nationalId: '1001' }]);
    assert.equal(self.body.selfEmployeeId, 'emp_1');

    const cross = await call(listEmployees, ctx.env, { token: ctx.data.users.supervisor.token, query: { branchId: 'branch_2020' } });
    assert.equal(cross.status, 403);
    const partner = await call(listEmployees, ctx.env, { token: ctx.data.users.partner.token });
    assert.equal(partner.status, 403);
    const admin = await call(listEmployees, ctx.env, { token: ctx.data.users.admin.token, query: { branchId: 'branch_2020' } });
    assert.deepEqual(admin.body.employees.map((e: any) => e.id), ['emp_3']);
  });

  test(`[${variant}] self-service requests link only by the account's full name — a typed national id never links or renames`, async () => {
    const ctx = await setup(variant);
    // An employee account whose name matches no employee record types a colleague's national id.
    const token = await addUser(ctx, 'u_x', 'xemp', 'سعيد', 'role_employee', 'branch_1010');
    const created = await call(createRequest, ctx.env, { token, body: { requestType: 'سلفة', advanceAmount: 1500, nationalId: '1002', employeeName: 'محمد إسماعيل' } });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.linkedEmployee, null, 'must not be linked to emp_2 through the typed national id');
    const id = created.body.requestId;
    const row = requestRow(ctx, id);
    assert.equal(row.employee_name, 'سعيد', 'the employee name is the account name, never the record found by the typed id');
    assert.equal(row.national_id, '1002', 'the typed id may be stored for review');
    const meta = ctx.DB.one<Record<string, any>>('SELECT * FROM employee_request_meta WHERE request_id = ?', id)!;
    assert.equal(meta.employee_id, null);

    // the picker does not offer a record either
    const picker = await call(listEmployees, ctx.env, { token });
    assert.deepEqual(picker.body.employees, []);
    assert.equal(picker.body.selfEmployeeId, null);
    // asking for the colleague's record explicitly is refused
    const explicit = await call(createRequest, ctx.env, { token, body: { requestType: 'سلفة', advanceAmount: 100, employeeId: 'emp_2' } });
    assert.equal(explicit.status, 403);

    // approval without an explicit employee choice is refused and posts nothing
    const noChoice = await respond(ctx, 'supervisor', { id, status: 'approved', financial: { amount: 1500, startPeriod: '2026-11', createVoucher: true } });
    assert.equal(noChoice.status, 400);
    assert.ok(String(noChoice.body.error).includes('موظف'));
    assert.equal(ctx.DB.query('SELECT * FROM payroll_adjustments').length, 0);
    assert.equal(ctx.DB.query('SELECT * FROM financial_vouchers').length, 0);
    assert.equal(requestRow(ctx, id).status, 'pending');

    // an account that matches by name is linked to its own record; a colleague's typed id is ignored
    const own = await create(ctx, 'employee', { requestType: 'سلفة', advanceAmount: 200, nationalId: '1002' });
    assert.equal(own.status, 201, JSON.stringify(own.body));
    assert.deepEqual(own.body.linkedEmployee, { id: 'emp_1', name: 'أحمد علي' });
    assert.equal(requestRow(ctx, own.body.requestId).national_id, '1001');

    // an account without a full name is never linked, whatever it types
    const anonToken = await addUser(ctx, 'u_y', 'yemp', null, 'role_employee', 'branch_1010');
    const anon = await call(createRequest, ctx.env, { token: anonToken, body: { requestType: 'سلفة', advanceAmount: 300, employeeName: 'محمد إسماعيل', nationalId: '1002' } });
    assert.equal(anon.status, 201, JSON.stringify(anon.body));
    assert.equal(anon.body.linkedEmployee, null);
    const anonDefault = await respond(ctx, 'supervisor', { id: anon.body.requestId, status: 'approved', financial: { startPeriod: '2026-11' } });
    assert.equal(anonDefault.status, 400);
  });

  test(`[${variant}] unpaid leave over a 31-day month deducts at most 30 days and never more than the fixed salary`, async () => {
    const ctx = await setup(variant);
    const created = await create(ctx, 'employee', { requestType: 'إجازة', leaveType: 'unpaid', leaveStart: '2027-01-01', leaveEnd: '2027-01-31' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.requestId;
    const res = await respond(ctx, 'supervisor', { id, status: 'approved', financial: {} });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const ledger = adjustments(ctx, id);
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].period, '2027-01');
    assert.equal(ledger[0].category, 'unpaid_leave');
    assert.equal(ledger[0].quantity, 30);
    assert.equal(ledger[0].amount, 3500, 'capped at the fixed salary (30 × 116.67 = 3500.10)');
    const payroll = await computeBranchPayroll(ctx.DB as any, 'branch_1010', '2027-01');
    const item = payroll.items.find(i => i.employeeId === 'emp_1')!;
    assert.equal(item.absenceDeductions, 3500);
    assert.equal(item.netSalary, 0);
    assert.ok(!item.warnings.some(w => w.includes('بالسالب')));
  });

  test(`[${variant}] unpaid leave across months posts one entry per calendar month; explicit amounts are spread by days`, async () => {
    const ctx = await setup(variant);
    const leave = { requestType: 'إجازة', leaveType: 'unpaid', leaveStart: '2026-11-15', leaveEnd: '2027-01-14' };
    const created = await create(ctx, 'employee', leave);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.requestId;
    const res = await respond(ctx, 'supervisor', { id, status: 'approved', financial: {} });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const ledger = adjustments(ctx, id);
    assert.deepEqual(ledger.map(a => a.period), ['2026-11', '2026-12', '2027-01']);
    assert.deepEqual(ledger.map(a => a.quantity), [16, 30, 14]);
    assert.deepEqual(ledger.map(a => a.amount), [1866.72, 3500, 1633.38]);
    assert.ok(ledger.every(a => a.category === 'unpaid_leave' && a.employee_id === 'emp_1' && a.rate === 116.67));
    assert.ok(String(ledger[0].description).includes('2026-11-15 – 2026-11-30'));
    assert.equal(res.body.financial.adjustments.length, 3);
    for (const [period, deducted, net] of [['2026-11', 1866.72, 1633.28], ['2026-12', 3500, 0], ['2027-01', 1633.38, 1866.62]] as const) {
      const payroll = await computeBranchPayroll(ctx.DB as any, 'branch_1010', period);
      const item = payroll.items.find(i => i.employeeId === 'emp_1')!;
      assert.equal(item.absenceDeductions, deducted, period);
      assert.equal(item.netSalary, net, period);
    }

    // an explicit amount is distributed over the months by days, halala-exact
    const explicit = await create(ctx, 'employee', leave);
    const explicitRes = await respond(ctx, 'supervisor', { id: explicit.body.requestId, status: 'approved', financial: { amount: 1000 } });
    assert.equal(explicitRes.status, 200, JSON.stringify(explicitRes.body));
    const spread = adjustments(ctx, explicit.body.requestId);
    assert.deepEqual(spread.map(a => a.period), ['2026-11', '2026-12', '2027-01']);
    assert.deepEqual(spread.map(a => a.amount), [266.66, 500, 233.34]);

    // every target month must be open: a locked middle month refuses the whole posting
    const third = await create(ctx, 'employee', leave);
    ctx.DB.raw.exec(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('run_dec', 'branch_1010', '2026-12', 'approved')`);
    const locked = await respond(ctx, 'supervisor', { id: third.body.requestId, status: 'approved', financial: {} });
    assert.equal(locked.status, 409);
    assert.ok(String(locked.body.error).includes('ديسمبر 2026'));
    assert.equal(adjustments(ctx, third.body.requestId).length, 0);
    assert.equal(requestRow(ctx, third.body.requestId).status, 'pending');
    // ... and the approver can move the schedule as a block to open months
    const shifted = await respond(ctx, 'supervisor', { id: third.body.requestId, status: 'approved', financial: { startPeriod: '2027-01' } });
    assert.equal(shifted.status, 200, JSON.stringify(shifted.body));
    assert.deepEqual(adjustments(ctx, third.body.requestId).map(a => [a.period, a.quantity]), [['2027-01', 16], ['2027-02', 30], ['2027-03', 14]]);
  });

  test(`[${variant}] a resignation cannot deactivate an employee who still has advance installments to deduct`, async () => {
    const ctx = await setup(variant);
    const start = addMonths(currentPeriod(), 1);
    const advance = await create(ctx, 'employee', { requestType: 'سلفة', advanceAmount: 1200, installments: 3 });
    const approved = await respond(ctx, 'supervisor', { id: advance.body.requestId, status: 'approved', financial: { installments: 3, startPeriod: start, createVoucher: false } });
    assert.equal(approved.status, 200, JSON.stringify(approved.body));

    const resignation = await create(ctx, 'employee', { requestType: 'استقالة', resignationDate: '2026-11-30', resignationReason: 'سفر' });
    const refused = await respond(ctx, 'supervisor', { id: resignation.body.requestId, status: 'approved', financial: { deactivateEmployee: true } });
    assert.equal(refused.status, 409);
    for (let i = 0; i < 3; i++) assert.ok(String(refused.body.error).includes(periodLabelAr(addMonths(start, i))), refused.body.error);
    assert.ok(String(refused.body.error).includes('400.00'));
    assert.ok(String(refused.body.error).includes('دون إيقاف'));
    assert.equal(ctx.DB.one<{ is_active: number }>(`SELECT is_active FROM employees WHERE id = 'emp_1'`)!.is_active, 1);
    assert.equal(requestRow(ctx, resignation.body.requestId).status, 'pending');

    // approving without deactivation is fine
    const withoutDeactivation = await respond(ctx, 'supervisor', { id: resignation.body.requestId, status: 'approved', financial: { deactivateEmployee: false } });
    assert.equal(withoutDeactivation.status, 200, JSON.stringify(withoutDeactivation.body));
    assert.equal(ctx.DB.one<{ is_active: number }>(`SELECT is_active FROM employees WHERE id = 'emp_1'`)!.is_active, 1);

    // once the remaining installments are cancelled (or already in an approved payroll), deactivation goes through
    const installments = adjustments(ctx, advance.body.requestId);
    ctx.DB.raw.prepare(`UPDATE payroll_adjustments SET payroll_run_id = 'run_x' WHERE id = ?`).run(installments[0].id);
    ctx.DB.raw.prepare(`UPDATE payroll_adjustments SET status = 'cancelled' WHERE id IN (?, ?)`).run(installments[1].id, installments[2].id);
    const again = await create(ctx, 'employee', { requestType: 'استقالة', resignationDate: '2026-12-31', resignationReason: 'سفر' });
    const deactivated = await respond(ctx, 'supervisor', { id: again.body.requestId, status: 'approved', financial: { deactivateEmployee: true } });
    assert.equal(deactivated.status, 200, JSON.stringify(deactivated.body));
    assert.equal(ctx.DB.one<{ is_active: number }>(`SELECT is_active FROM employees WHERE id = 'emp_1'`)!.is_active, 0);
  });

  test(`[${variant}] whoever filed a request, or is its subject, cannot decide it unless they are the manager`, async () => {
    const ctx = await setup(variant);
    // The supervisor (محمد أحمد) files an advance for a record spelled differently, via the employee picker.
    addEmployee(ctx, 'emp_sup', 'محمد أحمد الزهراني', '1003', 5000);
    const filed = await create(ctx, 'supervisor', { requestType: 'سلفة', advanceAmount: 3000, employeeId: 'emp_sup' });
    assert.equal(filed.status, 201, JSON.stringify(filed.body));
    const id = filed.body.requestId;
    const approve = await respond(ctx, 'supervisor', { id, status: 'approved', financial: { startPeriod: '2026-11' } });
    assert.equal(approve.status, 403);
    const reject = await respond(ctx, 'supervisor', { id, status: 'rejected', adminResponse: 'لا' });
    assert.equal(reject.status, 403);
    assert.equal(ctx.DB.query('SELECT * FROM payroll_adjustments').length, 0);
    assert.equal(requestRow(ctx, id).status, 'pending');
    const byManager = await respond(ctx, 'admin', { id, status: 'approved', financial: { startPeriod: '2026-11', createVoucher: false } });
    assert.equal(byManager.status, 200, JSON.stringify(byManager.body));

    // a request about the supervisor's own record, filed by someone else, is also the manager's
    addEmployee(ctx, 'emp_self', 'محمد أحمد', '1004', 4000);
    const aboutMe = await create(ctx, 'admin', { requestType: 'صرف متأخرات', branchId: 'branch_1010', employeeId: 'emp_self', duesAmount: 100 });
    assert.equal(aboutMe.status, 201, JSON.stringify(aboutMe.body));
    const selfDecision = await respond(ctx, 'supervisor', { id: aboutMe.body.requestId, status: 'approved', financial: { startPeriod: '2026-11' } });
    assert.equal(selfDecision.status, 403);

    // ... and so is linking someone else's unlinked request to the approver's own record
    const token = await addUser(ctx, 'u_x', 'xemp', 'سعيد', 'role_employee', 'branch_1010');
    const unlinked = await call(createRequest, ctx.env, { token, body: { requestType: 'صرف متأخرات', duesAmount: 50 } });
    const selfLink = await respond(ctx, 'supervisor', { id: unlinked.body.requestId, status: 'approved', financial: { employeeId: 'emp_self', startPeriod: '2026-11' } });
    assert.equal(selfLink.status, 403);
    assert.equal(adjustments(ctx, unlinked.body.requestId).length, 0);
  });

  test(`[${variant}] e-mail variables are HTML-escaped and '$' replacement patterns are neutralized`, async () => {
    const ctx = await setup(variant);
    ctx.DB.raw.exec(`CREATE TABLE email_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT);
                     INSERT INTO email_settings (setting_key, setting_value) VALUES ('global_enable', 'true');`);
    const sent: Array<{ subject: string; html: string; text: string }> = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: unknown, init?: { body?: unknown }) => {
      if (String(input).includes('api.resend.com')) {
        sent.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ id: 'msg_1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return realFetch(input as any, init as any);
    }) as unknown as typeof fetch;
    try {
      const created = await create(ctx, 'supervisor', {
        requestType: 'سلفة',
        employeeName: '<b>عامل</b>',
        advanceAmount: 100,
        reason: `<img src=x onerror=alert(1)> $& $' $1 $$`,
      });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      assert.equal(sent.length, 1, 'request-created e-mail sent');
      const createdMail = sent[0];
      assert.ok(!createdMail.html.includes('<img') && !createdMail.html.includes('<b>'), 'no injected markup');
      assert.ok(createdMail.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
      assert.ok(createdMail.html.includes('&lt;b&gt;عامل&lt;/b&gt;'));
      assert.ok(createdMail.html.includes('&#36;&amp; &#36;&#39; &#36;1 &#36;&#36;'), 'every $ is an entity');
      assert.ok(!createdMail.html.includes('{{'), '$& must not re-insert the placeholder');
      assert.equal(createdMail.html.split('مراجعة الطلب الآن').length, 2, "$' must not duplicate the template tail");

      const rejected = await respond(ctx, 'admin', { id: created.body.requestId, status: 'rejected', adminResponse: `<script>alert(1)</script> $' $&` });
      assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
      assert.equal(sent.length, 2, 'request-responded e-mail sent');
      const respondedMail = sent[1];
      assert.ok(!respondedMail.html.includes('<script>alert'), 'no injected script');
      assert.ok(respondedMail.html.includes('&lt;script&gt;alert(1)&lt;/script&gt; &#36;&#39; &#36;&amp;'));
      assert.ok(respondedMail.html.includes('&lt;b&gt;عامل&lt;/b&gt;'));
      assert.ok(!respondedMail.html.includes('{{'));
    } finally {
      globalThis.fetch = realFetch;
    }
  });
}

test('legacy rows created by the old code (no meta row) are listed and can be approved', async () => {
  const ctx = await setup('legacy');
  ctx.DB.raw.exec(`INSERT INTO employee_requests (id, branch_id, employee_name, request_type, request_date, advance_amount, user_id)
                   VALUES ('old_1', 'branch_1010', 'أحمد علي', 'سلفة', '2026-10-01', 300, 'u_emp')`);
  const list = await call(listAll, ctx.env, { token: ctx.data.users.supervisor.token });
  assert.equal(list.status, 200);
  assert.equal(list.body.requests[0].id, 'old_1');
  assert.equal(list.body.requests[0].status, 'pending');
  assert.equal(list.body.requests[0].meta.employeeId, null);

  const res = await respond(ctx, 'supervisor', { id: 'old_1', status: 'approved', financial: { employeeId: 'emp_1', startPeriod: '2026-11' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(adjustments(ctx, 'old_1').length, 1);
  const meta = ctx.DB.one<Record<string, any>>(`SELECT * FROM employee_request_meta WHERE request_id = 'old_1'`)!;
  assert.equal(meta.employee_id, 'emp_1');
});
