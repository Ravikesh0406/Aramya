// ARAMYA — payment gateway wrapper.
//
// MOCK mode (default, when RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are absent)
// creates fake orders and marks them paid, so flows can be built and tested.
// When keys exist, real orders are created against the Razorpay REST API.
//
// Booking payments are gated by BOOKING_PAYMENTS_ENABLED; subscription payments
// always use this wrapper.

import crypto from "crypto";
import { randomUUID } from "crypto";
import { razorpayMockMode } from "@/lib/env";

export type GatewayOrder = {
  id: string;
  amountPaise: number;
  currency: "INR";
  receipt: string;
  mock: boolean;
  keyId: string | null;
};

type CreateOrderInput = {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
};

export async function createGatewayOrder(input: CreateOrderInput): Promise<GatewayOrder> {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
    throw new Error("Order amount must be a positive integer in paise.");
  }

  if (razorpayMockMode()) {
    return {
      id: `order_mock_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
      amountPaise: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      mock: true,
      keyId: null,
    };
  }

  const keyId = process.env.RAZORPAY_KEY_ID as string;
  const keySecret = process.env.RAZORPAY_KEY_SECRET as string;
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
  if (!response.ok) {
    throw new Error("Could not create a payment order with the gateway.");
  }
  const data = (await response.json()) as { id: string; amount: number };
  return {
    id: data.id,
    amountPaise: Number(data.amount),
    currency: "INR",
    receipt: input.receipt,
    mock: false,
    keyId,
  };
}

/** Razorpay webhook signature: HMAC-SHA256 of the raw body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const received = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
}

/** Razorpay checkout signature verification (order id + payment id). */
export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  const received = Buffer.from(input.signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
}
