// Inline 1–5 star rating form for a completed booking.
"use client";

import { useState } from "react";
import { submitReview } from "@/lib/reviews";

export function RateBooking({ bookingId, onRated }: { bookingId: string; onRated: () => void }) {
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await submitReview(bookingId, rating, note.trim());
      onRated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-forest-900/10 bg-ivory-50 p-4">
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => setRating(star)}
            className={`flex h-9 w-9 items-center justify-center rounded-sm text-lg transition duration-200 ease-out ${
              star <= rating ? "text-terracotta-500" : "text-muted-600/40 hover:text-muted-600"
            }`}
          >
            ★
          </button>
        ))}
        <span className="pl-1 text-body-sm font-semibold text-charcoal-900">{rating}/5</span>
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="How was your trainer? (optional)"
        rows={2}
        maxLength={500}
        className="w-full rounded-[10px] border border-forest-900/15 bg-white px-3 py-2 text-body-sm text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
      />
      {error ? <p className="text-body-sm text-error">{error}</p> : null}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="self-start rounded-[10px] bg-forest-900 px-4 py-2 text-body-sm font-semibold text-white transition duration-200 ease-out hover:bg-forest-800 disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
