// Browser helpers for reviews.
"use client";

export async function submitReview(bookingId: string, rating: number, note: string) {
  const response = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify({ bookingId, rating, note }),
  });
  const data = (await response.json()) as { review?: unknown; error?: string };
  if (!response.ok) throw new Error(data.error ?? "Unable to submit review.");
  return data.review;
}

export async function getMyReviewedIds(): Promise<Set<string>> {
  try {
    const response = await fetch("/api/reviews?mine=1", { cache: "no-store" });
    if (!response.ok) return new Set();
    const data = (await response.json()) as { reviewed?: string[] };
    return new Set(data.reviewed ?? []);
  } catch {
    return new Set();
  }
}

export type TrainerReview = { id: string; rating: number; note: string; createdAt: string };

export async function getTrainerReviews(trainerName: string): Promise<{
  reviews: TrainerReview[];
  average: number | null;
  count: number;
}> {
  const response = await fetch(`/api/reviews?trainer=${encodeURIComponent(trainerName)}`, { cache: "no-store" });
  if (!response.ok) return { reviews: [], average: null, count: 0 };
  return (await response.json()) as { reviews: TrainerReview[]; average: number | null; count: number };
}
