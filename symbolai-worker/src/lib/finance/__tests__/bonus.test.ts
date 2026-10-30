import { mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, call, type FakeD1 } from './harness';
import { MONTH_NAMES_AR, addMonths, currentPeriod, parsePeriod } from '../catalog';
import { computeBranchPayroll } from '../payroll-data';
import { ensureFinanceSchema } from '../schema';
import { pickPayableBonusRows } from '../bonus-select';
import {
  DEFAULT_BONUS_TIERS,
  attributeRevenue,
  bonusFingerprint,
  bonusRolloverSourceId,
  evaluateTier,
  isWeekComplete,
  parseLooseAmount,
  parseRevenueEmployees,
  validateTiers,
  weekRange,
  weeksOfPeriod,
} from '../bonus';
import { GET as tiersGet, POST as tiersPost } from '../../../pages/api/bonus/tiers';
import { POST as calculate, GET as calculateGet } from '../../../pages/api/bonus/calculate';
import { POST as save } from '../../../pages/api/bonus/save';
import { POST as approve } from '../../../pages/api/bonus/approve';
import { POST as reject } from '../../../pages/api/bonus/reject';
import { GET as list } from '../../../pages/api/bonus/list';

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

test('validateTiers normalizes, sorts and rejects bad tiers with Arabic errors', () => {
  const good = validateTiers([
    { minRevenue: '2,400', amount: 175 },
    { minRevenue: 1300, amount: '50' },
    { minRevenue: 1800.5, amount: 100 },
  ]);
  assert.ok(good.ok);
  assert.deepEqual(good.ok && good.tiers, [
    { minRevenue: 1300, amount: 50 },
    { minRevenue: 1800.5, amount: 100 },
    { minRevenue: 2400, amount: 175 },
  ]);

  const bad: Array<[unknown, RegExp]> = [
    [[], /شريحة واحدة/],
    [null, /شريحة واحدة/],
    [Array.from({ length: 11 }, (_, i) => ({ minRevenue: (i + 1) * 100, amount: i + 1 })), /الحد الأقصى/],
    [[{ minRevenue: 0, amount: 10 }], /حد الإيراد/],
    [[{ minRevenue: -5, amount: 10 }], /حد الإيراد/],
    [[{ minRevenue: 100, amount: 0 }], /مبلغ البونص/],
    [[{ minRevenue: 100.123, amount: 5 }], /خانتين/],
    [[{ minRevenue: 'abc', amount: 5 }], /حد الإيراد/],
    [['x'], /غير صالحة/],
    [[{ minRevenue: 1000, amount: 35 }, { minRevenue: 1000, amount: 50 }], /مكرر/],
    [[{ minRevenue: 1000, amount: 50 }, { minRevenue: 2000, amount: 35 }], /يجب ألا يقل/],
  ];
  for (const [input, pattern] of bad) {
    const result = validateTiers(input);
    assert.equal(result.ok, false, JSON.stringify(input));
    assert.match(!result.ok ? result.error : '', pattern);
  }
  // equal amounts on rising thresholds are allowed (non-decreasing)
  assert.ok(validateTiers([{ minRevenue: 1000, amount: 50 }, { minRevenue: 2000, amount: 50 }]).ok);
});

test('evaluateTier picks the highest reached tier and the gap to the next one', () => {
  const tiers = [...DEFAULT_BONUS_TIERS];
  assert.equal(evaluateTier(0, tiers).amount, 0);
  const below = evaluateTier(1299.99, tiers);
  assert.equal(below.amount, 0);
  assert.equal(below.tier, null);
  assert.equal(below.nextTier?.minRevenue, 1300);
  assert.equal(below.remainingToNext, 0.01);
  assert.equal(evaluateTier(1300, tiers).amount, 50);
  const mid = evaluateTier(2000, tiers);
  assert.equal(mid.amount, 100);
  assert.equal(mid.tier?.minRevenue, 1800);
  assert.equal(mid.remainingToNext, 400);
  const top = evaluateTier(9000, tiers);
  assert.equal(top.amount, 175);
  assert.equal(top.nextTier, null);
  assert.equal(top.remainingToNext, null);
  assert.equal(top.progressToNext, 1);
});

test('week ranges follow 1-7, 8-14, 15-21, 22-28, 29-end and skip week 5 in a 28-day month', () => {
  assert.deepEqual(weekRange('2026-10', 1), { week: 1, start: '2026-10-01', end: '2026-10-07', startDay: 1, endDay: 7, days: 7 });
  assert.equal(weekRange('2026-10', 4)?.end, '2026-10-28');
  assert.deepEqual(weekRange('2026-10', 5), { week: 5, start: '2026-10-29', end: '2026-10-31', startDay: 29, endDay: 31, days: 3 });
  assert.equal(weekRange('2026-02', 5), null);
  assert.equal(weeksOfPeriod('2026-02').length, 4);
  assert.deepEqual(weekRange('2028-02', 5), { week: 5, start: '2028-02-29', end: '2028-02-29', startDay: 29, endDay: 29, days: 1 });
  assert.equal(weekRange('2026-04', 5)?.end, '2026-04-30');
  assert.equal(weekRange('2026-10', 0), null);
  assert.equal(weekRange('2026-10', 6), null);
  assert.equal(weekRange('bad', 1), null);
  const w1 = weekRange('2026-10', 1)!;
  assert.equal(isWeekComplete(w1, '2026-10-07'), false); // last day not over yet
  assert.equal(isWeekComplete(w1, '2026-10-08'), true);
});

