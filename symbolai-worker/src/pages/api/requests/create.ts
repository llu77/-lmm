import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess, logAudit, getClientIP } from '@/lib/permissions';
import { employeeRequestQueries, generateId, notificationQueries } from '@/lib/db';
import { triggerEmployeeRequestCreated } from '@/lib/email-triggers';

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

  // Check permission to submit requests
  const permError = requirePermission(authResult, 'canSubmitRequests');
  if (permError) {
    return permError;
  }

  try {
    const {
      branchId,
      employeeName,
      nationalId,
      requestType,

      // Type-specific fields
      advanceAmount,
      vacationStart,
      vacationEnd,
      duesAmount,
      permissionDate,
      permissionTime,
      violationDate,
      violationDescription,
      resignationDate,
      resignationReason,
      reason
    } = await request.json();

    // Validation
    if (!branchId || !employeeName || !requestType) {
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

    // Validate request type
    const validTypes = ['سلفة', 'إجازة', 'صرف متأخرات', 'استئذان', 'مخالفة', 'استقالة'];
    if (!validTypes.includes(requestType)) {
      return new Response(
        JSON.stringify({ error: 'نوع الطلب غير صحيح' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Type-specific validation
    if (requestType === 'سلفة' && !advanceAmount) {
      return new Response(
        JSON.stringify({ error: 'مبلغ السلفة مطلوب' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (requestType === 'إجازة' && (!vacationStart || !vacationEnd)) {
      return new Response(
        JSON.stringify({ error: 'تاريخ بداية ونهاية الإجازة مطلوبان' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (requestType === 'صرف متأخرات' && !duesAmount) {
      return new Response(
        JSON.stringify({ error: 'مبلغ المتأخرات مطلوب' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (requestType === 'استئذان' && (!permissionDate || !permissionTime)) {
      return new Response(
        JSON.stringify({ error: 'تاريخ ووقت الاستئذان مطلوبان' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (requestType === 'مخالفة' && (!violationDate || !violationDescription)) {
      return new Response(
        JSON.stringify({ error: 'تاريخ ووصف المخالفة مطلوبان' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (requestType === 'استقالة' && (!resignationDate || !resignationReason)) {
      return new Response(
        JSON.stringify({ error: 'تاريخ وسبب الاستقالة مطلوبان' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create request record
    const requestId = generateId();
    const requestDate = new Date().toISOString().split('T')[0];

    // Build vacation_date field for vacation type
    let vacationDate = undefined;
    if (requestType === 'إجازة' && vacationStart && vacationEnd) {
      vacationDate = `${vacationStart} إلى ${vacationEnd}`;
    }

    await employeeRequestQueries.create(locals.runtime.env.DB, {
      id: requestId,
      branchId,
      employeeName,
      nationalId,
      requestType,
      requestDate,
      userId: authResult.userId,
      advanceAmount: advanceAmount ? parseFloat(advanceAmount) : undefined,
      vacationDate,
      duesAmount: duesAmount ? parseFloat(duesAmount) : undefined,
      permissionDate: permissionDate && permissionTime ? `${permissionDate} ${permissionTime}` : undefined,
      violationDate,
      violationDescription,
      resignationDate,
      resignationReason: resignationReason || reason
    });

    // Create notification for admins
    await notificationQueries.create(locals.runtime.env.DB, {
      id: generateId(),
      branchId,
      type: 'employee_request',
      severity: 'medium',
      title: 'طلب موظف جديد',
      message: `${employeeName} قدم طلب ${requestType}`,
      actionRequired: true,
      relatedEntity: requestId
    });

    // Send email notification
    try {
      // Build request details based on type
      let requestDetails = '';
      switch (requestType) {
        case 'سلفة':
          requestDetails = `مبلغ السلفة: ${advanceAmount} ج.م${reason ? `\nالسبب: ${reason}` : ''}`;
          break;
        case 'إجازة':
          requestDetails = `من ${vacationStart} إلى ${vacationEnd}${reason ? `\nالسبب: ${reason}` : ''}`;
          break;
        case 'صرف متأخرات':
          requestDetails = `مبلغ المتأخرات: ${duesAmount} ج.م`;
          break;
        case 'استئذان':
          requestDetails = `التاريخ: ${permissionDate} في ${permissionTime}${reason ? `\nالسبب: ${reason}` : ''}`;
          break;
        case 'مخالفة':
          requestDetails = `التاريخ: ${violationDate}\nالوصف: ${violationDescription}`;
          break;
        case 'استقالة':
          requestDetails = `تاريخ الاستقالة: ${resignationDate}\nالسبب: ${resignationReason}`;
          break;
      }

      await triggerEmployeeRequestCreated(locals.runtime.env, {
        requestId,
        employeeName,
        requestType,
        requestDate,
        requestDetails,
        branchId,
        userId: authResult.userId
      });
    } catch (emailError) {
      // Log error but don't fail the request
      console.error('Email trigger error:', emailError);
    }

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'create',
      'employee_request',
      requestId,
      { branchId, employeeName, requestType, nationalId },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        requestId
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Create request error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء إنشاء الطلب' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
