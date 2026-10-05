import { createBookingForCustomer, listVisibleBookings } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/session";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { SERVICES } from "@/lib/data";
import { nextDateForDay } from "@/lib/dates";
import { DEFAULT_MATCH_RADIUS_KM } from "@/lib/geo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in to view your bookings." }, { status: 401 });
  }
  // Trainers may pass their live GPS fix (?lat=&lng=[&radiusKm=]) to see
  // nearby requests first — and only requests within the radius.
  // NOTE: URLSearchParams.get returns null when absent, and Number(null)
  // is 0 — so check presence before converting, or every unfiltered feed
  // would silently filter around (0,0).
  const params = new URL(request.url).searchParams;
  const latRaw = params.get("lat");
  const lngRaw = params.get("lng");
  const lat = latRaw == null ? NaN : Number(latRaw);
  const lng = lngRaw == null ? NaN : Number(lngRaw);
  const radiusKm = Number(params.get("radiusKm") ?? DEFAULT_MATCH_RADIUS_KM);
  const near =
    user.role === "trainer" && Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng, radiusKm: Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : DEFAULT_MATCH_RADIUS_KM }
      : undefined;
  const bookings = await listVisibleBookings(user, near);
  return Response.json({ bookings });
}

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in before booking." }, { status: 401 });
  }

  const bookingLimit = checkRateLimit(`bookings:${user.id}`, 20, 60_000);
  if (!bookingLimit.ok) {
    return Response.json(
      { error: `Too many requests — try again in ${bookingLimit.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(bookingLimit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const days = Array.isArray(input.days) && input.days.every((day) => typeof day === "string")
    ? (input.days as string[])
    : [];
  // GPS fix is optional (older clients) but preferred — geo-matching
  // only works for bookings stored with coordinates.
  const lat = typeof input.lat === "number" ? input.lat : null;
  const lng = typeof input.lng === "number" ? input.lng : null;

  if (
    typeof input.location !== "string" ||
    !input.location.trim() ||
    typeof input.serviceSlug !== "string" ||
    typeof input.serviceName !== "string" ||
    typeof input.time !== "string" ||
    !days.length
  ) {
    return Response.json({ error: "Complete booking details are required." }, { status: 400 });
  }

  const validService = SERVICES.find((service) => service.slug === input.serviceSlug);
  if (!validService) {
    return Response.json({ error: "Please choose one of the active services." }, { status: 400 });
  }

  const uniqueDays = [...new Set(days)];
  if (uniqueDays.length !== 4) {
    return Response.json({ error: "Please choose four unique days." }, { status: 400 });
  }

  if (input.time === "Specific time" && typeof input.specificTime !== "string") {
    return Response.json({ error: "Specific time is required." }, { status: 400 });
  }

  const cutoff = Date.now() + 24 * 60 * 60 * 1000;
  const invalidDay = uniqueDays.find((day) => {
    const nextDate = nextDateForDay(day);
    return !nextDate || nextDate.getTime() < cutoff;
  });
  if (invalidDay) {
    return Response.json(
      { error: "Preferred sessions must be at least 24 hours in advance. Please move the first request later." },
      { status: 400 },
    );
  }

  const booking = await createBookingForCustomer(user.id, {
    location: input.location.trim(),
    lat,
    lng,
    serviceSlug: validService.slug,
    serviceName: validService.name,
    days: uniqueDays,
    time: input.time,
    specificTime: typeof input.specificTime === "string" ? input.specificTime : "",
  });

  // Fire-and-forget trainer SMS (Phase 5B). Never blocks the response —
  // notify() swallows its own errors and logs when unconfigured.
  const { notifyTrainersOfBooking } = await import("@/lib/server/notify");
  void notifyTrainersOfBooking(booking);

  return Response.json({ booking }, { status: 201 });
}
