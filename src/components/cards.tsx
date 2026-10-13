// ARAMYA core cards — Service Card, Trainer Card, Session Card.
// (Design System §24 — Core Components)
import Link from "next/link";
import { ArrowRightIcon, StarIcon, ClockIcon, CalendarIcon } from "@/components/Icons";
import { SERVICE_ICONS } from "@/components/Icons";
import { StatusBadge } from "@/components/ui";
import { type Service } from "@/lib/data";

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
  reference,
  onCancel,
  onReschedule,
}: {
  service: string;
  trainer: string;
  day: string;
  date: string;
  time: string;
  status: string;
  reference?: string;
  onCancel?: () => void;
  onReschedule?: () => void;
}) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="t-h4 text-charcoal-900">{service}</h3>
          <p className="pt-0.5 text-body-sm text-muted-600">with {trainer}</p>
          {reference ? (
            <p className="pt-0.5 text-caption text-muted-600">Reference {reference}</p>
          ) : null}
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
      <div className="mt-auto flex flex-wrap gap-2">
        {status === "Requested" || status === "Confirmed" || status === "Accepted" || status === "Upcoming" || status === "Rescheduled" || status === "Reschedule Requested" ? (
          <>
            <button
              type="button"
              onClick={onReschedule}
              disabled={!onReschedule}
              className="rounded-[10px] border border-forest-900/20 bg-white px-4 py-2 text-body-sm font-semibold text-forest-900 transition duration-200 ease-out hover:border-forest-900/45 disabled:opacity-50"
            >
              Request a change
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={!onCancel}
              className="rounded-[10px] px-4 py-2 text-body-sm font-semibold text-error transition duration-200 ease-out hover:bg-error/5 disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}
