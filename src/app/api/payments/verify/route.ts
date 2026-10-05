// POST /api/payments/verify — confirm a Razorpay payment after Checkout.
// Verifies the signature, marks the payment CAPTURED, and records the
// trainer's share in the payouts ledger (org → trainer).
import { getCurrentUser } from "@/lib/server/session";
import { getBookingForPayment } from "@/lib/server/store";
import {
  findPaymentByOrderId,
  findPayoutForPayment,
  capturePayment,
  createTrainerPayout,
  markPayoutPaid,
  setPayoutNote,
} from "@/lib/server/payments";
import { getGateway } from "@/lib/payments/gateway";
import { splitPayment } from "@/lib/payments/pricing";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in before paying." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { orderId, razorpayPaymentId, signature } = body as {
    orderId?: string;
    razorpayPaymentId?: string;
    signature?: string;
  };
  if (!orderId || !razorpayPaymentId || !signature) {
    return Response.json(
      { error: "orderId, razorpayPaymentId and signature are required." },
      { status: 400 },
    );
  }

  const payment = await findPaymentByOrderId(orderId);
  if (!payment || payment.userId !== user.id) {
    return Response.json({ error: "Payment not found." }, { status: 404 });
  }
  if (payment.status === "CAPTURED") {
    return Response.json({ payment, payout: await findPayoutForPayment(payment.id) });
  }
  if (payment.status !== "CREATED") {
    return Response.json({ error: "Payment is no longer open." }, { status: 409 });
  }

  const gateway = getGateway();
  const valid = gateway.verifyPaymentSignature({
    orderId,
    paymentId: razorpayPaymentId,
    signature,
  });
  if (!valid) {
    return Response.json({ error: "Payment signature mismatch." }, { status: 402 });
  }

  const captured = await capturePayment(payment.id, razorpayPaymentId);
  if (!captured) {
    return Response.json({ error: "Unable to capture payment." }, { status: 500 });
  }

  // Org → trainer: record the trainer's share for later settlement.
  let payout = await findPayoutForPayment(payment.id);
  if (!payout) {
    const booking = await getBookingForPayment(payment.bookingId);
    const trainerName = booking?.trainerName ?? "Unassigned trainer";
    const { trainerPaise } = splitPayment(payment.amountPaise);
    payout = await createTrainerPayout({
      paymentId: payment.id,
      bookingId: payment.bookingId,
      trainerName,
      amountPaise: trainerPaise,
    });
    // Attempt instant settlement when RazorpayX is configured; otherwise
    // the row stays PAYABLE for manual settlement by the org.
    try {
      const attempt = await gateway.settleTrainerPayout({
        amountPaise: trainerPaise,
        trainerName,
        reference: payout.id,
      });
      if (attempt.status === "PAID") {
        payout = await markPayoutPaid(payout.id, attempt.reference, attempt.note) ?? payout;
      } else if (attempt.note) {
        await setPayoutNote(payout.id, attempt.note);
      }
    } catch {
      // Settlement failures never fail the capture — org settles manually.
    }
  }

  return Response.json({ payment: captured, payout });
}
