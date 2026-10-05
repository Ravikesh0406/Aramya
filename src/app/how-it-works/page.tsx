// ARAMYA — how it works (Design System §11, §12, §13, §17).
import type { Metadata } from "next";
import { Container, Overline, SectionHeading, ButtonLink, StatusBadge } from "@/components/ui";
import { ClockIcon, CalendarIcon, ShieldIcon, CheckIcon } from "@/components/Icons";
import { HOW_IT_WORKS, SESSION_STATUSES, TRIAL } from "@/lib/data";

export const metadata: Metadata = {
  title: "How it Works",
  description:
    "Choose a service, share your preferred days and time, get matched with a nearby trainer and train at home — with clear scheduling rules.",
};

const FLOW = [
  "Visitor",
  "Location",
  "Service",
  "4-Session Trial",
  "Preferred Days",
  "Preferred Time",
  "Request",
  "Trainer Matching",
  "Trainer Accepts",
  "Sessions",
];

const RULES = [
  {
    icon: CalendarIcon,
    title: "Book 24+ hours ahead",
    body: "Sessions must be booked 24 hours in advance or more, so trainers and customers both get reliable scheduling.",
  },
  {
    icon: ClockIcon,
    title: "Preferred days and time",
    body: "Choose four preferred session days and a morning, afternoon, evening or specific time. Four days — not four sessions every week.",
  },
  {
    icon: ShieldIcon,
    title: "Confirmed sessions never change silently",
    body: "Either party can request a change. A confirmed session moves through Reschedule Requested → the other party accepts → Rescheduled.",
  },
  {
    icon: CheckIcon,
    title: "Clear completion — no OTP",
    body: "The trainer marks a session completed, the customer can confirm or report an issue, and the session history is recorded. Disagreements can become Disputed for admin review.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-forest-900/10 bg-ivory-50 py-10 md:py-14">
        <Container className="flex flex-col gap-5">
          <Overline>How ARAMYA works</Overline>
          <h1 className="t-display max-w-3xl text-charcoal-900">
            Request, match, confirm — train at home
          </h1>
          <p className="t-body-lg max-w-2xl text-muted-600">
            ARAMYA is a managed marketplace. You tell us what you want and when;
            nearby eligible trainers receive your request, one accepts, and your
            booking is confirmed with you.
          </p>
        </Container>
      </section>

      {/* Four steps */}
      <section className="py-10 md:py-14">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            overline="Four steps"
            title="How ARAMYA works"
            description="From your first choice to sessions tracked at home."
          />
          <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step) => (
              <li
                key={step.step}
                className="flex flex-col gap-3 rounded-xl border border-forest-900/8 bg-white p-6 shadow-sm"
              >
                <span className="text-caption font-extrabold tracking-[0.14em] text-terracotta-500">
                  {step.step}
                </span>
                <h2 className="t-h4 text-charcoal-900">{step.title}</h2>
                <p className="t-body-sm text-muted-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Booking flow timeline */}
      <section className="bg-sand-100/60 py-10 md:py-14">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            overline="Booking flow"
            title="The path from visitor to sessions"
            description="Every booking follows the same transparent sequence."
          />
          <ol className="flex flex-wrap items-center gap-2">
            {FLOW.map((node, index) => (
              <li key={node} className="flex items-center gap-2">
                <span className="rounded-pill border border-forest-900/15 bg-white px-3.5 py-1.5 text-body-sm font-semibold text-forest-900">
                  {node}
                </span>
                {index < FLOW.length - 1 ? (
                  <span aria-hidden className="text-muted-600">
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-3 rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="t-h4 text-charcoal-900">{TRIAL.name} — {TRIAL.price}</p>
              <p className="pt-1 text-body-sm text-muted-600">
                Regular displayed price {TRIAL.regularPrice} · four private at-home sessions
              </p>
            </div>
            <ButtonLink href="/book" size="lg" className="shrink-0">
              Book Your Trial
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Rules */}
      <section className="py-10 md:py-14">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            overline="Scheduling rules"
            title="Clear rules on both sides"
            description="Scheduling changes are always explicit — nothing moves behind your back."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            {RULES.map((rule) => {
              const Icon = rule.icon;
              return (
                <article
                  key={rule.title}
                  className="flex flex-col gap-3 rounded-xl border border-forest-900/8 bg-white p-6 shadow-sm"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ivory-50 text-forest-900">
                    <Icon size={22} />
                  </span>
                  <h3 className="t-h4 text-charcoal-900">{rule.title}</h3>
                  <p className="t-body-sm text-muted-600">{rule.body}</p>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Trainer matching */}
      <section className="bg-forest-950 py-14 text-ivory-50 md:py-20">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            overline="Trainer matching"
            title="How your request becomes a confirmed booking"
            tone="light"
            description="Nearby eligible trainers only — and the same trainer where possible for your bundle."
          />
          <ol className="grid gap-4 md:grid-cols-5">
            {[
              "Find nearby eligible trainers",
              "Notify relevant trainers",
              "Trainer accepts",
              "Booking becomes confirmed",
              "Customer receives confirmation",
            ].map((step, index) => (
              <li
                key={step}
                className="flex flex-col gap-2 rounded-xl border border-ivory-50/12 bg-forest-900/60 p-5"
              >
                <span className="text-caption font-extrabold tracking-[0.14em] text-terracotta-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="t-body-sm text-ivory-50/85">{step}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Session statuses */}
      <section className="py-10 md:py-14">
        <Container className="flex flex-col gap-8">
          <SectionHeading
            overline="Session statuses"
            title="Every session has a clear state"
            description="Requested, Accepted, Confirmed, Upcoming, In Progress, Completed, Cancelled, Reschedule Requested, Rescheduled, No Show, Expired and Disputed."
          />
          <ul className="flex flex-wrap gap-2.5">
            {SESSION_STATUSES.map((status) => (
              <li key={status}>
                <StatusBadge status={status} />
              </li>
            ))}
          </ul>
          <div className="flex justify-center pt-2">
            <ButtonLink href="/book" size="lg">
              Start Your Booking
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
