// Simple in-memory token buckets for abuse protection.
// Single-node safe (dev + single-instance prod). For multi-instance deploys,
// put a KV (Upstash/Vercel KV) behind the same checkRateLimit signature.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function sweep(now: number) {
  if (buckets.size < 2000) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): {
  ok: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  sweep(now);
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  entry.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimited(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): Response | null {
  const result = checkRateLimit(`${bucket}:${clientIp(request)}`, limit, windowMs);
  if (result.ok) return null;
  return Response.json(
    { error: `Too many requests — try again in ${result.retryAfterSec}s.` },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } },
  );
}