test('revenue employee JSON is parsed in all the shapes the cashier and the old UI used', () => {
  const amounts = (raw: unknown) => parseRevenueEmployees(raw).map(s => [s.name ?? s.employeeId, s.amountMinor / 100]);
  assert.deepEqual(amounts('[{"name":"أحمد","revenue":1500}]'), [['أحمد', 1500]]);
  assert.deepEqual(amounts([{ employeeName: 'سعيد', amount: '1,200.50' }]), [['سعيد', 1200.5]]);
  assert.deepEqual(amounts([{ employee_name: 'منى', total: 300 }, { employee: 'علي', sales: '٢٠٠' }]), [['منى', 300], ['علي', 200]]);
  assert.deepEqual(amounts([{ employee: { id: 'emp_9', name: 'فهد' }, value: 50 }]), [['فهد', 50]]);
  assert.equal(parseRevenueEmployees([{ employee_id: 'emp_1', revenue: 10 }])[0].employeeId, 'emp_1');
  assert.deepEqual(amounts({ 'أحمد علي': 700, 'محمد': { revenue: '900 ر.س' } }), [['أحمد علي', 700], ['محمد', 900]]);
  assert.deepEqual(amounts(JSON.stringify(JSON.stringify([{ name: 'x', revenue: 5 }]))), [['x', 5]]); // double-encoded
  assert.deepEqual(amounts({ date: '2026-10-01', total: 999, employees: [{ name: 'y', amount: 7 }] }), [['y', 7]]);
  assert.deepEqual(amounts([['زيد', 80]]), [['زيد', 80]]);
  for (const garbage of [null, undefined, '', 'abc', '{', 42, true, [1, 2], [{ name: 'no amount' }], [{ revenue: 100 }], [{ name: 'zero', revenue: 0 }], [{ name: 'z', revenue: 'NaN' }]]) {
    assert.deepEqual(parseRevenueEmployees(garbage), [], JSON.stringify(garbage));
  }
  // refund lines are kept (netted per employee later), in every shape
  assert.deepEqual(amounts([{ name: 'neg', revenue: -5 }]), [['neg', -5]]);
  assert.deepEqual(amounts([['زيد', '-80']]), [['زيد', -80]]);
  assert.deepEqual(amounts({ 'أحمد': 700, 'سعيد': -20 }), [['أحمد', 700], ['سعيد', -20]]);
  assert.equal(parseLooseAmount('١٬٣٠٠٫٥٠'), 1300.5);
  assert.equal(parseLooseAmount('12abc'), null);
});

test('revenue is attributed by id, then by normalized Arabic name', () => {
  const employees = [
    { id: 'emp_1', name: 'أحمد علي', active: true },
    { id: 'emp_2', name: 'محمد إسماعيل', active: true },
    { id: 'emp_x', name: 'سالم', active: false },
  ];
  const result = attributeRevenue(
    [
      { name: 'احمد  علي', employeeId: null, amountMinor: 100_00 },
      { name: 'wrong name', employeeId: 'emp_2', amountMinor: 50_00 },
      { name: 'محمد اسماعيل', employeeId: null, amountMinor: 25_00 },
      { name: 'سالم', employeeId: null, amountMinor: 10_00 },
      { name: 'مجهول', employeeId: null, amountMinor: 5_00 },
      { name: 'مجهول', employeeId: null, amountMinor: 5_00 },
    ],
    employees,
  );
  assert.equal(result.byEmployee.get('emp_1'), 100_00);
  assert.equal(result.byEmployee.get('emp_2'), 75_00);
  assert.deepEqual(result.unmatched, [
    { name: 'سالم', totalRevenue: 10, reason: 'inactive' },
    { name: 'مجهول', totalRevenue: 10, reason: 'unknown' },
  ]);
  assert.equal(bonusFingerprint([{ employeeId: 'b', bonusAmount: 5 }, { employeeId: 'a', bonusAmount: 0 }]), 'b:500');
});

// ---------------------------------------------------------------------------
// API (both schemas)
// ---------------------------------------------------------------------------

/** Last month: every week of it is complete whatever today is. */
const PERIOD = addMonths(currentPeriod(), -1);
const W2 = weekRange(PERIOD, 2)!;
const day = (n: number) => `${PERIOD}-${String(n).padStart(2, '0')}`;

function addRevenue(DB: FakeD1, id: string, date: string, total: number, employees: unknown, branchId = 'branch_1010') {
  DB.raw
    .prepare(`INSERT INTO revenues (id, branch_id, date, cash, network, budget, total, employees) VALUES (?, ?, ?, ?, 0, 0, ?, ?)`)
    .run(id, branchId, date, total, total, employees === null ? null : typeof employees === 'string' ? employees : JSON.stringify(employees));
}

function seedWeek2(DB: FakeD1) {
  addRevenue(DB, 'r1', day(8), 2100, [{ name: 'أحمد علي', revenue: 1000 }, { name: 'محمد اسماعيل', revenue: 800 }, { name: 'سامي', revenue: 300 }]);
  addRevenue(DB, 'r2', `${day(9)} 22:15:00`, 500, { 'احمد علي': 500 }); // map form + time part
  addRevenue(DB, 'r3', day(10), 400, null); // no breakdown
  addRevenue(DB, 'r_other', day(8), 9000, [{ name: 'خالد سالم', revenue: 9000 }], 'branch_2020');
  addRevenue(DB, 'r_w3', day(15), 9000, [{ name: 'أحمد علي', revenue: 9000 }]);
}

function notificationsFor(DB: FakeD1, userId: string, type: string) {
  return DB.query<Record<string, unknown>>('SELECT * FROM user_notifications WHERE user_id = ? AND type = ?', userId, type);
}

