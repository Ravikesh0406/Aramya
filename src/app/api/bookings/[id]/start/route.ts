import { startSession, type LifecycleResult } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

function toResponse(result: LifecycleResult) {
  if (!result.ok) {
    const status = result.reason === "NOT_FOUND" ? 404 : result.reason === "FORBIDDEN" ? 403 : 409;
    return Response.json({ error: result.detail, reason: result.reason }, { status });
  }
  return Response.json({ booking: result.booking });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  const { id } = await params;
  return toResponse(await startSession(id, user.name));
}
