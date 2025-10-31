import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/session';
import { generateId } from '@/lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  // Check admin authentication
  const authResult = await requireAdmin(locals.runtime.env.SESSIONS, request);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const { settings } = await request.json();

    if (!settings || typeof settings !== 'object') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid settings format'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Allowed setting keys
    const allowedKeys = [
      'from_email',
      'from_name',
      'reply_to',
      'admin_email',
      'global_enable',
      'rate_limit_global_hourly',
      'rate_limit_global_daily',
      'rate_limit_user_hourly',
      'rate_limit_user_daily'
    ];

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      if (!allowedKeys.includes(key)) {
        continue; // Skip invalid keys
      }

      // Check if setting exists
      const existing = await locals.runtime.env.DB.prepare(`
        SELECT id FROM email_settings WHERE setting_key = ?
      `).bind(key).first();

      if (existing) {
        // Update existing
        await locals.runtime.env.DB.prepare(`
          UPDATE email_settings
          SET setting_value = ?, updated_at = ?
          WHERE setting_key = ?
        `).bind(String(value), new Date().toISOString(), key).run();
      } else {
        // Insert new
        await locals.runtime.env.DB.prepare(`
          INSERT INTO email_settings (id, setting_key, setting_value)
          VALUES (?, ?, ?)
        `).bind(generateId(), key, String(value)).run();
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Settings updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Update email settings error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
