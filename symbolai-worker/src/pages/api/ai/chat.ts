import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/session';
import { callClaudeViaGateway, callWorkersAI } from '@/lib/ai';
import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter';
import { validateInput, aiChatSchema } from '@/lib/validation-schemas';

export const POST: APIRoute = async ({ request, locals }) => {
  // Check authentication
  const authResult = await requireAuth(locals.runtime.env.SESSIONS, request);
  if (authResult instanceof Response) {
    return authResult;
  }

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    request,
    locals.runtime.env.KV || locals.runtime.env.SESSIONS,
    RATE_LIMIT_PRESETS.ai_chat
  );
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // Validate input
    const validationResult = validateInput(aiChatSchema, body);
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

    const env = {
      AI: locals.runtime.env.AI,
      ANTHROPIC_API_KEY: locals.runtime.env.ANTHROPIC_API_KEY,
      AI_GATEWAY_ACCOUNT_ID: locals.runtime.env.AI_GATEWAY_ACCOUNT_ID,
      AI_GATEWAY_NAME: locals.runtime.env.AI_GATEWAY_NAME
    };

    let response;

    if (validatedData.useWorkersAI || !env.ANTHROPIC_API_KEY) {
      // Use Cloudflare Workers AI (free, built-in)
      response = await callWorkersAI(env, validatedData.message, {
        model: '@cf/meta/llama-3-8b-instruct',
        maxTokens: 2048
      });
    } else {
      // Use Anthropic Claude via AI Gateway (higher quality)
      response = await callClaudeViaGateway(
        env,
        [{ role: 'user', content: validatedData.message }],
        {
          model: 'claude-3-5-sonnet-20241022',
          maxTokens: 2048,
          system: 'أنت مساعد مالي ذكي متخصص في مساعدة الشركات الصغيرة والمتوسطة. تجيب باللغة العربية بشكل احترافي ومفيد.'
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: response.content,
        usage: response.usage,
        model: validatedData.useWorkersAI ? 'workers-ai' : 'claude-via-gateway'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('AI chat error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء المعالجة' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
