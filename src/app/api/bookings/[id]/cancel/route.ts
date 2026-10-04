import { cancelBooking, getBookingCustomerId } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const { id } = await params;
  if (getBookingCustomerId(id) !== user.id) {
    return Response.json({ error: "You can only cancel your own request." }, { status: 403 });
  }
  const booking = cancelBooking(id);
  if (!booking) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }
  return Response.json({ booking });
}
