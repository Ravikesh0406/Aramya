import { getCurrentUser } from "@/lib/server/session";
import { isAdminUser } from "@/lib/server/admin";
import { listReports } from "@/lib/server/reports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await getCurrentUser(request);
  if (!isAdminUser(admin)) {
    return Response.json({ error: "Admin access only." }, { status: 403 });
  }
  const status = new URL(request.url).searchParams.get("status") ?? "open";
  const allowed = ["open", "resolved", "dismissed", "all"];
  return Response.json({ reports: await listReports(allowed.includes(status) ? (status as "open") : "open") });
}
