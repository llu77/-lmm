import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/session';
import { sendEmail, sendTemplateEmail } from '@/lib/email';
import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter';
import { validateInput, sendEmailSchema } from '@/lib/validation-schemas';

export const POST: APIRoute = async ({ request, locals }) => {
  // Check admin authentication
  const authResult = await requireAdmin(locals.runtime.env.SESSIONS, request);
  if (authResult instanceof Response) {
    return authResult;
  }

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    request,
    locals.runtime.env.KV || locals.runtime.env.SESSIONS,
    RATE_LIMIT_PRESETS.email_send
  );
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // Validate input
    const validationResult = validateInput(sendEmailSchema, body);
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
    const { username } = authResult;

    // Check if using template or raw email
    if (validatedData.templateId) {
      // Send using template
      const result = await sendTemplateEmail(locals.runtime.env, {
        to: validatedData.to,
        cc: validatedData.cc,
        templateId: validatedData.templateId,
        variables: validatedData.variables || {},
        priority: validatedData.priority || 'medium',
        triggerType: 'manual_send',
        userId: username,
        relatedEntityId: validatedData.relatedEntityId
      });

      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      // Send raw email
      const result = await sendEmail(locals.runtime.env, {
        to: validatedData.to,
        cc: validatedData.cc,
        subject: validatedData.subject,
        html: validatedData.html,
        text: validatedData.text,
        attachments: validatedData.attachments,
        priority: validatedData.priority || 'medium',
        triggerType: 'manual_send',
        userId: username,
        relatedEntityId: validatedData.relatedEntityId
      });

      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Send email API error:', error);
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
