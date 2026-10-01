"use client";

// ARAMYA booking flow — Design System §11 (Booking Flow), §12 (Trainer Matching),
// §10 (4-Session Trial) and §13 (scheduling rules).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  LocationIcon,
  CrosshairIcon,
  CalendarIcon,
  StarIcon,
  ShieldIcon,
} from "@/components/Icons";
import { SERVICE_ICONS } from "@/components/Icons";
import { Button, CheckList } from "@/components/ui";
import { DEMO_TRAINERS, DAYS, SERVICES, TIME_OPTIONS, TRIAL } from "@/lib/data";

const STEP_LABELS = [
  "Location",
  "Service",
  "Details",
  "Trial",
  "Days",
  "Time",
  "Request",
  "Matching",
] as const;

const MATCHING_STAGES = [
  "Finding nearby eligible trainers",
  "Notifying relevant trainers",
  "Trainer accepts your request",
  "Booking confirmed",
];

function LocationStep({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (value: string) => void;
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
          onClick={() => onChange("Current location")}
        >
          <CrosshairIcon size={17} /> Use current location
        </Button>
      </div>

      <p className="t-caption text-muted-600">
        Sessions must be booked 24 hours in advance or more.
      </p>

      <div className="pt-1">
        <Button size="lg" onClick={onNext} disabled={!value.trim()}>
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

function TrialStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="t-h2 text-charcoal-900">Your booking starts with the trial</h2>
        <p className="pt-2 text-body text-muted-600">
          Your first four sessions run as a {TRIAL.name}.
        </p>
      </div>

      <div className="rounded-xl border border-forest-900/12 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="t-h4 text-charcoal-900">{TRIAL.name}</p>
            <p className="pt-1 text-body-sm text-muted-600">
              4 private at-home sessions with a matched trainer
            </p>
          </div>
          <span className="rounded-pill bg-forest-900 px-3 py-1 text-caption font-semibold text-white">
            Early access
          </span>
        </div>
        <div className="mt-4 flex items-baseline gap-3 border-t border-forest-900/8 pt-4">
          <span className="text-muted-600 line-through">{TRIAL.regularPrice}</span>
          <span className="t-h1 text-forest-900">{TRIAL.price}</span>
        </div>
        <div className="mt-5">
          <p className="t-overline pb-4 text-muted-600">What&apos;s included</p>
          <CheckList items={TRIAL.included} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" onClick={onNext}>
          Book Your Trial <ArrowRightIcon size={17} />
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
          Send your request — nearby eligible trainers will be notified.
        </p>
      </div>

      <dl className="grid gap-px overflow-hidden rounded-xl border border-forest-900/10 bg-forest-900/10 sm:grid-cols-2">
        {[
          ["Location", summary.location],
          ["Service", summary.service],
          ["Booking", `${TRIAL.name} · ${TRIAL.price}`],
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

function MatchingStep({
  days,
  time,
  service,
}: {
  days: string[];
  time: string;
  service: string;
}) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage >= MATCHING_STAGES.length - 1) return;
    const timer = window.setTimeout(() => setStage((s) => s + 1), 1400);
    return () => window.clearTimeout(timer);
  }, [stage]);

  const matchedTrainer = useMemo(
    () => DEMO_TRAINERS.find((t) => t.services.includes(service)) ?? DEMO_TRAINERS[0],
    [service],
  );

  const done = stage >= MATCHING_STAGES.length - 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="t-overline text-terracotta-500">Trainer matching</p>
        <h2 className="pt-1.5 t-h2 text-charcoal-900">
          {done ? "Your booking is confirmed" : "Matching you with a trainer"}
        </h2>
      </div>

      <ol className="flex flex-col gap-3">
        {MATCHING_STAGES.map((label, index) => {
          const state = index < stage ? "done" : index === stage ? "active" : "pending";
          return (
            <li
              key={label}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 transition duration-200 ease-out ${
                state === "pending"
                  ? "border-forest-900/10 bg-white opacity-60"
                  : state === "active"
                    ? "border-forest-900/30 bg-white shadow-sm"
                    : "border-success/30 bg-success/8"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-pill ${
                  state === "done"
                    ? "bg-success text-white"
                    : state === "active"
                      ? "bg-forest-900 text-white"
                      : "bg-forest-900/10 text-muted-600"
                }`}
              >
                {state === "done" ? (
                  <CheckIcon size={13} strokeWidth={2.6} />
                ) : (
                  <span className="text-caption font-bold">{index + 1}</span>
                )}
              </span>
              <span className="text-body text-charcoal-900">{label}</span>
            </li>
          );
        })}
      </ol>

      {done ? (
        <div className="flex flex-col gap-4 rounded-xl border border-forest-900/12 bg-white p-5 shadow-md">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-forest-900 text-body-md text-white">
              {matchedTrainer.name
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </span>
            <div className="min-w-0">
              <p className="text-body-md text-charcoal-900">
                {matchedTrainer.name}
              </p>
              <p className="text-body-sm text-muted-600">
                {matchedTrainer.experience} · {matchedTrainer.area}
              </p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 text-body-sm font-semibold text-charcoal-900">
              <StarIcon size={15} className="text-terracotta-500" />
              {matchedTrainer.rating.toFixed(1)}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3 border-t border-forest-900/8 pt-4 sm:grid-cols-3">
            <div>
              <dt className="t-caption text-muted-600">Status</dt>
              <dd className="pt-0.5 text-body-sm font-semibold text-success">
                Confirmed
              </dd>
            </div>
            <div>
              <dt className="t-caption text-muted-600">Days</dt>
              <dd className="pt-0.5 text-body-sm text-charcoal-900">
                {days.map((d) => d.slice(0, 3)).join(", ")}
              </dd>
            </div>
            <div>
              <dt className="t-caption text-muted-600">Time</dt>
              <dd className="pt-0.5 text-body-sm text-charcoal-900">{time}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3 border-t border-forest-900/8 pt-4">
            <Link href="/sessions">
              <Button>View My Sessions</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost">Back to home</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-forest-900/10 bg-ivory-50 p-5">
          <ShieldIcon size={20} className="mt-0.5 shrink-0 text-forest-900" />
          <p className="text-body-sm text-muted-600">
            We only notify nearby trainers who are eligible for your service.
            Where possible, the same trainer stays with your bundle.
          </p>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Flow root */

export function BookingFlow() {
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState("");
  const [service, setService] = useState<string | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [specificTime, setSpecificTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const serviceObj = SERVICES.find((s) => s.slug === service);
  const timeLabel =
    time === "Specific time" && specificTime
      ? `Specific time · ${specificTime}`
      : time;

  function toggleDay(day: string) {
    setDays((current) => {
      if (current.includes(day)) return current.filter((d) => d !== day);
      if (current.length >= 4) return current;
      return [...current, day];
    });
  }

  function submit() {
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setStep(7);
    }, 900);
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
            onChange={setLocation}
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
          <TrialStep onNext={() => setStep(4)} onBack={() => setStep(2)} />
        ) : null}

        {step === 4 ? (
          <DaysStep
            selected={days}
            onToggle={toggleDay}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        ) : null}

        {step === 5 ? (
          <TimeStep
            value={time}
            specific={specificTime}
            onChange={setTime}
            onSpecificChange={setSpecificTime}
            onNext={() => setStep(6)}
            onBack={() => setStep(4)}
          />
        ) : null}

        {step === 6 ? (
          <RequestStep
            summary={{
              location,
              service: serviceObj?.name ?? "—",
              days,
              time: timeLabel,
            }}
            submitting={submitting}
            onSubmit={submit}
            onBack={() => setStep(5)}
          />
        ) : null}

        {step === 7 ? (
          <MatchingStep
            days={days}
            time={timeLabel}
            service={service ?? "yoga"}
          />
        ) : null}
      </div>
    </div>
  );
}
