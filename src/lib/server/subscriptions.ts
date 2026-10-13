// ARAMYA — listing subscriptions.
//
// Plans are created by an admin (name, price in paise, period in days); no fee is
// hardcoded or seeded. Purchases are prepaid one-time orders via the gateway
// wrapper (MOCK mode works without keys). Expiry is evaluated on read.

import { ensureSchema, execute, query, queryOne, randomId, transaction } from "@/lib/server/db";
import { createGatewayOrder } from "@/lib/server/payments";

export type SubscriptionPlanRow = {
  id: string;
  name: string;
  description: string;
  price_paise: number;
  period_days: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SubscriptionPaymentRow = {
  id: string;
  trainer_id: string;
  plan_id: string;
  order_id: string;
  payment_id: string | null;
  signature: string | null;
  amount_paise: number;
  status: string;
  created_at: string;
  paid_at: string | null;
};

export type ActiveSubscription = {
  planName: string;
  expiresAt: string;
  daysLeft: number;
};

export async function listPlans(activeOnly = false): Promise<SubscriptionPlanRow[]> {
  await ensureSchema();
  return query<SubscriptionPlanRow>(
    `SELECT * FROM subscription_plans ${activeOnly ? "WHERE active = TRUE" : ""} ORDER BY created_at`,
  );
}

export async function getPlan(id: string): Promise<SubscriptionPlanRow | null> {
  await ensureSchema();
  return queryOne<SubscriptionPlanRow>("SELECT * FROM subscription_plans WHERE id = $1", [id]);
}

export async function createPlan(input: {
  name: string;
  description: string;
  pricePaise: number;
  periodDays: number;
}): Promise<SubscriptionPlanRow> {
  await ensureSchema();
  const row = await queryOne<SubscriptionPlanRow>(
    `INSERT INTO subscription_plans (id, name, description, price_paise, period_days)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [randomId(), input.name, input.description, input.pricePaise, input.periodDays],
  );
  if (!row) throw new Error("Could not create plan.");
  return row;
}

export async function updatePlan(
  id: string,
  input: Partial<{ name: string; description: string; pricePaise: number; periodDays: number; active: boolean }>,
): Promise<SubscriptionPlanRow | null> {
  await ensureSchema();
  const sets: string[] = [];
  const params: (string | number | boolean)[] = [];
  const push = (column: string, value: string | number | boolean) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };
  if (input.name !== undefined) push("name", input.name);
  if (input.description !== undefined) push("description", input.description);
  if (input.pricePaise !== undefined) push("price_paise", input.pricePaise);
  if (input.periodDays !== undefined) push("period_days", input.periodDays);
  if (input.active !== undefined) push("active", input.active);
  if (sets.length === 0) return getPlan(id);
  params.push(id);
  return queryOne<SubscriptionPlanRow>(
    `UPDATE subscription_plans SET ${sets.join(", ")}, updated_at = now() WHERE id = $${
      params.length
    } RETURNING *`,
    params,
  );
}

export async function deactivatePlan(id: string): Promise<boolean> {
  await ensureSchema();
  const result = await execute("UPDATE subscription_plans SET active = FALSE, updated_at = now() WHERE id = $1", [
    id,
  ]);
  return result.changes > 0;
}

/** Active subscription for a trainer, or null. Expiry is evaluated here, on read. */
export async function getActiveSubscription(trainerId: string): Promise<ActiveSubscription | null> {
  await ensureSchema();
  const row = await queryOne<SubscriptionPlanRow & { expires_at: string; started_at: string }>(
    `SELECT p.name AS name, p.price_paise, p.period_days, s.expires_at, s.started_at
       FROM trainer_subscriptions s JOIN subscription_plans p ON p.id = s.plan_id
      WHERE s.trainer_id = $1 AND s.status = 'active' AND s.expires_at > now()
      ORDER BY s.expires_at DESC LIMIT 1`,
    [trainerId],
  );
  if (!row) return null;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );
  return { planName: row.name, expiresAt: row.expires_at, daysLeft };
}

export async function getSubscriptionHistory(trainerId: string): Promise<SubscriptionPaymentRow[]> {
  await ensureSchema();
  return query<SubscriptionPaymentRow>(
    "SELECT * FROM subscription_payments WHERE trainer_id = $1 ORDER BY created_at DESC",
    [trainerId],
  );
}

export type PurchaseResult =
  | { ok: true; mock: boolean; orderId: string; paymentId: string; plan: SubscriptionPlanRow }
  | { ok: false; error: string; status: number };

/**
 * Creates a one-time order for one plan period. In MOCK mode the order is marked
 * paid immediately and the subscription is activated.
 */
export async function purchaseSubscription(
  trainerId: string,
  planId: string,
): Promise<PurchaseResult> {
  await ensureSchema();
  const plan = await getPlan(planId);
  if (!plan || !plan.active) {
    return { ok: false, error: "That listing plan is not available.", status: 404 };
  }

  const paymentId = randomId();
  const order = await createGatewayOrder({
    amountPaise: Number(plan.price_paise),
    receipt: `sub_${paymentId.slice(0, 8)}`,
    notes: { type: "subscription", trainerId, planId },
  });

  await execute(
    `INSERT INTO subscription_payments (id, trainer_id, plan_id, order_id, amount_paise, status)
     VALUES ($1, $2, $3, $4, $5, 'created')`,
    [paymentId, trainerId, planId, order.id, order.amountPaise],
  );

  if (order.mock) {
    await completeSubscriptionPayment({ orderId: order.id, paymentId: order.id });
  }

  return { ok: true, mock: order.mock, orderId: order.id, paymentId: paymentId, plan };
}

/** Marks a subscription payment paid and extends the trainer's subscription. */
export async function completeSubscriptionPayment(input: {
  orderId: string;
  paymentId: string;
  signature?: string | null;
}): Promise<boolean> {
  await ensureSchema();
  return transaction(async (client) => {
    const found = await client.query<SubscriptionPaymentRow>(
      "SELECT * FROM subscription_payments WHERE order_id = $1",
      [input.orderId],
    );
    const payment = found.rows[0];
    if (!payment) return false;
    if (payment.status === "paid") return true;

    const plan = await client.query<SubscriptionPlanRow>(
      "SELECT * FROM subscription_plans WHERE id = $1",
      [payment.plan_id],
    );
    const planRow = plan.rows[0];
    if (!planRow) return false;

    await client.query(
      `UPDATE subscription_payments
          SET status = 'paid', payment_id = $1, signature = $2, paid_at = now()
        WHERE id = $3`,
      [input.paymentId, input.signature ?? null, payment.id],
    );

    const current = await client.query<{ expires_at: string }>(
      `SELECT expires_at FROM trainer_subscriptions
        WHERE trainer_id = $1 AND status = 'active' ORDER BY expires_at DESC LIMIT 1`,
      [payment.trainer_id],
    );
    const currentExpiry = current.rows[0]?.expires_at;
    const from = currentExpiry && new Date(currentExpiry) > new Date() ? new Date(currentExpiry) : new Date();
    const expiresAt = new Date(from.getTime() + Number(planRow.period_days) * 24 * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO trainer_subscriptions (id, trainer_id, plan_id, status, expires_at)
       VALUES ($1, $2, $3, 'active', $4)`,
      [randomId(), payment.trainer_id, planRow.id, expiresAt.toISOString()],
    );
    return true;
  });
}

