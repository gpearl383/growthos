import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

// --- Upstash distributed limiter (production) ---

// Cache Ratelimit instances by config so we reuse the Redis connection across
// requests on the same function instance.
const limiterCache = new Map<string, Ratelimit | null>();

function getUpstashLimiter(
  max: number,
  windowMs: number,
): Ratelimit | null {
  const configKey = `${max}:${windowMs}`;
  if (limiterCache.has(configKey)) return limiterCache.get(configKey)!;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const limiter = url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(max, `${Math.round(windowMs / 1000)} s`),
        prefix: "rl",
      })
    : null;

  limiterCache.set(configKey, limiter);
  return limiter;
}

// --- In-memory fallback (local dev when Upstash vars absent) ---

type Bucket = number[];
const buckets = new Map<string, Bucket>();

function checkInMemory(
  key: string,
  options: { max: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - options.windowMs;
  const bucket = buckets.get(key) ?? [];
  const recent = bucket.filter((ts) => ts > cutoff);

  if (recent.length >= options.max) {
    const oldest = recent[0] ?? now;
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, options.windowMs - (now - oldest)),
    };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { ok: true, remaining: options.max - recent.length, retryAfterMs: 0 };
}

// --- Public API ---

export async function checkRateLimit(
  key: string,
  options: { max: number; windowMs: number },
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(options.max, options.windowMs);

  if (!limiter) {
    // No Upstash credentials — fall back to in-memory (single-instance only).
    // Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for distributed enforcement.
    return checkInMemory(key, options);
  }

  const { success, remaining, reset } = await limiter.limit(key);
  const now = Date.now();
  return {
    ok: success,
    remaining,
    retryAfterMs: success ? 0 : Math.max(0, reset - now),
  };
}

/**
 * Best-effort IP extraction. We trust x-forwarded-for / x-real-ip because
 * this app runs behind Next.js (Vercel injects forwarded headers); in local
 * dev we fall back to a constant so localhost is still rate-limited.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}
