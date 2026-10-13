import { getCurrentUser } from "@/lib/server/session";
import { createTargetedBooking } from "@/lib/server/booking";
import { rateLimited } from "@/lib/server/rate-limit";
import { listTrainerOfferings, getOfferingById } from "@/lib/server/trainers";
import { slotsForRange } from "@/lib/server/booking";
import { listTrainerAvailability, getTrainerBySlug } from "@/lib/server/trainers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const limit = rateLimited(request, 15, 10 * 60_000);
  if (!limit.ok) {
    return Response.json(
      { error: `Too many booking requests. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in before booking." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  const trainerSlug = typeof input.trainerSlug === "string" ? input.trainerSlug : "";
  const offeringId = typeof input.offeringId === "string" ? input.offeringId : "";
  const startTime = typeof input.startTime === "string" ? input.startTime : "";
  const location = typeof input.location === "string" ? input.location : "";
  const weekdays = Array.isArray(input.weekdays)
    ? input.weekdays.map((day) => Number(day)).filter((day) => Number.isInteger(day))
    : [];

  const result = await createTargetedBooking({
    customerId: user.id,
    trainerSlug,
    offeringId,
    weekdays: [...new Set(weekdays)],
    startTime,
    location,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ bookingId: result.bookingId }, { status: 201 });
}

/** GET ?trainer=slug&offering=id&weekday=n — bookable slots for the picker. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("trainer") ?? "";
  const offeringId = url.searchParams.get("offering") ?? "";
  const weekday = Number(url.searchParams.get("weekday"));

  const trainer = await getTrainerBySlug(slug);
  if (!trainer) return Response.json({ error: "Trainer not found." }, { status: 404 });

  const offering = offeringId ? await getOfferingById(offeringId) : null;
  const offerings = offering ? [offering] : await listTrainerOfferings(trainer.user_id);
  const availability = await listTrainerAvailability(trainer.user_id);

  const slots = new Set<string>();
  for (const row of availability) {
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
    const range = { weekday: row.weekday, startTime: row.start_time, endTime: row.end_time };
    for (const item of offerings) {
      for (const slot of slotsForRange(range, weekday, item.duration_min)) slots.add(slot);
    }
  }

  return Response.json({
    slots: [...slots].sort(),
    ranges: availability.map((range) => ({
      weekday: range.weekday,
      startTime: range.start_time,
      endTime: range.end_time,
    })),
  });
}
