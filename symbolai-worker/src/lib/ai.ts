// AI utilities using Cloudflare AI Gateway and Workers AI
// Supports: Anthropic Claude, Cloudflare Workers AI models

interface AIEnv {
  AI: any; // Cloudflare AI binding
  ANTHROPIC_API_KEY?: string;
  AI_GATEWAY_ACCOUNT_ID?: string;
  AI_GATEWAY_NAME?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Call Anthropic Claude via Cloudflare AI Gateway
 * Benefits: Caching, rate limiting, logging, cost tracking
 */
export async function callClaudeViaGateway(
  env: AIEnv,
  messages: Message[],
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    system?: string;
  } = {}
): Promise<AIResponse> {
  const {
    model = 'claude-3-5-sonnet-20241022',
    maxTokens = 4096,
    temperature = 0.7,
    system
  } = options;

  // Construct AI Gateway endpoint
  const gatewayEndpoint = `https://gateway.ai.cloudflare.com/v1/${env.AI_GATEWAY_ACCOUNT_ID}/${env.AI_GATEWAY_NAME}/anthropic`;

  const requestBody: any = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages
  };

  if (system) {
    requestBody.system = system;
  }

  try {
    const response = await fetch(`${gatewayEndpoint}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': env.ANTHROPIC_API_KEY || ''
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      usage: data.usage
    };
  } catch (error) {
    console.error('AI Gateway error:', error);
    throw error;
  }
}

/**
 * Call Cloudflare Workers AI (built-in models)
 * Available models: @cf/meta/llama-3-8b-instruct, @cf/mistral/mistral-7b-instruct, etc.
 */
export async function callWorkersAI(
  env: AIEnv,
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<AIResponse> {
  const {
    model = '@cf/meta/llama-3-8b-instruct',
    maxTokens = 2048,
    temperature = 0.7
  } = options;

  try {
    const response = await env.AI.run(model, {
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature
    });

    return {
      content: response.response || response.text || '',
      usage: response.usage
    };
  } catch (error) {
    console.error('Workers AI error:', error);
    throw error;
  }
}

/**
 * Financial Analysis AI Assistant
 * Analyzes financial data and provides insights
 */
export async function analyzeFinancialData(
  env: AIEnv,
  data: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    revenueByDay?: Array<{ date: string; amount: number }>;
    expensesByCategory?: Array<{ category: string; amount: number }>;
  }
): Promise<string> {
  const prompt = `أنت مساعد مالي ذكي. قم بتحليل البيانات المالية التالية وقدم رؤى وتوصيات:

البيانات:
- إجمالي الإيرادات: ${data.totalRevenue.toLocaleString('ar-EG')} جنيه
- إجمالي المصروفات: ${data.totalExpenses.toLocaleString('ar-EG')} جنيه
- صافي الربح: ${data.netProfit.toLocaleString('ar-EG')} جنيه

قدم:
1. تحليل الأداء المالي
2. نقاط القوة والضعف
3. توصيات لتحسين الأداء
4. تنبيهات إن وجدت

الرد باللغة العربية بشكل احترافي.`;

  try {
    // Try Anthropic via Gateway first (higher quality)
    if (env.ANTHROPIC_API_KEY) {
      const response = await callClaudeViaGateway(env, [
        { role: 'user', content: prompt }
      ], {
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 1500,
        temperature: 0.7,
        system: 'أنت مساعد مالي خبير متخصص في تحليل البيانات المالية للشركات الصغيرة والمتوسطة.'
      });

      return response.content;
    } else {
      // Fallback to Workers AI (free, built-in)
      const response = await callWorkersAI(env, prompt, {
        model: '@cf/meta/llama-3-8b-instruct',
        maxTokens: 1500
      });

      return response.content;
    }
  } catch (error) {
    console.error('Financial analysis error:', error);
    return 'عذراً، حدث خطأ أثناء تحليل البيانات المالية. يرجى المحاولة مرة أخرى.';
  }
}

/**
 * Generate smart notifications using AI
 */
export async function generateSmartNotification(
  env: AIEnv,
  context: {
    type: 'revenue_mismatch' | 'low_profit' | 'high_expenses' | 'employee_request';
    data: any;
  }
): Promise<{ title: string; message: string; severity: 'low' | 'medium' | 'high' | 'critical' }> {
  const prompts = {
    revenue_mismatch: `يوجد ${context.data.count} سجل إيراد غير متطابق. اقترح رسالة تنبيه احترافية وعنوان مناسب.`,
    low_profit: `صافي الربح منخفض: ${context.data.profit} جنيه. اقترح رسالة تنبيه وتوصيات.`,
    high_expenses: `المصروفات مرتفعة: ${context.data.expenses} جنيه. اقترح رسالة تنبيه وتوصيات.`,
    employee_request: `طلب جديد من الموظف: ${context.data.requestType}. اقترح رسالة تنبيه للإدارة.`
  };

  const prompt = `${prompts[context.type]}

قدم الرد بصيغة JSON:
{
  "title": "عنوان التنبيه",
  "message": "نص التنبيه المفصل",
  "severity": "low|medium|high|critical"
}`;

  try {
    let response: AIResponse;

    if (env.ANTHROPIC_API_KEY) {
      response = await callClaudeViaGateway(env, [
        { role: 'user', content: prompt }
      ], {
        maxTokens: 500
      });
    } else {
      response = await callWorkersAI(env, prompt, {
        maxTokens: 500
      });
    }

    // Parse JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback
    return {
      title: 'تنبيه مالي',
      message: response.content,
      severity: 'medium'
    };
  } catch (error) {
    console.error('Smart notification error:', error);
    return {
      title: 'تنبيه',
      message: 'يرجى مراجعة البيانات المالية',
      severity: 'medium'
    };
  }
}

/**
 * AI-powered expense categorization
 */
export async function categorizeExpense(
  env: AIEnv,
  expenseTitle: string,
  expenseDescription?: string
): Promise<string> {
  const prompt = `صنف المصروف التالي إلى إحدى الفئات:

عنوان المصروف: ${expenseTitle}
${expenseDescription ? `الوصف: ${expenseDescription}` : ''}

الفئات المتاحة:
- رواتب وأجور
- إيجارات
- مرافق (كهرباء، ماء، إنترنت)
- صيانة
- مشتريات
- تسويق
- نقل ومواصلات
- أخرى

رد بكلمة واحدة فقط (اسم الفئة).`;

  try {
    let response: AIResponse;

    if (env.ANTHROPIC_API_KEY) {
      response = await callClaudeViaGateway(env, [
        { role: 'user', content: prompt }
      ], {
        maxTokens: 50,
        temperature: 0.3
      });
    } else {
      response = await callWorkersAI(env, prompt, {
        maxTokens: 50,
        temperature: 0.3
      });
    }

    return response.content.trim();
  } catch (error) {
    console.error('Expense categorization error:', error);
    return 'أخرى';
  }
}

/**
 * Generate payroll summary using AI
 */
export async function generatePayrollSummary(
  env: AIEnv,
  payrollData: {
    month: string;
    year: number;
    totalEmployees: number;
    totalSalary: number;
    totalAdvances: number;
    totalDeductions: number;
    netSalary: number;
  }
): Promise<string> {
  const prompt = `قم بإنشاء ملخص احترافي لكشف الرواتب التالي:

الشهر: ${payrollData.month} ${payrollData.year}
عدد الموظفين: ${payrollData.totalEmployees}
إجمالي الرواتب: ${payrollData.totalSalary.toLocaleString('ar-EG')} جنيه
إجمالي السلف: ${payrollData.totalAdvances.toLocaleString('ar-EG')} جنيه
إجمالي الخصومات: ${payrollData.totalDeductions.toLocaleString('ar-EG')} جنيه
صافي المستحق: ${payrollData.netSalary.toLocaleString('ar-EG')} جنيه

اكتب ملخصاً تنفيذياً قصيراً (3-4 جمل) باللغة العربية.`;

  try {
    let response: AIResponse;

    if (env.ANTHROPIC_API_KEY) {
      response = await callClaudeViaGateway(env, [
        { role: 'user', content: prompt }
      ], {
        maxTokens: 300
      });
    } else {
      response = await callWorkersAI(env, prompt, {
        maxTokens: 300
      });
    }

    return response.content;
  } catch (error) {
    console.error('Payroll summary error:', error);
    return `ملخص كشف رواتب ${payrollData.month} ${payrollData.year}: ${payrollData.totalEmployees} موظف، صافي المستحق ${payrollData.netSalary.toLocaleString('ar-EG')} جنيه.`;
  }
}
