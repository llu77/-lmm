import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, logAudit, getClientIP } from '@/lib/permissions';
import {
  triggerProductOrderApproved,
  triggerProductOrderRejected,
  triggerProductOrderCompleted
} from '@/lib/email-triggers';

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
      orderId,
      newStatus
    } = await request.json();

    // Validation
    if (!orderId || !newStatus) {
      return new Response(
        JSON.stringify({ error: 'البيانات المطلوبة ناقصة' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate status value
    const validStatuses = ['draft', 'pending', 'approved', 'rejected', 'completed'];
    if (!validStatuses.includes(newStatus)) {
      return new Response(
        JSON.stringify({ error: 'حالة الطلب غير صحيحة' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get current order
    const order = await locals.runtime.env.DB.prepare(
      `SELECT * FROM product_orders WHERE id = ?`
    ).bind(orderId).first();

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'الطلب غير موجود' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate workflow transitions
    const currentStatus = order.status;
    const validTransitions: { [key: string]: string[] } = {
      'draft': ['pending'],
      'pending': ['approved', 'rejected'],
      'approved': ['completed'],
      'rejected': [], // Cannot transition from rejected
      'completed': [] // Cannot transition from completed
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return new Response(
        JSON.stringify({
          error: `لا يمكن تغيير الحالة من ${currentStatus} إلى ${newStatus}`
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Update order status
    const updateTime = new Date().toISOString();
    await locals.runtime.env.DB.prepare(`
      UPDATE product_orders
      SET status = ?, is_draft = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      newStatus,
      newStatus === 'draft' ? 1 : 0,
      updateTime,
      orderId
    ).run();

    // Send email notifications based on status change
    try {
      const products = JSON.parse(order.products as string);
      const orderData = {
        orderId: order.id,
        employeeName: order.employee_name,
        orderDate: new Date(order.created_at).toLocaleDateString('ar-EG'),
        products,
        grandTotal: order.grand_total,
        branchId: order.branch_id,
        userId: order.user_id
      };

      if (newStatus === 'approved') {
        await triggerProductOrderApproved(locals.runtime.env, orderData);
      } else if (newStatus === 'rejected') {
        await triggerProductOrderRejected(locals.runtime.env, orderData);
      } else if (newStatus === 'completed') {
        await triggerProductOrderCompleted(locals.runtime.env, orderData);
      }
    } catch (emailError) {
      console.error('Email trigger error:', emailError);
      // Don't fail the request if email fails
    }

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'update',
      'product_order',
      orderId,
      { oldStatus: currentStatus, newStatus },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: orderId,
          status: newStatus,
          updatedAt: updateTime
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Update order status error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء تحديث حالة الطلب' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
