// POST /api/payments/webhook — Razorpay event webhook.
// Verifies the HMAC signature over the RAW body, then reconciles:
//   payment.captured → CAPTURED (+ trainer payout row)
//   payment.failed   → FAILED
import { getBookingForPayment } from "@/lib/server/store";
import {
  findPaymentByOrderId,
  findPayoutForPayment,
  capturePayment,
  markPaymentFailed,
  createTrainerPayout,
} from "@/lib/server/payments";
import { getGateway } from "@/lib/payments/gateway";
import { splitPayment } from "@/lib/payments/pricing";

export const dynamic = "force-dynamic";

type RazorpayEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  const gateway = getGateway();
  if (!gateway.verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayEvent;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const entity = event.payload?.payment?.entity;
  if (!entity?.order_id) {
    return Response.json({ ok: true, ignored: true });
  }

  const payment = await findPaymentByOrderId(entity.order_id);
  if (!payment) {
    return Response.json({ ok: true, ignored: true });
  }

  if (event.event === "payment.captured" && payment.status === "CREATED") {
    await capturePayment(payment.id, entity.id ?? payment.razorpayPaymentId ?? "webhook");
    if (!await findPayoutForPayment(payment.id)) {
      const booking = await getBookingForPayment(payment.bookingId);
      const { trainerPaise } = splitPayment(payment.amountPaise);
      await createTrainerPayout({
        paymentId: payment.id,
        bookingId: payment.bookingId,
        trainerName: booking?.trainerName ?? "Unassigned trainer",
        amountPaise: trainerPaise,
      });
    }
  } else if (event.event === "payment.failed" && payment.status === "CREATED") {
    await markPaymentFailed(payment.id);
  }

  return Response.json({ ok: true });
}
