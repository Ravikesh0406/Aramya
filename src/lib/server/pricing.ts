// ARAMYA — trainer pricing limits (bounds are data, never hardcoded).

import { ensureSchema, execute, query, queryOne, randomId } from "@/lib/server/db";
import { isValidDuration } from "@/lib/validation";

export type PricingLimitRow = {
  id: string;
  category_slug: string | null;
  min_paise: number;
  max_paise: number;
  updated_at: string;
};

export type PricingBounds = { minPaise: number; maxPaise: number; categorySlug: string | null };

export async function listPricingLimits(): Promise<PricingLimitRow[]> {
  await ensureSchema();
  return query<PricingLimitRow>("SELECT * FROM pricing_limits ORDER BY category_slug NULLS FIRST");
}

/** Category-specific limit, falling back to the single global row. */
export async function getPricingBounds(categorySlug: string): Promise<PricingBounds | null> {
  await ensureSchema();
  const categoryRow = await queryOne<PricingLimitRow>(
    "SELECT * FROM pricing_limits WHERE category_slug = $1",
    [categorySlug],
  );
  const row = categoryRow ?? (await queryOne<PricingLimitRow>("SELECT * FROM pricing_limits WHERE category_slug IS NULL LIMIT 1"));
  if (!row) return null;
  return {
    minPaise: Number(row.min_paise),
    maxPaise: Number(row.max_paise),
    categorySlug: row.category_slug,
  };
}

export async function upsertPricingLimit(input: {
  id?: string;
  categorySlug: string | null;
  minPaise: number;
  maxPaise: number;
}): Promise<PricingLimitRow> {
  await ensureSchema();
  const existing = input.id
    ? await queryOne<PricingLimitRow>("SELECT * FROM pricing_limits WHERE id = $1", [input.id])
    : await queryOne<PricingLimitRow>("SELECT * FROM pricing_limits WHERE category_slug IS NOT DISTINCT FROM $1", [
        input.categorySlug,
      ]);
  if (existing) {
    const row = await queryOne<PricingLimitRow>(
      "UPDATE pricing_limits SET min_paise = $1, max_paise = $2, updated_at = now() WHERE id = $3 RETURNING *",
      [input.minPaise, input.maxPaise, existing.id],
    );
    if (!row) throw new Error("Could not update pricing limits.");
    return row;
  }
  const row = await queryOne<PricingLimitRow>(
    `INSERT INTO pricing_limits (id, category_slug, min_paise, max_paise)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [randomId(), input.categorySlug, input.minPaise, input.maxPaise],
  );
  if (!row) throw new Error("Could not create pricing limits.");
  return row;
}

export type PriceCheckInput = {
  categorySlug: string;
  durationMin: number;
  pricePaise: number;
  sessionsInPackage: number;
};

export type PriceCheckResult = { ok: true } | { ok: false; error: string };

/**
 * Bounds are expressed per 60 minutes. A package of N sessions must satisfy the
 * bounds on a per-session basis (discounts allowed, never below the minimum).
 */
export async function checkOfferingPrice(input: PriceCheckInput): Promise<PriceCheckResult> {
  if (!isValidDuration(input.durationMin)) {
    return { ok: false, error: "Duration must be between 15 and 180 minutes in 15-minute steps." };
  }
  if (!Number.isInteger(input.pricePaise) || input.pricePaise <= 0) {
    return { ok: false, error: "Price must be a positive amount in paise." };
  }
  if (!Number.isInteger(input.sessionsInPackage) || input.sessionsInPackage < 1) {
    return { ok: false, error: "A package must contain at least one session." };
  }

  const bounds = await getPricingBounds(input.categorySlug);
  if (!bounds) {
    return { ok: false, error: "Pricing limits are not configured yet. Please contact support." };
  }

  const perSessionPaise = input.pricePaise / input.sessionsInPackage;
  const perMinute = perSessionPaise / input.durationMin;
  const perHour = Math.round(perMinute * 60);

  if (perHour < bounds.minPaise || perHour > bounds.maxPaise) {
    const min = Math.ceil((bounds.minPaise * input.durationMin * input.sessionsInPackage) / 60);
    const max = Math.floor((bounds.maxPaise * input.durationMin * input.sessionsInPackage) / 60);
    return {
      ok: false,
      error: `For a ${input.durationMin}-minute session, the total must be between ₹${Math.floor(
        min / 100,
      ).toLocaleString("en-IN")} and ₹${Math.floor(max / 100).toLocaleString("en-IN")} for ${
        input.sessionsInPackage
      } session(s).`,
    };
  }
  return { ok: true };
}

/** Convenience for the UI: allowed range for one duration, in paise. */
export async function allowedPriceRange(
  categorySlug: string,
  durationMin: number,
  sessionsInPackage = 1,
): Promise<{ minPaise: number; maxPaise: number } | null> {
  const bounds = await getPricingBounds(categorySlug);
  if (!bounds) return null;
  return {
    minPaise: Math.ceil((bounds.minPaise * durationMin * sessionsInPackage) / 60),
    maxPaise: Math.floor((bounds.maxPaise * durationMin * sessionsInPackage) / 60),
  };
}

export async function deletePricingLimit(id: string): Promise<boolean> {
  await ensureSchema();
  const result = await execute("DELETE FROM pricing_limits WHERE id = $1", [id]);
  return result.changes > 0;
}
