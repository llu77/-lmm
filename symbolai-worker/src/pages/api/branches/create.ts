import type { APIRoute } from 'astro';
import { requireAdminRole, logAudit, getClientIP } from '@/lib/permissions';
import { generateId } from '@/lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  // Only admin can create branches
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
      name,
      name_ar,
      location,
      phone,
      manager_name
    } = await request.json();

    // Validation
    if (!name || !name_ar) {
      return new Response(
        JSON.stringify({ error: 'اسم الفرع مطلوب بالعربية والإنجليزية' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if branch name already exists
    const existing = await locals.runtime.env.DB.prepare(
      `SELECT id FROM branches WHERE name = ? OR name_ar = ?`
    ).bind(name, name_ar).first();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'اسم الفرع موجود بالفعل' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create branch
    const branchId = generateId();
    await locals.runtime.env.DB.prepare(`
      INSERT INTO branches (id, name, name_ar, location, phone, manager_name, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).bind(branchId, name, name_ar, location || null, phone || null, manager_name || null).run();

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'create',
      'branch',
      branchId,
      { name, name_ar, location, phone, manager_name },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        branch: {
          id: branchId,
          name,
          name_ar,
          location,
          phone,
          manager_name
        }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Create branch error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء إنشاء الفرع' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
