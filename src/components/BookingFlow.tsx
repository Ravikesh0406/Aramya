"use client";

// ARAMYA legacy open-request flow (kept for existing customers and existing
// data). New bookings go through the targeted flow in TargetedBookingFlow.tsx.

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  LocationIcon,
  CrosshairIcon,
  CalendarIcon,
} from "@/components/Icons";
import { SERVICE_ICONS } from "@/components/Icons";
import { Button, CheckList } from "@/components/ui";
import { DAYS, SERVICES, TIME_OPTIONS } from "@/lib/data";
import {
  getCurrentLocation,
  getCurrentLocationErrorMessage,
} from "@/lib/geolocation";
import { createBooking, type BookingRequest } from "@/lib/bookings";
import { useCurrentUser } from "@/lib/auth";

const STEP_LABELS = [
  "Location",
  "Service",
  "Details",
  "Days",
  "Time",
  "Request",
  "Sent",
] as const;

function LocationStep({
  value,
  error,
  locating,
  onChange,
  onLocate,
  onNext,
}: {
  value: string;
  error: string;
  locating: boolean;
  onChange: (value: string) => void;
  onLocate: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="t-h2 text-charcoal-900">Where should we send your trainer?</h2>
        <p className="pt-2 text-body text-muted-600">
          We match you with eligible trainers near your location.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <LocationIcon
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-terracotta-500"
          />
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Flat, street, area, city"
            aria-label="Your address"
            className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white pl-10 pr-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
          />
        </div>
        <Button
          variant="secondary"
          size="lg"
          className="shrink-0"
          onClick={onLocate}
          disabled={locating}
        >
          <CrosshairIcon size={17} /> {locating ? "Locating..." : "Use current location"}
        </Button>
      </div>

      {error ? <p className="text-body-sm text-error">{error}</p> : null}

      <p className="t-caption text-muted-600">
        Sessions must be booked 24 hours in advance or more.
      </p>

      <div className="pt-1">
        <Button size="lg" onClick={onNext} disabled={!value.trim() || locating}>
          Continue <ArrowRightIcon size={17} />
        </Button>
      </div>
    </div>
  );
}

