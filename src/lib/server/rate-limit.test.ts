import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/server/rate-limit";

describe("rate-limit", () => {
  it("allows up to the limit then rejects with retry-after", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3, 60_000).ok).toBe(true);
    }
    const blocked = checkRateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates buckets by key", () => {
    const a = `a-${Date.now()}`;
    const b = `b-${Date.now()}`;
    checkRateLimit(a, 1, 60_000);
    expect(checkRateLimit(a, 1, 60_000).ok).toBe(false);
    expect(checkRateLimit(b, 1, 60_000).ok).toBe(true);
  });
});
