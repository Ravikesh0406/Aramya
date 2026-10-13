import { getCurrentUser } from "@/lib/server/session";
import { isAdminUser } from "@/lib/server/admin";
import { listTrainersForAdmin, type ProfileStatus, type VerificationStatus } from "@/lib/server/trainers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!isAdminUser(user)) {
    return Response.json({ error: "Admin access only." }, { status: 403 });
  }
  const params = new URL(request.url).searchParams;
  const status = (params.get("status") ?? "all") as ProfileStatus | "all";
  const verification = (params.get("verification") ?? "all") as VerificationStatus | "all";
  const query = params.get("q") ?? "";

  const trainers = await listTrainersForAdmin({
    status: status === "all" ? "all" : status,
    verification: verification === "all" ? "all" : verification,
    query: query.trim() || undefined,
  });
  return Response.json({ trainers });
}
