// ARAMYA trainer card — reusable discovery card (Design System §24 style).
// Photo: trainer photo when present, otherwise initials on a Sand surface.
// No stock photography is ever used.

import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { MapPinIcon, StarIcon, VerifiedIcon } from "@/components/Icons";
import type { PublicTrainerCard } from "@/lib/server/search";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function localityLabel(card: PublicTrainerCard): string | null {
  const first = card.areas[0];
  if (!first) return null;
  return [first.locality, first.city].filter(Boolean).join(", ");
}

export function TrainerMarketCard({ trainer }: { trainer: PublicTrainerCard }) {
  const locality = localityLabel(trainer);
  const fromLabel =
    trainer.fromPricePaise !== null && trainer.fromDurationMin !== null
      ? `from ${formatPrice(trainer.fromPricePaise)}${
          trainer.fromSessions > 1 ? ` / ${trainer.fromSessions} sessions` : ""
        }`
      : null;

  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm transition duration-200 ease-out hover:border-forest-900/20 hover:shadow-md">
      <div className="flex items-start gap-4">
        {trainer.photoKey ? (
          <img
            src={`/api/trainer-photo/${encodeURIComponent(trainer.photoKey)}`}
            alt=""
            className="h-14 w-14 shrink-0 rounded-pill object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-sand-100 text-body-md font-semibold text-forest-900"
          >
            {initials(trainer.name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate t-h4 text-charcoal-900">
              <Link href={`/trainers/${trainer.slug}`} className="hover:text-forest-900">
                {trainer.name}
              </Link>
            </h3>
            {trainer.verified ? (
              <span
                className="inline-flex items-center gap-1 rounded-pill bg-success/10 px-2 py-0.5 text-caption font-semibold text-success"
                title="Identity and credentials verified"
              >
                <VerifiedIcon size={12} />
                Verified
              </span>
            ) : null}
          </div>
          <p className="truncate text-body-sm text-muted-600">
            {[trainer.primaryCategory?.name, `${trainer.yearsExperience} yrs experience`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {locality ? (
            <p className="inline-flex items-center gap-1.5 pt-0.5 text-body-sm text-muted-600">
              <MapPinIcon size={14} />
              {locality}
            </p>
          ) : null}
        </div>
        {trainer.rating && trainer.rating.count > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-body-sm font-semibold text-charcoal-900">
            <StarIcon size={15} className="text-terracotta-500" />
            {trainer.rating.average?.toFixed(1)}
            <span className="text-caption font-normal text-muted-600">({trainer.rating.count})</span>
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {trainer.formats.includes("home_visit") ? (
          <span className="rounded-pill border border-forest-900/15 bg-ivory-50 px-3 py-1 text-caption font-semibold text-forest-900">
            In person
          </span>
        ) : null}
        {trainer.formats.includes("online") ? (
          <span className="rounded-pill border border-forest-900/15 bg-ivory-50 px-3 py-1 text-caption font-semibold text-forest-900">
            Online (Zoom)
          </span>
        ) : null}
        {fromLabel ? (
          <span className="text-body-sm font-semibold text-forest-900">
            {fromLabel}
            {trainer.fromDurationMin ? ` per ${trainer.fromDurationMin}-min session` : ""}
          </span>
        ) : null}
        {trainer.distanceLabel ? (
          <span className="text-caption text-muted-600">{trainer.distanceLabel}</span>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-forest-900/8 pt-4">
        <ButtonLink href={`/trainers/${trainer.slug}`} size="sm" variant="secondary">
          View profile
        </ButtonLink>
        <ButtonLink href={`/book?trainer=${trainer.slug}`} size="sm">
          Book session
        </ButtonLink>
      </div>
    </article>
  );
}
