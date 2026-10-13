import { getCurrentUser } from "@/lib/server/session";
import {
  getTrainerByUserId,
  listTrainerAvailability,
  listTrainerOfferings,
  replaceTrainerAvailability,
} from "@/lib/server/trainers";
import { toMinutes, isValidTime, overlapsInterval } from "@/lib/validation";

export const dynamic = "force-dynamic";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  return Response.json({ availability: await listTrainerAvailability(user.id) });
}

/**
 * PUT { ranges: [{ weekday, startTime, endTime }] }
 * 15-minute granularity, start < end, no overlaps within a weekday, and every
 * range at least as long as the shortest active offering.
 */
export async function PUT(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  const trainer = await getTrainerByUserId(user.id);
  if (!trainer) return Response.json({ error: "Trainer profile not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (!Array.isArray(input.ranges)) {
    return Response.json({ error: "Availability must be a list of time ranges." }, { status: 400 });
  }

  const offerings = await listTrainerOfferings(user.id);
  const shortestOffering = offerings
    .filter((offering) => offering.active)
    .reduce((min, offering) => Math.min(min, offering.duration_min), Number.POSITIVE_INFINITY);

  const ranges: { weekday: number; startTime: string; endTime: string }[] = [];
  const byWeekday = new Map<number, { start: number; end: number }[]>();

  for (const entry of input.ranges) {
    if (!entry || typeof entry !== "object") {
      return Response.json({ error: "Invalid availability entry." }, { status: 400 });
    }
    const record = entry as Record<string, unknown>;
    const weekday = Number(record.weekday);
    const startTime = typeof record.startTime === "string" ? record.startTime : "";
    const endTime = typeof record.endTime === "string" ? record.endTime : "";

    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return Response.json({ error: "Each range needs a valid weekday." }, { status: 400 });
    }
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return Response.json({ error: "Times must be in HH:MM format." }, { status: 400 });
    }
    const start = toMinutes(startTime) as number;
    const end = toMinutes(endTime) as number;
    if (start >= end) {
      return Response.json({ error: `On ${WEEKDAY_NAMES[weekday]}, the start time must be before the end time.` }, { status: 400 });
    }
    if (start % 15 !== 0 || end % 15 !== 0) {
      return Response.json({ error: "Availability changes in 15-minute steps." }, { status: 400 });
    }
    if (Number.isFinite(shortestOffering) && end - start < shortestOffering) {
      return Response.json(
        {
          error: `Each range must be at least ${shortestOffering} minutes long — the length of your shortest active session.`,
        },
        { status: 400 },
      );
    }

    const dayRanges = byWeekday.get(weekday) ?? [];
    for (const existing of dayRanges) {
      if (overlapsInterval({ start, end }, existing)) {
        return Response.json(
          { error: `Overlapping ranges on ${WEEKDAY_NAMES[weekday]}. Please separate them.` },
          { status: 400 },
        );
      }
    }
    dayRanges.push({ start, end });
    byWeekday.set(weekday, dayRanges);
    ranges.push({ weekday, startTime, endTime });
  }

  await replaceTrainerAvailability(user.id, ranges);
  return Response.json({ availability: await listTrainerAvailability(user.id) });
}
