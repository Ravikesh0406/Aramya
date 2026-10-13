"use client";

// Client helpers for pricing limits and categories used in the trainer UI.

export async function allowedPriceRange(
  categorySlug: string,
  durationMin: number,
  sessionsInPackage = 1,
): Promise<{ minPaise: number; maxPaise: number } | null> {
  const params = new URLSearchParams({
    category: categorySlug,
    duration: String(durationMin),
    sessions: String(sessionsInPackage),
  });
  const response = await fetch(`/api/pricing-range?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) return null;
  const data = (await response.json()) as { range: { minPaise: number; maxPaise: number } | null };
  return data.range;
}

export async function listCategoriesClient(): Promise<{ slug: string; name: string; description: string }[]> {
  const response = await fetch("/api/categories", { cache: "no-store" });
  if (!response.ok) return [];
  const data = (await response.json()) as { categories: { slug: string; name: string; description: string }[] };
  return data.categories;
}
