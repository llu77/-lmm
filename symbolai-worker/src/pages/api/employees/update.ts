import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/session';
import { employeeQueries } from '@/lib/db';

export const PUT: APIRoute = async ({ request, locals }) => {
  // Check admin authentication
  const authResult = await requireAdmin(locals.runtime.env.SESSIONS, request);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const { id, updates } = await request.json();

    if (!id || !updates) {
      return new Response(
        JSON.stringify({ error: 'البيانات المطلوبة ناقصة' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse numeric fields
    const parsedUpdates: any = {};
    if (updates.employeeName !== undefined) parsedUpdates.employeeName = updates.employeeName;
    if (updates.baseSalary !== undefined) parsedUpdates.baseSalary = parseFloat(updates.baseSalary);
    if (updates.supervisorAllowance !== undefined) parsedUpdates.supervisorAllowance = parseFloat(updates.supervisorAllowance);
    if (updates.incentives !== undefined) parsedUpdates.incentives = parseFloat(updates.incentives);
    if (updates.isActive !== undefined) parsedUpdates.isActive = updates.isActive;

    await employeeQueries.update(locals.runtime.env.DB, id, parsedUpdates);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Update employee error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء تحديث بيانات الموظف' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
