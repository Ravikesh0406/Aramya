// Trainer reputation: average rating + recent reviews.
"use client";

import { useEffect, useState } from "react";
import { getTrainerReviews, type TrainerReview } from "@/lib/reviews";
import { useCurrentUser } from "@/lib/auth";

export function TrainerReviews() {
  const { user } = useCurrentUser();
  const [data, setData] = useState<{ reviews: TrainerReview[]; average: number | null; count: number } | null>(null);

  useEffect(() => {
    if (!user || user.role !== "trainer") return;
    let cancelled = false;
    getTrainerReviews(user.name).then((res) => {
      if (!cancelled) setData(res);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || user.role !== "trainer" || !data) return null;

  return (
    <div className="rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm">
      <p className="t-overline pb-4 text-muted-600">Your rating</p>
      {data.count === 0 ? (
        <p className="text-body-sm text-muted-600">
          No reviews yet — completed sessions can be rated by customers.
        </p>
      ) : (
        <>
          <p className="text-body-md text-forest-900">
            ★ {data.average?.toFixed(1)} <span className="text-body-sm font-normal text-muted-600">({data.count} review{data.count === 1 ? "" : "s"})</span>
          </p>
          <ul className="mt-4 flex flex-col gap-3 border-t border-forest-900/8 pt-4">
            {data.reviews.slice(0, 3).map((review) => (
              <li key={review.id} className="text-body-sm">
                <span className="font-semibold text-charcoal-900">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                {review.note ? <span className="text-muted-600"> — {review.note}</span> : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
