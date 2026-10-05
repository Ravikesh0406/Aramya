// Trainer inbox bell: open-request count, polled every 30s.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellIcon } from "@/components/Icons";
import { getBookings } from "@/lib/bookings";
import { useCurrentUser } from "@/lib/auth";

const POLL_MS = 30_000;

export function TrainerBell() {
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(0);

  useEffect(() => {
    if (!user || user.role !== "trainer") return;
    let cancelled = false;
    async function poll() {
      try {
        const bookings = await getBookings();
        if (!cancelled) {
          setOpen(bookings.filter((b) => b.status === "Requested").length);
        }
      } catch {
        // Poll failures stay silent — the dashboard is the source of truth.
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    const refresh = () => void poll();
    window.addEventListener("aramya:bookingsChanged", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("aramya:bookingsChanged", refresh);
    };
  }, [user]);

  if (!user || user.role !== "trainer") return null;

  return (
    <Link
      href="/trainer"
      aria-label={open > 0 ? `${open} open requests` : "Trainer dashboard"}
      title={open > 0 ? `${open} open requests` : "Trainer dashboard"}
      className="relative hidden h-11 w-11 items-center justify-center rounded-[10px] border border-forest-900/15 bg-white text-forest-900 transition duration-200 ease-out hover:border-forest-900/40 sm:inline-flex"
    >
      <BellIcon size={19} />
      {open > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-pill bg-terracotta-500 px-1 text-caption font-extrabold text-white">
          {open > 9 ? "9+" : open}
        </span>
      ) : null}
    </Link>
  );
}
