// ARAMYA — Postgres store (users, sessions, bookings).
//
// Behaviour-compatible with the previous SQLite store: same exported names, same
// app-level shapes (ISO date strings, JSON arrays from TEXT columns). Only the
// driver changed — everything is async and parameterised.

import {
  ensureSchema,
  execute,
  query,
  queryOne,
  randomId,
  transaction,
} from "@/lib/server/db";
import { createTrainerProfileForUser } from "@/lib/server/trainers";
import type {
  BookingInput,
  BookingRequest,
  BookingStatus,
  UserProfile,
  UserRole,
} from "@/lib/models";

type StoredUser = UserProfile & { passwordHash: string };

type BookingRow = {
  id: string;
  reference: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
  location: string;
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
  trainer_id: string | null;
  offering_id: string | null;
  price_paise: number | null;
  duration_min: number | null;
  package_sessions: number | null;
  format: string | null;
  start_time: string | null;
  end_time: string | null;
  meeting_url: string | null;
  request_kind: string;
};

export type CreateUserInput = {
  name: string;
  contact: string;
  role: UserRole;
  passwordHash: string;
};

export type PublicBooking = BookingRequest;

function parseJsonArray(value: string | null): string[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function toPublicBooking(row: BookingRow): BookingRequest {
  return {
    id: row.id,
    reference: row.reference,
    createdAt: row.created_at,
    location: row.location,
    serviceSlug: row.service_slug,
    serviceName: row.service_name,
    days: parseJsonArray(row.days) ?? [],
    time: row.time,
    specificTime: row.specific_time,
    status: row.status,
    trainerName: row.trainer_name,
    trainerId: row.trainer_id,
    offeringId: row.offering_id,
    pricePaise: row.price_paise,
    durationMin: row.duration_min,
    packageSessions: row.package_sessions,
    format: row.format === "home_visit" || row.format === "online" ? row.format : null,
    startTime: row.start_time,
    endTime: row.end_time,
    requestKind: row.request_kind === "targeted" ? "targeted" : "open",
    proposedDays: parseJsonArray(row.proposed_days),
    proposedTime: row.proposed_time,
    proposedSpecificTime: row.proposed_specific_time,
    proposedBy: row.proposed_by,
    updatedAt: row.updated_at,
  };
}

function maskLocationForTrainer(user: UserProfile, location: string, status: BookingStatus) {
  if (user.role !== "trainer" || status !== "Requested") return location;
  const first = location.split(",")[0]?.trim();
  return first || location;
}

function bookingRowForTrainer(user: UserProfile, row: BookingRow): BookingRow {
  return { ...row, location: maskLocationForTrainer(user, row.location, row.status) };
}

/* --------------------------------------------------------------------- users */

export async function findUserByContactRole(
  contact: string,
  role: UserRole,
): Promise<StoredUser | null> {
  await ensureSchema();
  return queryOne<StoredUser>(
    `SELECT id, name, contact, role, password_hash AS "passwordHash", email, verified,
            home_lat AS "homeLat", home_lng AS "homeLng"
       FROM users WHERE contact = $1 AND role = $2`,
    [contact, role],
  );
}

export async function createUser(input: CreateUserInput): Promise<UserProfile> {
  await ensureSchema();
  return transaction(async (client) => {
    const id = randomId();
    let user: UserProfile;
    try {
      const inserted = await client.query(
        `INSERT INTO users (id, name, contact, role, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, contact, role`,
        [id, input.name, input.contact, input.role, input.passwordHash],
      );
      user = inserted.rows[0] as UserProfile;
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new Error("An account already exists for this contact and role.");
      }
      throw error;
    }

    // Trainer accounts get their identity row in the same transaction.
    if (input.role === "trainer") {
      await createTrainerProfileForUser(id, input.name, client);
    }

    return user;
  });
}

/* ------------------------------------------------------------------ sessions */

export async function createSession(userId: string) {
  await ensureSchema();
  const token = randomId();
  const createdAt = new Date();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await execute(
    `INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)`,
    [token, userId, createdAt.toISOString(), expiresAt.toISOString()],
  );
  return { token, createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString() };
}

export async function getUserBySessionToken(token: string | undefined): Promise<UserProfile | null> {
  if (!token) return null;
  await ensureSchema();
  return queryOne<UserProfile>(
    `SELECT u.id, u.name, u.contact, u.role, u.email, u.verified
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > now()`,
    [token],
  );
}

export async function deleteSessionToken(token: string | undefined) {
  if (!token) return;
  await execute("DELETE FROM auth_sessions WHERE token = $1", [token]);
}

