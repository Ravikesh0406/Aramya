import { getCurrentUser } from "@/lib/server/session";
import { isAdminUser } from "@/lib/server/admin";
import { resolveReport } from "@/lib/server/reports";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const admin = await getCurrentUser(request);
  if (!isAdminUser(admin)) {
    return Response.json({ error: "Admin access only." }, { status: 403 });
  }
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const action = input.action === "dismiss" ? "dismissed" : "resolved";
  const ok = await resolveReport(id, action, admin?.name ?? "admin");
  if (!ok) return Response.json({ error: "Report not found." }, { status: 404 });
  return Response.json({ ok: true });
}
