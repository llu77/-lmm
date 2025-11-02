import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess, logAudit, getClientIP } from '@/lib/permissions';
import { generateId } from '@/lib/db';
import { triggerRevenueMismatch } from '@/lib/email-triggers';
import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter';
import { validateInput, createRevenueSchema } from '@/lib/validation-schemas';

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

  // Check permission to add revenue
  const permError = requirePermission(authResult, 'canAddRevenue');
  if (permError) {
    return permError;
  }

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    request,
    locals.runtime.env.KV || locals.runtime.env.SESSIONS,
    RATE_LIMIT_PRESETS.financial_write
  );
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // Validate input
    const validationResult = validateInput(createRevenueSchema, body);
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

    // Calculate total and match status
    const calculatedTotal = (validatedData.cash || 0) + (validatedData.network || 0) + (validatedData.budget || 0);
    const isMatched = Math.abs(calculatedTotal - validatedData.total) < 0.01;

    // Create revenue record
    const revenueId = generateId();
    await locals.runtime.env.DB.prepare(`
      INSERT INTO revenues (id, branch_id, date, cash, network, budget, total, calculated_total, is_matched, employees)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      revenueId,
      validatedData.branchId,
      validatedData.date,
      validatedData.cash || 0,
      validatedData.network || 0,
      validatedData.budget || 0,
      validatedData.total,
      calculatedTotal,
      isMatched ? 1 : 0,
      validatedData.employees ? JSON.stringify(validatedData.employees) : null
    ).run();

    // Create notification if mismatched
    if (!isMatched) {
      const notifId = generateId();
      await locals.runtime.env.DB.prepare(`
        INSERT INTO notifications (id, branch_id, type, severity, title, message, action_required, related_entity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        notifId,
        validatedData.branchId,
        'revenue_mismatch',
        'high',
        'تحذير: إيراد غير متطابق',
        `الإيراد بتاريخ ${validatedData.date} غير متطابق. المجموع المدخل: ${validatedData.total} ج.م، المحسوب: ${calculatedTotal} ج.م`,
        1,
        revenueId
      ).run();

      // Send email alert for revenue mismatch
      try {
        await triggerRevenueMismatch(locals.runtime.env, {
          revenueId,
          date: validatedData.date,
          enteredTotal: validatedData.total,
          calculatedTotal,
          difference: validatedData.total - calculatedTotal,
          cash: validatedData.cash || 0,
          network: validatedData.network || 0,
          budget: validatedData.budget || 0,
          branchId: validatedData.branchId,
          userId: authResult.userId
        });
      } catch (emailError) {
        console.error('Email trigger error:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'create',
      'revenue',
      revenueId,
      { branchId: validatedData.branchId, date: validatedData.date, total: validatedData.total, cash: validatedData.cash, network: validatedData.network, budget: validatedData.budget },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        revenue: {
          id: revenueId,
          isMatched
        }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Create revenue error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء إضافة الإيراد' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
