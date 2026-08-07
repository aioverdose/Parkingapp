import { createAdminClient } from "@/lib/supabaseAdmin";

// Local fallback store, used only when Postgres is unavailable (tests, local
// dev without env vars) or the RPC fails transiently.
const localStore = new Map<string, { count: number; resetAt: number }>();

export function isDistributedRateLimitEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function checkRateLimitLocal(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = localStore.get(key);

  if (!entry || now > entry.resetAt) {
    localStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(maxRequests - 1, 0), resetAt: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: Math.max(maxRequests - entry.count, 0), resetAt: entry.resetAt };
}

export function clearRateLimitStore(): void {
  localStore.clear();
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Distributed rate limiter backed by a shared Postgres table, so limits are
 * enforced across all serverless instances. Falls back to an in-memory store
 * when the database is not configured or the check fails transiently.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (!isDistributedRateLimitEnabled()) {
    return checkRateLimitLocal(key, maxRequests, windowMs);
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_ms: windowMs,
    });

    if (error) {
      return checkRateLimitLocal(key, maxRequests, windowMs);
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { allowed: boolean; remaining: number; reset_at: string }
      | undefined;

    if (!row) {
      return checkRateLimitLocal(key, maxRequests, windowMs);
    }

    return {
      allowed: row.allowed,
      remaining: row.remaining,
      resetAt: new Date(row.reset_at).getTime(),
    };
  } catch {
    return checkRateLimitLocal(key, maxRequests, windowMs);
  }
}
