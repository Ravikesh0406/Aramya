// GET /api/payments/earnings — trainer earnings (org → trainer ledger).
import { getCurrentUser } from "@/lib/server/session";
import { listPayoutsForTrainer } from "@/lib/server/payments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in to view earnings." }, { status: 401 });
  }
  if (user.role !== "trainer") {
    return Response.json({ error: "Trainers only." }, { status: 403 });
  }

  const payouts = await listPayoutsForTrainer(user.name);
  const payablePaise = payouts
    .filter((p) => p.status === "PAYABLE")
    .reduce((sum, p) => sum + p.amountPaise, 0);
  const paidPaise = payouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amountPaise, 0);

  return Response.json({ payouts, payablePaise, paidPaise });
}
