// ARAMYA — in-memory rate limiter.
//
// Protects signup, booking, upload, report and subscription-purchase routes.
// Limitation: per instance only — a multi-instance deployment needs a shared
// store (documented as a known gap).

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
}

export function rateLimited(request: Request, limit: number, windowMs = 60_000): RateLimitResult {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";
  let pathname = "/";
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    /* keep fallback */
  }
  return rateLimit(`${ip}|${pathname}`, limit, windowMs);
}

/** Test helper. */
export function resetRateLimits(): void {
  buckets.clear();
}
