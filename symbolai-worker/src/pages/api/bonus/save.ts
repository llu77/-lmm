import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess, logAudit, getClientIP } from '@/lib/permissions';
import { bonusQueries, generateId } from '@/lib/db';
import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter';
import { validateInput, saveBonusSchema } from '@/lib/validation-schemas';

export const POST: APIRoute = async ({ request, locals }) => {
  // Check authentication with permissions
  const authResult = await requireAuthWithPermissions(
    locals.runtime.env.SESSIONS,
    locals.runtime.env.DB,
    request
  );

  if (authResult instanceof Response) {
    return authResult;
  }

  // Check permission to manage bonus
  const permError = requirePermission(authResult, 'canManageBonus');
  if (permError) {
    return permError;
  }

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    request,
    locals.runtime.env.KV || locals.runtime.env.SESSIONS,
    RATE_LIMIT_PRESETS.financial_critical
  );
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // Validate input
    const validationResult = validateInput(saveBonusSchema, body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'خطأ في البيانات المدخلة',
          details: validationResult.error
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const validatedData = validationResult.data;

    // Validate branch access
    const branchError = validateBranchAccess(authResult, validatedData.branchId);
    if (branchError) {
      return branchError;
    }

    const bonusId = generateId();

    await bonusQueries.create(locals.runtime.env.DB, {
      id: bonusId,
      branchId: validatedData.branchId,
      weekNumber: validatedData.weekNumber,
      month: validatedData.month,
      year: validatedData.year,
      employeeBonuses: JSON.stringify(validatedData.employeeBonuses),
      totalBonusPaid: validatedData.totalBonusPaid || 0,
      revenueSnapshot: validatedData.revenueSnapshot ? JSON.stringify(validatedData.revenueSnapshot) : undefined
    });

    // If approved, update approval status
    if (validatedData.approved) {
      await bonusQueries.approve(
        locals.runtime.env.DB,
        bonusId,
        authResult.permissions.username
      );
    }

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'create',
      'bonus_record',
      bonusId,
      { branchId: validatedData.branchId, weekNumber: validatedData.weekNumber, month: validatedData.month, year: validatedData.year, totalBonusPaid: validatedData.totalBonusPaid, approved: validatedData.approved },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        bonusId
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Save bonus error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء حفظ البونص' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
