// ARAMYA — reviews and rating summaries.
// Ratings are real: they come from one review per completed booking.

import { ensureSchema, execute, query, queryOne, randomId } from "@/lib/server/db";

export type ReviewRow = {
  id: string;
  booking_id: string;
  trainer_id: string;
  customer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  customer_name: string;
};

export async function listReviewsForTrainer(trainerId: string, limit = 20): Promise<ReviewRow[]> {
  await ensureSchema();
  return query<ReviewRow>(
    `SELECT r.id, r.booking_id, r.trainer_id, r.customer_id, r.rating, r.comment, r.created_at,
            u.name AS customer_name
       FROM reviews r JOIN users u ON u.id = r.customer_id
      WHERE r.trainer_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2`,
    [trainerId, limit],
  );
}

export type RatingSummary = { count: number; average: number | null };

export async function ratingSummaryForTrainer(trainerId: string): Promise<RatingSummary> {
  await ensureSchema();
  const row = await queryOne<{ count: number; average: number | null }>(
    `SELECT COUNT(*)::int AS count, ROUND(AVG(rating)::numeric, 2) AS average
       FROM reviews WHERE trainer_id = $1`,
    [trainerId],
  );
  return { count: row?.count ?? 0, average: row && row.average !== null ? Number(row.average) : null };
}

export async function ratingSummaries(): Promise<Map<string, RatingSummary>> {
  await ensureSchema();
  const rows = await query<{ trainer_id: string; count: number; average: number | null }>(
    `SELECT trainer_id, COUNT(*)::int AS count, ROUND(AVG(rating)::numeric, 2) AS average
       FROM reviews GROUP BY trainer_id`,
  );
  const map = new Map<string, RatingSummary>();
  for (const row of rows) {
    if (!row) continue;
    map.set(row.trainer_id, {
      count: Number(row.count),
      average: row.average === null ? null : Number(row.average),
    });
  }
  return map;
}

export async function getReviewForBooking(bookingId: string): Promise<ReviewRow | null> {
  await ensureSchema();
  return queryOne<ReviewRow>(
    `SELECT r.*, u.name AS customer_name FROM reviews r JOIN users u ON u.id = r.customer_id
      WHERE r.booking_id = $1`,
    [bookingId],
  );
}

export async function createReview(input: {
  bookingId: string;
  trainerId: string;
  customerId: string;
  rating: number;
  comment: string;
}): Promise<ReviewRow> {
  await ensureSchema();
  const row = await queryOne<ReviewRow>(
    `INSERT INTO reviews (id, booking_id, trainer_id, customer_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, booking_id, trainer_id, customer_id, rating, comment, created_at`,
    [
      randomId(),
      input.bookingId,
      input.trainerId,
      input.customerId,
      input.rating,
      input.comment.slice(0, 1000),
    ],
  );
  if (!row) throw new Error("Could not save review.");
  return { ...row, customer_name: "" };
}

export async function deleteReview(bookingId: string, customerId: string): Promise<boolean> {
  await ensureSchema();
  const result = await execute("DELETE FROM reviews WHERE booking_id = $1 AND customer_id = $2", [
    bookingId,
    customerId,
  ]);
  return result.changes > 0;
}
