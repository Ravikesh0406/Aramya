// ARAMYA core cards — Service Card, Trial Card, Plan Card, Trainer Card, Session Card.
// (Design System §24 — Core Components)
import Link from "next/link";
import { ArrowRightIcon, StarIcon, ClockIcon, CalendarIcon } from "@/components/Icons";
import { SERVICE_ICONS } from "@/components/Icons";
import { ButtonLink, CheckList, StatusBadge } from "@/components/ui";
import { MONTHLY_PLAN, TRIAL, type Service } from "@/lib/data";

/* ------------------------------------------------------------- ServiceCard */

export function ServiceCard({ service }: { service: Service }) {
  const Icon = SERVICE_ICONS[service.icon];
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group flex flex-col gap-4 rounded-xl border border-forest-900/8 bg-white p-6 shadow-sm transition duration-200 ease-out hover:-translate-y-1 hover:border-forest-900/20 hover:shadow-md"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-ivory-50 text-forest-900 transition duration-200 ease-out group-hover:bg-forest-900 group-hover:text-white">
        <Icon size={24} />
      </span>
      <div className="flex flex-col gap-2">
        <h3 className="t-h4 text-charcoal-900">{service.name}</h3>
        <p className="t-body-sm text-muted-600">{service.short}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-body-sm font-semibold text-forest-900">
        View details
        <ArrowRightIcon
          size={16}
          className="transition duration-200 ease-out group-hover:translate-x-1"
        />
      </span>
    </Link>
  );
}

/* --------------------------------------------------------------- TrialCard */

export function TrialCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-forest-900/10 bg-white shadow-md ${className}`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-forest-900/8 bg-ivory-50 px-6 py-5">
        <div>
          <p className="t-overline text-terracotta-500">Start here</p>
          <h3 className="t-h3 pt-1 text-charcoal-900">{TRIAL.name}</h3>
        </div>
        <span className="rounded-pill bg-forest-900 px-3 py-1 text-caption font-semibold text-white">
          Early access
        </span>
      </div>

      <div className="flex flex-col gap-1 px-6 pt-6">
        <div className="flex items-baseline gap-3">
          <span className="text-muted-600 line-through">{TRIAL.regularPrice}</span>
          <span className="t-display text-forest-900">{TRIAL.price}</span>
        </div>
        <p className="t-caption text-muted-600">
          For 4 private at-home sessions · {TRIAL.name}
        </p>
      </div>

      <div className="flex flex-col gap-4 px-6 py-6">
        <p className="t-overline text-muted-600">What&apos;s included</p>
        <CheckList items={TRIAL.included} />
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-forest-900/8 px-6 py-5">
        <ButtonLink href="/book" size="lg" className="w-full">
          {TRIAL.cta}
        </ButtonLink>
        <p className="t-caption text-center text-muted-600">
          Sessions must be booked 24 hours in advance or more.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- PlanCard */

export function PlanCard({
  tone = "light",
  className = "",
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border shadow-md ${
        dark
          ? "border-ivory-50/15 bg-forest-900 text-ivory-50"
          : "border-forest-900/10 bg-white text-charcoal-900"
      } ${className}`}
    >
      <div
        className={`flex items-start justify-between gap-4 border-b px-6 py-5 ${
          dark ? "border-ivory-50/15 bg-forest-950/60" : "border-forest-900/8 bg-ivory-50"
        }`}
      >
        <div>
          <p className={`t-overline ${dark ? "text-sage-500" : "text-terracotta-500"}`}>
            {MONTHLY_PLAN.name}
          </p>
          <div className="flex items-baseline gap-2 pt-1.5">
            <span className={`t-display ${dark ? "text-ivory-50" : "text-forest-900"}`}>
              {MONTHLY_PLAN.price}
            </span>
            <span className={`t-body-md ${dark ? "text-ivory-50/75" : "text-muted-600"}`}>
              / {MONTHLY_PLAN.period}
            </span>
          </div>
        </div>
        <span
          className={`rounded-pill px-3 py-1 text-caption font-semibold ${
            dark ? "bg-ivory-50/15 text-ivory-50" : "bg-forest-900/8 text-forest-900"
          }`}
        >
          Ongoing
        </span>
      </div>

      <div className="flex flex-col gap-4 px-6 py-6">
        <p className={`t-overline ${dark ? "text-ivory-50/60" : "text-muted-600"}`}>
          What&apos;s included
        </p>
        <CheckList items={MONTHLY_PLAN.included} tone={dark ? "light" : "dark"} />
      </div>

      <div
        className={`mt-auto flex flex-col gap-3 border-t px-6 py-5 ${
          dark ? "border-ivory-50/15" : "border-forest-900/8"
        }`}
      >
        <ButtonLink
          href="/book"
          size="lg"
          variant={dark ? "secondary" : "primary"}
          className={`w-full ${dark ? "border-ivory-50/30 bg-transparent text-ivory-50 hover:border-ivory-50/60 hover:bg-ivory-50/10" : ""}`}
        >
          Start with a Trial
        </ButtonLink>
        <p className={`t-caption text-center ${dark ? "text-ivory-50/60" : "text-muted-600"}`}>
          {MONTHLY_PLAN.note}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- TrainerCard */

export function TrainerCard({
  name,
  area,
  experience,
  rating,
  serviceLabel,
  verified = true,
}: {
  name: string;
  area: string;
  experience: string;
  rating: number;
  serviceLabel: string;
  verified?: boolean;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-forest-900 text-body-md text-white"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-body-md text-charcoal-900">{name}</p>
          <p className="truncate text-body-sm text-muted-600">
            {experience} · {area}
          </p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 text-body-sm font-semibold text-charcoal-900">
          <StarIcon size={15} className="text-terracotta-500" />
          {rating.toFixed(1)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-pill border border-forest-900/15 bg-ivory-50 px-3 py-1 text-caption font-semibold text-forest-900">
          {serviceLabel}
        </span>
        {verified ? (
          <span className="rounded-pill bg-success/10 px-3 py-1 text-caption font-semibold text-success">
            Identity verified
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- SessionCard */

export function SessionCard({
  service,
  trainer,
  day,
  date,
  time,
  status,
}: {
  service: string;
  trainer: string;
  day: string;
  date: string;
  time: string;
  status: string;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="t-h4 text-charcoal-900">{service}</h3>
          <p className="pt-0.5 text-body-sm text-muted-600">with {trainer}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-forest-900/8 pt-4 text-body-sm text-charcoal-900">
        <span className="inline-flex items-center gap-2">
          <CalendarIcon size={16} className="text-muted-600" />
          {day}, {date}
        </span>
        <span className="inline-flex items-center gap-2">
          <ClockIcon size={16} className="text-muted-600" />
          {time}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-[10px] border border-forest-900/20 bg-white px-4 py-2 text-body-sm font-semibold text-forest-900 transition duration-200 ease-out hover:border-forest-900/45"
        >
          Request a change
        </button>
        <button
          type="button"
          className="rounded-[10px] px-4 py-2 text-body-sm font-semibold text-muted-600 transition duration-200 ease-out hover:text-charcoal-900"
        >
          View history
        </button>
      </div>
    </article>
  );
}
