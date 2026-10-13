import { getBookingById, updateBookingStatus } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/session";
import { getTrainerByUserId } from "@/lib/server/trainers";

export const dynamic = "force-dynamic";

const ALLOWED_FROM = ["Confirmed", "Upcoming", "In Progress", "Rescheduled"];
const TRANSITIONS: Record<string, { to: string; label: string }> = {
  start: { to: "In Progress", label: "Session started." },
  complete: { to: "Completed", label: "Session marked completed." },
  noshow: { to: "No Show", label: "Marked as a no-show." },
};

/**
 * Trainer session lifecycle: start / complete / no-show.
 * Only the booking's own trainer may transition it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const action = (body as Record<string, unknown>).action;
  const transition = typeof action === "string" ? TRANSITIONS[action] : undefined;
  if (!transition) {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }

  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }
  const trainer = await getTrainerByUserId(user.id);
  if (!trainer || booking.trainerId !== trainer.user_id) {
    return Response.json({ error: "You can only manage your own sessions." }, { status: 403 });
  }
  if (!ALLOWED_FROM.includes(booking.status)) {
    return Response.json({ error: `A ${booking.status} session cannot be updated.` }, { status: 409 });
  }

  const updated = await updateBookingStatus(id, transition.to as "In Progress");
  return Response.json({ booking: updated, message: transition.label });
}
