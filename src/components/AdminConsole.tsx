// Org ops console UI: payout + manual-refund queues.
"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/payments/pricing";

type Payout = {
  id: string;
  bookingId: string;
  trainerName: string;
  amountPaise: number;
  status: string;
  createdAt: string;
};

type ManualRefund = {
  id: string;
  bookingId: string;
  amountPaise: number;
  razorpayPaymentId: string | null;
  refundNote: string | null;
  refundedAt: string | null;
};

type Overview = {
  bookingsByStatus: Record<string, number>;
  payoutTotals: { payablePaise: number; paidPaise: number };
  payablePayouts: Payout[];
  manualRefunds: ManualRefund[];
};

export function AdminConsole() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (!res.ok) {
        setError("Admin access required.");
        return;
      }
      setData((await res.json()) as Overview);
    } catch {
      setError("Unable to load overview.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function settle(id: string) {
    const reference = (refs[id] ?? "").trim();
    if (!reference) {
      setError("Enter a settlement reference (UTR / txn id) first.");
      return;
    }
    setBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/payouts/${id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ reference }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Settle failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settle failed.");
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) {
    return <p className="text-body text-error">{error}</p>;
  }
  if (!data) return <p className="text-body text-muted-600">Loading operations…</p>;

  return (
    <div className="flex flex-col gap-8">
      {error ? <p className="text-body-sm text-error">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { value: formatINR(data.payoutTotals.payablePaise), label: "Payable to trainers" },
          { value: formatINR(data.payoutTotals.paidPaise), label: "Settled to trainers" },
          { value: String(data.manualRefunds.length), label: "Manual refunds pending" },
          {
            value: String(
              Object.entries(data.bookingsByStatus)
                .filter(([status]) => !["Cancelled", "Completed", "No Show"].includes(status))
                .reduce((sum, [, count]) => sum + count, 0),
            ),
            label: "Live bookings",
          },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-forest-900/8 bg-white p-4 shadow-sm">
            <p className="text-body-md text-forest-900">{tile.value}</p>
            <p className="pt-0.5 text-caption text-muted-600">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="t-h3 text-charcoal-900">Payable payouts ({data.payablePayouts.length})</h2>
        {data.payablePayouts.length === 0 ? (
          <p className="text-body-sm text-muted-600">Nothing waiting — all trainer shares are settled.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-forest-900/10 bg-white shadow-sm">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-forest-900/10 bg-ivory-50">
                  {["Trainer", "Amount", "Booking", "Waiting since", "Settle"].map((h) => (
                    <th key={h} scope="col" className="px-5 py-3 text-body-sm font-semibold text-muted-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-900/8">
                {data.payablePayouts.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 text-body-sm text-charcoal-900">{p.trainerName}</td>
                    <td className="px-5 py-3 text-body-sm font-semibold text-charcoal-900">{formatINR(p.amountPaise)}</td>
                    <td className="px-5 py-3 font-mono text-caption text-muted-600">{p.bookingId.slice(0, 8)}</td>
                    <td className="px-5 py-3 text-body-sm text-muted-600">{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <input
                          value={refs[p.id] ?? ""}
                          onChange={(e) => setRefs((r) => ({ ...r, [p.id]: e.target.value }))}
                          placeholder="UTR / txn id"
                          aria-label={`Settlement reference for ${p.trainerName}`}
                          className="h-10 w-36 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm focus:border-forest-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void settle(p.id)}
                          disabled={busy === p.id}
                          className="h-10 rounded-[10px] bg-forest-900 px-4 text-body-sm font-semibold text-white hover:bg-forest-800 disabled:opacity-50"
                        >
                          {busy === p.id ? "…" : "Settle"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="t-h3 text-charcoal-900">Manual refunds pending ({data.manualRefunds.length})</h2>
        {data.manualRefunds.length === 0 ? (
          <p className="text-body-sm text-muted-600">No manual refunds outstanding.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.manualRefunds.map((r) => (
              <li key={r.id} className="rounded-xl border border-forest-900/10 bg-white p-4 text-body-sm shadow-sm">
                <span className="font-semibold text-charcoal-900">{formatINR(r.amountPaise)}</span>
                {" "}for booking <span className="font-mono text-caption">{r.bookingId.slice(0, 8)}</span>
                <span className="block pt-1 text-muted-600">{r.refundNote}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
