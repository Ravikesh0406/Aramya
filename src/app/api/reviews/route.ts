import { createReview, listReviewsForTrainer, averageRatingForTrainer, reviewedBookingIds } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

// GET /api/reviews?trainer=Name → public list + average.
// GET /api/reviews?mine=1 → booking ids the signed-in customer reviewed.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const trainer = params.get("trainer");
  if (trainer) {
    const [reviews, summary] = await Promise.all([
      listReviewsForTrainer(trainer),
      averageRatingForTrainer(trainer),
    ]);
    return Response.json({ reviews, average: summary.average, count: summary.count });
  }
  if (params.get("mine") === "1") {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
    return Response.json({ reviewed: [...(await reviewedBookingIds(user.id))] });
  }
  return Response.json({ error: "trainer or mine=1 is required." }, { status: 400 });
}

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser(request);
  if (!user || user.role !== "customer") {
    return Response.json({ error: "Customer sign-in is required." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { bookingId, rating, note } = body as { bookingId?: string; rating?: number; note?: string };
  if (!bookingId) return Response.json({ error: "bookingId is required." }, { status: 400 });
  const result = await createReview(bookingId, user.id, Number(rating), typeof note === "string" ? note : "");
  if (!result.ok) {
    const status = result.reason === "NOT_FOUND" ? 404 : result.reason === "FORBIDDEN" ? 403 : 409;
    return Response.json({ error: result.detail, reason: result.reason }, { status });
  }
  return Response.json({ review: result.review }, { status: 201 });
}
