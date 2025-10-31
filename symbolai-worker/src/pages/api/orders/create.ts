import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess, logAudit, getClientIP } from '@/lib/permissions';
import { generateId } from '@/lib/db';
import { triggerProductOrderPending } from '@/lib/email-triggers';

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

  // Check permission to manage orders
  const permError = requirePermission(authResult, 'canManageOrders');
  if (permError) {
    return permError;
  }

  try {
    const {
      branchId,
      employeeName,
      products,
      notes,
      isDraft
    } = await request.json();

    // Validation
    if (!branchId || !employeeName || !products || !Array.isArray(products) || products.length === 0) {
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

    // Validate each product
    for (const product of products) {
      if (!product.name || !product.quantity || !product.price) {
        return new Response(
          JSON.stringify({ error: 'يجب إدخال بيانات المنتج كاملة (الاسم، الكمية، السعر)' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (product.quantity <= 0 || product.price < 0) {
        return new Response(
          JSON.stringify({ error: 'الكمية يجب أن تكون أكبر من صفر والسعر لا يمكن أن يكون سالب' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Calculate grand total
    const grandTotal = products.reduce((sum: number, p: any) => {
      const total = (p.quantity || 0) * (p.price || 0);
      return sum + total;
    }, 0);

    // Create order record
    const orderId = generateId();
    const status = isDraft ? 'draft' : 'pending';
    const productsJson = JSON.stringify(products);

    await locals.runtime.env.DB.prepare(`
      INSERT INTO product_orders (
        id, branch_id, employee_name, products, grand_total, status, is_draft, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      orderId,
      branchId,
      employeeName,
      productsJson,
      grandTotal,
      status,
      isDraft ? 1 : 0,
      notes || ''
    ).run();

    // Send email notification for pending orders (not drafts)
    if (status === 'pending') {
      try {
        await triggerProductOrderPending(locals.runtime.env, {
          orderId,
          employeeName,
          orderDate: new Date().toLocaleDateString('ar-EG'),
          products,
          grandTotal,
          branchId,
          userId: authResult.userId
        });
      } catch (emailError) {
        console.error('Email trigger error:', emailError);
      }
    }

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'create',
      'product_order',
      orderId,
      { branchId, employeeName, grandTotal, status, isDraft },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: orderId,
          branchId,
          employeeName,
          products,
          grandTotal,
          status,
          isDraft,
          notes
        }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Create order error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء إنشاء الطلب' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
