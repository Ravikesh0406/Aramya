import { getCurrentUser } from "@/lib/server/session";
import { isAdminUser } from "@/lib/server/admin";
import { listTrainersForAdmin } from "@/lib/server/trainers";
import { countOpenReports } from "@/lib/server/reports";
import { listSubscribers } from "@/lib/server/subscriptions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await getCurrentUser(request);
  if (!isAdminUser(admin)) {
    return Response.json({ error: "Admin access only." }, { status: 403 });
  }
  const [pending, submitted, verified, rejected, suspended, openReports, subscribers] = await Promise.all([
    listTrainersForAdmin({ status: "draft" }),
    listTrainersForAdmin({ verification: "pending" }),
    listTrainersForAdmin({ verification: "verified" }),
    listTrainersForAdmin({ verification: "rejected" }),
    listTrainersForAdmin({ status: "suspended" }),
    countOpenReports(),
    listSubscribers(),
  ]);
  return Response.json({
    stats: {
      draftProfiles: pending.length,
      awaitingVerification: submitted.length,
      verified: verified.length,
      rejected: rejected.length,
      suspended: suspended.length,
      openReports,
      activeSubscribers: subscribers.length,
    },
  });
}
