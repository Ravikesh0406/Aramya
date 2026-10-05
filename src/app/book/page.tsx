// ARAMYA booking page — Visitor → Location → Service → Trial → Days → Time → Request → Matching
import type { Metadata } from "next";
import { Container, Overline } from "@/components/ui";
import { BookingFlow } from "@/components/BookingFlow";
import { Suspense } from "react";
import { CheckIcon, CalendarIcon, ClockIcon, ShieldIcon } from "@/components/Icons";
import { TRIAL } from "@/lib/data";

export const metadata: Metadata = {
  title: "Book a Trial",
  description:
    "Book the ARAMYA 4-Session Trial — choose your service, four preferred days and your preferred time, then get matched with a nearby trainer.",
};

const PROMISES = [
  { icon: CalendarIcon, text: "Choose four preferred days" },
  { icon: ClockIcon, text: "Morning, afternoon, evening or specific time" },
  { icon: CheckIcon, text: `${TRIAL.name} · ${TRIAL.price} (regular ${TRIAL.regularPrice})` },
  { icon: ShieldIcon, text: "Booked 24+ hours in advance" },
];

export default function BookPage() {
  return (
    <>
      <section className="border-b border-forest-900/10 bg-ivory-50 py-8 md:py-12">
        <Container className="flex flex-col gap-4">
          <Overline>Book a Trial</Overline>
          <h1 className="t-h1 max-w-3xl text-charcoal-900">
            Let&apos;s get your first four sessions scheduled
          </h1>
          <p className="t-body-lg max-w-2xl text-muted-600">
            A few quick choices — location, service, preferred days and time.
            We&apos;ll match you with a nearby trainer and confirm your booking.
          </p>
        </Container>
      </section>

      <section className="py-8 md:py-12">
        <Container className="grid items-start gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:gap-10">
          <Suspense fallback={<p className="text-body text-muted-600">Loading booking...</p>}>
            <BookingFlow />
          </Suspense>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
            <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
              <p className="t-overline pb-4 text-terracotta-500">Good to know</p>
              <ul className="flex flex-col gap-3.5">
                {PROMISES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.text}
                      className="flex items-start gap-3 text-body-sm text-charcoal-900"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-forest-900/8 text-forest-900">
                        <Icon size={14} />
                      </span>
                      {item.text}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-xl border border-forest-900/10 bg-sand-100/70 p-6">
              <p className="t-h4 text-charcoal-900">After you send a request</p>
              <ol className="flex flex-col gap-2.5 pt-4">
                {[
                  "Nearby eligible trainers are notified",
                  "A trainer accepts your request",
                  "Your booking is confirmed",
                  "Your trainer comes to you",
                ].map((label, index) => (
                  <li
                    key={label}
                    className="flex items-start gap-3 text-body-sm text-charcoal-900"
                  >
                    <span className="text-caption font-extrabold text-terracotta-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {label}
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </Container>
      </section>
    </>
  );
}
