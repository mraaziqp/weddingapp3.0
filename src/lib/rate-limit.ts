/**
 * Minimal in-memory rate limiting for the public write endpoints.
 *
 * This is deliberately not a distributed limiter — there's no Redis here and
 * a wedding site doesn't warrant one. On serverless each instance keeps its
 * own counters, so the effective limit is (limit × warm instances). That is
 * still the difference between "someone can try 10,000 admin keys a minute"
 * and "someone can try a few dozen", which is the attack this needs to stop.
 *
 * Entries are swept lazily, so an idle process doesn't hold a timer open and
 * the map can't grow without bound across a long-running instance.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the window resets — for the Retry-After header. */
  retryAfter: number;
  remaining: number;
};

/**
 * Counts one hit against `key`. Returns whether it may proceed.
 *
 * @param key    Caller identity — usually `${route}:${ip}`.
 * @param limit  Requests allowed per window.
 * @param windowMs Window length in milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0, remaining: limit - 1 };
  }

  existing.count++;
  if (existing.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }
  return { allowed: true, retryAfter: 0, remaining: limit - existing.count };
}

/**
 * Best-effort client IP.
 *
 * Behind Vercel the left-most x-forwarded-for entry is the real client. That
 * header is spoofable in general, so this is a speed bump for casual abuse
 * rather than an identity guarantee — which is all the limiter above claims
 * to be. Falls back to a shared bucket when no header is present, which fails
 * closed (everyone shares one limit) rather than open.
 */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
