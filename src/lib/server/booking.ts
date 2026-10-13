// ARAMYA — targeted booking rules (D5/D6): availability fit, clash checks,
// price snapshot recomputed from the database.

import { ensureSchema, query, queryOne, randomId } from "@/lib/server/db";
import {
  getCategory,
  getOfferingById,
  getTrainerBySlug,
  listTrainerAvailability,
  isPubliclyListed,
  listingFeeRequired,
  trainerHasActiveOffering,
  trainerHasActiveSubscription,
} from "@/lib/server/trainers";
import { toMinutes, isValidTime, overlapsInterval } from "@/lib/validation";
import type { BookingFormat } from "@/lib/models";

export type AvailabilityRange = { weekday: number; startTime: string; endTime: string };

const CLASH_STATUSES = [
  "Requested",
  "Accepted",
  "Confirmed",
  "Upcoming",
  "In Progress",
  "Reschedule Requested",
  "Rescheduled",
];

export type FitResult = { ok: true } | { ok: false; error: string };

/** Every chosen weekday must hold [start, start+duration] inside one range. */
export function availabilityFits(
  ranges: AvailabilityRange[],
  weekdays: number[],
  startTime: string,
  durationMin: number,
): FitResult {
  const start = toMinutes(startTime);
  if (start === null) return { ok: false, error: "Choose a start time." };
  const end = start + durationMin;

  const byWeekday = new Map<number, AvailabilityRange[]>();
  for (const range of ranges) {
    const list = byWeekday.get(range.weekday) ?? [];
    list.push(range);
    byWeekday.set(range.weekday, list);
  }

  for (const weekday of weekdays) {
    const dayRanges = byWeekday.get(weekday) ?? [];
    const fits = dayRanges.some((range) => {
      const rangeStart = toMinutes(range.startTime) ?? 0;
      const rangeEnd = toMinutes(range.endTime) ?? 0;
      return start >= rangeStart && end <= rangeEnd;
    });
    if (!fits) {
      return {
        ok: false,
        error: "The trainer is not available at that time on every chosen day.",
      };
    }
  }
  return { ok: true };
}

export async function trainerScheduleClash(
  trainerId: string,
  weekdays: number[],
  startTime: string,
  durationMin: number,
  excludeBookingId?: string,
): Promise<boolean> {
  await ensureSchema();
  const start = toMinutes(startTime);
  if (start === null) return true;
  const end = start + durationMin;

  const rows = await query<{ id: string; days: string; start_time: string | null; end_time: string | null }>(
    `SELECT id, days, start_time, end_time FROM bookings
      WHERE trainer_id = $1 AND status = ANY($2::text[])`,
    [trainerId, CLASH_STATUSES as unknown as string],
  );

  for (const row of rows) {
    if (row.id === excludeBookingId) continue;
    let days: number[] = [];
    try {
      const parsed = JSON.parse(row.days) as string[];
      const indexByName: Record<string, number> = {
        Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
      };
      days = parsed.map((day) => indexByName[day]).filter((value) => typeof value === "number");
    } catch {
      days = [];
    }
    if (!days.some((day) => weekdays.includes(day))) continue;

    const rowStart = row.start_time ? toMinutes(row.start_time) : null;
    const rowEnd = row.end_time ? toMinutes(row.end_time) : null;
    if (rowStart === null || rowEnd === null) continue;
    if (overlapsInterval({ start, end }, { start: rowStart, end: rowEnd })) return true;
  }
  return false;
}

/** Slots the trainer can take on a weekday for a given duration (15-min steps). */
export function slotsForRange(
  range: AvailabilityRange,
  weekday: number,
  durationMin: number,
): string[] {
  if (range.weekday !== weekday) return [];
  const start = toMinutes(range.startTime);
  const end = toMinutes(range.endTime);
  if (start === null || end === null) return [];
  const slots: string[] = [];
  for (let minute = start; minute + durationMin <= end; minute += 15) {
    const hours = Math.floor(minute / 60);
    const minutes = minute % 60;
    slots.push(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
  }
  return slots;
}

export type TargetedBookingInput = {
  customerId: string;
  trainerSlug: string;
  offeringId: string;
  weekdays: number[];
  startTime: string;
  location: string;
};

export type TargetedBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string; status: number };

