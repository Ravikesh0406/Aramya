import { getCurrentUser } from "@/lib/server/session";
import { isAdminUser } from "@/lib/server/admin";
import { listSubscribers } from "@/lib/server/subscriptions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await getCurrentUser(request);
  if (!isAdminUser(admin)) {
    return Response.json({ error: "Admin access only." }, { status: 403 });
  }
  return Response.json({ subscribers: await listSubscribers() });
}
