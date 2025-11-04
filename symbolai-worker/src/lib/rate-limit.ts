/**
 * Rate Limiting Utilities
 *
 * KV-based rate limiting to prevent abuse and DoS attacks
 * Works with Cloudflare Workers KV storage
 */

import type { KVNamespace } from '@cloudflare/workers-types';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed
   */
  limit: number;

  /**
   * Time window in seconds
   */
  window: number;

  /**
   * Optional key prefix for namespacing
   */
  keyPrefix?: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Current request count
   */
  count: number;

  /**
   * Maximum requests allowed
   */
  limit: number;

  /**
   * Remaining requests
   */
  remaining: number;

  /**
   * Time until reset (seconds)
   */
  resetIn: number;

  /**
   * Reset timestamp
   */
  resetAt: number;
}

/**
 * Rate limit a request using sliding window algorithm
 *
 * @param kv - Cloudflare KV namespace
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 *
 * @example
 * const result = await rateLimit(env.KV, clientIP, {
 *   limit: 10,
 *   window: 60  // 10 requests per minute
 * });
 *
 * if (!result.allowed) {
 *   return new Response('Too Many Requests', {
 *     status: 429,
 *     headers: {
 *       'Retry-After': String(result.resetIn)
 *     }
 *   });
 * }
 */
export async function rateLimit(
  kv: KVNamespace,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, window, keyPrefix = 'ratelimit' } = config;
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowMs = window * 1000;

  try {
    // Get current count from KV
    const data = await kv.get(key, 'json') as {
      count: number;
      resetAt: number;
    } | null;

    // If no data or window expired, start fresh
    if (!data || now >= data.resetAt) {
      const newResetAt = now + windowMs;

      await kv.put(
        key,
        JSON.stringify({ count: 1, resetAt: newResetAt }),
        { expirationTtl: window + 10 } // Extra 10s buffer
      );

      return {
        allowed: true,
        count: 1,
        limit,
        remaining: limit - 1,
        resetIn: window,
        resetAt: newResetAt
      };
    }

    // Increment count
    const newCount = data.count + 1;
    const resetIn = Math.ceil((data.resetAt - now) / 1000);

    // Update KV
    await kv.put(
      key,
      JSON.stringify({ count: newCount, resetAt: data.resetAt }),
      { expirationTtl: resetIn + 10 } // Extra 10s buffer
    );

    // Check if limit exceeded
    const allowed = newCount <= limit;
    const remaining = Math.max(0, limit - newCount);

    return {
      allowed,
      count: newCount,
      limit,
      remaining,
      resetIn,
      resetAt: data.resetAt
    };
  } catch (error) {
    console.error('Rate limit error:', error);

    // On error, allow the request but log
    return {
      allowed: true,
      count: 0,
      limit,
      remaining: limit,
      resetIn: window,
      resetAt: now + windowMs
    };
  }
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
  /**
   * Login attempts: 5 per 15 minutes
   */
  LOGIN: {
    limit: 5,
    window: 15 * 60,
    keyPrefix: 'rl:login'
  } as RateLimitConfig,

  /**
   * API requests: 60 per minute
   */
  API: {
    limit: 60,
    window: 60,
    keyPrefix: 'rl:api'
  } as RateLimitConfig,

  /**
   * API requests (strict): 30 per minute
   */
  API_STRICT: {
    limit: 30,
    window: 60,
    keyPrefix: 'rl:api:strict'
  } as RateLimitConfig,

  /**
   * Webhook: 10 per minute
   */
  WEBHOOK: {
    limit: 10,
    window: 60,
    keyPrefix: 'rl:webhook'
  } as RateLimitConfig,

  /**
   * User registration: 3 per hour
   */
  REGISTER: {
    limit: 3,
    window: 60 * 60,
    keyPrefix: 'rl:register'
  } as RateLimitConfig,

  /**
   * Password reset: 3 per hour
   */
  PASSWORD_RESET: {
    limit: 3,
    window: 60 * 60,
    keyPrefix: 'rl:pwd-reset'
  } as RateLimitConfig,

  /**
   * Email sending: 10 per hour
   */
  EMAIL: {
    limit: 10,
    window: 60 * 60,
    keyPrefix: 'rl:email'
  } as RateLimitConfig,

  /**
   * File upload: 5 per 5 minutes
   */
  UPLOAD: {
    limit: 5,
    window: 5 * 60,
    keyPrefix: 'rl:upload'
  } as RateLimitConfig,

  /**
   * Report generation: 10 per hour
   */
  REPORT: {
    limit: 10,
    window: 60 * 60,
    keyPrefix: 'rl:report'
  } as RateLimitConfig,

  /**
   * AI/LLM requests: 20 per hour
   */
  AI: {
    limit: 20,
    window: 60 * 60,
    keyPrefix: 'rl:ai'
  } as RateLimitConfig
};