for (const variant of ['008', 'legacy'] as const) {
  test(`bonus week flow: calculate → submit → stale → resubmit → approve → payroll (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    const sup = data.users.supervisor.token;
    const admin = data.users.admin.token;
    seedWeek2(DB);

    const calc = await call(calculate, env, { token: sup, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } });
    assert.equal(calc.status, 200, JSON.stringify(calc.body));
    assert.equal(calc.body.revenueRowCount, 3);
    assert.equal(calc.body.daysWithRevenue, 3);
    assert.equal(calc.body.branchRevenue, 3000);
    assert.equal(calc.body.rowsWithoutBreakdown, 1);
    assert.equal(calc.body.weekComplete, true);
    assert.equal(calc.body.record, null);
    const emp1 = calc.body.employees.find((e: any) => e.employeeId === 'emp_1');
    const emp2 = calc.body.employees.find((e: any) => e.employeeId === 'emp_2');
    assert.equal(calc.body.employees.length, 2); // every active employee, branch_2020 excluded
    assert.deepEqual([emp1.totalRevenue, emp1.bonusAmount, emp1.tierMinRevenue, emp1.remainingToNext], [1500, 50, 1300, 300]);
    assert.deepEqual([emp2.totalRevenue, emp2.bonusAmount, emp2.tierMinRevenue, emp2.remainingToNext], [800, 0, null, 500]);
    assert.deepEqual(calc.body.unmatched, [{ name: 'سامي', totalRevenue: 300, reason: 'unknown' }]);
    assert.equal(calc.body.totalBonus, 50);
    assert.equal(calc.body.permissions.canSubmit, true);
    assert.equal(calc.body.permissions.canApproveDirectly, false);

    // GET variant + scoping
    const viaGet = await call(calculateGet, env, { token: sup, query: { branchId: 'branch_1010', period: PERIOD, week: '2' } });
    assert.equal(viaGet.body.totalBonus, 50);
    assert.equal((await call(calculate, env, { token: data.users.otherSupervisor.token, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } })).status, 403);
    assert.equal((await call(calculate, env, { token: data.users.employee.token, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } })).status, 403);
    const partnerView = await call(calculate, env, { token: data.users.partner.token, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } });
    assert.equal(partnerView.status, 200);
    assert.equal(partnerView.body.permissions.canSubmit, false);
    assert.equal((await call(save, env, { token: data.users.partner.token, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } })).status, 403);
    assert.equal((await call(save, env, { token: sup, body: { branchId: 'branch_1010', period: PERIOD, week: 2, approve: true } })).status, 403);

    // submit ("طلب بونص")
    const sent = await call(save, env, { token: sup, body: { branchId: 'branch_1010', period: PERIOD, week: 2, totalBonus: 999999 } });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    assert.equal(sent.body.record.status, 'pending');
    assert.equal(sent.body.record.total, 50); // client totals are ignored
    const firstId = sent.body.record.id;
    const row = DB.one<Record<string, unknown>>('SELECT * FROM bonus_records WHERE id = ?', firstId)!;
    assert.equal(row.month, String(parsePeriod(PERIOD)!.month));
    assert.equal(row.approved_by, null);
    if (variant === '008') {
      assert.equal(row.status, 'pending');
      assert.equal(row.total_paid, 50);
      assert.equal(row.created_by, 'u_sup');
      assert.equal(row.start_date, W2.start);
      assert.equal(row.end_date, W2.end);
    } else {
      assert.equal(row.total_bonus_paid, 50);
      assert.equal(JSON.parse(String(row.revenue_snapshot)).submittedBy, 'u_sup');
    }
    const stored = JSON.parse(String(row.employee_bonuses));
    assert.equal(stored.find((e: any) => e.employeeId === 'emp_1').bonusAmount, 50);
    const submittedNote = notificationsFor(DB, 'u_admin', 'bonus_submitted');
    assert.equal(submittedNote.length, 1);
    assert.match(String(submittedNote[0].message), /بونص الأسبوع 2 من .* — فرع لبن: 50\.00 ر\.س/);
    assert.equal(submittedNote[0].link, `/bonus?branchId=branch_1010&period=${PERIOD}&week=2`);
    assert.equal(notificationsFor(DB, 'u_sup', 'bonus_submitted').length, 0);

    // not yet in payroll
    const before = await computeBranchPayroll(DB as any, 'branch_1010', PERIOD);
    assert.equal(before.items.find(i => i.employeeId === 'emp_1')!.bonus, 0);

    // only the manager approves
    assert.equal((await call(approve, env, { token: sup, body: { id: firstId } })).status, 403);

    // revenue arrives late → stale
    addRevenue(DB, 'r4', day(14), 1000, [{ employee_id: 'emp_2', amount: 1000 }]);
    const stale = await call(approve, env, { token: admin, body: { id: firstId } });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.stale, true);
    assert.equal(stale.body.currentTotal, 150);
    const calcStale = await call(calculate, env, { token: admin, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } });
    assert.equal(calcStale.body.changedSinceSubmission, true);
    assert.equal(calcStale.body.permissions.canApprove, true);

    // resubmit replaces the pending request
    const resent = await call(save, env, { token: sup, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } });
    assert.equal(resent.status, 201);
    assert.equal(resent.body.record.total, 150);
    assert.equal(DB.query('SELECT id FROM bonus_records').length, 1);
    assert.equal((await call(approve, env, { token: admin, body: { id: firstId } })).status, 404);

    const approved = await call(approve, env, { token: admin, body: { id: resent.body.record.id } });
    assert.equal(approved.status, 200, JSON.stringify(approved.body));
    assert.equal(approved.body.record.status, 'approved');
    assert.equal(approved.body.record.approvedByName, 'المدير العام');
    const approvedRow = DB.one<Record<string, unknown>>('SELECT * FROM bonus_records WHERE id = ?', resent.body.record.id)!;
    assert.equal(approvedRow.approved_by, 'u_admin');
    assert.ok(approvedRow.approved_at);
    if (variant === '008') assert.equal(approvedRow.status, 'approved');
    const approvedNote = notificationsFor(DB, 'u_sup', 'bonus_approved');
    assert.equal(approvedNote.length, 1);
    assert.match(String(approvedNote[0].message), /يُضاف تلقائياً إلى مسير رواتب/);
    assert.equal(notificationsFor(DB, 'u_sup2', 'bonus_approved').length, 0);

    // payroll picks it up (straight from bonus_records: the month is open, no ledger rows are written)
    assert.equal(approved.body.rolledOver, false);
    assert.equal(approved.body.payrollPeriod, PERIOD);
    assert.equal(DB.query('SELECT id FROM payroll_adjustments').length, 0);
    const payroll = await computeBranchPayroll(DB as any, 'branch_1010', PERIOD);
    assert.equal(payroll.items.find(i => i.employeeId === 'emp_1')!.bonus, 50);
    assert.equal(payroll.items.find(i => i.employeeId === 'emp_2')!.bonus, 100);

    // approved weeks are final
    assert.equal((await call(save, env, { token: sup, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } })).status, 409);
    assert.equal((await call(approve, env, { token: admin, body: { id: resent.body.record.id } })).status, 409);
    assert.equal((await call(reject, env, { token: admin, body: { id: resent.body.record.id, reason: 'خطأ' } })).status, 409);

    const month = await call(list, env, { token: sup, query: { branchId: 'branch_1010', period: PERIOD } });
    assert.equal(month.status, 200);
    assert.equal(month.body.weeks.length, weeksOfPeriod(PERIOD).length);
    const wk2 = month.body.weeks.find((w: any) => w.week === 2);
    assert.equal(wk2.record.status, 'approved');
    assert.equal(wk2.record.total, 150);
    assert.equal(wk2.complete, true);
    assert.equal(month.body.approvedTotal, 150);
    assert.equal(month.body.pendingCount, 0);
    assert.deepEqual(month.body.employees.map((e: any) => [e.employeeId, e.approvedBonus]), [['emp_2', 100], ['emp_1', 50]]);
    assert.equal(month.body.weeks.find((w: any) => w.week === 1).record, null);
    assert.equal((await call(list, env, { token: data.users.employee.token, query: { branchId: 'branch_1010', period: PERIOD } })).status, 403);
    assert.equal((await call(list, env, { token: data.users.partner.token, query: { branchId: 'branch_1010', period: PERIOD } })).status, 200);
  });

  test(`manager tiers drive the bonus; only the manager may change them (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    seedWeek2(DB);
    const admin = data.users.admin.token;

    const initial = await call(tiersGet, env, { token: data.users.supervisor.token });
    assert.equal(initial.status, 200);
    assert.equal(initial.body.isDefault, true);
    assert.deepEqual(initial.body.tiers, DEFAULT_BONUS_TIERS);
    assert.equal(initial.body.canEdit, false);

    const denied = await call(tiersPost, env, { token: data.users.supervisor.token, body: { tiers: [{ minRevenue: 1000, amount: 35 }] } });
    assert.equal(denied.status, 403);
    assert.equal((await call(tiersPost, env, { token: data.users.partner.token, body: { tiers: [{ minRevenue: 1000, amount: 35 }] } })).status, 403);

    const invalid = await call(tiersPost, env, { token: admin, body: { tiers: [{ minRevenue: 1000, amount: 35 }, { minRevenue: 500, amount: 50 }] } });
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.error, /يجب ألا يقل/);

    const saved = await call(tiersPost, env, { token: admin, body: { tiers: [{ minRevenue: 1000, amount: 35 }, { minRevenue: 700, amount: 20 }] } });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.deepEqual(saved.body.tiers, [{ minRevenue: 700, amount: 20 }, { minRevenue: 1000, amount: 35 }]);
    assert.equal(DB.query(`SELECT * FROM audit_logs WHERE entity_type = 'bonus_tiers'`).length, 1);

    const calc = await call(calculate, env, { token: data.users.supervisor.token, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } });
    const byId = Object.fromEntries(calc.body.employees.map((e: any) => [e.employeeId, e.bonusAmount]));
    assert.deepEqual(byId, { emp_1: 35, emp_2: 20 });
    assert.equal(calc.body.totalBonus, 55);

    const after = await call(tiersGet, env, { token: admin });
    assert.equal(after.body.isDefault, false);
    assert.equal(after.body.updatedByName, 'المدير العام');
    assert.equal(after.body.canEdit, true);

    // a pending request computed with the old tiers becomes stale when tiers change
    const sent = await call(save, env, { token: data.users.supervisor.token, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } });
    assert.equal(sent.body.record.total, 55);
    const reset = await call(tiersPost, env, { token: admin, body: { reset: true } });
    assert.equal(reset.status, 200);
    assert.equal(reset.body.isDefault, true);
    assert.equal((await call(tiersGet, env, { token: admin })).body.isDefault, true);
    const stale = await call(approve, env, { token: admin, body: { id: sent.body.record.id } });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.stale, true);
  });

  test(`reject, resubmit, direct manager approval and guards (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    seedWeek2(DB);
    const sup = data.users.supervisor.token;
    const admin = data.users.admin.token;
    const body = { branchId: 'branch_1010', period: PERIOD, week: 2 };

    const sent = await call(save, env, { token: sup, body });
    assert.equal(sent.status, 201);
    const id = sent.body.record.id;
    assert.equal((await call(reject, env, { token: sup, body: { id, reason: 'أرقام ناقصة' } })).status, 403);
    assert.equal((await call(reject, env, { token: admin, body: { id, reason: '' } })).status, 400);

    const rejected = await call(reject, env, { token: admin, body: { id, reason: 'إيرادات يوم 10 ناقصة' } });
    assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
    const note = notificationsFor(DB, 'u_sup', 'bonus_rejected');
    assert.equal(note.length, 1);
    assert.match(String(note[0].message), /إيرادات يوم 10 ناقصة/);
    if (variant === '008') {
      const row = DB.one<Record<string, unknown>>('SELECT * FROM bonus_records WHERE id = ?', id)!;
      assert.equal(row.status, 'rejected');
      assert.equal(row.notes, 'إيرادات يوم 10 ناقصة');
      const calc = await call(calculate, env, { token: sup, body });
      assert.equal(calc.body.record.status, 'rejected');
      assert.equal(calc.body.permissions.canSubmit, true);
    } else {
      assert.equal(DB.one('SELECT * FROM bonus_records WHERE id = ?', id), undefined);
      assert.equal(DB.query(`SELECT * FROM audit_logs WHERE entity_type = 'bonus_record' AND action = 'delete'`).length, 1);
    }
    assert.equal((await call(approve, env, { token: admin, body: { id } })).status, variant === '008' ? 409 : 404);

    // resubmission after rejection
    const again = await call(save, env, { token: sup, body });
    assert.equal(again.status, 201);
    assert.equal(DB.query('SELECT id FROM bonus_records').length, 1);
    assert.equal((await call(approve, env, { token: admin, body: { id: again.body.record.id } })).status, 200);

    // manager submits and approves in one step
    addRevenue(DB, 'r_w1', day(2), 2500, [{ name: 'محمد إسماعيل', revenue: 2500 }]);
    const direct = await call(save, env, { token: admin, body: { branchId: 'branch_1010', period: PERIOD, week: 1, approve: true } });
    assert.equal(direct.status, 201, JSON.stringify(direct.body));
    assert.equal(direct.body.record.status, 'approved');
    assert.equal(direct.body.record.total, 175);
    assert.equal(notificationsFor(DB, 'u_sup', 'bonus_approved').length, 2);
    assert.equal(notificationsFor(DB, 'u_admin', 'bonus_submitted').length, 2); // only the two supervisor submissions

    // week without revenue, incomplete week, missing week 5, locked payroll
    const empty = await call(save, env, { token: sup, body: { branchId: 'branch_1010', period: PERIOD, week: 4 } });
    assert.equal(empty.status, 400);
    assert.match(empty.body.error, /لا توجد إيرادات/);
    const future = addMonths(currentPeriod(), 1);
    const incomplete = await call(save, env, { token: sup, body: { branchId: 'branch_1010', period: future, week: 1 } });
    assert.equal(incomplete.status, 400);
    assert.equal(incomplete.body.incomplete, true);
    assert.equal((await call(calculate, env, { token: sup, body: { branchId: 'branch_1010', period: '2026-02', week: 5 } })).status, 400);
    assert.equal((await call(save, env, { token: sup, body: { branchId: 'branch_1010', period: '2026-02', week: 5 } })).status, 400);
    assert.equal((await call(save, env, { token: sup, body: { branchId: 'branch_1010', period: PERIOD, week: 9 } })).status, 400);

    addRevenue(DB, 'r_w3b', day(16), 100, [{ name: 'أحمد علي', revenue: 100 }]);
    const pending3 = await call(save, env, { token: sup, body: { branchId: 'branch_1010', period: PERIOD, week: 3 } });
    assert.equal(pending3.status, 201);
    DB.raw.prepare(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('run_1', 'branch_1010', ?, 'approved')`).run(PERIOD);
    // a closed payroll no longer blocks the week: it can still be (re)submitted, and approval rolls it over
    const resent3 = await call(save, env, { token: sup, body: { branchId: 'branch_1010', period: PERIOD, week: 3 } });
    assert.equal(resent3.status, 201, JSON.stringify(resent3.body));
    assert.equal(resent3.body.record.status, 'pending');
    assert.equal(resent3.body.payrollPeriod, addMonths(PERIOD, 1));
    assert.equal((await call(approve, env, { token: admin, body: { id: pending3.body.record.id } })).status, 404); // replaced
    const calc3 = await call(calculate, env, { token: admin, body: { branchId: 'branch_1010', period: PERIOD, week: 3 } });
    assert.equal(calc3.body.locked, true);
    assert.equal(calc3.body.rolledOver, true);
    assert.equal(calc3.body.payrollPeriod, addMonths(PERIOD, 1));
    assert.equal(calc3.body.permissions.canApprove, true);
    const month = await call(list, env, { token: admin, query: { branchId: 'branch_1010', period: PERIOD } });
    assert.equal(month.body.locked, true);
    assert.equal(month.body.payrollStatus, 'approved');
    assert.equal(month.body.payrollPeriod, addMonths(PERIOD, 1));
    assert.equal(month.body.pendingCount, 1);
    assert.equal(month.body.approvedTotal, 50 + 175);
    assert.equal(month.body.rolledOverTotal, 0);
  });

  test(`legacy month names, duplicate rows and corrupt JSON are tolerated (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    seedWeek2(DB);
    const p = parsePeriod(PERIOD)!;
    const arabicMonth = MONTH_NAMES_AR[p.month - 1];
    const totalCol = variant === '008' ? 'total_paid' : 'total_bonus_paid';
    const extraCols = variant === '008' ? ', start_date, end_date, status' : '';
    const extraVals = variant === '008' ? `, '${W2.start}', '${W2.end}', 'draft'` : '';
    // an approved record written by the old page (Arabic month; legacy stored the approver's username,
    // 008 has an FK to users_new.id)
    const approver = variant === '008' ? 'u_admin' : 'boss';
    DB.raw.exec(`INSERT INTO bonus_records (id, branch_id, week_number, month, year, employee_bonuses, ${totalCol}, approved_by, approved_at${extraCols})
                 VALUES ('old_1', 'branch_1010', 1, '${arabicMonth}', ${p.year}, '[{"employeeId":"emp_1","employeeName":"أحمد علي","totalRevenue":1400,"bonusAmount":50,"bonusStatus":"x","threshold":1300}]', 50, '${approver}', '2026-01-01 10:00:00'${extraVals})`);
    // a corrupt draft for week 3
    DB.raw.exec(`INSERT INTO bonus_records (id, branch_id, week_number, month, year, employee_bonuses, ${totalCol}${extraCols})
                 VALUES ('old_2', 'branch_1010', 3, '${arabicMonth}', ${p.year}, '{not json', 0${variant === '008' ? `, '${day(15)}', '${day(21)}', 'draft'` : ''})`);

    const month = await call(list, env, { token: data.users.admin.token, query: { branchId: 'branch_1010', month: arabicMonth, year: String(p.year) } });
    assert.equal(month.status, 200, JSON.stringify(month.body));
    const w1 = month.body.weeks.find((w: any) => w.week === 1);
    assert.equal(w1.record.status, 'approved');
    assert.equal(w1.record.approvedByName, 'المدير العام'); // resolved from the username
    assert.equal(month.body.weeks.find((w: any) => w.week === 3).record.status, 'pending');
    assert.equal(month.body.approvedTotal, 50);

    // week 1 is approved under the Arabic month name → cannot be resubmitted
    addRevenue(DB, 'r_w1', day(3), 100, [{ name: 'أحمد علي', revenue: 100 }]);
    assert.equal((await call(save, env, { token: data.users.supervisor.token, body: { branchId: 'branch_1010', period: PERIOD, week: 1 } })).status, 409);

    // week 3: the corrupt draft is replaced by the new submission
    const w3 = await call(save, env, { token: data.users.supervisor.token, body: { branchId: 'branch_1010', period: PERIOD, week: 3 } });
    assert.equal(w3.status, 201, JSON.stringify(w3.body));
    assert.equal(DB.one('SELECT id FROM bonus_records WHERE id = ?', 'old_2'), undefined);
  });
}

test('revenue_employee_contributions win over the JSON of the same revenue row (008)', async () => {
  const { env, DB, data } = await setup('008');
  addRevenue(DB, 'rc1', day(9), 3000, [{ name: 'أحمد علي', revenue: 3000 }]);
  DB.raw.exec(`INSERT INTO revenue_employee_contributions (id, revenue_id, employee_id, amount) VALUES
               ('c1', 'rc1', 'emp_2', 1900), ('c2', 'rc1', 'emp_1', 1100)`);
  addRevenue(DB, 'rc2', day(10), 300, [{ name: 'أحمد علي', revenue: 300 }]); // JSON only
  const calc = await call(calculate, env, { token: data.users.supervisor.token, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } });
  assert.equal(calc.status, 200);
  const byId = Object.fromEntries(calc.body.employees.map((e: any) => [e.employeeId, [e.totalRevenue, e.bonusAmount]]));
  assert.deepEqual(byId, { emp_1: [1400, 50], emp_2: [1900, 100] });
});

// ---------------------------------------------------------------------------
// Refunds, other-branch ids, NULL status, duplicate approvals, rollover
// ---------------------------------------------------------------------------

test('refund lines are netted per employee and each total is clamped at zero', () => {
  const employees = [
    { id: 'emp_1', name: 'أحمد علي', active: true },
    { id: 'emp_2', name: 'محمد إسماعيل', active: true },
  ];
  const result = attributeRevenue(
    [
      ...parseRevenueEmployees([{ name: 'أحمد علي', revenue: 1500 }, { name: 'احمد علي', revenue: -300 }]),
      { name: null, employeeId: 'emp_1', amountMinor: 100_00 },
      { name: 'محمد إسماعيل', employeeId: null, amountMinor: 200_00 },
      { name: 'محمد اسماعيل', employeeId: null, amountMinor: -500_00 },
      { name: 'مجهول', employeeId: null, amountMinor: -50_00 },
    ],
    employees,
  );
  assert.equal(result.byEmployee.get('emp_1'), 1300_00);
  assert.equal(result.byEmployee.has('emp_2'), false); // 200 − 500 → 0, never negative
  assert.equal(result.attributedMinor, 1300_00);
  assert.deepEqual(result.unmatched, []); // a net refund is not unmatched revenue
});

test('refunds in the cashier breakdown lower the weekly bonus (API)', async () => {
  const { env, DB, data } = await setup('008');
  addRevenue(DB, 'rf1', day(8), 2000, [{ name: 'أحمد علي', revenue: 2000 }, { employeeId: 'emp_2', revenue: 100 }]);
  addRevenue(DB, 'rf2', day(9), -300, [{ name: 'أحمد علي', revenue: -300 }]);
  addRevenue(DB, 'rf3', day(10), -400, [{ employeeId: 'emp_2', revenue: -400 }]);
  const calc = await call(calculate, env, { token: data.users.supervisor.token, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } });
  assert.equal(calc.status, 200, JSON.stringify(calc.body));
  const byId = Object.fromEntries(calc.body.employees.map((e: any) => [e.employeeId, [e.totalRevenue, e.bonusAmount]]));
  assert.deepEqual(byId, { emp_1: [1700, 50], emp_2: [0, 0] });
  assert.equal(calc.body.attributedRevenue, 1700);
  assert.equal(calc.body.totalBonus, 50);
});

test('attribution: a known id settles the line — another branch or inactive, never a namesake', () => {
  const employees = [
    { id: 'emp_9', name: 'خالد سالم', active: true },
    { id: 'emp_old', name: 'سعيد', active: false },
    { id: 'emp_new', name: 'سعيد', active: true },
  ];
  const result = attributeRevenue(
    [
      { name: 'خالد سالم', employeeId: 'emp_3', amountMinor: 2000_00 }, // emp_3 works in another branch
      { name: 'سعيد', employeeId: 'emp_old', amountMinor: 300_00 }, // inactive here: not given to the active namesake
      { name: 'سعيد', employeeId: 'emp_unknown', amountMinor: 100_00 }, // unknown id: name matching applies
    ],
    employees,
    new Map([['emp_3', 'خالد سالم']]),
  );
  assert.equal(result.byEmployee.has('emp_9'), false);
  assert.equal(result.byEmployee.get('emp_new'), 100_00);
  assert.deepEqual(result.unmatched, [
    { name: 'خالد سالم', totalRevenue: 2000, reason: 'other_branch' },
    { name: 'سعيد', totalRevenue: 300, reason: 'inactive' },
  ]);
});

for (const variant of ['008', 'legacy'] as const) {
  test(`revenue of another branch's employee id is not credited to a namesake here (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    // a branch_1010 employee with the same name as emp_3 (خالد سالم, branch_2020)
    DB.raw.exec(`INSERT INTO employees (id, branch_id, employee_name, national_id, base_salary, is_active) VALUES ('emp_9', 'branch_1010', 'خالد سالم', '9009', 2000, 1)`);
    addRevenue(DB, 'ob1', day(9), 2000, [{ employeeId: 'emp_3', name: 'خالد سالم', revenue: 2000 }]);
    addRevenue(DB, 'ob2', day(10), 500, [{ employee_id: 'emp_3', amount: 500 }]); // id only: the name is looked up
    const calc = await call(calculate, env, { token: data.users.supervisor.token, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } });
    assert.equal(calc.status, 200, JSON.stringify(calc.body));
    const emp9 = calc.body.employees.find((e: any) => e.employeeId === 'emp_9');
    assert.deepEqual([emp9.totalRevenue, emp9.bonusAmount], [0, 0]);
    assert.equal(calc.body.totalBonus, 0);
    assert.deepEqual(calc.body.unmatched, [{ name: 'خالد سالم', totalRevenue: 2500, reason: 'other_branch' }]);
  });
}

