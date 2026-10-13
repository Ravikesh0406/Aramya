import { completeSubscriptionPayment } from "@/lib/server/subscriptions";
import { verifyWebhookSignature } from "@/lib/server/payments";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook. The signature is always verified first; the payload is then
 * routed by payment type. Only subscription payments are handled here — booking
 * payments stay behind BOOKING_PAYMENTS_ENABLED.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  let payload: {
    event?: string;
    payload?: {
      order?: { entity?: { id?: string; notes?: Record<string, string> } };
      payment?: { entity?: { id?: string; order_id?: string } };
    };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const event = payload.event ?? "";
  const orderId = payload.payload?.order?.entity?.id ?? payload.payload?.payment?.entity?.order_id ?? "";
  const paymentId = payload.payload?.payment?.entity?.id ?? orderId;
  const notes = payload.payload?.order?.entity?.notes ?? {};
  const type = notes.type ?? "";

  // Only subscription payments are routed through this handler today.
  if (type && type !== "subscription") {
    return Response.json({ received: true, ignored: true });
  }

  if (event === "payment.captured" || event === "order.paid" || event.startsWith("subscription")) {
    if (!orderId) return Response.json({ error: "Missing order." }, { status: 400 });
    await completeSubscriptionPayment({ orderId, paymentId });
  }

  return Response.json({ received: true });
}
