// Trainer earnings: org → trainer ledger (payable vs settled).
"use client";

import { useEffect, useState } from "react";
import { getEarnings } from "@/lib/payments/client";
import { formatINR } from "@/lib/payments/pricing";

type Payout = {
  id: string;
  bookingId: string;
  amountPaise: number;
  status: "PAYABLE" | "PAID";
  reference: string | null;
  note: string | null;
  createdAt: string;
};

export function EarningsPanel() {
  const [data, setData] = useState<{ payouts: Payout[]; payablePaise: number; paidPaise: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getEarnings()
      .then((res) => { if (!cancelled) setData(res as { payouts: Payout[]; payablePaise: number; paidPaise: number }); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  if (failed) return null;
  if (!data) {
    return (
      <div className="rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm">
        <p className="text-body-sm text-muted-600">Loading earnings…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm">
      <p className="t-overline pb-4 text-muted-600">Earnings</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-body-md text-forest-900">{formatINR(data.payablePaise)}</p>
          <p className="pt-0.5 text-caption text-muted-600">Payable by org</p>
        </div>
        <div>
          <p className="text-body-md text-forest-900">{formatINR(data.paidPaise)}</p>
          <p className="pt-0.5 text-caption text-muted-600">Settled to you</p>
        </div>
      </div>
      {data.payouts.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2 border-t border-forest-900/8 pt-4">
          {data.payouts.slice(0, 5).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 text-body-sm">
              <span className="text-charcoal-900">{formatINR(p.amountPaise)}</span>
              <span className={p.status === "PAID" ? "font-semibold text-success" : "font-semibold text-terracotta-500"}>
                {p.status === "PAID" ? "Settled" : "Payable"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pt-3 text-body-sm text-muted-600">
          No payouts yet — your 70% share lands here when a customer&apos;s payment captures.
        </p>
      )}
    </div>
  );
}
