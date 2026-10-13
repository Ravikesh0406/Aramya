"use client";

// Marketplace booking flow — trainer → offering → days & start time → details → request.
// The server recomputes everything (availability, clashes, price snapshot).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { CheckIcon, ClockIcon, MapPinIcon } from "@/components/Icons";

import { useCurrentUser } from "@/lib/auth";
import { createTargetedBooking, getPublicTrainerProfile, type PublicTrainerProfile } from "@/lib/trainers-public";

const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

export type BookingOffering = {
  id: string;
  categorySlug: string;
  format: "home_visit" | "online";
  durationMin: number;
  pricePaise: number;
  sessionsInPackage: number;
};

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function endTime(startTime: string, durationMin: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const total = hours * 60 + minutes + durationMin;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function TargetedBookingFlow({ trainerSlug }: { trainerSlug: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading } = useCurrentUser();

  const [trainer, setTrainer] = useState<PublicTrainerProfile | null>(null);
  const [loadError, setLoadError] = useState("");
  const [offeringId, setOfferingId] = useState<string | null>(params.get("offering"));
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ bookingId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const profile = await getPublicTrainerProfile(trainerSlug);
        if (!cancelled) {
          setTrainer(profile as PublicTrainerProfile | null);
          if (profile && profile.offerings.length > 0) {
            setOfferingId((current) => current ?? profile.offerings[0].id);
          }
        }
      } catch {
        if (!cancelled) setLoadError("This trainer profile could not be loaded.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [trainerSlug]);

  const offering = useMemo(
    () => trainer?.offerings.find((item) => item.id === offeringId) ?? null,
    [trainer, offeringId],
  );

  const slots = useMemo(() => {
    if (!trainer || !offering) return new Map<string, string[]>();
    const out = new Map<string, string[]>();
    for (const weekday of weekdays) {
      const available: string[] = [];
      for (const range of trainer.availability) {
        if (range.weekday !== weekday) continue;
        const [startHour, startMinute] = range.startTime.split(":").map(Number);
        const [endHour, endMinute] = range.endTime.split(":").map(Number);
        const from = startHour * 60 + startMinute;
        const to = endHour * 60 + endMinute;
        for (let minute = from; minute + offering.durationMin <= to; minute += 15) {
          available.push(
            `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
          );
        }
      }
      out.set(String(weekday), available.sort());
    }
    return out;
  }, [trainer, offering, weekdays]);

  const commonSlots = useMemo(() => {
    if (weekdays.length === 0) return [];
    const lists = weekdays.map((weekday) => slots.get(String(weekday)) ?? []);
    return lists.reduce((common, list) => common.filter((slot) => list.includes(slot)), lists[0] ?? []);
  }, [weekdays, slots]);

  // Keep the chosen slot valid: derive it from the shared slots instead of
  // resetting it in an effect.
  const effectiveStartTime = useMemo(() => {
    if (!startTime) return "";
    return commonSlots.includes(startTime) ? startTime : "";
  }, [commonSlots, startTime]);

  const canSubmit = Boolean(
    trainer && offering && weekdays.length > 0 && effectiveStartTime && (offering.format === "online" || location.trim()),
  );

  async function submit() {
    if (!trainer || !offering || weekdays.length === 0 || !startTime) return;
    setSubmitting(true);
    setError("");
    try {
      const booking = await createTargetedBooking({
        trainerSlug: trainer.slug,
        offeringId: offering.id,
        weekdays,
        startTime: effectiveStartTime,
        location,
      });
      setCreated(booking);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not send your request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return <p className="rounded-xl border border-dashed border-forest-900/15 bg-white p-8 text-center text-body-sm text-muted-600">{loadError}</p>;
  }
  if (!trainer) {
    return <p className="text-body text-muted-600">Loading trainer...</p>;
  }

  if (created) {
    return (
      <div className="flex flex-col gap-5 rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
        <p className="t-overline text-terracotta-500">Request sent</p>
        <h2 className="t-h2 text-charcoal-900">Waiting for {trainer.name} to accept</h2>
        <p className="text-body text-muted-600">
          Your request is with the trainer now. You will see it in your sessions as soon as they
          accept. Requests that go unanswered for 24 hours expire automatically.
        </p>
        <dl className="grid gap-px overflow-hidden rounded-xl border border-forest-900/10 bg-forest-900/10 sm:grid-cols-2">
          {[
            ["Trainer", trainer.name],
            ["Session", offering ? `${offering.durationMin} min · ${formatPrice(offering.pricePaise)}` : "—"],
            ["Days", weekdays.map((day) => WEEKDAYS.find((item) => item.value === day)?.label).join(", ")],
            ["Start time", effectiveStartTime ? `${effectiveStartTime} – ${offering ? endTime(effectiveStartTime, offering.durationMin) : ""} IST` : "—"],
          ].map(([label, value]) => (
            <div key={label} className="bg-white px-5 py-4">
              <dt className="t-caption text-muted-600">{label}</dt>
              <dd className="pt-1 text-body text-charcoal-900">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="t-caption text-muted-600">Payment is arranged directly with your trainer.</p>
        <div className="flex flex-wrap gap-2 border-t border-forest-900/8 pt-4">
          <Link href="/sessions">
            <Button>View my sessions</Button>
          </Link>
          <Link href={`/trainers/${trainer.slug}`}>
            <Button variant="secondary">Back to profile</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading) return <p className="text-body text-muted-600">Checking your account...</p>;

  if (!user) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-forest-900/10 bg-ivory-50 p-6">
        <p className="t-overline text-terracotta-500">Sign in required</p>
        <h2 className="t-h2 text-charcoal-900">Sign in to book with {trainer.name}</h2>
        <p className="text-body text-muted-600">
          You can browse every profile first, but booking needs a signed-in customer account.
        </p>
        <div className="pt-2">
          <Link href={`/login?redirect=/book?trainer=${trainer.slug}`}>
            <Button size="lg">Sign in to book</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (trainer.offerings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-forest-900/15 bg-white p-8 text-center">
        <p className="t-h4 text-charcoal-900">This trainer has no bookable sessions right now</p>
        <p className="pt-2 text-body-sm text-muted-600">Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="t-h3 text-charcoal-900">1. Choose a session</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {trainer.offerings.map((item) => {
            const selected = item.id === offeringId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOfferingId(item.id)}
                aria-pressed={selected}
                className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition duration-200 ease-out ${
                  selected
                    ? "border-forest-900 bg-forest-900 text-white"
                    : "border-forest-900/12 bg-white text-charcoal-900 hover:border-forest-900/35"
                }`}
              >
                <span className="text-body font-semibold">
                  {item.sessionsInPackage > 1 ? `${item.sessionsInPackage}-session package` : "Single session"}
                </span>
                <span className={`text-body-sm ${selected ? "text-ivory-50/80" : "text-muted-600"}`}>
                  {item.durationMin} minutes · {item.format === "online" ? "Online (Zoom)" : "Home visit"}
                </span>
                <span className="text-body-md font-semibold">{formatPrice(item.pricePaise)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="t-h3 text-charcoal-900">2. Pick your days</h2>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const selected = weekdays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setWeekdays((current) =>
                    current.includes(day.value)
                      ? current.filter((value) => value !== day.value)
                      : [...current, day.value],
                  )
                }
                className={`rounded-[10px] border px-4 py-2.5 text-body-sm font-semibold transition duration-200 ease-out ${
                  selected
                    ? "border-forest-900 bg-forest-900 text-white"
                    : "border-forest-900/15 bg-white text-charcoal-900 hover:border-forest-900/40"
                }`}
              >
                {day.label.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {weekdays.length > 0 && offering ? (
        <div className="flex flex-col gap-3">
          <h2 className="t-h3 text-charcoal-900">3. Pick a start time</h2>
          {commonSlots.length === 0 ? (
            <p className="text-body-sm text-muted-600">
              There is no shared slot on every chosen day. Try fewer days or another day.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {commonSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={slot === startTime}
                  onClick={() => setStartTime(slot)}
                  className={`inline-flex items-center gap-1.5 rounded-[10px] border px-4 py-2 text-body-sm font-semibold transition duration-200 ease-out ${
                    slot === startTime
                      ? "border-forest-900 bg-forest-900 text-white"
                      : "border-forest-900/15 bg-white text-charcoal-900 hover:border-forest-900/40"
                  }`}
                >
                  <ClockIcon size={15} />
                  {slot}
                </button>
              ))}
            </div>
          )}
          <p className="t-caption text-muted-600">
            Sessions run {offering.durationMin} minutes{effectiveStartTime ? ` — ${effectiveStartTime} to ${endTime(effectiveStartTime, offering.durationMin)} IST` : ""}.
          </p>
        </div>
      ) : null}

      {effectiveStartTime ? (
        <div className="flex flex-col gap-3">
          <h2 className="t-h3 text-charcoal-900">4. Where should sessions happen?</h2>
          {offering?.format === "online" ? (
            <p className="text-body-sm text-muted-600">
              This is an online session — your Zoom link appears here once {trainer.name} accepts.
            </p>
          ) : (
            <div className="relative max-w-xl">
              <MapPinIcon
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-terracotta-500"
              />
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Flat, street, area, city"
                aria-label="Where sessions should happen"
                className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white pl-10 pr-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
              />
              <p className="pt-2 t-caption text-muted-600">
                Only the trainer sees your full address, and only after they accept.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {effectiveStartTime ? (
        <div className="flex flex-col gap-3 rounded-xl border border-forest-900/10 bg-ivory-50 p-5">
          <p className="t-overline text-terracotta-500">Review request</p>
          <ul className="flex flex-col gap-1.5 text-body text-charcoal-900">
            <li className="inline-flex items-center gap-2">
              <CheckIcon size={16} className="text-forest-900" />
              {trainer.name} · {offering?.durationMin} minutes · {offering ? formatPrice(offering.pricePaise) : ""}
            </li>
            <li className="inline-flex items-center gap-2">
              <CheckIcon size={16} className="text-forest-900" />
              {weekdays.map((day) => WEEKDAYS.find((item) => item.value === day)?.label).join(", ")} at {startTime} IST
            </li>
          </ul>
          <p className="t-caption text-muted-600">
            Payment is arranged directly with your trainer — ARAMYA does not add anything to their price.
          </p>
          <div className="pt-1">
            <Button
              size="lg"
              onClick={() => void submit()}
              disabled={submitting || !canSubmit}
            >
              {submitting ? "Sending request..." : "Send booking request"}
            </Button>
          </div>
          {error ? <p className="text-body-sm text-error">{error}</p> : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => router.push(`/trainers/${trainer.slug}`)}
        className="self-start text-body-sm font-semibold text-forest-900 hover:text-forest-800"
      >
        Back to profile
      </button>
    </div>
  );
}
