// ARAMYA payment gateway layer.
//
// Money flow (user ↔ org ↔ trainer):
//   1. User pays the ORG via a Razorpay Order (server creates, Checkout collects).
//   2. Server verifies the payment signature → payment CAPTURED.
//   3. Trainer's share is recorded in the payouts ledger as PAYABLE.
//   4. Org settles to the trainer via RazorpayX Payouts when configured,
//      otherwise the ledger row stays PAYABLE for manual (UPI/bank) settlement.
//
// The rest of the app only talks to the PaymentGateway interface, so the
// provider can be swapped without touching routes or UI. Without
// RAZORPAY_KEY_ID/SECRET configured, getGateway() returns the MockGateway
// so the full flow works end-to-end in local dev.

import { createHmac, timingSafeEqual } from "crypto";
import { CURRENCY } from "./pricing";

export type OrderInput = {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
};

export type CreatedOrder = {
  provider: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string | null; // null for mock (no Checkout needed)
};

export type PayoutAttempt = {
  status: "PAID" | "PENDING";
  reference: string | null;
  note: string;
};

export type RefundAttempt = {
  status: "REFUNDED" | "MANUAL";
  reference: string | null;
  note: string;
};

export interface PaymentGateway {
  readonly name: string;
  createOrder(input: OrderInput): Promise<CreatedOrder>;
  verifyPaymentSignature(args: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean;
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
  refundPayment(args: {
    razorpayPaymentId: string;
    amountPaise: number;
  }): Promise<RefundAttempt>;
  settleTrainerPayout(args: {
    amountPaise: number;
    trainerName: string;
    reference: string;
  }): Promise<PayoutAttempt>;
}

function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

// --- Razorpay (live) -------------------------------------------------------

type RazorpayOrderAPI = {
  create(options: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<{ id: string; amount: number; currency: string }>;
};

type RazorpayClient = { orders: RazorpayOrderAPI };

async function loadRazorpay(keyId: string, keySecret: string): Promise<RazorpayClient> {
  const mod = (await import("razorpay")) as unknown as {
    default?: new (opts: { key_id: string; key_secret: string }) => RazorpayClient;
  };
  const Ctor = mod.default ?? (mod as unknown as new (opts: { key_id: string; key_secret: string }) => RazorpayClient);
  return new Ctor({ key_id: keyId, key_secret: keySecret });
}

class RazorpayGateway implements PaymentGateway {
  readonly name = "razorpay";
  private keyId: string;
  private keySecret: string;

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  async createOrder(input: OrderInput): Promise<CreatedOrder> {
    const client = await loadRazorpay(this.keyId, this.keySecret);
    const order = await client.orders.create({
      amount: input.amountPaise,
      currency: CURRENCY,
      receipt: input.receipt,
      notes: input.notes,
    });
    return {
      provider: this.name,
      orderId: order.id,
      amountPaise: order.amount,
      currency: order.currency,
      keyId: this.keyId,
    };
  }

  verifyPaymentSignature({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }): boolean {
    if (!orderId || !paymentId || !signature) return false;
    const expected = hmacHex(this.keySecret, `${orderId}|${paymentId}`);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    const expected = hmacHex(secret, rawBody);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async refundPayment({ razorpayPaymentId, amountPaise }: { razorpayPaymentId: string; amountPaise: number }): Promise<RefundAttempt> {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    const res = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, notes: { reason: "booking_cancelled" } }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
    if (!res.ok || !data.id) {
      // Fall through to manual settlement — never lose track of the money.
      return {
        status: "MANUAL",
        reference: null,
        note: `Auto-refund failed (${data.error?.description ?? res.status}) — refund ₹${amountPaise / 100} manually for ${razorpayPaymentId}.`,
      };
    }
    return { status: "REFUNDED", reference: data.id, note: `Razorpay refund ${data.id}` };
  }

  async settleTrainerPayout({ amountPaise, trainerName, reference }: { amountPaise: number; trainerName: string; reference: string }): Promise<PayoutAttempt> {
    // RazorpayX payouts need an approved account + fund account ids.
    // Attempt the API only when fully configured; otherwise stay PAYABLE
    // so the org settles manually and records the UTR/reference.
    const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
    const fundAccountId = process.env.RAZORPAYX_FUND_ACCOUNT_ID;
    if (!accountNumber || !fundAccountId) {
      return {
        status: "PENDING",
        reference: null,
        note: `RazorpayX not configured — settle ₹${amountPaise / 100} to ${trainerName} manually (ref ${reference}).`,
      };
    }
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/payouts", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        account_number: accountNumber,
        fund_account_id: fundAccountId,
        amount: amountPaise,
        currency: CURRENCY,
        mode: "UPI",
        purpose: "payout",
        reference_id: reference,
        narration: `Aramya trainer payout ${reference}`,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
    if (!res.ok || !data.id) {
      return { status: "PENDING", reference: null, note: data.error?.description ?? `Payout API failed (ref ${reference}).` };
    }
    return { status: "PAID", reference: data.id, note: `RazorpayX payout ${data.id}` };
  }
}

// --- Mock (local dev, no keys) ----------------------------------------------

class MockGateway implements PaymentGateway {
  readonly name = "mock";

  async createOrder(input: OrderInput): Promise<CreatedOrder> {
    return {
      provider: this.name,
      orderId: `order_mock_${Date.now().toString(36)}`,
      amountPaise: input.amountPaise,
      currency: CURRENCY,
      keyId: null,
    };
  }

  verifyPaymentSignature({ orderId, paymentId }: { orderId: string; paymentId: string; signature: string }): boolean {
    return orderId.startsWith("order_mock_") && paymentId.startsWith("pay_mock_");
  }

  verifyWebhookSignature(): boolean {
    return true;
  }

  async settleTrainerPayout({ amountPaise, trainerName, reference }: { amountPaise: number; trainerName: string; reference: string }): Promise<PayoutAttempt> {
    return {
      status: "PENDING",
      reference: null,
      note: `Mock mode — settle ₹${amountPaise / 100} to ${trainerName} manually (ref ${reference}).`,
    };
  }

  async refundPayment({ razorpayPaymentId, amountPaise }: { razorpayPaymentId: string; amountPaise: number }): Promise<RefundAttempt> {
    return {
      status: "MANUAL",
      reference: null,
      note: `Mock mode — refund ₹${amountPaise / 100} manually for ${razorpayPaymentId}.`,
    };
  }
}

// --- Selector -----------------------------------------------------------------

let cached: PaymentGateway | null = null;

export function getGateway(): PaymentGateway {
  if (cached) return cached;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  cached = keyId && keySecret ? new RazorpayGateway(keyId, keySecret) : new MockGateway();
  return cached;
}