function ServiceStep({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="t-h2 text-charcoal-900">Choose your service</h2>
        <p className="pt-2 text-body text-muted-600">
          Four active services — all delivered as private at-home sessions.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SERVICES.map((service) => {
          const Icon = SERVICE_ICONS[service.icon];
          const selected = value === service.slug;
          return (
            <button
              key={service.slug}
              type="button"
              onClick={() => onSelect(service.slug)}
              aria-pressed={selected}
              className={`flex flex-col gap-2 rounded-xl border p-5 text-left transition duration-200 ease-out ${
                selected
                  ? "border-forest-900 bg-forest-900 text-white shadow-md"
                  : "border-forest-900/12 bg-white text-charcoal-900 hover:border-forest-900/35 hover:shadow-sm"
              }`}
            >
              <span className="flex items-center justify-between">
                <Icon size={22} />
                {selected ? <CheckIcon size={18} strokeWidth={2.4} /> : null}
              </span>
              <span className="t-h4">{service.name}</span>
              <span
                className={`text-body-sm ${selected ? "text-ivory-50/80" : "text-muted-600"}`}
              >
                {service.short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailStep({ slug, onNext, onBack }: { slug: string; onNext: () => void; onBack: () => void }) {
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) return null;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="t-overline text-terracotta-500">Service details</p>
        <h2 className="pt-1.5 t-h2 text-charcoal-900">{service.name}</h2>
        <p className="pt-2 text-body text-muted-600">{service.description}</p>
      </div>
      <div className="rounded-xl border border-forest-900/10 bg-ivory-50 p-5">
        <p className="t-overline pb-4 text-muted-600">What&apos;s included</p>
        <CheckList items={service.included} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" onClick={onNext}>
          Looks good <ArrowRightIcon size={17} />
        </Button>
      </div>
    </div>
  );
}

function DaysStep({
  selected,
  onToggle,
  onNext,
  onBack,
}: {
  selected: string[];
  onToggle: (day: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const complete = selected.length === 4;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="t-h2 text-charcoal-900">Choose four preferred days</h2>
        <p className="pt-2 text-body text-muted-600">
          Pick the four days you&apos;d like your sessions — not four sessions
          every week. {selected.length}/4 selected
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DAYS.map((day) => {
          const selectedDay = selected.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onToggle(day)}
              aria-pressed={selectedDay}
              className={`rounded-[10px] border px-4 py-3.5 text-body-sm font-semibold transition duration-200 ease-out ${
                selectedDay
                  ? "border-forest-900 bg-forest-900 text-white"
                  : "border-forest-900/15 bg-white text-charcoal-900 hover:border-forest-900/40"
              }`}
            >
              {day.slice(0, 3)}
            </button>
          );
        })}
      </div>

      {!complete ? (
        <p className="text-body-sm text-muted-600">
          Select {4 - selected.length} more day{4 - selected.length === 1 ? "" : "s"} to
          continue.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" onClick={onNext} disabled={!complete}>
          Continue <ArrowRightIcon size={17} />
        </Button>
      </div>
    </div>
  );
}

function TimeStep({
  value,
  specific,
  onChange,
  onSpecificChange,
  onNext,
  onBack,
}: {
  value: string;
  specific: string;
  onChange: (value: string) => void;
  onSpecificChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="t-h2 text-charcoal-900">Preferred time</h2>
        <p className="pt-2 text-body text-muted-600">
          Choose a time window for your four preferred days.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TIME_OPTIONS.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              aria-pressed={selected}
              className={`flex items-center justify-center gap-2 rounded-[10px] border px-4 py-3.5 text-body-sm font-semibold transition duration-200 ease-out ${
                selected
                  ? "border-forest-900 bg-forest-900 text-white"
                  : "border-forest-900/15 bg-white text-charcoal-900 hover:border-forest-900/40"
              }`}
            >
              {option !== "Specific time" ? (
                <ClockIcon size={16} />
              ) : (
                <CalendarIcon size={16} />
              )}
              {option}
            </button>
          );
        })}
      </div>

      {value === "Specific time" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="specific-time" className="t-overline text-muted-600">
            Specific time
          </label>
          <input
            id="specific-time"
            type="time"
            value={specific}
            onChange={(event) => onSpecificChange(event.target.value)}
            className="h-12 w-full max-w-xs rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          size="lg"
          onClick={onNext}
          disabled={!value || (value === "Specific time" && !specific)}
        >
          Review request <ArrowRightIcon size={17} />
        </Button>
      </div>
    </div>
  );
}

function RequestStep({
  summary,
  submitting,
  onSubmit,
  onBack,
}: {
  summary: { location: string; service: string; days: string[]; time: string };
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="t-h2 text-charcoal-900">Review your request</h2>
        <p className="pt-2 text-body text-muted-600">
          Send your request — nearby trainers are notified and one accepts it.
        </p>
      </div>

      <dl className="grid gap-px overflow-hidden rounded-xl border border-forest-900/10 bg-forest-900/10 sm:grid-cols-2">
        {[
          ["Location", summary.location],
          ["Service", summary.service],
          ["Preferred days", summary.days.join(", ")],
          ["Preferred time", summary.time],
          ["Advance booking", "24+ hours"],
        ].map(([label, value]) => (
          <div key={label} className="bg-white px-5 py-4">
            <dt className="t-caption text-muted-600">{label}</dt>
            <dd className="pt-1 text-body text-charcoal-900">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="t-caption text-muted-600">
        A confirmed session never changes silently — schedule changes always go
        through a request the other party accepts.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button size="lg" onClick={onSubmit} disabled={submitting}>
          {submitting ? "Sending request..." : "Send Request"}
        </Button>
      </div>
    </div>
  );
}

function RequestSentStep({ booking }: { booking: BookingRequest }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="t-overline text-terracotta-500">Request posted</p>
        <h2 className="pt-1.5 t-h2 text-charcoal-900">Thanks — we saved your trial request</h2>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-forest-900/10 bg-forest-900/10 sm:grid-cols-4">
        {[
          ["Location", booking.location],
          ["Service", booking.serviceName],
          ["Days", booking.days.map((day) => day.slice(0, 3)).join(", ")],
          ["Time", booking.time === "Specific time" && booking.specificTime ? booking.specificTime : booking.time],
        ].map(([label, value]) => (
          <div key={label} className="bg-white px-5 py-4">
            <dt className="t-caption text-muted-600">{label}</dt>
            <dd className="pt-1 text-body text-charcoal-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-xl border border-forest-900/10 bg-ivory-50 p-5">
        <p className="text-body-sm text-muted-600">
          Your request is now available in the trainer dashboard. Once a trainer accepts, the
          same request will show as confirmed in your session dashboard.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-forest-900/8 pt-4">
        <Link href="/sessions">
          <Button>View My Sessions</Button>
        </Link>
        <Link href="/trainer">
          <Button variant="secondary">Trainer Dashboard</Button>
        </Link>
        <Link href="/">
          <Button variant="ghost">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Flow root */

export function BookingFlow() {
  const { user, loading: authLoading } = useCurrentUser();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState(() => searchParams?.get("location") ?? "");
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);
  const [service, setService] = useState<string | null>(() => {
    const serviceParam = searchParams?.get("service");
    return SERVICES.some((s) => s.slug === serviceParam) ? serviceParam : null;
  });
  const [days, setDays] = useState<string[]>(() => {
    const daysParam = searchParams?.get("days")?.split(",").map((day) => day.trim()).filter(Boolean) ?? [];
    return daysParam.length === 4 && daysParam.every((day) => DAYS.includes(day)) ? [...new Set(daysParam)] : [];
  });
  const [time, setTime] = useState(() => searchParams?.get("time") ?? "");
  const [specificTime, setSpecificTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<BookingRequest | null>(null);
  const [submitError, setSubmitError] = useState("");

  const serviceObj = SERVICES.find((s) => s.slug === service);
  const timeLabel =
    time === "Specific time" && specificTime
      ? `Specific time · ${specificTime}`
      : time;

  async function locateCurrentLocation() {
    setLocating(true);
    setLocationError("");
    setLocation("Getting your location...");
    try {
      const current = await getCurrentLocation();
      setLocation(current.label);
    } catch (error) {
      setLocation("");
      setLocationError(getCurrentLocationErrorMessage(error));
    } finally {
      setLocating(false);
    }
  }

  function updateLocation(value: string) {
    setLocation(value);
    setLocationError("");
  }

  function toggleDay(day: string) {
    setDays((current) => {
      if (current.includes(day)) return current.filter((d) => d !== day);
      if (current.length >= 4) return current;
      return [...current, day];
    });
  }

  async function submit() {
    if (!service) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const booking = await createBooking({
        location,
        serviceSlug: service,
        serviceName: serviceObj?.name ?? "Service",
        days,
        time,
        specificTime,
      });
      setCreatedBooking(booking);
      setStep(6);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to send your request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="rounded-xl border border-forest-900/10 bg-ivory-50 p-5 shadow-sm md:p-8">
        <p className="text-body text-muted-600">Checking your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-forest-900/10 bg-ivory-50 p-5 shadow-sm md:p-8">
        <p className="t-overline text-terracotta-500">Sign in required</p>
        <h2 className="pt-2 t-h2 text-charcoal-900">Book a trial with an account</h2>
        <p className="pt-2 text-body text-muted-600">
          You can explore every service and plan first, but trial requests need a signed-in customer account.
        </p>
        <div className="pt-5">
          <Link href="/login?redirect=/book">
            <Button size="lg">Sign in to book</Button>
          </Link>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / STEP_LABELS.length) * 100;

  return (
    <div className="flex flex-col gap-8">
      {/* Progress */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="t-overline text-muted-600">
            Step {step + 1} of {STEP_LABELS.length}
          </p>
          <p className="text-body-sm font-semibold text-forest-900">
            {STEP_LABELS[step]}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEP_LABELS.length}
          aria-label="Booking progress"
          className="h-1.5 w-full overflow-hidden rounded-pill bg-forest-900/10"
        >
          <div
            className="h-full rounded-pill bg-forest-900 transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-forest-900/10 bg-ivory-50 p-5 shadow-sm md:p-8">
        {step === 0 ? (
          <LocationStep
            value={location}
            error={locationError}
            locating={locating}
            onChange={updateLocation}
            onLocate={() => void locateCurrentLocation()}
            onNext={() => setStep(1)}
          />
        ) : null}

        {step === 1 ? (
          <ServiceStep
            value={service}
            onSelect={(slug) => {
              setService(slug);
              setStep(2);
            }}
          />
        ) : null}

        {step === 2 && serviceObj ? (
          <DetailStep
            slug={serviceObj.slug}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        ) : null}

        {step === 3 ? (
          <DaysStep
            selected={days}
            onToggle={toggleDay}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        ) : null}

        {step === 4 ? (
          <TimeStep
            value={time}
            specific={specificTime}
            onChange={setTime}
            onSpecificChange={setSpecificTime}
            onNext={() => setStep(6)}
            onBack={() => setStep(4)}
          />
        ) : null}

        {step === 5 ? (
          <>
            <RequestStep
              summary={{
                location,
                service: serviceObj?.name ?? "—",
                days,
                time: timeLabel,
              }}
              submitting={submitting}
              onSubmit={() => void submit()}
              onBack={() => setStep(5)}
            />
            {submitError ? (
              <p className="pt-4 text-body-sm text-error">{submitError}</p>
            ) : null}
          </>
        ) : null}

        {step === 6 && createdBooking ? (
          <RequestSentStep booking={createdBooking} />
        ) : null}
      </div>
    </div>
  );
}
