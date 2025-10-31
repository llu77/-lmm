import type { APIRoute } from 'astro';
import { requireAdminRole, logAudit, getClientIP } from '@/lib/permissions';

export const POST: APIRoute = async ({ request, locals }) => {
  // Only admin can update users
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
      email,
      full_name,
      phone,
      role_id,
      branch_id,
      is_active
    } = await request.json();

    // Validation
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'معرف المستخدم مطلوب' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user exists
    const existing = await locals.runtime.env.DB.prepare(
      `SELECT id FROM users_new WHERE id = ?`
    ).bind(id).first();

    if (!existing) {
      return new Response(
        JSON.stringify({ error: 'المستخدم غير موجود' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Update user
    await locals.runtime.env.DB.prepare(`
      UPDATE users_new
      SET email = ?, full_name = ?, phone = ?, role_id = ?, branch_id = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      email || null,
      full_name || null,
      phone || null,
      role_id,
      branch_id || null,
      is_active !== undefined ? is_active : 1,
      id
    ).run();

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'update',
      'user',
      id,
      { email, full_name, phone, role_id, branch_id, is_active },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id,
          email,
          full_name,
          phone,
          role_id,
          branch_id,
          is_active
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Update user error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء تحديث المستخدم' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
