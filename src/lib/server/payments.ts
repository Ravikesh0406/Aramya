// ARAMYA payments ledger (SQLite local file, Turso when configured).
// Tables are created by src/lib/server/db.ts ensureSchema.
import { getDb, type DbRow } from "@/lib/server/db";

export type PaymentStatus = "CREATED" | "CAPTURED" | "FAILED";
export type PayoutStatus = "PAYABLE" | "PAID";

export type PaymentRow = {
  id: string;
  bookingId: string;
  userId: string;
  amountPaise: number;
  currency: string;
  plan: string;
  status: PaymentStatus;
  provider: string;
  orderId: string;
  razorpayPaymentId: string | null;
  createdAt: string;
  capturedAt: string | null;
  refundReference: string | null;
  refundedAt: string | null;
  refundNote: string | null;
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
  plan: string;
  refund_reference: string | null;
  refunded_at: string | null;
  refund_note: string | null;
};

function asRawPayment(row: DbRow): RawPayment {
  return row as unknown as RawPayment;
}

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
    plan: row.plan ?? "trial",
    refundReference: row.refund_reference,
    refundedAt: row.refunded_at,
    refundNote: row.refund_note,
  };
}

export async function createPayment(args: {
  bookingId: string;
  userId: string;
  amountPaise: number;
  currency: string;
  provider: string;
  orderId: string;
  plan?: string;
}): Promise<PaymentRow> {
  const id = randomId();
  const database = await getDb();
  await database
    .prepare(
      "INSERT INTO payments (id, booking_id, user_id, amount_paise, currency, status, provider, order_id, plan, created_at) VALUES (?, ?, ?, ?, ?, 'CREATED', ?, ?, ?, ?)",
    )
    .run(id, args.bookingId, args.userId, args.amountPaise, args.currency, args.provider, args.orderId, args.plan ?? "trial", new Date().toISOString());
  const created = await getPaymentById(id);
  if (!created) throw new Error("Payment record not found after insert.");
  return created;
}

export async function getPaymentById(id: string): Promise<PaymentRow | null> {
  const database = await getDb();
  const row = await database.prepare("SELECT * FROM payments WHERE id = ?").get(id);
  return row ? toPayment(asRawPayment(row)) : null;
}

export async function findPaymentByOrderId(orderId: string): Promise<PaymentRow | null> {
  const database = await getDb();
  const row = await database.prepare("SELECT * FROM payments WHERE order_id = ?").get(orderId);
  return row ? toPayment(asRawPayment(row)) : null;
}

export async function findCapturedPaymentForBooking(bookingId: string, plan?: string): Promise<PaymentRow | null> {
  const database = await getDb();
  const row = plan
    ? await database
        .prepare("SELECT * FROM payments WHERE booking_id = ? AND plan = ? AND status = 'CAPTURED' ORDER BY created_at DESC LIMIT 1")
        .get(bookingId, plan)
    : await database
        .prepare("SELECT * FROM payments WHERE booking_id = ? AND status = 'CAPTURED' ORDER BY created_at DESC LIMIT 1")
        .get(bookingId);
  return row ? toPayment(asRawPayment(row)) : null;
}

export async function listPaymentsForBooking(bookingId: string, userId: string): Promise<PaymentRow[]> {
  const database = await getDb();
  const rows = await database
    .prepare("SELECT * FROM payments WHERE booking_id = ? AND user_id = ? ORDER BY created_at DESC")
    .all(bookingId, userId);
  return rows.map((row) => toPayment(asRawPayment(row)));
}

export async function capturePayment(id: string, razorpayPaymentId: string): Promise<PaymentRow | null> {
  const now = new Date().toISOString();
  const database = await getDb();
  await database
    .prepare("UPDATE payments SET status = 'CAPTURED', razorpay_payment_id = ?, captured_at = ? WHERE id = ? AND status = 'CREATED'")
    .run(razorpayPaymentId, now, id);
  return getPaymentById(id);
}

export async function markPaymentFailed(id: string): Promise<PaymentRow | null> {
  const database = await getDb();
  await database.prepare("UPDATE payments SET status = 'FAILED' WHERE id = ? AND status = 'CREATED'").run(id);
  return getPaymentById(id);
}

export async function findPaymentByRazorpayId(razorpayPaymentId: string): Promise<PaymentRow | null> {
  const database = await getDb();
  const row = await database.prepare("SELECT * FROM payments WHERE razorpay_payment_id = ?").get(razorpayPaymentId);
  return row ? toPayment(asRawPayment(row)) : null;
}

export type RefundResult =
  | { refunded: false; reason: string }
  | { refunded: true; status: "REFUNDED" | "MANUAL"; reference: string | null; note: string };

