import { getCurrentUser } from "@/lib/server/session";
import { getBookingById, updateBookingMeetingUrl } from "@/lib/server/store";

export const dynamic = "force-dynamic";

function isValidZoomUrl(value: string): boolean {
  if (value.length === 0 || value.length > 500) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return host === "zoom.us" || host.endsWith(".zoom.us");
}

/** Trainer sets (or clears) the per-booking Zoom override for their own booking. */
export async function PATCH(
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

  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking || booking.trainerId !== user.id) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const raw = typeof input.meetingUrl === "string" ? input.meetingUrl.trim() : "";
  if (raw && !isValidZoomUrl(raw)) {
    return Response.json({ error: "That meeting link is not a valid Zoom URL." }, { status: 400 });
  }

  await updateBookingMeetingUrl(id, raw || null);
  return Response.json({ booking: await getBookingById(id), meetingUrl: raw || null });
}