test('a NULL-status row does not block resubmission (008)', async () => {
  const { env, DB, data } = await setup('008');
  seedWeek2(DB);
  const p = parsePeriod(PERIOD)!;
  DB.raw
    .prepare(
      `INSERT INTO bonus_records (id, branch_id, week_number, month, year, start_date, end_date, employee_bonuses, total_paid, status)
       VALUES ('nul', 'branch_1010', 2, ?, ?, ?, ?, '[]', 0, NULL)`,
    )
    .run(String(p.month), p.year, W2.start, W2.end);
  const body = { branchId: 'branch_1010', period: PERIOD, week: 2 };
  const calc = await call(calculate, env, { token: data.users.supervisor.token, body });
  assert.equal(calc.body.record.status, 'pending');
  assert.equal(calc.body.permissions.canSubmit, true);
  const sent = await call(save, env, { token: data.users.supervisor.token, body });
  assert.equal(sent.status, 201, JSON.stringify(sent.body));
  assert.equal(DB.one('SELECT id FROM bonus_records WHERE id = ?', 'nul'), undefined);
  assert.equal(DB.query('SELECT id FROM bonus_records').length, 1);
  assert.equal((await call(approve, env, { token: data.users.admin.token, body: { id: sent.body.record.id } })).status, 200);
});

