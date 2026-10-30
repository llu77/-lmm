// POST /api/deductions/create {employeeId, amount, month, year, deductionType, reason}
// Backward-compatible wrapper over the payroll adjustments ledger. The free-text
// deduction type of the old page is mapped to a ledger category:
// غياب → absence, تأخير → late, مخالفة / جزاء → violation, anything else → other_deduction.
// New code should call /api/adjustments/create directly.

import type { APIRoute } from 'astro';
import { ADJUSTMENT_CATEGORIES, isAdjustmentCategory, type AdjustmentCategory } from '@/lib/finance/catalog';
import { fail, financeAuth, ok, readJsonObject, str } from '@/lib/finance/http';
import { createAdjustment, MAX_DESCRIPTION_LENGTH } from '../adjustments/create';
import { resolveLegacyTarget } from '../advances/create';

export function mapDeductionType(value: unknown): AdjustmentCategory {
  const type = str(value, 100);
  if (isAdjustmentCategory(type) && ADJUSTMENT_CATEGORIES[type].kind === 'deduction' && type !== 'advance') return type;
  if (type.includes('غياب')) return 'absence';
  if (type.includes('تأخير') || type.includes('تأخر')) return 'late';
  if (type.includes('مخالفة') || type.includes('جزاء')) return 'violation';
  if (type.includes('بدون راتب')) return 'unpaid_leave';
  return 'other_deduction';
}

export const POST: APIRoute = async context => {
  const auth = await financeAuth(context, ['canGeneratePayroll', 'canManageEmployees']);
  if (auth instanceof Response) return auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);

  try {
    const target = await resolveLegacyTarget(auth, body);
    if (target instanceof Response) return target;

    const deductionType = str(body.deductionType, 100);
    const category = mapDeductionType(deductionType);
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    // Keep a free-text type (تأمينات، ضرائب، ...) visible when it maps to "other".
    let description = reason;
    if (category === 'other_deduction' && deductionType && deductionType !== 'أخرى' && deductionType !== 'other_deduction') {
      description = reason ? `${deductionType}: ${reason}` : deductionType;
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return fail(`السبب طويل جداً (${MAX_DESCRIPTION_LENGTH} حرف كحد أقصى)`, 400);
    }

    const result = await createAdjustment(
      auth,
      context.request,
      {
        branchId: target.employee.branchId,
        employeeId: target.employee.id,
        period: target.period,
        category,
        amount: body.amount,
        description,
      },
      'deductions/create',
    );
    if (!result.ok) return result.response;

    const { adjustment, warnings } = result;
    return ok(
      {
        deduction: {
          id: adjustment.id,
          employeeId: adjustment.employeeId,
          employeeName: adjustment.employeeName,
          amount: adjustment.amount,
          month: target.month,
          year: target.year,
          period: adjustment.period,
          deductionType: deductionType || adjustment.categoryLabel,
          category: adjustment.category,
          reason: adjustment.description,
        },
        adjustment,
        warnings,
      },
      201,
    );
  } catch (error) {
    console.error('Create deduction error:', error);
    return fail('حدث خطأ أثناء إضافة الخصم', 500);
  }
};
