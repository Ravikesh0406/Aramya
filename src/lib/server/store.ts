import type {
  BookingInput,
  BookingRequest,
  BookingStatus,
  UserProfile,
  UserRole,
} from "@/lib/models";
import { haversineKm } from "@/lib/geo";
import { getDb } from "@/lib/server/db";

type StoredUser = UserProfile & { passwordHash: string };

type BookingRow = {
  id: string;
  reference: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
  location: string;
  lat: number | null;
  lng: number | null;
  service_slug: string;
  service_name: string;
  days: string;
  time: string;
  specific_time: string;
  status: BookingStatus;
  trainer_name: string | null;
  proposed_days: string | null;
  proposed_time: string | null;
  proposed_specific_time: string | null;
  proposed_by: string | null;
  completed_at: string | null;
  customer_confirmed: number | null;
};

export type CreateUserInput = {
  name: string;
  contact: string;
  role: UserRole;
  passwordHash: string;
};

export type PublicBooking = BookingRequest;

function randomId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function parseJsonArray(value: string | null): string[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function validCoord(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBookingRow(row: Record<string, unknown>): BookingRow {
  return row as unknown as BookingRow;
}

function toPublicBooking(row: BookingRow, distanceKm: number | null = null): BookingRequest {
  return {
    id: row.id,
    reference: row.reference,
    createdAt: row.created_at,
    location: row.location,
    distanceKm,
    serviceSlug: row.service_slug,
    serviceName: row.service_name,
    days: parseJsonArray(row.days) ?? [],
    time: row.time,
    specificTime: row.specific_time,
    status: row.status,
    trainerName: row.trainer_name,
    proposedDays: parseJsonArray(row.proposed_days),
    proposedTime: row.proposed_time,
    proposedSpecificTime: row.proposed_specific_time,
    proposedBy: row.proposed_by,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null,
    customerConfirmed: Number(row.customer_confirmed ?? 0) === 1,
  };
}

export async function findUserByContactRole(contact: string, role: UserRole): Promise<StoredUser | null> {
  const database = await getDb();
  const row = await database
    .prepare(`SELECT ${PROFILE_COLUMNS}, password_hash AS passwordHash FROM users WHERE contact = ? AND role = ?`)
    .get(contact, role) as (ProfileRow & { passwordHash: string }) | undefined;
  return row ? { ...toProfile(row), passwordHash: row.passwordHash } : null;
}

function toProfile(row: { id: string; name: string; contact: string; role: UserRole; verified?: unknown; home_lat?: unknown; home_lng?: unknown }): UserProfile {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    role: row.role,
    verified: Number(row.verified ?? 0) === 1,
    homeLat: typeof row.home_lat === "number" ? row.home_lat : null,
    homeLng: typeof row.home_lng === "number" ? row.home_lng : null,
  };
}

const PROFILE_COLUMNS = "id, name, contact, role, verified, home_lat, home_lng";

type ProfileRow = { id: string; name: string; contact: string; role: UserRole; verified?: unknown; home_lat?: unknown; home_lng?: unknown };

export async function listUsersByRole(role: UserRole): Promise<UserProfile[]> {
  const database = await getDb();
  const rows = await database
    .prepare(`SELECT ${PROFILE_COLUMNS} FROM users WHERE role = ? ORDER BY created_at DESC`)
    .all(role) as ProfileRow[];
  return rows.map(toProfile);
}

export async function createUser(input: CreateUserInput): Promise<UserProfile> {
  const existing = await findUserByContactRole(input.contact, input.role);
  if (existing) {
    throw new Error("An account already exists for this contact and role.");
  }

  const id = randomId();
  const database = await getDb();
  await database
    .prepare("INSERT INTO users (id, name, contact, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, input.name, input.contact, input.role, input.passwordHash, new Date().toISOString());

  return { id, name: input.name, contact: input.contact, role: input.role, verified: false, homeLat: null, homeLng: null };
}

export async function createSession(userId: string) {
  const token = randomId();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const database = await getDb();
  await database
    .prepare("INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(token, userId, createdAt, expiresAt);
  return { token, createdAt, expiresAt };
}

export async function getUserBySessionToken(token: string | undefined): Promise<UserProfile | null> {
  if (!token) return null;
  const database = await getDb();
  const row = await database
    .prepare(`
      SELECT u.id, u.name, u.contact, u.role, u.verified, u.home_lat, u.home_lng
      FROM auth_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > ?
    `)
    .get(token, new Date().toISOString()) as ProfileRow | undefined;
  return row ? toProfile(row) : null;
}

export async function deleteSessionToken(token: string | undefined) {
  if (!token) return;
  const database = await getDb();
  await database.prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
}

function maskLocationForTrainer(user: UserProfile, location: string, status: BookingStatus) {
  if (user.role !== "trainer" || status !== "Requested") return location;
  const first = location.split(",")[0]?.trim();
  return first || location;
}

function bookingRowForTrainer(user: UserProfile, row: BookingRow): BookingRow {
  return {
    ...row,
    location: maskLocationForTrainer(user, row.location, row.status),
  };
}

export async function listVisibleBookings(user: UserProfile, near?: { lat: number; lng: number; radiusKm: number }) {
  const database = await getDb();
  if (user.role !== "trainer") {
    const rows = await database.prepare("SELECT * FROM bookings WHERE customer_id = ? ORDER BY created_at DESC").all(user.id) as unknown as BookingRow[];
    return rows.map((row) => toPublicBooking(row));
  }
  const rows = await database.prepare("SELECT * FROM bookings ORDER BY created_at DESC").all() as unknown as BookingRow[];
  const withDistance = rows.map((row) => {
    const masked = bookingRowForTrainer(user, row);
    if (
      !near ||
      row.lat == null ||
      row.lng == null ||
      !Number.isFinite(row.lat) ||
      !Number.isFinite(row.lng)
    ) {
      // No fix on either side (or legacy row): include without a distance.
      return { row: masked, distanceKm: null as number | null };
    }
    return { row: masked, distanceKm: haversineKm(near.lat, near.lng, row.lat, row.lng) };
  });
  const filtered = near
    ? withDistance.filter(({ distanceKm }) => distanceKm == null || distanceKm <= near.radiusKm)
    : withDistance;
  filtered.sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));
  return filtered.map(({ row, distanceKm }) => toPublicBooking(row, distanceKm));
}

export async function createBookingForCustomer(customerId: string, input: BookingInput): Promise<BookingRequest> {
  const id = randomId();
  const reference = `AR-${id.slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  const database = await getDb();
  await database
    .prepare(`
      INSERT INTO bookings (
        id, reference, customer_id, created_at, updated_at, location, lat, lng, service_slug,
        service_name, days, time, specific_time, status, trainer_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      reference,
      customerId,
      now,
      now,
      input.location,
      validCoord(input.lat),
      validCoord(input.lng),
      input.serviceSlug,
      input.serviceName,
      JSON.stringify(input.days),
      input.time,
      input.specificTime,
      "Requested",
      null,
    );
  const row = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  return toPublicBooking(asBookingRow(row as Record<string, unknown>));
}

export type AcceptResult =
  | { ok: true; booking: BookingRequest }
  | { ok: false; reason: "NOT_FOUND" | "NOT_REQUESTED" | "OVERLAP"; detail: string };

// Bookings in these states occupy the trainer's schedule.
const OCCUPIED_STATUSES: BookingStatus[] = [
  "Requested",
  "Accepted",
  "Confirmed",
  "Upcoming",
  "In Progress",
  "Rescheduled",
  "Reschedule Requested",
];

function timesClash(
  a: { time: string; specificTime: string | null },
  b: { time: string; specificTime: string | null },
): boolean {
  if (a.time !== b.time) return false;
  if (a.time !== "Specific time") return true;
  // Unknown exact time clashes conservatively.
  const x = (a.specificTime ?? "").trim();
  const y = (b.specificTime ?? "").trim();
  return !x || !y || x === y;
}

// First shared day on which the trainer already has an occupying booking,
// or null when the slot is free. excludeId lets a booking ignore itself.
export async function trainerScheduleClash(
  trainerName: string,
  days: string[],
  time: string,
  specificTime: string,
  excludeId?: string,
): Promise<string | null> {
  const database = await getDb();
  const rows = await database
    .prepare("SELECT id, days, time, specific_time, status FROM bookings WHERE trainer_name = ?")
    .all(trainerName) as {
    id: string;
    days: string;
    time: string;
    specific_time: string | null;
    status: BookingStatus;
  }[];
  for (const row of rows) {
    if (row.id === excludeId || !OCCUPIED_STATUSES.includes(row.status)) continue;
    const otherDays = parseJsonArray(row.days) ?? [];
    const shared = days.find((day) => otherDays.includes(day));
    if (shared && timesClash({ time, specificTime }, { time: row.time, specificTime: row.specific_time })) {
      return shared;
    }
  }
  return null;
}

export async function acceptBookingWithTrainer(id: string, trainerName: string): Promise<AcceptResult> {
  const database = await getDb();
  const raw = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  if (!raw) {
    return { ok: false, reason: "NOT_FOUND", detail: "Booking not found." };
  }
  const row = asBookingRow(raw);
  if (row.status !== "Requested") {
    const holder = row.trainer_name ? ` by ${row.trainer_name}` : "";
    return {
      ok: false,
      reason: "NOT_REQUESTED",
      detail: `Booking is already ${row.status.toLowerCase()}${holder} — only open requests can be accepted.`,
    };
  }
  const days = parseJsonArray(row.days) ?? [];
  const clashDay = await trainerScheduleClash(trainerName, days, row.time, row.specific_time, id);
  if (clashDay) {
    const when = row.time === "Specific time" && row.specific_time ? row.specific_time : row.time;
    return {
      ok: false,
      reason: "OVERLAP",
      detail: `You already have a booking on ${clashDay} (${when}).`,
    };
  }
  // Atomic transition — a concurrent accept wins instead of overwriting.
  const updatedAt = new Date().toISOString();
  const result = await database
    .prepare("UPDATE bookings SET status = 'Confirmed', trainer_name = ?, updated_at = ? WHERE id = ? AND status = 'Requested'")
    .run(trainerName, updatedAt, id);
  if (Number(result.changes) === 0) {
    return { ok: false, reason: "NOT_REQUESTED", detail: "Just taken by another trainer — please refresh." };
  }
  const updated = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  return { ok: true, booking: toPublicBooking(asBookingRow(updated as Record<string, unknown>)) };
}

export async function getBookingCustomerId(id: string) {
  const database = await getDb();
  const row = await database.prepare("SELECT customer_id FROM bookings WHERE id = ?").get(id) as { customer_id: string } | undefined;
  return row?.customer_id ?? null;
}

export async function cancelBooking(id: string) {
  const updatedAt = new Date().toISOString();
  const database = await getDb();
  await database.prepare("UPDATE bookings SET status = 'Cancelled', updated_at = ? WHERE id = ?").run(updatedAt, id);
  const row = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  return row ? toPublicBooking(asBookingRow(row)) : null;
}

export async function requestReschedule(
  id: string,
  proposed: { days: string[]; time: string; specificTime: string; proposedByRole: UserRole },
) {
  const updatedAt = new Date().toISOString();
  const database = await getDb();
  await database
    .prepare("UPDATE bookings SET status = 'Reschedule Requested', proposed_days = ?, proposed_time = ?, proposed_specific_time = ?, proposed_by = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(proposed.days), proposed.time, proposed.specificTime, proposed.proposedByRole, updatedAt, id);
  const row = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  return row ? toPublicBooking(asBookingRow(row)) : null;
}

export async function acceptReschedule(id: string) {
  const database = await getDb();
  const raw = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  if (!raw) return null;
  const row = asBookingRow(raw);
  const proposedDays = parseJsonArray(row.proposed_days);
  const proposedTime = row.proposed_time;
  const proposedSpecificTime = row.proposed_specific_time;
  if (!proposedDays || !proposedTime) return null;

  const updatedAt = new Date().toISOString();
  await database
    .prepare("UPDATE bookings SET status = 'Rescheduled', days = ?, time = ?, specific_time = ?, proposed_days = NULL, proposed_time = NULL, proposed_specific_time = NULL, proposed_by = NULL, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(proposedDays), proposedTime, proposedSpecificTime ?? "", updatedAt, id);
  const updated = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  return toPublicBooking(asBookingRow(updated as Record<string, unknown>));
}

export async function declineReschedule(id: string) {
  const updatedAt = new Date().toISOString();
  const database = await getDb();
  await database
    .prepare("UPDATE bookings SET status = 'Confirmed', proposed_days = NULL, proposed_time = NULL, proposed_specific_time = NULL, proposed_by = NULL, updated_at = ? WHERE id = ?")
    .run(updatedAt, id);
  const row = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  return row ? toPublicBooking(asBookingRow(row)) : null;
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  const updatedAt = new Date().toISOString();
  const database = await getDb();
  await database.prepare("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?").run(status, updatedAt, id);
  const row = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  return row ? toPublicBooking(asBookingRow(row)) : null;
}

// Minimal booking facts for the payments layer (ownership + trainer + status).
export async function getBookingForPayment(id: string): Promise<{
  id: string;
  customerId: string;
  trainerName: string | null;
  status: BookingStatus;
} | null> {
  const database = await getDb();
  const raw = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  if (!raw) return null;
  const row = asBookingRow(raw);
  return { id: row.id, customerId: row.customer_id, trainerName: row.trainer_name, status: row.status };
}

export async function setHomeBase(userId: string, lat: number, lng: number): Promise<UserProfile | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const database = await getDb();
  await database.prepare("UPDATE users SET home_lat = ?, home_lng = ? WHERE id = ?").run(lat, lng, userId);
  const row = await database
    .prepare("SELECT id, name, contact, role, verified, home_lat, home_lng FROM users WHERE id = ?")
    .get(userId) as ProfileRow | undefined;
  return row ? toProfile(row) : null;
}

export async function countBookingsByStatus(): Promise<Record<string, number>> {
  const database = await getDb();
  const rows = await database
    .prepare("SELECT status, COUNT(*) AS count FROM bookings GROUP BY status")
    .all() as { status: string; count: number }[];
  const out: Record<string, number> = {};
  for (const row of rows) out[row.status] = Number(row.count);
  return out;
}

// --- Session lifecycle (R1) ---------------------------------------------------
// Trainer drives Confirmed → In Progress → Completed; either party can flag
// No Show; the customer optionally confirms a Completed booking (feeds R2
// reviews). Stale In Progress bookings auto-complete lazily (see below).

export type LifecycleResult =
  | { ok: true; booking: BookingRequest }
  | { ok: false; reason: "NOT_FOUND" | "FORBIDDEN" | "BAD_STATE"; detail: string };

async function transitionBooking(
  id: string,
  from: BookingStatus[],
  set: string,
  args: unknown[],
): Promise<BookingRow | "NOT_FOUND" | "BAD_STATE"> {
  const database = await getDb();
  const raw = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  if (!raw) return "NOT_FOUND";
  const row = asBookingRow(raw);
  if (!from.includes(row.status)) return "BAD_STATE";
  const result = await database
    .prepare(`UPDATE bookings SET ${set}, updated_at = ? WHERE id = ?`)
    .run(...args, new Date().toISOString(), id);
  if (Number(result.changes) === 0) return "BAD_STATE";
  const updated = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  return asBookingRow(updated as Record<string, unknown>);
}

function lifecycleOk(booking: BookingRow): LifecycleResult {
  return { ok: true, booking: toPublicBooking(booking) };
}

export async function startSession(id: string, trainerName: string): Promise<LifecycleResult> {
  const database = await getDb();
  const raw = await database.prepare("SELECT trainer_name FROM bookings WHERE id = ?").get(id);
  if (!raw) return { ok: false, reason: "NOT_FOUND", detail: "Booking not found." };
  if ((raw as { trainer_name: string | null }).trainer_name !== trainerName) {
    return { ok: false, reason: "FORBIDDEN", detail: "Only the accepted trainer can start this session." };
  }
  const result = await transitionBooking(id, ["Confirmed", "Rescheduled", "Upcoming"], "status = 'In Progress'", []);
  if (result === "NOT_FOUND") return { ok: false, reason: "NOT_FOUND", detail: "Booking not found." };
  if (result === "BAD_STATE") {
    return { ok: false, reason: "BAD_STATE", detail: "Only confirmed bookings can be started." };
  }
  return lifecycleOk(result);
}

export async function completeSession(id: string, trainerName: string): Promise<LifecycleResult> {
  const database = await getDb();
  const raw = await database.prepare("SELECT trainer_name FROM bookings WHERE id = ?").get(id);
  if (!raw) return { ok: false, reason: "NOT_FOUND", detail: "Booking not found." };
  if ((raw as { trainer_name: string | null }).trainer_name !== trainerName) {
    return { ok: false, reason: "FORBIDDEN", detail: "Only the accepted trainer can complete this session." };
  }
  const now = new Date().toISOString();
  const fetched = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  const row = asBookingRow(fetched as Record<string, unknown>);
  if (row.status !== "In Progress") {
    return { ok: false, reason: "BAD_STATE", detail: "Only sessions in progress can be completed." };
  }
  const result = await database
    .prepare("UPDATE bookings SET status = 'Completed', completed_at = ?, updated_at = ? WHERE id = ? AND status = 'In Progress'")
    .run(now, now, id);
  if (Number(result.changes) === 0) {
    return { ok: false, reason: "BAD_STATE", detail: "Session is no longer in progress." };
  }
  const updated = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  return lifecycleOk(asBookingRow(updated as Record<string, unknown>));
}

export async function markNoShow(
  id: string,
  party: { role: UserRole; userId: string; name: string },
): Promise<LifecycleResult> {
  const database = await getDb();
  const raw = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  if (!raw) return { ok: false, reason: "NOT_FOUND", detail: "Booking not found." };
  const row = asBookingRow(raw);
  const involved =
    party.role === "customer"
      ? row.customer_id === party.userId
      : row.trainer_name === party.name;
  if (!involved) {
    return { ok: false, reason: "FORBIDDEN", detail: "Only the customer or accepted trainer can flag this." };
  }
  if (!["Confirmed", "In Progress", "Upcoming", "Accepted", "Rescheduled"].includes(row.status)) {
    return { ok: false, reason: "BAD_STATE", detail: `A ${row.status.toLowerCase()} booking cannot be marked no-show.` };
  }
  const result = await database
    .prepare("UPDATE bookings SET status = 'No Show', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);
  void result;
  const updated = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  return lifecycleOk(asBookingRow(updated as Record<string, unknown>));
}

export async function confirmCompletion(id: string, customerId: string): Promise<LifecycleResult> {
  const database = await getDb();
  const raw = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  if (!raw) return { ok: false, reason: "NOT_FOUND", detail: "Booking not found." };
  const row = asBookingRow(raw);
  if (row.customer_id !== customerId) {
    return { ok: false, reason: "FORBIDDEN", detail: "Only the customer can confirm completion." };
  }
  if (row.status !== "Completed") {
    return { ok: false, reason: "BAD_STATE", detail: "Only completed sessions can be confirmed." };
  }
  await database
    .prepare("UPDATE bookings SET customer_confirmed = 1, updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);
  const updated = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  return lifecycleOk(asBookingRow(updated as Record<string, unknown>));
}

// Lazy auto-complete: In Progress bookings untouched for 24h+ are done —
// the trainer just never tapped "complete". Runs on bookings reads.
export async function autoCompleteStaleSessions(): Promise<number> {
  const database = await getDb();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const result = await database
    .prepare("UPDATE bookings SET status = 'Completed', completed_at = ?, updated_at = ? WHERE status = 'In Progress' AND updated_at < ?")
    .run(new Date().toISOString(), new Date().toISOString(), cutoff);
  return Number(result.changes);
}

// --- Reviews (R2) --------------------------------------------------------------
// One review per completed booking, customer → trainer.

export type ReviewResult =
  | { ok: true; review: { id: string; rating: number } }
  | { ok: false; reason: "NOT_FOUND" | "FORBIDDEN" | "BAD_STATE" | "DUPLICATE"; detail: string };

export async function createReview(
  bookingId: string,
  customerId: string,
  rating: number,
  note: string,
): Promise<ReviewResult> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, reason: "BAD_STATE", detail: "Rating must be 1–5." };
  }
  const database = await getDb();
  const raw = await database.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);
  if (!raw) return { ok: false, reason: "NOT_FOUND", detail: "Booking not found." };
  const booking = asBookingRow(raw);
  if (booking.customer_id !== customerId) {
    return { ok: false, reason: "FORBIDDEN", detail: "Only the customer can review this booking." };
  }
  if (booking.status !== "Completed") {
    return { ok: false, reason: "BAD_STATE", detail: "Only completed sessions can be reviewed." };
  }
  if (!booking.trainer_name) {
    return { ok: false, reason: "BAD_STATE", detail: "No trainer on this booking." };
  }
  const existing = await database.prepare("SELECT id FROM reviews WHERE booking_id = ?").get(bookingId);
  if (existing) {
    return { ok: false, reason: "DUPLICATE", detail: "This booking is already reviewed." };
  }
  const id = randomId();
  await database
    .prepare("INSERT INTO reviews (id, booking_id, customer_id, trainer_name, rating, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, bookingId, customerId, booking.trainer_name, rating, note.slice(0, 500), new Date().toISOString());
  return { ok: true, review: { id, rating } };
}

export async function listReviewsForTrainer(trainerName: string): Promise<
  { id: string; rating: number; note: string; createdAt: string }[]
> {
  const database = await getDb();
  const rows = await database
    .prepare("SELECT id, rating, note, created_at FROM reviews WHERE trainer_name = ? ORDER BY created_at DESC LIMIT 20")
    .all(trainerName) as { id: string; rating: number; note: string; created_at: string }[];
  return rows.map((r) => ({ id: r.id, rating: r.rating, note: r.note, createdAt: r.created_at }));
}

export async function averageRatingForTrainer(trainerName: string): Promise<{ average: number | null; count: number }> {
  const database = await getDb();
  const row = await database
    .prepare("SELECT AVG(rating) AS avg, COUNT(*) AS count FROM reviews WHERE trainer_name = ?")
    .get(trainerName) as { avg: number | null; count: number } | undefined;
  if (!row || Number(row.count) === 0) return { average: null, count: 0 };
  return { average: Math.round(Number(row.avg) * 10) / 10, count: Number(row.count) };
}

export async function reviewedBookingIds(customerId: string): Promise<Set<string>> {
  const database = await getDb();
  const rows = await database
    .prepare("SELECT booking_id FROM reviews WHERE customer_id = ?")
    .all(customerId) as { booking_id: string }[];
  return new Set(rows.map((r) => r.booking_id));
}
