// ARAMYA payments — browser helpers (Razorpay Checkout + API calls).
"use client";

export type OrderResponse = {
  paymentId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string | null;
  provider: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: { razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

function loadCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window."));
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (method !== "GET") headers.set("X-Requested-With", "XMLHttpRequest");
  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

export function createOrder(bookingId: string, plan: "trial" | "monthly" = "trial") {
  return api<OrderResponse>("/api/payments/order", "POST", { bookingId, plan });
}

export function verifyPayment(args: { orderId: string; razorpayPaymentId: string; signature: string }) {
  return api<{ payment: unknown; payout: unknown }>("/api/payments/verify", "POST", args);
}

export function getBookingPayments(bookingId: string, plan: "trial" | "monthly" = "trial") {
  return api<{ payments: unknown[]; paid: boolean; captured: unknown | null }>(
    `/api/payments?bookingId=${encodeURIComponent(bookingId)}&plan=${plan}`,
  );
}

export function getEarnings() {
  return api<{ payouts: unknown[]; payablePaise: number; paidPaise: number }>("/api/payments/earnings");
}

// Full pay flow: order → (Checkout | mock) → verify.
export async function payForBooking(args: {
  bookingId: string;
  plan?: "trial" | "monthly";
  customerName?: string;
  customerContact?: string;
  onDone: () => void;
}): Promise<void> {
  const order = await createOrder(args.bookingId, args.plan ?? "trial");

  // Mock provider (no Razorpay keys): no Checkout, verify immediately.
  if (order.provider === "mock" || !order.keyId) {
    await verifyPayment({
      orderId: order.orderId,
      razorpayPaymentId: `pay_mock_${Date.now().toString(36)}`,
      signature: "mock",
    });
    args.onDone();
    return;
  }

  await loadCheckoutScript();
  const Checkout = window.Razorpay;
  if (!Checkout) throw new Error("Unable to load Razorpay Checkout.");
  await new Promise<void>((resolve, reject) => {
    const checkout = new Checkout({
      key: order.keyId as string,
      amount: order.amountPaise,
      currency: order.currency,
      name: "Aramya",
      description: "Trial sessions",
      order_id: order.orderId,
      prefill: { name: args.customerName, contact: args.customerContact },
      theme: { color: "#1d3b2a" },
      handler: (response) => {
        verifyPayment({
          orderId: order.orderId,
          razorpayPaymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        }).then(() => resolve()).catch(reject);
      },
      modal: { ondismiss: () => reject(new Error("Payment window closed.")) },
    });
    checkout.open();
  });
  args.onDone();
}
