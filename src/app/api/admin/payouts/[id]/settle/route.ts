// POST /api/admin/payouts/:id/settle — org marks a PAYABLE payout settled
// with a manual reference (UTR / bank txn id). Admin allowlist only.
import { getCurrentUser } from "@/lib/server/session";
import { isAdmin } from "@/lib/server/admin";
import { getPayoutById, markPayoutPaid } from "@/lib/server/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser(request);
  if (!user || !isAdmin(user)) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { reference } = body as { reference?: string };
  if (!reference || !reference.trim()) {
    return Response.json({ error: "A settlement reference (UTR / txn id) is required." }, { status: 400 });
  }
  const payout = await getPayoutById(id);
  if (!payout) return Response.json({ error: "Payout not found." }, { status: 404 });
  if (payout.status !== "PAYABLE") {
    return Response.json({ error: `Payout is already ${payout.status}.` }, { status: 409 });
  }
  const settled = await markPayoutPaid(id, reference.trim(), `Manually settled by org on ${new Date().toISOString()}`);
  return Response.json({ payout: settled });
}