test('pickPayableBonusRows keeps one approved row per week: the latest approval', () => {
  const rows = [
    { id: 'a', branch_id: 'b1', year: 2026, month: 'سبتمبر', week_number: 2, approved_by: 'x', approved_at: '2026-09-15 10:00:00', created_at: '2026-09-20 10:00:00' },
    { id: 'b', branch_id: 'b1', year: 2026, month: '9', week_number: 2, status: 'approved', approved_at: '2026-09-16 10:00:00', created_at: '2026-09-14 10:00:00' },
    { id: 'c', branch_id: 'b1', year: 2026, month: '09', week_number: 2, status: 'pending', created_at: '2026-09-30 10:00:00' },
    { id: 'd', branch_id: 'b1', year: 2026, month: '9', week_number: 2, status: 'paid', approved_by: 'x', approved_at: '2026-09-30 10:00:00' },
    { id: 'e', branch_id: 'b1', year: 2026, month: '9', week_number: 2, status: 'rejected', approved_by: 'x', approved_at: '2026-09-30 10:00:00' },
    // week 3: same recency → larger id wins; approved_at missing → created_at counts
    { id: 'w3a', branch_id: 'b1', year: 2026, month: '9', week_number: 3, approved_by: 'x', created_at: '2026-09-22 10:00:00' },
    { id: 'w3b', branch_id: 'b1', year: 2026, month: '9', week_number: 3, approved_by: 'x', created_at: '2026-09-22 10:00:00' },
    { id: 'w4', branch_id: 'b1', year: 2026, month: '9', week_number: 4, status: 'draft', approved_by: '' },
  ];
  assert.deepEqual(pickPayableBonusRows(rows).map(r => r.id), ['b', 'w3b']);
  assert.deepEqual(pickPayableBonusRows([]), []);
});

