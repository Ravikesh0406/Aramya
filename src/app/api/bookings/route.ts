import { createBookingForCustomer, listVisibleBookings, resolveBookingMeetingUrl, expireStaleRequests } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/session";
import { SERVICES } from "@/lib/data";
import { nextDateForDay } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in to view your bookings." }, { status: 401 });
  }
  // Opportunistically expire unanswered requests; nothing schedules it in v1.
  void expireStaleRequests();
  const bookings = await listVisibleBookings(user);
  // Private Zoom links are only visible to the customer of a confirmed online booking.
  const withLinks = await Promise.all(
    bookings.map(async (booking) =>
      booking.format === "online" && booking.status === "Confirmed"
        ? { ...booking, meetingUrl: await resolveBookingMeetingUrl(booking.id) }
        : booking,
    ),
  );
  return Response.json({ bookings: withLinks });
}

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
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
  const days = Array.isArray(input.days) && input.days.every((day) => typeof day === "string")
    ? (input.days as string[])
    : [];

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

  const booking = await createBookingForCustomer(
    user.id,
    {
      location: input.location.trim(),
      serviceSlug: validService.slug,
      serviceName: validService.name,
      days: uniqueDays,
      time: input.time,
      specificTime: typeof input.specificTime === "string" ? input.specificTime : "",
    },
    { requestKind: "open" },
  );

  return Response.json({ booking }, { status: 201 });
}