/**
 * Extract client IP from request
 *
 * @param request - HTTP request
 * @returns Client IP address
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
    request.headers.get('X-Real-IP') ||
    'unknown'
  );
}

/**
 * Create rate limit response
 *
 * @param result - Rate limit result
 * @returns HTTP Response (429 Too Many Requests)
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'محاولات كثيرة جداً',
      message: `تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة مرة أخرى بعد ${result.resetIn} ثانية`,
      limit: result.limit,
      remaining: result.remaining,
      resetIn: result.resetIn
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetAt),
        'Retry-After': String(result.resetIn)
      }
    }
  );
}

/**
 * Add rate limit headers to response
 *
 * @param response - HTTP response
 * @param result - Rate limit result
 * @returns Response with rate limit headers
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const newResponse = new Response(response.body, response);

  newResponse.headers.set('X-RateLimit-Limit', String(result.limit));
  newResponse.headers.set('X-RateLimit-Remaining', String(result.remaining));
  newResponse.headers.set('X-RateLimit-Reset', String(result.resetAt));

  return newResponse;
}

/**
 * Rate limit middleware for API routes
 *
 * @param kv - Cloudflare KV namespace
 * @param request - HTTP request
 * @param config - Rate limit configuration
 * @returns Response if rate limited, null otherwise
 *
 * @example
 * export const POST: APIRoute = async ({ request, locals }) => {
 *   const rateLimitResponse = await rateLimitMiddleware(
 *     locals.runtime.env.KV,
 *     request,
 *     RateLimitPresets.API
 *   );
 *
 *   if (rateLimitResponse) {
 *     return rateLimitResponse;
 *   }
 *
 *   // Process request...
 * };
 */
export async function rateLimitMiddleware(
  kv: KVNamespace,
  request: Request,
  config: RateLimitConfig
): Promise<Response | null> {
  const clientIP = getClientIP(request);
  const result = await rateLimit(kv, clientIP, config);

  if (!result.allowed) {
    return createRateLimitResponse(result);
  }

  return null;
}

/**
 * Check rate limit without incrementing
 * Useful for checking status without consuming a token
 *
 * @param kv - Cloudflare KV namespace
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 * @returns Rate limit result (read-only)
 */
export async function checkRateLimit(
  kv: KVNamespace,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, window, keyPrefix = 'ratelimit' } = config;
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();

  try {
    const data = await kv.get(key, 'json') as {
      count: number;
      resetAt: number;
    } | null;

    if (!data || now >= data.resetAt) {
      return {
        allowed: true,
        count: 0,
        limit,
        remaining: limit,
        resetIn: window,
        resetAt: now + window * 1000
      };
    }

    const resetIn = Math.ceil((data.resetAt - now) / 1000);
    const remaining = Math.max(0, limit - data.count);
    const allowed = data.count < limit;

    return {
      allowed,
      count: data.count,
      limit,
      remaining,
      resetIn,
      resetAt: data.resetAt
    };
  } catch (error) {
    console.error('Check rate limit error:', error);

    return {
      allowed: true,
      count: 0,
      limit,
      remaining: limit,
      resetIn: window,
      resetAt: now + window * 1000
    };
  }
}

/**
 * Reset rate limit for identifier
 * Useful for manual overrides or testing
 *
 * @param kv - Cloudflare KV namespace
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 */
export async function resetRateLimit(
  kv: KVNamespace,
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  const { keyPrefix = 'ratelimit' } = config;
  const key = `${keyPrefix}:${identifier}`;

  try {
    await kv.delete(key);
  } catch (error) {
    console.error('Reset rate limit error:', error);
  }
}

/**
 * Batch rate limit check
 * Check multiple identifiers at once
 *
 * @param kv - Cloudflare KV namespace
 * @param identifiers - Array of identifiers
 * @param config - Rate limit configuration
 * @returns Map of identifier -> rate limit result
 */
export async function batchCheckRateLimit(
  kv: KVNamespace,
  identifiers: string[],
  config: RateLimitConfig
): Promise<Map<string, RateLimitResult>> {
  const results = new Map<string, RateLimitResult>();

  await Promise.all(
    identifiers.map(async (id) => {
      const result = await checkRateLimit(kv, id, config);
      results.set(id, result);
    })
  );

  return results;
}
