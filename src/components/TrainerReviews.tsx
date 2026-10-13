"use client";

// Reviews on a public trainer profile. Ratings are real and always shown with
// their count; a trainer with no reviews is shown without any rating.

import { useState } from "react";
import { StarIcon } from "@/components/Icons";
import type { RatingSummary } from "@/lib/server/reviews";

export type PublicReview = {
  rating: number;
  comment: string;
  customerName: string;
  createdAt: string;
};

export function TrainerReviews({
  initial,
  rating,
}: {
  initial: PublicReview[];
  rating: RatingSummary | null;
}) {
  const [reviews] = useState(initial);

  return (
    <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 pb-4">
        <p className="t-overline text-terracotta-500">Reviews</p>
        {rating && rating.count > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-charcoal-900">
            <StarIcon size={15} className="text-terracotta-500" />
            {rating.average?.toFixed(1)}
            <span className="text-caption font-normal text-muted-600">
              from {rating.count} {rating.count === 1 ? "review" : "reviews"}
            </span>
          </span>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        <p className="text-body-sm text-muted-600">
          No reviews yet for this trainer. Reviews appear here after completed sessions.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-forest-900/8">
          {reviews.map((review, index) => (
            <li key={`${review.createdAt}-${index}`} className="flex flex-col gap-1 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-charcoal-900">
                  <StarIcon size={14} className="text-terracotta-500" />
                  {review.rating.toFixed(1)}
                </span>
                <span className="text-caption text-muted-600">
                  {review.customerName} · {new Date(review.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
              {review.comment ? <p className="text-body-sm text-charcoal-900">{review.comment}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
