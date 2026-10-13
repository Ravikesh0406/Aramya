import { getBookingById, getBookingCustomerId, updateBookingStatus } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** Customer confirms a delivered session (their trainer may also mark it complete). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }
  if ((await getBookingCustomerId(id)) !== user.id) {
    return Response.json({ error: "You can only confirm your own sessions." }, { status: 403 });
  }
  if (booking.status !== "Confirmed" && booking.status !== "In Progress" && booking.status !== "Upcoming") {
    return Response.json({ error: "Only accepted sessions can be confirmed." }, { status: 409 });
  }

  const updated = await updateBookingStatus(id, "Completed");
  return Response.json({ booking: updated, message: "Session confirmed as completed." });
}
