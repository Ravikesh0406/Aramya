// ARAMYA booking entry point.
// New flow: pick a trainer, then an offering, days and a start time.
// The legacy open-request flow is still available (existing data keeps working)
// but is no longer promoted.

import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Container, Overline, ButtonLink } from "@/components/ui";
import { TargetedBookingFlow } from "@/components/TargetedBookingFlow";
import { BookingFlow } from "@/components/BookingFlow";
import { listCategories } from "@/lib/server/trainers";

export const metadata: Metadata = {
  title: "Book a Session",
  description:
    "Choose a trainer, pick a session and send a booking request for the days and time that suit you — in person or online.",
};

export const dynamic = "force-dynamic";

export default async function BookPage(props: PageProps<"/book">) {
  const params = await props.searchParams;
  const trainerParam = typeof params.trainer === "string" ? params.trainer : "";
  const categories = await listCategories(true);

  return (
    <>
      <section className="border-b border-forest-900/10 bg-ivory-50 py-12 md:py-16">
        <Container className="flex flex-col gap-4">
          <Overline>Book a session</Overline>
          <h1 className="t-h1 max-w-3xl text-charcoal-900">Pick a trainer and a time that works</h1>
          <p className="t-body-lg max-w-2xl text-muted-600">
            Trainers set their own prices and availability. Send a request for the days and start
            time you want — the trainer accepts or declines, and payment is arranged directly with
            them.
          </p>
        </Container>
      </section>

      <section className="py-12 md:py-16">
        <Container className="grid items-start gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:gap-10">
          <Suspense fallback={<p className="text-body text-muted-600">Loading booking...</p>}>
            {trainerParam ? (
              <TargetedBookingFlow trainerSlug={trainerParam} />
            ) : (
              <div className="flex flex-col gap-5 rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
                <h2 className="t-h3 text-charcoal-900">Find your trainer first</h2>
                <p className="text-body text-muted-600">
                  Search trainers by area, specialization, price and availability, then book the
                  session you want from their profile.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {categories.slice(0, 6).map((category) => (
                    <Link
                      key={category.slug}
                      href={`/trainers?category=${category.slug}`}
                      className="rounded-pill border border-forest-900/15 bg-white px-3.5 py-1.5 text-body-sm text-charcoal-900 transition duration-200 ease-out hover:border-forest-900/40"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
                <div className="pt-2">
                  <ButtonLink href="/trainers" size="lg">
                    Find a trainer
                  </ButtonLink>
                </div>
              </div>
            )}
          </Suspense>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
            <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
              <p className="t-overline pb-4 text-terracotta-500">Good to know</p>
              <ul className="flex flex-col gap-3.5 text-body-sm text-charcoal-900">
                <li>Every trainer sets their own price — ARAMYA does not add anything on top.</li>
                <li>Sessions are booked inside the trainer&apos;s published availability, in IST.</li>
                <li>Requests that go unanswered for 24 hours expire automatically.</li>
                <li>Payment for sessions is arranged directly with your trainer.</li>
              </ul>
            </div>

            <details className="rounded-xl border border-forest-900/10 bg-sand-100/70 p-5">
              <summary className="cursor-pointer text-body-sm font-semibold text-forest-900">
                Prefer the original request flow?
              </summary>
              <p className="pt-3 text-body-sm text-muted-600">
                The older open-request flow is still available for existing customers: post what you
                need, and nearby trainers can accept it.
              </p>
              <div className="pt-3">
                <Suspense fallback={null}>
                  <BookingFlow />
                </Suspense>
              </div>
            </details>
          </aside>
        </Container>
      </section>
    </>
  );
}