/** Two approved rows for week 2 of PERIOD: 35 approved first, then 50 (on 008 under two month spellings). */
function seedDoubleApproval(DB: FakeD1, variant: '008' | 'legacy') {
  const p = parsePeriod(PERIOD)!;
  const arabic = MONTH_NAMES_AR[p.month - 1];
  const entries = (amount: number) => JSON.stringify([{ employeeId: 'emp_1', employeeName: 'أحمد علي', totalRevenue: 1500, bonusAmount: amount }]);
  const rows: Array<[string, string, number, string, string]> = [
    // id, month, amount, approved_at, created_at — the 35 row was created later but approved earlier
    ['dup_35', arabic, 35, `${day(16)} 09:00:00`, `${day(15)} 12:00:00`],
    ['dup_50', variant === '008' ? String(p.month) : arabic, 50, `${day(17)} 09:00:00`, `${day(15)} 08:00:00`],
  ];
  for (const [id, month, amount, approvedAt, createdAt] of rows) {
    if (variant === '008') {
      DB.raw
        .prepare(
          `INSERT INTO bonus_records (id, branch_id, week_number, month, year, start_date, end_date, employee_bonuses, total_paid, status, approved_by, approved_at, created_at)
           VALUES (?, 'branch_1010', 2, ?, ?, ?, ?, ?, ?, 'approved', 'u_admin', ?, ?)`,
        )
        .run(id, month, p.year, W2.start, W2.end, entries(amount), amount, approvedAt, createdAt);
    } else {
      DB.raw
        .prepare(
          `INSERT INTO bonus_records (id, branch_id, week_number, month, year, employee_bonuses, total_bonus_paid, approved_by, approved_at, created_at)
           VALUES (?, 'branch_1010', 2, ?, ?, ?, ?, 'boss', ?, ?)`,
        )
        .run(id, month, p.year, entries(amount), amount, approvedAt, createdAt);
    }
  }
}