// Cancel-path refund: attempts a live Razorpay refund, records a manual
// fallback otherwise. Money is never dropped silently — every outcome lands
// on the payment row.
export async function requestRefundForBooking(
  bookingId: string,
  userId: string,
  opts?: { autoRefund?: boolean },
): Promise<RefundResult> {
  const database = await getDb();
  const payment = await findCapturedPaymentForBooking(bookingId);
  if (!payment || payment.userId !== userId || payment.refundedAt) {
    return { refunded: false, reason: "No refundable payment on this booking." };
  }
  if (!payment.razorpayPaymentId) {
    return { refunded: false, reason: "Payment has no provider reference." };
  }
  // Inside-window cancels never auto-refund — the org reviews them.
  if (opts?.autoRefund === false) {
    const now = new Date().toISOString();
    const note = "Cancelled inside the 24h window — org decision required before refunding.";
    await database
      .prepare("UPDATE payments SET refunded_at = ?, refund_note = ? WHERE id = ?")
      .run(now, note, payment.id);
    return { refunded: true, status: "MANUAL", reference: null, note };
  }
  const { getGateway } = await import("@/lib/payments/gateway");
  const attempt = await getGateway().refundPayment({
    razorpayPaymentId: payment.razorpayPaymentId,
    amountPaise: payment.amountPaise,
  });
  const now = new Date().toISOString();
  await database
    .prepare("UPDATE payments SET refund_reference = ?, refunded_at = ?, refund_note = ? WHERE id = ?")
    .run(attempt.reference, now, attempt.note, payment.id);
  return { refunded: true, status: attempt.status, reference: attempt.reference, note: attempt.note };
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

function asRawPayout(row: DbRow): RawPayout {
  return row as unknown as RawPayout;
}

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

export async function createTrainerPayout(args: {
  paymentId: string;
  bookingId: string;
  trainerName: string;
  amountPaise: number;
}): Promise<PayoutRow> {
  const id = randomId();
  const database = await getDb();
  await database
    .prepare(
      "INSERT INTO payouts (id, payment_id, booking_id, trainer_name, amount_paise, status, created_at) VALUES (?, ?, ?, ?, ?, 'PAYABLE', ?)",
    )
    .run(id, args.paymentId, args.bookingId, args.trainerName, args.amountPaise, new Date().toISOString());
  const row = await database.prepare("SELECT * FROM payouts WHERE id = ?").get(id);
  if (!row) throw new Error("Payout record not found after insert.");
  return toPayout(asRawPayout(row));
}

export async function findPayoutForPayment(paymentId: string): Promise<PayoutRow | null> {
  const database = await getDb();
  const row = await database.prepare("SELECT * FROM payouts WHERE payment_id = ?").get(paymentId);
  return row ? toPayout(asRawPayout(row)) : null;
}

// Race-safe: two concurrent captures for the same payment resolve to one
// payout row (payment_id is UNIQUE) instead of 500ing on constraint clash.
export async function getOrCreateTrainerPayout(args: {
  paymentId: string;
  bookingId: string;
  trainerName: string;
  amountPaise: number;
}): Promise<PayoutRow> {
  const existing = await findPayoutForPayment(args.paymentId);
  if (existing) return existing;
  try {
    return await createTrainerPayout(args);
  } catch {
    const raced = await findPayoutForPayment(args.paymentId);
    if (raced) return raced;
    throw new Error("Unable to record trainer payout.");
  }
}

export async function markPayoutPaid(id: string, reference: string | null, note: string | null): Promise<PayoutRow | null> {
  const database = await getDb();
  await database
    .prepare("UPDATE payouts SET status = 'PAID', reference = ?, note = ?, paid_at = ? WHERE id = ?")
    .run(reference, note, new Date().toISOString(), id);
  const row = await database.prepare("SELECT * FROM payouts WHERE id = ?").get(id);
  return row ? toPayout(asRawPayout(row)) : null;
}

export async function setPayoutNote(id: string, note: string): Promise<void> {
  const database = await getDb();
  await database.prepare("UPDATE payouts SET note = ? WHERE id = ?").run(note, id);
}

export async function listPayoutsForTrainer(trainerName: string): Promise<PayoutRow[]> {
  const database = await getDb();
  const rows = await database
    .prepare("SELECT * FROM payouts WHERE trainer_name = ? ORDER BY created_at DESC")
    .all(trainerName);
  return rows.map((row) => toPayout(asRawPayout(row)));
}

export async function listPayablePayouts(): Promise<PayoutRow[]> {
  const database = await getDb();
  const rows = await database
    .prepare("SELECT * FROM payouts WHERE status = 'PAYABLE' ORDER BY created_at ASC");
  return (await rows.all()).map((row) => toPayout(asRawPayout(row)));
}

export async function payoutTotals(): Promise<{ payablePaise: number; paidPaise: number }> {
  const database = await getDb();
  const rows = await database
    .prepare("SELECT status, SUM(amount_paise) AS total FROM payouts GROUP BY status")
    .all() as { status: string; total: number | null }[];
  let payablePaise = 0;
  let paidPaise = 0;
  for (const row of rows) {
    if (row.status === "PAYABLE") payablePaise = Number(row.total ?? 0);
    if (row.status === "PAID") paidPaise = Number(row.total ?? 0);
  }
  return { payablePaise, paidPaise };
}

export async function getPayoutById(id: string): Promise<PayoutRow | null> {
  const database = await getDb();
  const row = await database.prepare("SELECT * FROM payouts WHERE id = ?").get(id);
  return row ? toPayout(asRawPayout(row)) : null;
}

export type ManualRefund = {
  id: string;
  bookingId: string;
  amountPaise: number;
  razorpayPaymentId: string | null;
  refundNote: string | null;
  refundedAt: string | null;
};

export async function listManualRefunds(): Promise<ManualRefund[]> {
  const database = await getDb();
  const rows = await database
    .prepare(
      "SELECT id, booking_id, amount_paise, razorpay_payment_id, refund_note, refunded_at FROM payments WHERE refunded_at IS NOT NULL AND refund_reference IS NULL ORDER BY refunded_at DESC",
    )
    .all() as {
    id: string;
    booking_id: string;
    amount_paise: number;
    razorpay_payment_id: string | null;
    refund_note: string | null;
    refunded_at: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    bookingId: r.booking_id,
    amountPaise: r.amount_paise,
    razorpayPaymentId: r.razorpay_payment_id,
    refundNote: r.refund_note,
    refundedAt: r.refunded_at,
  }));
}
