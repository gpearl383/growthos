/**
 * Tiny in-memory sliding-window rate limiter. Good enough for a single-node
 * POC; replace with Upstash/Redis when running multi-instance.
 *
 * Each call records a timestamp under `key`. Older-than-window entries are
 * dropped, then the count is compared to `max`. Memory grows with active keys
 * but is bounded by automatic cleanup whenever a key is checked.
 */

type Bucket = number[];

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function checkRateLimit(
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

  return {
    ok: true,
    remaining: options.max - recent.length,
    retryAfterMs: 0,
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
