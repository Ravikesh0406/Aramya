// Pay for a booking: user → org via the payments gateway layer.
// Shows Paid state when a captured payment already exists for the booking.
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { getBookingPayments, payForBooking } from "@/lib/payments/client";
import { formatINR } from "@/lib/payments/pricing";
import { useCurrentUser } from "@/lib/auth";

export function PayButton({ bookingId, amountPaise, plan = "trial" }: { bookingId: string; amountPaise: number; plan?: "trial" | "monthly" }) {
  const { user } = useCurrentUser();
  const [paid, setPaid] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getBookingPayments(bookingId, plan)
      .then((data) => { if (!cancelled) setPaid(data.paid); })
      .catch(() => { if (!cancelled) setPaid(false); });
    return () => { cancelled = true; };
  }, [bookingId, plan]);

  async function pay() {
    setBusy(true);
    setError("");
    try {
      await payForBooking({
        bookingId,
        plan,
        customerName: user?.name,
        customerContact: user?.contact,
        onDone: () => {
          setPaid(true);
          window.dispatchEvent(new Event("aramya:bookingsChanged"));
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  if (paid === null) {
    return <p className="text-body-sm text-muted-600">Checking payment status…</p>;
  }

  if (paid) {
    return (
      <p className="inline-flex items-center gap-2 rounded-pill bg-forest-900/8 px-4 py-2 text-body-sm font-semibold text-forest-900">
        ✓ Paid {formatINR(amountPaise)}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={() => void pay()} disabled={busy}>
        {busy ? "Processing…" : `Pay ${formatINR(amountPaise)}`}
      </Button>
      {error ? <p className="text-body-sm text-error">{error}</p> : null}
    </div>
  );
}
