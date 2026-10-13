import { getCurrentUser } from "@/lib/server/session";
import { isAdminUser } from "@/lib/server/admin";
import { createPlan, deactivatePlan, listPlans, updatePlan } from "@/lib/server/subscriptions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await getCurrentUser(request);
  if (!isAdminUser(admin)) {
    return Response.json({ error: "Admin access only." }, { status: 403 });
  }
  const plans = await listPlans(false);
  return Response.json({
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      pricePaise: Number(plan.price_paise),
      periodDays: plan.period_days,
      active: plan.active,
    })),
  });
}

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const admin = await getCurrentUser(request);
  if (!isAdminUser(admin)) {
    return Response.json({ error: "Admin access only." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const action = typeof input.action === "string" ? input.action : "create";

  if (action === "update" && typeof input.id === "string") {
    const plan = await updatePlan(input.id, {
      name: typeof input.name === "string" ? input.name.trim() : undefined,
      description: typeof input.description === "string" ? input.description.trim() : undefined,
      pricePaise: input.pricePaise === undefined ? undefined : Number(input.pricePaise),
      periodDays: input.periodDays === undefined ? undefined : Number(input.periodDays),
      active: input.active === undefined ? undefined : input.active === true,
    });
    return Response.json({ plan });
  }
  if (action === "deactivate" && typeof input.id === "string") {
    await deactivatePlan(input.id);
    return Response.json({ ok: true });
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const pricePaise = Number(input.pricePaise);
  const periodDays = Number(input.periodDays);
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!name || !Number.isInteger(pricePaise) || pricePaise <= 0 || !Number.isInteger(periodDays) || periodDays <= 0) {
    return Response.json(
      { error: "A plan needs a name, a price in paise and a period in days." },
      { status: 400 },
    );
  }
  const plan = await createPlan({ name, description, pricePaise, periodDays });
  return Response.json({ plan }, { status: 201 });
}
