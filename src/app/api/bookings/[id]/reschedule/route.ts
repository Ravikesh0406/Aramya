import { getBookingById, getBookingCustomerId, requestReschedule } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/session";
import { availabilityFits, trainerScheduleClash } from "@/lib/server/booking";
import { listTrainerAvailability } from "@/lib/server/trainers";
import { isValidTime } from "@/lib/validation";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Proposes a new schedule. Open requests keep the legacy "four days + window"
 * shape; targeted bookings propose weekdays + a start time, validated against the
 * trainer's availability and their existing schedule.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  const { id } = await params;
  if ((await getBookingCustomerId(id)) !== user.id) {
    return Response.json({ error: "You can only change your own booking." }, { status: 403 });
  }

  const booking = await getBookingById(id);
  if (!booking) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }

  // --- targeted bookings: weekdays + start time -----------------------------
  const weekdays = Array.isArray(input.weekdays)
    ? input.weekdays.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    : [];
  const startTime = typeof input.startTime === "string" ? input.startTime : "";

  if (booking.requestKind === "targeted" && (weekdays.length > 0 || startTime)) {
    if (weekdays.length === 0 || !isValidTime(startTime) || !booking.durationMin) {
      return Response.json({ error: "Choose at least one day and a valid start time." }, { status: 400 });
    }
    if (!booking.trainerId) {
      return Response.json({ error: "This booking has no trainer attached." }, { status: 409 });
    }
    const ranges = await listTrainerAvailability(booking.trainerId);
    const fit = availabilityFits(
      ranges.map((range) => ({ weekday: range.weekday, startTime: range.start_time, endTime: range.end_time })),
      [...new Set(weekdays)],
      startTime,
      booking.durationMin,
    );
    if (!fit.ok) {
      return Response.json({ error: fit.error }, { status: 400 });
    }
    const clash = await trainerScheduleClash(booking.trainerId, [...new Set(weekdays)], startTime, booking.durationMin, id);
    if (clash) {
      return Response.json({ error: "That time is already taken. Please pick another slot." }, { status: 409 });
    }
    const dayNames = [...new Set(weekdays)].sort((a, b) => a - b).map((day) => WEEKDAY_NAMES[day]);
    const updated = await requestReschedule(id, {
      days: dayNames,
      time: "Specific time",
      specificTime: startTime,
      proposedByRole: user.role,
    });
    return Response.json({ booking: updated });
  }

  // --- legacy open requests: four days + window -----------------------------
  const days = Array.isArray(input.days) && input.days.every((day) => typeof day === "string")
    ? [...new Set(input.days as string[])]
    : [];
  if (days.length !== 4 || typeof input.time !== "string") {
    return Response.json({ error: "Please choose four days and a time window." }, { status: 400 });
  }
  if (input.time === "Specific time") {
    if (typeof input.specificTime === "string" && isValidTime(input.specificTime)) {
      // fine
    } else {
      return Response.json({ error: "Specific time is required." }, { status: 400 });
    }
  }

  const rescheduled = await requestReschedule(id, {
    days,
    time: input.time,
    specificTime: typeof input.specificTime === "string" ? input.specificTime : "",
    proposedByRole: user.role,
  });
  if (!rescheduled) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }
  return Response.json({ booking: rescheduled });
}
