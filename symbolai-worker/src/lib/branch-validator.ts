/**
 * Branch Access Validator
 * Backend validation لعزل الفروع مع IP tracking
 * يمنع تجاوز القفل من جانب المتصفح
 */

export interface BranchAccessResult {
  allowed: boolean;
  lockDuration?: number;
  attemptsLeft?: number;
  message?: string;
}

export interface LockInfo {
  attempts: number;
  lockedUntil: number | null;
  ip: string;
}

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_3_ATTEMPTS = 60 * 60 * 1000;     // 1 hour
const LOCK_DURATION_5_ATTEMPTS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * التحقق من صلاحية الوصول للفرع
 */
export async function validateBranchAccess(
  kv: KVNamespace,
  branchId: string,
  ip: string,
  userId?: string
): Promise<BranchAccessResult> {
  const key = `branch_attempts:${ip}:${branchId}`;

  try {
    // جلب معلومات المحاولات
    const lockInfo = await kv.get<LockInfo>(key, 'json');

    if (!lockInfo) {
      // أول محاولة
      return {
        allowed: true,
        attemptsLeft: MAX_ATTEMPTS
      };
    }

    const now = Date.now();

    // التحقق من القفل
    if (lockInfo.lockedUntil && lockInfo.lockedUntil > now) {
      const remainingTime = lockInfo.lockedUntil - now;
      return {
        allowed: false,
        lockDuration: remainingTime,
        attemptsLeft: 0,
        message: lockInfo.attempts >= 5
          ? 'تم قفل الوصول لمدة 24 ساعة بسبب تجاوز عدد المحاولات'
          : 'تم قفل الوصول مؤقتاً، يرجى المحاولة لاحقاً'
      };
    }

    // إذا انتهى القفل، نسمح بمحاولة جديدة
    if (lockInfo.lockedUntil && lockInfo.lockedUntil <= now) {
      // إعادة تعيين المحاولات
      await resetBranchAttempts(kv, branchId, ip);
      return {
        allowed: true,
        attemptsLeft: MAX_ATTEMPTS
      };
    }

    // التحقق من عدد المحاولات
    if (lockInfo.attempts >= MAX_ATTEMPTS) {
      return {
        allowed: false,
        lockDuration: LOCK_DURATION_5_ATTEMPTS,
        attemptsLeft: 0,
        message: 'تم تجاوز الحد الأقصى للمحاولات'
      };
    }

    if (lockInfo.attempts >= 3) {
      return {
        allowed: false,
        lockDuration: LOCK_DURATION_3_ATTEMPTS,
        attemptsLeft: MAX_ATTEMPTS - lockInfo.attempts,
        message: 'تحذير: لديك محاولات محدودة متبقية'
      };
    }

    return {
      allowed: true,
      attemptsLeft: MAX_ATTEMPTS - lockInfo.attempts
    };

  } catch (error) {
    console.error('Error validating branch access:', error);
    // في حالة الخطأ، نسمح بالوصول (fail-open)
    return {
      allowed: true,
      message: 'تحذير: فشل التحقق من الصلاحيات'
    };
  }
}

/**
 * تسجيل محاولة فاشلة
 */
export async function recordFailedAttempt(
  kv: KVNamespace,
  branchId: string,
  ip: string,
  userId?: string
): Promise<void> {
  const key = `branch_attempts:${ip}:${branchId}`;

  try {
    const lockInfo = await kv.get<LockInfo>(key, 'json');
    const now = Date.now();

    const newAttempts = (lockInfo?.attempts || 0) + 1;
    let lockedUntil: number | null = null;

    // تحديد مدة القفل
    if (newAttempts >= 5) {
      lockedUntil = now + LOCK_DURATION_5_ATTEMPTS;
    } else if (newAttempts >= 3) {
      lockedUntil = now + LOCK_DURATION_3_ATTEMPTS;
    }

    const newLockInfo: LockInfo = {
      attempts: newAttempts,
      lockedUntil,
      ip
    };

    // حفظ في KV مع expiration
    const expirationTtl = lockedUntil
      ? Math.ceil((lockedUntil - now) / 1000)
      : 24 * 60 * 60; // 24 hours

    await kv.put(key, JSON.stringify(newLockInfo), {
      expirationTtl
    });

    // تسجيل في Audit log
    if (userId) {
      await logBranchAccessAttempt(kv, branchId, ip, userId, 'failed', newAttempts);
    }

  } catch (error) {
    console.error('Error recording failed attempt:', error);
  }
}

/**
 * تسجيل محاولة ناجحة
 */
export async function recordSuccessfulAccess(
  kv: KVNamespace,
  branchId: string,
  ip: string,
  userId?: string
): Promise<void> {
  const key = `branch_attempts:${ip}:${branchId}`;

  try {
    // إعادة تعيين المحاولات عند النجاح
    await kv.delete(key);

    // تسجيل في Audit log
    if (userId) {
      await logBranchAccessAttempt(kv, branchId, ip, userId, 'success', 0);
    }

  } catch (error) {
    console.error('Error recording successful access:', error);
  }
}

/**
 * إعادة تعيين المحاولات
 */
export async function resetBranchAttempts(
  kv: KVNamespace,
  branchId: string,
  ip: string
): Promise<void> {
  const key = `branch_attempts:${ip}:${branchId}`;
  await kv.delete(key);
}

/**
 * تسجيل محاولات الوصول في Audit log
 */
async function logBranchAccessAttempt(
  kv: KVNamespace,
  branchId: string,
  ip: string,
  userId: string,
  status: 'success' | 'failed',
  attempts: number
): Promise<void> {
  const logKey = `branch_access_log:${Date.now()}:${ip}`;
  const logEntry = {
    branchId,
    ip,
    userId,
    status,
    attempts,
    timestamp: new Date().toISOString()
  };

  try {
    await kv.put(logKey, JSON.stringify(logEntry), {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    });
  } catch (error) {
    console.error('Error logging branch access attempt:', error);
  }
}

/**
 * الحصول على IP من Request
 */
export function getClientIP(request: Request): string {
  // Cloudflare Workers specific headers
  const cfConnectingIP = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIP) return cfConnectingIP;

  // Fallback headers
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIP = request.headers.get('X-Real-IP');
  if (xRealIP) return xRealIP;

  return 'unknown';
}
