/**
 * Rate Limiting Middleware
 * حماية API endpoints من Brute Force attacks
 * Using Cloudflare Workers KV for distributed rate limiting
 */

export interface RateLimitConfig {
  /**
   * عدد الطلبات المسموح بها
   */
  maxRequests: number;

  /**
   * النافذة الزمنية بالثواني
   */
  windowSeconds: number;

  /**
   * رسالة الخطأ
   */
  message?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  message?: string;
}

// Preset configurations
export const RATE_LIMIT_PRESETS = {
  // للطلبات العادية
  standard: {
    maxRequests: 100,
    windowSeconds: 60 * 60, // 1 hour
    message: 'تم تجاوز عدد الطلبات المسموح بها، يرجى المحاولة لاحقاً'
  },

  // لتسجيل الدخول (صارم جداً)
  auth: {
    maxRequests: 5,
    windowSeconds: 60 * 15, // 15 minutes
    message: 'تم تجاوز عدد محاولات تسجيل الدخول، يرجى الانتظار 15 دقيقة'
  },

  // للـ API calls
  api: {
    maxRequests: 200,
    windowSeconds: 60 * 60, // 1 hour
    message: 'تم تجاوز عدد استدعاءات API المسموح بها'
  },

  // للعمليات الحساسة
  sensitive: {
    maxRequests: 10,
    windowSeconds: 60 * 60, // 1 hour
    message: 'تم تجاوز عدد الطلبات المسموح بها لهذه العملية الحساسة'
  }
};

/**
 * التحقق من Rate Limit
 */
export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  config: RateLimitConfig = RATE_LIMIT_PRESETS.standard
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `rate_limit:${key}:${Math.floor(now / (config.windowSeconds * 1000))}`;

  try {
    // جلب العدد الحالي
    const currentCount = await kv.get<number>(windowKey, 'json') || 0;

    // التحقق من الحد الأقصى
    if (currentCount >= config.maxRequests) {
      const resetAt = Math.ceil(now / (config.windowSeconds * 1000)) * (config.windowSeconds * 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        message: config.message || 'Rate limit exceeded'
      };
    }

    // زيادة العداد
    const newCount = currentCount + 1;
    await kv.put(windowKey, JSON.stringify(newCount), {
      expirationTtl: config.windowSeconds
    });

    const resetAt = Math.ceil(now / (config.windowSeconds * 1000)) * (config.windowSeconds * 1000);

    return {
      allowed: true,
      remaining: config.maxRequests - newCount,
      resetAt
    };

  } catch (error) {
    console.error('Error checking rate limit:', error);
    // في حالة الخطأ، نسمح بالطلب (fail-open)
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: now + (config.windowSeconds * 1000)
    };
  }
}

/**
 * Rate Limiting Middleware
 */
export async function rateLimitMiddleware(
  request: Request,
  kv: KVNamespace,
  config?: RateLimitConfig
): Promise<Response | null> {
  const ip = getClientIP(request);
  const url = new URL(request.url);
  const path = url.pathname;

  // تحديد نوع Rate Limit حسب المسار
  let limitConfig = config;
  if (!limitConfig) {
    if (path.includes('/api/auth/login')) {
      limitConfig = RATE_LIMIT_PRESETS.auth;
    } else if (path.startsWith('/api/')) {
      limitConfig = RATE_LIMIT_PRESETS.api;
    } else {
      limitConfig = RATE_LIMIT_PRESETS.standard;
    }
  }

  const key = `${ip}:${path}`;
  const result = await checkRateLimit(kv, key, limitConfig);

  // إضافة Headers للـ Response
  const headers = {
    'X-RateLimit-Limit': String(limitConfig.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
  };

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: result.message,
        resetAt: result.resetAt
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          ...headers
        }
      }
    );
  }

  // إذا مسموح، نرجع null للسماح بالاستمرار
  // (Middleware يمكن أن يضيف headers للـ response لاحقاً)
  return null;
}

/**
 * Rate Limiting Decorator للـ API Routes
 */
export function withRateLimit(
  config?: RateLimitConfig
) {
  return function (
    handler: (request: Request, env: any) => Promise<Response>
  ) {
    return async function (request: Request, env: any): Promise<Response> {
      // التحقق من Rate Limit
      const rateLimitResponse = await rateLimitMiddleware(
        request,
        env.KV,
        config
      );

      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      // استدعاء Handler الأصلي
      const response = await handler(request, env);

      // إضافة Rate Limit headers
      const ip = getClientIP(request);
      const url = new URL(request.url);
      const path = url.pathname;
      const limitConfig = config || RATE_LIMIT_PRESETS.standard;
      const key = `${ip}:${path}`;
      const result = await checkRateLimit(env.KV, key, limitConfig);

      // نسخ headers الموجودة
      const headers = new Headers(response.headers);
      headers.set('X-RateLimit-Limit', String(limitConfig.maxRequests));
      headers.set('X-RateLimit-Remaining', String(result.remaining));
      headers.set('X-RateLimit-Reset', String(result.resetAt));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    };
  };
}

/**
 * الحصول على IP من Request
 */
function getClientIP(request: Request): string {
  // Cloudflare Workers specific
  const cfConnectingIP = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIP) return cfConnectingIP;

  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIP = request.headers.get('X-Real-IP');
  if (xRealIP) return xRealIP;

  return 'unknown';
}

/**
 * إعادة تعيين Rate Limit (للإدارة)
 */
export async function resetRateLimit(
  kv: KVNamespace,
  key: string
): Promise<void> {
  const now = Date.now();
  // حذف جميع النوافذ الزمنية لهذا المفتاح
  const patterns = [
    `rate_limit:${key}:*`
  ];

  // ملاحظة: KV لا يدعم wildcard delete، يجب تنفيذ حذف يدوي
  // هذا placeholder للتوثيق
  console.log('Reset rate limit for key:', key);
}
