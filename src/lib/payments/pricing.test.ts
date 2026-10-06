import { describe, expect, it } from "vitest";
import {
  planAmountPaise,
  splitPayment,
  formatINR,
  trainerShareBps,
  TRIAL_PAISE,
  MONTHLY_PAISE,
} from "@/lib/payments/pricing";

describe("pricing", () => {
  it("prices the trial at ₹999 and monthly at ₹4,500", () => {
    expect(planAmountPaise("trial")).toBe(TRIAL_PAISE);
    expect(planAmountPaise("monthly")).toBe(MONTHLY_PAISE);
    expect(TRIAL_PAISE).toBe(99900);
    expect(MONTHLY_PAISE).toBe(450000);
  });

  it("splits 70/30 by default with no paise lost", () => {
    const { trainerPaise, orgPaise } = splitPayment(99900);
    expect(trainerPaise).toBe(69930);
    expect(orgPaise).toBe(99900 - 69930);
    expect(trainerPaise + orgPaise).toBe(99900);
  });

  it("formats en-IN rupees", () => {
    expect(formatINR(99900)).toBe("₹999");
    expect(formatINR(450000)).toBe("₹4,500");
  });

  it("reads the share override within 0–10000 bps", () => {
    expect(trainerShareBps()).toBe(7000);
  });
});
