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
  };
}

export async function findUserByContactRole(contact: string, role: UserRole): Promise<StoredUser | null> {
  const database = await getDb();
  const row = await database
    .prepare("SELECT id, name, contact, role, password_hash AS passwordHash FROM users WHERE contact = ? AND role = ?")
    .get(contact, role) as { id: string; name: string; contact: string; role: UserRole; passwordHash: string } | undefined;
  return row ? { id: row.id, name: row.name, contact: row.contact, role: row.role, passwordHash: row.passwordHash } : null;
}

export async function listUsersByRole(role: UserRole): Promise<UserProfile[]> {
  const database = await getDb();
  const rows = await database
    .prepare("SELECT id, name, contact, role FROM users WHERE role = ? ORDER BY created_at DESC")
    .all(role) as { id: string; name: string; contact: string; role: UserRole }[];
  return rows.map((row) => ({ id: row.id, name: row.name, contact: row.contact, role: row.role }));
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

  return { id, name: input.name, contact: input.contact, role: input.role };
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
      SELECT u.id, u.name, u.contact, u.role
      FROM auth_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > ?
    `)
    .get(token, new Date().toISOString()) as { id: string; name: string; contact: string; role: UserRole } | undefined;
  return row ? { id: row.id, name: row.name, contact: row.contact, role: row.role } : null;
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
