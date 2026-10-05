import { declineReschedule } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }

  const { id } = await params;
  const booking = await declineReschedule(id);
  if (!booking) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }
  return Response.json({ booking });
}
