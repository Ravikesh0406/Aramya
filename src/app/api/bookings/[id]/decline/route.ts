import { declineBooking } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/session";
import { getTrainerByUserId } from "@/lib/server/trainers";

export const dynamic = "force-dynamic";

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

  const trainer = await getTrainerByUserId(user.id);
  if (!trainer || trainer.status !== "submitted") {
    return Response.json({ error: "Complete onboarding before handling requests." }, { status: 403 });
  }

  const { id } = await params;
  const booking = await declineBooking(id, user.id);
  if (!booking) {
    return Response.json({ error: "Request not found or already answered." }, { status: 404 });
  }
  return Response.json({ booking });
}
