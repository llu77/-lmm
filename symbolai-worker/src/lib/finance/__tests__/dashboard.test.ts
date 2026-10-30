import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, call } from './harness';
import { GET as stats } from '../../../pages/api/dashboard/stats';
import { todayIso } from '../catalog';

test('dashboard stats: empty month, unknown branch, date boundaries, no session', async () => {
  const { env, DB, data } = await setup('008');

  const empty = await call(stats, env, { token: data.users.supervisor.token });
  assert.equal(empty.status, 200);
  assert.equal(empty.body.stats.totalRevenue, 0);
  assert.equal(empty.body.stats.netProfit, 0);
  assert.equal(empty.body.chartData.length, 7);
  assert.ok(empty.body.chartData.every((d: any) => d.revenue === 0));

  // A branch id that does not exist: admin may ask, gets zeros rather than an error.
  const ghost = await call(stats, env, { token: data.users.admin.token, query: { branchId: 'no_such_branch' } });
  assert.equal(ghost.status, 200);
  assert.equal(ghost.body.stats.totalRevenue, 0);
  assert.equal(ghost.body.stats.employeeCount, 0);

  // Only the current month counts toward the monthly total.
  const today = todayIso();
  const lastMonth = new Date(`${today.slice(0, 8)}01T00:00:00Z`);
  lastMonth.setUTCDate(0);
  const lastMonthDay = lastMonth.toISOString().slice(0, 10);
  DB.raw.prepare(`INSERT INTO revenues (id, branch_id, date, cash, network, budget, total) VALUES (?, ?, ?, 0, 0, 0, ?)`).run('old', 'branch_1010', lastMonthDay, 999);
  DB.raw.prepare(`INSERT INTO revenues (id, branch_id, date, cash, network, budget, total) VALUES (?, ?, ?, 0, 0, 0, ?)`).run('now', 'branch_1010', today, 0.1);
  DB.raw.prepare(`INSERT INTO revenues (id, branch_id, date, cash, network, budget, total) VALUES (?, ?, ?, 0, 0, 0, ?)`).run('now2', 'branch_1010', today, 0.2);
  const month = await call(stats, env, { token: data.users.supervisor.token });
  assert.equal(month.body.stats.totalRevenue, 0.3);

  const anon = await call(stats, env, {});
  assert.equal(anon.status, 401);
});

for (const variant of ['008', 'legacy'] as const) {
  test(`dashboard stats use the real branch (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    const today = todayIso();
    DB.raw.prepare(`INSERT INTO revenues (id, branch_id, date, cash, network, budget, total) VALUES (?, ?, ?, 0, 0, 0, ?)`).run('r1', 'branch_1010', today, 1500);
    DB.raw.prepare(`INSERT INTO revenues (id, branch_id, date, cash, network, budget, total) VALUES (?, ?, ?, 0, 0, 0, ?)`).run('r2', 'branch_2020', today, 700);

    const sup = await call(stats, env, { token: data.users.supervisor.token });
    assert.equal(sup.status, 200);
    assert.equal(sup.body.stats.totalRevenue, 1500);
    assert.equal(sup.body.stats.employeeCount, 2);

    const supOther = await call(stats, env, { token: data.users.supervisor.token, query: { branchId: 'branch_2020' } });
    assert.equal(supOther.status, 403);

    const adminAll = await call(stats, env, { token: data.users.admin.token });
    assert.equal(adminAll.body.stats.totalRevenue, 2200);
    const adminOne = await call(stats, env, { token: data.users.admin.token, query: { branchId: 'branch_2020' } });
    assert.equal(adminOne.body.stats.totalRevenue, 700);
    assert.deepEqual(adminOne.body.notifications, []);
  });
}

test('dashboard never echoes a non-date revenue value and hides figures from employees', async () => {
  const { env, DB, data } = await setup('008');
  const today = todayIso();
  DB.raw.prepare(`INSERT INTO revenues (id, branch_id, date, cash, network, budget, total) VALUES (?, ?, ?, 0, 0, 0, ?)`)
    .run('evil', 'branch_1010', `${today}<img src=x onerror=alert(1)>`, 10);
  DB.raw.prepare(`INSERT INTO revenues (id, branch_id, date, cash, network, budget, total) VALUES (?, ?, ?, 0, 0, 0, ?)`)
    .run('ok', 'branch_1010', today, 20);

  const admin = await call(stats, env, { token: data.users.admin.token, query: { branchId: 'branch_1010' } });
  const titles = admin.body.recentActivities.map((a: any) => a.title);
  assert.ok(titles.every((t: string) => !t.includes('<')), JSON.stringify(titles));
  assert.ok(titles.includes(`إيراد بتاريخ ${today}`));

  const employee = await call(stats, env, { token: data.users.employee.token });
  assert.equal(employee.status, 200);
  assert.equal(employee.body.stats.totalRevenue, 0);
  assert.equal(employee.body.stats.employeeCount, 0);
  assert.deepEqual(employee.body.recentActivities, []);
  assert.ok(employee.body.chartData.every((d: any) => d.revenue === 0));
});

test('7-day chart includes last month while monthly totals do not', async () => {
  const { env, DB, data } = await setup('008');
  const today = todayIso();
  const sixAgo = new Date(`${today}T00:00:00Z`);
  sixAgo.setUTCDate(sixAgo.getUTCDate() - 6);
  const sixAgoIso = sixAgo.toISOString().slice(0, 10);
  DB.raw.prepare(`INSERT INTO revenues (id, branch_id, date, cash, network, budget, total) VALUES (?, ?, ?, 0, 0, 0, ?)`)
    .run('old', 'branch_1010', sixAgoIso, 5000);
  const res = await call(stats, env, { token: data.users.supervisor.token });
  assert.equal(res.body.chartData[0].date, sixAgoIso);
  assert.equal(res.body.chartData[0].revenue, 5000);
  const sameMonth = sixAgoIso.slice(0, 7) === today.slice(0, 7);
  assert.equal(res.body.stats.totalRevenue, sameMonth ? 5000 : 0);
});