/* ------------------------------------------------------------------ bookings */

export async function listVisibleBookings(user: UserProfile): Promise<BookingRequest[]> {
  await ensureSchema();
  const rows =
    user.role === "trainer"
      ? await query<BookingRow>(
          `SELECT * FROM bookings WHERE request_kind = 'open' ORDER BY created_at DESC`,
        )
      : await query<BookingRow>(
          `SELECT * FROM bookings WHERE customer_id = $1 ORDER BY created_at DESC`,
          [user.id],
        );
  return rows.map((row) => toPublicBooking(user.role === "trainer" ? bookingRowForTrainer(user, row) : row));
}

export async function listTargetedBookingsForTrainer(
  trainerId: string,
): Promise<BookingRequest[]> {
  await ensureSchema();
  const rows = await query<BookingRow>(
    `SELECT * FROM bookings WHERE trainer_id = $1 AND request_kind = 'targeted' ORDER BY created_at DESC`,
    [trainerId],
  );
  const trainerView: UserProfile = { id: trainerId, name: "", contact: "", role: "trainer" };
  return rows.map((row) => toPublicBooking(bookingRowForTrainer(trainerView, row)));
}

export type BookingSnapshot = {
  trainerId: string | null;
  trainerName: string | null;
  offeringId: string | null;
  pricePaise: number | null;
  durationMin: number | null;
  packageSessions: number | null;
  format: string | null;
  startTime: string | null;
  endTime: string | null;
  requestKind: "open" | "targeted";
};

