import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess, logAudit, getClientIP } from '@/lib/permissions';
import { bonusQueries, generateId } from '@/lib/db';

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

  try {
    const {
      branchId,
      weekNumber,
      month,
      year,
      employeeBonuses,
      totalBonusPaid,
      revenueSnapshot,
      approved = false
    } = await request.json();

    // Validation
    if (!branchId || !weekNumber || !month || !year || !employeeBonuses) {
      return new Response(
        JSON.stringify({ error: 'البيانات المطلوبة ناقصة' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate branch access
    const branchError = validateBranchAccess(authResult, branchId);
    if (branchError) {
      return branchError;
    }

    const bonusId = generateId();

    await bonusQueries.create(locals.runtime.env.DB, {
      id: bonusId,
      branchId,
      weekNumber,
      month,
      year,
      employeeBonuses: JSON.stringify(employeeBonuses),
      totalBonusPaid: totalBonusPaid || 0,
      revenueSnapshot: revenueSnapshot ? JSON.stringify(revenueSnapshot) : undefined
    });

    // If approved, update approval status
    if (approved) {
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
      { branchId, weekNumber, month, year, totalBonusPaid, approved },
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
