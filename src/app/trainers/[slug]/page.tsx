// ARAMYA trainer profile — public, server-rendered, allow-listed fields only.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, ButtonLink } from "@/components/ui";
import { getPublicTrainerProfile, formatPricePaise } from "@/lib/server/search";
import { ReportProfileButton } from "@/components/ReportProfileButton";
import { TrainerReviews } from "@/components/TrainerReviews";

export const dynamic = "force-dynamic";

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function generateMetadata(
  props: PageProps<"/trainers/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const trainer = await getPublicTrainerProfile(slug);
  if (!trainer) return { title: "Trainer not found" };
  return {
    title: `${trainer.name} — Trainer`,
    description:
      trainer.primaryCategory?.name
        ? `${trainer.primaryCategory.name} trainer with ${trainer.yearsExperience} years of experience. ${
            trainer.formats.includes("online") ? "Online and in-person sessions." : "In-person sessions."
          }`
        : `${trainer.yearsExperience} years of experience. View offerings, availability and reviews.`,
  };
}

export default async function TrainerProfilePage(props: PageProps<"/trainers/[slug]">) {
  const { slug } = await props.params;
  const trainer = await getPublicTrainerProfile(slug);
  if (!trainer) notFound();

  const certified = trainer.certifications.filter((certification) => certification.name);

  return (
    <>
      <section className="border-b border-forest-900/10 bg-ivory-50 py-12 md:py-16">
        <Container className="grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col gap-5">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-body-sm text-muted-600">
              <Link href="/trainers" className="transition hover:text-forest-900">
                Trainers
              </Link>
              <span aria-hidden>/</span>
              <span className="text-charcoal-900">{trainer.name}</span>
            </nav>

            <div className="flex items-center gap-5">
              {trainer.photoKey ? (
                <img
                  src={`/api/trainer-photo/${encodeURIComponent(trainer.photoKey)}`}
                  alt=""
                  className="h-20 w-20 rounded-pill object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-20 w-20 items-center justify-center rounded-pill bg-sand-100 text-h3 font-semibold text-forest-900"
                >
                  {trainer.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="t-h1 text-charcoal-900">{trainer.name}</h1>
                  {trainer.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-success/10 px-3 py-1 text-caption font-semibold text-success">
                      Verified
                    </span>
                  ) : null}
                </div>
                <p className="text-body text-muted-600">
                  {[trainer.primaryCategory?.name, `${trainer.yearsExperience} years experience`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {trainer.areas.length > 0 ? (
                  <p className="text-body-sm text-muted-600">
                    Serves {trainer.areas.map((area) => [area.locality, area.city].filter(Boolean).join(", ")).join("; ")}
                  </p>
                ) : null}
                {trainer.rating && trainer.rating.count > 0 ? (
                  <p className="text-body-sm text-charcoal-900">
                    {trainer.rating.average?.toFixed(1)} · {trainer.rating.count}{" "}
                    {trainer.rating.count === 1 ? "review" : "reviews"}
                  </p>
                ) : null}
              </div>
            </div>

            <p className="max-w-2xl whitespace-pre-line t-body-lg text-charcoal-900">{trainer.bio}</p>

            <div className="flex flex-wrap gap-2">
              {trainer.formats.includes("home_visit") ? (
                <span className="rounded-pill border border-forest-900/15 bg-white px-3 py-1 text-caption font-semibold text-forest-900">
                  In person
                </span>
              ) : null}
              {trainer.formats.includes("online") ? (
                <span className="rounded-pill border border-forest-900/15 bg-white px-3 py-1 text-caption font-semibold text-forest-900">
                  Online (Zoom)
                </span>
              ) : null}
              {trainer.categories.map((category) => (
                <span
                  key={category.slug}
                  className={`rounded-pill px-3 py-1 text-caption font-semibold ${
                    category.primary
                      ? "bg-forest-900 text-white"
                      : "border border-forest-900/15 bg-white text-forest-900"
                  }`}
                >
                  {category.name}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <ButtonLink href={`/book?trainer=${trainer.slug}`} size="lg">
                Book a session
              </ButtonLink>
              <ReportProfileButton slug={trainer.slug} />
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
            <p className="t-overline text-terracotta-500">Sessions &amp; prices</p>
            <p className="text-body-sm text-muted-600">
              Prices are set by the trainer. Payment is arranged directly with your trainer.
            </p>
            <ul className="flex flex-col divide-y divide-forest-900/8">
              {trainer.offerings.map((offering) => (
                <li key={offering.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-body font-semibold text-charcoal-900">
                      {offering.sessionsInPackage > 1
                        ? `${offering.sessionsInPackage}-session package`
                        : `Single session`}
                    </p>
                    <p className="text-body-sm text-muted-600">
                      {offering.durationMin} minutes · {offering.format === "online" ? "Online (Zoom)" : "Home visit"}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-body-md font-semibold text-forest-900">
                    {formatPricePaise(offering.pricePaise)}
                  </p>
                </li>
              ))}
            </ul>
            <ButtonLink href={`/book?trainer=${trainer.slug}`} className="w-full">
              Book a session
            </ButtonLink>
          </div>
        </Container>
      </section>

      <section className="py-12 md:py-16">
        <Container className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
              <p className="t-overline pb-4 text-terracotta-500">Availability</p>
              <p className="text-body-sm text-muted-600">Times shown in IST. Sessions are booked inside these windows.</p>
              <ul className="flex flex-col gap-2 pt-4">
                {WEEKDAY_LABELS.map((label, index) => {
                  const ranges = trainer.availability.filter((range) => range.weekday === index);
                  if (ranges.length === 0) return null;
                  return (
                    <li key={label} className="flex flex-wrap items-center gap-2 text-body-sm text-charcoal-900">
                      <span className="w-24 font-semibold">{label}</span>
                      {ranges.map((range) => (
                        <span
                          key={`${range.startTime}-${range.endTime}`}
                          className="rounded-sm bg-ivory-50 px-2.5 py-1 text-caption"
                        >
                          {range.startTime} – {range.endTime}
                        </span>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </div>

            {trainer.languages.length > 0 || certified.length > 0 ? (
              <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
                <p className="t-overline pb-4 text-terracotta-500">Background</p>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {trainer.languages.length > 0 ? (
                    <div>
                      <dt className="t-caption text-muted-600">Languages</dt>
                      <dd className="pt-1 text-body text-charcoal-900">{trainer.languages.join(", ")}</dd>
                    </div>
                  ) : null}
                  {certified.length > 0 ? (
                    <div>
                      <dt className="t-caption text-muted-600">Certifications</dt>
                      <dd className="pt-1 text-body text-charcoal-900">
                        {certified.map((certification) => (
                          <span key={certification.name}>
                            {certification.name}
                            {certification.issuer ? ` · ${certification.issuer}` : ""}
                            {certification.year ? ` (${certification.year})` : ""}
                          </span>
                        )).reduce<(React.ReactNode | string)[]>(
                          (items, item, index) =>
                            index === 0 ? [item] : [...items, ", ", item],
                          [],
                        )}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <p className="pt-5 t-caption text-muted-600">
                  Guidance is provided within the trainer&apos;s professional qualifications. ARAMYA does
                  not offer medical treatment or clinical advice.
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-6">
            <TrainerReviews initial={trainer.reviews} rating={trainer.rating} />
            <div className="rounded-xl border border-forest-900/10 bg-sand-100/70 p-6">
              <p className="t-h4 text-charcoal-900">How booking works</p>
              <ol className="flex list-decimal flex-col gap-2 pl-5 pt-3 text-body-sm text-charcoal-900">
                <li>Send a request with your preferred days and start time.</li>
                <li>The trainer accepts or declines — usually the same day.</li>
                <li>Once accepted, the session is confirmed and payment is arranged directly with your trainer.</li>
              </ol>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
