import { listPlans } from "@/lib/server/subscriptions";
import { listingFeeRequired } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Public listing plans (only active ones). */
export async function GET() {
  const plans = await listPlans(true);
  return Response.json({
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
