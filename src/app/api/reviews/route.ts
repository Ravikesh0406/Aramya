import { getCurrentUser } from "@/lib/server/session";
import { createReview, getReviewForBooking } from "@/lib/server/reviews";
import { getBookingById, getBookingCustomerId } from "@/lib/server/store";
import { rateLimited } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

/** POST { bookingId, rating, comment } — one review per completed booking. */
export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const limit = rateLimited(request, 10, 10 * 60_000);
  if (!limit.ok) {
    return Response.json({ error: `Too many reviews. Try again in ${limit.retryAfterSeconds}s.` }, { status: 429 });
  }

  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const bookingId = typeof input.bookingId === "string" ? input.bookingId : "";
  const rating = Number(input.rating);
  const comment = typeof input.comment === "string" ? input.comment.trim() : "";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: "Choose a rating between 1 and 5." }, { status: 400 });
  }

  const booking = await getBookingById(bookingId);
  if (!booking) return Response.json({ error: "Booking not found." }, { status: 404 });
  if ((await getBookingCustomerId(bookingId)) !== user.id) {
    return Response.json({ error: "You can only review your own sessions." }, { status: 403 });
  }
  if (booking.status !== "Completed") {
    return Response.json({ error: "Reviews open after a session is completed." }, { status: 409 });
  }
  if (!booking.trainerId) {
    return Response.json({ error: "This booking has no trainer attached yet." }, { status: 409 });
  }
  if (await getReviewForBooking(bookingId)) {
    return Response.json({ error: "You already reviewed this session." }, { status: 409 });
  }

  const review = await createReview({
    bookingId,
    trainerId: booking.trainerId,
    customerId: user.id,
    rating,
    comment,
  });
  return Response.json({ review }, { status: 201 });
}
