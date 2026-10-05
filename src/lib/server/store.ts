import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "fs";
import path from "path";
import type {
  BookingInput,
  BookingRequest,
  BookingStatus,
  UserProfile,
  UserRole,
} from "@/lib/models";
import { haversineKm } from "@/lib/geo";

const DATA_DIR = path.join(process.cwd(), ".aramya-data");
const DB_PATH = path.join(DATA_DIR, "db.sqlite");

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

let database: DatabaseSync | null = null;

function db() {
  if (!database) {
    mkdirSync(DATA_DIR, { recursive: true });
    database = new DatabaseSync(DB_PATH);
    database.exec("PRAGMA journal_mode=WAL");
    database.exec("PRAGMA foreign_keys=ON");
    database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact TEXT NOT NULL,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(contact, role)
      );
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        reference TEXT UNIQUE NOT NULL,
        customer_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        location TEXT NOT NULL,
        service_slug TEXT NOT NULL,
        service_name TEXT NOT NULL,
        days TEXT NOT NULL,
        time TEXT NOT NULL,
        specific_time TEXT NOT NULL,
        status TEXT NOT NULL,
        trainer_name TEXT,
        proposed_days TEXT,
        proposed_time TEXT,
        proposed_specific_time TEXT,
        proposed_by TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    `);
    // Phase 2 (geo-matching): bookings created before lat/lng existed keep
    // NULL coords and stay visible to all trainers as a fallback.
    const existingCols = database
      .prepare("PRAGMA table_info(bookings)")
      .all() as { name: string }[];
    const colNames = new Set(existingCols.map((col) => col.name));
    if (!colNames.has("lat")) database.exec("ALTER TABLE bookings ADD COLUMN lat REAL");
    if (!colNames.has("lng")) database.exec("ALTER TABLE bookings ADD COLUMN lng REAL");
  }
  return database;
}

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

export function findUserByContactRole(contact: string, role: UserRole): StoredUser | null {
  const row = db()
    .prepare("SELECT id, name, contact, role, password_hash AS passwordHash FROM users WHERE contact = ? AND role = ?")
    .get(contact, role) as { id: string; name: string; contact: string; role: UserRole; passwordHash: string } | undefined;
  return row ? { id: row.id, name: row.name, contact: row.contact, role: row.role, passwordHash: row.passwordHash } : null;
}

export function createUser(input: CreateUserInput): UserProfile {
  const existing = findUserByContactRole(input.contact, input.role);
  if (existing) {
    throw new Error("An account already exists for this contact and role.");
  }

  const id = randomId();
  db()
    .prepare("INSERT INTO users (id, name, contact, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, input.name, input.contact, input.role, input.passwordHash, new Date().toISOString());

  return { id, name: input.name, contact: input.contact, role: input.role };
}

export function createSession(userId: string) {
  const token = randomId();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  db()
    .prepare("INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(token, userId, createdAt, expiresAt);
  return { token, createdAt, expiresAt };
}

export function getUserBySessionToken(token: string | undefined): UserProfile | null {
  if (!token) return null;
  const row = db()
    .prepare(`
      SELECT u.id, u.name, u.contact, u.role
      FROM auth_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > ?
    `)
    .get(token, new Date().toISOString()) as { id: string; name: string; contact: string; role: UserRole } | undefined;
  return row ? { id: row.id, name: row.name, contact: row.contact, role: row.role } : null;
}

export function deleteSessionToken(token: string | undefined) {
  if (!token) return;
  db().prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
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

export function listVisibleBookings(user: UserProfile, near?: { lat: number; lng: number; radiusKm: number }) {
  if (user.role !== "trainer") {
    const rows = db().prepare("SELECT * FROM bookings WHERE customer_id = ? ORDER BY created_at DESC").all(user.id) as BookingRow[];
    return rows.map((row) => toPublicBooking(row));
  }
  const rows = db().prepare("SELECT * FROM bookings ORDER BY created_at DESC").all() as BookingRow[];
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

export function createBookingForCustomer(customerId: string, input: BookingInput): BookingRequest {
  const id = randomId();
  const reference = `AR-${id.slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  db()
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
  return toPublicBooking(
    db().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow,
  );
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
export function trainerScheduleClash(
  trainerName: string,
  days: string[],
  time: string,
  specificTime: string,
  excludeId?: string,
): string | null {
  const rows = db()
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

export function acceptBookingWithTrainer(id: string, trainerName: string): AcceptResult {
  const row = db().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
  if (!row) {
    return { ok: false, reason: "NOT_FOUND", detail: "Booking not found." };
  }
  if (row.status !== "Requested") {
    const holder = row.trainer_name ? ` by ${row.trainer_name}` : "";
    return {
      ok: false,
      reason: "NOT_REQUESTED",
      detail: `Booking is already ${row.status.toLowerCase()}${holder} — only open requests can be accepted.`,
    };
  }
  const days = parseJsonArray(row.days) ?? [];
  const clashDay = trainerScheduleClash(trainerName, days, row.time, row.specific_time, id);
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
  const result = db()
    .prepare("UPDATE bookings SET status = 'Confirmed', trainer_name = ?, updated_at = ? WHERE id = ? AND status = 'Requested'")
    .run(trainerName, updatedAt, id) as { changes: number | bigint };
  if (Number(result.changes) === 0) {
    return { ok: false, reason: "NOT_REQUESTED", detail: "Just taken by another trainer — please refresh." };
  }
  const updated = db().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow;
  return { ok: true, booking: toPublicBooking(updated) };
}

export function getBookingCustomerId(id: string) {
  const row = db().prepare("SELECT customer_id FROM bookings WHERE id = ?").get(id) as { customer_id: string } | undefined;
  return row?.customer_id ?? null;
}

export function cancelBooking(id: string) {
  const updatedAt = new Date().toISOString();
  db().prepare("UPDATE bookings SET status = 'Cancelled', updated_at = ? WHERE id = ?").run(updatedAt, id);
  const row = db().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
  return row ? toPublicBooking(row) : null;
}

export function requestReschedule(
  id: string,
  proposed: { days: string[]; time: string; specificTime: string; proposedByRole: UserRole },
) {
  const updatedAt = new Date().toISOString();
  db()
    .prepare("UPDATE bookings SET status = 'Reschedule Requested', proposed_days = ?, proposed_time = ?, proposed_specific_time = ?, proposed_by = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(proposed.days), proposed.time, proposed.specificTime, proposed.proposedByRole, updatedAt, id);
  const row = db().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
  return row ? toPublicBooking(row) : null;
}

export function acceptReschedule(id: string) {
  const row = db().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
  if (!row) return null;
  const proposedDays = parseJsonArray(row.proposed_days);
  const proposedTime = row.proposed_time;
  const proposedSpecificTime = row.proposed_specific_time;
  if (!proposedDays || !proposedTime) return null;

  const updatedAt = new Date().toISOString();
  db()
    .prepare("UPDATE bookings SET status = 'Rescheduled', days = ?, time = ?, specific_time = ?, proposed_days = NULL, proposed_time = NULL, proposed_specific_time = NULL, proposed_by = NULL, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(proposedDays), proposedTime, proposedSpecificTime ?? "", updatedAt, id);
  const updated = db().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow;
  return toPublicBooking(updated);
}

export function declineReschedule(id: string) {
  const updatedAt = new Date().toISOString();
  db()
    .prepare("UPDATE bookings SET status = 'Confirmed', proposed_days = NULL, proposed_time = NULL, proposed_specific_time = NULL, proposed_by = NULL, updated_at = ? WHERE id = ?")
    .run(updatedAt, id);
  const row = db().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
  return row ? toPublicBooking(row) : null;
}

export function updateBookingStatus(id: string, status: BookingStatus) {
  const updatedAt = new Date().toISOString();
  db().prepare("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?").run(status, updatedAt, id);
  const row = db().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
  return row ? toPublicBooking(row) : null;
}

// Minimal booking facts for the payments layer (ownership + trainer + status).
export function getBookingForPayment(id: string): {
  id: string;
  customerId: string;
  trainerName: string | null;
  status: BookingStatus;
} | null {
  const row = db().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
  if (!row) return null;
  return { id: row.id, customerId: row.customer_id, trainerName: row.trainer_name, status: row.status };
}