for (const variant of ['008', 'legacy'] as const) {
  test(`the bonus page shows what payroll pays when a week has several approved rows (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    seedDoubleApproval(DB, variant);
    const month = await call(list, env, { token: data.users.admin.token, query: { branchId: 'branch_1010', period: PERIOD } });
    assert.equal(month.status, 200, JSON.stringify(month.body));
    const payroll = await computeBranchPayroll(DB as any, 'branch_1010', PERIOD);
    const paid = payroll.items.find(i => i.employeeId === 'emp_1')!.bonus;
    assert.equal(paid, 50);
    assert.equal(month.body.approvedTotal, paid);
    assert.deepEqual(month.body.employees.map((e: any) => [e.employeeId, e.approvedBonus, e.weeks]), [['emp_1', 50, [2]]]);
    const w2 = month.body.weeks.find((w: any) => w.week === 2);
    assert.equal(w2.record.id, 'dup_50');
    assert.equal(w2.record.total, 50);
    assert.equal(w2.multipleApproved, true);
    const calc = await call(calculate, env, { token: data.users.admin.token, body: { branchId: 'branch_1010', period: PERIOD, week: 2 } });
    assert.equal(calc.body.record.id, 'dup_50');
  });

  test(`a week is approved once: a duplicate pending row cannot be approved too (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    const p = parsePeriod(PERIOD)!;
    const arabic = MONTH_NAMES_AR[p.month - 1];
    addRevenue(DB, 'r1', day(9), 2000, [{ name: 'أحمد علي', revenue: 2000 }]);
    const entries = JSON.stringify([{ employeeId: 'emp_1', employeeName: 'أحمد علي', totalRevenue: 2000, bonusAmount: 100 }]);
    for (const id of ['P1', 'P2']) {
      if (variant === 'legacy') {
        DB.raw
          .prepare(`INSERT INTO bonus_records (id, branch_id, week_number, month, year, employee_bonuses, total_bonus_paid) VALUES (?, 'branch_1010', 2, ?, ?, ?, 100)`)
          .run(id, arabic, p.year, entries);
      } else {
        DB.raw
          .prepare(
            `INSERT INTO bonus_records (id, branch_id, week_number, month, year, start_date, end_date, employee_bonuses, total_paid, status)
             VALUES (?, 'branch_1010', 2, ?, ?, ?, ?, ?, 100, 'draft')`,
          )
          .run(id, id === 'P1' ? arabic : String(p.month), p.year, W2.start, W2.end, entries);
      }
    }
    const admin = data.users.admin.token;
    assert.equal((await call(approve, env, { token: admin, body: { id: 'P1' } })).status, 200);
    const second = await call(approve, env, { token: admin, body: { id: 'P2' } });
    assert.equal(second.status, 409);
    assert.equal(second.body.duplicate, true);
    const p2 = DB.one<Record<string, unknown>>('SELECT * FROM bonus_records WHERE id = ?', 'P2')!;
    assert.equal(p2.approved_by, null);

    // the SQL guard alone also refuses (race: both requests passed the pre-check)
    const { approveStatement, getBonusSchema } = await import('../bonus');
    const schema = await getBonusSchema(DB as any);
    const raced = await approveStatement(DB as any, schema, { id: 'P2', branchId: 'branch_1010', period: PERIOD, week: 2 }, 'u_admin').run();
    assert.equal(Number(raced.meta?.changes ?? 0), 0);

    const month = await call(list, env, { token: admin, query: { branchId: 'branch_1010', period: PERIOD } });
    assert.equal(month.body.approvedTotal, 100);
    assert.equal(month.body.weeks.find((w: any) => w.week === 2).multipleApproved, false);
    const payroll = await computeBranchPayroll(DB as any, 'branch_1010', PERIOD);
    assert.equal(payroll.items.find(i => i.employeeId === 'emp_1')!.bonus, 100);
  });
}

/** 09:00 in Riyadh on 1 November 2026: every week of October is over. */
const NOV_1 = Date.parse('2026-11-01T06:00:00Z');

