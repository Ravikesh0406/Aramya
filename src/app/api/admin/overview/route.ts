// GET /api/admin/overview — org ops snapshot (admin allowlist only).
import { getCurrentUser } from "@/lib/server/session";
import { isAdmin } from "@/lib/server/admin";
import { countBookingsByStatus } from "@/lib/server/store";
import {
  payoutTotals,
  listPayablePayouts,
  listManualRefunds,
} from "@/lib/server/payments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || !isAdmin(user)) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }
  const [byStatus, totals, payable, manualRefunds] = await Promise.all([
    countBookingsByStatus(),
    payoutTotals(),
    listPayablePayouts(),
    listManualRefunds(),
  ]);
  return Response.json({
    bookingsByStatus: byStatus,
    payoutTotals: totals,
    payablePayouts: payable,
    manualRefunds,
  });
}
