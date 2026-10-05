// GET /api/payments — my payments.
//   ?bookingId=… → payments I made for one booking (customer).
//   (no param)   → all my payments (customer) / payments on my accepted
//                 bookings (trainer, matched by trainer name).
import { getCurrentUser } from "@/lib/server/session";
import { listVisibleBookings } from "@/lib/server/store";
import {
  listPaymentsForBooking,
  findCapturedPaymentForBooking,
  type PaymentRow,
} from "@/lib/server/payments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in to view payments." }, { status: 401 });
  }

  const bookingId = new URL(request.url).searchParams.get("bookingId");

  if (user.role === "customer") {
    if (!bookingId) {
      return Response.json({ error: "bookingId is required." }, { status: 400 });
    }
    const payments = listPaymentsForBooking(bookingId, user.id);
    const captured = findCapturedPaymentForBooking(bookingId);
    const mine = captured && payments.some((p) => p.id === captured.id) ? captured : null;
    return Response.json({ payments, paid: mine !== null, captured: mine });
  }

  // Trainer: surface captured payments on bookings carrying their name,
  // so trainers can see which accepted bookings are paid by the customer.
  const bookings = listVisibleBookings(user).filter(
    (b) => b.trainerName === user.name && (!bookingId || b.id === bookingId),
  );
  const paid: { bookingId: string; payment: PaymentRow }[] = [];
  for (const b of bookings) {
    const captured = findCapturedPaymentForBooking(b.id);
    if (captured) paid.push({ bookingId: b.id, payment: captured });
  }
  return Response.json({ paid });
}
