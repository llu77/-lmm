import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, call } from './harness';
import { POST as createEmployee } from '../../../pages/api/employees/create';
import { GET as listEmployees } from '../../../pages/api/employees/list';
import { PUT as updateEmployee, POST as updateEmployeePost } from '../../../pages/api/employees/update';

for (const variant of ['008', 'legacy'] as const) {
  test(`create employee validates input and scopes the branch (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    const sup = data.users.supervisor.token;

    const created = await call(createEmployee, env, {
      token: sup,
      body: { employeeName: '  سعيد   ناصر ', nationalId: '١٠٢٣٤٥٦٧٨٩', baseSalary: '4000.50', supervisorAllowance: 250, incentives: '' },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const row = DB.one<Record<string, unknown>>('SELECT * FROM employees WHERE id = ?', created.body.employee.id)!;
    assert.equal(row.branch_id, 'branch_1010');
    assert.equal(row.employee_name, 'سعيد ناصر');
    assert.equal(row.national_id, '1023456789');
    assert.equal(row.base_salary, 4000.5);
    assert.equal(row.supervisor_allowance, 250);
    assert.equal(row.incentives, 0);
    assert.equal(row.is_active, 1);

    const bad: Array<[Record<string, unknown>, number]> = [
      [{ employeeName: '', baseSalary: 1000 }, 400],
      [{ employeeName: 'أ', baseSalary: -1 }, 400],
      [{ employeeName: 'أ', baseSalary: 'abc' }, 400],
      [{ employeeName: 'أ' }, 400],
      [{ employeeName: 'أ', baseSalary: null }, 400],
      [{ employeeName: null, baseSalary: 1000 }, 400],
      [{ employeeName: 'أ', baseSalary: 1000, incentives: '1.234' }, 400],
      [{ employeeName: 'أ', baseSalary: 1000, nationalId: '12345' }, 400],
      [{ employeeName: 'أ', baseSalary: 1000, nationalId: '12345abcde' }, 400],
      [{ employeeName: 'أ', baseSalary: 1000, nationalId: '1023456789' }, 409],
      [{ employeeName: 'أ', baseSalary: 1000, branchId: 'branch_2020' }, 403],
    ];
    for (const [body, status] of bad) {
      const res = await call(createEmployee, env, { token: sup, body });
      assert.equal(res.status, status, `${JSON.stringify(body)} → ${JSON.stringify(res.body)}`);
    }

    // A zero base salary is valid (e.g. commission-only); a null national ID means "none".
    const zero = await call(createEmployee, env, { token: sup, body: { employeeName: 'متدرب', baseSalary: 0, nationalId: null } });
    assert.equal(zero.status, 201, JSON.stringify(zero.body));
    const zeroRow = DB.one<Record<string, unknown>>('SELECT * FROM employees WHERE id = ?', zero.body.employee.id)!;
    assert.equal(zeroRow.base_salary, 0);
    assert.equal(zeroRow.national_id, null);

    // Admin must pick an existing branch.
    const admin = data.users.admin.token;
    assert.equal((await call(createEmployee, env, { token: admin, body: { employeeName: 'أ', baseSalary: 1 } })).status, 400);
    assert.equal((await call(createEmployee, env, { token: admin, body: { employeeName: 'أ', baseSalary: 1, branchId: 'BR001' } })).status, 400);
    const adminCreate = await call(createEmployee, env, { token: admin, body: { employeeName: 'فهد', baseSalary: 3000, branchId: 'branch_2020' } });
    assert.equal(adminCreate.status, 201);
    assert.equal(DB.one<{ branch_id: string }>('SELECT branch_id FROM employees WHERE id = ?', adminCreate.body.employee.id)!.branch_id, 'branch_2020');

    assert.equal((await call(createEmployee, env, { token: data.users.partner.token, body: { employeeName: 'أ', baseSalary: 1 } })).status, 403);
    assert.equal(DB.one<{ n: number }>(`SELECT COUNT(*) AS n FROM audit_logs WHERE entity_type = 'employee' AND action = 'create'`)!.n, 3);
  });

  test(`update employee: same-branch supervisor allowed, other branch forbidden (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    const sup = data.users.supervisor.token;

    const res = await call(updateEmployee, env, {
      method: 'PUT',
      token: sup,
      body: { id: 'emp_1', updates: { employeeName: 'أحمد علي الزهراني', baseSalary: '3200', supervisorAllowance: 600, incentives: 100.25, nationalId: '2012345678' } },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.changed, true);
    const row = DB.one<Record<string, unknown>>(`SELECT * FROM employees WHERE id = 'emp_1'`)!;
    assert.equal(row.employee_name, 'أحمد علي الزهراني');
    assert.equal(row.base_salary, 3200);
    assert.equal(row.supervisor_allowance, 600);
    assert.equal(row.incentives, 100.25);
    assert.equal(row.national_id, '2012345678');

    // Unchanged legacy-format IDs (here '1002') do not block other edits.
    const keepId = await call(updateEmployeePost, env, { token: sup, body: { id: 'emp_2', updates: { nationalId: '1002', baseSalary: 2100 } } });
    assert.equal(keepId.status, 200, JSON.stringify(keepId.body));
    assert.equal(DB.one<{ base_salary: number }>(`SELECT base_salary FROM employees WHERE id = 'emp_2'`)!.base_salary, 2100);

    const clearId = await call(updateEmployee, env, { method: 'PUT', token: sup, body: { id: 'emp_2', updates: { nationalId: null } } });
    assert.equal(clearId.status, 200, JSON.stringify(clearId.body));
    assert.equal(DB.one<{ national_id: string | null }>(`SELECT national_id FROM employees WHERE id = 'emp_2'`)!.national_id, null);
    const zeroSalary = await call(updateEmployee, env, { method: 'PUT', token: sup, body: { id: 'emp_2', updates: { baseSalary: 0 } } });
    assert.equal(zeroSalary.status, 200);
    assert.equal(DB.one<{ base_salary: number }>(`SELECT base_salary FROM employees WHERE id = 'emp_2'`)!.base_salary, 0);
    const nullSalary = await call(updateEmployee, env, { method: 'PUT', token: sup, body: { id: 'emp_2', updates: { baseSalary: null } } });
    assert.equal(nullSalary.status, 400);

    const deactivate = await call(updateEmployee, env, { method: 'PUT', token: sup, body: { id: 'emp_2', updates: { isActive: false } } });
    assert.equal(deactivate.status, 200);
    assert.equal(DB.one<{ is_active: number }>(`SELECT is_active FROM employees WHERE id = 'emp_2'`)!.is_active, 0);

    const noop = await call(updateEmployee, env, { method: 'PUT', token: sup, body: { id: 'emp_2', updates: { isActive: 0 } } });
    assert.equal(noop.status, 200);
    assert.equal(noop.body.changed, false);

    const otherBranch = await call(updateEmployee, env, { method: 'PUT', token: sup, body: { id: 'emp_3', updates: { baseSalary: 9999 } } });
    assert.equal(otherBranch.status, 403);
    assert.equal(DB.one<{ base_salary: number }>(`SELECT base_salary FROM employees WHERE id = 'emp_3'`)!.base_salary, 2500);

    const sup2 = await call(updateEmployee, env, { method: 'PUT', token: data.users.otherSupervisor.token, body: { id: 'emp_3', updates: { incentives: 50 } } });
    assert.equal(sup2.status, 200);

    for (const [body, status] of [
      [{ id: 'emp_1', updates: { baseSalary: -10 } }, 400],
      [{ id: 'emp_1', updates: { baseSalary: '' } }, 400],
      [{ id: 'emp_1', updates: { employeeName: '   ' } }, 400],
      [{ id: 'emp_1', updates: { nationalId: '999' } }, 400],
      [{ id: 'emp_1', updates: { nationalId: '2012345678' } }, 200],
      [{ id: 'emp_2', updates: { nationalId: '2012345678' } }, 409],
      [{ id: 'emp_1', updates: { isActive: 'maybe' } }, 400],
      [{ id: 'emp_1', updates: {} }, 400],
      [{ id: 'nope', updates: { baseSalary: 1 } }, 404],
      [{ updates: { baseSalary: 1 } }, 400],
    ] as Array<[Record<string, unknown>, number]>) {
      const r = await call(updateEmployee, env, { method: 'PUT', token: sup, body });
      assert.equal(r.status, status, `${JSON.stringify(body)} → ${JSON.stringify(r.body)}`);
    }

    assert.equal((await call(updateEmployee, env, { method: 'PUT', token: data.users.partner.token, body: { id: 'emp_1', updates: { baseSalary: 1 } } })).status, 403);
    assert.equal((await call(updateEmployee, env, { method: 'PUT', token: data.users.employee.token, body: { id: 'emp_1', updates: { baseSalary: 1 } } })).status, 403);

    const admin = await call(updateEmployee, env, { method: 'PUT', token: data.users.admin.token, body: { id: 'emp_3', updates: { employeeName: 'خالد سالم العتيبي' } } });
    assert.equal(admin.status, 200);
    assert.ok(DB.one<{ n: number }>(`SELECT COUNT(*) AS n FROM audit_logs WHERE entity_type = 'employee' AND action = 'update'`)!.n >= 5);
  });

  test(`list employees is branch-scoped and hides salaries from partners (${variant})`, async () => {
    const { env, DB, data } = await setup(variant);
    DB.raw.exec(`UPDATE employees SET is_active = 0 WHERE id = 'emp_2'`);

    const sup = await call(listEmployees, env, { token: data.users.supervisor.token });
    assert.equal(sup.status, 200);
    assert.deepEqual(sup.body.employees.map((e: any) => e.id), ['emp_1']);
    assert.equal(sup.body.totalSalaryCost, 3500);
    assert.equal(sup.body.employees[0].base_salary, 3000);

    const withInactive = await call(listEmployees, env, { token: data.users.supervisor.token, query: { includeInactive: 'true' } });
    assert.deepEqual(withInactive.body.employees.map((e: any) => e.id).sort(), ['emp_1', 'emp_2']);
    assert.equal(withInactive.body.activeCount, 1);
    assert.equal(withInactive.body.totalSalaryCost, 3500);
    const activeOnly = await call(listEmployees, env, { token: data.users.supervisor.token, query: { activeOnly: '1', includeInactive: '1' } });
    assert.deepEqual(activeOnly.body.employees.map((e: any) => e.id), ['emp_1']);

    assert.equal((await call(listEmployees, env, { token: data.users.supervisor.token, query: { branchId: 'branch_2020' } })).status, 403);
    assert.equal((await call(listEmployees, env, { token: data.users.supervisor.token, query: { branchId: 'BR001' } })).status, 403);

    const admin = data.users.admin.token;
    const adminBranch = await call(listEmployees, env, { token: admin, query: { branchId: 'branch_2020', activeOnly: '1' } });
    assert.deepEqual(adminBranch.body.employees.map((e: any) => e.id), ['emp_3']);
    assert.equal(adminBranch.body.branchId, 'branch_2020');
    const adminAll = await call(listEmployees, env, { token: admin, query: { includeInactive: '1' } });
    assert.equal(adminAll.body.count, 3);
    assert.equal(adminAll.body.totalSalaryCost, 6000);

    const partner = await call(listEmployees, env, { token: data.users.partner.token });
    assert.equal(partner.status, 200);
    assert.deepEqual(partner.body.employees.map((e: any) => e.id), ['emp_1']);
    assert.equal(partner.body.employees[0].base_salary, undefined);
    assert.equal(partner.body.employees[0].national_id, undefined);
    assert.equal(partner.body.totalSalaryCost, null);

    assert.equal((await call(listEmployees, env, { token: data.users.employee.token })).status, 403);
    assert.equal((await call(listEmployees, env, {})).status, 401);
  });
}
