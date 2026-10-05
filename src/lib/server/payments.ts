// ARAMYA payments ledger (SQLite, same db file as bookings store).
// payments: user → org captures. payouts: org → trainer shares.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".aramya-data");
const DB_PATH = path.join(DATA_DIR, "db.sqlite");

export type PaymentStatus = "CREATED" | "CAPTURED" | "FAILED";
export type PayoutStatus = "PAYABLE" | "PAID";

export type PaymentRow = {
  id: string;
  bookingId: string;
  userId: string;
  amountPaise: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  orderId: string;
  razorpayPaymentId: string | null;
  createdAt: string;
  capturedAt: string | null;
};

export type PayoutRow = {
  id: string;
  paymentId: string;
  bookingId: string;
  trainerName: string;
  amountPaise: number;
  status: PayoutStatus;
  reference: string | null;
  note: string | null;
  createdAt: string;
  paidAt: string | null;
};

let database: DatabaseSync | null = null;

function db() {
  if (!database) {
    mkdirSync(DATA_DIR, { recursive: true });
    database = new DatabaseSync(DB_PATH);
    database.exec("PRAGMA journal_mode=WAL");
    database.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        amount_paise INTEGER NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        provider TEXT NOT NULL,
        order_id TEXT UNIQUE NOT NULL,
        razorpay_payment_id TEXT,
        created_at TEXT NOT NULL,
        captured_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
      CREATE TABLE IF NOT EXISTS payouts (
        id TEXT PRIMARY KEY,
        payment_id TEXT UNIQUE NOT NULL,
        booking_id TEXT NOT NULL,
        trainer_name TEXT NOT NULL,
        amount_paise INTEGER NOT NULL,
        status TEXT NOT NULL,
        reference TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        paid_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_payouts_trainer ON payouts(trainer_name);
    `);
  }
  return database;
}

function randomId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

type RawPayment = {
  id: string;
  booking_id: string;
  user_id: string;
  amount_paise: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  order_id: string;
  razorpay_payment_id: string | null;
  created_at: string;
  captured_at: string | null;
};

function toPayment(row: RawPayment): PaymentRow {
  return {
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id,
    amountPaise: row.amount_paise,
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    orderId: row.order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    createdAt: row.created_at,
    capturedAt: row.captured_at,
  };
}

export function createPayment(args: {
  bookingId: string;
  userId: string;
  amountPaise: number;
  currency: string;
  provider: string;
  orderId: string;
}): PaymentRow {
  const id = randomId();
  db()
    .prepare(
      "INSERT INTO payments (id, booking_id, user_id, amount_paise, currency, status, provider, order_id, created_at) VALUES (?, ?, ?, ?, ?, 'CREATED', ?, ?, ?)",
    )
    .run(id, args.bookingId, args.userId, args.amountPaise, args.currency, args.provider, args.orderId, new Date().toISOString());
  return getPaymentById(id) as PaymentRow;
}

export function getPaymentById(id: string): PaymentRow | null {
  const row = db().prepare("SELECT * FROM payments WHERE id = ?").get(id) as RawPayment | undefined;
  return row ? toPayment(row) : null;
}

export function findPaymentByOrderId(orderId: string): PaymentRow | null {
  const row = db().prepare("SELECT * FROM payments WHERE order_id = ?").get(orderId) as RawPayment | undefined;
  return row ? toPayment(row) : null;
}

export function findCapturedPaymentForBooking(bookingId: string): PaymentRow | null {
  const row = db()
    .prepare("SELECT * FROM payments WHERE booking_id = ? AND status = 'CAPTURED' ORDER BY created_at DESC LIMIT 1")
    .get(bookingId) as RawPayment | undefined;
  return row ? toPayment(row) : null;
}

export function listPaymentsForBooking(bookingId: string, userId: string): PaymentRow[] {
  const rows = db()
    .prepare("SELECT * FROM payments WHERE booking_id = ? AND user_id = ? ORDER BY created_at DESC")
    .all(bookingId, userId) as RawPayment[];
  return rows.map(toPayment);
}

export function capturePayment(id: string, razorpayPaymentId: string): PaymentRow | null {
  const now = new Date().toISOString();
  db()
    .prepare("UPDATE payments SET status = 'CAPTURED', razorpay_payment_id = ?, captured_at = ? WHERE id = ? AND status = 'CREATED'")
    .run(razorpayPaymentId, now, id);
  return getPaymentById(id);
}

export function markPaymentFailed(id: string): PaymentRow | null {
  db().prepare("UPDATE payments SET status = 'FAILED' WHERE id = ? AND status = 'CREATED'").run(id);
  return getPaymentById(id);
}

// --- Payouts (org → trainer) ---------------------------------------------------

type RawPayout = {
  id: string;
  payment_id: string;
  booking_id: string;
  trainer_name: string;
  amount_paise: number;
  status: PayoutStatus;
  reference: string | null;
  note: string | null;
  created_at: string;
  paid_at: string | null;
};

function toPayout(row: RawPayout): PayoutRow {
  return {
    id: row.id,
    paymentId: row.payment_id,
    bookingId: row.booking_id,
    trainerName: row.trainer_name,
    amountPaise: row.amount_paise,
    status: row.status,
    reference: row.reference,
    note: row.note,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

export function createTrainerPayout(args: {
  paymentId: string;
  bookingId: string;
  trainerName: string;
  amountPaise: number;
}): PayoutRow {
  const id = randomId();
  db()
    .prepare(
      "INSERT INTO payouts (id, payment_id, booking_id, trainer_name, amount_paise, status, created_at) VALUES (?, ?, ?, ?, ?, 'PAYABLE', ?)",
    )
    .run(id, args.paymentId, args.bookingId, args.trainerName, args.amountPaise, new Date().toISOString());
  const row = db().prepare("SELECT * FROM payouts WHERE id = ?").get(id) as RawPayout;
  return toPayout(row);
}

export function findPayoutForPayment(paymentId: string): PayoutRow | null {
  const row = db().prepare("SELECT * FROM payouts WHERE payment_id = ?").get(paymentId) as RawPayout | undefined;
  return row ? toPayout(row) : null;
}

export function markPayoutPaid(id: string, reference: string | null, note: string | null): PayoutRow | null {
  db()
    .prepare("UPDATE payouts SET status = 'PAID', reference = ?, note = ?, paid_at = ? WHERE id = ?")
    .run(reference, note, new Date().toISOString(), id);
  const row = db().prepare("SELECT * FROM payouts WHERE id = ?").get(id) as RawPayout | undefined;
  return row ? toPayout(row) : null;
}

export function setPayoutNote(id: string, note: string): void {
  db().prepare("UPDATE payouts SET note = ? WHERE id = ?").run(note, id);
}

export function listPayoutsForTrainer(trainerName: string): PayoutRow[] {
  const rows = db()
    .prepare("SELECT * FROM payouts WHERE trainer_name = ? ORDER BY created_at DESC")
    .all(trainerName) as RawPayout[];
  return rows.map(toPayout);
}
