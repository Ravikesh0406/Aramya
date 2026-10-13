import { getCurrentUser } from "@/lib/server/session";
import { getTrainerByUserId } from "@/lib/server/trainers";
import {
  cancelSubscription,
  getActiveSubscription,
  getSubscriptionHistory,
  listPlans,
  purchaseSubscription,
} from "@/lib/server/subscriptions";
import { listingFeeRequired } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  const trainer = await getTrainerByUserId(user.id);
  if (!trainer) return Response.json({ error: "Trainer profile not found." }, { status: 404 });

  const [active, history, plans] = await Promise.all([
    getActiveSubscription(user.id),
    getSubscriptionHistory(user.id),
    listPlans(true),
  ]);

  return Response.json({
    active,
    history: history.map((payment) => ({
      id: payment.id,
      planId: payment.plan_id,
      status: payment.status,
      amountPaise: Number(payment.amount_paise),
      createdAt: payment.created_at,
      paidAt: payment.paid_at,
    })),
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      pricePaise: Number(plan.price_paise),
      periodDays: plan.period_days,
    })),
    listingFeeRequired: listingFeeRequired(),
  });
}

/** POST { planId } — prepaid one-period purchase (MOCK gateway without keys). */
export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const limit = (await import("@/lib/server/rate-limit")).rateLimited(request, 5, 60 * 60_000);
  if (!limit.ok) {
    return Response.json(
      { error: `Too many purchase attempts. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  const trainer = await getTrainerByUserId(user.id);
  if (!trainer) return Response.json({ error: "Trainer profile not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const planId = typeof input.planId === "string" ? input.planId : "";

  const result = await purchaseSubscription(user.id, planId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  const active = await getActiveSubscription(user.id);
  return Response.json({
    orderId: result.orderId,
    mock: result.mock,
    plan: {
      id: result.plan.id,
      name: result.plan.name,
      pricePaise: Number(result.plan.price_paise),
      periodDays: result.plan.period_days,
    },
    active,
  });
}

/** DELETE — cancel renewal; the current period keeps running to expiry. */
export async function DELETE(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  const cancelled = await cancelSubscription(user.id);
  return Response.json({ cancelled, active: await getActiveSubscription(user.id) });
}
