import type { APIRoute } from 'astro';
import { requireAdminRole, logAudit, getClientIP } from '@/lib/permissions';

export const POST: APIRoute = async ({ request, locals }) => {
  // Only admin can update branches
  const authResult = await requireAdminRole(
    locals.runtime.env.SESSIONS,
    locals.runtime.env.DB,
    request
  );

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const {
      id,
      name,
      name_ar,
      location,
      phone,
      manager_name,
      is_active
    } = await request.json();

    // Validation
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'معرف الفرع مطلوب' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if branch exists
    const existing = await locals.runtime.env.DB.prepare(
      `SELECT id FROM branches WHERE id = ?`
    ).bind(id).first();

    if (!existing) {
      return new Response(
        JSON.stringify({ error: 'الفرع غير موجود' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Update branch
    await locals.runtime.env.DB.prepare(`
      UPDATE branches
      SET name = ?, name_ar = ?, location = ?, phone = ?, manager_name = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      name,
      name_ar,
      location || null,
      phone || null,
      manager_name || null,
      is_active !== undefined ? is_active : 1,
      id
    ).run();

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'update',
      'branch',
      id,
      { name, name_ar, location, phone, manager_name, is_active },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        branch: {
          id,
          name,
          name_ar,
          location,
          phone,
          manager_name,
          is_active
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Update branch error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء تحديث الفرع' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
