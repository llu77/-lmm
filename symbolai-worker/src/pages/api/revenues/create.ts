import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess, logAudit, getClientIP } from '@/lib/permissions';
import { generateId } from '@/lib/db';
import { triggerRevenueMismatch } from '@/lib/email-triggers';

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

  try {
    const {
      branchId,
      date,
      cash,
      network,
      budget,
      total,
      employees
    } = await request.json();

    // Validation
    if (!branchId || !date || total === undefined) {
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

    // Calculate total and match status
    const calculatedTotal = (cash || 0) + (network || 0) + (budget || 0);
    const isMatched = Math.abs(calculatedTotal - total) < 0.01;

    // Create revenue record
    const revenueId = generateId();
    await locals.runtime.env.DB.prepare(`
      INSERT INTO revenues (id, branch_id, date, cash, network, budget, total, calculated_total, is_matched, employees)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      revenueId,
      branchId,
      date,
      cash || 0,
      network || 0,
      budget || 0,
      total,
      calculatedTotal,
      isMatched ? 1 : 0,
      employees ? JSON.stringify(employees) : null
    ).run();

    // Create notification if mismatched
    if (!isMatched) {
      const notifId = generateId();
      await locals.runtime.env.DB.prepare(`
        INSERT INTO notifications (id, branch_id, type, severity, title, message, action_required, related_entity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        notifId,
        branchId,
        'revenue_mismatch',
        'high',
        'تحذير: إيراد غير متطابق',
        `الإيراد بتاريخ ${date} غير متطابق. المجموع المدخل: ${total} ج.م، المحسوب: ${calculatedTotal} ج.م`,
        1,
        revenueId
      ).run();

      // Send email alert for revenue mismatch
      try {
        await triggerRevenueMismatch(locals.runtime.env, {
          revenueId,
          date,
          enteredTotal: total,
          calculatedTotal,
          difference: total - calculatedTotal,
          cash: cash || 0,
          network: network || 0,
          budget: budget || 0,
          branchId,
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
      { branchId, date, total, cash, network, budget },
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
