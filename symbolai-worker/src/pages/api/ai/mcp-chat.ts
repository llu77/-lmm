/**
 * AI Chat with MCP Integration
 *
 * Enhanced AI assistant that can execute MCP commands via natural language.
 * Supports infrastructure management queries like:
 * - "Show me users in branch Laban"
 * - "List failed builds in the last week"
 * - "What's the latest deployment status?"
 * - "Query employees table"
 */

import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';
import { createAuthenticatedMCPClient } from '@/lib/mcp-client';
import { callClaudeViaGateway } from '@/lib/ai';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Verify admin authentication
    const authResult = await requireAdminRole(
      locals.runtime.env.SESSIONS,
      locals.runtime.env.DB,
      request
    );

    if (authResult instanceof Response) {
      return authResult;
    }

    // 2. Parse request
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Missing message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check if MCP is connected
    const mcpClient = await createAuthenticatedMCPClient(
      locals.runtime.env.SESSIONS,
      authResult.userId
    );

    // 4. Build system prompt with MCP capabilities
    const systemPrompt = mcpClient
      ? `أنت مساعد ذكي لإدارة نظام SymbolAI المالي والموارد البشرية.

لديك وصول إلى Cloudflare MCP للقيام بالمهام التالية:

**إدارة قواعد البيانات D1:**
- تنفيذ استعلامات SQL على قاعدة البيانات
- عرض المستخدمين، الموظفين، الإيرادات، المصروفات
- البحث في البيانات المالية

**مراقبة النظام:**
- عرض حالة Builds والنشر
- تتبع حالة Workers
- عرض KV Namespaces و R2 Buckets

**الأوامر المتاحة:**
- "اعرض المستخدمين في فرع [اسم الفرع]"
- "احسب إجمالي الإيرادات لشهر [الشهر]"
- "ما هي آخر 5 deployments؟"
- "اعرض جميع الموظفين الذين انتهت هوياتهم"

عندما يطلب المستخدم شيئاً يتعلق بالبيانات، قم بتوليد استعلام SQL مناسب وأخبرني أنك ستقوم بتنفيذه.

**ملاحظة هامة:**
- استخدم فقط SELECT queries للأمان
- لا تستخدم DROP, DELETE, UPDATE إلا إذا طلب المستخدم ذلك بوضوح
- دائماً استخدم LIMIT في الاستعلامات لتجنب النتائج الكبيرة

قاعدة البيانات الحالية: symbolai-financial-db (${locals.runtime.env.DB ? 'متصلة' : 'غير متصلة'})

الجداول الرئيسية:
- users_new: المستخدمين (username, email, role_id, branch_id)
- branches: الفروع (id, name_ar, manager_name)
- employees: الموظفين (name, salary, branch_id)
- revenues: الإيرادات (amount, branch_id, entry_date)
- expenses: المصروفات (amount, category, branch_id)
- payroll_records: كشوف الرواتب
- employee_requests: طلبات الموظفين

أجب بالعربية ودائماً كن واضحاً ومفيداً.`
      : `أنت مساعد ذكي لنظام SymbolAI المالي والموارد البشرية.

⚠️ **ملاحظة:** MCP غير متصل حالياً. لا يمكنني تنفيذ استعلامات قواعد البيانات أو الوصول للبنية التحتية.

يمكنني مساعدتك في:
- شرح كيفية استخدام النظام
- الإجابة على أسئلة عامة
- تقديم إرشادات حول الميزات

للحصول على وصول كامل للبيانات، يرجى توصيل MCP من صفحة "أدوات MCP".`;

    // 5. Detect if user is asking for database query
    const lowerMessage = message.toLowerCase();
    const isQueryRequest =
      lowerMessage.includes('اعرض') ||
      lowerMessage.includes('احسب') ||
      lowerMessage.includes('كم') ||
      lowerMessage.includes('ما هي') ||
      lowerMessage.includes('ما هو') ||
      lowerMessage.includes('query') ||
      lowerMessage.includes('select');

    let aiResponse;

    if (mcpClient && isQueryRequest) {
      // Generate SQL query using AI
      const queryGenerationPrompt = `بناءً على الطلب التالي، قم بتوليد استعلام SQL صحيح:

الطلب: ${message}

قم بالرد بصيغة JSON:
{
  "sql": "الاستعلام SQL",
  "explanation": "شرح ما سيفعله الاستعلام"
}

تأكد من:
- استخدام SELECT فقط
- إضافة LIMIT مناسب
- استخدام أسماء الجداول والحقول الصحيحة من Schema أعلاه`;

      try {
        const queryGenResponse = await callClaudeViaGateway(
          locals.runtime.env,
          [
            { role: 'user', content: queryGenerationPrompt },
          ],
          'claude-3-5-sonnet-20241022'
        );

        // Try to parse SQL from response
        const sqlMatch = queryGenResponse.match(/\{[\s\S]*"sql"[\s\S]*\}/);

        if (sqlMatch) {
          const parsedQuery = JSON.parse(sqlMatch[0]);

          // Execute the query
          try {
            const result = await mcpClient.queryD1Database(
              locals.runtime.env.DB_ID || '3897ede2-ffc0-4fe8-8217-f9607c89bef2',
              parsedQuery.sql
            );

            // Format results for AI
            const resultsText = result.results.length > 0
              ? JSON.stringify(result.results, null, 2)
              : 'لا توجد نتائج';

            aiResponse = `✅ تم تنفيذ الاستعلام بنجاح!

**الاستعلام:**
\`\`\`sql
${parsedQuery.sql}
\`\`\`

**النتائج:** ${result.results.length} صف

${resultsText}

**الإحصائيات:**
- الوقت: ${result.meta.duration}ms
- الصفوف المقروءة: ${result.meta.rows_read}`;
          } catch (queryError) {
            aiResponse = `❌ فشل تنفيذ الاستعلام:

**الاستعلام:**
\`\`\`sql
${parsedQuery.sql}
\`\`\`

**الخطأ:** ${queryError instanceof Error ? queryError.message : 'خطأ غير معروف'}

يرجى التحقق من الاستعلام والمحاولة مرة أخرى.`;
          }
        } else {
          // Fallback to regular AI response
          aiResponse = await callClaudeViaGateway(
            locals.runtime.env,
            [
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
              { role: 'user', content: message },
            ],
            'claude-3-5-sonnet-20241022'
          );
        }
      } catch (error) {
        // If query generation fails, fall back to regular chat
        aiResponse = await callClaudeViaGateway(
          locals.runtime.env,
          [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: message },
          ],
          'claude-3-5-sonnet-20241022'
        );
      }
    } else {
      // Regular AI chat
      aiResponse = await callClaudeViaGateway(
        locals.runtime.env,
        [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message },
        ],
        'claude-3-5-sonnet-20241022'
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        mcpConnected: !!mcpClient,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('AI MCP chat error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process AI request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
