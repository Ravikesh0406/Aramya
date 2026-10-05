import { acceptBookingWithTrainer } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/session";

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

  const { id } = await params;
  const result = await acceptBookingWithTrainer(id, user.name);
  if (!result.ok) {
    const status = result.reason === "NOT_FOUND" ? 404 : 409;
    return Response.json({ error: result.detail, reason: result.reason }, { status });
  }

  return Response.json({ booking: result.booking });
}