export async function createBookingForCustomer(
  customerId: string,
  input: BookingInput,
  snapshot: Partial<BookingSnapshot> = {},
): Promise<BookingRequest> {
  await ensureSchema();
  const id = randomId();
  const reference = `AR-${id.slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  const trainerName = snapshot.trainerName ?? null;
  void trainerName;

  const row = await queryOne<BookingRow>(
    `INSERT INTO bookings (
       id, reference, customer_id, created_at, updated_at, location, service_slug,
       service_name, days, time, specific_time, status, trainer_name,
       trainer_id, offering_id, price_paise, duration_min, package_sessions, format,
       start_time, end_time, request_kind
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10, $11, $12, $13, $14,
       $15, $16, $17, $18, $19, $20, $21, $22
     )
     RETURNING *`,
    [
      id,
      reference,
      customerId,
      now,
      now,
      input.location,
      input.serviceSlug,
      input.serviceName,
      JSON.stringify(input.days),
      input.time,
      input.specificTime,
      "Requested",
      snapshot.trainerName,
      snapshot.trainerId,
      snapshot.offeringId,
      snapshot.pricePaise,
      snapshot.durationMin,
      snapshot.packageSessions,
      snapshot.format,
      snapshot.startTime,
      snapshot.endTime,
      snapshot.requestKind,
    ],
  );
  if (!row) throw new Error("Could not create booking.");
  return toPublicBooking(row);
}

/** Atomic accept: only a Requested row can become Confirmed, exactly once. */
export async function acceptBookingWithTrainer(
  id: string,
  trainerId: string,
  trainerName: string,
): Promise<BookingRequest | null> {
  await ensureSchema();
  return transaction(async (client) => {
    const result = await client.query<BookingRow>(
      `UPDATE bookings
          SET status = 'Confirmed', trainer_id = $1, trainer_name = $2, updated_at = now()
        WHERE id = $3 AND status = 'Requested'
        RETURNING *`,
      [trainerId, trainerName, id],
    );
    const row = result.rows[0];
    return row ? toPublicBooking(row as BookingRow) : null;
  });
}

/** Atomic decline of an open targeted request. */
export async function declineBooking(id: string, trainerId: string): Promise<BookingRequest | null> {
  await ensureSchema();
  return transaction(async (client) => {
    const result = await client.query<BookingRow>(
      `UPDATE bookings
          SET status = 'Declined', trainer_id = $1, updated_at = now()
        WHERE id = $2 AND trainer_id = $1 AND status = 'Requested'
        RETURNING *`,
      [trainerId, id],
    );
    const row = result.rows[0];
    return row ? toPublicBooking(row as BookingRow) : null;
  });
}

/** Marks expired open requests; returns the number of rows changed. */
export async function expireStaleRequests(): Promise<number> {
  await ensureSchema();
  const result = await execute(
    `UPDATE bookings SET status = 'Expired', updated_at = now()
      WHERE status = 'Requested' AND created_at < now() - interval '24 hours'`,
  );
  return result.changes;
}

export async function getBookingCustomerId(id: string): Promise<string | null> {
  await ensureSchema();
  const row = await queryOne<{ customer_id: string }>(
    "SELECT customer_id FROM bookings WHERE id = $1",
    [id],
  );
  return row?.customer_id ?? null;
}

export async function getBookingById(id: string): Promise<BookingRequest | null> {
  await ensureSchema();
  const row = await queryOne<BookingRow>("SELECT * FROM bookings WHERE id = $1", [id]);
  return row ? toPublicBooking(row) : null;
}

export async function cancelBooking(id: string): Promise<BookingRequest | null> {
  await ensureSchema();
  const row = await queryOne<BookingRow>(
    `UPDATE bookings SET status = 'Cancelled', updated_at = now() WHERE id = $1 RETURNING *`,
    [id],
  );
  return row ? toPublicBooking(row) : null;
}

export async function requestReschedule(
  id: string,
  proposed: { days: string[]; time: string; specificTime: string; proposedByRole: UserRole },
): Promise<BookingRequest | null> {
  await ensureSchema();
  const row = await queryOne<BookingRow>(
    `UPDATE bookings
        SET status = 'Reschedule Requested', proposed_days = $1, proposed_time = $2,
            proposed_specific_time = $3, proposed_by = $4, updated_at = now()
      WHERE id = $5
      RETURNING *`,
    [JSON.stringify(proposed.days), proposed.time, proposed.specificTime, proposed.proposedByRole, id],
  );
  return row ? toPublicBooking(row) : null;
}

export async function acceptReschedule(id: string): Promise<BookingRequest | null> {
  await ensureSchema();
  return transaction(async (client) => {
    const current = await client.query<BookingRow>("SELECT * FROM bookings WHERE id = $1", [id]);
    const row = current.rows[0] as BookingRow | undefined;
    if (!row) return null;
    const proposedDays = parseJsonArray(row.proposed_days);
    const proposedTime = row.proposed_time;
    if (!proposedDays || !proposedTime) return null;

    const updated = await client.query<BookingRow>(
      `UPDATE bookings
          SET status = 'Rescheduled', days = $1, time = $2, specific_time = $3,
              proposed_days = NULL, proposed_time = NULL, proposed_specific_time = NULL,
              proposed_by = NULL, updated_at = now()
        WHERE id = $4
        RETURNING *`,
      [JSON.stringify(proposedDays), proposedTime, row.proposed_specific_time ?? "", id],
    );
    const next = updated.rows[0];
    return next ? toPublicBooking(next as BookingRow) : null;
  });
}

export async function declineReschedule(id: string): Promise<BookingRequest | null> {
  await ensureSchema();
  const row = await queryOne<BookingRow>(
    `UPDATE bookings
        SET status = 'Confirmed', proposed_days = NULL, proposed_time = NULL,
            proposed_specific_time = NULL, proposed_by = NULL, updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [id],
  );
  return row ? toPublicBooking(row) : null;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<BookingRequest | null> {
  await ensureSchema();
  const row = await queryOne<BookingRow>(
    `UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, id],
  );
  return row ? toPublicBooking(row) : null;
}

/** Legacy life-cycle helpers kept for the existing dashboard flows. */
/**
 * Meeting link for a booking: the per-booking override wins, otherwise the
 * offering's link. Private — only surfaced for confirmed online bookings.
 */
export async function resolveBookingMeetingUrl(bookingId: string): Promise<string | null> {
  const row = await queryOne<{ meeting_url: string | null; offering_url: string | null }>(
    `SELECT b.meeting_url, o.meeting_url AS offering_url
       FROM bookings b
       LEFT JOIN trainer_offerings o ON o.id = b.offering_id
      WHERE b.id = $1`,
    [bookingId],
  );
  return row?.meeting_url ?? row?.offering_url ?? null;
}

export async function getBookingMeetingUrl(id: string): Promise<string | null> {
  const row = await queryOne<{ meeting_url: string | null }>(
    "SELECT meeting_url FROM bookings WHERE id = $1",
    [id],
  );
  return row?.meeting_url ?? null;
}

/** Per-booking Zoom override set by the trainer (private, confirmed only). */
export async function updateBookingMeetingUrl(id: string, meetingUrl: string | null): Promise<void> {
  await execute("UPDATE bookings SET meeting_url = $1, updated_at = now() WHERE id = $2", [
    meetingUrl,
    id,
  ]);
}