for (const variant of ['008', 'legacy'] as const) {
  test(`a late week of a paid payroll month rolls over to the next open payroll (${variant})`, async () => {
    mock.timers.enable({ apis: ['Date'], now: NOV_1 });
    try {
      const { env, DB, data } = await setup(variant);
      await ensureFinanceSchema(DB as any);
      const sup = data.users.supervisor.token;
      const admin = data.users.admin.token;
      addRevenue(DB, 'oct_w5', '2026-10-30', 2000, [{ name: 'أحمد علي', revenue: 2000 }]);
      addRevenue(DB, 'oct_w4', '2026-10-25', 2500, [{ name: 'محمد إسماعيل', revenue: 2500 }]);
      DB.raw.exec(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('run_oct', 'branch_1010', '2026-10', 'paid')`);
      const week5 = { branchId: 'branch_1010', period: '2026-10', week: 5 };

      // October's payroll is approved and paid, yet week 5 can still be sent…
      const calc = await call(calculate, env, { token: sup, body: week5 });
      assert.equal(calc.status, 200, JSON.stringify(calc.body));
      assert.equal(calc.body.weekComplete, true);
      assert.equal(calc.body.locked, true);
      assert.equal(calc.body.rolledOver, true);
      assert.equal(calc.body.payrollPeriod, '2026-11');
      assert.equal(calc.body.permissions.canSubmit, true);
      const sent = await call(save, env, { token: sup, body: week5 });
      assert.equal(sent.status, 201, JSON.stringify(sent.body));
      assert.equal(sent.body.record.status, 'pending');
      assert.equal(DB.query('SELECT id FROM payroll_adjustments').length, 0); // nothing before approval
      const id = sent.body.record.id;

      // …and approved on 1 November: it goes to November's payroll as ledger entries
      const approved = await call(approve, env, { token: admin, body: { id } });
      assert.equal(approved.status, 200, JSON.stringify(approved.body));
      assert.equal(approved.body.rolledOver, true);
      assert.equal(approved.body.payrollPeriod, '2026-11');
      assert.equal(approved.body.record.status, 'approved');
      assert.equal(approved.body.record.rolloverPeriod, '2026-11');
      assert.match(approved.body.message, /نوفمبر 2026/);
      const rows = DB.query<Record<string, unknown>>('SELECT * FROM payroll_adjustments');
      assert.equal(rows.length, 1);
      const r = rows[0];
      assert.deepEqual(
        [r.branch_id, r.employee_id, r.employee_name, r.period, r.kind, r.category, r.amount, r.source_type, r.source_id, r.status, r.created_by],
        ['branch_1010', 'emp_1', 'أحمد علي', '2026-11', 'earning', 'bonus', 100, 'bonus_record', `${id}:emp_1`, 'active', 'u_admin'],
      );
      assert.equal(r.source_id, bonusRolloverSourceId(id, 'emp_1'));
      assert.equal(r.description, 'بونص الأسبوع 5 من أكتوبر 2026 (مرحّل)');
      const nov = await computeBranchPayroll(DB as any, 'branch_1010', '2026-11');
      assert.equal(nov.items.find(i => i.employeeId === 'emp_1')!.bonus, 100);
      const note = notificationsFor(DB, 'u_sup', 'bonus_approved');
      assert.equal(note.length, 1);
      assert.match(String(note[0].message), /يُضاف تلقائياً إلى مسير رواتب نوفمبر 2026/);

      // the manager's one-step "submit and approve" rolls over the same way
      const direct = await call(save, env, { token: admin, body: { ...week5, week: 4, approve: true } });
      assert.equal(direct.status, 201, JSON.stringify(direct.body));
      assert.equal(direct.body.rolledOver, true);
      assert.equal(direct.body.record.rolloverPeriod, '2026-11');
      const directRow = DB.one<Record<string, unknown>>('SELECT * FROM payroll_adjustments WHERE source_id = ?', `${direct.body.record.id}:emp_2`)!;
      assert.deepEqual([directRow.period, directRow.category, directRow.amount], ['2026-11', 'bonus', 175]);
      assert.equal(directRow.description, 'بونص الأسبوع 4 من أكتوبر 2026 (مرحّل)');

      // October's month view says where the bonus went
      const month = await call(list, env, { token: sup, query: { branchId: 'branch_1010', period: '2026-10' } });
      assert.equal(month.body.locked, true);
      assert.equal(month.body.payrollPeriod, '2026-11');
      assert.equal(month.body.approvedTotal, 275);
      assert.equal(month.body.rolledOverTotal, 275);
      assert.equal(month.body.weeks.find((w: any) => w.week === 5).record.rolloverPeriod, '2026-11');
      assert.equal(month.body.weeks.find((w: any) => w.week === 4).record.rolloverPeriod, '2026-11');
    } finally {
      mock.timers.reset();
    }
  });
}

test('rollover skips closed months and lands all-or-nothing (008)', async () => {
  mock.timers.enable({ apis: ['Date'], now: NOV_1 });
  try {
    const { env, DB, data } = await setup('008');
    await ensureFinanceSchema(DB as any);
    addRevenue(DB, 'oct_w5', '2026-10-30', 2000, [{ name: 'أحمد علي', revenue: 1500 }, { name: 'محمد إسماعيل', revenue: 500 }]);
    DB.raw.exec(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('run_oct', 'branch_1010', '2026-10', 'paid'), ('run_nov', 'branch_1010', '2026-11', 'approved')`);
    const sent = await call(save, env, { token: data.users.supervisor.token, body: { branchId: 'branch_1010', period: '2026-10', week: 5 } });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    assert.equal(sent.body.payrollPeriod, '2026-12'); // October and November are both closed
    const id = sent.body.record.id;

    // December's payroll gets approved while the bonus approval is in flight → nothing lands
    const realBatch = DB.batch.bind(DB);
    (DB as any).batch = async (statements: any[]) => {
      if (statements.some(st => /INTO payroll_adjustments/.test(st.sql))) {
        (DB as any).batch = realBatch;
        DB.raw.exec(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('run_dec', 'branch_1010', '2026-12', 'approved')`);
      }
      return realBatch(statements);
    };
    const raced = await call(approve, env, { token: data.users.admin.token, body: { id } });
    assert.equal(raced.status, 409, JSON.stringify(raced.body));
    (DB as any).batch = realBatch;
    assert.equal(DB.query('SELECT id FROM payroll_adjustments').length, 0);
    assert.equal(DB.one<Record<string, unknown>>('SELECT status, approved_by FROM bonus_records WHERE id = ?', id)!.status, 'pending');

    // retried: January 2027 is the first open payroll now
    const again = await call(approve, env, { token: data.users.admin.token, body: { id } });
    assert.equal(again.status, 200, JSON.stringify(again.body));
    assert.equal(again.body.payrollPeriod, '2027-01');
    const rows = DB.query<Record<string, unknown>>('SELECT employee_id, period, amount, source_id FROM payroll_adjustments ORDER BY employee_id');
    assert.deepEqual(rows, [{ employee_id: 'emp_1', period: '2027-01', amount: 50, source_id: `${id}:emp_1` }]); // emp_2 (500) earned nothing
  } finally {
    mock.timers.reset();
  }
});
