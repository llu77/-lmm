import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess, logAudit, getClientIP } from '@/lib/permissions';
import { generateId } from '@/lib/db';
import { categorizeExpense } from '@/lib/ai';
import { triggerLargeExpense } from '@/lib/email-triggers';

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

  // Check permission to add expense
  const permError = requirePermission(authResult, 'canAddExpense');
  if (permError) {
    return permError;
  }

  try {
    const {
      branchId,
      title,
      amount,
      category,
      description,
      date,
      autoCategorize = false
    } = await request.json();

    // Validation
    if (!branchId || !title || !amount || !date) {
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

    let finalCategory = category;

    // AI Auto-categorization if requested
    if (autoCategorize || !category) {
      try {
        const aiCategory = await categorizeExpense(
          {
            AI: locals.runtime.env.AI,
            ANTHROPIC_API_KEY: locals.runtime.env.ANTHROPIC_API_KEY,
            AI_GATEWAY_ACCOUNT_ID: locals.runtime.env.AI_GATEWAY_ACCOUNT_ID,
            AI_GATEWAY_NAME: locals.runtime.env.AI_GATEWAY_NAME
          },
          title,
          description
        );
        finalCategory = aiCategory;
      } catch (error) {
        console.error('AI categorization failed:', error);
        finalCategory = category || 'أخرى';
      }
    }

    // Create expense record
    const expenseId = generateId();
    const parsedAmount = parseFloat(amount);
    await locals.runtime.env.DB.prepare(`
      INSERT INTO expenses (id, branch_id, title, amount, category, description, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      expenseId,
      branchId,
      title,
      parsedAmount,
      finalCategory,
      description || null,
      date
    ).run();

    // Send email alert for large expenses (> 1000 ج.م)
    if (parsedAmount > 1000) {
      try {
        await triggerLargeExpense(locals.runtime.env, {
          expenseId,
          title,
          amount: parsedAmount,
          category: finalCategory,
          description: description || '',
          date,
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
      'expense',
      expenseId,
      { branchId, title, amount: parsedAmount, category: finalCategory },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        expense: {
          id: expenseId,
          category: finalCategory
        }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Create expense error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء إضافة المصروف' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
