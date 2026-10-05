// ARAMYA payments — pricing in paise (integer math, no float rupees).
// Display strings live in src/lib/data.ts (TRIAL / MONTHLY_PLAN); the paise
// values here must match those: trial ₹999 early-access, monthly ₹4,500.

export const CURRENCY = "INR";

export const TRIAL_PAISE = 99900;
export const MONTHLY_PAISE = 450000;

export type PlanKind = "trial" | "monthly";

export function planAmountPaise(plan: PlanKind): number {
  return plan === "monthly" ? MONTHLY_PAISE : TRIAL_PAISE;
}

export function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

// Trainer share of each captured payment, in basis points (7000 = 70%).
// Override with TRAINER_SHARE_BPS env. Org keeps the remainder.
export function trainerShareBps(): number {
  const raw = Number(process.env.TRAINER_SHARE_BPS ?? 7000);
  if (!Number.isFinite(raw) || raw < 0 || raw > 10000) return 7000;
  return Math.floor(raw);
}

export function splitPayment(amountPaise: number): { trainerPaise: number; orgPaise: number } {
  const trainerPaise = Math.floor((amountPaise * trainerShareBps()) / 10000);
  return { trainerPaise, orgPaise: amountPaise - trainerPaise };
}