export async function createTargetedBooking(input: TargetedBookingInput): Promise<TargetedBookingResult> {
  await ensureSchema();
  if (!isValidTime(input.startTime)) {
    return { ok: false, error: "Choose a valid start time.", status: 400 };
  }
  if (input.weekdays.length === 0) {
    return { ok: false, error: "Choose at least one weekday.", status: 400 };
  }
  if (input.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    return { ok: false, error: "Choose valid weekdays.", status: 400 };
  }
  const trainer = await getTrainerBySlug(input.trainerSlug);
  if (!trainer) return { ok: false, error: "Trainer not found.", status: 404 };

  const hasActiveSubscription = listingFeeRequired() ? await trainerHasActiveSubscription(trainer.user_id) : true;
  const hasActiveOffering = await trainerHasActiveOffering(trainer.user_id);
  if (!isPubliclyListed(trainer, { hasActiveOffering, hasActiveSubscription })) {
    return { ok: false, error: "This trainer is not accepting new requests.", status: 409 };
  }

  const offering = await getOfferingById(input.offeringId);
  if (!offering || offering.trainer_id !== trainer.user_id || !offering.active) {
    return { ok: false, error: "That offering is not available.", status: 400 };
  }

  // An address is only needed for home visits; online sessions have none.
  if (offering.format === "home_visit" && !input.location.trim()) {
    return { ok: false, error: "Tell the trainer where sessions should happen.", status: 400 };
  }

  const availabilityRows = await listTrainerAvailability(trainer.user_id);
  const ranges: AvailabilityRange[] = availabilityRows.map((row) => ({
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
  }));
  const fit = availabilityFits(ranges, input.weekdays, input.startTime, offering.duration_min);
  if (!fit.ok) {
    return { ok: false, error: fit.error, status: 400 };
  }

  const clash = await trainerScheduleClash(
    trainer.user_id,
    input.weekdays,
    input.startTime,
    offering.duration_min,
  );
  if (clash) {
    return { ok: false, error: "That time is already taken. Please pick another slot.", status: 409 };
  }

  const start = toMinutes(input.startTime) as number;
  const endMinutes = start + offering.duration_min;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const days = input.weekdays.slice().sort((a, b) => a - b).map((day) => weekdayNames[day]);

  // Duplicate-submit protection: one open targeted request per customer + trainer
  // + offering + schedule (also enforced by a partial unique index in Postgres).
  const duplicate = await queryOne<{ id: string }>(
    `SELECT id FROM bookings
      WHERE customer_id = $1 AND trainer_id = $2 AND offering_id = $3 AND status = 'Requested'`,
    [input.customerId, trainer.user_id, offering.id],
  );
  if (duplicate) {
    return {
      ok: false,
      error: "You already have an open request with this trainer for this offering.",
      status: 409,
    };
  }

  const category = await getCategory(offering.category_slug);
  const bookingId = randomId();
  const reference = `AR-${bookingId.slice(0, 8).toUpperCase()}`;
  try {
    await queryOne(
      `INSERT INTO bookings (
         id, reference, customer_id, location, service_slug, service_name, days, time,
         specific_time, status, trainer_name, trainer_id, offering_id, price_paise,
         duration_min, package_sessions, format, start_time, end_time, request_kind
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, 'Specific time', $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'targeted'
       ) RETURNING id`,
      [
        bookingId,
        reference,
        input.customerId,
        input.location.trim(),
        offering.category_slug,
        category?.name ?? offering.category_slug,
        JSON.stringify(days),
        "Specific time",
        "Requested",
        trainer.name,
        trainer.user_id,
        offering.id,
        offering.price_paise,
        offering.duration_min,
        offering.sessions_in_package,
        offering.format as BookingFormat | null,
        input.startTime,
        endTime,
      ],
    );
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return {
        ok: false,
        error: "You already sent this request. Check your sessions for its status.",
        status: 409,
      };
    }
    throw error;
  }

  return { ok: true, bookingId };
}
