// ARAMYA trainer search — server-rendered discovery (Design System §16 order).
// In-person trainers come first; online trainers are the fallback.

import type { Metadata } from "next";
import { Container, Overline, SectionHeading } from "@/components/ui";
import { TrainerMarketCard } from "@/components/TrainerMarketCard";
import { TrainerFilters } from "@/components/TrainerFilters";
import { searchTrainers, type SearchQuery, type TimeWindowKey } from "@/lib/server/search";
import { listCategories } from "@/lib/server/trainers";
import { TIME_WINDOWS } from "@/lib/server/search";

export const metadata: Metadata = {
  title: "Find a Trainer",
  description:
    "Search verified home-fitness and wellness trainers by area, specialization, price and availability — in person or online.",
};

export const dynamic = "force-dynamic";

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parse(params: Record<string, string | string[] | undefined>): SearchQuery {
  const value = (key: string): string | null => {
    const raw = params[key];
    if (Array.isArray(raw)) return raw[0] ?? null;
    return raw ?? null;
  };
  const number = (key: string): number | null => {
    const raw = value(key);
    if (raw === null || raw.trim() === "") return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const window = value("window");
  const sort = value("sort");
  const format = value("format");

  return {
    pin: value("pin"),
    city: value("city"),
    locality: value("locality"),
    lat: number("lat"),
    lng: number("lng"),
    category: value("category"),
    format: format === "in_person" || format === "online" ? format : null,
    minPricePaise: number("minPrice"),
    maxPricePaise: number("maxPrice"),
    minExperience: number("experience"),
    weekday: number("weekday"),
    window:
      window === "morning" || window === "afternoon" || window === "evening" ? (window as TimeWindowKey) : null,
    minRating: number("rating"),
    sort: sort === "price" || sort === "experience" || sort === "rating" ? sort : "relevance",
  };
}

export default async function TrainersPage(props: PageProps<"/trainers">) {
  const params = await props.searchParams;
  const query = parse(params as Record<string, string | string[] | undefined>);
  const [results, categories] = await Promise.all([searchTrainers(query), listCategories(true)]);

  const hasLocation = Boolean(query.pin || query.city || query.locality || (query.lat && query.lng));
  const showNoAreaNotice = hasLocation && !results.areaHasInPerson;

  return (
    <>
      <section className="border-b border-forest-900/10 bg-ivory-50 py-12 md:py-16">
        <Container className="flex flex-col gap-4">
          <Overline>Find a trainer</Overline>
          <h1 className="t-h1 max-w-3xl text-charcoal-900">Choose the trainer you want to train with</h1>
          <p className="t-body-lg max-w-2xl text-muted-600">
            Every trainer sets their own prices, availability and session formats. Compare profiles,
            then send a booking request — the trainer accepts or declines.
          </p>
        </Container>
      </section>

      <section className="py-8 md:py-12">
        <Container className="flex flex-col gap-8">
          <TrainerFilters
            categories={categories.map((category) => ({ value: category.slug, label: category.name }))}
            inUse={[
              ...new Set([
                ...results.inPerson.flatMap((card) => card.categories.map((category) => category.slug)),
                ...results.online.flatMap((card) => card.categories.map((category) => category.slug)),
              ]),
            ]}
          />

          {showNoAreaNotice ? (
            <div className="rounded-xl border border-terracotta-500/25 bg-sand-100/70 p-5">
              <p className="t-h4 text-charcoal-900">
                We&apos;re sorry, we&apos;re not available in your area yet, but we&apos;ll be there soon.
              </p>
              <p className="pt-1 text-body-sm text-muted-600">
                In the meantime, you can try our online trainers.
              </p>
            </div>
          ) : null}

          {!hasLocation ? (
            <p className="rounded-xl border border-forest-900/10 bg-white p-4 text-body-sm text-muted-600 shadow-sm">
              Enter a city, locality or PIN code above to see trainers who come to you. Online trainers
              are shown below in the meantime.
            </p>
          ) : null}

          <section className="flex flex-col gap-5">
            <SectionHeading
              overline="In person"
              title={
                hasLocation ? "Trainers who come to you" : "Trainers in your area"
              }
              description={
                results.inPerson.length > 0
                  ? "Matched on the areas this trainer serves, or within their service radius."
                  : "No trainers match this area and filter combination yet."
              }
            />
            {results.inPerson.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {results.inPerson.map((trainer) => (
                  <TrainerMarketCard key={trainer.slug} trainer={trainer} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No in-person trainers here yet"
                body="Try a nearby area or PIN code, or train online with a trainer below."
              />
            )}
          </section>

          <section className="flex flex-col gap-5 border-t border-forest-900/8 pt-8">
            <SectionHeading
              overline="Online classes"
              title="Train online from anywhere"
              description="Live one-to-one sessions over Zoom, scheduled inside the trainer's availability."
            />
            {results.online.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {results.online.map((trainer) => (
                  <TrainerMarketCard key={trainer.slug} trainer={trainer} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No online trainers match yet"
                body="Try removing a filter, or search another specialization."
              />
            )}
          </section>

          {query.weekday != null && query.window ? (
            <p className="t-caption text-muted-600">
              Filtering on {WEEKDAY_LABELS[query.weekday]} · {TIME_WINDOWS[query.window].label}.
            </p>
          ) : null}
        </Container>
      </section>
    </>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-forest-900/15 bg-white p-8 text-center shadow-sm">
      <p className="t-h4 text-charcoal-900">{title}</p>
      <p className="pt-2 text-body-sm text-muted-600">{body}</p>
    </div>
  );
}
