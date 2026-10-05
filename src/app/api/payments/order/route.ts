// POST /api/payments/order — customer creates a Razorpay order for a booking.
// User pays the ORG here; the trainer share is recorded at capture time.
import { getCurrentUser } from "@/lib/server/session";
import { getBookingForPayment } from "@/lib/server/store";
import {
  createPayment,
  findCapturedPaymentForBooking,
} from "@/lib/server/payments";
import { getGateway } from "@/lib/payments/gateway";
import { CURRENCY, planAmountPaise, type PlanKind } from "@/lib/payments/pricing";

export const dynamic = "force-dynamic";

// Bookings become payable once a trainer has accepted them.
const PAYABLE_STATUSES = ["Accepted", "Confirmed"];

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in before paying." }, { status: 401 });
  }
  if (user.role !== "customer") {
    return Response.json({ error: "Only customers pay for bookings." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { bookingId, plan } = body as { bookingId?: string; plan?: string };
  if (!bookingId) {
    return Response.json({ error: "bookingId is required." }, { status: 400 });
  }

  const booking = getBookingForPayment(bookingId);
  if (!booking || booking.customerId !== user.id) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }
  if (!PAYABLE_STATUSES.includes(booking.status)) {
    return Response.json(
      { error: "Payment opens after a trainer accepts your request." },
      { status: 409 },
    );
  }
  if (findCapturedPaymentForBooking(bookingId)) {
    return Response.json({ error: "This booking is already paid." }, { status: 409 });
  }

  const planKind: PlanKind = plan === "monthly" ? "monthly" : "trial";
  const amountPaise = planAmountPaise(planKind);

  const gateway = getGateway();
  const order = await gateway.createOrder({
    amountPaise,
    receipt: `aramya_${bookingId.slice(0, 12)}_${Date.now().toString(36)}`,
    notes: { bookingId, userId: user.id, plan: planKind },
  });

  const payment = createPayment({
    bookingId,
    userId: user.id,
    amountPaise: order.amountPaise,
    currency: order.currency || CURRENCY,
    provider: order.provider,
    orderId: order.orderId,
  });

  return Response.json(
    {
      paymentId: payment.id,
      orderId: order.orderId,
      amountPaise: order.amountPaise,
      currency: order.currency,
      keyId: order.keyId,
      provider: order.provider,
    },
    { status: 201 },
  );
}
