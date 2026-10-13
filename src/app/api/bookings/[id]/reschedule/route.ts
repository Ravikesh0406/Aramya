import { getBookingCustomerId, requestReschedule } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const days = Array.isArray(input.days) && input.days.every((day) => typeof day === "string")
    ? [...new Set(input.days as string[])]
    : [];

  if (days.length !== 4 || typeof input.time !== "string" || (input.time === "Specific time" && typeof input.specificTime !== "string")) {
    return Response.json({ error: "Please choose four days, a time window, and specific time if needed." }, { status: 400 });
  }

  const { id } = await params;
  if ((await getBookingCustomerId(id)) !== user.id) {
    return Response.json({ error: "You can only change your own booking." }, { status: 403 });
  }

  const booking = await requestReschedule(id, {
    days,
    time: input.time,
    specificTime: typeof input.specificTime === "string" ? input.specificTime : "",
    proposedByRole: user.role,
  });

  if (!booking) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }

  return Response.json({ booking });
}
