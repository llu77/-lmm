// PUT|POST /api/employees/update {id, updates:{employeeName?, nationalId?, baseSalary?, supervisorAllowance?, incentives?, isActive?}}
// (the fields may also be sent at the top level). Requires canManageEmployees
// and access to the employee's branch. Only columns present on the live
// employees table are written.

import type { APIRoute } from 'astro';
import { canAccessBranch, logAudit } from '@/lib/permissions';
import { parseNonNegativeAmount, round2 } from '@/lib/finance/money';
import { getTableColumns } from '@/lib/finance/schema';
import { clientIp, fail, financeAuth, ok, readJsonObject, str } from '@/lib/finance/http';
import { MAX_EMPLOYEE_NAME_LENGTH, cleanEmployeeName, nationalIdTaken, parseNationalId } from './create';

function pick(source: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
  return undefined;
}

function parseBoolean(value: unknown): boolean | null {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return null;
}

const handler: APIRoute = async context => {
  const auth = await financeAuth(context, ['canManageEmployees']);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);
  const id = str(body.id, 100);
  if (!id) return fail('معرف الموظف مطلوب', 400);
  const updates =
    body.updates && typeof body.updates === 'object' && !Array.isArray(body.updates)
      ? (body.updates as Record<string, unknown>)
      : body;
  const known = [
    'employeeName', 'employee_name', 'nationalId', 'national_id', 'baseSalary', 'base_salary',
    'supervisorAllowance', 'supervisor_allowance', 'incentives', 'isActive', 'is_active',
  ];
  if (!known.some(key => Object.prototype.hasOwnProperty.call(updates, key))) return fail('لا توجد بيانات للتحديث', 400);

  try {
    const row = await db.prepare('SELECT * FROM employees WHERE id = ?').bind(id).first<Record<string, unknown>>();
    if (!row) return fail('الموظف غير موجود', 404);
    const branchId = String(row.branch_id ?? '');
    if (!canAccessBranch(session, branchId)) return fail('لا يمكنك تعديل موظف في فرع آخر', 403);

    const columns = await getTableColumns(db, 'employees');
    const sets: string[] = [];
    const params: unknown[] = [];
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const assign = (column: string, value: unknown) => {
      if (!columns.has(column)) return;
      const current = row[column] ?? null;
      const same = typeof value === 'number' ? round2(current) === value && current !== null : current === value;
      if (same) return;
      sets.push(`${column} = ?`);
      params.push(value);
      changes[column] = { from: current, to: value };
    };

    const nameInput = pick(updates, 'employeeName', 'employee_name');
    if (nameInput !== undefined) {
      const name = cleanEmployeeName(nameInput);
      if (!name) return fail('اسم الموظف مطلوب', 400);
      if (name.length > MAX_EMPLOYEE_NAME_LENGTH) return fail(`اسم الموظف طويل جداً (${MAX_EMPLOYEE_NAME_LENGTH} حرف كحد أقصى)`, 400);
      assign('employee_name', name);
    }

    const nationalInput = pick(updates, 'nationalId', 'national_id');
    if (nationalInput !== undefined) {
      const current = row.national_id === null || row.national_id === undefined ? null : String(row.national_id);
      const raw = nationalInput === null ? '' : String(nationalInput).trim();
      // Old records may hold other formats; only a changed value must be a valid 10-digit ID.
      if (raw !== (current ?? '')) {
        const parsed = parseNationalId(nationalInput);
        if ('error' in parsed) return fail(parsed.error, 400);
        if (parsed.value && parsed.value !== current && (await nationalIdTaken(db, parsed.value, id))) {
          return fail('رقم الهوية / الإقامة مسجل مسبقاً لموظف آخر', 409);
        }
        assign('national_id', parsed.value);
      }
    }

    const amountFields: Array<[string, string[], string]> = [
      ['base_salary', ['baseSalary', 'base_salary'], 'الراتب الأساسي'],
      ['supervisor_allowance', ['supervisorAllowance', 'supervisor_allowance'], 'بدل الإشراف'],
      ['incentives', ['incentives'], 'الحوافز'],
    ];
    for (const [column, keys, label] of amountFields) {
      const input = pick(updates, ...keys);
      if (input === undefined) continue;
      const value = input === null || input === '' ? (column === 'base_salary' ? null : 0) : parseNonNegativeAmount(input);
      if (value === null) return fail(`${label} يجب أن يكون رقماً صحيحاً غير سالب (منزلتان عشريتان كحد أقصى)`, 400);
      assign(column, value);
    }

    const activeInput = pick(updates, 'isActive', 'is_active');
    if (activeInput !== undefined) {
      const active = parseBoolean(activeInput);
      if (active === null) return fail('حالة الموظف غير صالحة', 400);
      assign('is_active', active ? 1 : 0);
    }

    if (sets.length > 0) {
      if (columns.has('updated_at')) sets.push(`updated_at = datetime('now')`);
      try {
        await db
          .prepare(`UPDATE employees SET ${sets.join(', ')} WHERE id = ? AND branch_id = ?`)
          .bind(...params, id, branchId)
          .run();
      } catch (error) {
        if (String(error).includes('UNIQUE')) return fail('رقم الهوية / الإقامة مسجل مسبقاً لموظف آخر', 409);
        throw error;
      }
      await logAudit(
        db,
        session,
        'update',
        'employee',
        id,
        { branchId, changes },
        clientIp(context.request),
        context.request.headers.get('User-Agent') || undefined,
      );
    }

    const updated = await db.prepare('SELECT * FROM employees WHERE id = ?').bind(id).first<Record<string, unknown>>();
    return ok({ employee: updated, changed: sets.length > 0 });
  } catch (error) {
    console.error('Update employee error:', error);
    return fail('حدث خطأ أثناء تحديث بيانات الموظف', 500);
  }
};

export const PUT = handler;
export const POST = handler;
