import { acceptBookingWithTrainer } from "@/lib/server/store";
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

  // Onboarding gate: a trainer must have submitted a profile before handling requests.
  const trainer = await getTrainerByUserId(user.id);
  if (!trainer || trainer.status !== "submitted") {
    return Response.json(
      { error: "Complete trainer onboarding before accepting requests." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const booking = await acceptBookingWithTrainer(id, user.id, trainer.name);
  if (!booking) {
    return Response.json({ error: "Booking not found or already accepted." }, { status: 404 });
  }

  return Response.json({ booking });
}
