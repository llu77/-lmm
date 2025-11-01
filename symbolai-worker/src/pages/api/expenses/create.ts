import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess, logAudit, getClientIP } from '@/lib/permissions';
import { generateId } from '@/lib/db';
import { categorizeExpense } from '@/lib/ai';
import { triggerLargeExpense } from '@/lib/email-triggers';
import { validateInput, createExpenseSchema } from '@/lib/validation-schemas';

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
    const body = await request.json();

    // Validate input
    const validationResult = validateInput(createExpenseSchema, body);
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

    let finalCategory = validatedData.category;

    // AI Auto-categorization if requested
    if (validatedData.autoCategorize || !validatedData.category) {
      try {
        const aiCategory = await categorizeExpense(
          {
            AI: locals.runtime.env.AI,
            ANTHROPIC_API_KEY: locals.runtime.env.ANTHROPIC_API_KEY,
            AI_GATEWAY_ACCOUNT_ID: locals.runtime.env.AI_GATEWAY_ACCOUNT_ID,
            AI_GATEWAY_NAME: locals.runtime.env.AI_GATEWAY_NAME
          },
          validatedData.title,
          validatedData.description
        );
        finalCategory = aiCategory;
      } catch (error) {
        console.error('AI categorization failed:', error);
        finalCategory = validatedData.category || 'أخرى';
      }
    }

    // Create expense record
    const expenseId = generateId();
    const parsedAmount = parseFloat(validatedData.amount.toString());
    await locals.runtime.env.DB.prepare(`
      INSERT INTO expenses (id, branch_id, title, amount, category, description, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      expenseId,
      validatedData.branchId,
      validatedData.title,
      parsedAmount,
      finalCategory,
      validatedData.description || null,
      validatedData.date
    ).run();

    // Send email alert for large expenses (> 1000 ج.م)
    if (parsedAmount > 1000) {
      try {
        await triggerLargeExpense(locals.runtime.env, {
          expenseId,
          title: validatedData.title,
          amount: parsedAmount,
          category: finalCategory,
          description: validatedData.description || '',
          date: validatedData.date,
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
      'expense',
      expenseId,
      { branchId: validatedData.branchId, title: validatedData.title, amount: parsedAmount, category: finalCategory },
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
