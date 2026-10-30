// POST /api/employees/create {branchId, employeeName, nationalId?, baseSalary, supervisorAllowance?, incentives?}
// Adds an employee to a branch. Amounts are validated as non-negative SAR with
// at most 2 decimals; the national ID / iqama number is optional (10 digits).

import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { logAudit } from '@/lib/permissions';
import { parseNonNegativeAmount } from '@/lib/finance/money';
import { buildAdaptiveInsert, getTableColumns, pickColumn } from '@/lib/finance/schema';
import { clientIp, fail, financeAuth, newId, ok, readJsonObject, resolveBranchId } from '@/lib/finance/http';

export const MAX_EMPLOYEE_NAME_LENGTH = 100;

/** Arabic-Indic / Persian digits → Western digits. */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0));
}

/** Trimmed, single-spaced name; null if empty or not a string. */
export function cleanEmployeeName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.replace(/\s+/g, ' ').trim();
  return name ? name : null;
}

/**
 * Saudi national ID / iqama: exactly 10 digits. Returns the normalized value,
 * null when empty, or an Arabic error message.
 */
export function parseNationalId(value: unknown): { value: string | null } | { error: string } {
  if (value === undefined || value === null) return { value: null };
  if (typeof value !== 'string' && typeof value !== 'number') return { error: 'رقم الهوية / الإقامة غير صالح' };
  const text = normalizeDigits(String(value)).replace(/[\s-]/g, '');
  if (!text) return { value: null };
  if (!/^\d{10}$/.test(text)) return { error: 'رقم الهوية / الإقامة يجب أن يتكون من 10 أرقام فقط' };
  return { value: text };
}

/** Another employee already holding this national ID (the legacy schema even enforces it as UNIQUE). */
export async function nationalIdTaken(db: D1Database, nationalId: string, exceptId: string | null): Promise<boolean> {
  const row = await db
    .prepare('SELECT id FROM employees WHERE national_id = ? AND id != ? LIMIT 1')
    .bind(nationalId, exceptId ?? '')
    .first<{ id: string }>();
  return row !== null;
}

/** true / false, or null when the branches table cannot be checked. */
async function branchExists(db: D1Database, branchId: string): Promise<boolean | null> {
  const columns = await getTableColumns(db, 'branches');
  const idColumn = pickColumn(columns, 'id', 'branch_id');
  if (!idColumn) return null;
  const row = await db.prepare(`SELECT 1 AS found FROM branches WHERE ${idColumn} = ?`).bind(branchId).first();
  return row !== null;
}

function amountField(value: unknown, label: string, required: boolean): number | string {
  if (value === undefined || value === null || value === '') {
    return required ? `${label} مطلوب` : 0;
  }
  const parsed = parseNonNegativeAmount(value);
  return parsed === null ? `${label} يجب أن يكون رقماً صحيحاً غير سالب (منزلتان عشريتان كحد أقصى)` : parsed;
}

export const POST: APIRoute = async context => {
  const auth = await financeAuth(context, ['canManageEmployees']);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);

  const branchId = resolveBranchId(session, body.branchId);
  if (branchId instanceof Response) return branchId;

  const employeeName = cleanEmployeeName(body.employeeName);
  if (!employeeName) return fail('اسم الموظف مطلوب', 400);
  if (employeeName.length > MAX_EMPLOYEE_NAME_LENGTH) return fail(`اسم الموظف طويل جداً (${MAX_EMPLOYEE_NAME_LENGTH} حرف كحد أقصى)`, 400);

  const nationalId = parseNationalId(body.nationalId);
  if ('error' in nationalId) return fail(nationalId.error, 400);

  const baseSalary = amountField(body.baseSalary, 'الراتب الأساسي', true);
  if (typeof baseSalary === 'string') return fail(baseSalary, 400);
  const supervisorAllowance = amountField(body.supervisorAllowance, 'بدل الإشراف', false);
  if (typeof supervisorAllowance === 'string') return fail(supervisorAllowance, 400);
  const incentives = amountField(body.incentives, 'الحوافز', false);
  if (typeof incentives === 'string') return fail(incentives, 400);

  try {
    if ((await branchExists(db, branchId)) === false) return fail('الفرع غير موجود', 400);
    if (nationalId.value && (await nationalIdTaken(db, nationalId.value, null))) {
      return fail('رقم الهوية / الإقامة مسجل مسبقاً لموظف آخر', 409);
    }

    const id = newId('emp');
    const columns = await getTableColumns(db, 'employees');
    const insert = buildAdaptiveInsert('employees', columns, {
      id,
      branch_id: branchId,
      employee_name: employeeName,
      national_id: nationalId.value,
      base_salary: baseSalary,
      supervisor_allowance: supervisorAllowance,
      incentives,
      is_active: 1,
    });
    try {
      await db.prepare(insert.sql).bind(...insert.params).run();
    } catch (error) {
      if (String(error).includes('UNIQUE')) return fail('رقم الهوية / الإقامة مسجل مسبقاً لموظف آخر', 409);
      throw error;
    }

    await logAudit(
      db,
      session,
      'create',
      'employee',
      id,
      { branchId, employeeName, nationalId: nationalId.value, baseSalary, supervisorAllowance, incentives },
      clientIp(context.request),
      context.request.headers.get('User-Agent') || undefined,
    );

    return ok(
      {
        employee: {
          id,
          branchId,
          employeeName,
          nationalId: nationalId.value,
          baseSalary,
          supervisorAllowance,
          incentives,
          isActive: true,
        },
      },
      201,
    );
  } catch (error) {
    console.error('Create employee error:', error);
    return fail('حدث خطأ أثناء إضافة الموظف', 500);
  }
};
