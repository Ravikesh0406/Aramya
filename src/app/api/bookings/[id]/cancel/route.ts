import { cancelBooking, getBookingForPayment } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/session";
import { requestRefundForBooking } from "@/lib/server/payments";
import { nextDateForDay } from "@/lib/dates";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const { id } = await params;
  const facts = await getBookingForPayment(id);
  if (!facts || facts.customerId !== user.id) {
    return Response.json({ error: "You can only cancel your own request." }, { status: 403 });
  }
  const booking = await cancelBooking(id);
  if (!booking) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }
  // Cancellation window: free until the day before the first session,
  // org decision when cancelling on/after the day before (day granularity
  // keeps the boundary deterministic — no millisecond coin flips).
  const startOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy.getTime();
  };
  const firstSession = facts.days
    .map((day) => nextDateForDay(day))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const dayBefore = startOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const insideWindow = !firstSession || startOfDay(firstSession) <= dayBefore;
  // Paid booking → money must move too. Auto-attempts a live refund, records
  // a manual fallback; inside-window cancels always go manual.
  const refund = await requestRefundForBooking(id, user.id, { autoRefund: !insideWindow });
  return Response.json({
    booking,
    cancelWindow: insideWindow ? "inside-window" : "free",
    refund: refund.refunded ? refund : null,
  });
}