export async function listSubscribers(): Promise<
  { trainerId: string; trainerName: string; trainerCode: string; planName: string; expiresAt: string; daysLeft: number }[]
> {
  await ensureSchema();
  const rows = await query<{
    trainer_id: string;
    name: string;
    trainer_code: string;
    plan_name: string;
    expires_at: string;
  }>(
    `SELECT s.trainer_id, u.name, p.trainer_code, pl.name AS plan_name, s.expires_at
       FROM trainer_subscriptions s
       JOIN users u ON u.id = s.trainer_id
       JOIN trainer_profiles p ON p.user_id = s.trainer_id
       JOIN subscription_plans pl ON pl.id = s.plan_id
      WHERE s.status = 'active' AND s.expires_at > now()
      ORDER BY s.expires_at`,
  );
  return rows.map((row) => ({
    trainerId: row.trainer_id,
    trainerName: row.name,
    trainerCode: row.trainer_code,
    planName: row.plan_name,
    expiresAt: row.expires_at,
    daysLeft: Math.max(0, Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86400000)),
  }));
}

export async function cancelSubscription(trainerId: string): Promise<boolean> {
  await ensureSchema();
  const result = await execute(
    `UPDATE trainer_subscriptions SET status = 'cancelled', cancelled_at = now()
      WHERE trainer_id = $1 AND status = 'active' AND expires_at > now()`,
    [trainerId],
  );
  return result.changes > 0;
}
